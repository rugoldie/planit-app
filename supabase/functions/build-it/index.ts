import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a world-class event designer. Generate a CSS background for an event invitation card.

Return a JSON object with these fields:
- template: always "planit-custom"
- bgColor: HSL string WITHOUT "hsl()" wrapper e.g. "240 15% 8%" — solid fallback colour
- bubbleColor: HSL string — vivid accent for date bubbles and buttons. Must pop against the background.
- bubbleTextColor: HSL string — text on top of bubbleColor. Dark for bright accents, light for dark accents.
- fontStyle: one of "Bold", "Handwritten", "Elegant"
- gradientColor: hex colour e.g. "#c9a84c" — for decorative accents
- customCSS: the full CSS background property value using ONLY gradients (no url, no SVG, no images)

CUSTOMCSS must be a single-line string. Layer 6-10 gradient values separated by commas:
1. Large soft elliptical radial-gradient blobs for atmospheric light and colour (e.g. radial-gradient(ellipse 80% 60% at 20% 30%, #c9a84c55 0%, transparent 100%))
2. repeating-linear-gradient for subtle textures — crosshatch at 45deg and -45deg at ~0.04 opacity for glitter, horizontal lines for retro, diagonal for silk
3. Small tight radial-gradient circles (2-5px via "circle 3px at X% Y%") scattered across the canvas — these create glitter, bokeh, stars, wildflowers
4. A rich linear-gradient base with at least 3 colour stops

Example patterns:

Disco/glitter: deep purple base, large pink/magenta glow blobs, 45deg+(-45deg) crosshatch at 0.04 opacity, 20 tiny white/gold glitter dots as "radial-gradient(circle 2px at X% Y%, #ffffffcc 0%, transparent 100%)", purple-to-black base sweep

Norfolk countryside: warm gold sun glow at top-right, 3 soft white cloud blobs in upper area, sky-blue-to-meadow-green linear sweep, 12 tiny pink/yellow wildflower dots near bottom

Masquerade/gold: near-black base, 3 deep amber/gold glow blobs, repeating diagonal gold texture at 0.05 opacity, 18 tiny gold glitter dots, warm black sweep

Beach/tropical: coral sun glow at top, aqua shimmer radials at bottom, sky-to-sea-to-sand sweep, 8 warm sparkle dots near horizon

Rave/underground: near-black base, electric cyan bottom-left glow, magenta top-right glow, subtle grid at 0.03 opacity, 10 bright bokeh dots

Rules:
- NEVER use url(), SVG, or images
- customCSS must be one continuous line (no newline characters)
- Use at least 6 comma-separated gradient values
- bubbleColor must contrast strongly against the background
- Make it visually stunning and unique for the specific event type

Return ONLY a valid JSON object. No markdown fences. No explanation. Just JSON.
The customCSS field must be a single line string with no embedded newlines or unescaped quotes.`;

// Robust JSON extraction that handles bare newlines inside string values
function extractJSON(raw: string): any {
  let s = raw.replace(/```(?:json)?/g, "").trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("Could not extract JSON from AI response");
  s = s.slice(start, end + 1);
  try { return JSON.parse(s); } catch {}
  // Walk character-by-character to escape bare newlines inside JSON string values
  let out = "";
  let inStr = false;
  let esc = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (esc) { out += ch; esc = false; continue; }
    if (ch === "\\") { out += ch; esc = true; continue; }
    if (ch === '"') { out += ch; inStr = !inStr; continue; }
    if (inStr && ch === "\n") { out += "\\n"; continue; }
    if (inStr && ch === "\r") continue;
    out += ch;
  }
  return JSON.parse(out);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log("[build-it] ===== REQUEST START =====");

  try {
    const body = await req.json().catch((e) => {
      console.error("[build-it] Failed to parse request body:", e.message);
      return {};
    });
    const { prompt } = body;

    if (!prompt?.trim()) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY is not configured." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("[build-it] Sending prompt to AI gateway");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Design the perfect visual style for this event: ${prompt.trim()}` },
        ],
      }),
    });

    console.log("[build-it] AI Gateway status:", aiRes.status);
    const rawText = await aiRes.text();

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to your workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI Gateway error ${aiRes.status}: ${rawText.slice(0, 200)}`);
    }

    const aiData = JSON.parse(rawText);
    const content: string = aiData.choices?.[0]?.message?.content ?? "";
    if (!content) throw new Error("AI returned empty content");

    console.log("[build-it] Raw AI content (first 400):", content.slice(0, 400));

    const style = extractJSON(content);
    style.template = "planit-custom";

    const required = ["bgColor", "bubbleColor", "bubbleTextColor", "fontStyle", "gradientColor", "customCSS"];
    for (const field of required) {
      if (!style[field]) throw new Error(`Missing field in AI response: ${field}`);
    }
    if (!["Bold", "Handwritten", "Elegant"].includes(style.fontStyle)) style.fontStyle = "Bold";

    // Fallback if customCSS is empty or not a string
    if (typeof style.customCSS !== "string" || !style.customCSS.trim()) {
      style.customCSS = `linear-gradient(135deg, hsl(${style.bgColor}) 0%, hsl(${style.bgColor}) 100%)`;
    }

    // Base64 encode the customCSS server-side so the client receives a
    // JSON-safe string — no comma/quote escaping issues in the CSS value.
    const customCSSB64 = btoa(style.customCSS);
    const { customCSS: _dropped, ...styleWithoutCSS } = style;
    const finalStyle = { ...styleWithoutCSS, customCSSB64 };

    console.log("[build-it] Final style (CSS b64 length:", customCSSB64.length, "):", JSON.stringify(styleWithoutCSS));
    console.log("[build-it] ===== REQUEST END (success) =====");

    return new Response(JSON.stringify({ style: finalStyle }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("[build-it] ERROR:", err?.message ?? String(err));
    return new Response(
      JSON.stringify({ error: err?.message ?? "Generation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
