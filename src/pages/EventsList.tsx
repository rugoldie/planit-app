import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const COVO_GRAD = "#2563eb";

type EventEntry = {
  name: string; date: string; code: string;
  role: "Host" | "Going" | "Maybe" | "Not going";
  bg_photo: string | null;
  bg_color: string | null;
  gradient_color: string | null;
  template_name: string | null;
};

/** Same priority order as the home screen's upcoming cards:
 *  bg_photo CSS gradient → bg_color HSL → template signature → gradient_color → default */
const getAccentColor = (ev: EventEntry): string => {
  if (ev.bg_photo && /^(linear|radial|conic|repeating)/.test(ev.bg_photo)) return ev.bg_photo;
  if (ev.bg_color) return `hsl(${ev.bg_color})`;
  const tn = (ev.template_name || "").toLowerCase().trim();
  if (tn.includes("noir"))    return "#111111";
  if (tn === "galaxy")        return "#3a0ca3";
  if (tn === "sunny")         return "#e07020";
  if (tn === "vintage")       return "#8b6348";
  if (tn === "ocean")         return "#1e5fa8";
  if (tn === "blush")         return "#c04060";
  if (tn === "forest")        return "#2d6a2d";
  if (tn === "midnight")      return "#3a3a6e";
  return ev.gradient_color || "#2563eb";
};

const EventsList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const initialTab = searchParams.get("tab") === "past" ? "past" : "upcoming";
  const [tab, setTab] = useState<"upcoming" | "past">(initialTab);
  const [allEvents, setAllEvents] = useState<EventEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: hosted } = await supabase
        .from("events")
        .select("title, date_time, code, bg_photo, bg_color, gradient_color, template_name")
        .eq("host_id", user.id);
      const { data: guestEntries } = await supabase
        .from("event_guests")
        .select("event_id, rsvp_status, events(title, date_time, code, bg_photo, bg_color, gradient_color, template_name)")
        .eq("user_id", user.id);
      const events: EventEntry[] = [];
      (hosted || []).forEach((e: any) =>
        events.push({ name: e.title || "Untitled", date: e.date_time || "", code: e.code, role: "Host", bg_photo: e.bg_photo ?? null, bg_color: e.bg_color ?? null, gradient_color: e.gradient_color ?? null, template_name: e.template_name ?? null })
      );
      (guestEntries || []).forEach((g: any) => {
        const ev = g.events;
        if (ev && !events.find(e => e.code === ev.code)) {
          const r = g.rsvp_status;
          events.push({ name: ev.title || "Untitled", date: ev.date_time || "", code: ev.code, role: r === "yes" ? "Going" : r === "maybe" ? "Maybe" : "Not going", bg_photo: ev.bg_photo ?? null, bg_color: ev.bg_color ?? null, gradient_color: ev.gradient_color ?? null, template_name: ev.template_name ?? null });
        }
      });
      setAllEvents(events);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const now = new Date();
  const upcoming = allEvents
    .filter(e => !e.date || new Date(e.date) >= now)
    .sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
  const past = allEvents
    .filter(e => !!e.date && new Date(e.date) < now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const displayed = tab === "upcoming" ? upcoming : past;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-10 pb-4">
        <button type="button" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6 text-muted-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">My Events</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-5 mb-4">
        <button
          type="button"
          onClick={() => setTab("upcoming")}
          className="flex-1 py-2.5 rounded-full text-sm font-semibold transition-colors"
          style={tab === "upcoming"
            ? { background: COVO_GRAD, color: "#ffffff", border: "none" }
            : { backgroundColor: "transparent", color: "#888", border: "1px solid #333" }}
        >
          Upcoming
        </button>
        <button
          type="button"
          onClick={() => setTab("past")}
          className="flex-1 py-2.5 rounded-full text-sm font-semibold transition-colors"
          style={tab === "past"
            ? { background: COVO_GRAD, color: "#ffffff", border: "none" }
            : { backgroundColor: "transparent", color: "#888", border: "1px solid #333" }}
        >
          Past
        </button>
      </div>

      {/* Event list */}
      <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-2">
        {loading ? (
          <p className="text-muted-foreground text-sm text-center py-10">Loading...</p>
        ) : displayed.length === 0 ? (
          <p className="text-sm text-center py-10" style={{ color: "#666" }}>
            No {tab} events
          </p>
        ) : (
          displayed.map((ev, i) => (
            <button
              key={i}
              type="button"
              onClick={() => navigate(ev.role === "Host" ? `/event/${ev.code}` : `/guest/${ev.code}`)}
              className="w-full flex items-center gap-3 bg-card rounded-2xl px-4 py-3.5 border border-border text-left"
              style={{ position: "relative", overflow: "hidden" }}
            >
              {/* Left accent strip — event theme colour, slightly darker at bottom */}
              {(() => { const c = getAccentColor(ev); return (
                <div style={{
                  position: "absolute", left: 0, top: 0, bottom: 0, width: 5,
                  background: `linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.32) 100%), ${c}`,
                }} />
              ); })()}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: "#ffffff" }}>{ev.name}</p>
                <p className="text-xs mt-0.5" style={{ color: "#888888" }}>
                  {ev.date
                    ? new Date(ev.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })
                    : "No date"}
                </p>
              </div>
              <span
                className="text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0"
                style={{ background: ev.role === "Host" ? COVO_GRAD : "#2a2a2a", color: ev.role === "Host" ? "#ffffff" : "#888" }}
              >
                {ev.role}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default EventsList;
