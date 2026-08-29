import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { query } = await req.json().catch(() => ({ query: "" }));

    const apiKey = Deno.env.get("GIPHY_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "GIPHY_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Empty/missing query -> trending, otherwise search. Keeps the API key
    // server-side only; the browser never sees it.
    const trimmed = (query || "").trim();
    const url = trimmed
      ? `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(trimmed)}&limit=24&rating=pg-13`
      : `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=24&rating=pg-13`;

    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      console.error("giphy-proxy: GIPHY API error:", data);
      return new Response(JSON.stringify({ error: data?.meta?.msg || "GIPHY request failed" }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return only what the picker renders, not GIPHY's full payload
    // (analytics ids, rendition variants we don't use, etc.)
    const gifs = (data.data || [])
      .map((g: any) => ({
        id: g.id,
        title: g.title || "GIF",
        previewUrl: g.images?.fixed_width_small?.url || g.images?.fixed_width?.url,
        fullUrl: g.images?.fixed_width?.url || g.images?.original?.url,
      }))
      .filter((g: any) => g.previewUrl && g.fullUrl);

    return new Response(JSON.stringify({ gifs }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("giphy-proxy error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
