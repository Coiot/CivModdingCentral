import Busboy from "busboy";
import { PNG } from "pngjs";
import dxt from "dxt-js";
import os from "node:os";
import path from "node:path";
import { promises as fs, constants as fsConstants } from "node:fs";
import { spawn } from "node:child_process";

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const MAX_BUNDLE_OUTPUTS = 24;
const ENCODER_BACKEND_DXTJS = "dxtjs";
const ENCODER_BACKEND_NATIVE = "native";
const NATIVE_BIN_ENV_KEYS = ["CMC_DDS_NATIVE_BIN", "COMPRESSONATOR_CLI", "COMPRESSONATORCLI_PATH"];
const NATIVE_BIN_CANDIDATES = ["CompressonatorCLI", "compressonatorcli"];

const ASSET_FORMATS = {
	unit: ["DXT3"],
	terrain: ["DXT1", "DXT5"],
	ui: ["DXT3"],
	portraits: ["DXT5"],
};

const DEFAULT_FORMAT_BY_ASSET = {
	unit: "DXT3",
	terrain: "DXT1",
	ui: "DXT3",
	portraits: "DXT5",
};

const FORMAT_ALIASES = {
	BC1: "DXT1",
	BC2: "DXT3",
	BC3: "DXT5",
	DXT1: "DXT1",
	DXT3: "DXT3",
	DXT5: "DXT5",
};

const FOURCC_BY_FORMAT = {
	DXT1: "DXT1",
	DXT3: "DXT3",
	DXT5: "DXT5",
};

const BLOCK_BYTES_BY_FORMAT = {
	DXT1: 8,
	DXT3: 16,
	DXT5: 16,
};

export async function handler(event) {
	try {
		if (event.httpMethod !== "POST") {
			return json(405, { error: "Method not allowed. Use POST." });
		}

		let form;
		try {
			form = await parseMultipartForm(event);
		} catch (error) {
			const status = Number(error?.statusCode || 400);
			return json(status, { error: error?.message || "Invalid multipart request." });
		}

		if (!form.fileBuffer || !form.filename) {
			return json(400, { error: "Missing PNG file upload." });
		}

		if (!isPngFile(form.fileBuffer)) {
			return json(400, { error: "Only PNG files are supported." });
		}

		let png;
		try {
			png = PNG.sync.read(form.fileBuffer, {
				skipRescale: true,
			});
		} catch {
			return json(400, { error: "Unable to decode PNG data." });
		}

		const sourceWidth = Number(png.width || 0);
		const sourceHeight = Number(png.height || 0);
		if (!sourceWidth || !sourceHeight) {
			return json(400, { error: "PNG dimensions are invalid." });
		}
		const encoderBackend = normalizeEncoderBackend(form.fields.encoderBackend);
		const nativeQuality = resolveNativeQuality(form.fields.nativeQuality ?? process.env.CMC_DDS_NATIVE_QUALITY, 1);
		const colorMetric = normalizeColorMetric(form.fields.colorMetric);

		const workflow = normalizeWorkflow(form.fields.workflow);
		if (workflow === "icon_bundle") {
			return await convertIconAtlasBundle({
				form,
				png,
				sourceWidth,
				sourceHeight,
				encoderBackend,
				nativeQuality,
			});
		}

		const assetType = normalizeAssetType(form.fields.assetType);
		const requestedFormat = normalizeCompressionFormat(form.fields.compressionFormat);
		const chosenFormat = requestedFormat || DEFAULT_FORMAT_BY_ASSET[assetType];
		if (!ASSET_FORMATS[assetType].includes(chosenFormat)) {
			return json(400, {
				error: `Compression ${chosenFormat} is not valid for asset type "${assetType}".`,
			});
		}

		const padded = padRgbaToDxtBlocks(png.data, sourceWidth, sourceHeight);
		let ddsPayload;
		try {
			ddsPayload = await encodeDdsWithBackend({
				rgbaData: padded.data,
				width: padded.width,
				height: padded.height,
				format: chosenFormat,
				backend: encoderBackend,
				dxtFlags: dxt.flags[chosenFormat],
				nativeQuality,
				nativeColorMetric: colorMetric,
			});
		} catch (error) {
			return json(500, { error: error?.message || "DDS compression failed." });
		}

		const outputName = buildOutputFilename(form.filename, chosenFormat);
		return {
			statusCode: 200,
			isBase64Encoded: true,
			headers: {
				"Content-Type": "application/octet-stream",
				"Content-Disposition": `attachment; filename="${outputName}"`,
				"Cache-Control": "no-store",
				"X-Source-Width": String(sourceWidth),
				"X-Source-Height": String(sourceHeight),
				"X-Output-Width": String(padded.width),
				"X-Output-Height": String(padded.height),
				"X-Compression-Format": chosenFormat,
				"X-Encoder-Backend": encoderBackend,
				"X-Native-Quality": encoderBackend === ENCODER_BACKEND_NATIVE ? String(nativeQuality) : "",
			},
			body: ddsPayload.toString("base64"),
		};
	} catch (error) {
		console.error("convert-dds unexpected error", error);
		return json(500, { error: error?.message || "Unexpected conversion failure." });
	}
}

