import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "set_rsvp",
  title: "Set my RSVP",
  description: "Set the signed-in user's RSVP status for an event identified by its share code.",
  inputSchema: {
    code: z.string().trim().describe("The event share code."),
    status: z.enum(["yes", "no", "maybe"]).describe("RSVP status."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ code, status }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId()!;

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, title")
      .eq("code", code.toUpperCase())
      .maybeSingle();

    if (eventError) return { content: [{ type: "text", text: eventError.message }], isError: true };
    if (!event) return { content: [{ type: "text", text: `No event found with code ${code}` }], isError: true };

    const { data: existing } = await supabase
      .from("event_guests")
      .select("id")
      .eq("event_id", event.id)
      .eq("user_id", userId)
      .maybeSingle();

    const { error } = existing
      ? await supabase.from("event_guests").update({ rsvp_status: status }).eq("id", existing.id)
      : await supabase.from("event_guests").insert({ event_id: event.id, user_id: userId, rsvp_status: status });

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [{ type: "text", text: `RSVP set to "${status}" for ${event.title}.` }],
      structuredContent: { event_id: event.id, rsvp_status: status },
    };
  },
});
