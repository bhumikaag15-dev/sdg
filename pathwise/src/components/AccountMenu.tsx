import { useState } from "react";
import { Bell } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "../lib/supabase";
import { signInWithEmail, signOut } from "../lib/auth";
import type { Note } from "../lib/sync";

const EVENT: Record<string, string> = { registration_opens: "Registration opens", registration_closes: "Registration closes", exam: "Exam", result: "Result", counselling: "Counselling" };

export default function AccountMenu({ user, notes, onOpenNotes }: { user: User | null; notes: Note[]; onOpenNotes: () => void }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState("");
  const [open, setOpen] = useState(false);
  if (!isSupabaseConfigured) return null; // demo mode: data stays in this browser
  const unread = notes.filter(n => !n.read_at).length;
  if (!user) {
    return (
      <form className="acct" onSubmit={async e => { e.preventDefault(); const { error } = await signInWithEmail(email); setSent(error ? error.message : "Check your email for the sign-in link"); }}>
        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="Email to sign in" aria-label="Email" />
        <button className="secondary" type="submit">Sign in</button>
        {sent && <small>{sent}</small>}
      </form>
    );
  }
  return (
    <div className="acct">
      <button className="secondary acct-bell" onClick={() => { setOpen(!open); if (!open) onOpenNotes(); }} aria-label="Exam reminders"><Bell size={15} />{unread > 0 && <b>{unread}</b>}</button>
      <span className="acct-mail">{user.email}</span>
      <button className="secondary" onClick={() => signOut()}>Sign out</button>
      {open && (
        <div className="acct-pop">
          {!notes.length && <p>No reminders yet. Save a career to get exam date reminders.</p>}
          {notes.map(n => n.exam_dates && (
            <p key={n.id}><b>{n.exam_dates.exam} · {EVENT[n.exam_dates.event] ?? n.exam_dates.event}</b><br />{n.exam_dates.event_date}{n.exam_dates.status === "tentative" ? " (tentative)" : ""}{n.kind === "date_changed" ? " · date changed" : ""}</p>
          ))}
        </div>
      )}
    </div>
  );
}
