-- Run after 003_cutoffs.sql. Exam registry, pathway->exam links and daily reminder generation.

insert into public.exams (id, name, conducting_body) values
  ('JEE-MAIN', 'Joint Entrance Examination (Main)', 'National Testing Agency'),
  ('NEET', 'National Eligibility cum Entrance Test', 'National Testing Agency'),
  ('CUET', 'Common University Entrance Test', 'National Testing Agency'),
  ('CLAT', 'Common Law Admission Test', 'Consortium of National Law Universities')
on conflict do nothing;

-- Which exams matter for which careers (edit freely). Reminders only go to users who saved a linked career.
insert into public.pathway_exams (pathway_id, exam)
select p.id, e.exam from public.pathways p
join (values ('Engineering & Technology','MHT-CET'),('Engineering & Technology','JEE-MAIN'),
             ('Computing & IT','MHT-CET'),('Computing & IT','JEE-MAIN'),
             ('Healthcare & Life Sciences','NEET'),('Law & Public Policy','CLAT'),
             ('Arts, Humanities & Social Sciences','CUET'),('Commerce, Business & Management','CUET'),
             ('Commerce & Finance','CUET')) as e(field, exam) on e.field = p.field
on conflict do nothing;

-- Daily job: reminders 30, 7 and 1 day before each exam event, for users who saved a linked career.
create or replace function public.generate_exam_reminders() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into public.notifications (user_id, exam_date_id, remind_on, kind)
  select distinct sp.user_id, ed.id, current_date, 'reminder'
  from public.saved_pathways sp
  join public.pathway_exams pe on pe.pathway_id = sp.pathway_id
  join public.exam_dates ed on ed.exam = pe.exam
  where (ed.event_date - current_date) in (30, 7, 1)
  on conflict do nothing;
  get diagnostics n = row_count;
  return n;
end $$;

-- When a date is edited, affected users get a "date changed" notice immediately.
create or replace function public.notify_date_changed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.event_date is distinct from old.event_date and new.event_date >= current_date then
    insert into public.notifications (user_id, exam_date_id, remind_on, kind)
    select distinct sp.user_id, new.id, current_date, 'date_changed'
    from public.saved_pathways sp join public.pathway_exams pe on pe.pathway_id = sp.pathway_id
    where pe.exam = new.exam
    on conflict do nothing;
  end if;
  new.updated_at = now();
  return new;
end $$;
drop trigger if exists exam_dates_changed on public.exam_dates;
create trigger exam_dates_changed before update on public.exam_dates
  for each row execute function public.notify_date_changed();

-- Schedule (enable the pg_cron extension in Supabase first: Database > Extensions):
--   select cron.schedule('exam-reminders', '30 3 * * *', 'select public.generate_exam_reminders()');
