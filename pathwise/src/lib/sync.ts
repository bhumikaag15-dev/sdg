import { supabase } from "./supabase";

// All functions no-op when Supabase isn't configured (demo mode keeps using localStorage).
export async function loadRemote(userId: string) {
  if (!supabase) return null;
  const [p, t, s] = await Promise.all([
    supabase.from("profiles").select("answers,step").eq("id", userId).maybeSingle(),
    supabase.from("progress").select("task_id").eq("user_id", userId),
    supabase.from("saved_pathways").select("pathway_id").eq("user_id", userId),
  ]);
  return {
    answers: (p.data?.answers ?? {}) as Record<string, unknown>,
    step: p.data?.step ?? 0,
    done: (t.data ?? []).map(r => r.task_id as string),
    saved: (s.data ?? []).map(r => r.pathway_id as string),
  };
}

export async function saveProfile(userId: string, answers: unknown, step: number) {
  if (!supabase) return;
  await supabase.from("profiles").upsert({ id: userId, answers, step });
}

export async function saveProgress(userId: string, done: string[]) {
  if (!supabase) return;
  await supabase.from("progress").delete().eq("user_id", userId);
  if (done.length) await supabase.from("progress").insert(done.map(task_id => ({ user_id: userId, task_id })));
}

export async function saveComparison(userId: string, pathwayIds: string[]) {
  if (!supabase || pathwayIds.length < 2) return;
  await supabase.from("comparisons").insert({ user_id: userId, pathway_ids: pathwayIds });
}

export async function saveSaved(userId: string, ids: string[]) {
  if (!supabase) return;
  await supabase.from("saved_pathways").delete().eq("user_id", userId);
  if (ids.length) await supabase.from("saved_pathways").insert(ids.map(pathway_id => ({ user_id: userId, pathway_id })));
}

export type Note = { id: string; kind: "reminder" | "date_changed"; remind_on: string; read_at: string | null; exam_dates: { exam: string; event: string; event_date: string; status: string } | null };
export async function loadNotifications(userId: string): Promise<Note[]> {
  if (!supabase) return [];
  const { data } = await supabase.from("notifications").select("id,kind,remind_on,read_at,exam_dates(exam,event,event_date,status)").eq("user_id", userId).order("remind_on", { ascending: false }).limit(20);
  return (data ?? []) as unknown as Note[];
}
export async function markNotificationsRead(userId: string) {
  if (!supabase) return;
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
}