async function convertIconAtlasBundle({ form, png, sourceWidth, sourceHeight, encoderBackend, nativeQuality }) {
	const selectedSizes = parseSizeList(form.fields.selectedSizes);
	if (!selectedSizes.length) {
		return json(400, { error: "Select at least one output icon size." });
	}
	if (selectedSizes.length > MAX_BUNDLE_OUTPUTS) {
		return json(400, { error: `Too many output sizes requested. Max is ${MAX_BUNDLE_OUTPUTS}.` });
	}

	const currentIconSize = parseBoundedInt(form.fields.currentIconSize, 1, 2048, 256);
	const gridRows = parseBoundedInt(form.fields.gridRows, 1, 64, 1);
	const gridCols = parseBoundedInt(form.fields.gridCols, 1, 64, 1);
	const requiredWidth = currentIconSize * gridCols;
	const requiredHeight = currentIconSize * gridRows;
	if (sourceWidth !== requiredWidth || sourceHeight !== requiredHeight) {
		return json(400, {
			error: `Atlas source must be ${requiredWidth}x${requiredHeight} for current icon size ${currentIconSize} and grid ${gridCols}x${gridRows}.`,
		});
	}

	const requestedFormat = normalizeCompressionFormat(form.fields.compressionFormat) || "DXT3";
	if (requestedFormat !== "DXT3") {
		return json(400, { error: "Icon atlas bundle currently supports DXT3 (BC2) compression only." });
	}
	const resampleMode = normalizeResampleMode(form.fields.resampleMode);
	const alphaAware = parseBooleanFlag(form.fields.alphaAware, true);
	const sharpenAmount = parseBoundedFloat(form.fields.sharpenAmount, 0, 1, 0);
	const preBlurAmount = parseBoundedFloat(form.fields.preBlurAmount, 0, 2, 0);
	const colorBoost = parseBoundedFloat(form.fields.colorBoost, 0.8, 1.5, 1);
	const ditherAmount = parseBoundedFloat(form.fields.ditherAmount, 0, 1, 0);
	const encoderMode = normalizeEncoderMode(form.fields.encoderMode);
	const colorMetric = normalizeColorMetric(form.fields.colorMetric);
	const weightColorByAlpha = parseBooleanFlag(form.fields.weightColorByAlpha, false);

	const atlasType = normalizeBundleAtlasType(form.fields.atlasType);
	const fileSuffix = bundleFileSuffix(atlasType);
	const filePrefix =
		sanitizeFilenameComponent(form.fields.filePrefix || buildFilenamePrefixFromToken(form.fields.atlasToken || form.fields.exportName || form.filename || "IconAtlas")) || "IconAtlas";
	const files = [];

	for (const size of selectedSizes) {
		const atlas = resizeIconAtlas({
			sourceRgba: png.data,
			sourceWidth,
			sourceHeight,
			currentIconSize,
			targetIconSize: size,
			gridRows,
			gridCols,
			resampleMode,
			alphaAware,
		});
		if (size < currentIconSize && sharpenAmount > 0) {
			applyUnsharpMaskRgba(atlas.data, atlas.width, atlas.height, sharpenAmount);
		}
		if (size < currentIconSize && preBlurAmount > 0) {
			applyGaussianBlurRgba(atlas.data, atlas.width, atlas.height, preBlurAmount);
		}
		if (size < currentIconSize && colorBoost !== 1) {
			applyColorBoostRgba(atlas.data, atlas.width, atlas.height, colorBoost);
		}
		if (size < currentIconSize && ditherAmount > 0) {
			applyGradientDitherRgba(atlas.data, atlas.width, atlas.height, ditherAmount);
		}

		const prepared = padRgbaToDxtBlocks(atlas.data, atlas.width, atlas.height);
		const compressionFlags = composeCompressionFlags(requestedFormat, {
			encoderMode,
			colorMetric,
			weightColorByAlpha,
		});
		try {
			const ddsPayload = await encodeDdsWithBackend({
				rgbaData: prepared.data,
				width: prepared.width,
				height: prepared.height,
				format: requestedFormat,
				backend: encoderBackend,
				dxtFlags: compressionFlags,
				nativeQuality,
				nativeColorMetric: colorMetric,
			});
			files.push({
				name: `${filePrefix}_${fileSuffix}_${size}.dds`,
				data: ddsPayload,
			});
		} catch (error) {
			return json(500, { error: `DDS compression failed for ${size}px export: ${error?.message || "unknown compression error"}` });
		}
	}

	const zipBuffer = buildZipArchive(files);
	const zipName = `${filePrefix}_${fileSuffix}_bundle.zip`;
	return {
		statusCode: 200,
		isBase64Encoded: true,
		headers: {
			"Content-Type": "application/zip",
			"Content-Disposition": `attachment; filename="${zipName}"`,
			"Cache-Control": "no-store",
			"X-Source-Width": String(sourceWidth),
			"X-Source-Height": String(sourceHeight),
			"X-Compression-Format": requestedFormat,
			"X-Bundle-Count": String(files.length),
			"X-Resample-Mode": resampleMode,
			"X-Alpha-Aware": alphaAware ? "1" : "0",
			"X-Sharpen-Amount": String(sharpenAmount),
			"X-Pre-Blur-Amount": String(preBlurAmount),
			"X-Color-Boost": String(colorBoost),
			"X-Dither-Amount": String(ditherAmount),
			"X-Encoder-Mode": encoderMode,
			"X-Color-Metric": colorMetric,
			"X-Weight-By-Alpha": weightColorByAlpha ? "1" : "0",
			"X-Encoder-Backend": encoderBackend,
			"X-Native-Quality": encoderBackend === ENCODER_BACKEND_NATIVE ? String(nativeQuality) : "",
		},
		body: zipBuffer.toString("base64"),
	};
}

function normalizeAssetType(input) {
	const value = String(input || "")
		.trim()
		.toLowerCase();
	if (value && ASSET_FORMATS[value]) {
		return value;
	}
	return "unit";
}

function normalizeWorkflow(input) {
	return String(input || "")
		.trim()
		.toLowerCase();
}

function normalizeBundleAtlasType(input) {
	const value = String(input || "")
		.trim()
		.toLowerCase();
	if (value === "alpha" || value === "ui" || value === "unit_flag") {
		return value;
	}
	return "icon";
}

function bundleFileSuffix(atlasType) {
	if (atlasType === "alpha") {
		return "AlphaAtlas";
	}
	if (atlasType === "ui") {
		return "ButtonUI";
	}
	if (atlasType === "unit_flag") {
		return "UnitFlagAtlas";
	}
	return "IconAtlas";
}

function normalizeCompressionFormat(input) {
	const value = String(input || "")
		.trim()
		.toUpperCase();
	return FORMAT_ALIASES[value] || "";
}

function normalizeResampleMode(input) {
	const value = String(input || "")
		.trim()
		.toLowerCase();
	if (value === "nearest" || value === "bilinear" || value === "bicubic" || value === "lanczos3") {
		return value;
	}
	return "bicubic";
}

function normalizeEncoderMode(input) {
	const value = String(input || "")
		.trim()
		.toLowerCase();
	if (value === "rangefit" || value === "clusterfit" || value === "iterative") {
		return value;
	}
	return "clusterfit";
}

function normalizeColorMetric(input) {
	const value = String(input || "")
		.trim()
		.toLowerCase();
	if (value === "uniform" || value === "perceptual") {
		return value;
	}
	return "uniform";
}

function composeCompressionFlags(format, { encoderMode, colorMetric, weightColorByAlpha }) {
	let flags = dxt.flags[format] || 0;
	if (encoderMode === "rangefit") {
		flags |= dxt.flags.ColourRangeFit;
	} else if (encoderMode === "iterative") {
		flags |= dxt.flags.ColourIterativeClusterFit;
	} else {
		flags |= dxt.flags.ColourClusterFit;
	}

	if (colorMetric === "uniform") {
		flags |= dxt.flags.ColourMetricUniform;
	} else {
		flags |= dxt.flags.ColourMetricPerceptual;
	}

	if (weightColorByAlpha) {
		flags |= dxt.flags.WeightColourByAlpha;
	}
	return flags;
}

function normalizeEncoderBackend(input) {
	const value = String(input || "")
		.trim()
		.toLowerCase();
	if (value === ENCODER_BACKEND_NATIVE) {
		return ENCODER_BACKEND_NATIVE;
	}
	return ENCODER_BACKEND_DXTJS;
}

