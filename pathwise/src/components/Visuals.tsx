import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowRight, BadgeCheck, Check, ChevronDown, Compass, ExternalLink, GraduationCap, Map, Plus, School, Search, ShieldCheck, X } from "lucide-react";
import type { Pathway } from "../types";
import "../visuals.css";

/* ------------------------------------------------------------------ *
 * PathWise visual layer.
 * Every component here is ADDITIVE: it is rendered next to the existing
 * text, never instead of it. All data comes from the existing app data
 * (catalogue, streams, survey answers). Nothing here invents cutoffs,
 * fees, rankings, salaries or dates.
 * ------------------------------------------------------------------ */

/* ---------- shared building blocks ---------- */

function Fig({ title, desc, children, className = "" }: { title: string; desc: string; children: ReactNode; className?: string }) {
  const id = useId();
  return (
    <figure className={`vz ${className}`} role="group" aria-labelledby={id}>
      <figcaption id={id} className="vz-title">{title}</figcaption>
      <p className="vz-sr">{desc}</p>
      {children}
    </figure>
  );
}

function Legend({ items }: { items: { tone: string; label: string }[] }) {
  return (
    <ul className="vz-legend" aria-label="Legend">
      {items.map(i => <li key={i.label}><span className={`vz-swatch ${i.tone}`} aria-hidden="true" />{i.label}</li>)}
    </ul>
  );
}

function Arrow() {
  return <span className="vz-arrow" aria-hidden="true"><ArrowRight className="vz-arrow-h" size={16} /><ArrowDown className="vz-arrow-v" size={16} /></span>;
}

function Chips({ items, tone = "", max = 6 }: { items: string[]; tone?: string; max?: number }) {
  const shown = items.slice(0, max);
  return (
    <span className="vz-chips">
      {shown.map(i => <span key={i} className={`vz-chip ${tone}`}>{i}</span>)}
      {items.length > max && <span className="vz-chip more">+{items.length - max} more</span>}
    </span>
  );
}

const tones = ["t-lav", "t-mint", "t-peach", "t-blush", "t-blue"];

/* ---------- 1. Homepage: whole counselling journey ---------- */

export type GoTarget = "start" | "map" | "pathways" | "compare" | "after10" | "after12" | "colleges";

export function JourneyOverview({ onGo }: { onGo: (t: GoTarget) => void }) {
  const stages: { n: string; title: string; text: string; tone: string; icon: ReactNode; go: GoTarget; extra?: { label: string; go: GoTarget } }[] = [
    { n: "1", title: "Tell us about you", text: "Short guided questions, one at a time.", tone: "t-lav", icon: <Compass size={18} />, go: "start" },
    { n: "2", title: "See your route map", text: "Next actions and career ideas that update with your answers.", tone: "t-mint", icon: <Map size={18} />, go: "map" },
    { n: "3", title: "Explore and compare", text: "Career pages, roadmaps and side-by-side comparison.", tone: "t-peach", icon: <Search size={18} />, go: "pathways" },
    { n: "4", title: "Choose your route", text: "Class 11 streams, or courses and colleges after Class 12.", tone: "t-blush", icon: <GraduationCap size={18} />, go: "after10", extra: { label: "After Class 12", go: "after12" } },
    { n: "5", title: "Research and apply", text: "Official sources, cutoff evidence and counselling steps.", tone: "t-blue", icon: <School size={18} />, go: "colleges" }
  ];
  return (
    <Fig className="vz-journey" title="Your counselling journey at a glance" desc="Five stages: tell us about you, see your route map, explore and compare careers, choose your route after Class 10 or Class 12, then research colleges and apply. Each stage opens the matching part of PathWise.">
      <ol className="vz-journey-list">
        {stages.map((s, i) => (
          <li key={s.n} className="vz-journey-item">
            <div className={`vz-journey-node ${s.tone}`}>
              <span className="vz-journey-num">{s.n}</span>
              <span className="vz-journey-icon" aria-hidden="true">{s.icon}</span>
              <b>{s.title}</b>
              <small>{s.text}</small>
              <span className="vz-journey-actions">
                <button type="button" onClick={() => onGo(s.go)}>{s.go === "start" ? "Begin" : s.go === "after10" ? "After Class 10" : "Open"}</button>
                {s.extra && <button type="button" onClick={() => onGo(s.extra!.go)}>{s.extra.label}</button>}
              </span>
            </div>
            {i < stages.length - 1 && <Arrow />}
          </li>
        ))}
      </ol>
    </Fig>
  );
}

/** Tiny "input → output" strip shown inside each home feature card. */
export function MiniFlow({ steps }: { steps: string[] }) {
  return (
    <span className="vz-mini" role="img" aria-label={"How it works: " + steps.join(", then ")}>
      {steps.map((s, i) => <span key={s} className="vz-mini-step" aria-hidden="true">{s}{i < steps.length - 1 && <ArrowRight size={11} />}</span>)}
    </span>
  );
}

/* ---------- 2. Survey: staged progress ---------- */

const phaseDefs = [
  { name: "About you", ids: ["stage", "location", "stream"], tone: "t-lav" },
  { name: "Interests", ids: ["subjects", "interests", "workStyle"], tone: "t-mint" },
  { name: "Reality check", ids: ["priorities", "budget", "studyLength"], tone: "t-peach" },
  { name: "Readiness", ids: ["confidence", "marks", "nextChoice"], tone: "t-blush" }
];

export function SurveyPhases({ steps, answered, index }: { steps: { id: string; title: string }[]; answered: Record<string, boolean>; index: number }) {
  const current = steps[index]?.id;
  const phaseIdx = Math.max(0, phaseDefs.findIndex(p => p.ids.includes(current)));
  const doneCount = steps.filter(s => answered[s.id]).length;
  return (
    <Fig className="vz-phases" title="Where you are in the counselling" desc={`Stage ${phaseIdx + 1} of ${phaseDefs.length}: ${phaseDefs[phaseIdx].name}. ${doneCount} of ${steps.length} questions answered.`}>
      <ol className="vz-phase-list">
        {phaseDefs.map((p, pi) => {
          const state = pi < phaseIdx ? "past" : pi === phaseIdx ? "now" : "next";
          return (
            <li key={p.name} className={`vz-phase ${p.tone} ${state}`} aria-current={state === "now" ? "step" : undefined}>
              <span className="vz-phase-name">{p.name}</span>
              <span className="vz-dots" aria-hidden="true">
                {p.ids.map(id => <span key={id} className={`vz-dot ${id === current ? "cur" : answered[id] ? "ok" : ""}`} />)}
              </span>
            </li>
          );
        })}
      </ol>
    </Fig>
  );
}

/* ---------- 2b. Survey: how this answer branches ---------- */

type StreamLike = { id: string; name: string; optional: string[]; jobs: string[]; exams: string[]; sources: string[]; channels: string[]; paid: string[] };
type SurveyStep = { id: string; title: string; question: string; options: { label: string; value: string; detail: string }[]; multi?: boolean; input?: string };

