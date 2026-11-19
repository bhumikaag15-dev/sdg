import { ExternalLink } from 'lucide-react';

type Props = { daily: string; entry: string; links: [string, string][]; skills: string[]; hard: string; checks: string[] };

const first = (t: string, max = 150) => {
  const m = t.match(/^.*?[.!?](\s|$)/);
  const s = (m ? m[0] : t).trim();
  return s.length > max ? s.slice(0, max).replace(/\s+\S*$/, '') + '…' : s;
};

const ROUTE = ['Check entry rules', 'Compare 3 institutions', 'Apply on official portal', 'Study + small projects', 'Portfolio + internships', 'First role, then specialise'];

export default function GuideFlow({ daily, entry, links, skills, hard, checks }: Props) {
  return (
    <ol className="gf" aria-label="Career path flowchart">
      <li className="gf-node gf-lav"><b>1. The work</b><p>{first(daily)}</p></li>
      <li className="gf-node gf-mint">
        <b>2. The route</b>
        <p>{first(entry, 120)}</p>
        <div className="gf-chain">{ROUTE.map((r, i) => <span key={r}>{r}{i < ROUTE.length - 1 && <i aria-hidden="true">→</i>}</span>)}</div>
      </li>
      <li className="gf-node gf-peach">
        <b>3. Exams and admission</b>
        <div className="gf-links">{links.map(([label, url]) => <a key={url} href={url} target="_blank" rel="noreferrer">{label} <ExternalLink size={12} /></a>)}</div>
      </li>
      <li className="gf-node gf-blue"><b>4. Build these</b><ul>{skills.slice(0, 3).map(s => <li key={s}>{s}</li>)}</ul></li>
      <li className="gf-node gf-pink"><b>5. Watch out for</b><p>{first(hard)}</p></li>
      <li className="gf-node gf-lav"><b>6. Check before committing</b><ul>{checks.slice(0, 2).map(s => <li key={s}>{s}</li>)}</ul></li>
    </ol>
  );
}
