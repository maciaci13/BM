-- Additive migration: skin scans, routines, profile extensions (applied 2026-06-10)
alter table public.profiles
  add column if not exists language text not null default 'bg',
  add column if not exists current_skin_analysis jsonb;

create table if not exists public.skin_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  ai_analysis jsonb not null,
  user_notes text,
  confirmed boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.skin_scans enable row level security;
create policy "own skin scans" on public.skin_scans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null default 'My routine',
  shelf_image_path text,
  recognized_products jsonb,
  ai_analysis jsonb,
  created_at timestamptz not null default now()
);
alter table public.routines enable row level security;
create policy "own routines" on public.routines
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public) values
  ('skin-scans','skin-scans', false),
  ('routine-photos','routine-photos', false)
on conflict (id) do nothing;

do $$ begin
  create policy "own skin scan files" on storage.objects
    for all using (bucket_id = 'skin-scans' and auth.uid()::text = (storage.foldername(name))[1])
    with check (bucket_id = 'skin-scans' and auth.uid()::text = (storage.foldername(name))[1]);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "own routine files" on storage.objects
    for all using (bucket_id = 'routine-photos' and auth.uid()::text = (storage.foldername(name))[1])
    with check (bucket_id = 'routine-photos' and auth.uid()::text = (storage.foldername(name))[1]);
exception when duplicate_object then null; end $$;
