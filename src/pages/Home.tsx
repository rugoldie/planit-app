import React from "react";
import { useNavigate } from "react-router-dom";
import { User, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isPast, parseISO } from "date-fns";

type EventWithRole = {
  id: string;
  code: string;
  title: string;
  date_time: string | null;
  location: string | null;
  role: "host" | "going" | "maybe";
  guest_count: number;
  gradient_color: string | null;
  bubble_color: string | null;
  font_style: string | null;
};

const FONT_MAP: Record<string, string> = {
  Bold: "'Bebas Neue', sans-serif",
  Handwritten: "'Caveat', cursive",
  Elegant: "'Playfair Display', serif",
};

const useUserEvents = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["user-events", userId],
    enabled: !!userId,
    refetchInterval: 5000,
    queryFn: async (): Promise<EventWithRole[]> => {
      if (!userId) return [];

      const { data: hosted } = await supabase
        .from("events")
        .select("id, code, title, date_time, location, gradient_color, bubble_color, font_style")
        .eq("host_id", userId);

      const { data: rsvps } = await supabase
        .from("event_guests")
        .select("event_id, rsvp_status")
        .eq("user_id", userId);

      const rsvpMap = new Map(
        (rsvps || []).map((r) => [r.event_id, r.rsvp_status])
      );

      const hostedIds = new Set((hosted || []).map((e) => e.id));
      const guestEventIds = (rsvps || [])
        .map((r) => r.event_id)
        .filter((id) => !hostedIds.has(id));

      let guestEvents: typeof hosted = [];
      if (guestEventIds.length > 0) {
        const { data } = await supabase
          .from("events")
          .select("id, code, title, date_time, location, gradient_color, bubble_color, font_style")
          .in("id", guestEventIds);
        guestEvents = data || [];
      }

      const allEventIds = [
        ...(hosted || []).map((e) => e.id),
        ...guestEventIds,
      ];

      let guestCounts: Record<string, number> = {};
      if (allEventIds.length > 0) {
        const { data: counts } = await supabase
          .from("event_guests")
          .select("event_id")
          .in("event_id", allEventIds)
          .in("rsvp_status", ["yes", "maybe"]);

        (counts || []).forEach((c) => {
          guestCounts[c.event_id] = (guestCounts[c.event_id] || 0) + 1;
        });
      }

      const events: EventWithRole[] = [];

      (hosted || []).forEach((e) => {
        events.push({
          ...e,
          role: "host",
          guest_count: guestCounts[e.id] || 0,
        });
      });

      (guestEvents || []).forEach((e) => {
        const status = rsvpMap.get(e.id);
        events.push({
          ...e,
          role: status === "maybe" ? "maybe" : "going",
          guest_count: guestCounts[e.id] || 0,
        });
      });

      return events
        .filter((e) => !e.date_time || !isPast(parseISO(e.date_time)))
        .sort((a, b) => {
          if (!a.date_time) return 1;
          if (!b.date_time) return -1;
          return new Date(a.date_time).getTime() - new Date(b.date_time).getTime();
        });
    },
  });
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning 👋";
  if (h < 18) return "Good afternoon 👋";
  return "Good evening 👋";
};

const formatDate = (dt: string | null) => {
  if (!dt) return "Date TBD";
  try {
    return format(parseISO(dt), "EEE, MMM d · h:mm a");
  } catch {
    return "Date TBD";
  }
};

const RoleBadge = ({ role }: { role: "host" | "going" | "maybe" }) => {
  if (role === "host")
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: "#aaee44", color: "#111" }}>
        Host
      </span>
    );
  if (role === "going")
    return (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: "#aaee44", color: "#111" }}>
        Going
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: "#f59e0b", color: "#111" }}>
      Maybe
    </span>
  );
};

/** Check if a hex color is light (for text contrast) */
const isLightHex = (hex: string): boolean => {
  const c = hex.replace("#", "");
  if (c.length < 6) return false;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
};

/** Check if an HSL string like "82 100% 48%" is light */
const isLightHsl = (hsl: string | null): boolean => {
  if (!hsl) return false;
  // Parse lightness from HSL string
  const parts = hsl.split(/[\s,]+/);
  const l = parseFloat(parts[2]);
  const s = parseFloat(parts[1]);
  // High lightness or high saturation + mid lightness = light
  return l > 55 || (s > 60 && l > 40);
};

/** Contrast text color for a given hex gradient */
const textForGradient = (hex: string | null): string => {
  return hex && isLightHex(hex) ? "#111111" : "#ffffff";
};

/** Contrast text color for bubble HSL bg */
const textForBubble = (hsl: string | null): string => {
  return isLightHsl(hsl) ? "#111111" : "#ffffff";
};

/** Resolve bubble_color HSL string to a hex-ish CSS color */
const hslToColor = (hsl: string | null, fallback: string) => {
  if (!hsl) return fallback;
  return `hsl(${hsl})`;
};

