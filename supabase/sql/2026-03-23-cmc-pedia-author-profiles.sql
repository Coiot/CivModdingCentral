create table if not exists public.cmc_pedia_author_profiles (
  id text primary key,
  name text not null default '',
  profile_state jsonb not null default '{}'::jsonb,
  created_by_email text not null default '',
  updated_by_email text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists cmc_pedia_author_profiles_name_idx
on public.cmc_pedia_author_profiles (lower(name));

create index if not exists cmc_pedia_author_profiles_updated_at_idx
on public.cmc_pedia_author_profiles (updated_at desc);

create or replace function public.cmc_pedia_author_profiles_guard_write()
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

  new.id = lower(coalesce(new.id, ''));
  return new;
end;
$$;

drop trigger if exists cmc_pedia_author_profiles_guard_write on public.cmc_pedia_author_profiles;
create trigger cmc_pedia_author_profiles_guard_write
before insert or update on public.cmc_pedia_author_profiles
for each row
execute function public.cmc_pedia_author_profiles_guard_write();

alter table public.cmc_pedia_author_profiles enable row level security;

drop policy if exists cmc_pedia_author_profiles_select_public on public.cmc_pedia_author_profiles;
create policy cmc_pedia_author_profiles_select_public
on public.cmc_pedia_author_profiles
for select
to anon, authenticated
using (true);

drop policy if exists cmc_pedia_author_profiles_insert_allowlisted on public.cmc_pedia_author_profiles;
create policy cmc_pedia_author_profiles_insert_allowlisted
on public.cmc_pedia_author_profiles
for insert
to authenticated
with check (public.cmc_editor_is_allowlisted());

drop policy if exists cmc_pedia_author_profiles_update_allowlisted on public.cmc_pedia_author_profiles;
create policy cmc_pedia_author_profiles_update_allowlisted
on public.cmc_pedia_author_profiles
for update
to authenticated
using (public.cmc_editor_is_allowlisted())
with check (public.cmc_editor_is_allowlisted());

drop policy if exists cmc_pedia_author_profiles_delete_allowlisted on public.cmc_pedia_author_profiles;
create policy cmc_pedia_author_profiles_delete_allowlisted
on public.cmc_pedia_author_profiles
for delete
to authenticated
using (public.cmc_editor_is_allowlisted());
