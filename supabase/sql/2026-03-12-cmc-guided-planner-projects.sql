create table if not exists public.cmc_guided_planner_projects (
  id uuid primary key,
  name text not null,
  owner_email text not null,
  collaborator_emails text[] not null default '{}'::text[],
  icon_path text,
  icon_updated_at timestamptz,
  project_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.cmc_guided_planner_projects
  add column if not exists icon_path text;

alter table public.cmc_guided_planner_projects
  add column if not exists icon_updated_at timestamptz;

create index if not exists cmc_guided_planner_projects_owner_email_idx
on public.cmc_guided_planner_projects (lower(owner_email));

create index if not exists cmc_guided_planner_projects_collaborators_gin_idx
on public.cmc_guided_planner_projects
using gin (collaborator_emails);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cmc-guided-planner-icons',
  'cmc-guided-planner-icons',
  false,
  262144,
  array['image/png']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.cmc_guided_planner_current_email()
returns text
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.cmc_guided_planner_can_access(
  project_owner_email text,
  project_collaborator_emails text[]
)
returns boolean
language sql
stable
as $$
  select
    lower(coalesce(project_owner_email, '')) = public.cmc_guided_planner_current_email()
    or exists (
      select 1
      from unnest(coalesce(project_collaborator_emails, '{}'::text[])) as collaborator(email)
      where lower(collaborator.email) = public.cmc_guided_planner_current_email()
    );
$$;

create or replace function public.cmc_guided_planner_projects_guard_updates()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  new.owner_email = old.owner_email;

  if public.cmc_guided_planner_current_email() <> lower(coalesce(old.owner_email, '')) then
    new.collaborator_emails = old.collaborator_emails;
  end if;

  return new;
end;
$$;

drop trigger if exists set_updated_at_on_cmc_guided_planner_projects on public.cmc_guided_planner_projects;
create trigger set_updated_at_on_cmc_guided_planner_projects
before update on public.cmc_guided_planner_projects
for each row
execute function public.cmc_guided_planner_projects_guard_updates();

alter table public.cmc_guided_planner_projects enable row level security;

drop policy if exists cmc_guided_planner_projects_select_shared on public.cmc_guided_planner_projects;
create policy cmc_guided_planner_projects_select_shared
on public.cmc_guided_planner_projects
for select
to authenticated
using (public.cmc_guided_planner_can_access(owner_email, collaborator_emails));

drop policy if exists cmc_guided_planner_projects_insert_own on public.cmc_guided_planner_projects;
create policy cmc_guided_planner_projects_insert_own
on public.cmc_guided_planner_projects
for insert
to authenticated
with check (lower(owner_email) = public.cmc_guided_planner_current_email());

drop policy if exists cmc_guided_planner_projects_update_shared on public.cmc_guided_planner_projects;
create policy cmc_guided_planner_projects_update_shared
on public.cmc_guided_planner_projects
for update
to authenticated
using (public.cmc_guided_planner_can_access(owner_email, collaborator_emails))
with check (public.cmc_guided_planner_can_access(owner_email, collaborator_emails));

drop policy if exists cmc_guided_planner_projects_delete_owner on public.cmc_guided_planner_projects;
create policy cmc_guided_planner_projects_delete_owner
on public.cmc_guided_planner_projects
for delete
to authenticated
using (lower(owner_email) = public.cmc_guided_planner_current_email());

drop policy if exists cmc_guided_planner_icons_select_shared on storage.objects;
create policy cmc_guided_planner_icons_select_shared
on storage.objects
for select
to authenticated
using (
  bucket_id = 'cmc-guided-planner-icons'
  and exists (
    select 1
    from public.cmc_guided_planner_projects as project
    where project.id::text = (storage.foldername(name))[1]
      and public.cmc_guided_planner_can_access(project.owner_email, project.collaborator_emails)
  )
);

drop policy if exists cmc_guided_planner_icons_insert_shared on storage.objects;
create policy cmc_guided_planner_icons_insert_shared
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'cmc-guided-planner-icons'
  and exists (
    select 1
    from public.cmc_guided_planner_projects as project
    where project.id::text = (storage.foldername(name))[1]
      and public.cmc_guided_planner_can_access(project.owner_email, project.collaborator_emails)
  )
);

drop policy if exists cmc_guided_planner_icons_update_shared on storage.objects;
create policy cmc_guided_planner_icons_update_shared
on storage.objects
for update
to authenticated
using (
  bucket_id = 'cmc-guided-planner-icons'
  and exists (
    select 1
    from public.cmc_guided_planner_projects as project
    where project.id::text = (storage.foldername(name))[1]
      and public.cmc_guided_planner_can_access(project.owner_email, project.collaborator_emails)
  )
)
with check (
  bucket_id = 'cmc-guided-planner-icons'
  and exists (
    select 1
    from public.cmc_guided_planner_projects as project
    where project.id::text = (storage.foldername(name))[1]
      and public.cmc_guided_planner_can_access(project.owner_email, project.collaborator_emails)
  )
);

drop policy if exists cmc_guided_planner_icons_delete_shared on storage.objects;
create policy cmc_guided_planner_icons_delete_shared
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'cmc-guided-planner-icons'
  and exists (
    select 1
    from public.cmc_guided_planner_projects as project
    where project.id::text = (storage.foldername(name))[1]
      and public.cmc_guided_planner_can_access(project.owner_email, project.collaborator_emails)
  )
);