const Home = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const { data: events, isLoading } = useUserEvents(user?.id);

  // Realtime subscription for instant updates when events change
  React.useEffect(() => {
    const channel = supabase
      .channel('home-events-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'events' },
        () => {
          queryClient.invalidateQueries({ queryKey: ["user-events", user?.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const hasEvents = events && events.length > 0;
  const nextEvent = hasEvents ? events[0] : null;
  const firstName = profile?.name?.split(" ")[0] || "there";

  // New user / no events — original layout
  if (!hasEvents && !isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background px-6 py-8">
        <button
          onClick={() => navigate("/profile")}
          className="self-start bg-secondary rounded-full w-11 h-11 flex items-center justify-center border border-border"
        >
          <User className="w-5 h-5 text-muted-foreground" />
        </button>

        <div className="flex flex-col items-center mt-8">
          <h1 className="text-7xl font-extrabold text-foreground tracking-tight">planit</h1>
        </div>

        <div className="flex flex-col items-center justify-center flex-1 gap-12 px-2">
          <button
            onClick={() => navigate("/host")}
            className="w-full max-w-md bg-primary text-primary-foreground rounded-[var(--radius)] py-10 text-3xl font-extrabold"
          >
            Host
          </button>
          <button
            onClick={() => navigate("/join")}
            className="w-full max-w-md bg-primary text-primary-foreground rounded-[var(--radius)] py-10 text-3xl font-extrabold"
          >
            Join
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <div className="text-muted-foreground text-lg">Loading...</div>
      </div>
    );
  }

  // Returning user with events — dashboard layout
  return (
    <div className="flex flex-col min-h-screen bg-background px-5 pt-6 pb-4">
      {/* Top bar */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-muted-foreground text-sm">{getGreeting()}</p>
          <h1 className="text-2xl font-extrabold mt-0.5" style={{ color: "#ffffff" }}>{firstName}</h1>
        </div>
        <button
          onClick={() => navigate("/profile")}
          className="rounded-full w-11 h-11 flex items-center justify-center border-2"
          style={{ borderColor: "#aaee44" }}
        >
          <User className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Next up card */}
      {nextEvent && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Next up</h2>
          <div
            className="rounded-2xl p-5 cursor-pointer overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${nextEvent.gradient_color || "#aaee44"}99 0%, #1e1e1e 60%)`,
              border: `1px solid ${nextEvent.gradient_color || "#aaee44"}40`,
            }}
            onClick={() => {
              const path = nextEvent.role === "host" ? `/event/${nextEvent.code}` : `/guest/${nextEvent.code}`;
              navigate(path);
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <h3
                className="text-lg flex-1 mr-3"
                style={{
                  color: "#ffffff",
                  fontFamily: FONT_MAP[nextEvent.font_style || "Bold"] || FONT_MAP.Bold,
                  fontWeight: nextEvent.font_style === "Bold" || !nextEvent.font_style ? 700 : 400,
                  fontSize: nextEvent.font_style === "Bold" ? "1.25rem" : "1.125rem",
                }}
              >
                {nextEvent.title || "Untitled Event"}
              </h3>
              <RoleBadge role={nextEvent.role} />
            </div>
            <div className="flex flex-wrap gap-2 text-sm mb-4">
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium" style={{ backgroundColor: hslToColor(nextEvent.bubble_color, "#383838"), color: textForBubble(nextEvent.bubble_color) }}>
                🗓️ {formatDate(nextEvent.date_time)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium" style={{ backgroundColor: hslToColor(nextEvent.bubble_color, "#383838"), color: textForBubble(nextEvent.bubble_color) }}>
                📍 {nextEvent.location || "Location TBD"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium" style={{ backgroundColor: hslToColor(nextEvent.bubble_color, "#383838"), color: textForBubble(nextEvent.bubble_color) }}>
                <Users className="w-3.5 h-3.5" /> {nextEvent.guest_count} going
              </span>
            </div>
            <button
              className="w-full rounded-xl py-2.5 text-sm font-bold"
              style={{ backgroundColor: hslToColor(nextEvent.bubble_color, "#aaee44"), color: textForBubble(nextEvent.bubble_color) }}
              onClick={(e) => {
                e.stopPropagation();
                const path = nextEvent.role === "host" ? `/event/${nextEvent.code}` : `/guest/${nextEvent.code}`;
                navigate(path);
              }}
            >
              View event
            </button>
          </div>
        </div>
      )}

      {/* Upcoming section */}
      <div className="flex-1 overflow-y-auto mb-4">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Upcoming</h2>
        <div className="space-y-3">
          {events.map((event) => {
            const gradientHex = event.gradient_color || "#aaee44";
            const bubbleBg = hslToColor(event.bubble_color, "#383838");
            const fontFamily = FONT_MAP[event.font_style || "Bold"] || FONT_MAP.Bold;

            return (
              <div
                key={event.id}
                className="rounded-xl p-4 cursor-pointer overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${gradientHex}99 0%, #2b2b2b 60%)`,
                  border: `1px solid ${gradientHex}40`,
                }}
                onClick={() => {
                  const path = event.role === "host" ? `/event/${event.code}` : `/guest/${event.code}`;
                  navigate(path);
                }}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <h3
                    className="text-base flex-1 mr-3"
                    style={{
                      color: "#ffffff",
                      fontFamily,
                      fontWeight: event.font_style === "Bold" || !event.font_style ? 700 : 400,
                    }}
                  >
                    {event.title || "Untitled Event"}
                  </h3>
                  <RoleBadge role={event.role} />
                </div>
                <div className="flex flex-wrap gap-2 mt-2 text-sm">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium" style={{ backgroundColor: hslToColor(event.bubble_color, "#383838"), color: textForBubble(event.bubble_color) }}>
                    🗓️ {formatDate(event.date_time)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium" style={{ backgroundColor: hslToColor(event.bubble_color, "#383838"), color: textForBubble(event.bubble_color) }}>
                    📍 {event.location || "Location TBD"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => navigate("/host")}
          className="flex-1 rounded-xl py-4 text-lg font-extrabold"
          style={{ backgroundColor: "#aaee44", color: "#111" }}
        >
          Host
        </button>
        <button
          onClick={() => navigate("/join")}
          className="flex-1 rounded-xl py-4 text-lg font-extrabold"
          style={{ backgroundColor: "#383838", color: "#fff" }}
        >
          Join
        </button>
      </div>
    </div>
  );
};

export default Home;
