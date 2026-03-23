# CMC Editor Access Setup

## 1) Create the allowlist table
Run:

- `supabase/sql/2026-02-23-cmc-editor-access.sql`
- `supabase/sql/2026-02-23-cmc-map-pins.sql`
- `supabase/sql/2026-03-12-cmc-guided-planner-projects.sql`
- `supabase/sql/2026-03-22-cmc-pedia.sql`

This creates `public.cmc_editor_access` and an RLS policy so signed-in users can only read their own email row.
It also creates `public.cmc_map_pins` for shared civilization pin state per map.
It also creates `public.cmc_guided_planner_projects` for multi-project planner saves, export/import handoff, and collaborator access by email.
It also creates the private `cmc-guided-planner-icons` Storage bucket plus policies so shared planner civ icons can be read and updated by project collaborators.
It also creates `public.cmc_pedia_entries` and `public.cmc_pedia_collections` for the modded civ pedia. These tables are publicly readable, editor-writeable, and support soft-deleting entries so bundled local pedia rows can be hidden without removing the fallback files first.

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
- `VITE_SUPABASE_PLANNER_PROJECTS_TABLE=cmc_guided_planner_projects`
- `VITE_SUPABASE_PLANNER_ICONS_BUCKET=cmc-guided-planner-icons`
- `VITE_SUPABASE_PEDIA_ENTRIES_TABLE=cmc_pedia_entries`
- `VITE_SUPABASE_PEDIA_COLLECTIONS_TABLE=cmc_pedia_collections`

Civilization pins are synced through Supabase on a 60-second interval:
- local edits are instant
- cloud push/pull happens roughly once per minute

Guided Planner projects use on-demand cloud sync:
- local project switching and progress tracking are always instant
- signed-in users can save a civ plan to Supabase
- collaborator emails on the project row can open and update the same civ plan
- planner civ icons are stored in Supabase Storage and mirrored back into the project UI for shared projects

Modded Civs Pedia uses a cloud overlay model:
- bundled local JSON remains the fallback baseline
- Supabase entry rows can add new pedia entries or override bundled ones
- collection metadata is loaded from Supabase on top of the bundled registry
- allowlisted signed-in editors can add, edit, and soft-delete pedia entries and collection metadata
- localhost without auth still falls back to the existing Vite local file save endpoints

## 4) Optional backfill for existing pedia data
Set:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional:

- `SUPABASE_PEDIA_ENTRIES_TABLE` (default `cmc_pedia_entries`)
- `SUPABASE_PEDIA_COLLECTIONS_TABLE` (default `cmc_pedia_collections`)

Run:

- `npm run sync:pedia`

This upserts the current local `src/lib/data/modded-civs-pedia/*.json` entries and `src/lib/data/pediaCollections.js` into Supabase so the cloud catalog starts with the bundled data instead of only newly edited rows.

## 5) Pull cloud pedia data back into local source files
For a local backup of the shared pedia, set:

- `SUPABASE_URL` or `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, or `VITE_SUPABASE_ANON_KEY`

Run:

- `npm run pull:pedia`

This will:
- write active Supabase pedia entries into `src/lib/data/modded-civs-pedia/*.json`
- write matching `.wiki.txt` files when cloud wiki markup exists
- merge cloud collection metadata into `src/lib/data/pediaCollections.js`

Optional flags:
- `npm run pull:pedia -- --prune`
  Removes local entry files that do not exist in Supabase.
- `npm run pull:pedia -- --skip-collections`
  Only pulls entry files.
- `npm run pull:pedia -- --skip-wiki`
  Skips writing `.wiki.txt` sidecar files.

Default behavior is non-destructive:
- soft-deleted cloud entries are skipped
- local-only entry files are left untouched unless `--prune` is passed
- local-only collection definitions remain in `pediaCollections.js`
