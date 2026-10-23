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

export type BuildItResult = {
  html: string;
  /** Structured events-table fields (title/location/date_time) the edge
   *  function detected as changed and already persisted alongside
   *  built_page_html — the caller merges these into its own local state so
   *  the current page reflects them without a refetch. Empty for generate. */
  updatedFields: Record<string, unknown>;
};

// The edge function persists built_page_html itself (under the caller's JWT, so
// RLS enforces host-only writes) and echoes the HTML back.
const invokeBuildIt = async (body: Record<string, unknown>, fallback: string): Promise<BuildItResult> => {
  const { data, error } = await supabase.functions.invoke("build-it", { body });
  if (error || data?.error) {
    throw new Error(data?.error || (await extractInvokeErrorMessage(error, fallback)));
  }
  const html = data?.html;
  if (typeof html !== "string" || !html.trim()) throw new Error(fallback);
  const updatedFields = data?.updatedFields && typeof data.updatedFields === "object" ? data.updatedFields : {};
  return { html, updatedFields };
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

export type BuiltPagePalette = {
  /** The generated page's own `background` value — may be a gradient, so
   *  callers must apply it via the `background` CSS property, never
   *  `backgroundColor`. */
  background: string;
  /** A solid colour (hex or rgb()) standing in for "the" accent of the page —
   *  always a plain parseable colour, never a gradient. */
  accent: string;
  /** Readable text colour (#ffffff or #111111) for content sitting on
   *  `accent`. */
  accentText: string;
  /** Readable text colour for content sitting directly on `background`. */
  textOnBackground: string;
};

const BUILD_IT_DEFAULT_PALETTE: BuiltPagePalette = {
  background: BUILD_IT_BRAND_FALLBACK,
  accent: "#a855f7",
  accentText: "#ffffff",
  textOnBackground: "#ffffff",
};

/** Parses a `#hex` or `rgb()`/`rgba()` colour string into 0-255 RGB, or null
 *  for anything else (gradients, named colours, unparseable input). */
const parseColorToRgb = (token: string): [number, number, number] | null => {
  const t = token.trim();
  const hex = t.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgb = t.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return null;
};

const saturationOf = ([r, g, b]: [number, number, number]): number => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
};

/** Low-saturation colours (near-black, near-white, grays) make poor accents —
 *  every generated page has plenty of these as surface/text colours, and
 *  picking one would just reproduce the app's own default theme. */
const isNearGray = ([r, g, b]: [number, number, number]): boolean => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max - min < 18;
};

const relativeLuminance = ([r, g, b]: [number, number, number]): number =>
  (0.299 * r + 0.587 * g + 0.114 * b) / 255;

/** #ffffff or #111111, whichever reads better on top of `color` (or a
 *  fallback when `color` isn't a plain parseable colour, e.g. a gradient). */
