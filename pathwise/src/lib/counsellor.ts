import { supabase } from "./supabase";
import type { OpportunityResult } from "./opportunities";

export type CounsellorStep = { title: string; why: string; action: string; evidence?: string; sourceUrl?: string; checkpoint: string };
export type CounsellorPlanResponse = { results: OpportunityResult[]; plan: CounsellorStep[]; live: boolean; provider: string; disclaimer: string };

/** Uses server-side web search + an LLM to build a grounded route. Secrets stay in Supabase Edge Function secrets. */
export async function generateCounsellorPlan(query: string, answers: Record<string, unknown>): Promise<CounsellorPlanResponse> {
  if (!supabase) throw new Error("Demo mode: connect Supabase and configure TAVILY_API_KEY and OPENAI_API_KEY to generate a live evidence-based plan.");
  const { data, error } = await supabase.functions.invoke("generate-counsellor-plan", { body: { query, answers } });
  if (error) throw new Error(error.message || "Counsellor plan generation failed.");
  if (!data?.plan || !Array.isArray(data.plan)) throw new Error(data?.error || "The counsellor service returned an incomplete plan.");
  return data as CounsellorPlanResponse;
}
