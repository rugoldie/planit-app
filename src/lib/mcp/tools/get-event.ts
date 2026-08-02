import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_event",
  title: "Get event details",
  description: "Get full details for one event by its share code, including guest list and RSVP counts.",
  inputSchema: {
    code: z.string().trim().describe("The event share code, e.g. ABC123."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ code }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);

    const { data: event, error } = await supabase
      .from("events")
      .select("id, code, title, vibe, location, date_time, dress_code, extra, capacity, rsvp_deadline, host_id")
      .eq("code", code.toUpperCase())
      .maybeSingle();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!event) return { content: [{ type: "text", text: `No event found with code ${code}` }], isError: true };

    const { data: guests } = await supabase
      .from("event_guests")
      .select("user_id, rsvp_status")
      .eq("event_id", event.id);

    const counts = (guests ?? []).reduce<Record<string, number>>((acc, g: any) => {
      const key = g.rsvp_status ?? "pending";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    const result = {
      ...event,
      is_host: event.host_id === ctx.getUserId(),
      guest_count: guests?.length ?? 0,
      rsvp_counts: counts,
    };

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: { event: result },
    };
  },
});