async function encodeDdsWithBackend({ rgbaData, width, height, format, backend, dxtFlags, nativeQuality, nativeColorMetric }) {
	if (backend === ENCODER_BACKEND_NATIVE) {
		return await encodeDdsWithCompressonator({
			rgbaData,
			width,
			height,
			format,
			nativeQuality,
			nativeColorMetric,
		});
	}
	return encodeDdsWithDxtJs({
		rgbaData,
		width,
		height,
		format,
		dxtFlags,
	});
}

function encodeDdsWithDxtJs({ rgbaData, width, height, format, dxtFlags }) {
	const flags = Number(dxtFlags || dxt.flags[format] || 0);
	const compressed = dxt.compress(new Uint8Array(rgbaData.buffer, rgbaData.byteOffset, rgbaData.byteLength), width, height, flags);
	return buildDdsBuffer({
		compressedData: compressed,
		width,
		height,
		format,
	});
}

async function encodeDdsWithCompressonator({ rgbaData, width, height, format, nativeQuality = 1, nativeColorMetric = "uniform" }) {
	const executable = await resolveNativeEncoderBinary();
	if (!executable) {
		throw new Error(`Native encoder selected but CompressonatorCLI is not configured. Set one of: ${NATIVE_BIN_ENV_KEYS.join(", ")} or ensure CLI exists under /opt/compressonator.`);
	}

	const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "cmc-dds-"));
	const inputPngPath = path.join(workDir, "input.png");
	const outputDdsPath = path.join(workDir, "output.dds");
	const pngBuffer = PNG.sync.write({
		width,
		height,
		data: Buffer.from(rgbaData),
	});

	try {
		await fs.writeFile(inputPngPath, pngBuffer);
		const formatToken = compressonatorFormat(format);
		const quality = resolveNativeQuality(nativeQuality, 1);
		const args = ["-fd", formatToken, "-Quality", String(quality)];
		if (nativeColorMetric === "perceptual") {
			args.push("-UseChannelWeighting", "1", "-WeightR", "0.3086", "-WeightG", "0.6094", "-WeightB", "0.0820");
		} else {
			args.push("-UseChannelWeighting", "0");
		}
		args.push(inputPngPath, outputDdsPath);
		const result = await runCommand(executable, args);
		if (result.code !== 0) {
			const stderr = String(result.stderr || "").trim();
			throw new Error(stderr || `CompressonatorCLI failed with exit code ${result.code}.`);
		}
		return await fs.readFile(outputDdsPath);
	} catch (error) {
		const errorCode = String(error?.code || "");
		const message = String(error?.message || "");
		if (errorCode === "ENOENT" || message.includes("ENOENT")) {
			throw new Error(`Native encoder failed to start at ${executable}. This can indicate a missing binary or missing runtime dependencies in the container.`);
		}
		throw error;
	} finally {
		await fs.rm(workDir, { recursive: true, force: true });
	}
}

async function resolveNativeEncoderBinary() {
	for (const envKey of NATIVE_BIN_ENV_KEYS) {
		const value = String(process.env[envKey] || "").trim();
		if (value && (await isExecutablePath(value))) {
			return value;
		}
	}

	const commonPaths = ["/opt/compressonator/CompressonatorCLI", "/opt/compressonator/compressonatorcli", "/opt/compressonator/bin/CompressonatorCLI", "/opt/compressonator/bin/compressonatorcli"];
	for (const candidate of commonPaths) {
		if (await isExecutablePath(candidate)) {
			return candidate;
		}
	}

	const discovered = await findCompressonatorBinary("/opt/compressonator");
	if (discovered) {
		return discovered;
	}

	for (const candidate of NATIVE_BIN_CANDIDATES) {
		if (await isExecutablePath(candidate)) {
			return candidate;
		}
	}

	return "";
}

async function isExecutablePath(targetPath) {
	if (!targetPath) {
		return false;
	}
	try {
		await fs.access(targetPath, fsConstants.X_OK);
		return true;
	} catch {
		return false;
	}
}

async function findCompressonatorBinary(rootDir) {
	try {
		const queue = [rootDir];
		while (queue.length) {
			const current = queue.shift();
			if (!current) {
				continue;
			}
			const entries = await fs.readdir(current, { withFileTypes: true });
			for (const entry of entries) {
				const fullPath = path.join(current, entry.name);
				if (entry.isDirectory()) {
					queue.push(fullPath);
					continue;
				}
				if (!entry.isFile()) {
					continue;
				}
				if (!/compressonator.*cli/i.test(entry.name)) {
					continue;
				}
				if (await isExecutablePath(fullPath)) {
					return fullPath;
				}
			}
		}
		return "";
	} catch {
		return "";
	}
}

function compressonatorFormat(format) {
	if (format === "DXT1") {
		return "DXT1";
	}
	if (format === "DXT3") {
		return "DXT3";
	}
	if (format === "DXT5") {
		return "DXT5";
	}
	throw new Error(`Unsupported native compression format: ${format}`);
}

function resolveNativeQuality(value, fallback = 1) {
	const parsed = Number.parseFloat(String(value ?? ""));
	if (!Number.isFinite(parsed)) {
		return fallback;
	}
	if (parsed < 0) {
		return 0;
	}
	if (parsed > 1) {
		return 1;
	}
	return parsed;
}

async function runCommand(command, args) {
	return await new Promise((resolve, reject) => {
		let stdout = "";
		let stderr = "";
		const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
		child.stdout.on("data", (chunk) => {
			stdout += String(chunk);
		});
		child.stderr.on("data", (chunk) => {
			stderr += String(chunk);
		});
		child.on("error", (error) => {
			reject(error);
		});
		child.on("close", (code) => {
			resolve({
				code: Number(code || 0),
				stdout,
				stderr,
			});
		});
	});
}

function parseBooleanFlag(value, fallback = false) {
	if (value === undefined || value === null || value === "") {
		return fallback;
	}
	const normalized = String(value).trim().toLowerCase();
	if (normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on") {
		return true;
	}
	if (normalized === "0" || normalized === "false" || normalized === "no" || normalized === "off") {
		return false;
	}
	return fallback;
}

function parseSizeList(input) {
	const unique = new Set();
	String(input || "")
		.split(/[^0-9]+/)
		.map((token) => Number.parseInt(token, 10))
		.forEach((value) => {
			if (Number.isFinite(value) && value >= 1 && value <= 4096) {
				unique.add(value);
			}
		});
	return Array.from(unique).sort((a, b) => a - b);
}

function parseBoundedInt(value, min, max, fallback) {
	const parsed = Number.parseInt(String(value || ""), 10);
	if (!Number.isFinite(parsed)) {
		return fallback;
	}
	if (parsed < min) {
		return min;
	}
	if (parsed > max) {
		return max;
	}
	return parsed;
}

function parseBoundedFloat(value, min, max, fallback) {
	const parsed = Number.parseFloat(String(value || ""));
	if (!Number.isFinite(parsed)) {
		return fallback;
	}
	if (parsed < min) {
		return min;
	}
	if (parsed > max) {
		return max;
	}
	return parsed;
}

