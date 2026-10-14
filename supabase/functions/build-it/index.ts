import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// claude-3-5-sonnet-20241022 was retired on 2025-10-28 and now 404s, so this
// uses the current Opus generation instead. Opus-tier matters here: the whole
// value of this feature is design variety, which is exactly what the weaker/
// older models regress on.
const MODEL = "claude-opus-5";

const GENERATE_SYSTEM_PROMPT = `You are an elite creative web designer specialising in event pages for Gen Z. Your job is to generate a single self-contained HTML page for an event.

CRITICAL RULES:
- Return ONLY raw HTML. No markdown. No code blocks. No explanation. Just the HTML.
- The page must be fully self-contained — all CSS in a <style> tag, no external resources except Google Fonts
- Mobile-first, looks perfect on a phone screen
- Include the event name, date, location, and dress code prominently
- Make it immersive — the page should feel like the event itself

CREATIVITY RULES — this is the most important part:
- Every single page must feel like it was designed by a different human designer who truly understood this specific event
- Vary EVERYTHING: layout structure, background technique, typography choices, colour palette, use of space, how information is arranged
- Background techniques to choose from (pick what fits, invent others): pure CSS gradients layered in unexpected ways, geometric shapes and patterns, noise/grain textures, grid or dot patterns, illustrated SVG elements, starfields, scanlines, glassmorphism panels, bold colour blocks, halftone effects, duotone, collage-style layering, vignettes, radial bursts — never default to the same technique
- Typography: load a Google Font that matches the event's personality. A rave gets massive condensed uppercase. A dinner gets an elegant serif. A picnic gets something playful and rounded. A black tie event gets refined thin letterforms.
- Layout: vary where the title sits, how big it is, whether info is in cards or floating or overlaid, whether there's a hero section or it's full bleed, whether content is centred or offset
- Colour: derive the palette from the visual description. If they say "hot pink and black" — commit to it fully. If they say "summer vibes" — interpret creatively. Never use generic purple gradients as a fallback.
- Add at least one surprising creative detail that makes the page feel special — a subtle animation, an unexpected typographic treatment, a clever use of the event details as a design element
- The page should make the host feel proud to share it and guests excited to attend

ALWAYS INCLUDE on the page:
- Event name (prominently)
- Date and time
- Location
- Dress code (if provided)
- A visually distinct RSVP/join button

Do not include any JavaScript functionality — just the visual page.`;

const EDIT_SYSTEM_PROMPT =
  "You are an expert web designer. The user wants to edit their event page. Make exactly the change they describe and return the complete updated HTML. Keep everything else identical. Return only raw HTML, no markdown, no explanation.";

// A full creative page runs well past the old 2048 cap, and a whole HTML
// document echoed back through "edit" mode is larger still. Streaming keeps a
// long generation from tripping an idle-connection timeout mid-response.
const MAX_TOKENS = 16000;

/**
 * Streams a Messages API response and returns the concatenated text.
 *
 * Only `text` deltas are collected. On Opus 5 thinking is on by default and
 * `thinking.display` defaults to "omitted", so the response also carries
 * thinking blocks — reading `content[0].text` (as the previous version did)
 * would return an empty string as soon as a thinking block lands first.
 */
async function callClaude(apiKey: string, system: string, userText: string, effort: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
      // Server-side refusal fallback: if a safety classifier declines an
      // unusual event description, the API re-runs it on a fallback model
      // inside the same call instead of the host just seeing a failure.
      "anthropic-beta": "server-side-fallback-2026-07-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      stream: true,
      fallbacks: "default",
      // Thinking is adaptive by default on Opus 5; effort is the latency/
      // quality dial. Deliberately not disabling thinking — that regresses
      // instruction-following and can leak <thinking> tags into the output.
      output_config: { effort },
      system,
      messages: [{ role: "user", content: userText }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    if (res.status === 429) throw new Error("Rate limited by Anthropic. Please try again in a moment.");
    if (res.status === 401) throw new Error("ANTHROPIC_API_KEY is invalid.");
    throw new Error(`Anthropic API error ${res.status}: ${errText.slice(0, 300)}`);
  }
  if (!res.body) throw new Error("Anthropic returned an empty stream");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let out = "";
  let stopReason: string | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are newline-delimited; keep the trailing partial line.
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      let evt: any;
      try {
        evt = JSON.parse(payload);
      } catch {
        continue;
      }
      if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
        out += evt.delta.text ?? "";
      } else if (evt.type === "message_delta" && evt.delta?.stop_reason) {
        stopReason = evt.delta.stop_reason;
      } else if (evt.type === "error") {
        throw new Error(`Anthropic stream error: ${evt.error?.message ?? "unknown"}`);
      }
    }
  }

  if (stopReason === "refusal") throw new Error("The request was declined. Try describing your event differently.");
  if (stopReason === "max_tokens") {
    throw new Error("The page came back longer than the limit and was cut off. Try a simpler description.");
  }
  if (!out.trim()) throw new Error("Anthropic returned no HTML");
  return out;
}

/**
 * The prompts forbid markdown, but a stray ```html fence is the one failure
 * mode that would otherwise render as literal text in the iframe.
 */
