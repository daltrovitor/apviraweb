-- Supabase / PostgreSQL schema for Viraweb presentations
-- Run this in the Supabase SQL editor or via psql connected to your project.

-- Enable pgcrypto for gen_random_uuid() if not present
create extension if not exists pgcrypto;

-- Presentations table to store PDF metadata and storage path
create table if not exists public.presentations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  slug text not null unique,
  storage_path text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_presentations_user foreign key(user_id) references auth.users(id) on delete cascade
);

create index if not exists idx_presentations_user_id on public.presentations(user_id);
create index if not exists idx_presentations_created_at on public.presentations(created_at desc);

-- Trigger to update `updated_at`
create function public.trigger_set_timestamp()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_timestamp on public.presentations;
create trigger set_timestamp
before update on public.presentations
for each row
execute function public.trigger_set_timestamp();

-- Row level security: only owners and service role can access rows
alter table public.presentations enable row level security;

-- Allow inserts where auth.uid() matches user_id
create policy "Allow insert for authenticated users"
  on public.presentations
  for insert
  with check (auth.uid() = user_id OR current_setting('request.jwt.claims', true) = '') ;

-- Allow select for owners
create policy "Allow select for owner"
  on public.presentations
  for select
  using (auth.uid() = user_id OR current_setting('request.jwt.claims', true) = '');

-- Allow update/delete only for owners
create policy "Allow update delete for owner"
  on public.presentations
  for update, delete
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Service role bypass: grant full access to service_role (handled by Supabase keys)

-- Notes:
-- 1) Create a Storage bucket named "presentations" in the Supabase UI.
-- 2) Upload PDFs to that bucket and store the file path in `storage_path`.
-- 3) To generate public URLs, either make the bucket public or use signed URLs server-side.
