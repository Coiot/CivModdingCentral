function buildCrcTable() {
	const table = new Uint32Array(256);
	for (let i = 0; i < 256; i += 1) {
		let c = i;
		for (let k = 0; k < 8; k += 1) {
			c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		}
		table[i] = c >>> 0;
	}
	return table;
}

const CRC_TABLE = buildCrcTable();

function crc32(bytes) {
	let crc = 0xffffffff;
	for (let i = 0; i < bytes.length; i += 1) {
		crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
	}
	return (crc ^ 0xffffffff) >>> 0;
}

function pushUint16(buffer, value) {
	buffer.push(value & 0xff, (value >>> 8) & 0xff);
}

function pushUint32(buffer, value) {
	buffer.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function encodeText(value) {
	return new TextEncoder().encode(String(value || ""));
}

export function buildZipBlob(files) {
	if (!Array.isArray(files) || !files.length) {
		return new Blob([], { type: "application/zip" });
	}

	const fileEntries = files
		.filter((file) => file && file.name)
		.map((file) => {
			const data = typeof file.content === "string" ? encodeText(file.content) : file.content || new Uint8Array();
			const nameBytes = encodeText(file.name);
			const crc = crc32(data);
			return {
				name: file.name,
				nameBytes,
				data,
				crc,
			};
		});

	let localOffset = 0;
	const fileRecords = [];
	const localChunks = [];

	for (const entry of fileEntries) {
		const localHeader = [];
		pushUint32(localHeader, 0x04034b50);
		pushUint16(localHeader, 20);
		pushUint16(localHeader, 0);
		pushUint16(localHeader, 0);
		pushUint16(localHeader, 0);
		pushUint16(localHeader, 0);
		pushUint32(localHeader, entry.crc);
		pushUint32(localHeader, entry.data.length);
		pushUint32(localHeader, entry.data.length);
		pushUint16(localHeader, entry.nameBytes.length);
		pushUint16(localHeader, 0);

		const localHeaderBytes = new Uint8Array(localHeader);
		localChunks.push(localHeaderBytes, entry.nameBytes, entry.data);

		fileRecords.push({
			entry,
			offset: localOffset,
		});

		localOffset += localHeaderBytes.length + entry.nameBytes.length + entry.data.length;
	}

	const centralChunks = [];
	let centralSize = 0;

	for (const record of fileRecords) {
		const { entry, offset } = record;
		const centralHeader = [];
		pushUint32(centralHeader, 0x02014b50);
		pushUint16(centralHeader, 20);
		pushUint16(centralHeader, 20);
		pushUint16(centralHeader, 0);
		pushUint16(centralHeader, 0);
		pushUint16(centralHeader, 0);
		pushUint16(centralHeader, 0);
		pushUint32(centralHeader, entry.crc);
		pushUint32(centralHeader, entry.data.length);
		pushUint32(centralHeader, entry.data.length);
		pushUint16(centralHeader, entry.nameBytes.length);
		pushUint16(centralHeader, 0);
		pushUint16(centralHeader, 0);
		pushUint16(centralHeader, 0);
		pushUint16(centralHeader, 0);
		pushUint32(centralHeader, 0);
		pushUint32(centralHeader, offset);

		const centralHeaderBytes = new Uint8Array(centralHeader);
		centralChunks.push(centralHeaderBytes, entry.nameBytes);
		centralSize += centralHeaderBytes.length + entry.nameBytes.length;
	}

	const endRecord = [];
	pushUint32(endRecord, 0x06054b50);
	pushUint16(endRecord, 0);
	pushUint16(endRecord, 0);
	pushUint16(endRecord, fileRecords.length);
	pushUint16(endRecord, fileRecords.length);
	pushUint32(endRecord, centralSize);
	pushUint32(endRecord, localOffset);
	pushUint16(endRecord, 0);

	const endRecordBytes = new Uint8Array(endRecord);

	return new Blob([...localChunks, ...centralChunks, endRecordBytes], { type: "application/zip" });
}
