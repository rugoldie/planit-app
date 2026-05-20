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
    const body = await req.json().catch(() => ({}));
    const { prompt } = body;

    if (!prompt?.trim()) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const falApiKey = Deno.env.get("FAL_API_KEY");
    if (!falApiKey) {
      console.error("[generate-cover-art] FAL_API_KEY secret is not set");
      return new Response(JSON.stringify({ error: "FAL_API_KEY secret is not configured in Supabase" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fullPrompt = `${prompt.trim()}, event invitation background, beautiful, vibrant, no text, no words, no letters`;
    console.log("[generate-cover-art] Calling fal.ai with prompt:", fullPrompt.slice(0, 100));

    const falResponse = await fetch("https://fal.run/fal-ai/flux/schnell", {
      method: "POST",
      headers: {
        "Authorization": `Key ${falApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        image_size: "portrait_4_3",
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: false,
        sync_mode: true,
      }),
    });

    const falText = await falResponse.text();
    console.log("[generate-cover-art] fal.ai status:", falResponse.status);

    if (!falResponse.ok) {
      console.error("[generate-cover-art] fal.ai error body:", falText);
      return new Response(
        JSON.stringify({ error: `fal.ai returned ${falResponse.status}: ${falText.slice(0, 300)}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let falData: any;
    try {
      falData = JSON.parse(falText);
    } catch {
      console.error("[generate-cover-art] Could not parse fal.ai response:", falText.slice(0, 300));
      return new Response(
        JSON.stringify({ error: "Could not parse fal.ai response" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const imageUrl = falData.images?.[0]?.url;
    if (!imageUrl) {
      console.error("[generate-cover-art] No image URL in fal.ai response:", JSON.stringify(falData).slice(0, 300));
      return new Response(
        JSON.stringify({ error: "No image returned from fal.ai", detail: falData }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[generate-cover-art] Success, imageUrl:", imageUrl.slice(0, 80));
    return new Response(JSON.stringify({ imageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("[generate-cover-art] Unhandled error:", err?.message ?? err);
    return new Response(
      JSON.stringify({ error: err?.message ?? "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
