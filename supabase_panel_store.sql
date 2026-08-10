-- Supabase schema for panel.html data store.
-- Run once in Supabase SQL Editor.

create table if not exists public.panel_store (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  version bigint not null default 1,
  updated_at timestamptz not null default now()
);

-- Rekord `main` przechowuje aktualne dane. API zapisuje poprzednie wersje jako
-- `backup_main_*` w tej samej tabeli, więc historia działa bez dodatkowej migracji.
create index if not exists panel_store_updated_at_idx
  on public.panel_store (updated_at desc);

alter table public.panel_store enable row level security;

insert into public.panel_store (id, data, version)
values ('main', '{}'::jsonb, 1)
on conflict (id) do nothing;

create or replace function public.save_panel_store(
  p_id text,
  p_expected_version bigint,
  p_data jsonb
)
returns table(ok boolean, version bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  next_version bigint;
begin
  if not exists (select 1 from public.panel_store ps where ps.id = p_id) then
    if coalesce(p_expected_version, 0) <> 0 then
      return query select false, 0::bigint;
      return;
    end if;

    insert into public.panel_store (id, data, version, updated_at)
    values (p_id, p_data, 1, now())
    returning public.panel_store.version into next_version;

    return query select true, next_version;
    return;
  end if;

  update public.panel_store
  set
    data = p_data,
    version = public.panel_store.version + 1,
    updated_at = now()
  where id = p_id
    and public.panel_store.version = p_expected_version
  returning public.panel_store.version into next_version;

  if next_version is null then
    return query select false, coalesce((select ps.version from public.panel_store ps where ps.id = p_id), 0);
    return;
  end if;

  return query select true, next_version;
end;
$$;
