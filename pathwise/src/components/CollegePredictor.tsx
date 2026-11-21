import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Search } from "lucide-react";
import { EXAMS } from "../lib/exams";
import { BASES, BASE_LABEL, BRANCHES, COLLEGE_TYPES, EMPTY_PROFILE, cityList, loadCutoffs, predict, type Bucket, type CutoffData, type Profile, type Result } from "../lib/cutoffs";
import "../predictor.css";

const STEPS = ["Exam & Score", "Personal Details", "Course Preferences", "Location & Review"];
const BUCKETS: { id: Bucket; title: string; note: string; tone: string }[] = [
  { id: "likely", title: "Safe", note: "Your percentile is at or above last year’s CAP 1 closing percentile.", tone: "safe" },
  { id: "possible", title: "Moderate", note: "Below the CAP 1 closing percentile, but within the range of later rounds.", tone: "mod" },
  { id: "close", title: "Ambitious", note: "Slightly below last year’s lowest closing percentile.", tone: "amb" },
];
type Sort = "cutoff-desc" | "cutoff-asc" | "name";
const cutoffOf = (r: Result) => r.best.cap1 ?? r.best.low;
const KEY = "pathwise-predictor";
const toggle = (a: string[], v: string) => (a.includes(v) ? a.filter(x => x !== v) : [...a, v]);

