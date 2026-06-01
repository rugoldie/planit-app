import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an event styling assistant for an event invitation app called Planit.

Based on the user's event description, return a JSON object that styles their invitation. Use these exact fields:

- template: one of "planit-noir", "vintage", "galaxy", "sunny", "midnight", "ocean", "blush", "forest", "planit-custom"
- bubbleColor: an HSL string like "82 100% 48%" (no "hsl()" wrapper) — the main accent/bubble colour
- bubbleTextColor: an HSL string like "0 0% 10%" that reads clearly on top of bubbleColor
- bgColor: an HSL string for the page background colour
- fontStyle: one of "Bold", "Handwritten", "Elegant"
- gradientColor: a hex colour like "#7c3aed" for gradient accents

Guidelines:
- planit-noir: dark/dramatic, green accent — good for sophisticated parties, galas, noir events
- vintage: warm cream background, brown tones — good for garden parties, weddings, rustic events
- galaxy: deep purple/space — good for futuristic, sci-fi, late night events
- sunny: orange/warm gradient — good for daytime, summer, outdoor, cheerful events
- midnight: black and white, minimal — good for formal, corporate, ultra-clean events
- ocean: dark navy, blue accent — good for beach, nautical, chill events
- blush: dark background, pink accent — good for birthdays, bachelorette, feminine events
- forest: dark green — good for nature, outdoor, camping, eco events
- planit-custom: rainbow/colourful — good for festivals, pride, wild eclectic events

Return ONLY a valid JSON object with no explanation, no markdown, no code fences.`;

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

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      console.error("[build-it] ANTHROPIC_API_KEY is not set");
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[build-it] Calling Claude for prompt:", prompt.trim().slice(0, 80));

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 256,
        system: SYSTEM_PROMPT,
        messages: [
          { role: "user", content: `Event description: ${prompt.trim()}` },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const text = await anthropicRes.text();
      console.error("[build-it] Anthropic API error:", anthropicRes.status, text.slice(0, 300));
      throw new Error(`Anthropic API error ${anthropicRes.status}: ${text.slice(0, 200)}`);
    }

    const anthropicData = await anthropicRes.json();
    const text = anthropicData.content?.[0]?.text ?? "";
    console.log("[build-it] Claude raw response:", text.slice(0, 200));

    // Extract JSON — Claude sometimes wraps in markdown fences
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not extract JSON from Claude response");
    }

    const style = JSON.parse(jsonMatch[0]);

    // Validate required fields
    const required = ["template", "bubbleColor", "bubbleTextColor", "bgColor", "fontStyle", "gradientColor"];
    for (const field of required) {
      if (!style[field]) throw new Error(`Missing field in Claude response: ${field}`);
    }

    // Ensure template is valid
    const validTemplates = ["planit-noir", "vintage", "galaxy", "sunny", "midnight", "ocean", "blush", "forest", "planit-custom"];
    if (!validTemplates.includes(style.template)) style.template = "planit-noir";

    // Ensure fontStyle is valid
    const validFonts = ["Bold", "Handwritten", "Elegant"];
    if (!validFonts.includes(style.fontStyle)) style.fontStyle = "Bold";

    console.log("[build-it] Success:", JSON.stringify(style));

    return new Response(JSON.stringify({ style }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[build-it] Unhandled error:", err?.message ?? err);
    return new Response(
      JSON.stringify({ error: err?.message ?? "Generation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
