import { supabase } from "@/integrations/supabase/client";
import { extractInvokeErrorMessage } from "@/lib/invokeError";

export type GenerateInput = {
  eventId: string;
  eventName: string;
  /** Free-text occasion description from "About your event" — gives the model
   *  the context the bare event title usually lacks. */
  about: string;
  date: string;
  location: string;
  dresscode: string;
  visualDescription: string;
};

export type EditInput = {
  eventId: string;
  currentHtml: string;
  instruction: string;
};

// The edge function persists built_page_html itself (under the caller's JWT, so
// RLS enforces host-only writes) and echoes the HTML back.
const invokeBuildIt = async (body: Record<string, unknown>, fallback: string): Promise<string> => {
  const { data, error } = await supabase.functions.invoke("build-it", { body });
  if (error || data?.error) {
    throw new Error(data?.error || (await extractInvokeErrorMessage(error, fallback)));
  }
  const html = data?.html;
  if (typeof html !== "string" || !html.trim()) throw new Error(fallback);
  return html;
};

export const generateBuiltPage = (input: GenerateInput) =>
  invokeBuildIt({ mode: "generate", ...input }, "Couldn't design your page. Please try again.");

export const editBuiltPage = (input: EditInput) =>
  invokeBuildIt({ mode: "edit", ...input }, "Couldn't apply that change. Please try again.");

/**
 * Persists a direct text edit (from "Edit text" inline mode) without an AI
 * round-trip — the host already has the exact HTML they want. Goes straight
 * through the authenticated client, so the existing "Hosts can update their
 * events" RLS policy is what enforces host-only writes, same as any other
 * event field edit.
 */
export const saveBuiltPageHtml = async (eventId: string, html: string): Promise<void> => {
  const { error } = await supabase.from("events").update({ built_page_html: html }).eq("id", eventId);
  if (error) throw new Error(error.message || "Couldn't save your changes. Please try again.");
};

const BUILD_IT_BRAND_FALLBACK = "linear-gradient(135deg, #7c3aed 0%, #db2777 100%)";

/**
 * Pulls a representative CSS `background` value out of a generated page's
 * <style> block, for use as a lightweight feed-card preview — without
 * embedding a live iframe per card (expensive for a scrolling list, and the
 * sandboxed frame can't be screenshotted from here anyway).
 *
 * Heuristic: generated pages are instructed to layer 6+ gradients into one
 * `background` declaration for their atmosphere, so the single LONGEST
 * `background`/`background-image` value in the stylesheet is almost always
 * that hero background, wherever it's actually applied (body, a wrapper div,
 * a hero section - selector doesn't matter, only the declaration does).
 * Falls back to the Build It brand gradient so even a page this can't parse
 * still reads as "AI-designed," not generic.
 */
export const extractBuiltPagePreviewBackground = (html: string | null | undefined): string => {
  if (!html) return BUILD_IT_BRAND_FALLBACK;
  const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const css = styleMatch?.[1] ?? "";
  const declarations = css.matchAll(/background(?:-image)?\s*:\s*([^;]+);/gi);
  let best = "";
  for (const m of declarations) {
    const value = m[1].trim();
    if (value.length > best.length) best = value;
  }
  // Below this length it's almost always a flat `background: #111` or
  // `background: white` - not worth showing over the brand fallback.
  return best.length > 40 ? best : BUILD_IT_BRAND_FALLBACK;
};

/** Human-readable date for the generate prompt, e.g. "Sat 14 Nov 2026 at 20:00". */
export const describeDateTime = (date: string, time: string): string => {
  if (!date) return time ? `Time: ${time}` : "";
  const d = new Date(`${date}T${time || "00:00"}`);
  if (Number.isNaN(d.getTime())) return [date, time].filter(Boolean).join(" ");
  const pretty = d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "long", year: "numeric" });
  return time ? `${pretty} at ${time}` : pretty;
};
