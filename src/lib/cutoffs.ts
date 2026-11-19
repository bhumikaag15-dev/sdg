import { EXAMS } from "./exams";

// Compact dataset built by scripts/cutoffs/build_static.py (stage "I" rows only).
// cut[choice] = [[levelIdx, catIdx, [yy, round, percentile, yy, round, percentile, ...]], ...]
export type CutoffData = {
  exam: string; years: number[]; cats: string[]; levels: string[];
  colleges: Record<string, [string, string]>;                       // dte_code -> [name, city]
  courses: Record<string, [string, string, string, string, number]>; // choice -> [dte, course, status, homeUniv, lastYear]
  cut: Record<string, [number, number, number[]][]>;
};

const cache = new Map<string, Promise<CutoffData>>();
export function loadCutoffs(exam: string): Promise<CutoffData> {
  const info = EXAMS.find(e => e.id === exam && e.ready);
  if (!info) return Promise.reject(new Error("No cutoff data for this exam yet"));
  if (!cache.has(exam)) cache.set(exam, fetch(`${import.meta.env.BASE_URL}data/${info.file}.json`).then(r => { if (!r.ok) throw new Error("Could not load cutoff data"); return r.json(); }));
  return cache.get(exam)!;
}

export const BASES = ["OPEN", "SC", "ST", "VJ", "NT1", "NT2", "NT3", "OBC", "SEBC"] as const;
export type Base = (typeof BASES)[number];
export const BASE_LABEL: Record<Base, string> = { OPEN: "Open / General", SC: "SC", ST: "ST", VJ: "VJ / DT", NT1: "NT-B (NT1)", NT2: "NT-C (NT2)", NT3: "NT-D (NT3)", OBC: "OBC", SEBC: "SEBC" };

export const BRANCHES: { id: string; label: string; test: RegExp }[] = [
  { id: "computer", label: "Computer, IT, AI & Data", test: /computer|information technology|artificial|data science|machine learning|cyber|software|internet of things|iot/i },
  { id: "electronics", label: "Electronics & Telecom", test: /electronics|telecommunication|instrumentation|vlsi|mechatronics/i },
  { id: "electrical", label: "Electrical", test: /electrical/i },
  { id: "mechanical", label: "Mechanical & Production", test: /mechanical|production|automobile|manufacturing|industrial/i },
  { id: "civil", label: "Civil & Environmental", test: /civil|construction|structural|environmental/i },
  { id: "chemical", label: "Chemical, Bio & Food", test: /chemical|petro|polymer|plastic|food|bio|textile|paint|oil/i },
];
export const COLLEGE_TYPES = [
  { id: "government", label: "Government", test: (s: string) => /^government/i.test(s) },
  { id: "autonomous", label: "Autonomous", test: (s: string) => /autonomous/i.test(s) },
  { id: "private", label: "Private (un-aided)", test: (s: string) => /un-aided/i.test(s) },
];

export type Profile = {
  exam: string; percentile: number | null; category: Base; gender: "male" | "female" | "other";
  ews: boolean; tfws: boolean; branches: string[]; types: string[]; cities: string[];
};
export const EMPTY_PROFILE: Profile = { exam: "MHT-CET", percentile: null, category: "OPEN", gender: "male", ews: false, tfws: false, branches: [], types: [], cities: [] };

export type Bucket = "likely" | "possible" | "close";
export type GroupResult = { label: string; bucket: Bucket | null; cap1: number | null; low: number; year: number };
export type Result = {
  choice: string; dte: string; college: string; city: string; course: string; status: string; lastYear: number;
  bucket: Bucket; best: GroupResult; groups: GroupResult[]; trend: { year: number; cap1: number }[];
};

