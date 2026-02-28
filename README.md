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

## DDS Converter: Dedicated Server

Use a separate server when you want higher quality native DDS encoding (for example via `CompressonatorCLI`) instead of browser/Netlify-only conversion.

Run locally:

```bash
CMC_DDS_NATIVE_BIN=/absolute/path/to/CompressonatorCLI npm run dds:server
```

Server defaults:
- endpoint: `POST /convert-dds`
- health check: `GET /healthz`
- port: `8787` (override with `PORT`)
- host: `0.0.0.0` (override with `HOST`)
- CORS: all origins by default (lock down with `CMC_DDS_ALLOWED_ORIGINS=https://your-site.netlify.app`)

Point the web app to this server:

```bash
VITE_DDS_CONVERTER_ENDPOINT=https://your-converter-host/convert-dds
```

For Netlify production, set `VITE_DDS_CONVERTER_ENDPOINT` in Site Settings -> Environment Variables.

### Deploy On Render (Docker)

Files added for this:
- `Dockerfile.dds-converter`
- `scripts/dds-entrypoint.sh`
- `.dockerignore`

Steps:

1. Push this repo to GitHub/GitLab.
2. In Render, click `New +` -> `Web Service`.
3. Select your repo.
4. Runtime: `Docker`.
5. Dockerfile Path: `Dockerfile.dds-converter`.
6. Set Region and plan.
7. Set environment variables:
   - `CMC_DDS_ALLOWED_ORIGINS=https://<your-netlify-site>.netlify.app`
   - Optional: `CMC_DDS_NATIVE_BIN=/opt/compressonator/CompressonatorCLI` (usually auto-set by entrypoint if binary exists there)
8. If you have a direct Linux tarball URL for CompressonatorCLI, add build arg:
   - `COMPRESSONATOR_TARBALL_URL=<direct-tarball-url>`
9. Deploy.
10. Verify health:
   - `https://<render-service>.onrender.com/healthz`
11. In Netlify (frontend), set:
   - `VITE_DDS_CONVERTER_ENDPOINT=https://<render-service>.onrender.com/convert-dds`
12. Trigger a new Netlify deploy.

Notes:
- If no native binary is available, service still runs with `dxt-js`.
- To bundle a binary from repo instead of URL, place executable at `vendor/CompressonatorCLI` before deploy.

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