function sanitizeFilenameComponent(value) {
	const cleaned = String(value || "")
		.replace(/\.[^.]+$/, "")
		.replace(/[^a-z0-9._-]+/gi, "-")
		.replace(/^-+|-+$/g, "");
	return cleaned || "";
}

function isPngFile(buffer) {
	if (!buffer || buffer.length < 8) {
		return false;
	}
	return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 && buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a;
}

function padRgbaToDxtBlocks(rgbaData, width, height) {
	const paddedWidth = Math.ceil(width / 4) * 4;
	const paddedHeight = Math.ceil(height / 4) * 4;
	if (paddedWidth === width && paddedHeight === height) {
		return {
			data: Buffer.from(rgbaData),
			width,
			height,
		};
	}

	const out = Buffer.alloc(paddedWidth * paddedHeight * 4, 0);
	for (let y = 0; y < height; y += 1) {
		const sourceRowStart = y * width * 4;
		const sourceRowEnd = sourceRowStart + width * 4;
		const targetRowStart = y * paddedWidth * 4;
		rgbaData.copy(out, targetRowStart, sourceRowStart, sourceRowEnd);
	}

	return {
		data: out,
		width: paddedWidth,
		height: paddedHeight,
	};
}

function resizeIconAtlas({ sourceRgba, sourceWidth, sourceHeight, currentIconSize, targetIconSize, gridRows, gridCols, resampleMode, alphaAware }) {
	const outWidth = targetIconSize * gridCols;
	const outHeight = targetIconSize * gridRows;
	const out = Buffer.alloc(outWidth * outHeight * 4, 0);

	for (let row = 0; row < gridRows; row += 1) {
		for (let col = 0; col < gridCols; col += 1) {
			const srcX = col * currentIconSize;
			const srcY = row * currentIconSize;
			const dstX = col * targetIconSize;
			const dstY = row * targetIconSize;

			if (resampleMode === "nearest") {
				blitNearest({
					sourceRgba,
					sourceWidth,
					sourceHeight,
					srcX,
					srcY,
					srcW: currentIconSize,
					srcH: currentIconSize,
					destRgba: out,
					destWidth: outWidth,
					destHeight: outHeight,
					dstX,
					dstY,
					dstW: targetIconSize,
					dstH: targetIconSize,
				});
			} else if (resampleMode === "bilinear") {
				blitBilinear({
					sourceRgba,
					sourceWidth,
					sourceHeight,
					srcX,
					srcY,
					srcW: currentIconSize,
					srcH: currentIconSize,
					destRgba: out,
					destWidth: outWidth,
					destHeight: outHeight,
					dstX,
					dstY,
					dstW: targetIconSize,
					dstH: targetIconSize,
					alphaAware,
				});
			} else if (resampleMode === "lanczos3") {
				blitLanczos3({
					sourceRgba,
					sourceWidth,
					sourceHeight,
					srcX,
					srcY,
					srcW: currentIconSize,
					srcH: currentIconSize,
					destRgba: out,
					destWidth: outWidth,
					destHeight: outHeight,
					dstX,
					dstY,
					dstW: targetIconSize,
					dstH: targetIconSize,
					alphaAware,
				});
			} else {
				blitCubic({
					sourceRgba,
					sourceWidth,
					sourceHeight,
					srcX,
					srcY,
					srcW: currentIconSize,
					srcH: currentIconSize,
					destRgba: out,
					destWidth: outWidth,
					destHeight: outHeight,
					dstX,
					dstY,
					dstW: targetIconSize,
					dstH: targetIconSize,
					alphaAware,
				});
			}
		}
	}

	return {
		data: out,
		width: outWidth,
		height: outHeight,
	};
}

function blitNearest({ sourceRgba, sourceWidth, sourceHeight, srcX, srcY, srcW, srcH, destRgba, destWidth, destHeight, dstX, dstY, dstW, dstH }) {
	for (let y = 0; y < dstH; y += 1) {
		const sourceY = srcY + Math.min(srcH - 1, Math.floor(((y + 0.5) * srcH) / dstH));
		if (sourceY < 0 || sourceY >= sourceHeight) {
			continue;
		}
		for (let x = 0; x < dstW; x += 1) {
			const sourceX = srcX + Math.min(srcW - 1, Math.floor(((x + 0.5) * srcW) / dstW));
			if (sourceX < 0 || sourceX >= sourceWidth) {
				continue;
			}
			const targetX = dstX + x;
			const targetY = dstY + y;
			if (targetX < 0 || targetX >= destWidth || targetY < 0 || targetY >= destHeight) {
				continue;
			}
			const srcOffset = (sourceY * sourceWidth + sourceX) * 4;
			const dstOffset = (targetY * destWidth + targetX) * 4;
			destRgba[dstOffset] = sourceRgba[srcOffset];
			destRgba[dstOffset + 1] = sourceRgba[srcOffset + 1];
			destRgba[dstOffset + 2] = sourceRgba[srcOffset + 2];
			destRgba[dstOffset + 3] = sourceRgba[srcOffset + 3];
		}
	}
}

function blitBilinear({ sourceRgba, sourceWidth, sourceHeight, srcX, srcY, srcW, srcH, destRgba, destWidth, destHeight, dstX, dstY, dstW, dstH, alphaAware }) {
	const maxSourceX = sourceWidth - 1;
	const maxSourceY = sourceHeight - 1;
	const regionMaxX = Math.min(srcX + srcW - 1, maxSourceX);
	const regionMaxY = Math.min(srcY + srcH - 1, maxSourceY);

	for (let y = 0; y < dstH; y += 1) {
		const sourceYf = srcY + (y + 0.5) * (srcH / dstH) - 0.5;
		const y0 = clampInt(Math.floor(sourceYf), srcY, regionMaxY);
		const y1 = clampInt(y0 + 1, srcY, regionMaxY);
		const wy = sourceYf - y0;
		for (let x = 0; x < dstW; x += 1) {
			const sourceXf = srcX + (x + 0.5) * (srcW / dstW) - 0.5;
			const x0 = clampInt(Math.floor(sourceXf), srcX, regionMaxX);
			const x1 = clampInt(x0 + 1, srcX, regionMaxX);
			const wx = sourceXf - x0;

			const targetX = dstX + x;
			const targetY = dstY + y;
			if (targetX < 0 || targetX >= destWidth || targetY < 0 || targetY >= destHeight) {
				continue;
			}

			const dstOffset = (targetY * destWidth + targetX) * 4;
			const src00 = (y0 * sourceWidth + x0) * 4;
			const src10 = (y0 * sourceWidth + x1) * 4;
			const src01 = (y1 * sourceWidth + x0) * 4;
			const src11 = (y1 * sourceWidth + x1) * 4;

			if (!alphaAware) {
				for (let channel = 0; channel < 4; channel += 1) {
					const top = sourceRgba[src00 + channel] * (1 - wx) + sourceRgba[src10 + channel] * wx;
					const bottom = sourceRgba[src01 + channel] * (1 - wx) + sourceRgba[src11 + channel] * wx;
					destRgba[dstOffset + channel] = clampByte(Math.round(top * (1 - wy) + bottom * wy));
				}
				continue;
			}

			const a00 = sourceRgba[src00 + 3] / 255;
			const a10 = sourceRgba[src10 + 3] / 255;
			const a01 = sourceRgba[src01 + 3] / 255;
			const a11 = sourceRgba[src11 + 3] / 255;
			const topA = a00 * (1 - wx) + a10 * wx;
			const bottomA = a01 * (1 - wx) + a11 * wx;
			const a = topA * (1 - wy) + bottomA * wy;

			for (let channel = 0; channel < 3; channel += 1) {
				const c00 = sourceRgba[src00 + channel] * a00;
				const c10 = sourceRgba[src10 + channel] * a10;
				const c01 = sourceRgba[src01 + channel] * a01;
				const c11 = sourceRgba[src11 + channel] * a11;
				const top = c00 * (1 - wx) + c10 * wx;
				const bottom = c01 * (1 - wx) + c11 * wx;
				const premultiplied = top * (1 - wy) + bottom * wy;
				destRgba[dstOffset + channel] = a > 1e-6 ? clampByte(Math.round(premultiplied / a)) : 0;
			}
			destRgba[dstOffset + 3] = clampByte(Math.round(a * 255));
		}
	}
}