const GROUPS = [
  { id: "STATE", label: "State level seats", scope: "S" },
  { id: "HU_SEATS_HU_CAND", label: "Home University seats", scope: "H" },
  { id: "OHU_SEATS_OHU_CAND", label: "Other-than-Home University seats", scope: "O" },
];
const RANK: Record<Bucket, number> = { likely: 3, possible: 2, close: 1 };
export const CLOSE_MARGIN = 3; // percentile points below the lowest closing value still shown as "close"

/** Pure database-style filtering over the cutoff table: no model, no weighting. */
export function predict(d: CutoffData, p: Profile): Result[] {
  if (p.percentile == null) return [];
  const pct = p.percentile;
  const levelIdx = new Map(d.levels.map((l, i) => [l, i]));
  const bases = p.category === "OPEN" ? ["OPEN"] : ["OPEN", p.category];
  const out: Result[] = [];
  for (const [choice, [dte, course, status, , lastYear]] of Object.entries(d.courses)) {
    const [college, city] = d.colleges[dte] ?? [dte, ""];
    if (p.branches.length && !BRANCHES.some(b => p.branches.includes(b.id) && b.test.test(course))) continue;
    if (p.types.length && !COLLEGE_TYPES.some(t => p.types.includes(t.id) && t.test(status))) continue;
    if (p.cities.length && !p.cities.includes(city)) continue;
    const series = d.cut[choice] ?? [];
    const groups: GroupResult[] = [];
    let trend: Result["trend"] = [];
    let best: GroupResult | null = null;
    for (const g of GROUPS) {
      const codes = new Set<string>();
      for (const b of bases) { codes.add(`G${b}${g.scope}`); if (p.gender === "female") codes.add(`L${b}${g.scope}`); }
      if (p.ews) codes.add("EWS");
      if (p.tfws) codes.add("TFWS");
      const byYR = new Map<number, number>(); // year*10+round -> lowest closing percentile over the student's categories
      for (const [l, k, flat] of series) {
        if (l !== levelIdx.get(g.id) || !codes.has(d.cats[k])) continue;
        for (let i = 0; i < flat.length; i += 3) {
          const key = flat[i] * 10 + flat[i + 1];
          byYR.set(key, Math.min(byYR.get(key) ?? Infinity, flat[i + 2]));
        }
      }
      if (!byYR.size) continue;
      const years = [...new Set([...byYR.keys()].map(k => Math.floor(k / 10)))].sort((a, b) => a - b);
      const ly = years[years.length - 1];
      const rounds = [1, 2, 3].map(r => byYR.get(ly * 10 + r)).filter((v): v is number => v !== undefined);
      const cap1 = byYR.get(ly * 10 + 1) ?? null;
      const low = Math.min(...rounds);
      const bucket: Bucket | null = cap1 !== null && pct >= cap1 ? "likely" : pct >= low ? "possible" : pct >= low - CLOSE_MARGIN ? "close" : null;
      const gr: GroupResult = { label: g.label, bucket, cap1, low, year: 2000 + ly };
      groups.push(gr);
      const better = !best || (bucket && (!best.bucket || RANK[bucket] > RANK[best.bucket] || (RANK[bucket] === RANK[best.bucket] && (cap1 ?? low) > (best.cap1 ?? best.low))));
      if (better) {
        best = gr;
        trend = years.map(y => ({ year: 2000 + y, cap1: byYR.get(y * 10 + 1) ?? Math.min(...[1, 2, 3].map(r => byYR.get(y * 10 + r) ?? Infinity)) }));
      }
    }
    if (best && best.bucket) out.push({ choice, dte, college, city, course, status, lastYear, bucket: best.bucket, best, groups, trend });
  }
  return out.sort((a, b) => (b.best.cap1 ?? b.best.low) - (a.best.cap1 ?? a.best.low));
}

export function cityList(d: CutoffData): string[] {
  const n = new Map<string, number>();
  for (const c of Object.keys(d.courses)) { const city = d.colleges[d.courses[c][0]]?.[1]; if (city) n.set(city, (n.get(city) ?? 0) + 1); }
  return [...n.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]);
}
