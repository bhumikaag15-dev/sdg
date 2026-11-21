#!/usr/bin/env bash
# Add or update exam dates from a CSV (see exam_dates_template.csv). Editing a date notifies affected users.
# Usage: DATABASE_URL=postgres://... ./import_exam_dates.sh dates.csv
set -euo pipefail
: "${DATABASE_URL:?}"; F="${1:?csv file}"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<SQL
create temp table s_dates (exam text, year int, event text, event_date date, status text, source_url text);
\copy s_dates from '$F' csv header
insert into public.exam_dates (exam,year,event,event_date,status,source_url)
select * from s_dates
on conflict (exam,year,event) do update set event_date=excluded.event_date, status=excluded.status, source_url=excluded.source_url;
SQL
