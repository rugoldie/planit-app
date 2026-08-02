import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMyEventsTool from "./tools/list-my-events";
import getEventTool from "./tools/get-event";
import setRsvpTool from "./tools/set-rsvp";
import listEventChatTool from "./tools/list-event-chat";
import postEventChatTool from "./tools/post-event-chat";
import createEventTool from "./tools/create-event";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "planit-your-social-events",
  title: "Planit: Your Social Events",
  version: "0.1.0",
  instructions:
    "Tools for Planit, a social events app. Use `list_my_events` to see the signed-in user's events, `get_event` for details by share code, `create_event` to host a new event, `set_rsvp` to respond to an invite, and `list_event_chat` / `post_event_chat` for an event's chat.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listMyEventsTool,
    getEventTool,
    createEventTool,
    setRsvpTool,
    listEventChatTool,
    postEventChatTool,
  ],
});
