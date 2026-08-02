import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

function makeCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default defineTool({
  name: "create_event",
  title: "Create an event",
  description: "Create a new event hosted by the signed-in user and return its share code.",
  inputSchema: {
    title: z.string().trim().describe("Event name."),
    date_time: z.string().trim().describe("Event start as an ISO 8601 timestamp, e.g. 2026-06-05T19:00:00Z."),
    location: z.string().trim().optional().describe("Venue or address."),
    vibe: z.string().trim().optional().describe("Short vibe or description line."),
    dress_code: z.string().trim().optional().describe("Dress code / theme."),
    extra: z.string().trim().optional().describe("Notes from the host."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ title, date_time, location, vibe, dress_code, extra }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const when = new Date(date_time);
    if (Number.isNaN(when.getTime())) {
      return { content: [{ type: "text", text: "date_time must be a valid ISO 8601 timestamp." }], isError: true };
    }

    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("events")
      .insert({
        host_id: ctx.getUserId()!,
        code: makeCode(),
        title: title.trim(),
        date_time: when.toISOString(),
        location: location?.trim() ?? null,
        vibe: vibe?.trim() ?? null,
        dress_code: dress_code?.trim() ?? null,
        extra: extra?.trim() ?? null,
      })
      .select("id, code, title, date_time, location")
      .maybeSingle();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [{ type: "text", text: `Created "${data?.title}" — share code ${data?.code}` }],
      structuredContent: { event: data },
    };
  },
});