function blitCubic({ sourceRgba, sourceWidth, sourceHeight, srcX, srcY, srcW, srcH, destRgba, destWidth, destHeight, dstX, dstY, dstW, dstH, alphaAware }) {
	const maxSourceX = sourceWidth - 1;
	const maxSourceY = sourceHeight - 1;
	const regionMaxX = Math.min(srcX + srcW - 1, maxSourceX);
	const regionMaxY = Math.min(srcY + srcH - 1, maxSourceY);

	for (let y = 0; y < dstH; y += 1) {
		const sourceYf = srcY + (y + 0.5) * (srcH / dstH) - 0.5;
		const baseY = Math.floor(sourceYf);
		for (let x = 0; x < dstW; x += 1) {
			const sourceXf = srcX + (x + 0.5) * (srcW / dstW) - 0.5;
			const baseX = Math.floor(sourceXf);

			const targetX = dstX + x;
			const targetY = dstY + y;
			if (targetX < 0 || targetX >= destWidth || targetY < 0 || targetY >= destHeight) {
				continue;
			}

			const dstOffset = (targetY * destWidth + targetX) * 4;
			let sumWeights = 0;
			let alphaWeighted = 0;
			let redWeighted = 0;
			let greenWeighted = 0;
			let blueWeighted = 0;
			let alphaStraightWeighted = 0;

			for (let oy = -1; oy <= 2; oy += 1) {
				const sy = clampInt(baseY + oy, srcY, regionMaxY);
				const wy = cubicWeight(sourceYf - (baseY + oy));
				if (Math.abs(wy) < 1e-9) {
					continue;
				}
				for (let ox = -1; ox <= 2; ox += 1) {
					const sx = clampInt(baseX + ox, srcX, regionMaxX);
					const wx = cubicWeight(sourceXf - (baseX + ox));
					if (Math.abs(wx) < 1e-9) {
						continue;
					}
					const weight = wx * wy;
					const srcOffset = (sy * sourceWidth + sx) * 4;
					const alpha = sourceRgba[srcOffset + 3] / 255;

					sumWeights += weight;
					alphaStraightWeighted += weight * alpha;

					if (alphaAware) {
						const weightedAlpha = weight * alpha;
						alphaWeighted += weightedAlpha;
						redWeighted += sourceRgba[srcOffset] * weightedAlpha;
						greenWeighted += sourceRgba[srcOffset + 1] * weightedAlpha;
						blueWeighted += sourceRgba[srcOffset + 2] * weightedAlpha;
					} else {
						redWeighted += sourceRgba[srcOffset] * weight;
						greenWeighted += sourceRgba[srcOffset + 1] * weight;
						blueWeighted += sourceRgba[srcOffset + 2] * weight;
					}
				}
			}

			const normalizedAlpha = sumWeights !== 0 ? alphaStraightWeighted / sumWeights : 0;
			destRgba[dstOffset + 3] = clampByte(Math.round(normalizedAlpha * 255));

			if (alphaAware) {
				if (Math.abs(alphaWeighted) < 1e-9) {
					destRgba[dstOffset] = 0;
					destRgba[dstOffset + 1] = 0;
					destRgba[dstOffset + 2] = 0;
					continue;
				}
				destRgba[dstOffset] = clampByte(Math.round(redWeighted / alphaWeighted));
				destRgba[dstOffset + 1] = clampByte(Math.round(greenWeighted / alphaWeighted));
				destRgba[dstOffset + 2] = clampByte(Math.round(blueWeighted / alphaWeighted));
				continue;
			}

			if (Math.abs(sumWeights) < 1e-9) {
				destRgba[dstOffset] = 0;
				destRgba[dstOffset + 1] = 0;
				destRgba[dstOffset + 2] = 0;
				continue;
			}
			destRgba[dstOffset] = clampByte(Math.round(redWeighted / sumWeights));
			destRgba[dstOffset + 1] = clampByte(Math.round(greenWeighted / sumWeights));
			destRgba[dstOffset + 2] = clampByte(Math.round(blueWeighted / sumWeights));
		}
	}
}