function cleanHtml(raw: string): string {
  let s = raw.trim();
  const fence = s.match(/^```(?:html)?\s*\n([\s\S]*?)\n?```$/);
  if (fence) s = fence[1].trim();
  // Drop any preamble before the document/first tag.
  const start = s.search(/<(?:!doctype|html|head|body|style|div|main|section)\b/i);
  if (start > 0) s = s.slice(start);
  return s.trim();
}

/** Reads `sub` out of the already-gateway-verified JWT. */
function callerIdFromJwt(authHeader: string): string | null {
  try {
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const payload = token.split(".")[1];
    if (!payload) return null;
    const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(padded + "=".repeat((4 - (padded.length % 4)) % 4)));
    return decoded?.sub ?? null;
  } catch {
    return null;
  }
}

/**
 * Rejects non-hosts *before* any model call. The RLS-backed save in savePage()
 * is the real enforcement; this exists so someone else's eventId can't be used
 * to burn Anthropic credits on a generation that was always going to fail.
 */
async function assertHost(eventId: string, authHeader: string): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) throw new Error("Supabase environment is not configured");

  const callerId = callerIdFromJwt(authHeader);
  if (!callerId) throw new Error("Not signed in.");

  const res = await fetch(
    `${supabaseUrl}/rest/v1/events?id=eq.${encodeURIComponent(eventId)}&select=host_id`,
    { headers: { apikey: anonKey, Authorization: authHeader } },
  );
  if (!res.ok) throw new Error(`Couldn't load the event (${res.status})`);
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("Event not found.");
  if (rows[0]?.host_id !== callerId) throw new Error("Only the event host can build this page.");
}

/**
 * Persists the page with the caller's own JWT rather than the service role, so
 * the existing "Hosts can update their events" RLS policy is what decides
 * whether this write is allowed. A non-host calling this function cannot
 * overwrite someone else's page.
 */
async function savePage(eventId: string, html: string, authHeader: string): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) throw new Error("Supabase environment is not configured");

  const res = await fetch(
    `${supabaseUrl}/rest/v1/events?id=eq.${encodeURIComponent(eventId)}&select=id`,
    {
      method: "PATCH",
      headers: {
        apikey: anonKey,
        Authorization: authHeader,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ built_page_html: html }),
    },
  );

  const text = await res.text();
  if (!res.ok) throw new Error(`Couldn't save the page (${res.status}): ${text.slice(0, 200)}`);

  // `return=representation` echoes the updated rows. An empty array means RLS
  // matched nothing, i.e. the caller is not the host - a silent no-op
  // otherwise, which would look like a successful save to the client.
  let rows: unknown = null;
  try {
    rows = JSON.parse(text);
  } catch {
    return; // Non-JSON 2xx: the write succeeded, nothing to verify.
  }
  if (Array.isArray(rows) && rows.length === 0) {
    throw new Error("Couldn't save the page — only the event host can do that.");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  console.log("[build-it] ===== REQUEST START =====");

  try {
    const body = await req.json().catch(() => ({} as any));
    const mode: string = body.mode ?? "generate";
    const eventId: string = body.eventId;

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return json({ error: "ANTHROPIC_API_KEY is not configured." }, 500);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Not signed in." }, 401);
    if (!eventId) return json({ error: "eventId is required" }, 400);

    await assertHost(eventId, authHeader);

    let html: string;

    if (mode === "generate") {
      const { eventName, about, date, location, dresscode, visualDescription } = body;
      if (!String(eventName ?? "").trim() && !String(visualDescription ?? "").trim()) {
        return json({ error: "Tell us about your event first." }, 400);
      }

      const details = [
        `Event name: ${String(eventName ?? "").trim() || "(not given)"}`,
        `About this event: ${String(about ?? "").trim() || "(not given)"}`,
        `Date and time: ${String(date ?? "").trim() || "(not given)"}`,
        `Location: ${String(location ?? "").trim() || "(not given)"}`,
        `Dress code: ${String(dresscode ?? "").trim() || "(none)"}`,
        `How the page should look: ${String(visualDescription ?? "").trim() || "(no preference — choose something that fits the event)"}`,
      ].join("\n");

      console.log("[build-it] generate —", details.replace(/\n/g, " | ").slice(0, 300));
      html = cleanHtml(await callClaude(apiKey, GENERATE_SYSTEM_PROMPT, `Design the event page for this event:\n\n${details}`, "medium"));
    } else if (mode === "edit") {
      const { currentHtml, instruction } = body;
      if (!String(currentHtml ?? "").trim()) return json({ error: "There's no page to edit yet." }, 400);
      if (!String(instruction ?? "").trim()) return json({ error: "Tell us what to change." }, 400);

      console.log("[build-it] edit —", String(instruction).slice(0, 200));
      // Low effort: this is a faithful-reproduction task, not a creative one,
      // and the whole document has to come back in the response.
      html = cleanHtml(
        await callClaude(
          apiKey,
          EDIT_SYSTEM_PROMPT,
          `Here is the current event page HTML:\n\n${currentHtml}\n\n---\n\nThe change to make: ${String(instruction).trim()}`,
          "low",
        ),
      );
    } else {
      return json({ error: `Unknown mode "${mode}"` }, 400);
    }

    await savePage(eventId, html, authHeader);

    console.log("[build-it] ===== REQUEST END (success, html length:", html.length, ") =====");
    return json({ html });
  } catch (err: any) {
    const message = err?.message ?? String(err);
    console.error("[build-it] ERROR:", message);
    return json({ error: message }, 500);
  }
});
