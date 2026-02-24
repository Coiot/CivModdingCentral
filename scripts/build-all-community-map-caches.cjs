#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = process.cwd();
const COMMUNITY_DIR = path.join(ROOT, 'static/community');
const BUILDER = path.join(ROOT, 'scripts/build-community-map-cache.cjs');

if (!fs.existsSync(COMMUNITY_DIR)) {
  console.error(`Community directory not found: ${COMMUNITY_DIR}`);
  process.exit(1);
}

const mapFiles = fs
  .readdirSync(COMMUNITY_DIR)
  .filter((name) => /\.civ5map$/i.test(name))
  .sort((a, b) => a.localeCompare(b));

if (!mapFiles.length) {
  console.log('No .civ5map files found in static/community.');
  process.exit(0);
}

for (const file of mapFiles) {
  const mapPath = path.join(COMMUNITY_DIR, file);
  const stem = file.replace(/\.civ5map$/i, '');

  console.log(`Generating cache for ${file}`);
  const result = spawnSync(
    process.execPath,
    [BUILDER, '--map', mapPath, '--name', stem, '--outDir', COMMUNITY_DIR],
    { stdio: 'inherit' }
  );

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log(`Done. Generated base caches for ${mapFiles.length} maps.`);
