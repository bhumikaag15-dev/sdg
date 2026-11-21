<<<<<<< HEAD
# PathWise — full-featured pastel merge

This build preserves the full guided counselling experience from the previous v3 app and applies a soft pastel visual refresh. It does not use the simplified replacement dashboard as its foundation.

## Career catalogue and roadmap details
- The explorer contains **321 searchable entries**: 56 broad education/pathway options plus 265 possible job-role entries derived from the pathway catalogue.
- Each card has **See Roadmap**, which opens a dedicated career detail page with day-to-day work, a step-by-step route, study topics, possible roles, industries, exam/admissions guidance, skill-building suggestions, challenges, checks before committing, and official source links.
- The original comparison screen and its side-by-side fields are preserved. Career cards still include the original expandable study/entry guide and beginner's guide, and the Add to Compare workflow remains available.
- The progressive questionnaire, answer-driven route map, next-action checklist, completion tracking, college/admissions research, official-source cards, demo/live status, in-app research summaries, and API/Supabase support are retained.

## Run locally
1. Install Node.js (LTS) if needed.
2. In this project folder, run `npm install`.
3. Run `npm run dev` and open the local URL Vite prints.
4. To check the production bundle, run `npm run build`.

The career catalogue is guidance for exploration, not a guarantee of admission, placement, salary, or job availability. Verify changing requirements and dates with official current-year sources.

---

# PathWise MVP

A starter project for an SDG 4 education and career pathway navigator. It includes:
- Explore pathway cards across multiple fields
- Compare two pathways side-by-side
- A step-by-step pathway guide
- Learning resource discovery using YouTube Data API (through a Supabase Edge Function), Google Books API, and Open Library
- Optional Supabase authentication
- Supabase schema and starter pathway seed data

> This is a prototype. Its pathway database is intentionally small and educational content must be checked against current official sources before public use. Job examples are illustrative, not employment guarantees.

## 1. Requirements
- Node.js 20+ recommended
- A Supabase project (optional for local demo; required for accounts/database/YouTube API function)
- A Google Cloud project with YouTube Data API v3 enabled if you want API-powered video results

## 2. Install and run
Open this folder in VS Code, then in the integrated terminal run:

```bash
npm install
cp .env.example .env.local
npm run dev
```

On Windows PowerShell, if `cp` does not work, copy `.env.example` to `.env.local` manually.

The app runs in demo mode until you add Supabase credentials. Demo mode still has pathway cards and book/video search links.

