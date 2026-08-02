import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "post_event_chat",
  title: "Post event chat message",
  description: "Post a chat message to an event as the signed-in user.",
  inputSchema: {
    code: z.string().trim().describe("The event share code."),
    text: z.string().trim().describe("Message text to post."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ code, text }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    if (!text.trim()) {
      return { content: [{ type: "text", text: "Message text cannot be empty." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId()!;

    const { data: event } = await supabase
      .from("events")
      .select("id")
      .eq("code", code.toUpperCase())
      .maybeSingle();

    if (!event) return { content: [{ type: "text", text: `No event found with code ${code}` }], isError: true };

    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("user_id", userId)
      .maybeSingle();

    const { data, error } = await supabase
      .from("comments")
      .insert({
        event_id: event.id,
        user_id: userId,
        user_name: profile?.name ?? ctx.getUserEmail() ?? "Guest",
        text: text.trim(),
      })
      .select("id, user_name, text, created_at")
      .maybeSingle();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [{ type: "text", text: `Posted: ${text.trim()}` }],
      structuredContent: { message: data },
    };
  },
});
