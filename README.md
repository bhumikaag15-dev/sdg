# PathWise

React + TypeScript + Vite front end, Supabase (Postgres, Auth, Edge Functions) back end.
Runs in **demo mode** with no credentials (data stays in the browser); set the two env vars for **live mode**.

## Run
```
npm install
npm run dev          # http://localhost:5173
npm run build
```
Live mode: create `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## Database setup (Supabase SQL editor, in order)
1. `supabase/schema.sql`
2. `supabase/migrations/002_core.sql` (profiles, progress, comparisons)
3. `supabase/migrations/003_cutoffs.sql` (colleges by DTE code, courses, cutoffs, exams, fees/rankings/recognitions/placements/scholarships, exam dates)
4. `supabase/migrations/004_reminders.sql` (exam links + reminder function)
5. `supabase/seed_pathways.sql` (56 careers; regenerate with `scripts/gen-seed.mjs`)

Then load the cutoffs (needs `psql` and the database connection string):
```
DATABASE_URL=postgres://... scripts/cutoffs/load_cutoffs.sh <csv_dir>
```
Schedule reminders: enable `pg_cron` and run the `cron.schedule` line at the bottom of `004_reminders.sql`.

## Adding a new year of MHT-CET cutoffs
1. Drop the new CET Cell PDFs next to the old ones, named `<year>ENGG_CAP<n>_CutOff*.pdf`.
2. `pip install pymupdf` then `python scripts/cutoffs/parse_mhtcet.py <pdf_dir> <csv_dir>`
3. `python scripts/cutoffs/build_static.py <csv_dir> public/data/mhtcet.json` (data for the predictor)
4. `scripts/cutoffs/load_cutoffs.sh <csv_dir>` (re-loading never duplicates rows)
If an institute's code changes between years, add it to `scripts/cutoffs/code_aliases.csv`; if a name has no ", City" suffix, add it to `city_overrides.csv`.

## Adding another exam
Register it in `src/lib/exams.ts`, produce its cutoff CSVs/JSON with the same columns (`exam` field), set `ready: true`. The `exams` table already lists JEE Main, NEET, CUET and CLAT.

## Exam dates
Fill `scripts/exams/exam_dates_template.csv` from official notices and run `scripts/exams/import_exam_dates.sh`. Changing a date notifies users who saved a linked career.

## Parser notes
Values are placed by x-position under each category header. 266 overflow rows printed without a stage label were dropped. Merit numbers mean different things across files (All India merit vs State general merit, see `sources.csv`); percentiles are comparable.
