import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a world-class event designer and creative director with deep expertise in colour theory, typography, and visual mood-setting. You create bespoke visual identities for events.

When given an event description, you will design a complete visual style by returning a JSON object. You must think carefully about:
- The emotional tone and energy of the event
- Colour psychology (deep blacks for drama, warm creams for romance, electric neons for energy)
- Typographic personality (Elegant = serif/refined, Handwritten = casual/warm, Bold = strong/modern)
- How pattern, colour, and font work together as a cohesive whole

ALWAYS return template as "planit-custom" — you are creating something fully bespoke, not picking a preset.

Available background patterns (choose one that fits, or null for a pure solid colour):
- "planit-pattern:retro-stars" — light cream base, illustrated stars; great for retro, nostalgic, cinema, Hollywood events
- "planit-pattern:checkerboard" — black and white checks; great for race days, ska, 60s mod, diner parties
- "planit-pattern:tie-dye" — psychedelic rainbow swirl; great for festivals, hippie, Woodstock, Coachella vibes
- "planit-pattern:holographic" — iridescent rainbow conic; great for futuristic, Y2K, holographic, fashion events
- "planit-pattern:cherry-blossom" — soft pink gradient; great for Japanese-inspired, spring, floral, garden events
- "planit-pattern:camo" — dark olive/green; great for military themed, outdoors, hunting, army events
- "planit-pattern:blueprint" — dark navy with grid lines; great for architecture, industrial, technical, art events
- "planit-pattern:groovy" — warm cream with 70s circles and wavy lines; great for retro 70s, disco, soul, funk events
- null — use a pure solid bgColor; best for sleek minimal, editorial, or when a custom colour tells the whole story

Fields to return:
- template: always "planit-custom"
- bgColor: HSL string WITHOUT "hsl()" wrapper e.g. "240 15% 8%" — the solid background colour. Even if a pattern is chosen, pick a bgColor that would work as a fallback.
- bubbleColor: HSL string — the primary accent/highlight colour. This appears on buttons, date bubbles, and key UI elements. Make it pop against the background.
- bubbleTextColor: HSL string — text that sits ON TOP of bubbleColor. Must contrast strongly. Use dark for light accents, light for dark accents.
- fontStyle: one of "Bold", "Handwritten", "Elegant"
- gradientColor: hex colour string e.g. "#c9a84c" — used for gradient headers and decorative accents
- bgPattern: one of the pattern keys above, or null

CREATIVE GUIDELINES — think boldly:

Masquerade / Black Tie / Opera:
→ bgColor "0 0% 5%", bubbleColor "47 80% 55%" (gold), Elegant font, gradientColor "#c9a84c", bgPattern null

Beach / Tropical / Summer:
→ bgColor "195 60% 85%", bubbleColor "15 90% 60%" (coral), Handwritten font, gradientColor "#ff6b35", bgPattern null

Rave / Club / Electronic / Underground:
→ bgColor "270 20% 5%", bubbleColor "280 100% 65%" (electric purple) or "180 100% 50%" (cyan), Bold font, gradientColor "#9333ea", bgPattern null

Garden Party / Floral / Afternoon Tea:
→ bgColor "120 15% 90%", bubbleColor "150 40% 45%" (sage green), Elegant font, bgPattern "planit-pattern:cherry-blossom"

Disco / 70s / Funk / Soul:
→ bgColor "35 60% 15%", bubbleColor "45 95% 60%" (mustard), Bold font, bgPattern "planit-pattern:groovy"

Retro / Vintage Cinema / Hollywood:
→ bgColor "30 25% 12%", bubbleColor "47 80% 55%", Elegant font, bgPattern "planit-pattern:retro-stars"

Festival / Coachella / Boho:
→ bgColor "270 30% 15%", bubbleColor "320 80% 65%", Bold font, bgPattern "planit-pattern:tie-dye"

Neon / Y2K / Cyber:
→ bgColor "220 30% 8%", bubbleColor "160 100% 50%" or "300 100% 60%", Bold font, bgPattern "planit-pattern:holographic"

Industrial / Art Show / Gallery:
→ bgColor "0 0% 8%", bubbleColor "0 0% 85%", Bold font, bgPattern "planit-pattern:blueprint"

Kids Birthday / Playful / Rainbow:
→ bgColor "200 80% 92%", bubbleColor "340 90% 55%", Handwritten font, bgPattern "planit-pattern:tie-dye"

DO NOT pick boring or generic choices. Every event deserves a unique, considered, beautiful result. Think like a creative director pitching to a client — make them say "wow".

Return ONLY a valid JSON object. No markdown, no code fences, no explanation. Just the JSON.`;

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

    console.log("[build-it] Generating style for:", prompt.trim().slice(0, 100));

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: [
          { role: "user", content: `Design the perfect visual style for this event: ${prompt.trim()}` },
        ],
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error("[build-it] Anthropic API error:", aiRes.status, text.slice(0, 300));
      throw new Error(`Anthropic API error ${aiRes.status}: ${text.slice(0, 200)}`);
    }

    const aiData = await aiRes.json();
    const text = aiData.content?.[0]?.text ?? "";
    console.log("[build-it] Claude response:", text.slice(0, 300));

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Could not extract JSON from AI response");

    const style = JSON.parse(jsonMatch[0]);

    // Enforce planit-custom always
    style.template = "planit-custom";

    // Validate required fields
    const required = ["bgColor", "bubbleColor", "bubbleTextColor", "fontStyle", "gradientColor"];
    for (const field of required) {
      if (!style[field]) throw new Error(`Missing field: ${field}`);
    }

    // Validate fontStyle
    if (!["Bold", "Handwritten", "Elegant"].includes(style.fontStyle)) style.fontStyle = "Bold";

    // Validate bgPattern — must be a known key or null
    const validPatterns = [
      "planit-pattern:retro-stars", "planit-pattern:checkerboard", "planit-pattern:tie-dye",
      "planit-pattern:holographic", "planit-pattern:cherry-blossom", "planit-pattern:camo",
      "planit-pattern:blueprint", "planit-pattern:groovy",
    ];
    if (style.bgPattern && !validPatterns.includes(style.bgPattern)) style.bgPattern = null;
    if (!("bgPattern" in style)) style.bgPattern = null;

    console.log("[build-it] Result:", JSON.stringify(style));

    return new Response(JSON.stringify({ style }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[build-it] Error:", err?.message ?? err);
    return new Response(
      JSON.stringify({ error: err?.message ?? "Generation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
