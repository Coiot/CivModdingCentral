import http from "node:http";
import { URL } from "node:url";
import { handler as convertDdsHandler } from "../netlify/functions/convert-dds.mjs";

const PORT = parsePort(process.env.PORT, 8787);
const HOST = process.env.HOST || "0.0.0.0";
const MAX_REQUEST_BYTES = 25 * 1024 * 1024;
const ALLOWED_ORIGINS = parseAllowedOrigins(process.env.CMC_DDS_ALLOWED_ORIGINS || "*");

const server = http.createServer(async (request, response) => {
	applyCorsHeaders(request, response);

	if (request.method === "OPTIONS") {
		response.statusCode = 204;
		response.end();
		return;
	}

	const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
	if (request.method === "GET" && url.pathname === "/healthz") {
		writeJson(response, 200, {
			ok: true,
			service: "dds-converter",
		});
		return;
	}

	if (request.method === "POST" && (url.pathname === "/convert-dds" || url.pathname === "/.netlify/functions/convert-dds")) {
		try {
			const body = await readRequestBody(request, MAX_REQUEST_BYTES);
			const netlifyEvent = {
				httpMethod: "POST",
				headers: request.headers,
				isBase64Encoded: true,
				body: body.toString("base64"),
			};
			const result = await convertDdsHandler(netlifyEvent);
			writeNetlifyStyleResponse(response, result);
			return;
		} catch (error) {
			writeJson(response, Number(error?.statusCode || 500), {
				error: error?.message || "Unexpected converter server error.",
			});
			return;
		}
	}

	writeJson(response, 404, {
		error: "Not found.",
	});
});

server.listen(PORT, HOST, () => {
	console.log(`DDS converter server listening at http://${HOST}:${PORT}`);
	if (ALLOWED_ORIGINS.size === 0) {
		console.log("CORS: *");
	} else {
		console.log(`CORS: ${Array.from(ALLOWED_ORIGINS).join(", ")}`);
	}
});

function parsePort(value, fallback) {
	const parsed = Number.parseInt(String(value || ""), 10);
	if (!Number.isFinite(parsed) || parsed < 1 || parsed > 65535) {
		return fallback;
	}
	return parsed;
}

function parseAllowedOrigins(value) {
	const raw = String(value || "").trim();
	if (!raw || raw === "*") {
		return new Set();
	}
	return new Set(
		raw
			.split(",")
			.map((item) => item.trim())
			.filter(Boolean),
	);
}

function applyCorsHeaders(request, response) {
	const origin = String(request.headers.origin || "");
	if (ALLOWED_ORIGINS.size === 0) {
		response.setHeader("Access-Control-Allow-Origin", "*");
	} else if (origin && ALLOWED_ORIGINS.has(origin)) {
		response.setHeader("Access-Control-Allow-Origin", origin);
		response.setHeader("Vary", "Origin");
	}
	response.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
	response.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, Authorization");
	response.setHeader("Access-Control-Max-Age", "86400");
}

async function readRequestBody(request, maxBytes) {
	return await new Promise((resolve, reject) => {
		let size = 0;
		const chunks = [];
		request.on("data", (chunk) => {
			size += chunk.length;
			if (size > maxBytes) {
				const error = new Error(`Payload too large. Max is ${Math.floor(maxBytes / (1024 * 1024))}MB.`);
				error.statusCode = 413;
				reject(error);
				request.destroy();
				return;
			}
			chunks.push(chunk);
		});
		request.on("error", (error) => {
			reject(error);
		});
		request.on("end", () => {
			resolve(Buffer.concat(chunks));
		});
	});
}

function writeNetlifyStyleResponse(response, payload) {
	const statusCode = Number(payload?.statusCode || 200);
	response.statusCode = statusCode;
	const headers = payload?.headers || {};
	for (const [key, value] of Object.entries(headers)) {
		if (value !== undefined && value !== null) {
			response.setHeader(key, String(value));
		}
	}

	const body = payload?.body || "";
	if (payload?.isBase64Encoded) {
		response.end(Buffer.from(String(body), "base64"));
		return;
	}
	response.end(String(body));
}

function writeJson(response, statusCode, data) {
	response.statusCode = statusCode;
	response.setHeader("Content-Type", "application/json");
	response.end(JSON.stringify(data));
}
