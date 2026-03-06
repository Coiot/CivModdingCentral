const FILE_TAG_PATTERN = /<File\b([^>]*)>([\s\S]*?)<\/File>/g;

export function decodeXmlText(value) {
	return String(value || "")
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&amp;/g, "&");
}

export function normalizeArchivePath(value) {
	const parts = String(value || "")
		.replace(/\\/g, "/")
		.split("/")
		.filter(Boolean);
	if (parts.length === 0) {
		return "";
	}
	if (parts.some((segment) => segment === "." || segment === "..")) {
		return "";
	}
	return parts.join("/");
}

export function md5HexBytes(input) {
	const sourceBytes = input instanceof Uint8Array ? input : new Uint8Array(input || 0);
	const bytes = Array.from(sourceBytes);
	const toHex = (value) => value.toString(16).padStart(2, "0");
	const rotateLeft = (value, shift) => ((value << shift) | (value >>> (32 - shift))) >>> 0;
	const add32 = (a, b) => (a + b) >>> 0;
	const s = [
		7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21,
		6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
	];
	const k = new Array(64).fill(0).map((_, index) => Math.floor(Math.abs(Math.sin(index + 1)) * 0x100000000) >>> 0);
	const originalBitLen = BigInt(bytes.length) * 8n;
	bytes.push(0x80);
	while (bytes.length % 64 !== 56) {
		bytes.push(0);
	}
	for (let index = 0; index < 8; index += 1) {
		bytes.push(Number((originalBitLen >> BigInt(8 * index)) & 0xffn));
	}
	let a0 = 0x67452301;
	let b0 = 0xefcdab89;
	let c0 = 0x98badcfe;
	let d0 = 0x10325476;
	for (let offset = 0; offset < bytes.length; offset += 64) {
		const m = new Array(16).fill(0);
		for (let index = 0; index < 16; index += 1) {
			const start = offset + index * 4;
			m[index] = bytes[start] | (bytes[start + 1] << 8) | (bytes[start + 2] << 16) | (bytes[start + 3] << 24);
		}
		let a = a0;
		let b = b0;
		let c = c0;
		let d = d0;
		for (let index = 0; index < 64; index += 1) {
			let f = 0;
			let g = 0;
			if (index < 16) {
				f = (b & c) | (~b & d);
				g = index;
			} else if (index < 32) {
				f = (d & b) | (~d & c);
				g = (5 * index + 1) % 16;
			} else if (index < 48) {
				f = b ^ c ^ d;
				g = (3 * index + 5) % 16;
			} else {
				f = c ^ (b | ~d);
				g = (7 * index) % 16;
			}
			const temp = d;
			d = c;
			c = b;
			const sum = add32(add32(a, f), add32(k[index], m[g]));
			b = add32(b, rotateLeft(sum, s[index]));
			a = temp;
		}
		a0 = add32(a0, a);
		b0 = add32(b0, b);
		c0 = add32(c0, c);
		d0 = add32(d0, d);
	}
	return [a0, b0, c0, d0]
		.map((value) => [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff])
		.flat()
		.map(toHex)
		.join("")
		.toUpperCase();
}

export function md5HexText(input) {
	return md5HexBytes(new TextEncoder().encode(String(input || "")));
}

function decodeUtf8Bytes(bytes) {
	const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || 0);
	const hasBom = view.length >= 3 && view[0] === 0xef && view[1] === 0xbb && view[2] === 0xbf;
	const textBytes = hasBom ? view.slice(3) : view;
	return {
		hasBom,
		text: new TextDecoder("utf-8").decode(textBytes),
	};
}

function encodeUtf8Text(text, hasBom) {
	const encoded = new TextEncoder().encode(text);
	if (!hasBom) {
		return encoded;
	}
	const withBom = new Uint8Array(encoded.length + 3);
	withBom[0] = 0xef;
	withBom[1] = 0xbb;
	withBom[2] = 0xbf;
	withBom.set(encoded, 3);
	return withBom;
}

export function findModinfoPaths(entriesByPath) {
	return Array.from(entriesByPath.keys())
		.filter((path) => path.toLowerCase().endsWith(".modinfo"))
		.sort((left, right) => left.localeCompare(right));
}

export function synchronizeModinfoMd5Entries(entriesByPath) {
	for (const modinfoPath of findModinfoPaths(entriesByPath)) {
		const entry = entriesByPath.get(modinfoPath);
		if (!entry) {
			continue;
		}

		const { hasBom, text } = decodeUtf8Bytes(entry.bytes);
		let changed = false;
		const updatedText = text.replace(FILE_TAG_PATTERN, (fullMatch, attrsText, pathText) => {
			const archiveRelativePath = normalizeArchivePath(decodeXmlText(pathText.trim()));
			if (!archiveRelativePath) {
				changed = true;
				return "";
			}

			const candidateEntry = entriesByPath.get(archiveRelativePath);
			if (!candidateEntry) {
				changed = true;
				return "";
			}

			const actualMd5 = md5HexBytes(candidateEntry.bytes);
			if (/\bmd5="[^"]*"/i.test(attrsText)) {
				const nextAttrs = attrsText.replace(/\bmd5="[^"]*"/i, `md5="${actualMd5}"`);
				if (nextAttrs !== attrsText) {
					changed = true;
				}
				return `<File${nextAttrs}>${pathText}</File>`;
			}

			changed = true;
			return `<File md5="${actualMd5}"${attrsText}>${pathText}</File>`;
		});

		if (changed) {
			entry.bytes = encodeUtf8Text(updatedText, hasBom);
		}
	}
}

export function validateModinfoMd5Entries(entriesByPath) {
	const issues = [];
	const modinfoPaths = findModinfoPaths(entriesByPath);

	if (modinfoPaths.length === 0) {
		issues.push("No .modinfo file found in the selected files.");
		return issues;
	}

	for (const modinfoPath of modinfoPaths) {
		const entry = entriesByPath.get(modinfoPath);
		if (!entry) {
			continue;
		}

		const { text } = decodeUtf8Bytes(entry.bytes);
		let fileEntryCount = 0;
		text.replace(FILE_TAG_PATTERN, (_fullMatch, attrsText, pathText) => {
			fileEntryCount += 1;
			const archiveRelativePath = normalizeArchivePath(decodeXmlText(pathText.trim()));
			if (!archiveRelativePath) {
				issues.push(`${modinfoPath}: empty or invalid <File> path value.`);
				return _fullMatch;
			}

			const candidateEntry = entriesByPath.get(archiveRelativePath);
			if (!candidateEntry) {
				issues.push(`${modinfoPath}: missing file entry "${archiveRelativePath}".`);
				return _fullMatch;
			}

			const md5Match = String(attrsText || "").match(/\bmd5="([^"]*)"/i);
			if (!md5Match || !md5Match[1].trim()) {
				issues.push(`${modinfoPath}: missing md5 for "${archiveRelativePath}".`);
				return _fullMatch;
			}

			const expectedMd5 = md5Match[1].trim().toUpperCase();
			const actualMd5 = md5HexBytes(candidateEntry.bytes);
			if (expectedMd5 !== actualMd5) {
				issues.push(`${modinfoPath}: md5 mismatch for "${archiveRelativePath}".`);
			}

			return _fullMatch;
		});

		if (fileEntryCount === 0) {
			issues.push(`${modinfoPath}: contains no <File> entries.`);
		}
	}

	return issues;
}
