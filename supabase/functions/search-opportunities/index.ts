import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { query } = await req.json();
    if (typeof query !== "string" || query.trim().length < 3 || query.length > 300) {
      return new Response(JSON.stringify({ error: "Enter a specific search of 3–300 characters." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const apiKey = Deno.env.get("TAVILY_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Live search is not configured yet. Add TAVILY_API_KEY as a Supabase secret." }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ query: query.trim(), topic: "general", search_depth: "basic", max_results: 10, include_answer: false }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.message ?? payload?.detail ?? "Search provider returned an error.");
    const results = (payload.results ?? []).map((item: { title?: string; content?: string; url?: string; score?: number; published_date?: string }) => ({
      title: item.title ?? "Untitled result", snippet: item.content ?? "", url: item.url ?? "", score: item.score, publishedDate: item.published_date
    })).filter((item: { url: string }) => item.url.startsWith("https://"));
    return new Response(JSON.stringify({ results, provider: "Tavily Search API", live: true, disclaimer: "Search results are leads, not verified facts. Confirm cutoffs, placement data and eligibility with the official college, regulator or exam authority." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unexpected search error." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