function blitLanczos3({ sourceRgba, sourceWidth, sourceHeight, srcX, srcY, srcW, srcH, destRgba, destWidth, destHeight, dstX, dstY, dstW, dstH, alphaAware }) {
	const maxSourceX = sourceWidth - 1;
	const maxSourceY = sourceHeight - 1;
	const regionMinX = srcX;
	const regionMinY = srcY;
	const regionMaxX = Math.min(srcX + srcW - 1, maxSourceX);
	const regionMaxY = Math.min(srcY + srcH - 1, maxSourceY);

	const scaleX = dstW / srcW;
	const scaleY = dstH / srcH;
	const supportX = scaleX < 1 ? 3 / scaleX : 3;
	const supportY = scaleY < 1 ? 3 / scaleY : 3;
	const kernelScaleX = scaleX < 1 ? scaleX : 1;
	const kernelScaleY = scaleY < 1 ? scaleY : 1;

	for (let y = 0; y < dstH; y += 1) {
		const sourceYf = srcY + (y + 0.5) * (srcH / dstH) - 0.5;
		const minY = Math.max(regionMinY, Math.floor(sourceYf - supportY));
		const maxY = Math.min(regionMaxY, Math.ceil(sourceYf + supportY));
		for (let x = 0; x < dstW; x += 1) {
			const sourceXf = srcX + (x + 0.5) * (srcW / dstW) - 0.5;
			const minX = Math.max(regionMinX, Math.floor(sourceXf - supportX));
			const maxX = Math.min(regionMaxX, Math.ceil(sourceXf + supportX));

			const targetX = dstX + x;
			const targetY = dstY + y;
			if (targetX < 0 || targetX >= destWidth || targetY < 0 || targetY >= destHeight) {
				continue;
			}

			let weightSum = 0;
			let alphaWeighted = 0;
			let alphaStraightWeighted = 0;
			let redWeighted = 0;
			let greenWeighted = 0;
			let blueWeighted = 0;

			for (let sy = minY; sy <= maxY; sy += 1) {
				const wy = lanczosKernel((sourceYf - sy) * kernelScaleY, 3);
				if (Math.abs(wy) < 1e-9) {
					continue;
				}
				for (let sx = minX; sx <= maxX; sx += 1) {
					const wx = lanczosKernel((sourceXf - sx) * kernelScaleX, 3);
					if (Math.abs(wx) < 1e-9) {
						continue;
					}
					const weight = wx * wy;
					const srcOffset = (sy * sourceWidth + sx) * 4;
					const alpha = sourceRgba[srcOffset + 3] / 255;
					const rLinear = SRGB_TO_LINEAR[sourceRgba[srcOffset]];
					const gLinear = SRGB_TO_LINEAR[sourceRgba[srcOffset + 1]];
					const bLinear = SRGB_TO_LINEAR[sourceRgba[srcOffset + 2]];

					weightSum += weight;
					alphaStraightWeighted += weight * alpha;

					if (alphaAware) {
						const weightedAlpha = weight * alpha;
						alphaWeighted += weightedAlpha;
						redWeighted += rLinear * weightedAlpha;
						greenWeighted += gLinear * weightedAlpha;
						blueWeighted += bLinear * weightedAlpha;
					} else {
						redWeighted += rLinear * weight;
						greenWeighted += gLinear * weight;
						blueWeighted += bLinear * weight;
					}
				}
			}

			const dstOffset = (targetY * destWidth + targetX) * 4;
			if (Math.abs(weightSum) < 1e-9) {
				destRgba[dstOffset] = 0;
				destRgba[dstOffset + 1] = 0;
				destRgba[dstOffset + 2] = 0;
				destRgba[dstOffset + 3] = 0;
				continue;
			}

			const alpha = clamp01(alphaStraightWeighted / weightSum);
			destRgba[dstOffset + 3] = clampByte(Math.round(alpha * 255));

			let rLinear;
			let gLinear;
			let bLinear;
			if (alphaAware) {
				if (Math.abs(alphaWeighted) < 1e-9) {
					destRgba[dstOffset] = 0;
					destRgba[dstOffset + 1] = 0;
					destRgba[dstOffset + 2] = 0;
					continue;
				}
				rLinear = redWeighted / alphaWeighted;
				gLinear = greenWeighted / alphaWeighted;
				bLinear = blueWeighted / alphaWeighted;
			} else {
				rLinear = redWeighted / weightSum;
				gLinear = greenWeighted / weightSum;
				bLinear = blueWeighted / weightSum;
			}

			destRgba[dstOffset] = linearToSrgbByte(rLinear);
			destRgba[dstOffset + 1] = linearToSrgbByte(gLinear);
			destRgba[dstOffset + 2] = linearToSrgbByte(bLinear);
		}
	}
}

function lanczosKernel(distance, a) {
	const x = Math.abs(distance);
	if (x < 1e-7) {
		return 1;
	}
	if (x >= a) {
		return 0;
	}
	return sinc(x) * sinc(x / a);
}

function sinc(x) {
	const t = Math.PI * x;
	return Math.sin(t) / t;
}

function applyUnsharpMaskRgba(rgba, width, height, amount = 0.35) {
	if (!rgba || width < 2 || height < 2 || amount <= 0) {
		return;
	}
	const original = Buffer.from(rgba);
	const blurred = Buffer.alloc(original.length, 0);

	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const center = (y * width + x) * 4;
			let r = 0;
			let g = 0;
			let b = 0;
			let weightTotal = 0;

			for (let ky = -1; ky <= 1; ky += 1) {
				const sy = clampInt(y + ky, 0, height - 1);
				for (let kx = -1; kx <= 1; kx += 1) {
					const sx = clampInt(x + kx, 0, width - 1);
					const source = (sy * width + sx) * 4;
					const weight = ky === 0 && kx === 0 ? 4 : ky === 0 || kx === 0 ? 2 : 1;
					r += original[source] * weight;
					g += original[source + 1] * weight;
					b += original[source + 2] * weight;
					weightTotal += weight;
				}
			}

			blurred[center] = Math.round(r / weightTotal);
			blurred[center + 1] = Math.round(g / weightTotal);
			blurred[center + 2] = Math.round(b / weightTotal);
			blurred[center + 3] = original[center + 3];
		}
	}

	for (let i = 0; i < rgba.length; i += 4) {
		rgba[i] = clampByte(Math.round(original[i] + amount * (original[i] - blurred[i])));
		rgba[i + 1] = clampByte(Math.round(original[i + 1] + amount * (original[i + 1] - blurred[i + 1])));
		rgba[i + 2] = clampByte(Math.round(original[i + 2] + amount * (original[i + 2] - blurred[i + 2])));
	}
}

