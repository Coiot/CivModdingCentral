const SQRT3 = Math.sqrt(3);

export function buildHexVertices(size) {
  const vertices = [];
  for (let index = 0; index < 6; index += 1) {
    const angle = (Math.PI / 180) * (60 * index - 90);
    vertices.push({
      x: size * Math.cos(angle),
      y: size * Math.sin(angle),
    });
  }
  return vertices;
}

export function tileCenter(col, sourceRow, height, hexSize) {
  const displayRow = height - 1 - sourceRow;
  const hexWidth = hexSize * SQRT3;
  const verticalStep = hexSize * 1.5;
  const originX = hexWidth / 2;
  const originY = hexSize;

  return {
    x: col * hexWidth + (displayRow % 2 ? 0 : hexWidth / 2) + originX,
    y: displayRow * verticalStep + originY,
  };
}

export function computeMapMetrics(width, height, hexSize) {
  const hexWidth = hexSize * SQRT3;
  const halfHexWidth = hexWidth / 2;
  const halfHexHeight = hexSize;

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const center = tileCenter(col, row, height, hexSize);
      minX = Math.min(minX, center.x - halfHexWidth);
      maxX = Math.max(maxX, center.x + halfHexWidth);
      minY = Math.min(minY, center.y - halfHexHeight);
      maxY = Math.max(maxY, center.y + halfHexHeight);
    }
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.ceil(maxX - minX),
    height: Math.ceil(maxY - minY),
    hexWidth,
  };
}
