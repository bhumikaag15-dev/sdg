-- Run after 002_core.sql. Replaces the empty placeholder colleges/cutoffs tables from 002
-- with an exam-agnostic design keyed by DTE (CET Cell) codes.
-- Adding another exam later = insert a row in `exams` + load its cutoffs with the same columns.

drop table if exists public.cutoffs cascade;
drop table if exists public.colleges cascade;

create table public.exams (
  id text primary key,                       -- 'MHT-CET', 'JEE-MAIN', ...
  name text not null,
  conducting_body text
);
insert into public.exams values ('MHT-CET', 'Maharashtra Common Entrance Test', 'State CET Cell, Maharashtra')
  on conflict do nothing;

-- Institutes, identified by their 5-digit DTE / CET Cell institute code (zero-padded).
create table public.colleges (
  dte_code text primary key check (dte_code ~ '^[0-9]{5}$'),
  name text not null,
  city text,
  state text not null default 'Maharashtra',
  website text,
  source_url text,
  last_year int
);

-- Branch offered at an institute. choice_code = 10 digits (dte_code + 5-digit course code) + optional letter suffix.
create table public.courses (
  choice_code text primary key,
  dte_code text not null references public.colleges(dte_code) on delete cascade,
  course_name text not null
);
create index courses_college_idx on public.courses(dte_code);

-- Status can change year to year (Government / Un-Aided / Autonomous / minority, home university).
create table public.course_offerings (
  year int not null,
  choice_code text not null references public.courses(choice_code) on delete cascade,
  status text,
  home_university text,
  primary key (year, choice_code)
);

create table public.seat_levels (code text primary key, description text not null);

-- Decoded meaning of category codes (GOPENS = General, Open, State level; LOBCH = Ladies, OBC, Home University ...).
create table public.category_codes (
  code text primary key,
  kind text not null,         -- GENERAL, PWD, DEFENCE, TFWS, EWS, ORPHAN, MI, OTHER
  gender text not null,       -- ANY | FEMALE_ONLY
  base text,                  -- OPEN, SC, ST, VJ, NT1..NT3, OBC, SEBC
  scope text                  -- STATE | HOME_UNIVERSITY | OTHER_THAN_HOME_UNIVERSITY
);

-- One row per official file loaded. rank_basis_notes records what the printed merit number means
-- (it differs between rounds/years: All India merit vs State General merit). Percentiles are comparable across years.
create table public.cutoff_sources (
  exam text not null references public.exams(id),
  year int not null,
  cap_round int not null,
  track text not null,
  file_name text not null,
  title text,
  rank_basis_notes text,
  primary key (exam, year, cap_round, track)
);

create table public.cutoffs (
  exam text not null references public.exams(id),
  year int not null,
  cap_round int not null,
  track text not null,
  choice_code text not null references public.courses(choice_code) on delete cascade,
  seat_level text not null references public.seat_levels(code),
  stage text not null,                       -- 'I' = regular allotment; 'I-Non PWD', 'VII', 'II', 'MH' = special stages
  category text not null references public.category_codes(code),
  merit_rank int not null,
  percentile numeric(10,7) not null check (percentile between 0 and 100),
  primary key (exam, year, cap_round, track, choice_code, seat_level, stage, category),
  foreign key (exam, year, cap_round, track) references public.cutoff_sources(exam, year, cap_round, track)
);
create index cutoffs_lookup_idx on public.cutoffs (exam, year, category, percentile);
create index cutoffs_course_idx on public.cutoffs (choice_code, year);

-- ---- Tables for data you will add later (empty; every row needs a source) ----
create table public.fees (
  id uuid primary key default gen_random_uuid(),
  dte_code text not null references public.colleges(dte_code) on delete cascade,
  choice_code text references public.courses(choice_code) on delete set null,
  year int not null,
  category text not null,
  gender text not null default 'ANY',
  tuition_fee numeric, other_fees numeric,
  source_url text not null
);
create table public.rankings (
  id uuid primary key default gen_random_uuid(),
  dte_code text not null references public.colleges(dte_code) on delete cascade,
  body text not null, year int not null, rank int not null, rank_category text,
  source_url text not null
);
create table public.recognitions (
  id uuid primary key default gen_random_uuid(),
  dte_code text not null references public.colleges(dte_code) on delete cascade,
  body text not null, status text, valid_from date, valid_to date,
  source_url text not null
);
create table public.placements (
  id uuid primary key default gen_random_uuid(),
  dte_code text not null references public.colleges(dte_code) on delete cascade,
  choice_code text references public.courses(choice_code) on delete set null,
  year int not null, batch text,
  students_placed int, median_package numeric, highest_package numeric,
  recruiters text[] not null default '{}',
  source_url text not null
);
create table public.scholarships (
  id uuid primary key default gen_random_uuid(),
  name text not null, provider text,
  eligible_category text, eligible_gender text, income_limit numeric,
  amount text, deadline date, apply_url text not null
);

-- ---- Exam dates + reminders ----
create table public.exam_dates (
  id uuid primary key default gen_random_uuid(),
  exam text not null references public.exams(id),
  year int not null,
  event text not null check (event in ('registration_opens','registration_closes','exam','result','counselling')),
  event_date date not null,
  status text not null default 'tentative' check (status in ('tentative','confirmed')),
  source_url text not null,
  updated_at timestamptz not null default now(),
  unique (exam, year, event)
);
-- Which exams matter for which career pathway (drives per-user reminders).
create table public.pathway_exams (
  pathway_id text not null references public.pathways(id) on delete cascade,
  exam text not null references public.exams(id),
  primary key (pathway_id, exam)
);
-- Reminders: generated daily by a scheduled function from saved/roadmap pathways -> exam_dates.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_date_id uuid not null references public.exam_dates(id) on delete cascade,
  remind_on date not null,
  kind text not null default 'reminder' check (kind in ('reminder','date_changed')),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, exam_date_id, remind_on, kind)
);

-- ---- RLS: reference data is public read-only; notifications are private ----
do $$ declare t text; begin
  foreach t in array array['exams','colleges','courses','course_offerings','seat_levels','category_codes','cutoff_sources','cutoffs','fees','rankings','recognitions','placements','scholarships','exam_dates','pathway_exams'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "public read" on public.%I', t);
    execute format('create policy "public read" on public.%I for select to anon, authenticated using (true)', t);
  end loop;
end $$;
alter table public.notifications enable row level security;
drop policy if exists "own notifications" on public.notifications;
create policy "own notifications" on public.notifications for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
