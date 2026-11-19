import type { Pathway } from "../types";

type Item = { p: Pathway; score: number };

/** One chart of the careers that match the survey answers, ranked by how many answers they match. */
export default function SuggestedChart({ items, onOpen, onEdit }: { items: Item[]; onOpen: (p: Pathway) => void; onEdit: () => void }) {
  const shown = items.filter(i => i.score > 0);
  if (!shown.length) return null;
  const max = Math.max(...shown.map(i => i.score));
  return (
    <section className="sc-chart" aria-label="Careers matching your answers">
      <div className="sc-head"><h2>Careers matching your answers</h2><button className="secondary" onClick={onEdit}>Edit answers</button></div>
      <ol>
        {shown.map(({ p, score }) => (
          <li key={p.id}>
            <button onClick={() => onOpen(p)}>
              <span className="sc-name">{p.title}<small>{p.field}</small></span>
              <span className="sc-track"><span style={{ width: `${Math.max(8, (score / max) * 100)}%` }} /></span>
              <span className="sc-score">{score} {score === 1 ? "match" : "matches"}</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
