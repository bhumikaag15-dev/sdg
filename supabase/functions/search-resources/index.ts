import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const body = await req.json();
    const topic = typeof body.topic === "string" ? body.topic.trim().slice(0, 180) : "";
    if (!topic) {
      return new Response(JSON.stringify({ error: "A topic is required." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const apiKey = Deno.env.get("YOUTUBE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ videos: [], notice: "YOUTUBE_API_KEY is not configured. The frontend will show search links." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("type", "video");
    url.searchParams.set("maxResults", "8");
    url.searchParams.set("safeSearch", "strict");
    url.searchParams.set("q", topic);
    url.searchParams.set("key", apiKey);

    const ytResponse = await fetch(url);
    const ytData = await ytResponse.json();
    if (!ytResponse.ok) {
      return new Response(JSON.stringify({ error: "YouTube API request failed.", details: ytData?.error?.message ?? "Unknown API error" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const videos = (ytData.items ?? []).map((item: any) => ({
      id: item.id?.videoId ?? crypto.randomUUID(),
      title: item.snippet?.title ?? "Untitled video",
      description: item.snippet?.description ?? "",
      channelTitle: item.snippet?.channelTitle ?? "YouTube",
      thumbnail: item.snippet?.thumbnails?.medium?.url ?? item.snippet?.thumbnails?.default?.url ?? "",
      url: `https://www.youtube.com/watch?v=${item.id?.videoId}`,
    }));

    return new Response(JSON.stringify({ videos }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request." }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