function applyGaussianBlurRgba(rgba, width, height, sigma = 0.55) {
	if (!rgba || width < 2 || height < 2 || sigma <= 0) {
		return;
	}
	const kernel = gaussianKernel1D(sigma);
	const radius = (kernel.length - 1) >> 1;
	const source = Buffer.from(rgba);
	const tmp = Buffer.alloc(source.length, 0);

	// Horizontal pass
	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			let alphaSum = 0;
			let redSum = 0;
			let greenSum = 0;
			let blueSum = 0;
			let alphaStraight = 0;
			let weightSum = 0;

			for (let k = -radius; k <= radius; k += 1) {
				const sampleX = clampInt(x + k, 0, width - 1);
				const weight = kernel[k + radius];
				const srcOffset = (y * width + sampleX) * 4;
				const alpha = source[srcOffset + 3] / 255;
				const weightedAlpha = weight * alpha;
				alphaSum += weightedAlpha;
				alphaStraight += weight * alpha;
				redSum += SRGB_TO_LINEAR[source[srcOffset]] * weightedAlpha;
				greenSum += SRGB_TO_LINEAR[source[srcOffset + 1]] * weightedAlpha;
				blueSum += SRGB_TO_LINEAR[source[srcOffset + 2]] * weightedAlpha;
				weightSum += weight;
			}

			const dstOffset = (y * width + x) * 4;
			const outAlpha = weightSum > 0 ? clamp01(alphaStraight / weightSum) : 0;
			tmp[dstOffset + 3] = clampByte(Math.round(outAlpha * 255));
			if (alphaSum > 1e-9) {
				tmp[dstOffset] = linearToSrgbByte(redSum / alphaSum);
				tmp[dstOffset + 1] = linearToSrgbByte(greenSum / alphaSum);
				tmp[dstOffset + 2] = linearToSrgbByte(blueSum / alphaSum);
			} else {
				tmp[dstOffset] = 0;
				tmp[dstOffset + 1] = 0;
				tmp[dstOffset + 2] = 0;
			}
		}
	}

	// Vertical pass
	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			let alphaSum = 0;
			let redSum = 0;
			let greenSum = 0;
			let blueSum = 0;
			let alphaStraight = 0;
			let weightSum = 0;

			for (let k = -radius; k <= radius; k += 1) {
				const sampleY = clampInt(y + k, 0, height - 1);
				const weight = kernel[k + radius];
				const srcOffset = (sampleY * width + x) * 4;
				const alpha = tmp[srcOffset + 3] / 255;
				const weightedAlpha = weight * alpha;
				alphaSum += weightedAlpha;
				alphaStraight += weight * alpha;
				redSum += SRGB_TO_LINEAR[tmp[srcOffset]] * weightedAlpha;
				greenSum += SRGB_TO_LINEAR[tmp[srcOffset + 1]] * weightedAlpha;
				blueSum += SRGB_TO_LINEAR[tmp[srcOffset + 2]] * weightedAlpha;
				weightSum += weight;
			}

			const dstOffset = (y * width + x) * 4;
			const outAlpha = weightSum > 0 ? clamp01(alphaStraight / weightSum) : 0;
			rgba[dstOffset + 3] = clampByte(Math.round(outAlpha * 255));
			if (alphaSum > 1e-9) {
				rgba[dstOffset] = linearToSrgbByte(redSum / alphaSum);
				rgba[dstOffset + 1] = linearToSrgbByte(greenSum / alphaSum);
				rgba[dstOffset + 2] = linearToSrgbByte(blueSum / alphaSum);
			} else {
				rgba[dstOffset] = 0;
				rgba[dstOffset + 1] = 0;
				rgba[dstOffset + 2] = 0;
			}
		}
	}
}

function applyColorBoostRgba(rgba, width, height, boost = 1) {
	if (!rgba || width < 1 || height < 1 || Math.abs(boost - 1) < 1e-6) {
		return;
	}
	for (let i = 0; i < rgba.length; i += 4) {
		const alpha = rgba[i + 3];
		if (alpha === 0) {
			continue;
		}
		const r = SRGB_TO_LINEAR[rgba[i]];
		const g = SRGB_TO_LINEAR[rgba[i + 1]];
		const b = SRGB_TO_LINEAR[rgba[i + 2]];
		const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
		const outR = luma + (r - luma) * boost;
		const outG = luma + (g - luma) * boost;
		const outB = luma + (b - luma) * boost;
		rgba[i] = linearToSrgbByte(outR);
		rgba[i + 1] = linearToSrgbByte(outG);
		rgba[i + 2] = linearToSrgbByte(outB);
	}
}

function applyGradientDitherRgba(rgba, width, height, amount = 0.2) {
	if (!rgba || width < 1 || height < 1 || amount <= 0) {
		return;
	}
	const clamped = clamp01(amount);
	const amplitude = (2 / 255) * clamped;
	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const offset = (y * width + x) * 4;
			if (rgba[offset + 3] === 0) {
				continue;
			}
			const threshold = BAYER_8X8[y & 7][x & 7];
			const noise = (threshold - 0.5) * 2 * amplitude;
			const r = SRGB_TO_LINEAR[rgba[offset]];
			const g = SRGB_TO_LINEAR[rgba[offset + 1]];
			const b = SRGB_TO_LINEAR[rgba[offset + 2]];
			rgba[offset] = linearToSrgbByte(r + noise);
			rgba[offset + 1] = linearToSrgbByte(g + noise);
			rgba[offset + 2] = linearToSrgbByte(b + noise);
		}
	}
}

function gaussianKernel1D(sigma) {
	const clampedSigma = Math.max(0.1, sigma);
	const radius = Math.max(1, Math.ceil(clampedSigma * 2.5));
	const size = radius * 2 + 1;
	const kernel = new Float32Array(size);
	let sum = 0;
	for (let i = -radius; i <= radius; i += 1) {
		const value = Math.exp(-(i * i) / (2 * clampedSigma * clampedSigma));
		kernel[i + radius] = value;
		sum += value;
	}
	if (sum > 0) {
		for (let i = 0; i < size; i += 1) {
			kernel[i] /= sum;
		}
	}
	return kernel;
}

function clampInt(value, min, max) {
	if (value < min) {
		return min;
	}
	if (value > max) {
		return max;
	}
	return value;
}

function cubicWeight(distance) {
	const x = Math.abs(distance);
	if (x >= 2) {
		return 0;
	}
	if (x < 1) {
		return 1.5 * x * x * x - 2.5 * x * x + 1;
	}
	return -0.5 * x * x * x + 2.5 * x * x - 4 * x + 2;
}

function clamp01(value) {
	if (value < 0) {
		return 0;
	}
	if (value > 1) {
		return 1;
	}
	return value;
}

function clampByte(value) {
	if (value < 0) {
		return 0;
	}
	if (value > 255) {
		return 255;
	}
	return value;
}

function linearToSrgbByte(value) {
	const clamped = clamp01(value);
	if (clamped <= 0.0031308) {
		return clampByte(Math.round(clamped * 12.92 * 255));
	}
	return clampByte(Math.round((1.055 * Math.pow(clamped, 1 / 2.4) - 0.055) * 255));
}

const SRGB_TO_LINEAR = (() => {
	const table = new Float32Array(256);
	for (let i = 0; i < 256; i += 1) {
		const s = i / 255;
		if (s <= 0.04045) {
			table[i] = s / 12.92;
		} else {
			table[i] = Math.pow((s + 0.055) / 1.055, 2.4);
		}
	}
	return table;
})();

const BAYER_8X8 = [
	[0, 48, 12, 60, 3, 51, 15, 63],
	[32, 16, 44, 28, 35, 19, 47, 31],
	[8, 56, 4, 52, 11, 59, 7, 55],
	[40, 24, 36, 20, 43, 27, 39, 23],
	[2, 50, 14, 62, 1, 49, 13, 61],
	[34, 18, 46, 30, 33, 17, 45, 29],
	[10, 58, 6, 54, 9, 57, 5, 53],
	[42, 26, 38, 22, 41, 25, 37, 21],
].map((row) => row.map((value) => value / 63));

