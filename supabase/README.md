# CMC Editor Access Setup

## 1) Create the allowlist table
Run:

- `supabase/sql/2026-02-23-cmc-editor-access.sql`
- `supabase/sql/2026-02-23-cmc-map-pins.sql`
- `supabase/sql/2026-03-12-cmc-guided-planner-projects.sql`

This creates `public.cmc_editor_access` and an RLS policy so signed-in users can only read their own email row.
It also creates `public.cmc_map_pins` for shared civilization pin state per map.
It also creates `public.cmc_guided_planner_projects` for multi-project planner saves, export/import handoff, and collaborator access by email.
It also creates the private `cmc-guided-planner-icons` Storage bucket plus policies so shared planner civ icons can be read and updated by project collaborators.

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

Civilization pins are synced through Supabase on a 60-second interval:
- local edits are instant
- cloud push/pull happens roughly once per minute

Guided Planner projects use on-demand cloud sync:
- local project switching and progress tracking are always instant
- signed-in users can save a civ plan to Supabase
- collaborator emails on the project row can open and update the same civ plan
- planner civ icons are stored in Supabase Storage and mirrored back into the project UI for shared projects
