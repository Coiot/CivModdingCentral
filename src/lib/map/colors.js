function normalizeToken(value) {
  return String(value || '').toUpperCase();
}

const TERRAIN_COLORS = {
  TERRAIN_GRASS: '#8ebc68',
  TERRAIN_PLAINS: '#c1b16f',
  TERRAIN_DESERT: '#dcc78c',
  TERRAIN_TUNDRA: '#b6b6aa',
  TERRAIN_SNOW: '#e7ecef',
  TERRAIN_COAST: '#61a8d8',
  TERRAIN_OCEAN: '#3d6f95',
};

const FEATURE_TINT = {
  FEATURE_FOREST: '#4f7f48',
  FEATURE_JUNGLE: '#2f6f44',
  FEATURE_MARSH: '#597b52',
  FEATURE_ICE: '#e2f3ff',
};

export function resolveTerrainColor(terrainName, featureName, elevation) {
  const terrain = normalizeToken(terrainName);
  const feature = normalizeToken(featureName);

  let fill = TERRAIN_COLORS[terrain] || '#76848f';

  if (feature && FEATURE_TINT[feature]) {
    fill = blend(fill, FEATURE_TINT[feature], 0.28);
  }

  if (Number(elevation) === 2) {
    fill = blend(fill, '#6e5b4d', 0.35);
  }

  if (Number(elevation) === 1) {
    fill = blend(fill, '#d3d9de', 0.2);
  }

  return fill;
}

function blend(baseHex, tintHex, amount) {
  const b = parseHex(baseHex);
  const t = parseHex(tintHex);
  const mix = {
    r: Math.round(b.r + (t.r - b.r) * amount),
    g: Math.round(b.g + (t.g - b.g) * amount),
    b: Math.round(b.b + (t.b - b.b) * amount),
  };

  return `#${toHex(mix.r)}${toHex(mix.g)}${toHex(mix.b)}`;
}

function parseHex(hex) {
  const value = hex.replace('#', '');
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function toHex(value) {
  return value.toString(16).padStart(2, '0');
}