## 3. Configure Supabase
1. Create a project in the Supabase dashboard.
2. Open **Project Settings → API** and copy the Project URL and anon/publishable key.
3. Add them to `.env.local`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY
```

4. In Supabase, open **SQL Editor**, paste all of `supabase/schema.sql`, and run it.
5. Restart the Vite dev server after changing environment variables.

The app loads pathway rows from Supabase if the table is populated; otherwise it uses the local demo dataset. The SQL script seeds a small starter set.

### Authentication note
The sign-in form attempts sign-in first and then offers account creation if sign-in fails. Depending on Supabase Auth settings, email confirmation may be required. For production, use a clearer separate sign-in/sign-up flow and add password reset.

### Saved pathways
The initial prototype's bookmark controls are local UI state only. The `saved_pathways` table and row-level security policies are included as a foundation for syncing saved pathways per user; wire the buttons to this table before treating saved items as persistent.

## 4. Configure YouTube Data API through Supabase Edge Function
1. In Google Cloud Console, create/select a project and enable **YouTube Data API v3**.
2. Create an API key. Restrict it to YouTube Data API v3 and set quotas/monitor usage.
3. Install the Supabase CLI and log in. See the official Supabase CLI documentation.
4. From this project folder, link your Supabase project:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

5. Set the secret (do not put it in `.env.local` or frontend code):

```bash
supabase secrets set YOUTUBE_API_KEY=YOUR_YOUTUBE_API_KEY
```

6. Deploy the Edge Function:

```bash
supabase functions deploy search-resources
```

7. Ensure the function is callable by your app. If your project has JWT verification enabled, authenticated requests work after sign-in; if you want anonymous resource searches, configure function JWT verification and rate limiting intentionally rather than blindly disabling security. The frontend sends the Supabase anon key and a user token when signed in.

The function code is in `supabase/functions/search-resources/index.ts`. It returns video metadata and links only; videos remain hosted by YouTube.

## 5. APIs used
- YouTube Data API v3: search for educational videos. Requires an API key and has quota limits.
- Google Books API: search book catalogue entries and preview/access links; actual access may be preview-only, borrowable, or paid.
- Open Library Search API: search book catalogue records; availability varies.

API results are not automatically trusted. Before public release, curate trusted channels/publishers, show source and date, and label official admission information separately.

## 6. Important before public launch
- Verify all course durations, entry routes, and professional qualification rules against official sources.
- Add data provenance: source URL, checked date, applicable state/country, and admission year.
- Add a reviewed/verified badge only after human review.
- Add a database-driven pathway editor for administrators.
- Add proper persistence for saved pathways and student plans.
- Add error handling, API rate limiting, privacy policy, and accessible form labels.
- Do not use a Supabase service-role key in frontend code.
- Keep API secrets in Supabase Edge Function secrets, never in `VITE_` variables.
- Confirm YouTube API and book-catalogue terms before storing or displaying their data.

## 7. Suggested next milestone
Build a richer pathway data model with:
- country/state and year applicability
- entry qualifications and subjects
- entrance exams and official application links
- estimated fees and scholarships with sources
- occupations linked to qualifications
- current labour-market data with date and location
- trusted resource curation and review status

## Expanded PathWise counsellor features

This version includes a broader starter catalogue (engineering branches including AI&DS, IT, E&TC, electrical, chemical, biotechnology, robotics/mechatronics and more; commerce/professional routes; arts, design, health, environment, public service, hospitality and post-Class-10 routes), plus:

- **Career match:** a transparent, editable interest questionnaire that returns pathways to investigate. It is a starting list, not a psychometric test or a decision made on a student's behalf.
- **After Class 10:** plain-language comparison of Class 11–12 streams, polytechnic diplomas and ITI/vocational routes, with a practical checklist for choosing subjects and avoiding misleading course/job promises.
- **Colleges & jobs:** a live web-search integration intended to surface current official college pages, admission notices, cutoffs, placement reports, scholarships, employer careers pages and interview information.
- Existing pathway comparison, step-by-step pathway guides, learning resource discovery and responsive layout.

### Configure live college / employer search

The guided live counsellor uses **Tavily Search API + OpenAI API** from a Supabase Edge Function. It searches for relevant pages, passes the retrieved source snippets and the student's survey answers to the model, and returns a personalised ordered plan with source links, evidence notes and checkpoints. Create API keys for both providers; see the [Tavily Search API documentation](https://help.tavily.com/articles/4840311948-tavily-search-api) and [OpenAI API documentation](https://platform.openai.com/docs/overview).

```bash
supabase secrets set TAVILY_API_KEY=YOUR_TAVILY_API_KEY
supabase secrets set OPENAI_API_KEY=YOUR_OPENAI_API_KEY
# Optional: set OPENAI_MODEL if you want a different supported model
supabase secrets set OPENAI_MODEL=gpt-4o-mini
supabase functions deploy generate-counsellor-plan
```

Keep both keys in Supabase secrets—never in `VITE_` frontend variables. The frontend calls `generate-counsellor-plan`; that function searches and generates the plan server-side. The older `search-opportunities` function remains available as a search-only endpoint. API quotas, usage limits and plan terms apply.

The frontend builds a search from the student's area, stage, stream and course/job interest. The function combines retrieved pages with survey answers to draft a personalised action plan. Search snippets and AI-generated summaries are not verified facts. India does not have one universal, free, consistently structured API for every college's branch-wise cutoffs, placements and company interviews. For a production system, build a source registry and verified data-ingestion pipeline using official counselling PDFs, institution placement reports, regulator data and company career pages. Store publication date, academic year, branch, category/quota/round, methodology and source URL with each figure. Never display an undated cutoff or a single highest package as a representative outcome.

### Current project status

This is a college-project MVP and discovery prototype, not a complete professional counselling service. The pathway catalogue is a broad starter catalogue, not literally every possible qualification or a substitute for official eligibility rules. Some admissions details change every year. Before presenting it as a live public service, expand the catalogue with reviewed sources, test API errors and quotas, add admin verification, privacy controls and database persistence for saved plans, and obtain qualified review for regulated professions.


## Interactive guided-counsellor redesign

The current interface is designed around a question-by-question intake, a personalised route map, expandable action cards with checkpoints, pathway discovery, two-way comparison, and a college/employer research checklist. Answers and completed checkpoints are stored in the browser's localStorage on that device.

**Data honesty:** the career matching is a lightweight rule-based starter, not a psychometric test. College search opens a live web search query and links to official Indian admission/regulator sources; it does not yet verify or normalise live cutoffs, placement statistics, or company interview processes. Do not present those figures as verified until official-source ingestion, source dates, and human review are implemented. Supabase/Tavily API secrets must remain server-side.


## PathWise v2: branching counselling and route visualisation

This version keeps the guided survey **and** restores visible entry-point cards on the homepage so students can immediately browse careers, compare pathways, research colleges, or start the guided flow. During the survey, a live route-map panel changes with the student's answers, offers clickable pathway cards, gives answer-specific explanations, and links to official exam/education sources. Pathway cards now include an expandable beginner's guide covering day-to-day work, a stepwise route, exam/admission routes, skills to practise, challenges and verification steps.

Important: pathway suggestions are heuristic examples, not a validated aptitude assessment. Exam information is a starting point, not a guarantee that an exam applies to every institution. Always verify current-year eligibility and deadlines on the official authority's site. College search currently opens a web query; it does not yet ingest, verify or normalise live college cutoffs and placements.

## PathWise counsellor update: in-app research + guided route maps

The current counsellor version keeps the full multi-question survey and updates a clickable career map after every answer. The map shows the student's current stage, pathway families, a decision ladder, and the next decision sequence. A final route is not chosen from one answer; suggestions update as more context is added.

### In-app live research (with a demo fallback)

The Colleges & Jobs page calls the Supabase Edge Function `search-opportunities` instead of merely opening a Google search. When configured, it retrieves web results and displays their titles, snippets, source domains and links inside PathWise. It then shows a personalised action sequence based on the student's stage (including a dedicated after-Class-10 sequence). When no credentials are configured or the request fails, PathWise displays clearly labelled curated demo cards; it does not invent live cutoffs, placement rates, fees or salary figures.

To enable live search:
1. Create a Supabase project and put its URL and anon/publishable key in `.env.local` using `.env.example`.
2. In Google/Tavily's provider console, create an API key for the web-search provider used by the Edge Function. Never put the provider key in a `VITE_` frontend variable.
3. From this project folder run `supabase login`, then `supabase link --project-ref YOUR_PROJECT_REF`.
4. Add the key as a server-side secret: `supabase secrets set TAVILY_API_KEY=YOUR_KEY`.
5. Deploy the function: `supabase functions deploy search-opportunities`.
6. Restart the frontend (`npm.cmd run dev` on Windows PowerShell) and use Colleges & Jobs → Research and build my next steps.

The provider returns search results, not a verified government database. To build a production-grade college recommender, the next phase must add structured, year-specific datasets for course eligibility, category/round-wise cutoffs, fees, scholarships, placement reports and recruiter roles; store source URL, publication year and last-checked timestamp for each field; and distinguish official sources from secondary commentary. Do not display a number as a current cutoff or placement statistic unless the source and applicable year/round/category are confirmed. Company interview criteria should be based on current role descriptions and employer career pages, not broad assumptions.

### What is demo versus live?
- **Demo:** pathway explanations, interest-to-pathway matching, route-map logic, step sequence, and curated official-source starting cards.
- **Live after configuration:** search results/snippets returned by the search provider and shown in the app.
- **Not yet a verified live database:** exact college rankings for an individual's circumstances, current course cutoffs by category/round, branch-wise placement percentages/median packages, current vacancies and company-specific interview rubrics. These need structured sources and validation before making factual recommendations.


### Live counsellor pipeline

`generate-counsellor-plan` is the live pipeline: (1) frontend sends the survey profile and focused research query; (2) Supabase Edge Function calls Tavily; (3) retrieved titles, URLs and snippets plus the student profile are sent to OpenAI; (4) OpenAI returns 4–6 structured steps with why/action/evidence/checkpoint fields; (5) PathWise renders the plan and results inside the app. If either API is missing or the request fails, the UI falls back to clearly labelled demo cards and a demo plan. Never treat AI output as authoritative for admissions, cutoffs, fees, placements or regulated qualifications.
=======
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
>>>>>>> 8691b24 (UI chnages and college predictor added)
