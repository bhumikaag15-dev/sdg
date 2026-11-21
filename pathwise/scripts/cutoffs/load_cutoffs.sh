#!/usr/bin/env bash
# Load parsed CSVs into Postgres/Supabase. Safe to re-run: existing rows are skipped.
# Usage: DATABASE_URL=postgres://... ./load_cutoffs.sh <csv_dir>
set -euo pipefail
DIR="${1:?csv dir}"; : "${DATABASE_URL:?set DATABASE_URL (Supabase: Project Settings > Database > Connection string)}"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<SQL
create temp table s_inst (dte_code text, name text, city text, last_year int);
create temp table s_course (choice_code text, dte_code text, course_name text);
create temp table s_off (year int, choice_code text, status text, home_university text);
create temp table s_cat (code text, kind text, gender text, base text, scope text);
create temp table s_lvl (code text, description text);
create temp table s_src (year int, cap_round int, track text, file_name text, title text, rank_basis_notes text);
create temp table s_cut (exam text, year int, cap_round int, track text, choice_code text, seat_level text, stage text, category text, merit_rank int, percentile numeric);
\copy s_inst from '$DIR/institutes.csv' csv header
\copy s_course from '$DIR/courses.csv' csv header
\copy s_off from '$DIR/offerings.csv' csv header
\copy s_cat from '$DIR/category_codes.csv' csv header
\copy s_lvl from '$DIR/seat_levels.csv' csv header
\copy s_src from '$DIR/sources.csv' csv header
\copy s_cut from '$DIR/cutoffs.csv' csv header
insert into public.colleges (dte_code,name,city,last_year) select dte_code,name,nullif(city,''),last_year from s_inst
  on conflict (dte_code) do update set name=excluded.name, city=excluded.city, last_year=greatest(public.colleges.last_year, excluded.last_year);
insert into public.courses select * from s_course on conflict (choice_code) do update set course_name=excluded.course_name;
insert into public.course_offerings select year,choice_code,nullif(status,''),nullif(home_university,'') from s_off
  on conflict (year,choice_code) do update set status=excluded.status, home_university=excluded.home_university;
insert into public.seat_levels select * from s_lvl on conflict do nothing;
insert into public.category_codes select code,kind,gender,nullif(base,''),nullif(scope,'') from s_cat on conflict do nothing;
insert into public.cutoff_sources select 'MHT-CET',year,cap_round,track,file_name,nullif(title,''),nullif(rank_basis_notes,'') from s_src on conflict do nothing;
insert into public.cutoffs select * from s_cut on conflict do nothing;
select year, cap_round, count(*) as rows from public.cutoffs group by 1,2 order by 1,2;
SQL
