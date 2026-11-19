import { supabase } from "./supabase";

export type OpportunityResult = { title: string; snippet: string; url: string; displayLink?: string };

/** Live search requires the deployed Supabase Edge Function and Google Custom Search API credentials. */
export async function searchOpportunities(query: string): Promise<OpportunityResult[]> {
  if (!supabase) throw new Error("Connect Supabase first to enable live opportunity search.");
  const { data, error } = await supabase.functions.invoke("search-opportunities", { body: { query } });
  if (error) throw new Error(error.message || "Opportunity search failed.");
  return (data?.results ?? []) as OpportunityResult[];
}
