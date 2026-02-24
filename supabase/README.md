# CMC Editor Access Setup

## 1) Create the allowlist table
Run:

- `supabase/sql/2026-02-23-cmc-editor-access.sql`
- `supabase/sql/2026-02-23-cmc-map-pins.sql`

This creates `public.cmc_editor_access` and an RLS policy so signed-in users can only read their own email row.
It also creates `public.cmc_map_pins` for shared civilization pin state per map.

## 2) Sync emails from Google Sheet2 column B
Set env vars (in `.env` or `.env.local`):

- `GOOGLE_SHEET_ID`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional:

- `GOOGLE_SHEET_EDITOR_SHEET` (default `Sheet2`)
- `GOOGLE_SHEET_EDITOR_COLUMN` (default `B`)
- `SUPABASE_EDITOR_ALLOWLIST_TABLE` (default `cmc_editor_access`)

Run:

- `npm run sync:editor-access`

## 3) Frontend config
Set client env vars:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_EDITOR_CHECK_FUNCTION`
- `VITE_SUPABASE_EDITOR_CHECK_MAP_ID`
- `VITE_SUPABASE_PINS_TABLE=cmc_map_pins`

Civilization pins are synced through Supabase on a 60-second interval:
- local edits are instant
- cloud push/pull happens roughly once per minute