// Wording below is taken from the existing option descriptions in the survey.
const stageRoutes: Record<string, string[]> = {
  "school-before10": ["Explore subjects and activities you enjoy", "No career decision needed yet"],
  after10: ["Class 11–12 streams", "Diploma / polytechnic", "ITI / vocational"],
  after12: ["Subjects you hold", "Entrance exams", "Realistic next-step options"],
  finished12: ["Degrees", "Diplomas", "Professional courses", "Job-oriented routes"],
  college: ["Specialisations", "Switching", "Internships and skills", "Further study"],
  change: ["What isn’t working", "Transition routes to compare"]
};
const answerBranches: Record<string, Record<string, string[]>> = {
  budget: { low: ["Public institutions", "Scholarships", "Lower-cost pathways"], medium: ["Total-cost comparison", "Likely financial support"], flexible: ["Value and outcomes", "Debt risk"], unknown: ["Find out the costs first"] },
  studyLength: { short: ["Vocational", "Diploma", "Apprenticeship", "Entry-level routes"], degree: ["Undergraduate degrees", "Actual entry requirements"], long: ["Longer professional routes", "Research routes"], unknown: ["Compare duration and cost first"] },
  marks: { low: ["Bridge learning", "Alternative entry routes", "Eligibility checks"], mid: ["Each institution’s minimum", "Entrance route"], good: ["Eligibility", "Entrance scores", "Course fit"], high: ["Competitive options", "Not cutoffs alone"], unknown: ["Subject-wise results when available"] },
  confidence: { lost: ["Simple explanations", "Small set of explorations"], some: ["Side-by-side comparison", "Test your assumptions"], clear: ["Eligibility", "Costs", "Entrance exams", "Action plan"], anxious: ["Keep alternatives open", "Low-risk experiments"] },
  nextChoice: { discover: ["Career shortlist", "Plain explanations"], course: ["Routes", "Eligibility", "Costs and duration"], college: ["Local search", "Official cutoffs", "Admission requirements"], job: ["Learning plan", "Application plan"], full: ["Start at your stage", "One decision at a time"] }
};
const streamToPlanner: Record<string, string[]> = { "science-maths": ["pcm"], "science-biology": ["pcb"], "science-both": ["pcm", "pcb"], commerce: ["commerce"], arts: ["arts"], vocational: ["vocational"] };