function buildDdsBuffer({ compressedData, width, height, format }) {
	const fourCC = FOURCC_BY_FORMAT[format];
	const blockBytes = BLOCK_BYTES_BY_FORMAT[format];
	const linearSize = Math.max(1, Math.ceil(width / 4)) * Math.max(1, Math.ceil(height / 4)) * blockBytes;
	const header = Buffer.alloc(128, 0);

	header.writeUInt32LE(0x20534444, 0);
	header.writeUInt32LE(124, 4);
	header.writeUInt32LE(0x00081007, 8);
	header.writeUInt32LE(height, 12);
	header.writeUInt32LE(width, 16);
	header.writeUInt32LE(linearSize, 20);
	header.writeUInt32LE(0, 24);
	header.writeUInt32LE(0, 28);

	header.writeUInt32LE(32, 76);
	header.writeUInt32LE(0x00000004, 80);
	header.write(fourCC, 84, 4, "ascii");

	header.writeUInt32LE(0x00001000, 108);

	const payload = Buffer.from(compressedData);
	return Buffer.concat([header, payload]);
}

function buildOutputFilename(inputName, format) {
	const name = String(inputName || "texture")
		.replace(/\\/g, "/")
		.split("/")
		.pop();
	const withoutExt = name.replace(/\.[^.]+$/, "") || "texture";
	const safeBase = withoutExt.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "") || "texture";
	return `${safeBase}.${String(format || "dds").toLowerCase()}.dds`;
}

function buildFilenamePrefixFromToken(token) {
	return String(token || "")
		.split(/[^A-Za-z0-9]+/)
		.filter(Boolean)
		.map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1).toLowerCase()}`)
		.join("_");
}

function buildZipArchive(files) {
	const localParts = [];
	const centralParts = [];
	let offset = 0;

	for (const file of files) {
		const nameBuffer = Buffer.from(String(file.name || "file.bin"), "utf8");
		const payload = Buffer.from(file.data || "");
		const crc = crc32(payload);

		const localHeader = Buffer.alloc(30);
		localHeader.writeUInt32LE(0x04034b50, 0);
		localHeader.writeUInt16LE(20, 4);
		localHeader.writeUInt16LE(0, 6);
		localHeader.writeUInt16LE(0, 8);
		localHeader.writeUInt16LE(0, 10);
		localHeader.writeUInt16LE(0, 12);
		localHeader.writeUInt32LE(crc, 14);
		localHeader.writeUInt32LE(payload.length, 18);
		localHeader.writeUInt32LE(payload.length, 22);
		localHeader.writeUInt16LE(nameBuffer.length, 26);
		localHeader.writeUInt16LE(0, 28);

		localParts.push(localHeader, nameBuffer, payload);

		const centralHeader = Buffer.alloc(46);
		centralHeader.writeUInt32LE(0x02014b50, 0);
		centralHeader.writeUInt16LE(20, 4);
		centralHeader.writeUInt16LE(20, 6);
		centralHeader.writeUInt16LE(0, 8);
		centralHeader.writeUInt16LE(0, 10);
		centralHeader.writeUInt16LE(0, 12);
		centralHeader.writeUInt16LE(0, 14);
		centralHeader.writeUInt32LE(crc, 16);
		centralHeader.writeUInt32LE(payload.length, 20);
		centralHeader.writeUInt32LE(payload.length, 24);
		centralHeader.writeUInt16LE(nameBuffer.length, 28);
		centralHeader.writeUInt16LE(0, 30);
		centralHeader.writeUInt16LE(0, 32);
		centralHeader.writeUInt16LE(0, 34);
		centralHeader.writeUInt16LE(0, 36);
		centralHeader.writeUInt32LE(0, 38);
		centralHeader.writeUInt32LE(offset, 42);

		centralParts.push(centralHeader, nameBuffer);
		offset += localHeader.length + nameBuffer.length + payload.length;
	}

	const centralDirectorySize = sumBufferLengths(centralParts);
	const centralDirectoryOffset = offset;

	const endRecord = Buffer.alloc(22);
	endRecord.writeUInt32LE(0x06054b50, 0);
	endRecord.writeUInt16LE(0, 4);
	endRecord.writeUInt16LE(0, 6);
	endRecord.writeUInt16LE(files.length, 8);
	endRecord.writeUInt16LE(files.length, 10);
	endRecord.writeUInt32LE(centralDirectorySize, 12);
	endRecord.writeUInt32LE(centralDirectoryOffset, 16);
	endRecord.writeUInt16LE(0, 20);

	return Buffer.concat([...localParts, ...centralParts, endRecord]);
}

function sumBufferLengths(buffers) {
	let total = 0;
	for (const buffer of buffers) {
		total += buffer.length;
	}
	return total;
}

function crc32(buffer) {
	let crc = 0xffffffff;
	for (let i = 0; i < buffer.length; i += 1) {
		crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ buffer[i]) & 0xff];
	}
	return (crc ^ 0xffffffff) >>> 0;
}

const CRC32_TABLE = buildCrc32Table();

function buildCrc32Table() {
	const table = new Uint32Array(256);
	for (let i = 0; i < 256; i += 1) {
		let c = i;
		for (let j = 0; j < 8; j += 1) {
			if (c & 1) {
				c = 0xedb88320 ^ (c >>> 1);
			} else {
				c = c >>> 1;
			}
		}
		table[i] = c >>> 0;
	}
	return table;
}

function json(statusCode, payload) {
	return {
		statusCode,
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "no-store",
		},
		body: JSON.stringify(payload),
	};
}

async function parseMultipartForm(event) {
	const contentType = event.headers?.["content-type"] || event.headers?.["Content-Type"];
	if (!contentType || !contentType.toLowerCase().includes("multipart/form-data")) {
		const err = new Error("Content-Type must be multipart/form-data.");
		err.statusCode = 415;
		throw err;
	}

	const body = event.isBase64Encoded ? Buffer.from(event.body || "", "base64") : Buffer.from(event.body || "", "utf8");
	const bb = Busboy({
		headers: { "content-type": contentType },
		limits: {
			files: 1,
			fileSize: MAX_UPLOAD_BYTES,
		},
	});

	return await new Promise((resolve, reject) => {
		const fields = {};
		let fileBuffer = null;
		let filename = "";
		let fileFound = false;

		bb.on("field", (fieldName, value) => {
			fields[fieldName] = value;
		});

		bb.on("file", (_fieldName, file, info) => {
			fileFound = true;
			filename = String(info?.filename || "upload.png");
			const chunks = [];
			let tooLarge = false;

			file.on("data", (chunk) => {
				chunks.push(chunk);
			});

			file.on("limit", () => {
				tooLarge = true;
			});

			file.on("end", () => {
				if (tooLarge) {
					const err = new Error(`File too large. Max size is ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))}MB.`);
					err.statusCode = 413;
					reject(err);
					return;
				}
				fileBuffer = Buffer.concat(chunks);
			});
		});

		bb.on("error", (error) => {
			reject(error);
		});

		bb.on("close", () => {
			if (!fileFound || !fileBuffer) {
				const err = new Error("No uploaded file found.");
				err.statusCode = 400;
				reject(err);
				return;
			}
			resolve({
				fields,
				fileBuffer,
				filename,
			});
		});

		bb.end(body);
	});
}
