import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_events",
  title: "List my events",
  description: "List events the signed-in user is hosting or attending, with RSVP status.",
  inputSchema: {
    limit: z.number().int().optional().describe("Max events to return (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();
    const max = Math.min(Math.max(limit ?? 20, 1), 100);

    const [hosted, guested] = await Promise.all([
      supabase
        .from("events")
        .select("id, code, title, vibe, location, date_time, host_id")
        .eq("host_id", userId!)
        .order("date_time", { ascending: true })
        .limit(max),
      supabase
        .from("event_guests")
        .select("rsvp_status, events(id, code, title, vibe, location, date_time, host_id)")
        .eq("user_id", userId!)
        .limit(max),
    ]);

    if (hosted.error) return { content: [{ type: "text", text: hosted.error.message }], isError: true };
    if (guested.error) return { content: [{ type: "text", text: guested.error.message }], isError: true };

    const items = [
      ...(hosted.data ?? []).map((e: any) => ({ ...e, role: "host", rsvp_status: null })),
      ...(guested.data ?? [])
        .filter((g: any) => g.events)
        .map((g: any) => ({ ...g.events, role: "guest", rsvp_status: g.rsvp_status })),
    ];

    const seen = new Set<string>();
    const events = items.filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true))).slice(0, max);

    return {
      content: [{ type: "text", text: JSON.stringify(events, null, 2) }],
      structuredContent: { events },
    };
  },
});