export function SurveyBranch({ step, value, streamData, suggestedTitles }: { step: SurveyStep; value: string | string[]; streamData: StreamLike[]; suggestedTitles: string[] }) {
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  const desc = selected.length
    ? `Your answer to "${step.title}" leads to the branches highlighted below.`
    : `Choose an answer to see which routes it opens. Every option is shown with what it leads to.`;

  let body: ReactNode;
  if (step.input) {
    const loc = typeof value === "string" && value.trim() ? value.trim() : "your area";
    body = (
      <div className="vz-tree">
        <div className="vz-root t-lav"><small>YOU TOLD US</small><b>{loc}</b></div>
        <ul className="vz-branches">
          {["Colleges and training providers near you", "Travel and living cost", "Current cutoffs and official placement reports"].map(x => <li key={x}><span className="vz-leaf t-mint">{x}</span></li>)}
        </ul>
      </div>
    );
  } else if (step.multi) {
    const opts = step.options.filter(o => selected.includes(o.value));
    body = (
      <div className="vz-tree">
        <div className="vz-root t-lav"><small>{step.title.toUpperCase()}</small><b>{opts.length ? `${opts.length} chosen` : "Nothing chosen yet"}</b></div>
        <ul className="vz-branches">
          {opts.map((o, i) => <li key={o.value}><span className={`vz-leaf ${tones[i % tones.length]}`}><b>{o.label}</b><small>{o.detail}</small></span></li>)}
          {opts.length > 0 && ["subjects", "interests", "workStyle"].includes(step.id) && suggestedTitles.length > 0 && (
            <li><span className="vz-leaf t-peach strong"><small>CAREER IDEAS MATCHING YOUR ANSWERS SO FAR</small><Chips items={suggestedTitles} tone="t-peach" max={4} /></span></li>
          )}
        </ul>
      </div>
    );
  } else {
    const chosen = step.options.find(o => o.value === selected[0]);
    const subs = chosen ? (step.id === "stage" ? stageRoutes[chosen.value] : answerBranches[step.id]?.[chosen.value]) : undefined;
    const planner = step.id === "stream" && chosen ? (streamToPlanner[chosen.value] || []).map(id => streamData.find(s => s.id === id)).filter(Boolean) as StreamLike[] : [];
    body = (
      <div className="vz-tree">
        <div className="vz-root t-lav"><small>{step.title.toUpperCase()}</small><b>{chosen ? chosen.label : "Choose one"}</b></div>
        <ul className="vz-branches">
          {step.options.map((o, i) => {
            const on = o.value === selected[0];
            return (
              <li key={o.value} className={on ? "on" : "off"}>
                <span className={`vz-leaf ${on ? tones[i % tones.length] : "t-faint"}`}>
                  <b>{on && <Check size={13} aria-label="selected" />} {o.label}</b>
                  {on && <small>{o.detail}</small>}
                  {on && subs && <Chips items={subs} tone={tones[i % tones.length]} max={6} />}
                  {on && planner.map(s => (
                    <span className="vz-sublist" key={s.id}>
                      <small>EXAMS TO INVESTIGATE · {s.name}</small><Chips items={s.exams} tone="t-blue" max={4} />
                      <small>CAREERS THIS ROUTE CAN LEAD TO</small><Chips items={s.jobs} tone="t-mint" max={5} />
                    </span>
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
  return <Fig className="vz-branch" title="How your answer branches" desc={desc}>{body}<p className="vz-note">Branches show options that stay open. They do not rule other routes out.</p></Fig>;
}

/* ---------- 3. Career explorer: family map + compact summaries ---------- */

export function CareerFamilyMap({ items, onFilter }: { items: Pathway[]; onFilter: (q: string) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const groups = useMemo(() => {
    const m = new globalThis.Map<string, Pathway[]>();
    items.forEach(p => m.set(p.field, [...(m.get(p.field) || []), p]));
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [items]);
  const current = groups.find(([f]) => f === open);
  return (
    <Fig className="vz-family" title="Career family map" desc={`${groups.length} career families containing ${items.length} pathways. Select a family to expand it into degrees, qualifications and job roles.`}>
      <p className="vz-lead">Tap a family to open its map: <b>field → qualification → job roles</b>. Then tap a pathway to filter the full list below.</p>
      <div className="vz-field-grid">
        {groups.map(([f, list], i) => (
          <button type="button" key={f} className={`vz-field ${tones[i % tones.length]} ${open === f ? "open" : ""}`} aria-expanded={open === f} onClick={() => setOpen(open === f ? null : f)}>
            <b>{f}</b>
            <small>{list.length} {list.length === 1 ? "pathway" : "pathways"}</small>
            <ChevronDown size={15} aria-hidden="true" />
          </button>
        ))}
      </div>
      {current && (
        <div className="vz-family-open">
          <div className="vz-family-head"><b>{current[0]}</b><button type="button" className="vz-link" onClick={() => onFilter(current[0])}>Show all {current[1].length} in the list below</button></div>
          <ul className="vz-family-tree">
            {current[1].map(p => (
              <li key={p.id}>
                <button type="button" className="vz-node-btn" onClick={() => onFilter(p.title)}><b>{p.title}</b><small>{p.qualification} · {p.duration}</small></button>
                <span className="vz-fam-roles"><Arrow /><Chips items={p.job_roles} tone="t-mint" max={4} /></span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Fig>
  );
}

/** Reads year ranges out of the existing duration text. Returns null when the text has no numbers. */
export function parseYears(text: string): [number, number] | null {
  const re = /(\d+(?:\.\d+)?)(?:\s*(?:–|-|to|or)\s*(\d+(?:\.\d+)?))?\s*(month|year)/gi;
  let lo = Infinity, hi = -Infinity, m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const k = m[3].toLowerCase() === "month" ? 1 / 12 : 1;
    const a = parseFloat(m[1]) * k, b = (m[2] ? parseFloat(m[2]) : parseFloat(m[1])) * k;
    lo = Math.min(lo, a, b); hi = Math.max(hi, a, b);
  }
  return isFinite(lo) ? [lo, hi] : null;
}
const fmtYears = (v: number) => (v < 1 ? `${Math.round(v * 12)} months` : `${+v.toFixed(1)} yr`);

function DurationBar({ text }: { text: string }) {
  const r = parseYears(text);
  if (!r) return null;
  const max = 6;
  const left = Math.min(r[0], max) / max * 100;
  const width = Math.max(3, (Math.min(r[1], max) - Math.min(r[0], max)) / max * 100);
  const label = r[0] === r[1] ? fmtYears(r[0]) : `${fmtYears(r[0])} – ${fmtYears(r[1])}`;
  return (
    <span className="vz-dur" role="img" aria-label={`Duration from the text: ${label}`}>
      <span className="vz-dur-track"><span className="vz-dur-fill" style={{ left: `${left}%`, width: `${width}%` }} /></span>
      <small>{label} <i>(from duration text · scale 0–6 yr)</i></small>
    </span>
  );
}

export function CardSummary({ p }: { p: Pathway }) {
  return (
    <div className="vz-card-summary" aria-label="Quick visual summary">
      <DurationBar text={p.duration} />
      <span className="vz-tiles">
        <span className="vz-tile t-lav"><b>{p.study_topics.length}</b><small>study topics</small></span>
        <span className="vz-tile t-mint"><b>{p.job_roles.length}</b><small>job roles</small></span>
        <span className="vz-tile t-peach"><b>{p.industries.length}</b><small>sectors</small></span>
        <span className="vz-tile t-blue"><b>{p.next_steps.length}</b><small>checks</small></span>
      </span>
    </div>
  );
}

/* ---------- 4. Career detail: route diagram, ladder, skill map, alternatives ---------- */

export function CareerRoute({ p, skills, roadmapTitles, roadmapItems, related, onOpen }: { p: Pathway; skills: string[]; roadmapTitles: string[]; roadmapItems: string[]; related: Pathway[]; onOpen: (p: Pathway) => void }) {
  const advantages = [roadmapItems[3], roadmapItems[4]].filter(Boolean);
  return (
    <section className="vz-career" aria-label="Visual route for this career">
      <Fig title="Route diagram: school → qualification → specialisation → skills → jobs" desc={`Route for ${p.title}. Required: ${p.typical_entry} Then ${p.qualification}. You may specialise in ${p.study_topics.join(", ")}. Build ${skills.length} skills. Possible jobs: ${p.job_roles.join(", ")}.`}>
        <Legend items={[{ tone: "t-lav", label: "Required — verify officially" }, { tone: "t-mint", label: "Core learning" }, { tone: "t-peach", label: "Build alongside" }, { tone: "t-blue", label: "Possible outcome" }]} />
        <ol className="vz-flow">
          <li className="vz-flow-item"><div className="vz-flow-node t-lav"><small>1 · SCHOOL SUBJECTS AND ENTRY — REQUIRED</small><p>{p.typical_entry}</p></div><Arrow /></li>
          <li className="vz-flow-item"><div className="vz-flow-node t-lav"><small>2 · QUALIFICATION — REQUIRED</small><p><b>{p.qualification}</b></p><p className="vz-dim">{p.duration}</p></div><Arrow /></li>
          <li className="vz-flow-item"><div className="vz-flow-node t-mint"><small>3 · SPECIALISATIONS AND TOPICS</small><Chips items={p.study_topics} tone="t-mint" max={6} /></div><Arrow /></li>
          <li className="vz-flow-item"><div className="vz-flow-node t-peach"><small>4 · SKILLS TO BUILD</small><p>{skills.length} skills — see the skill map below</p></div><Arrow /></li>
          <li className="vz-flow-item"><div className="vz-flow-node t-blue"><small>5 · POSSIBLE JOBS</small><Chips items={p.job_roles} tone="t-blue" max={6} /></div></li>
        </ol>
      </Fig>

      <Fig title="Roadmap staircase" desc={`The six roadmap steps in order: ${roadmapTitles.join(", ")}.`}>
        <ol className="vz-stairs">
          {roadmapTitles.map((t, i) => <li key={t} style={{ ["--h" as string]: `${38 + i * 13}px` }} className={tones[i % tones.length]}><span>{String(i + 1).padStart(2, "0")}</span><b>{t}</b></li>)}
        </ol>
        <p className="vz-note">The full description of every step is in “Your roadmap”.</p>
      </Fig>

      <Fig title="Skill and advantage map" desc={`Three tiers. Required: entry route and qualification. Recommended skills: ${skills.join(" ")} Extra advantages: ${advantages.join(" ")}`}>
        <div className="vz-tiers">
          <div className="vz-tier t-lav"><h4>Required</h4><span className="vz-tier-sub">Check the official notice</span><ul><li>{p.typical_entry}</li><li>{p.qualification}</li></ul></div>
          <div className="vz-tier t-peach"><h4>Recommended skills</h4><span className="vz-tier-sub">Build alongside your course</span><ul>{skills.map(s => <li key={s}>{s}</li>)}</ul></div>
          <div className="vz-tier t-mint"><h4>Extra advantages</h4><span className="vz-tier-sub">Help you stand out; not a substitute for required qualifications</span><ul>{advantages.map(s => <li key={s}>{s}</li>)}</ul></div>
        </div>
      </Fig>

      {related.length > 0 && (
        <Fig title="Other routes in the same field" desc={`${related.length} other catalogue entries in ${p.field}. Select one to open its roadmap.`}>
          <p className="vz-lead">From the PathWise catalogue. Compare eligibility, cost and duration before switching routes.</p>
          <div className="vz-alt">{related.slice(0, 12).map(r => <button type="button" key={r.id} className="vz-alt-btn" onClick={() => onOpen(r)}><b>{r.title}</b><small>{r.qualification} · {r.duration}</small></button>)}</div>
        </Fig>
      )}
    </section>
  );
}

/* ---------- 5. Comparison: charts under the original table ---------- */

export function CompareVisuals({ a, b }: { a: Pathway; b: Pathway }) {
  const rows: [string, number, number][] = [["Study topics", a.study_topics.length, b.study_topics.length], ["Possible job roles", a.job_roles.length, b.job_roles.length], ["Sectors", a.industries.length, b.industries.length], ["Checks before choosing", a.next_steps.length, b.next_steps.length]];
  const maxN = Math.max(1, ...rows.flatMap(r => [r[1], r[2]]));
  const da = parseYears(a.duration), db = parseYears(b.duration);
  const lc = (x: string[]) => x.map(s => s.toLowerCase());
  const overlap = (xa: string[], xb: string[]) => {
    const sb = new Set(lc(xb)), sa = new Set(lc(xa));
    return { both: xa.filter(x => sb.has(x.toLowerCase())), onlyA: xa.filter(x => !sb.has(x.toLowerCase())), onlyB: xb.filter(x => !sa.has(x.toLowerCase())) };
  };
  const sets: [string, ReturnType<typeof overlap>][] = [["Study topics", overlap(a.study_topics, b.study_topics)], ["Job roles", overlap(a.job_roles, b.job_roles)], ["Sectors", overlap(a.industries, b.industries)]];
  const bar = (r: [number, number] | null) => r ? { l: Math.min(r[0], 6) / 6 * 100, w: Math.max(3, (Math.min(r[1], 6) - Math.min(r[0], 6)) / 6 * 100) } : null;
  return (
    <Fig className="vz-compare" title="At-a-glance comparison charts" desc={`Charts comparing ${a.title} with ${b.title}: duration range, counts of topics, roles, sectors and checks, and what the two options share. The full table above has all the text.`}>
      <Legend items={[{ tone: "t-lav", label: a.title }, { tone: "t-peach", label: b.title }]} />
      <div className="vz-cmp-block">
        <h4>Typical duration <small>(read from each duration text; scale 0–6 years)</small></h4>
        {[[a, da, "t-lav"], [b, db, "t-peach"]].map(([p, r, tone]) => {
          const pp = p as Pathway, bb = bar(r as [number, number] | null);
          return <div className="vz-cmp-row" key={pp.id}><span className="vz-cmp-name">{pp.title}</span>{bb ? <span className="vz-dur-track wide"><span className={`vz-dur-fill ${tone as string}`} style={{ left: `${bb.l}%`, width: `${bb.w}%` }} /></span> : <span className="vz-dim">No fixed number: “{pp.duration}”</span>}</div>;
        })}
      </div>
      <div className="vz-cmp-block">
        <h4>How much each entry lists <small>(counts from the catalogue — not a quality score)</small></h4>
        {rows.map(([label, x, y]) => (
          <div className="vz-bars" key={label}>
            <span className="vz-bars-label">{label}</span>
            <span className="vz-bar-pair">
              <span className="vz-hbar t-lav" style={{ width: `${Math.max(4, x / maxN * 100)}%` }}>{x}</span>
              <span className="vz-hbar t-peach" style={{ width: `${Math.max(4, y / maxN * 100)}%` }}>{y}</span>
            </span>
          </div>
        ))}
      </div>
      <div className="vz-cmp-block">
        <h4>What they share and what is unique</h4>
        {sets.map(([label, o]) => (
          <div className="vz-overlap" key={label}>
            <b>{label}</b>
            <div className="vz-overlap-grid">
              <div className="t-lav"><small>ONLY {a.title.toUpperCase().slice(0, 28)}</small>{o.onlyA.length ? <Chips items={o.onlyA} tone="t-lav" max={5} /> : <span className="vz-dim">Nothing unique</span>}</div>
              <div className="t-mint"><small>BOTH</small>{o.both.length ? <Chips items={o.both} tone="t-mint" max={5} /> : <span className="vz-dim">No exact matches</span>}</div>
              <div className="t-peach"><small>ONLY {b.title.toUpperCase().slice(0, 28)}</small>{o.onlyB.length ? <Chips items={o.onlyB} tone="t-peach" max={5} /> : <span className="vz-dim">Nothing unique</span>}</div>
            </div>
          </div>
        ))}
      </div>
    </Fig>
  );
}

/* ---------- 6. After Class 10 ---------- */

const streamFields: Record<string, string[]> = {
  pcm: ["Engineering & Technology", "Computing & IT", "Built Environment & Design"],
  pcb: ["Healthcare & Life Sciences", "Agriculture & Environment"],
  commerce: ["Commerce, Business & Management"],
  arts: ["Arts, Humanities & Social Sciences", "Law & Public Policy", "Education & Social Impact", "Media, Arts & Communication"],
  vocational: ["Post-Class-10 Pathways", "Hospitality, Tourism & Services", "Transport & Public Services"],
  design: ["Design & Creative Arts", "Built Environment & Design", "Media, Arts & Communication"]
};

export function StreamTree({ streams, selectedId, onSelect, catalogue, onExplore }: { streams: StreamLike[]; selectedId: string; onSelect: (id: string) => void; catalogue: Pathway[]; onExplore: (p: Pathway) => void }) {
  const s = streams.find(x => x.id === selectedId) || streams[0];
  const related = catalogue.filter(p => (streamFields[s.id] || []).includes(p.field));
  return (
    <Fig className="vz-stream" title="Decision tree: Class 10 → route → subjects, exams and careers" desc={`Six routes after Class 10. Selected: ${s.name}. Optional subjects: ${s.optional.join(", ")}. Exams: ${s.exams.join(", ")}. Careers: ${s.jobs.join(", ")}.`}>
      <div className="vz-hub"><span className="vz-hub-root t-lav"><GraduationCap size={16} aria-hidden="true" /> Class 10 complete</span><Arrow /></div>
      <div className="vz-stream-grid" role="group" aria-label="Choose a route to expand">
        {streams.map((x, i) => (
          <button type="button" key={x.id} aria-pressed={x.id === s.id} className={`vz-stream-btn ${tones[i % tones.length]} ${x.id === s.id ? "on" : ""}`} onClick={() => onSelect(x.id)}>
            <b>{x.name}</b><small>{x.exams.length} exam routes · {x.jobs.length} careers</small>
          </button>
        ))}
      </div>
      <div className="vz-stream-detail">
        <div className="vz-col t-lav"><h4>Optional subjects to ask about</h4><Chips items={s.optional} tone="t-lav" max={8} /></div>
        <div className="vz-col t-blue"><h4>Entrance / admission routes</h4><Chips items={s.exams} tone="t-blue" max={8} /></div>
        <div className="vz-col t-mint"><h4>Careers it can lead to</h4><Chips items={s.jobs} tone="t-mint" max={10} /></div>
      </div>
      {related.length > 0 && (
        <div className="vz-col wide t-peach">
          <h4>Degrees and courses in the PathWise catalogue related to this route</h4>
          <div className="vz-alt">{related.slice(0, 12).map(p => <button type="button" key={p.id} className="vz-alt-btn" onClick={() => onExplore(p)}><b>{p.title}</b><small>{p.qualification}</small></button>)}</div>
          <p className="vz-note">Matched by field. Eligibility depends on exact subjects, marks and the admission year; open each page and verify.</p>
        </div>
      )}
      <Legend items={[{ tone: "t-lav", label: "Subjects" }, { tone: "t-blue", label: "Exams" }, { tone: "t-mint", label: "Careers" }, { tone: "t-peach", label: "Catalogue courses" }]} />
    </Fig>
  );
}

export function RegistrationFlow() {
  const steps = ["Confirm eligibility", "Prepare documents", "Enter details exactly", "Upload and review", "Pay and save proof", "Track windows to results"];
  return (
    <Fig className="vz-regflow" title="Registration flowchart" desc={`Six steps in order: ${steps.join(", ")}. The full instructions are in the numbered list.`}>
      <ol className="vz-flow compact">
        {steps.map((t, i) => <li className="vz-flow-item" key={t}><div className={`vz-flow-node ${tones[i % tones.length]}`}><small>STEP {i + 1}</small><b>{t}</b></div>{i < steps.length - 1 && <Arrow />}</li>)}
      </ol>
      <p className="vz-note">Dates, fees and documents change every year. Take them only from the current official notice.</p>
    </Fig>
  );
}

export function PrepTimeline({ exam, phases }: { exam: string; phases: string[] }) {
  const items = [{ t: "Map the official syllabus", tone: "t-lav" }, { t: `Register for ${exam}`, tone: "t-blue" }, ...phases.map((p, i) => ({ t: `Phase ${i + 1}: ${p}`, tone: "t-mint" })), { t: "Admit card and exam day", tone: "t-peach" }, { t: "Results and counselling", tone: "t-blush" }];
  return (
    <Fig className="vz-timeline" title="Exam-year timeline" desc={`Order of work for ${exam}: ${items.map(i => i.t).join(", then ")}. No dates are shown because they change every year.`}>
      <ol className="vz-tl">{items.map((i, n) => <li key={i.t} className={i.tone}><span className="vz-tl-dot">{n + 1}</span><span>{i.t}</span></li>)}</ol>
      <p className="vz-note">Order only. Add real dates from the official notice.</p>
    </Fig>
  );
}

export function WeeklySchedule({ hours }: { hours: number }) {
  const days = [["Mon", hours, "Learn + practise"], ["Tue", hours, "Learn + practise"], ["Wed", hours, "Learn + practise"], ["Thu", hours, "Learn + practise"], ["Fri", hours, "Learn + practise"], ["Sat", hours, "Timed test + review"], ["Sun", hours / 2, "Error log + rest"]] as [string, number, string][];
  const total = days.reduce((s, d) => s + d[1], 0);
  const max = Math.max(...days.map(d => d[1]));
  return (
    <Fig className="vz-week" title="Sample study week" desc={`Example week built from about ${hours} focused hours a day: ${days.map(d => `${d[0]} ${d[1]} hours ${d[2]}`).join("; ")}. About ${total} hours in total.`}>
      <div className="vz-week-bars" aria-hidden="true">
        {days.map(([d, h, what], i) => (
          <div className="vz-week-col" key={d}>
            <span className="vz-week-h">{h}h</span>
            <span className={`vz-week-bar ${i === 5 ? "t-peach" : i === 6 ? "t-mint" : "t-lav"}`} style={{ height: `${Math.max(14, h / max * 90)}px` }} />
            <b>{d}</b><small>{what}</small>
          </div>
        ))}
      </div>
      <p className="vz-note"><span className="vz-badge estimate">Estimate</span> About {total} h this week, starting from your target’s daily hours. Adjust to school workload; this is a starting structure, not a guarantee.</p>
    </Fig>
  );
}

export function RevisionCycle() {
  const steps = ["Learn the topic", "Solve exam-style questions", "Take a timed test", "Log every mistake", "Revisit weak topics within 48 hours"];
  const R = 86, cx = 130, cy = 108;
  const pts = steps.map((_, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / steps.length; return [cx + R * Math.cos(a), cy + R * Math.sin(a)]; });
  return (
    <Fig className="vz-cycle" title="Revision cycle" desc={`A repeating five-step cycle: ${steps.join(", then ")}, then back to learning.`}>
      <div className="vz-cycle-wrap">
        <svg viewBox="0 0 260 216" className="vz-cycle-svg" aria-hidden="true" focusable="false">
          <circle cx={cx} cy={cy} r={R} className="vz-cycle-ring" />
          <text x={cx} y={cy - 2} textAnchor="middle" className="vz-cycle-center">repeat</text>
          <text x={cx} y={cy + 13} textAnchor="middle" className="vz-cycle-center sm">until stable</text>
          {pts.map(([x, y], i) => <g key={i}><circle cx={x} cy={y} r={14} className={`vz-cycle-node n${i % 5}`} /><text x={x} y={y + 4} textAnchor="middle" className="vz-cycle-num">{i + 1}</text></g>)}
        </svg>
        <ol className="vz-cycle-list">{steps.map((s, i) => <li key={s}><span className={`vz-cycle-badge n${i % 5}`}>{i + 1}</span>{s}</li>)}</ol>
      </div>
    </Fig>
  );
}

type Mock = { id: number; score: number; label: string };
type Prep = { phases: boolean[]; syllabus: number; mocks: Mock[] };

export function PrepTracker({ exam, target, phases }: { exam: string; target: number; phases: string[] }) {
  const key = "pathwise-prep-" + exam;
  const blank: Prep = { phases: phases.map(() => false), syllabus: 0, mocks: [] };
  const [st, setSt] = useState<Prep>(() => {
    try { const raw = localStorage.getItem(key); if (raw) { const p = JSON.parse(raw) as Prep; return { phases: phases.map((_, i) => !!p.phases?.[i]), syllabus: Number(p.syllabus) || 0, mocks: Array.isArray(p.mocks) ? p.mocks : [] }; } } catch { /* storage unavailable */ }
    return blank;
  });
  const [score, setScore] = useState(""), [label, setLabel] = useState("");
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(st)); } catch { /* storage unavailable */ } }, [key, st]);
  const doneN = st.phases.filter(Boolean).length;
  const last = st.mocks[st.mocks.length - 1];
  const shown = st.mocks.slice(-10);
  const W = 300, H = 120, pad = 18, bw = Math.min(26, (W - pad * 2) / Math.max(shown.length, 1) - 6);
  const C = 2 * Math.PI * 30;
  function add() {
    const n = Number(score);
    if (!score || isNaN(n) || n < 0 || n > 100) return;
    setSt(s => ({ ...s, mocks: [...s.mocks, { id: Date.now(), score: n, label: label.trim() || `Mock ${s.mocks.length + 1}` }] }));
    setScore(""); setLabel("");
  }
  return (
    <Fig className="vz-tracker" title="Your preparation tracker" desc={`Tracks your own progress for ${exam}: ${doneN} of ${phases.length} phases done, syllabus ${st.syllabus}% covered, ${st.mocks.length} mock tests logged against a ${target}% target. Saved on this device.`}>
      <div className="vz-tracker-grid">
        <div className="vz-tracker-card t-lav">
          <h4>Syllabus covered</h4>
          <div className="vz-ring-row">
            <svg viewBox="0 0 80 80" className="vz-ring" aria-hidden="true" focusable="false"><circle cx="40" cy="40" r="30" className="vz-ring-bg" /><circle cx="40" cy="40" r="30" className="vz-ring-fg" strokeDasharray={`${C * st.syllabus / 100} ${C}`} transform="rotate(-90 40 40)" /><text x="40" y="45" textAnchor="middle">{st.syllabus}%</text></svg>
            <label className="vz-range">Your estimate
              <input type="range" min={0} max={100} step={5} value={st.syllabus} onChange={e => setSt(s => ({ ...s, syllabus: Number(e.target.value) }))} />
            </label>
          </div>
          <small>Update as you finish units from the official syllabus.</small>
        </div>
        <div className="vz-tracker-card t-mint">
          <h4>Milestones <span>{doneN}/{phases.length}</span></h4>
          <div className="vz-meter" aria-hidden="true"><span style={{ width: `${doneN / phases.length * 100}%` }} /></div>
          <ul className="vz-checks">
            {phases.map((p, i) => <li key={p}><label><input type="checkbox" checked={st.phases[i]} onChange={() => setSt(s => ({ ...s, phases: s.phases.map((v, j) => (j === i ? !v : v)) }))} /><span>Phase {i + 1}: {p}</span></label></li>)}
          </ul>
        </div>
      </div>
      <div className="vz-tracker-card t-peach wide">
        <h4>Mock-test scores vs your {target}% target</h4>
        <div className="vz-mock-form">
          <input aria-label="Mock test score in percent" type="number" min={0} max={100} placeholder="Score %" value={score} onChange={e => setScore(e.target.value)} onKeyDown={e => { if (e.key === "Enter") add(); }} />
          <input aria-label="Mock test name (optional)" placeholder="Name (optional)" value={label} onChange={e => setLabel(e.target.value)} onKeyDown={e => { if (e.key === "Enter") add(); }} />
          <button type="button" className="vz-btn" onClick={add}><Plus size={14} aria-hidden="true" /> Add</button>
          {st.mocks.length > 0 && <button type="button" className="vz-btn ghost" onClick={() => setSt(s => ({ ...s, mocks: s.mocks.slice(0, -1) }))}><X size={14} aria-hidden="true" /> Undo last</button>}
        </div>
        {shown.length === 0 ? <p className="vz-dim">No scores yet. The chart appears when you add your own mock results; nothing here is pre-filled.</p> : (
          <>
            <svg viewBox={`0 0 ${W} ${H + 22}`} className="vz-mock-svg" role="img" aria-label={`Bar chart of your last ${shown.length} mock scores: ${shown.map(m => `${m.label} ${m.score}%`).join(", ")}. Target line at ${target}%.`}>
              <line x1={pad} x2={W - 4} y1={H - target / 100 * (H - 14)} y2={H - target / 100 * (H - 14)} className="vz-target-line" />
              <text x={W - 4} y={H - target / 100 * (H - 14) - 3} textAnchor="end" className="vz-target-text">target {target}%</text>
              {shown.map((m, i) => {
                const x = pad + i * ((W - pad * 2) / shown.length) + 3, h = m.score / 100 * (H - 14);
                return <g key={m.id}><rect x={x} y={H - h} width={bw} height={h} rx={4} className={m.score >= target ? "vz-mock-bar hit" : "vz-mock-bar"} /><text x={x + bw / 2} y={H - h - 3} textAnchor="middle" className="vz-mock-val">{m.score}</text><text x={x + bw / 2} y={H + 13} textAnchor="middle" className="vz-mock-lab">{m.label.slice(0, 7)}</text></g>;
              })}
            </svg>
            {last && <p className="vz-note">Latest: <b>{last.score}%</b> — {last.score >= target ? `${last.score - target} points above` : `${target - last.score} points below`} your target. Use the error log, not the score alone, to decide what to revise.</p>}
          </>
        )}
      </div>
      <p className="vz-note">Saved on this device only, per exam.</p>
    </Fig>
  );
}

export function ResourceSequence({ stream, exam }: { stream: StreamLike; exam: string }) {
  const hosts = stream.sources.map(u => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } });
  const stages = [
    { n: "Foundations", sub: "Know the syllabus", items: hosts, tone: "t-lav", note: "Official syllabus and notice pages" },
    { n: "Guided learning", sub: "Learn from teachers", items: [...stream.channels, ...stream.paid], tone: "t-mint", note: "Free channels and paid courses to compare" },
    { n: "Practice", sub: "Exam-style questions", items: ["Study plan phases 2–3"], tone: "t-peach", note: "Solve and log mistakes" },
    { n: "Revision", sub: "Close the gaps", items: ["Error log", "Weak topics within 48 hours"], tone: "t-blush", note: "Revision cycle" },
    { n: "Assessment", sub: "Test under real conditions", items: [`${exam} mock tests`, "Test series (compare terms first)"], tone: "t-blue", note: "Phase 4 of the plan" }
  ];
  return (
    <Fig className="vz-seq" title="Where each resource fits in your learning" desc={`Five learning stages in order: ${stages.map(s => s.n).join(", ")}. Resources for ${exam} are placed in the stage they help with.`}>
      <ol className="vz-flow">
        {stages.map((s, i) => (
          <li className="vz-flow-item" key={s.n}>
            <div className={`vz-flow-node ${s.tone}`}><small>{i + 1} · {s.n.toUpperCase()}</small><p><b>{s.sub}</b></p><Chips items={s.items} tone={s.tone} max={4} /><p className="vz-dim">{s.note}</p></div>
            {i < stages.length - 1 && <Arrow />}
          </li>
        ))}
      </ol>
    </Fig>
  );
}

/* ---------- 7. After Class 12 ---------- */

export function DecisionTree({ marks, degree, location, autonomy }: { marks: string; degree: string; location: string; autonomy: string }) {
  const m = Math.max(0, Math.min(100, Number(marks) || 0));
  const auto = autonomy === "autonomous" ? "Autonomous" : autonomy === "non-autonomous" ? "Affiliated / non-autonomous" : "Both types";
  return (
    <Fig className="vz-dtree" title="Decision tree: your inputs → shortlist" desc={`Your marks ${marks || "not entered"} percent, degree ${degree}, location ${location || "not set"}, autonomy preference ${auto}. Each step narrows the colleges you research.`}>
      <ol className="vz-vflow">
        <li><div className="vz-vnode t-lav"><small>1 · MARKS</small><b>{marks ? `${marks}%` : "Not entered"}</b><span className="vz-meter" aria-hidden="true"><span style={{ width: `${m}%` }} /></span><p>Marks are compared with the official cutoffs for your exam, category, quota and round. There is no universal threshold.</p></div></li>
        <li><div className="vz-vnode t-blue"><small>2 · SUBJECT ELIGIBILITY</small><b>Subjects needed for {degree}</b><p>Check the brochure for required subjects and the entrance exam for this degree.</p></div></li>
        <li><div className="vz-vnode t-mint"><small>3 · DEGREE PREFERENCE</small><b>{degree}</b></div></li>
        <li><div className="vz-vnode t-peach"><small>4 · LOCATION</small><b>{location || "Location not set"}</b><p>Travel, hostel cost and local counselling seats.</p></div></li>
        <li>
          <div className="vz-vnode t-blush"><small>5 · COLLEGE AUTONOMY</small><b>{auto}</b>
            <span className="vz-split">
              <span className={autonomy !== "non-autonomous" ? "on" : ""}>Autonomous</span>
              <span className={autonomy !== "autonomous" ? "on" : ""}>Affiliated</span>
            </span>
          </div>
        </li>
        <li><div className="vz-vnode strong t-lav"><small>RESULT</small><b>A verified shortlist: preferred · realistic · backup</b><p>Built from official cutoff evidence, not from rankings alone.</p></div></li>
      </ol>
    </Fig>
  );
}

export function AdmissionFunnel() {
  const layers = ["All courses and colleges", "Courses matching your degree", "Eligible by subjects, marks and entrance score", "Within your location and budget", "Matching your autonomy preference", "Verified shortlist of three"];
  return (
    <Fig className="vz-funnel" title="College-selection funnel" desc={`Narrowing in order: ${layers.join(", then ")}. Widths are illustrative, not real counts.`}>
      <ol className="vz-funnel-list">{layers.map((l, i) => <li key={l} className={tones[i % tones.length]} style={{ width: `${100 - i * 11}%` }}>{l}</li>)}</ol>
      <p className="vz-note">Bar widths show the idea of narrowing only. They are not numbers of colleges.</p>
    </Fig>
  );
}

export function AdmissionFlow() {
  const steps = ["Read the brochure", "Register for counselling", "Upload and verify documents", "Fill choices in true order", "Check each allotment round", "Pay seat fee and report", "Recheck later rounds"];
  return (
    <Fig className="vz-admflow" title="Admission process flowchart" desc={`Seven steps: ${steps.join(", ")}. The full explanation is in the step-by-step guide.`}>
      <ol className="vz-flow compact">
        {steps.map((t, i) => <li className="vz-flow-item" key={t}><div className={`vz-flow-node ${tones[i % tones.length]}`}><small>STEP {i + 1}</small><b>{t}</b><span className="vz-badge date">Dates: official notice</span></div>{i < steps.length - 1 && <Arrow />}</li>)}
      </ol>
      <p className="vz-note">PathWise does not store counselling dates. Each step’s deadline comes from the current official schedule.</p>
    </Fig>
  );
}

export function CapRounds() {
  return (
    <Fig className="vz-cap" title="How counselling rounds work" desc="After each allotment round you decide: accept and report, keep the seat while trying for something better if that authority allows it, or not accept. Then the next round or vacancy round follows. Rules differ by authority.">
      <div className="vz-cap-flow">
        <div className="vz-cap-node t-lav"><small>ROUND</small><b>Seat allotment published</b></div>
        <Arrow />
        <div className="vz-cap-choices">
          <div className="vz-cap-node t-mint"><b>Accept and report</b><small>Pay the seat fee and report as instructed</small></div>
          <div className="vz-cap-node t-peach"><b>Keep trying for a better choice</b><small>Only if this authority offers it (for example freeze / float / betterment options)</small></div>
          <div className="vz-cap-node t-blush"><b>Do not accept</b><small>Check the consequences in this year’s rules first</small></div>
        </div>
        <Arrow />
        <div className="vz-cap-node t-blue"><small>NEXT</small><b>Next round, vacancy or special rounds</b></div>
      </div>
      <p className="vz-note">Terms and consequences differ between State CET Cell CAP, JoSAA and CSAB. Read the current brochure before choosing.</p>
    </Fig>
  );
}

const evidenceRows: { what: string; where: ReactNode; kind: "official" | "historical" | "estimate" | "none"; status: string }[] = [
  { what: "Course fees", where: "College site and admission-authority fee notice", kind: "none", status: "Not stored in PathWise" },
  { what: "Cutoffs / closing ranks", where: <><a href="https://cetcell.mahacet.org/" target="_blank" rel="noreferrer">CET Cell</a> · <a href="https://josaa.nic.in/" target="_blank" rel="noreferrer">JoSAA</a> · <a href="https://csab.nic.in/" target="_blank" rel="noreferrer">CSAB</a></>, kind: "historical", status: "Not stored; match year, round, category, quota" },
  { what: "Institution rankings", where: <a href="https://www.nirfindia.org/" target="_blank" rel="noreferrer">NIRF</a>, kind: "official", status: "Link only; context, not branch quality" },
  { what: "Approval / recognition", where: <><a href="https://www.aicte-india.org/" target="_blank" rel="noreferrer">AICTE</a> · <a href="https://www.ugc.gov.in/" target="_blank" rel="noreferrer">UGC</a></>, kind: "official", status: "Link only" },
  { what: "Placements", where: "College placement report (eligible vs placed, report year)", kind: "none", status: "Not stored in PathWise" },
  { what: "Scholarships", where: <a href="https://scholarships.gov.in/" target="_blank" rel="noreferrer">National Scholarship Portal</a>, kind: "official", status: "Link only; deadlines change" },
  { what: "Study hours per day", where: "PathWise starting-point guidance", kind: "estimate", status: "Estimate, not a prediction" }
];
const kindLabel = { official: "Official source", historical: "Historical data", estimate: "Estimate", none: "Unavailable here" };

export function EvidenceMatrix() {
  return (
    <Fig className="vz-evidence" title="What PathWise can and cannot show" desc="A table of college-decision facts, where to verify each one, and whether PathWise holds the data. PathWise never invents fees, cutoffs, rankings or placement numbers.">
      <Legend items={[{ tone: "t-mint", label: "Official source" }, { tone: "t-blue", label: "Historical data" }, { tone: "t-peach", label: "Estimate" }, { tone: "t-lav", label: "Unavailable here" }]} />
      <div className="vz-table-wrap">
        <table className="vz-table">
          <thead><tr><th scope="col">Fact</th><th scope="col">Where to verify</th><th scope="col">Type</th><th scope="col">In PathWise</th></tr></thead>
          <tbody>
            {evidenceRows.map(r => <tr key={r.what}><th scope="row">{r.what}</th><td>{r.where}</td><td><span className={`vz-badge ${r.kind}`}>{kindLabel[r.kind]}</span></td><td>{r.status}</td></tr>)}
          </tbody>
        </table>
      </div>
    </Fig>
  );
}

/* ---------- 8. Dashboard, counsellor and recommendations ---------- */

function Ring({ value, total, label, tone }: { value: number; total: number; label: string; tone: string }) {
  const C = 2 * Math.PI * 24, frac = total ? value / total : 0;
  return (
    <div className={`vz-ring-card ${tone}`} role="img" aria-label={`${label}: ${value} of ${total}`}>
      <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><circle cx="32" cy="32" r="24" className="vz-ring-bg" /><circle cx="32" cy="32" r="24" className="vz-ring-fg" strokeDasharray={`${C * frac} ${C}`} transform="rotate(-90 32 32)" /><text x="32" y="36" textAnchor="middle">{value}/{total}</text></svg>
      <small>{label}</small>
    </div>
  );
}

export function JourneyProgress({ answered, totalQuestions, done, totalTasks, picked }: { answered: number; totalQuestions: number; done: number; totalTasks: number; picked: number }) {
  return (
    <Fig className="vz-progress" title="Your journey so far" desc={`${answered} of ${totalQuestions} questions answered, ${done} of ${totalTasks} actions done, ${picked} of 2 pathways picked for comparison.`}>
      <div className="vz-rings"><Ring value={answered} total={totalQuestions} label="Questions answered" tone="t-lav" /><Ring value={done} total={totalTasks} label="Actions done" tone="t-mint" /><Ring value={picked} total={2} label="Picked to compare" tone="t-peach" /></div>
    </Fig>
  );
}

export function TaskTimeline({ tasks, done }: { tasks: { id: string; title: string; when: string }[]; done: string[] }) {
  return (
    <Fig className="vz-tasks" title="Your action path" desc={`Actions in order: ${tasks.map(t => `${t.title} (${t.when}${done.includes(t.id) ? ", done" : ""})`).join("; ")}.`}>
      <ol className="vz-tl h">
        {tasks.map((t, i) => <li key={t.id} className={done.includes(t.id) ? "t-mint done" : i === tasks.findIndex(x => !done.includes(x.id)) ? "t-lav now" : "t-faint"}><span className="vz-tl-dot">{done.includes(t.id) ? <Check size={13} aria-label="done" /> : i + 1}</span><span><b>{t.title}</b><small>{t.when}</small></span></li>)}
      </ol>
    </Fig>
  );
}

export function ReasoningChain({ items, onOpen }: { items: { p: Pathway; signals: string[] }[]; onOpen: (p: Pathway) => void }) {
  const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };
  return (
    <Fig className="vz-reason" title="Why these careers were suggested" desc="For each suggestion: what you told us, the qualification it needs, a possible route, and the first thing to check.">
      <Legend items={[{ tone: "t-lav", label: "From your answers" }, { tone: "t-peach", label: "General guidance from the catalogue" }, { tone: "t-mint", label: "Verify at an official source" }]} />
      {items.length === 0 ? <p className="vz-dim">Answer a few questions and the reasoning appears here.</p> : items.map(({ p, signals }) => (
        <div className="vz-chain" key={p.id}>
          <b className="vz-chain-title">{p.title}</b>
          <ol className="vz-flow compact">
            <li className="vz-flow-item"><div className="vz-flow-node t-lav"><small>YOU TOLD US</small>{signals.length ? <Chips items={signals} tone="t-lav" max={4} /> : <span className="vz-dim">Matched on your overall profile</span>}</div><Arrow /></li>
            <li className="vz-flow-item"><div className="vz-flow-node t-peach"><small>QUALIFICATION</small><p>{p.qualification}</p></div><Arrow /></li>
            <li className="vz-flow-item"><div className="vz-flow-node t-peach"><small>POSSIBLE ROUTE</small><p>{p.typical_entry}</p></div><Arrow /></li>
            <li className="vz-flow-item"><div className="vz-flow-node t-mint"><small>NEXT STEP — VERIFY</small><p>{p.next_steps[0] || "Check the official notice."}</p>{p.source_urls[0] && <a href={p.source_urls[0]} target="_blank" rel="noreferrer">{host(p.source_urls[0])} <ExternalLink size={11} aria-hidden="true" /></a>}</div></li>
          </ol>
          <button type="button" className="vz-link" onClick={() => onOpen(p)}>Open full roadmap <ArrowRight size={13} aria-hidden="true" /></button>
        </div>
      ))}
      <p className="vz-note">Suggestions are starting points matched from your answers. They are not predictions or guarantees.</p>
    </Fig>
  );
}

export function EvidenceBadge({ sourceUrl, mode }: { sourceUrl?: string; mode: "demo" | "live" | "error" }) {
  if (sourceUrl && mode === "live") return <span className="vz-badge official"><BadgeCheck size={12} aria-hidden="true" /> Source-backed</span>;
  if (sourceUrl) return <span className="vz-badge estimate"><ShieldCheck size={12} aria-hidden="true" /> Demo guidance · verify at source</span>;
  return <span className="vz-badge none">General guidance · no source</span>;
}

export function PlanFlow({ steps, done, mode, resultCount }: { steps: { title: string }[]; done: boolean[]; mode: "demo" | "live" | "error"; resultCount: number }) {
  const nDone = done.filter(Boolean).length;
  return (
    <Fig className="vz-planflow" title="How this plan was built" desc={`Your answers and search lead to ${resultCount} source pages and ${steps.length} ordered steps. ${nDone} steps are ticked. Mode: ${mode === "live" ? "live sources" : "demo guidance"}.`}>
      <Legend items={[{ tone: "t-mint", label: "Source-backed (live)" }, { tone: "t-peach", label: "Demo guidance, verify at source" }, { tone: "t-lav", label: "General guidance" }]} />
      <ol className="vz-flow compact">
        <li className="vz-flow-item"><div className="vz-flow-node t-lav"><small>INPUT</small><b>Your answers</b></div><Arrow /></li>
        <li className="vz-flow-item"><div className="vz-flow-node t-blue"><small>{mode === "live" ? "LIVE SEARCH" : "DEMO SOURCES"}</small><b>{resultCount} source pages</b></div><Arrow /></li>
        <li className="vz-flow-item"><div className="vz-flow-node t-peach"><small>PLAN</small><b>{steps.length} ordered steps</b></div><Arrow /></li>
        <li className="vz-flow-item"><div className="vz-flow-node t-mint"><small>YOU</small><b>{nDone} of {steps.length} ticked</b></div></li>
      </ol>
    </Fig>
  );
}
