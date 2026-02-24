# Civ Modding Central

Svelte + Vite static site for Civilization map visualization, designed for Netlify.

## Run locally

```bash
npm install
npm run dev
```

## Build static site

```bash
npm run build
```

Netlify uses `netlify.toml`:
- build command: `npm run build`
- publish dir: `dist`

## CBRX map cache build

This project includes a cache-builder adapted from `cbr-main/scripts/build-community-map-cache.js`.

```bash
npm run build:cache -- --map /path/to/map.civ5map --save /path/to/save.Civ5Save --name CBRXMapOct62025_V2
```

Outputs are written to `static/community`.

## Civilization pins

Pinned civilizations are loaded from JSON files under `static/maps`.
`/static/maps/cbrx.pins.json` is the first editor dataset.
