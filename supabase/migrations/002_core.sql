-- Run after schema.sql. Adds per-user data, progress, comparisons, colleges and cutoffs.

-- Profiles: one row per user; holds survey answers + position (replaces localStorage keys
-- pathwise-answers / pathwise-step).
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  answers jsonb not null default '{}'::jsonb,
  step int not null default 0,
  updated_at timestamptz not null default now()
);

-- Roadmap/task progress (replaces localStorage key pathwise-done).
create table if not exists public.progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, task_id)
);

-- Saved comparisons (2+ pathways).
create table if not exists public.comparisons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pathway_ids text[] not null check (array_length(pathway_ids,1) >= 2),
  created_at timestamptz not null default now()
);
create index if not exists comparisons_user_idx on public.comparisons(user_id);

-- Colleges and cutoffs: public reference data, intentionally EMPTY (no invented data).
-- Load only from official sources (CET Cell, JoSAA, NIRF); every cutoff keeps year/category/quota/round.
create table if not exists public.colleges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  state text,
  autonomous boolean,
  accreditation text,
  website text,
  source_url text,
  created_at timestamptz not null default now(),
  unique (name, city)
);

create table if not exists public.cutoffs (
  id uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  pathway_id text references public.pathways(id) on delete set null,
  course text not null,
  year int not null,
  exam text not null,
  category text not null,
  quota text not null,
  round text,
  cutoff numeric not null,
  unit text not null check (unit in ('percentile','rank','marks')),
  source_url text not null
);
create index if not exists cutoffs_college_idx on public.cutoffs(college_id, year);

-- RLS
alter table public.profiles    enable row level security;
alter table public.progress    enable row level security;
alter table public.comparisons enable row level security;
alter table public.colleges    enable row level security;
alter table public.cutoffs     enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own progress" on public.progress;
create policy "own progress" on public.progress for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own comparisons" on public.comparisons;
create policy "own comparisons" on public.comparisons for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "colleges public read" on public.colleges;
create policy "colleges public read" on public.colleges for select to anon, authenticated using (true);
drop policy if exists "cutoffs public read" on public.cutoffs;
create policy "cutoffs public read" on public.cutoffs for select to anon, authenticated using (true);

-- Auto-create a profile on signup; keep updated_at fresh.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