const readableTextOn = (color: string, fallback: "#ffffff" | "#111111" = "#ffffff"): string => {
  const rgb = parseColorToRgb(color);
  if (!rgb) {
    // `color` may be a gradient — sample its first colour stop instead of
    // giving up on contrast entirely.
    const token = color.match(/#(?:[0-9a-f]{3}|[0-9a-f]{6})\b|rgba?\([^)]+\)/i)?.[0];
    const sampled = token ? parseColorToRgb(token) : null;
    if (!sampled) return fallback;
    return relativeLuminance(sampled) > 0.6 ? "#111111" : "#ffffff";
  }
  return relativeLuminance(rgb) > 0.6 ? "#111111" : "#ffffff";
};

/**
 * Pulls a background and a dominant accent colour out of a generated page's
 * own <style> block, so UI sitting below the page (Who's Going, Chat,
 * Gallery) can share its exact palette instead of the app's default dark
 * theme — the goal being that a viewer can't tell where the AI-generated
 * section ends and the rest of the event page begins.
 *
 * Background: the same longest-`background`-declaration heuristic used for
 * feed-card previews (see extractBuiltPagePreviewBackground) — generated
 * pages layer several gradients into one hero declaration, so the longest
 * one is almost always that atmosphere, wherever it's actually applied.
 *
 * Accent: a declaration on a button/CTA-flavoured selector wins outright
 * (these pages always style their RSVP button distinctly); otherwise the
 * most frequent non-gray colour anywhere in the stylesheet, weighted toward
 * more saturated hues, stands in for "the" brand colour of the page.
 */
/**
 * Finds the page's actual background value — unlike
 * extractBuiltPagePreviewBackground()'s feed-card heuristic (which only
 * bothers with a value long enough to look good as a loud thumbnail), this
 * has to match what the generated page really renders, flat single colour
 * included, since the Who's Going/Chat/Gallery container needs to share it
 * exactly or the seam becomes obvious instead of disappearing.
 */
const extractPageBackground = (css: string): string | null => {
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
  const bodySelectorRe = /\b(html|body)\b/i;
  let m: RegExpExecArray | null;
  let bodyValue: string | null = null;
  let longest = "";
  while ((m = ruleRe.exec(css))) {
    const bgDecl = m[2].match(/background(?:-color|-image)?\s*:\s*([^;]+)/i);
    if (!bgDecl) continue;
    const value = bgDecl[1].trim();
    if (bodySelectorRe.test(m[1]) && !bodyValue) bodyValue = value;
    if (value.length > longest.length) longest = value;
  }
  return bodyValue ?? (longest || null);
};

export const extractBuiltPagePalette = (html: string | null | undefined): BuiltPagePalette => {
  if (!html) return BUILD_IT_DEFAULT_PALETTE;
  const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const css = styleMatch?.[1] ?? "";
  if (!css.trim()) return BUILD_IT_DEFAULT_PALETTE;

  const background = extractPageBackground(css) ?? BUILD_IT_DEFAULT_PALETTE.background;

  let accent: string | null = null;
  const ctaSelectorRe = /\b(button|btn|cta|rsvp|join)\b/i;
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = ruleRe.exec(css))) {
    if (!ctaSelectorRe.test(m[1])) continue;
    const bgDecl = m[2].match(/background(?:-color)?\s*:\s*([^;]+)/i);
    if (!bgDecl) continue;
    const rgb = parseColorToRgb(bgDecl[1].trim());
    if (!rgb || isNearGray(rgb)) continue;
    accent = bgDecl[1].trim();
    break;
  }

  if (!accent) {
    const counts = new Map<string, number>();
    for (const token of css.match(/#(?:[0-9a-f]{3}|[0-9a-f]{6})\b|rgba?\([^)]+\)/gi) ?? []) {
      const rgb = parseColorToRgb(token);
      if (!rgb || isNearGray(rgb)) continue;
      const key = `${rgb[0]},${rgb[1]},${rgb[2]}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    let best: { rgb: [number, number, number]; score: number } | null = null;
    for (const [key, count] of counts) {
      const rgb = key.split(",").map(Number) as [number, number, number];
      const score = count * (1 + saturationOf(rgb));
      if (!best || score > best.score) best = { rgb, score };
    }
    if (best) accent = `rgb(${best.rgb[0]}, ${best.rgb[1]}, ${best.rgb[2]})`;
  }

  if (!accent) {
    return { ...BUILD_IT_DEFAULT_PALETTE, background, textOnBackground: readableTextOn(background) };
  }

  return {
    background,
    accent,
    accentText: readableTextOn(accent, "#111111"),
    textOnBackground: readableTextOn(background),
  };
};

/** Mixes an alpha channel into a solid `#hex`/`rgb()`/`rgba()` colour, for
 *  subtle tints (dividers, translucent fills) derived from an extracted
 *  palette colour. Returns the colour unchanged if it isn't plain-parseable. */
export const withAlpha = (color: string, alpha: number): string => {
  const rgb = parseColorToRgb(color);
  if (!rgb) return color;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
};

/** Human-readable date for the generate prompt, e.g. "Sat 14 Nov 2026 at 20:00". */
export const describeDateTime = (date: string, time: string): string => {
  if (!date) return time ? `Time: ${time}` : "";
  const d = new Date(`${date}T${time || "00:00"}`);
  if (Number.isNaN(d.getTime())) return [date, time].filter(Boolean).join(" ");
  const pretty = d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "long", year: "numeric" });
  return time ? `${pretty} at ${time}` : pretty;
};
