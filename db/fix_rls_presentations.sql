-- Fix RLS policies for `presentations` table
-- Run in Supabase SQL editor

-- Ensure pgcrypto extension for gen_random_uuid()
create extension if not exists pgcrypto;

-- Create table if it does not exist (safe to run multiple times)
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

alter table if exists public.presentations enable row level security;

-- Drop existing policies if present
drop policy if exists "Allow insert for authenticated users" on public.presentations;
drop policy if exists "Allow select for owner" on public.presentations;
drop policy if exists "Allow update delete for owner" on public.presentations;

-- Allow authenticated users to INSERT only when they set user_id to their own id
create policy "Presentations: insert own" on public.presentations
  for insert
  with check (auth.uid() = user_id);

-- Allow authenticated users to SELECT only their own rows
create policy "Presentations: select own" on public.presentations
  for select
  using (auth.uid() = user_id);

-- Allow authenticated users to UPDATE / DELETE only their own rows
-- Allow authenticated users to UPDATE only their own rows
create policy "Presentations: update own" on public.presentations
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Allow authenticated users to DELETE only their own rows
create policy "Presentations: delete own" on public.presentations
  for delete
  using (auth.uid() = user_id);

-- Notes:
-- After running this, clients authenticated with Supabase Auth can insert rows where user_id = auth.uid().
-- If you prefer to allow server-side insertion (e.g., via service role), perform inserts from a secure server using the service role key.
