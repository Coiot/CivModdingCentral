export function buildLikelyMapPrefetchQueue(maps, currentMapId, limit = 3) {
	if (!Array.isArray(maps) || maps.length <= 1 || limit <= 0) {
		return [];
	}

	const validIds = maps.map((entry) => entry?.id).filter(Boolean);
	const currentIndex = validIds.indexOf(currentMapId);
	const queue = [];
	const seen = new Set(currentMapId ? [currentMapId] : []);

	const pushIfNew = (mapId) => {
		if (!mapId || seen.has(mapId) || queue.length >= limit) {
			return;
		}
		seen.add(mapId);
		queue.push(mapId);
	};

	if (currentIndex >= 0) {
		for (let offset = 1; queue.length < limit && offset < validIds.length; offset += 1) {
			pushIfNew(validIds[currentIndex + offset]);
			pushIfNew(validIds[currentIndex - offset]);
		}
	}

	for (const mapId of validIds) {
		if (queue.length >= limit) {
			break;
		}
		pushIfNew(mapId);
	}

	return queue;
}
