create table if not exists public.cmc_map_pins (
  map_id text primary key,
  pins jsonb not null default '[]'::jsonb,
  updated_by text,
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.cmc_map_pins_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_updated_at_on_cmc_map_pins on public.cmc_map_pins;
create trigger set_updated_at_on_cmc_map_pins
before update on public.cmc_map_pins
for each row
execute function public.cmc_map_pins_set_updated_at();

alter table public.cmc_map_pins enable row level security;

drop policy if exists cmc_map_pins_select_public on public.cmc_map_pins;
create policy cmc_map_pins_select_public
on public.cmc_map_pins
for select
to anon, authenticated
using (true);

drop policy if exists cmc_map_pins_write_authenticated on public.cmc_map_pins;
create policy cmc_map_pins_write_authenticated
on public.cmc_map_pins
for insert
to authenticated
with check (true);

drop policy if exists cmc_map_pins_update_authenticated on public.cmc_map_pins;
create policy cmc_map_pins_update_authenticated
on public.cmc_map_pins
for update
to authenticated
using (true)
with check (true);
