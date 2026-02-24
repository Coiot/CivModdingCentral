create table if not exists public.cmc_editor_access (
  email text primary key,
  source text not null default 'manual',
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.cmc_editor_access_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_updated_at_on_cmc_editor_access on public.cmc_editor_access;
create trigger set_updated_at_on_cmc_editor_access
before update on public.cmc_editor_access
for each row
execute function public.cmc_editor_access_set_updated_at();

alter table public.cmc_editor_access enable row level security;

drop policy if exists cmc_editor_access_read_own_email on public.cmc_editor_access;
create policy cmc_editor_access_read_own_email
on public.cmc_editor_access
for select
to authenticated
using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
