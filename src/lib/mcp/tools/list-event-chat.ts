import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_event_chat",
  title: "List event chat",
  description: "Read recent chat messages posted on an event, newest last.",
  inputSchema: {
    code: z.string().trim().describe("The event share code."),
    limit: z.number().int().optional().describe("Max messages to return (default 30)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ code, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const max = Math.min(Math.max(limit ?? 30, 1), 100);

    const { data: event } = await supabase
      .from("events")
      .select("id")
      .eq("code", code.toUpperCase())
      .maybeSingle();

    if (!event) return { content: [{ type: "text", text: `No event found with code ${code}` }], isError: true };

    const { data, error } = await supabase
      .from("comments")
      .select("id, user_name, text, created_at")
      .eq("event_id", event.id)
      .order("created_at", { ascending: false })
      .limit(max);

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const messages = (data ?? []).slice().reverse();
    return {
      content: [{ type: "text", text: JSON.stringify(messages, null, 2) }],
      structuredContent: { messages },
    };
  },
});
