-- Run this entire file in Supabase Dashboard > SQL Editor.
-- The pathways table contains public educational information, not private user data.

create extension if not exists pgcrypto;

create table if not exists public.pathways (
  id text primary key,
  title text not null,
  field text not null,
  qualification text not null,
  summary text not null,
  duration text not null,
  typical_entry text not null,
  study_topics text[] not null default '{}',
  job_roles text[] not null default '{}',
  industries text[] not null default '{}',
  next_steps text[] not null default '{}',
  eligibility_note text not null default '',
  demand_note text not null default '',
  source_urls text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.pathways enable row level security;

drop policy if exists "Pathways are readable by everyone" on public.pathways;
create policy "Pathways are readable by everyone"
on public.pathways for select
to anon, authenticated
using (true);

-- No public insert/update/delete policies are created. Manage pathway content
-- through the Supabase dashboard or a trusted admin workflow.

create table if not exists public.saved_pathways (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pathway_id text not null references public.pathways(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, pathway_id)
);

alter table public.saved_pathways enable row level security;

drop policy if exists "Users read their saved pathways" on public.saved_pathways;
create policy "Users read their saved pathways"
on public.saved_pathways for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users save their own pathways" on public.saved_pathways;
create policy "Users save their own pathways"
on public.saved_pathways for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users unsave their own pathways" on public.saved_pathways;
create policy "Users unsave their own pathways"
on public.saved_pathways for delete
to authenticated
using (auth.uid() = user_id);

-- Seed starter pathways. These are sample summaries; verify/update details before public launch.
insert into public.pathways (
  id,title,field,qualification,summary,duration,typical_entry,study_topics,job_roles,industries,next_steps,eligibility_note,demand_note,source_urls
) values
(
  'btech-cse','BTech in Computer Science','Engineering & Technology','Bachelor''s degree',
  'Study computing, programming, algorithms, systems, and software development. The exact curriculum depends on the institution.',
  'Usually 4 years in India','Usually after Class 12 with required subjects and institution-specific eligibility; entrance exams may apply.',
  array['Programming','Data structures and algorithms','Computer networks','Databases','Operating systems','Software engineering'],
  array['Software developer','QA engineer','Data analyst (with relevant skills)','Systems engineer','Cybersecurity analyst (with relevant preparation)'],
  array['IT services','Software product companies','Finance','Healthcare technology','Public sector'],
  array['Check current eligibility rules for target colleges.','Identify entrance routes and application dates.','Compare fees, scholarships, and location.','Build foundations in programming and mathematics.','Look for project and internship opportunities.'],
  'Requirements vary by institution, state, entrance route, and admission year. Confirm them with the official admissions authority.',
  'Opportunities vary by role, location, experience, and skills. A degree does not guarantee employment.',
  array['https://jeemain.nta.nic.in/','https://www.ncs.gov.in/']
),
(
  'civil-engineering','Civil Engineering','Engineering & Technology','Engineering degree or diploma, depending on route',
  'Focuses on infrastructure such as buildings, bridges, roads, water systems, and construction projects.',
  'A bachelor''s degree is commonly 4 years; diploma routes are commonly 3 years after Class 10.',
  'Depends on the qualification and route; Class 12 or Class 10 entry may be possible for different programmes.',
  array['Structural analysis','Construction materials','Surveying','Geotechnical engineering','Transportation','Water resources'],
  array['Site engineer','Design engineer (with relevant skills)','Planning engineer','Quantity surveyor','Quality-control engineer'],
  array['Construction','Infrastructure','Consulting','Transportation','Water and environmental services'],
  array['Compare degree and diploma routes.','Check approved programmes and entry requirements.','Understand site-based versus office-based work.','Compare local industry opportunities.','Research safety, software, and practical skills.'],
  'Exact eligibility, accreditation, and admission procedures depend on the programme and institution.',
  'Demand can be regional and project-dependent. Check recent local vacancies and official labour information.',
  array['https://www.ncs.gov.in/']
),
(
  'mechanical-engineering','Mechanical Engineering','Engineering & Technology','Engineering degree or diploma, depending on route',
  'Studies machines, mechanical systems, manufacturing, energy, materials, and how products and industrial systems are designed and made.',
  'A bachelor''s degree is commonly 4 years; diploma routes are commonly 3 years after Class 10.',
  'Depends on the qualification and route; check the relevant programme''s eligibility rules.',
  array['Thermodynamics','Machine design','Manufacturing processes','Fluid mechanics','Materials','CAD'],
  array['Design engineer','Production engineer','Quality engineer','Maintenance engineer','Manufacturing engineer'],
  array['Manufacturing','Automotive','Energy','Aerospace','Industrial equipment'],
  array['Compare degree and diploma routes.','Review the course syllabus.','Explore CAD and manufacturing basics.','Research internships and local employers.','Check current entry-level vacancies.'],
  'Exact eligibility and admission procedures depend on the institution and programme.',
  'Prospects differ by industry, location, specialisation, and practical skills. Use current sources rather than blanket claims.',
  array['https://www.ncs.gov.in/']
),
(
  'bcom','Bachelor of Commerce (BCom)','Commerce & Finance','Undergraduate degree',
  'Covers areas such as accounting, business, taxation, economics, and finance; subjects vary across universities.',
  'Often 3 or 4 years depending on the university and applicable programme structure.',
  'Usually after Class 12; subject and minimum-mark requirements vary by institution.',
  array['Financial accounting','Business law','Economics','Taxation','Auditing','Finance'],
  array['Accounts assistant','Audit trainee','Finance operations associate','Tax assistant','Banking or business support roles'],
  array['Accounting','Banking','Financial services','Retail','Corporate operations'],
  array['Compare university curricula and programme length.','Check subject requirements.','Explore internships and practical accounting tools.','Compare professional qualifications if relevant.','Check fees and scholarship options.'],
  'Admission requirements vary by university and programme.',
  'Job eligibility depends on the role, skills, experience, and any professional qualification required.',
  array['https://www.ncs.gov.in/']
),
(
  'psychology','Psychology','Arts, Humanities & Social Sciences','Undergraduate degree; further study may be needed for specialist roles',
  'Studies human behaviour and mental processes through theory, research, and evidence-based methods.',
  'Undergraduate programmes commonly last 3 or 4 years depending on the institution and structure.',
  'Usually after Class 12; subject requirements vary. Professional roles can require postgraduate study, supervised training, or registration depending on the role and jurisdiction.',
  array['Cognitive psychology','Developmental psychology','Social psychology','Research methods','Statistics','Psychological assessment'],
  array['Research assistant','People operations assistant','Behavioural research support','Further study toward specialised psychology roles'],
  array['Education','Research','Human resources','Community organisations','Healthcare settings (subject to qualifications)'],
  array['Read the syllabus carefully.','Distinguish psychology study from regulated clinical practice.','Check postgraduate and supervised-training requirements.','Explore research methods and statistics.','Confirm requirements with relevant professional authorities.'],
  'Requirements for professional practice vary by role and current regulations. A bachelor''s degree alone does not qualify someone for every psychology role.',
  'Career outcomes depend strongly on further qualifications, role, region, and experience.',
  array['https://www.ncs.gov.in/']
),
(
  'graphic-design','Graphic Design','Design & Creative Arts','Degree, diploma, certificate, or portfolio-based route depending on employer and programme',
  'Uses typography, layout, colour, imagery, and visual communication to solve communication and branding problems.',
  'Varies by route: short courses, diplomas, and degree programmes are available.',
  'Depends on the course; some programmes require an entrance test or portfolio, while others do not.',
  array['Typography','Layout','Colour theory','Brand identity','Digital design tools','Portfolio development'],
  array['Graphic designer','Brand design assistant','Production artist','Visual communication designer'],
  array['Advertising','Media','Publishing','Marketing','Digital products'],
  array['Compare course syllabuses and fees.','Check whether a portfolio or entrance exam is required.','Try a small design project.','Review portfolios and placement information critically.','Build a portfolio and seek feedback.'],
  'Entry requirements vary widely across degree, diploma, and short-course providers.',
  'Employability often depends on portfolio quality, communication, tools, specialisation, and local opportunities.',
  array['https://www.ncs.gov.in/']
),
(
  'law','Law','Law & Public Policy','Integrated law degree after Class 12 or an LLB route after graduation, depending on pathway',
  'Studies legal rules, institutions, reasoning, interpretation, advocacy, and how law applies to real disputes and public life.',
  'Common routes include a 5-year integrated programme after Class 12 or a 3-year LLB after a bachelor''s degree; verify current rules.',
  'Depends on the programme, institution, and entrance route.',
  array['Constitutional law','Contract law','Criminal law','Legal research','Civil procedure','Mooting and advocacy'],
  array['Legal associate (subject to requirements)','Compliance analyst','Legal researcher','Policy research assistant','Further professional qualification routes'],
  array['Law firms','Companies','Government','Nonprofits','Policy and research'],
  array['Compare integrated and graduate-entry routes.','Check current entrance and eligibility requirements.','Explore the daily work of different legal roles.','Research professional enrolment rules.','Compare costs and internship opportunities.'],
  'Admission and professional practice requirements are route-specific and may change. Verify with official institutions and regulators.',
  'Outcomes differ across litigation, firms, in-house roles, public service, and other legal careers.',
  array['https://consortiumofnlus.ac.in/','https://www.ncs.gov.in/']
)
on conflict (id) do nothing;
