-- =====================================================================
-- THE PIT ARCHIVE — Supabase setup
-- Paste this whole file into  Supabase dashboard -> SQL Editor -> New query
-- and click RUN. Safe to run more than once.
-- =====================================================================

-- 1. The table that holds every entry -----------------------------------
create table if not exists public.entries (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  title       text not null,
  type        text not null check (type in ('live','memorabilia')),
  band        text,
  place       text,
  date        date,
  description text,
  image_url   text,
  image_path  text
);

-- 2. Row Level Security: the public can READ, only you can WRITE ---------
alter table public.entries enable row level security;

drop policy if exists "public read entries"  on public.entries;
drop policy if exists "auth insert entries"  on public.entries;
drop policy if exists "auth update entries"  on public.entries;
drop policy if exists "auth delete entries"  on public.entries;

create policy "public read entries"
  on public.entries for select using (true);

create policy "auth insert entries"
  on public.entries for insert to authenticated with check (true);

create policy "auth update entries"
  on public.entries for update to authenticated using (true) with check (true);

create policy "auth delete entries"
  on public.entries for delete to authenticated using (true);

-- 3. A public bucket to hold the photos ---------------------------------
insert into storage.buckets (id, name, public)
  values ('photos', 'photos', true)
  on conflict (id) do nothing;

-- 4. Storage rules: public can VIEW, only you can UPLOAD/REPLACE/DELETE --
drop policy if exists "public read photos"   on storage.objects;
drop policy if exists "auth upload photos"   on storage.objects;
drop policy if exists "auth update photos"   on storage.objects;
drop policy if exists "auth delete photos"   on storage.objects;

create policy "public read photos"
  on storage.objects for select
  using (bucket_id = 'photos');

create policy "auth upload photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'photos');

create policy "auth update photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'photos');

create policy "auth delete photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'photos');

-- Done. Now create your curator login under Authentication -> Users.
