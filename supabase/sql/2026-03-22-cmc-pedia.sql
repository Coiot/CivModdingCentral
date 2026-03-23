create or replace function public.cmc_editor_current_email()
returns text
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.cmc_editor_is_allowlisted()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.cmc_editor_access as access
    where lower(access.email) = public.cmc_editor_current_email()
  );
$$;

create table if not exists public.cmc_pedia_entries (
  id text primary key,
  slug text not null,
  title text not null default '',
  summary text not null default '',
  entry_state jsonb not null default '{}'::jsonb,
  wiki_markup text not null default '',
  is_deleted boolean not null default false,
  created_by_email text not null default '',
  updated_by_email text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists cmc_pedia_entries_slug_idx
on public.cmc_pedia_entries (lower(slug));

create index if not exists cmc_pedia_entries_title_idx
on public.cmc_pedia_entries (lower(title));

create index if not exists cmc_pedia_entries_updated_at_idx
on public.cmc_pedia_entries (updated_at desc);

create table if not exists public.cmc_pedia_collections (
  id text primary key,
  title text not null default '',
  collection_state jsonb not null default '{}'::jsonb,
  created_by_email text not null default '',
  updated_by_email text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists cmc_pedia_collections_title_idx
on public.cmc_pedia_collections (lower(title));

create index if not exists cmc_pedia_collections_updated_at_idx
on public.cmc_pedia_collections (updated_at desc);

create or replace function public.cmc_pedia_entries_guard_write()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  new.updated_by_email = public.cmc_editor_current_email();

  if tg_op = 'INSERT' then
    new.created_at = coalesce(new.created_at, timezone('utc', now()));
    new.created_by_email = coalesce(nullif(new.created_by_email, ''), public.cmc_editor_current_email());
  else
    new.created_at = old.created_at;
    new.created_by_email = old.created_by_email;
  end if;

  new.slug = lower(coalesce(new.slug, ''));
  return new;
end;
$$;

drop trigger if exists cmc_pedia_entries_guard_write on public.cmc_pedia_entries;
create trigger cmc_pedia_entries_guard_write
before insert or update on public.cmc_pedia_entries
for each row
execute function public.cmc_pedia_entries_guard_write();

create or replace function public.cmc_pedia_collections_guard_write()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  new.updated_by_email = public.cmc_editor_current_email();

  if tg_op = 'INSERT' then
    new.created_at = coalesce(new.created_at, timezone('utc', now()));
    new.created_by_email = coalesce(nullif(new.created_by_email, ''), public.cmc_editor_current_email());
  else
    new.created_at = old.created_at;
    new.created_by_email = old.created_by_email;
  end if;

  return new;
end;
$$;

drop trigger if exists cmc_pedia_collections_guard_write on public.cmc_pedia_collections;
create trigger cmc_pedia_collections_guard_write
before insert or update on public.cmc_pedia_collections
for each row
execute function public.cmc_pedia_collections_guard_write();

alter table public.cmc_pedia_entries enable row level security;
alter table public.cmc_pedia_collections enable row level security;

drop policy if exists cmc_pedia_entries_select_public on public.cmc_pedia_entries;
create policy cmc_pedia_entries_select_public
on public.cmc_pedia_entries
for select
to anon, authenticated
using (true);

drop policy if exists cmc_pedia_entries_insert_allowlisted on public.cmc_pedia_entries;
create policy cmc_pedia_entries_insert_allowlisted
on public.cmc_pedia_entries
for insert
to authenticated
with check (public.cmc_editor_is_allowlisted());

drop policy if exists cmc_pedia_entries_update_allowlisted on public.cmc_pedia_entries;
create policy cmc_pedia_entries_update_allowlisted
on public.cmc_pedia_entries
for update
to authenticated
using (public.cmc_editor_is_allowlisted())
with check (public.cmc_editor_is_allowlisted());

drop policy if exists cmc_pedia_entries_delete_allowlisted on public.cmc_pedia_entries;
create policy cmc_pedia_entries_delete_allowlisted
on public.cmc_pedia_entries
for delete
to authenticated
using (public.cmc_editor_is_allowlisted());

drop policy if exists cmc_pedia_collections_select_public on public.cmc_pedia_collections;
create policy cmc_pedia_collections_select_public
on public.cmc_pedia_collections
for select
to anon, authenticated
using (true);

drop policy if exists cmc_pedia_collections_insert_allowlisted on public.cmc_pedia_collections;
create policy cmc_pedia_collections_insert_allowlisted
on public.cmc_pedia_collections
for insert
to authenticated
with check (public.cmc_editor_is_allowlisted());

drop policy if exists cmc_pedia_collections_update_allowlisted on public.cmc_pedia_collections;
create policy cmc_pedia_collections_update_allowlisted
on public.cmc_pedia_collections
for update
to authenticated
using (public.cmc_editor_is_allowlisted())
with check (public.cmc_editor_is_allowlisted());

drop policy if exists cmc_pedia_collections_delete_allowlisted on public.cmc_pedia_collections;
create policy cmc_pedia_collections_delete_allowlisted
on public.cmc_pedia_collections
for delete
to authenticated
using (public.cmc_editor_is_allowlisted());
