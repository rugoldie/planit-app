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

/** Human-readable date for the generate prompt, e.g. "Sat 14 Nov 2026 at 20:00". */
export const describeDateTime = (date: string, time: string): string => {
  if (!date) return time ? `Time: ${time}` : "";
  const d = new Date(`${date}T${time || "00:00"}`);
  if (Number.isNaN(d.getTime())) return [date, time].filter(Boolean).join(" ");
  const pretty = d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "long", year: "numeric" });
  return time ? `${pretty} at ${time}` : pretty;
};