export default function CollegePredictor() {
  const [p, setP] = useState<Profile>(() => { try { return { ...EMPTY_PROFILE, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return EMPTY_PROFILE; } });
  const [step, setStep] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [data, setData] = useState<CutoffData | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<Record<Bucket, number>>({ likely: 30, possible: 30, close: 30 });
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("cutoff-desc");
  const [view, setView] = useState<"all" | Bucket>("all");
  const set = (patch: Partial<Profile>) => setP(prev => { const n = { ...prev, ...patch }; localStorage.setItem(KEY, JSON.stringify(n)); return n; });

  useEffect(() => { setData(null); setError(""); loadCutoffs(p.exam).then(setData).catch(e => setError(e.message)); }, [p.exam]);
  const cities = useMemo(() => (data ? cityList(data).slice(0, 40) : []), [data]);
  const results = useMemo(() => (data && showResults ? predict(data, p) : []), [data, p, showResults]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? results.filter(r => (r.college + " " + r.city + " " + r.course + " " + r.dte).toLowerCase().includes(q)) : results.slice();
    return list.sort((a, b) => sort === "name" ? a.college.localeCompare(b.college) : sort === "cutoff-asc" ? cutoffOf(a) - cutoffOf(b) : cutoffOf(b) - cutoffOf(a));
  }, [results, query, sort]);
  const counts = useMemo(() => ({ likely: results.filter(r => r.bucket === "likely").length, possible: results.filter(r => r.bucket === "possible").length, close: results.filter(r => r.bucket === "close").length }), [results]);
  const valid = step !== 0 || (p.percentile !== null && p.percentile >= 0 && p.percentile <= 100);
  const years = data ? `${data.years[0]}–${data.years[data.years.length - 1]}` : "";

  if (showResults) {
    return (
      <main className="pr-results-page">
        <div className="pr-results">
          <div className="pr-eyebrow">College predictor · {p.exam}</div>
          <h1>Colleges matching your <em>{p.percentile} percentile</em></h1>
          <section className="pr-summary" aria-label="Your submitted details">
            <dl>
              <div><dt>Examination</dt><dd>{p.exam}</dd></div>
              <div><dt>Percentile</dt><dd className="num">{p.percentile}</dd></div>
              <div><dt>Category</dt><dd>{BASE_LABEL[p.category]}{p.ews ? " · EWS" : ""}{p.tfws ? " · TFWS" : ""}</dd></div>
              <div><dt>Gender</dt><dd>{p.gender === "female" ? "Female" : p.gender === "male" ? "Male" : "Other"}</dd></div>
              <div><dt>Branches</dt><dd>{p.branches.length ? p.branches.map(b => BRANCHES.find(x => x.id === b)?.label).join(", ") : "All"}</dd></div>
              <div><dt>Cities</dt><dd>{p.cities.length ? p.cities.join(", ") : "All"}</dd></div>
            </dl>
            <button className="pr-link" onClick={() => { setShowResults(false); setStep(0); }}>Edit details</button>
          </section>
          {!data && !error && <p className="pr-state">Loading cutoff data…</p>}
          {error && <p className="pr-error">{error}</p>}
          {data && (
            <>
              <div className="pr-stats">
                {BUCKETS.map(b => (
                  <button key={b.id} className={`pr-stat ${b.tone} ${view === b.id ? "on" : ""}`} aria-pressed={view === b.id} onClick={() => setView(view === b.id ? "all" : b.id)}>
                    <span className="num">{counts[b.id]}</span><b>{b.title}</b><small>{b.note}</small>
                  </button>
                ))}
              </div>
              <div className="pr-toolbar">
                <label className="pr-search"><Search size={16} aria-hidden="true" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search college, city or course" aria-label="Search results" /></label>
                <label className="pr-sort">Sort by
                  <select value={sort} onChange={e => setSort(e.target.value as Sort)}>
                    <option value="cutoff-desc">Cutoff: high to low</option>
                    <option value="cutoff-asc">Cutoff: low to high</option>
                    <option value="name">College name</option>
                  </select>
                </label>
                <span className="pr-count num">{(view === "all" ? shown : shown.filter(r => r.bucket === view)).length} of {results.length} shown</span>
              </div>
              {!results.length && <p className="pr-state">No colleges found for these filters. Try fewer branch, type or city filters.</p>}
              {BUCKETS.filter(b => view === "all" || view === b.id).map(b => {
                const list = shown.filter(r => r.bucket === b.id);
                if (!list.length) return null;
                return (
                  <section key={b.id} className={`pr-bucket ${b.tone}`}>
                    <h2><span className="pr-dot" aria-hidden="true" />{b.title} <span className="num">{list.length}</span></h2>
                    <p className="pr-bucket-note">{b.note}</p>
                    <div className="pr-list">{list.slice(0, open[b.id]).map(r => <Row key={r.choice} r={r} />)}</div>
                    {list.length > open[b.id] && <button className="pr-more" onClick={() => setOpen({ ...open, [b.id]: open[b.id] + 30 })}>Show more</button>}
                  </section>
                );
              })}
              <p className="pr-foot">Source: CET Cell CAP cutoffs, {years}. Closing percentile of the last allotted candidate; past cutoffs do not guarantee admission.</p>
            </>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="pr-page">
      <aside className="pr-aside">
        <div className="pr-eyebrow">College predictor</div>
        <h1>Find the colleges you can get into.</h1>
        <p>Enter your exam score and preferences to see colleges whose past cutoffs match.</p>
      </aside>
      <section className="pr-main">
        <ol className="pr-steps">
          {STEPS.map((s, i) => (
            <li key={s} className={i === step ? "on" : i < step ? "done" : ""}><span>{i < step ? <Check size={15} /> : i + 1}</span>{s}</li>
          ))}
        </ol>
        <div className="pr-card">
          <div className="pr-eyebrow">Step {step + 1} of 4</div><div className="pr-progress" aria-hidden="true"><span style={{ width: `${(step + 1) * 25}%` }} /></div>
          {step === 0 && <>
            <h2>Examination details</h2>
            <label className="pr-label">Entrance examination <em className="req">Required</em></label>
            <div className="pr-exams">
              {EXAMS.map(e => (
                <button key={e.id} disabled={!e.ready} className={p.exam === e.id ? "sel" : ""} onClick={() => set({ exam: e.id })}>
                  <b>{e.label}</b><small>{e.ready ? e.full : "Coming soon"}</small>
                </button>
              ))}
            </div>
            <label className="pr-label" htmlFor="pct">Your percentile <em className="req">Required</em></label>
            <input id="pct" className="pr-input" type="number" min={0} max={100} step="0.01" value={p.percentile ?? ""} placeholder="e.g. 92.47" onChange={e => set({ percentile: e.target.value === "" ? null : Number(e.target.value) })} />
          </>}
          {step === 1 && <>
            <h2>Personal details</h2>
            <label className="pr-label" htmlFor="cat">Category <em className="req">Required</em></label>
            <select id="cat" className="pr-input" value={p.category} onChange={e => set({ category: e.target.value as Profile["category"] })}>
              {BASES.map(b => <option key={b} value={b}>{BASE_LABEL[b]}</option>)}
            </select>
            <label className="pr-label">Gender <em className="req">Required</em></label>
            <div className="pr-seg">
              {(["male", "female", "other"] as const).map(g => <button key={g} className={p.gender === g ? "sel" : ""} onClick={() => set({ gender: g })}>{g[0].toUpperCase() + g.slice(1)}</button>)}
            </div>
            <label className="pr-label">Also applicable <em className="opt">Optional</em></label>
            <div className="pr-pills">
              <button className={p.ews ? "sel" : ""} onClick={() => set({ ews: !p.ews })}>EWS certificate</button>
              <button className={p.tfws ? "sel" : ""} onClick={() => set({ tfws: !p.tfws })}>TFWS (fee waiver scheme)</button>
            </div>
          </>}
          {step === 2 && <>
            <h2>Course preferences</h2>
            <label className="pr-label">Branches <em className="opt">Optional · empty means all</em></label>
            <div className="pr-pills">{BRANCHES.map(b => <button key={b.id} className={p.branches.includes(b.id) ? "sel" : ""} onClick={() => set({ branches: toggle(p.branches, b.id) })}>{b.label}</button>)}</div>
            <label className="pr-label">College type <em className="opt">Optional · empty means all</em></label>
            <div className="pr-pills">{COLLEGE_TYPES.map(t => <button key={t.id} className={p.types.includes(t.id) ? "sel" : ""} onClick={() => set({ types: toggle(p.types, t.id) })}>{t.label}</button>)}</div>
          </>}
          {step === 3 && <>
            <h2>Location & review</h2>
            <label className="pr-label">Cities <em className="opt">Optional · empty means all</em></label>
            <div className="pr-pills">{cities.map(c => <button key={c} className={p.cities.includes(c) ? "sel" : ""} onClick={() => set({ cities: toggle(p.cities, c) })}>{c}</button>)}</div>
            <dl className="pr-review">
              <dt>Exam</dt><dd>{p.exam}</dd><dt>Percentile</dt><dd>{p.percentile}</dd>
              <dt>Category</dt><dd>{BASE_LABEL[p.category]}{p.gender === "female" ? ", female seats included" : ""}{p.ews ? ", EWS" : ""}{p.tfws ? ", TFWS" : ""}</dd>
            </dl>
          </>}
        </div>
        <div className="pr-nav">
          <button className="pr-back" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft size={16} /> Back</button>
          {step < 3
            ? <button className="pr-next" disabled={!valid} onClick={() => setStep(step + 1)}>Next: {STEPS[step + 1]} <ArrowRight size={16} /></button>
            : <button className="pr-next" disabled={!data} onClick={() => setShowResults(true)}>Show colleges <ArrowRight size={16} /></button>}
        </div>
      </section>
    </main>
  );
}

function Row({ r }: { r: Result }) {
  return (
    <article className="pr-row">
      <div className="pr-row-main">
        <h3>{r.college}</h3>
        <p className="pr-row-sub">{r.city ? r.city + " · " : ""}<span className="pr-code">DTE {r.dte}</span></p>
        <p className="pr-row-course">{r.course}</p>
        <p className="pr-row-meta">{r.status || "Status not listed"}{r.lastYear < 2024 ? ` · last data ${r.lastYear}` : ""}</p>
      </div>
      <div className="pr-num">
        <small>{r.best.cap1 !== null ? `CAP 1 closing · ${r.best.year}` : `Lowest closing · ${r.best.year}`}</small>
        <b className="num">{cutoffOf(r).toFixed(2)}</b>
        <small>{r.best.label}</small>
        {r.trend.length > 1 && <ul className="pr-trend" aria-label="Year-wise CAP 1 percentile">{r.trend.map(t => <li key={t.year}><span>{t.year}</span><b className="num">{t.cap1.toFixed(1)}</b></li>)}</ul>}
      </div>
    </article>
  );
}
