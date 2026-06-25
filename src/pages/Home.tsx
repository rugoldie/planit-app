import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Users, MessageCircle, Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isPast, parseISO } from "date-fns";
import { ConcentricCircles } from "@/components/layouts/PlanitNoirLayout";
import { VintageCircles } from "@/components/layouts/VintageLayout";

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
  bg_color: string | null;
  bg_photo: string | null;
  font_style: string | null;
  template_name: string | null;
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
        .select(
          "id, code, title, date_time, location, gradient_color, bubble_color, bg_color, bg_photo, font_style, template_name",
        )
        .eq("host_id", userId);

      const { data: rsvps } = await supabase.from("event_guests").select("event_id, rsvp_status").eq("user_id", userId);

      const rsvpMap = new Map((rsvps || []).map((r) => [r.event_id, r.rsvp_status]));

      const hostedIds = new Set((hosted || []).map((e) => e.id));
      const guestEventIds = (rsvps || [])
        .filter((r) => r.rsvp_status === "yes" || r.rsvp_status === "maybe")
        .map((r) => r.event_id)
        .filter((id) => !hostedIds.has(id));

      let guestEvents: typeof hosted = [];
      if (guestEventIds.length > 0) {
        const { data } = await supabase
          .from("events")
          .select(
            "id, code, title, date_time, location, gradient_color, bubble_color, bg_color, bg_photo, font_style, template_name",
          )
          .in("id", guestEventIds);
        guestEvents = data || [];
      }

      const allEventIds = [...(hosted || []).map((e) => e.id), ...guestEventIds];

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

/** Pick the best representative CSS color for an event card.
 *  Priority: bg_color (HSL, set by Build It) → template signature → gradient_color accent */
const getEventCardColor = (event: EventWithRole): string => {
  if (event.bg_color) return `hsl(${event.bg_color})`;
  const tn = event.template_name;
  if (isNoir(tn))    return "#0a0a0a";
  if (isGalaxy(tn)) return "#0d0d2b";
  if (isSunny(tn))  return "#c45a20";
  if (isVintage(tn)) return "#4a3728";
  if (isOcean(tn))  return "#0d3060";
  if (isBlush(tn))  return "#3d1020";
  if (isForest(tn)) return "#0a2e0a";
  if (isMidnight(tn)) return "#1a1a2e";
  return event.gradient_color || "#1e1e2e";
};

/** Subtle warm bokeh dots — fixed positions, purely decorative */
const BOKEH_OVERLAY =
  "radial-gradient(2px 2px at 22% 28%, rgba(255,200,120,.45), transparent)," +
  "radial-gradient(2px 2px at 72% 44%, rgba(255,200,120,.35), transparent)," +
  "radial-gradient(1px 1px at 48% 68%, rgba(255,200,120,.45), transparent)," +
  "radial-gradient(2px 2px at 83% 22%, rgba(255,200,120,.35), transparent)";

const getDaysUntil = (dt: string | null): number | null => {
  if (!dt) return null;
  try {
    const diff = Math.ceil((parseISO(dt).getTime() - Date.now()) / 86400000);
    return diff >= 0 ? diff : null;
  } catch { return null; }
};

const formatDate = (dt: string | null) => {
  if (!dt) return "Date TBD";
  try {
    return format(parseISO(dt), "EEE, MMM d · h:mm a");
  } catch {
    return "Date TBD";
  }
};

const RoleBadge = ({ role, accentColor }: { role: "host" | "going" | "maybe"; accentColor?: string }) => {
  const bg = accentColor || "#3D7BFF";
  if (role === "host")
    return (
      <span
        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
        style={{ backgroundColor: bg, color: "#111" }}
      >
        Host
      </span>
    );
  if (role === "going")
    return (
      <span
        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
        style={{ backgroundColor: bg, color: "#111" }}
      >
        Going
      </span>
    );
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: "#f59e0b", color: "#111" }}
    >
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
  const parts = hsl.split(/[\s,]+/);
  const l = parseFloat(parts[2]);
  const s = parseFloat(parts[1]);
  return l > 55 || (s > 60 && l > 40);
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

const isNoir = (templateName: string | null) => {
  if (!templateName) return false;
  const t = templateName.toLowerCase().trim();
  return t === "planit-noir" || t === "planit noir" || t === "noir" || t.includes("noir");
};

const isVintage = (templateName: string | null) => {
  if (!templateName) return false;
  const t = templateName.toLowerCase().trim();
  return t === "vintage" || t.includes("vintage");
};
const isGalaxy = (templateName: string | null) => {
  if (!templateName) return false;
  return templateName.toLowerCase().trim() === "galaxy";
};
const isSunny = (templateName: string | null) => {
  if (!templateName) return false;
  return templateName.toLowerCase().trim() === "sunny";
};
const isOcean = (templateName: string | null) => {
  if (!templateName) return false;
  return templateName.toLowerCase().trim() === "ocean";
};
const isBlush = (templateName: string | null) => {
  if (!templateName) return false;
  return templateName.toLowerCase().trim() === "blush";
};
const isForest = (templateName: string | null) => {
  if (!templateName) return false;
  return templateName.toLowerCase().trim() === "forest";
};
const isCustomTemplate = (templateName: string | null) => {
  if (!templateName) return false;
  return templateName.toLowerCase().trim() === "planit-custom";
};
const isMidnight = (templateName: string | null) => {
  if (!templateName) return false;
  return templateName.toLowerCase().trim() === "midnight";
};
/** Noir-styled title: second word in accent color + italic */
const NoirCardTitle = ({
  title,
  accentColor,
  fontSize = "1.25rem",
}: {
  title: string;
  accentColor: string;
  fontSize?: string;
}) => {
  const words = (title || "Untitled Event").split(" ");
  if (words.length <= 1) {
    return (
      <span
        style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize, color: "white", lineHeight: 1.2 }}
      >
        {words[0]}
      </span>
    );
  }
  const greenIndex = words.length <= 2 ? 1 : Math.floor(words.length / 2);
  return (
    <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize, lineHeight: 1.2 }}>
      {words.map((word, i) => (
        <React.Fragment key={i}>
          {i > 0 && " "}
          {i === greenIndex ? (
            <span style={{ color: accentColor, fontStyle: "italic" }}>{word}</span>
          ) : (
            <span style={{ color: "white" }}>{word}</span>
          )}
        </React.Fragment>
      ))}
    </span>
  );
};

/** Noir Next Up card — rebuilt from scratch */
const NoirNextUpCard = ({ event, navigate }: { event: EventWithRole; navigate: ReturnType<typeof useNavigate> }) => {
  const accent = hslToColor(event.bubble_color, "#aaee44");
  const btnText = textForBubble(event.bubble_color) || "#111";
  const cardBg = event.bg_color ? `hsl(${event.bg_color})` : "#0a0a0a";

  const eventDate = event.date_time ? parseISO(event.date_time) : null;
  const dayNum = eventDate ? eventDate.getDate() : "";
  const monthName = eventDate ? format(eventDate, "MMM").toUpperCase() : "";
  const timeStr = eventDate ? format(eventDate, "h:mm a") : "";

  const navPath = event.role === "host" ? `/event/${event.code}` : `/guest/${event.code}`;

  return (
    <div
      className="rounded-2xl overflow-hidden relative cursor-pointer"
      style={{ backgroundColor: cardBg, border: "1px solid rgba(255,255,255,0.06)" }}
      onClick={() => navigate(navPath)}
    >
      {/* Background pattern */}
      <ConcentricCircles accentColor={accent} />

      <div className="relative z-10 p-3.5">
        {/* Invite text */}
        <p
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "10px",
            fontStyle: "italic",
            color: "rgba(255,255,255,0.35)",
            marginBottom: "4px",
          }}
        >
          you're invited to
        </p>

        {/* Event title with accent word */}
        <NoirCardTitle title={event.title} accentColor={accent} fontSize="1.15rem" />

        {/* BY HOST divider */}
        <div className="flex items-center gap-3 mt-2.5 mb-3">
          <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
          <span
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "8px",
              fontWeight: 600,
              letterSpacing: "0.22em",
              color: "rgba(255,255,255,0.35)",
              textTransform: "uppercase" as const,
            }}
          >
            by {event.role === "host" ? "You" : "Host"}
          </span>
          <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
        </div>

        {/* Two mini cards side by side */}
        <div className="flex gap-2 mb-3">
          {/* Date card — accent bg */}
          <div
            className="flex-1 flex flex-col items-center justify-center rounded-lg py-2 px-2"
            style={{ backgroundColor: accent }}
          >
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "22px",
                fontWeight: 900,
                color: "#0a0a0a",
                lineHeight: 1,
              }}
            >
              {dayNum}
            </span>
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "8px",
                fontWeight: 700,
                color: "#0a0a0a",
                opacity: 0.65,
                textTransform: "uppercase" as const,
                letterSpacing: "0.12em",
                marginTop: "2px",
              }}
            >
              {monthName}
            </span>
            {timeStr && (
              <span
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "8px",
                  color: "#0a0a0a",
                  opacity: 0.45,
                  marginTop: "1px",
                }}
              >
                {timeStr}
              </span>
            )}
          </div>

          {/* Location card — dark bg */}
          <div
            className="flex-1 flex flex-col justify-center rounded-lg py-2 px-2.5"
            style={{ backgroundColor: "#111111" }}
          >
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "8px",
                fontWeight: 600,
                color: "rgba(255,255,255,0.35)",
                textTransform: "uppercase" as const,
                letterSpacing: "0.15em",
              }}
            >
              Location
            </span>
            <span
              className="truncate mt-0.5"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "13px",
                fontWeight: 700,
                color: "white",
              }}
            >
              {event.location || "TBD"}
            </span>
          </div>
        </div>

        {/* Going count + overlapping avatars */}
        <div className="flex items-center justify-between mb-3">
          <span
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "8px",
              fontWeight: 600,
              color: "rgba(255,255,255,0.3)",
              textTransform: "uppercase" as const,
              letterSpacing: "0.18em",
            }}
          >
            {event.guest_count > 0 ? `${event.guest_count} going` : "No one yet"}
          </span>
          <div className="flex items-center">
            {Array.from({ length: Math.min(event.guest_count, 4) }, (_, i) => (
              <div
                key={i}
                className="flex items-center justify-center"
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  border: `2px solid #0a0a0a`,
                  backgroundColor: "#1a1a1a",
                  marginLeft: i > 0 ? "-6px" : 0,
                  position: "relative",
                  zIndex: 4 - i,
                }}
              >
                <span style={{ fontSize: "7px", fontWeight: 700, color: accent }}>●</span>
              </div>
            ))}
            {event.guest_count > 4 && (
              <div
                className="flex items-center justify-center"
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  border: "2px solid #0a0a0a",
                  backgroundColor: "#1a1a1a",
                  marginLeft: "-6px",
                  position: "relative",
                  zIndex: 0,
                }}
              >
                <span style={{ fontSize: "6px", fontWeight: 700, color: "rgba(255,255,255,0.4)" }}>
                  +{event.guest_count - 4}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Full width View event button */}
        <button
          className="w-full rounded-lg py-2 text-xs font-bold tracking-wide"
          style={{
            backgroundColor: accent,
            color: btnText,
            fontFamily: "'Playfair Display', serif",
            letterSpacing: "0.03em",
          }}
          onClick={(e) => {
            e.stopPropagation();
            navigate(navPath);
          }}
        >
          View event →
        </button>
      </div>
    </div>
  );
};

/** Noir Upcoming card — compact row */
const NoirUpcomingCard = ({ event, navigate }: { event: EventWithRole; navigate: ReturnType<typeof useNavigate> }) => {
  const accent = hslToColor(event.bubble_color, "#aaee44");
  const cardBg = event.bg_color ? `hsl(${event.bg_color})` : "#0a0a0a";

  return (
    <div
      className="rounded-xl px-3.5 py-3 cursor-pointer overflow-hidden relative"
      style={{ backgroundColor: cardBg, border: "1px solid rgba(255,255,255,0.08)" }}
      onClick={() => {
        const path = event.role === "host" ? `/event/${event.code}` : `/guest/${event.code}`;
        navigate(path);
      }}
    >
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex-1 mr-3 min-w-0">
          <h3
            className="truncate"
            style={{ fontFamily: "'Playfair Display', serif", fontSize: "14px", fontWeight: 700, color: "white" }}
          >
            {event.title || "Untitled Event"}
          </h3>
          <p className="truncate mt-0.5" style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
            {formatDate(event.date_time)} · {event.location || "Location TBD"}
          </p>
        </div>
        <RoleBadge role={event.role} accentColor={accent} />
      </div>
    </div>
  );
};

/** Galaxy Next Up card */
const GalaxyNextUpCard = ({ event, navigate }: { event: EventWithRole; navigate: ReturnType<typeof useNavigate> }) => {
  const accent = hslToColor(event.bubble_color, "#a855f7");
  const parsed = event.date_time ? parseISO(event.date_time) : null;
  const dayNum = parsed ? format(parsed, "d") : "?";
  const monthName = parsed ? format(parsed, "MMM").toUpperCase() : "TBD";
  const timeStr = parsed ? format(parsed, "h:mm a") : "";
  const navPath = event.role === "host" ? `/event/${event.code}` : `/guest/${event.code}`;

  return (
    <div
      className="rounded-2xl overflow-hidden relative cursor-pointer"
      style={{ backgroundColor: "#0d0d2b", border: "1px solid rgba(168,85,247,0.3)" }}
      onClick={() => navigate(navPath)}
    >
      <div
        style={{
          position: "absolute",
          top: "-20px",
          right: "-20px",
          width: "80px",
          height: "80px",
          borderRadius: "50%",
          background: "rgba(147,51,234,0.2)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "40px",
          left: "-15px",
          width: "50px",
          height: "50px",
          borderRadius: "50%",
          background: "rgba(236,72,153,0.12)",
          pointerEvents: "none",
        }}
      />

      <div className="relative z-10 p-3.5">
        <p
          style={{
            fontSize: "9px",
            color: accent,
            letterSpacing: "2px",
            textTransform: "uppercase" as const,
            marginBottom: "4px",
            fontFamily: "sans-serif",
          }}
        >
          ✦ you are invited to ✦
        </p>
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 800,
            fontSize: "1.15rem",
            color: "#fff",
            lineHeight: 1.2,
          }}
        >
          {event.title || "Untitled Event"}
        </span>

        <div className="flex items-center gap-3 mt-2.5 mb-3">
          <div className="flex-1 h-px" style={{ backgroundColor: "rgba(168,85,247,0.2)" }} />
          <span
            style={{
              fontSize: "8px",
              fontWeight: 600,
              letterSpacing: "0.22em",
              color: "rgba(255,255,255,0.3)",
              textTransform: "uppercase" as const,
              fontFamily: "sans-serif",
            }}
          >
            by {event.role === "host" ? "You" : "Host"}
          </span>
          <div className="flex-1 h-px" style={{ backgroundColor: "rgba(168,85,247,0.2)" }} />
        </div>

        <div className="flex gap-2 mb-3">
          <div
            className="flex-1 flex flex-col items-center justify-center rounded-lg py-2 px-2"
            style={{ background: "rgba(236,72,153,0.15)", border: "1px solid rgba(236,72,153,0.3)" }}
          >
            <span style={{ fontSize: "22px", fontWeight: 800, color: "#fff", lineHeight: 1, fontFamily: "sans-serif" }}>
              {dayNum}
            </span>
            <span
              style={{
                fontSize: "8px",
                fontWeight: 700,
                color: "#ec4899",
                textTransform: "uppercase" as const,
                letterSpacing: "0.12em",
                marginTop: "2px",
                fontFamily: "sans-serif",
              }}
            >
              {monthName}
            </span>
            {timeStr && (
              <span
                style={{ fontSize: "8px", color: "#ec4899", opacity: 0.6, marginTop: "1px", fontFamily: "sans-serif" }}
              >
                {timeStr}
              </span>
            )}
          </div>
          <div
            className="flex-1 flex flex-col justify-center rounded-lg py-2 px-2.5"
            style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)" }}
          >
            <span
              style={{
                fontSize: "8px",
                fontWeight: 600,
                color: accent,
                textTransform: "uppercase" as const,
                letterSpacing: "0.15em",
                fontFamily: "sans-serif",
              }}
            >
              Location
            </span>
            <span
              className="truncate mt-0.5"
              style={{ fontSize: "13px", fontWeight: 700, color: "white", fontFamily: "sans-serif" }}
            >
              {event.location || "TBD"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <span
            style={{
              fontSize: "8px",
              fontWeight: 600,
              color: "rgba(255,255,255,0.3)",
              textTransform: "uppercase" as const,
              letterSpacing: "0.18em",
              fontFamily: "sans-serif",
            }}
          >
            {event.guest_count > 0 ? `${event.guest_count} going` : "No one yet"}
          </span>
        </div>

        <button
          className="w-full rounded-lg py-2 text-xs font-bold"
          style={{
            background: `linear-gradient(90deg, ${accent}, #ec4899)`,
            color: "#fff",
            fontFamily: "sans-serif",
            letterSpacing: "0.03em",
          }}
          onClick={(e) => {
            e.stopPropagation();
            navigate(navPath);
          }}
        >
          View event →
        </button>
      </div>
    </div>
  );
};

/** Galaxy Upcoming card — compact row */
const GalaxyUpcomingCard = ({
  event,
  navigate,
}: {
  event: EventWithRole;
  navigate: ReturnType<typeof useNavigate>;
}) => {
  const accent = hslToColor(event.bubble_color, "#a855f7");
  return (
    <div
      className="rounded-xl px-3.5 py-3 cursor-pointer overflow-hidden relative"
      style={{ backgroundColor: "#0d0d2b", border: "1px solid rgba(168,85,247,0.25)" }}
      onClick={() => {
        const path = event.role === "host" ? `/event/${event.code}` : `/guest/${event.code}`;
        navigate(path);
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "-15px",
          right: "-15px",
          width: "50px",
          height: "50px",
          borderRadius: "50%",
          background: "rgba(147,51,234,0.15)",
          pointerEvents: "none",
        }}
      />
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex-1 mr-3 min-w-0">
          <div
            style={{
              fontSize: "9px",
              color: accent,
              letterSpacing: "1.5px",
              textTransform: "uppercase" as const,
              marginBottom: "2px",
              fontFamily: "sans-serif",
            }}
          >
            ✦ galaxy
          </div>
          <h3
            className="truncate"
            style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 800, color: "#fff" }}
          >
            {event.title || "Untitled Event"}
          </h3>
          <p
            className="truncate mt-0.5"
            style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", fontFamily: "sans-serif" }}
          >
            {formatDate(event.date_time)} · {event.location || "Location TBD"}
          </p>
        </div>
        <div
          style={{
            background: "rgba(168,85,247,0.2)",
            border: "1px solid rgba(168,85,247,0.4)",
            borderRadius: "20px",
            padding: "4px 10px",
            fontSize: "10px",
            fontWeight: 700,
            color: accent,
            whiteSpace: "nowrap" as const,
          }}
        >
          {event.role === "host" ? "Host" : event.role === "going" ? "Going" : "Maybe"}
        </div>
      </div>
    </div>
  );
};
/** Sunny Next Up card */
const SunnyNextUpCard = ({ event, navigate }: { event: EventWithRole; navigate: ReturnType<typeof useNavigate> }) => {
  const parsed = event.date_time ? parseISO(event.date_time) : null;
  const dayNum = parsed ? format(parsed, "d") : "?";
  const monthName = parsed ? format(parsed, "MMM").toUpperCase() : "TBD";
  const timeStr = parsed ? format(parsed, "h:mm a") : "";
  const navPath = event.role === "host" ? `/event/${event.code}` : `/guest/${event.code}`;

  return (
    <div
      className="rounded-2xl overflow-hidden relative cursor-pointer"
      style={{
        background: "linear-gradient(160deg, #ff6b35 0%, #ff8c00 50%, #2a0e00 100%)",
        border: "1px solid rgba(255,255,255,0.15)",
      }}
      onClick={() => navigate(navPath)}
    >
      <div
        style={{
          position: "absolute",
          top: "-30px",
          right: "-30px",
          width: "100px",
          height: "100px",
          borderRadius: "50%",
          background: "rgba(255,200,100,0.15)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          left: "-20px",
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          background: "rgba(255,150,50,0.1)",
          pointerEvents: "none",
        }}
      />

      <div className="relative z-10 p-3.5">
        <p
          style={{
            fontFamily: "'Caveat', cursive",
            fontSize: "13px",
            fontStyle: "italic",
            color: "rgba(255,255,255,0.6)",
            marginBottom: "2px",
          }}
        >
          you're invited to
        </p>
        <span
          style={{
            fontFamily: "'Caveat', cursive",
            fontWeight: 700,
            fontSize: "1.45rem",
            color: "#fff",
            lineHeight: 1.2,
          }}
        >
          {event.title || "Untitled Event"}
        </span>

        <div className="flex items-center gap-3 mt-2.5 mb-3">
          <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.2)" }} />
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px" }}>☀</span>
          <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.2)" }} />
        </div>

        <div className="flex gap-2 mb-3">
          <div
            className="flex-1 flex flex-col items-center justify-center rounded-2xl py-2 px-2"
            style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)" }}
          >
            <span
              style={{
                fontFamily: "'Caveat', cursive",
                fontSize: "24px",
                fontWeight: 700,
                color: "#fff",
                lineHeight: 1,
              }}
            >
              {dayNum}
            </span>
            <span
              style={{
                fontFamily: "'Caveat', cursive",
                fontSize: "10px",
                fontWeight: 700,
                color: "rgba(255,255,255,0.7)",
                textTransform: "uppercase" as const,
                letterSpacing: "0.1em",
                marginTop: "1px",
              }}
            >
              {monthName}
            </span>
            {timeStr && (
              <span
                style={{
                  fontFamily: "'Caveat', cursive",
                  fontSize: "10px",
                  color: "rgba(255,255,255,0.5)",
                  marginTop: "1px",
                }}
              >
                {timeStr}
              </span>
            )}
          </div>
          <div
            className="flex-1 flex flex-col justify-center rounded-2xl py-2 px-2.5"
            style={{ background: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <span
              style={{
                fontFamily: "'Caveat', cursive",
                fontSize: "10px",
                fontWeight: 700,
                color: "rgba(255,255,255,0.5)",
                textTransform: "uppercase" as const,
                letterSpacing: "0.1em",
              }}
            >
              Location
            </span>
            <span
              className="truncate mt-0.5"
              style={{ fontFamily: "'Caveat', cursive", fontSize: "15px", fontWeight: 700, color: "#fff" }}
            >
              {event.location || "TBD"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <span style={{ fontFamily: "'Caveat', cursive", fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
            {event.guest_count > 0 ? `${event.guest_count} going` : "No one yet"}
          </span>
        </div>

        <button
          className="w-full rounded-2xl py-2 text-sm font-bold"
          style={{
            backgroundColor: "rgba(255,255,255,0.9)",
            color: "#c8440a",
            fontFamily: "'Caveat', cursive",
            fontSize: "16px",
          }}
          onClick={(e) => {
            e.stopPropagation();
            navigate(navPath);
          }}
        >
          View event →
        </button>
      </div>
    </div>
  );
};

/** Sunny Upcoming card — compact row */
const SunnyUpcomingCard = ({ event, navigate }: { event: EventWithRole; navigate: ReturnType<typeof useNavigate> }) => {
  return (
    <div
      className="rounded-xl px-3.5 py-3 cursor-pointer overflow-hidden relative"
      style={{
        background: "linear-gradient(135deg, #ff6b35 0%, #ff8c00 60%, #2a0e00 100%)",
        border: "1px solid rgba(255,255,255,0.15)",
      }}
      onClick={() => {
        const path = event.role === "host" ? `/event/${event.code}` : `/guest/${event.code}`;
        navigate(path);
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "-10px",
          right: "-10px",
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          background: "rgba(255,200,100,0.2)",
          pointerEvents: "none",
        }}
      />
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex-1 mr-3 min-w-0">
          <div
            style={{
              fontFamily: "'Caveat', cursive",
              fontSize: "10px",
              color: "rgba(255,255,255,0.55)",
              letterSpacing: "1.5px",
              textTransform: "uppercase" as const,
              marginBottom: "2px",
            }}
          >
            ☀ sunny
          </div>
          <h3
            className="truncate"
            style={{ fontFamily: "'Caveat', cursive", fontSize: "16px", fontWeight: 700, color: "#fff" }}
          >
            {event.title || "Untitled Event"}
          </h3>
          <p
            className="truncate mt-0.5"
            style={{ fontFamily: "'Caveat', cursive", fontSize: "12px", color: "rgba(255,255,255,0.6)" }}
          >
            {formatDate(event.date_time)} · {event.location || "Location TBD"}
          </p>
        </div>
        <div
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "1px solid rgba(255,255,255,0.35)",
            borderRadius: "20px",
            padding: "4px 10px",
            fontFamily: "'Caveat', cursive",
            fontSize: "12px",
            fontWeight: 700,
            color: "#fff",
            whiteSpace: "nowrap" as const,
          }}
        >
          {event.role === "host" ? "Host" : event.role === "going" ? "Going" : "Maybe"}
        </div>
      </div>
    </div>
  );
};
/** Vintage Next Up card */
const VintageNextUpCard = ({ event, navigate }: { event: EventWithRole; navigate: ReturnType<typeof useNavigate> }) => {
  const parsed = event.date_time ? parseISO(event.date_time) : null;
  const dayNum = parsed ? format(parsed, "d") : "?";
  const monthName = parsed ? format(parsed, "MMM").toUpperCase() : "TBD";
  const timeStr = parsed ? format(parsed, "h:mm a") : "";
  const navPath = event.role === "host" ? `/event/${event.code}` : `/guest/${event.code}`;
  const accent = (event as any).gradient_color || "#8b7355";

  return (
    <div
      className="rounded-2xl overflow-hidden relative cursor-pointer"
      style={{ backgroundColor: "#f5f0e8", border: `1px solid ${accent}26` }}
      onClick={() => navigate(navPath)}
    >
      <VintageCircles accentColor={accent} />
      <div className="relative z-10 p-3.5">
        <p
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "10px",
            fontStyle: "italic",
            color: accent,
            marginBottom: "4px",
          }}
        >
          you're invited to
        </p>
        <span
          style={{
            fontFamily: "'Playfair Display', serif",
            fontWeight: 900,
            fontSize: "1.15rem",
            color: "#2c1810",
            lineHeight: 1.2,
          }}
        >
          {event.title || "Untitled Event"}
        </span>

        {/* ✦ divider */}
        <div className="flex items-center gap-3 mt-2.5 mb-3">
          <div className="flex-1 h-px" style={{ backgroundColor: `${accent}4d` }} />
          <span style={{ color: accent, fontSize: "10px" }}>✦</span>
          <div className="flex-1 h-px" style={{ backgroundColor: `${accent}4d` }} />
        </div>

        {/* Mini cards */}
        <div className="flex gap-2 mb-3">
          <div
            className="flex-1 flex flex-col items-center justify-center rounded-lg py-2 px-2"
            style={{ backgroundColor: "#2c1810" }}
          >
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "22px",
                fontWeight: 900,
                color: "#f5f0e8",
                lineHeight: 1,
              }}
            >
              {dayNum}
            </span>
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "8px",
                fontWeight: 700,
                color: accent,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                marginTop: "2px",
              }}
            >
              {monthName}
            </span>
            {timeStr && (
              <span
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "8px",
                  color: accent,
                  opacity: 0.6,
                  marginTop: "1px",
                }}
              >
                {timeStr}
              </span>
            )}
          </div>
          <div
            className="flex-1 flex flex-col justify-center rounded-lg py-2 px-2.5"
            style={{ backgroundColor: accent }}
          >
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "8px",
                fontWeight: 600,
                color: "#f5f0e8",
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                opacity: 0.7,
              }}
            >
              Location
            </span>
            <span
              className="truncate mt-0.5"
              style={{ fontFamily: "'Playfair Display', serif", fontSize: "13px", fontWeight: 700, color: "#f5f0e8" }}
            >
              {event.location || "TBD"}
            </span>
          </div>
        </div>

        {/* Going count */}
        <div className="flex items-center justify-between mb-3">
          <span
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "8px",
              fontWeight: 600,
              color: accent,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
            }}
          >
            {event.guest_count > 0 ? `${event.guest_count} going` : "No one yet"}
          </span>
        </div>

        <button
          className="w-full rounded-lg py-2 text-xs font-bold tracking-wide"
          style={{
            backgroundColor: "#2c1810",
            color: "#f5f0e8",
            fontFamily: "'Playfair Display', serif",
            letterSpacing: "0.03em",
          }}
          onClick={(e) => {
            e.stopPropagation();
            navigate(navPath);
          }}
        >
          View event →
        </button>
      </div>
    </div>
  );
};

/** Vintage Upcoming card — compact row */
const VintageUpcomingCard = ({
  event,
  navigate,
}: {
  event: EventWithRole;
  navigate: ReturnType<typeof useNavigate>;
}) => {
  const accent = (event as any).gradient_color || "#8b7355";
  return (
    <div
      className="rounded-xl px-3.5 py-3 cursor-pointer overflow-hidden relative"
      style={{ backgroundColor: "#f5f0e8", border: `1px solid ${accent}26` }}
      onClick={() => {
        const path = event.role === "host" ? `/event/${event.code}` : `/guest/${event.code}`;
        navigate(path);
      }}
    >
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex-1 mr-3 min-w-0">
          <h3
            className="truncate"
            style={{ fontFamily: "'Playfair Display', serif", fontSize: "14px", fontWeight: 700, color: "#2c1810" }}
          >
            {event.title || "Untitled Event"}
          </h3>
          <p
            className="truncate mt-0.5"
            style={{ fontFamily: "'Playfair Display', serif", fontSize: "11px", color: accent }}
          >
            {formatDate(event.date_time)} · {event.location || "Location TBD"}
          </p>
        </div>
        <RoleBadge role={event.role} accentColor={accent} />
      </div>
    </div>
  );
};

/** Ocean Next Up card */
/** Blush Next-Up card */
const BlushNextUpCard = ({ event, navigate }: { event: EventWithRole; navigate: ReturnType<typeof useNavigate> }) => {
  const parsed = event.date_time ? parseISO(event.date_time) : null;
  const dayNum = parsed ? format(parsed, "d") : "?";
  const monthName = parsed ? format(parsed, "MMM").toUpperCase() : "TBD";
  const timeStr = parsed ? format(parsed, "h:mm a") : "";
  const navPath = event.role === "host" ? `/event/${event.code}` : `/guest/${event.code}`;

  return (
    <div className="rounded-2xl overflow-hidden cursor-pointer" style={{ backgroundColor: "#1a0a10", border: "1px solid rgba(244,114,182,0.22)" }} onClick={() => navigate(navPath)}>
      {/* Header */}
      <div className="p-3.5 pb-2">
        {(event as any).vibe && (
          <div style={{ display: "inline-block", backgroundColor: "rgba(244,114,182,0.14)", border: "1px solid rgba(244,114,182,0.28)", borderRadius: "50px", padding: "3px 12px", marginBottom: "10px" }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "#f472b6" }}>{(event as any).vibe}</span>
          </div>
        )}
        <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: "1.15rem", color: "#fff", lineHeight: 1.2, display: "block", marginBottom: "4px" }}>{event.title || "Untitled Event"}</span>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", color: "rgba(244,114,182,0.4)", display: "block", marginBottom: "0" }}>hosted by you</span>
      </div>
      {/* Striped stat bar — no rounded corners */}
      <div style={{ display: "flex", borderTop: "1px solid rgba(244,114,182,0.18)", borderBottom: "1px solid rgba(244,114,182,0.18)" }}>
        <div style={{ flex: 1, backgroundColor: "rgba(244,114,182,0.1)", padding: "10px 6px", textAlign: "center" as const, borderRight: "1px solid rgba(244,114,182,0.18)" }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", fontWeight: 900, color: "#fff", display: "block", lineHeight: 1 }}>{dayNum}</span>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, color: "#f472b6", textTransform: "uppercase" as const, marginTop: "3px", display: "block" }}>{monthName}</span>
        </div>
        <div style={{ flex: 1, backgroundColor: "rgba(244,114,182,0.1)", padding: "10px 6px", textAlign: "center" as const, borderRight: "1px solid rgba(244,114,182,0.18)" }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: timeStr ? "14px" : "22px", fontWeight: 900, color: timeStr ? "#fff" : "rgba(255,255,255,0.18)", display: "block", lineHeight: 1.1 }}>{timeStr || "—"}</span>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, color: "#f472b6", textTransform: "uppercase" as const, marginTop: "3px", display: "block" }}>Start</span>
        </div>
        <div style={{ flex: 1, backgroundColor: "rgba(244,114,182,0.1)", padding: "10px 6px", textAlign: "center" as const }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", fontWeight: 900, color: "#fff", display: "block", lineHeight: 1 }}>{event.guest_count}</span>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, color: "#f472b6", textTransform: "uppercase" as const, marginTop: "3px", display: "block" }}>Going</span>
        </div>
      </div>
      {/* Location + CTA */}
      <div className="p-3.5 pt-3 flex flex-col gap-2">
        {event.location && (
          <div style={{ backgroundColor: "rgba(244,114,182,0.08)", border: "1px solid rgba(244,114,182,0.18)", borderRadius: "10px", padding: "8px 12px" }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "7px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" as const, color: "rgba(244,114,182,0.6)", display: "block", marginBottom: "2px" }}>Location</span>
            <span className="truncate" style={{ fontFamily: "'Playfair Display', serif", fontSize: "15px", fontWeight: 700, color: "#fff", display: "block" }}>{event.location}</span>
          </div>
        )}
        <button className="w-full rounded-lg py-2 text-xs font-bold tracking-wide" style={{ backgroundColor: "#f472b6", color: "#1a0a10", fontFamily: "'Inter', sans-serif" }} onClick={(e) => { e.stopPropagation(); navigate(navPath); }}>
          View event →
        </button>
      </div>
    </div>
  );
};

/** Blush Upcoming card — compact row */
const BlushUpcomingCard = ({ event, navigate }: { event: EventWithRole; navigate: ReturnType<typeof useNavigate> }) => (
  <div className="rounded-xl px-3.5 py-3 cursor-pointer" style={{ backgroundColor: "#1a0a10", border: "1px solid rgba(244,114,182,0.2)" }} onClick={() => { const p = event.role === "host" ? `/event/${event.code}` : `/guest/${event.code}`; navigate(p); }}>
    <div className="flex items-center justify-between">
      <div className="flex-1 mr-3 min-w-0">
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 700, color: "#f472b6", opacity: 0.7, letterSpacing: "1.5px", textTransform: "uppercase" as const, marginBottom: "2px" }}>✦ blush</div>
        <h3 className="truncate" style={{ fontFamily: "'Playfair Display', serif", fontSize: "14px", fontWeight: 700, color: "#fff" }}>{event.title || "Untitled Event"}</h3>
        <p className="truncate mt-0.5" style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>{formatDate(event.date_time)} · {event.location || "Location TBD"}</p>
      </div>
      <div style={{ backgroundColor: "rgba(244,114,182,0.12)", border: "1px solid rgba(244,114,182,0.25)", borderRadius: "50px", padding: "4px 10px", fontFamily: "'Inter', sans-serif", fontSize: "10px", fontWeight: 700, color: "#f472b6", whiteSpace: "nowrap" as const }}>
        {event.role === "host" ? "Host" : event.role === "going" ? "Going" : "Maybe"}
      </div>
    </div>
  </div>
);

/** Forest Next-Up card */
const ForestNextUpCard = ({ event, navigate }: { event: EventWithRole; navigate: ReturnType<typeof useNavigate> }) => {
  const parsed = event.date_time ? parseISO(event.date_time) : null;
  const dayNum = parsed ? format(parsed, "d") : null;
  const monthName = parsed ? format(parsed, "MMM").toUpperCase() : null;
  const timeStr = parsed ? format(parsed, "h:mm a") : null;
  const navPath = event.role === "host" ? `/event/${event.code}` : `/guest/${event.code}`;

  return (
    <div className="rounded-2xl overflow-hidden cursor-pointer relative" style={{ backgroundColor: "#0a1f0a", border: "1px solid rgba(74,222,128,0.22)" }} onClick={() => navigate(navPath)}>
      <div style={{ position: "absolute", inset: "7px", border: "1px solid rgba(74,222,128,0.08)", borderRadius: "5px", pointerEvents: "none" }} />
      <div className="relative z-10 p-3.5">
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase" as const, color: "rgba(74,222,128,0.55)", marginBottom: "6px" }}>An Invitation</p>
        <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: "1.15rem", color: "#fff", lineHeight: 1.2, display: "block", marginBottom: "12px" }}>{event.title || "Untitled Event"}</span>

        {/* Diamond divider */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
          <div style={{ flex: 1, height: "1px", backgroundColor: "rgba(74,222,128,0.25)" }} />
          <span style={{ color: "rgba(74,222,128,0.5)", fontSize: "11px" }}>◆</span>
          <div style={{ flex: 1, height: "1px", backgroundColor: "rgba(74,222,128,0.25)" }} />
        </div>

        {/* Single inline date · time · going */}
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.75)", marginBottom: "12px" }}>
          {dayNum ? `${dayNum} ${monthName}` : "—"}
          <span style={{ color: "rgba(74,222,128,0.45)", margin: "0 6px" }}>·</span>
          {timeStr || "—"}
          <span style={{ color: "rgba(74,222,128,0.45)", margin: "0 6px" }}>·</span>
          {event.guest_count} going
        </p>

        {event.location && (
          <div style={{ backgroundColor: "rgba(74,222,128,0.13)", border: "1px solid rgba(74,222,128,0.28)", borderRadius: "10px", padding: "8px 12px", marginBottom: "10px" }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "7px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" as const, color: "rgba(74,222,128,0.7)", display: "block", marginBottom: "2px" }}>Location</span>
            <span className="truncate" style={{ fontFamily: "'Playfair Display', serif", fontSize: "15px", fontWeight: 700, color: "#fff", display: "block" }}>{event.location}</span>
          </div>
        )}

        <button className="w-full rounded-lg py-2 text-xs font-bold tracking-wide" style={{ backgroundColor: "#4ade80", color: "#0a1f0a", fontFamily: "'Inter', sans-serif" }} onClick={(e) => { e.stopPropagation(); navigate(navPath); }}>
          View event →
        </button>
      </div>
    </div>
  );
};

/** Forest Upcoming card — compact row */
const ForestUpcomingCard = ({ event, navigate }: { event: EventWithRole; navigate: ReturnType<typeof useNavigate> }) => (
  <div className="rounded-xl px-3.5 py-3 cursor-pointer relative" style={{ backgroundColor: "#0a1f0a", border: "1px solid rgba(74,222,128,0.18)" }} onClick={() => { const p = event.role === "host" ? `/event/${event.code}` : `/guest/${event.code}`; navigate(p); }}>
    <div className="flex items-center justify-between relative z-10">
      <div className="flex-1 mr-3 min-w-0">
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 700, color: "#4ade80", opacity: 0.6, letterSpacing: "1.5px", textTransform: "uppercase" as const, marginBottom: "2px" }}>◆ forest</div>
        <h3 className="truncate" style={{ fontFamily: "'Playfair Display', serif", fontSize: "14px", fontWeight: 700, color: "#fff" }}>{event.title || "Untitled Event"}</h3>
        <p className="truncate mt-0.5" style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>{formatDate(event.date_time)} · {event.location || "Location TBD"}</p>
      </div>
      <div style={{ backgroundColor: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.22)", borderRadius: "50px", padding: "4px 10px", fontFamily: "'Inter', sans-serif", fontSize: "10px", fontWeight: 700, color: "#4ade80", whiteSpace: "nowrap" as const }}>
        {event.role === "host" ? "Host" : event.role === "going" ? "Going" : "Maybe"}
      </div>
    </div>
  </div>
);

const MidnightNextUpCard = ({ event, navigate }: { event: EventWithRole; navigate: ReturnType<typeof useNavigate> }) => {
  const parsed = event.date_time ? parseISO(event.date_time) : null;
  const dayNum = parsed ? format(parsed, "d") : "?";
  const monthName = parsed ? format(parsed, "MMM").toUpperCase() : "TBD";
  const timeStr = parsed ? format(parsed, "h:mm a") : "";
  const navPath = event.role === "host" ? `/event/${event.code}` : `/guest/${event.code}`;
  return (
    <div className="rounded-2xl overflow-hidden cursor-pointer" style={{ backgroundColor: "#ffffff", border: "1px solid rgba(0,0,0,0.12)" }} onClick={() => navigate(navPath)}>
      <div className="p-3.5 pb-2">
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 700, color: "rgba(0,0,0,0.35)", letterSpacing: "0.18em", textTransform: "uppercase" as const, marginBottom: "4px" }}>midnight</div>
        <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: "1.15rem", color: "#111", lineHeight: 1.2, display: "block", marginBottom: "4px" }}>{event.title || "Untitled Event"}</span>
      </div>
      <div style={{ display: "flex", borderTop: "1px solid rgba(0,0,0,0.08)", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
        {[{ label: monthName, value: dayNum }, { label: "Start", value: timeStr || "—" }, { label: "Going", value: String(event.guest_count) }].map((s, i) => (
          <div key={i} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.03)", padding: "10px 6px", textAlign: "center" as const, borderRight: i < 2 ? "1px solid rgba(0,0,0,0.07)" : undefined }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: i === 1 && timeStr ? "14px" : "22px", fontWeight: 900, color: "#111", display: "block", lineHeight: 1.1 }}>{s.value}</span>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, color: "rgba(0,0,0,0.35)", textTransform: "uppercase" as const, marginTop: "3px", display: "block" }}>{s.label}</span>
          </div>
        ))}
      </div>
      <div className="p-3.5 pt-3 flex flex-col gap-2">
        {event.location && (
          <div style={{ backgroundColor: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.07)", borderRadius: "10px", padding: "8px 12px" }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "7px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" as const, color: "rgba(0,0,0,0.35)", display: "block", marginBottom: "2px" }}>Location</span>
            <span className="truncate" style={{ fontFamily: "'Playfair Display', serif", fontSize: "15px", fontWeight: 700, color: "#111", display: "block" }}>{event.location}</span>
          </div>
        )}
        <button className="w-full rounded-lg py-2 text-xs font-bold tracking-wide" style={{ backgroundColor: "#111", color: "#fff", fontFamily: "'Inter', sans-serif" }} onClick={(e) => { e.stopPropagation(); navigate(navPath); }}>View event →</button>
      </div>
    </div>
  );
};

const MidnightUpcomingCard = ({ event, navigate }: { event: EventWithRole; navigate: ReturnType<typeof useNavigate> }) => (
  <div className="rounded-xl px-3.5 py-3 cursor-pointer" style={{ backgroundColor: "#ffffff", border: "1px solid rgba(0,0,0,0.12)" }} onClick={() => { const p = event.role === "host" ? `/event/${event.code}` : `/guest/${event.code}`; navigate(p); }}>
    <div className="flex items-center justify-between">
      <div className="flex-1 mr-3 min-w-0">
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 700, color: "rgba(0,0,0,0.35)", letterSpacing: "1.5px", textTransform: "uppercase" as const, marginBottom: "2px" }}>midnight</div>
        <h3 className="truncate" style={{ fontFamily: "'Playfair Display', serif", fontSize: "14px", fontWeight: 700, color: "#111" }}>{event.title || "Untitled Event"}</h3>
        <p className="truncate mt-0.5" style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", color: "rgba(0,0,0,0.4)" }}>{formatDate(event.date_time)} · {event.location || "Location TBD"}</p>
      </div>
      <div style={{ backgroundColor: "rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.12)", borderRadius: "50px", padding: "4px 10px", fontFamily: "'Inter', sans-serif", fontSize: "10px", fontWeight: 700, color: "#111", whiteSpace: "nowrap" as const }}>
        {event.role === "host" ? "Host" : event.role === "going" ? "Going" : "Maybe"}
      </div>
    </div>
  </div>
);

const CUSTOM_SOLID_COLOR_MAP: Record<string, string> = {
  "solid-softwhite": "#fafafa", "solid-cream": "#fdf6e3", "solid-blushpink": "#fde8f0",
  "solid-lavender": "#ede9fe", "solid-mint": "#ecfdf5", "solid-sky": "#e0f2fe",
  "solid-peach": "#fff7ed", "solid-lemon": "#fefce8",
};
const CUSTOM_SOLID_LIGHT_KEYS = new Set(Object.keys(CUSTOM_SOLID_COLOR_MAP));

const getCustomCardBg = (bgPhoto: string | null, bgColor?: string | null): { style: React.CSSProperties; isLight: boolean; hasStars: boolean } => {
  if (!bgPhoto) {
    const solidBg = bgColor ? `hsl(${bgColor})` : "#111111";
    const solidLight = bgColor ? parseFloat(bgColor.trim().split(/[\s,]+/)[2] ?? "0") > 55 : false;
    return { style: { backgroundColor: solidBg }, isLight: solidLight, hasStars: false };
  }
  if (bgPhoto.startsWith("solid-")) {
    const color = CUSTOM_SOLID_COLOR_MAP[bgPhoto] || "#111111";
    return { style: { backgroundColor: color }, isLight: CUSTOM_SOLID_LIGHT_KEYS.has(bgPhoto), hasStars: false };
  }
  if (bgPhoto.startsWith("http") || bgPhoto.startsWith("blob:")) {
    return { style: { backgroundImage: `url(${bgPhoto})`, backgroundSize: "cover", backgroundPosition: "center" }, isLight: false, hasStars: false };
  }
  // CSS gradient from Build It — apply directly so the card looks like a real mini preview
  if (
    bgPhoto.startsWith("linear-gradient") ||
    bgPhoto.startsWith("radial-gradient") ||
    bgPhoto.startsWith("conic-gradient") ||
    bgPhoto.startsWith("repeating-")
  ) {
    const isLight = bgColor ? parseFloat(bgColor.trim().split(/[\s,]+/)[2] ?? "0") > 55 : false;
    return { style: { background: bgPhoto }, isLight, hasStars: false };
  }
  switch (bgPhoto) {
    case "planit-pattern:retro-stars":    return { style: { backgroundColor: "#ede8d8" }, isLight: true,  hasStars: true };
    case "planit-pattern:checkerboard":   return { style: { backgroundImage: "repeating-linear-gradient(45deg,#000 25%,transparent 25%),repeating-linear-gradient(-45deg,#000 25%,transparent 25%),repeating-linear-gradient(45deg,transparent 75%,#000 75%),repeating-linear-gradient(-45deg,transparent 75%,#000 75%)", backgroundSize: "24px 24px", backgroundColor: "#fff" }, isLight: false, hasStars: false };
    case "planit-pattern:tie-dye":        return { style: { background: "radial-gradient(circle at 40% 35%, #ff6b9d, #ffd93d, #6bcb77, #4d96ff)" }, isLight: false, hasStars: false };
    case "planit-pattern:holographic":    return { style: { background: "conic-gradient(from 0deg at 50% 50%, #ff9de2, #a78bfa, #67e8f9, #86efac, #fde68a, #ff9de2)" }, isLight: true,  hasStars: false };
    case "planit-pattern:cherry-blossom": return { style: { background: "linear-gradient(160deg, #fce4ec, #f8bbd0)" }, isLight: true,  hasStars: false };
    case "planit-pattern:camo":           return { style: { backgroundColor: "#4a5240" }, isLight: false, hasStars: false };
    case "planit-pattern:blueprint":      return { style: { backgroundColor: "#0a1628", backgroundImage: "repeating-linear-gradient(rgba(56,189,248,0.15) 1px,transparent 1px),repeating-linear-gradient(90deg,rgba(56,189,248,0.15) 1px,transparent 1px)", backgroundSize: "20px 20px" }, isLight: false, hasStars: false };
    case "planit-pattern:groovy":         return { style: { backgroundColor: "#fdf6e3" }, isLight: true, hasStars: false };
    default:                              return { style: { backgroundColor: bgColor ? `hsl(${bgColor})` : "#111111" }, isLight: bgColor ? parseFloat(bgColor.trim().split(/[\s,]+/)[2] ?? "0") > 55 : false, hasStars: false };
  }
};

const CustomNextUpCard = ({ event, navigate }: { event: EventWithRole; navigate: ReturnType<typeof useNavigate> }) => {
  const accent = hslToColor(event.bubble_color, "#aaee44");
  const accentTxt = textForBubble(event.bubble_color) || "#111";
  const { style: bgStyle, isLight: bgIsLight, hasStars } = getCustomCardBg(event.bg_photo, event.bg_color);
  const textCol = bgIsLight ? "#111111" : "#ffffff";
  const textMuted = bgIsLight ? "rgba(17,17,17,0.6)" : "rgba(255,255,255,0.6)";
  const fontFamily = FONT_MAP[event.font_style || "Bold"] || FONT_MAP.Bold;
  const parsed = event.date_time ? parseISO(event.date_time) : null;
  const dayNum = parsed ? format(parsed, "d") : "?";
  const monthName = parsed ? format(parsed, "MMM").toUpperCase() : "TBD";
  const timeStr = parsed ? format(parsed, "h:mm a") : "—";
  const navPath = event.role === "host" ? `/event/${event.code}` : `/guest/${event.code}`;
  // Gently soften harsh AI gradients without killing the colour
  const softenedBgStyle: React.CSSProperties = bgStyle.background
    ? { ...bgStyle, background: `linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.22) 100%), ${bgStyle.background}` }
    : bgStyle;

  console.log(`[CustomNextUpCard] "${event.title}" bg_photo=${event.bg_photo?.slice(0,70)} softenedOverlay=rgba(0,0,0,0.08→0.22)`);

  return (
    <div className="overflow-hidden relative cursor-pointer" style={{ ...softenedBgStyle, borderRadius: 28 }} onClick={() => navigate(navPath)}>
      {hasStars && [0,1,2,3,4].map(i => (
        <span key={i} style={{ position: "absolute", left: `${[8,22,55,72,88][i]}%`, top: `${[15,55,25,70,40][i]}%`, fontSize: `${[18,13,22,15,11][i]}px`, color: "#b91c1c", opacity: 0.6, pointerEvents: "none" }}>★</span>
      ))}
      <div className="p-3.5 pb-0">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" as const, color: accent }}>Custom ✦</span>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 700, color: accent, border: `1px solid rgba(255,255,255,.18)`, borderRadius: "4px", padding: "2px 6px" }}>{event.role === "host" ? "Host" : event.role === "going" ? "Going" : "Maybe"}</span>
        </div>
        <h2 style={{ fontFamily, fontSize: "34px", fontWeight: 700, color: textCol, lineHeight: 1.0, marginBottom: "10px" }}>{event.title || "Untitled Event"}</h2>
      </div>
      {/* Stat bar */}
      <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,.12)", borderBottom: "1px solid rgba(255,255,255,.12)" }}>
        <div style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.15)", padding: "10px 8px", textAlign: "center" as const, borderRight: "1px solid rgba(255,255,255,.08)" }}>
          <span style={{ fontFamily, fontSize: "22px", fontWeight: 700, color: accent, display: "block", lineHeight: 1 }}>{dayNum}</span>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" as const, color: textMuted }}>{monthName}</span>
        </div>
        <div style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.15)", padding: "10px 8px", textAlign: "center" as const, borderRight: "1px solid rgba(255,255,255,.08)" }}>
          <span style={{ fontFamily, fontSize: "22px", fontWeight: 700, color: accent, display: "block", lineHeight: 1 }}>{timeStr}</span>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" as const, color: textMuted }}>Start</span>
        </div>
        <div style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.15)", padding: "10px 8px", textAlign: "center" as const }}>
          <span style={{ fontFamily, fontSize: "22px", fontWeight: 700, color: accent, display: "block", lineHeight: 1 }}>{event.guest_count}</span>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" as const, color: textMuted }}>Going</span>
        </div>
      </div>
      {event.location && (
        <div className="px-3.5 py-3">
          <div style={{ border: "1px solid rgba(255,255,255,.12)", borderRadius: "8px", padding: "10px 12px", backgroundColor: bgIsLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)" }}>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "7px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: accent, marginBottom: "3px" }}>Location</p>
            <p style={{ fontFamily, fontSize: "16px", fontWeight: 700, color: textCol, lineHeight: 1.1 }}>{event.location}</p>
          </div>
        </div>
      )}
      {!event.location && <div style={{ height: "14px" }} />}
    </div>
  );
};

const CustomUpcomingCard = ({ event, navigate }: { event: EventWithRole; navigate: ReturnType<typeof useNavigate> }) => {
  const accent = hslToColor(event.bubble_color, "#aaee44");
  const { style: bgStyle, isLight: bgIsLight } = getCustomCardBg(event.bg_photo, event.bg_color);
  const textCol = bgIsLight ? "#111111" : "#ffffff";
  const textMuted = bgIsLight ? "rgba(17,17,17,0.5)" : "rgba(255,255,255,0.35)";
  const fontFamily = FONT_MAP[event.font_style || "Bold"] || FONT_MAP.Bold;

  return (
    <div
      className="px-3.5 py-3 cursor-pointer relative"
      style={{ ...bgStyle, border: `1px solid ${accent}50`, borderLeft: `3px solid ${accent}` }}
      onClick={() => { const p = event.role === "host" ? `/event/${event.code}` : `/guest/${event.code}`; navigate(p); }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 mr-3 min-w-0">
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 700, color: accent, letterSpacing: "1.5px", textTransform: "uppercase" as const, marginBottom: "2px" }}>Custom ✦</div>
          <h3 className="truncate" style={{ fontFamily, fontSize: "16px", fontWeight: 700, color: textCol }}>{event.title || "Untitled Event"}</h3>
          <p className="truncate mt-0.5" style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", color: textMuted }}>{formatDate(event.date_time)} · {event.location || "Location TBD"}</p>
        </div>
        <div style={{ backgroundColor: `${accent}18`, border: `1px solid ${accent}40`, borderRadius: "4px", padding: "4px 10px", fontFamily: "'Inter', sans-serif", fontSize: "10px", fontWeight: 700, color: accent, whiteSpace: "nowrap" as const }}>
          {event.role === "host" ? "Host" : event.role === "going" ? "Going" : "Maybe"}
        </div>
      </div>
    </div>
  );
};

const OceanNextUpCard = ({ event, navigate }: { event: EventWithRole; navigate: ReturnType<typeof useNavigate> }) => {
  const accent = hslToColor(event.bubble_color, "#38bdf8");
  const parsed = event.date_time ? parseISO(event.date_time) : null;
  const dayNum = parsed ? format(parsed, "d") : "?";
  const monthName = parsed ? format(parsed, "MMM").toUpperCase() : "TBD";
  const timeStr = parsed ? format(parsed, "h:mm a") : "";
  const navPath = event.role === "host" ? `/event/${event.code}` : `/guest/${event.code}`;

  return (
    <div
      className="rounded-2xl overflow-hidden relative cursor-pointer"
      style={{ backgroundColor: "#0c1929", border: "1px solid rgba(56,189,248,0.2)" }}
      onClick={() => navigate(navPath)}
    >
      <div
        style={{
          position: "absolute",
          top: "-30px",
          right: "-30px",
          width: "130px",
          height: "130px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          left: "-20px",
          width: "70px",
          height: "70px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(14,165,233,0.05) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div className="relative z-10 p-3.5">
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "9px",
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase" as const,
            color: accent,
            opacity: 0.65,
            marginBottom: "4px",
          }}
        >
          you're invited to
        </p>
        <span
          style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 800,
            fontSize: "1.15rem",
            color: "#fff",
            lineHeight: 1.2,
          }}
        >
          {event.title || "Untitled Event"}
        </span>

        <div className="flex items-center gap-3 mt-2.5 mb-3">
          <div className="flex-1 h-px" style={{ backgroundColor: "rgba(56,189,248,0.15)" }} />
          <span style={{ color: accent, fontSize: "10px", opacity: 0.5 }}>— —</span>
          <div className="flex-1 h-px" style={{ backgroundColor: "rgba(56,189,248,0.15)" }} />
        </div>

        <div className="flex gap-2 mb-3">
          <div
            className="flex-1 flex flex-col items-center justify-center rounded-lg py-2 px-2"
            style={{ backgroundColor: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.2)" }}
          >
            <span
              style={{ fontFamily: "'Inter', sans-serif", fontSize: "22px", fontWeight: 900, color: "#fff", lineHeight: 1 }}
            >
              {dayNum}
            </span>
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "8px",
                fontWeight: 700,
                color: accent,
                textTransform: "uppercase" as const,
                letterSpacing: "0.12em",
                marginTop: "2px",
              }}
            >
              {monthName}
            </span>
            {timeStr && (
              <span
                style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", color: accent, opacity: 0.55, marginTop: "1px" }}
              >
                {timeStr}
              </span>
            )}
          </div>
          <div
            className="flex-1 flex flex-col justify-center rounded-lg py-2 px-2.5"
            style={{ backgroundColor: "rgba(10,24,41,0.7)", border: "1px solid rgba(56,189,248,0.1)" }}
          >
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: "8px",
                fontWeight: 600,
                color: accent,
                opacity: 0.55,
                textTransform: "uppercase" as const,
                letterSpacing: "0.15em",
              }}
            >
              Location
            </span>
            <span
              className="truncate mt-0.5"
              style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 700, color: "#fff" }}
            >
              {event.location || "TBD"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "8px",
              fontWeight: 600,
              color: "rgba(255,255,255,0.3)",
              textTransform: "uppercase" as const,
              letterSpacing: "0.18em",
            }}
          >
            {event.guest_count > 0 ? `${event.guest_count} going` : "No one yet"}
          </span>
        </div>

        <button
          className="w-full rounded-lg py-2 text-xs font-bold tracking-wide"
          style={{
            backgroundColor: accent,
            color: "#0c1929",
            fontFamily: "'Inter', sans-serif",
            letterSpacing: "0.03em",
          }}
          onClick={(e) => {
            e.stopPropagation();
            navigate(navPath);
          }}
        >
          View event →
        </button>
      </div>
    </div>
  );
};

/** Ocean Upcoming card — compact row */
const OceanUpcomingCard = ({ event, navigate }: { event: EventWithRole; navigate: ReturnType<typeof useNavigate> }) => {
  const accent = hslToColor(event.bubble_color, "#38bdf8");
  return (
    <div
      className="rounded-xl px-3.5 py-3 cursor-pointer overflow-hidden relative"
      style={{ backgroundColor: "#0c1929", border: "1px solid rgba(56,189,248,0.18)" }}
      onClick={() => {
        const path = event.role === "host" ? `/event/${event.code}` : `/guest/${event.code}`;
        navigate(path);
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "-10px",
          right: "-10px",
          width: "45px",
          height: "45px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(56,189,248,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex-1 mr-3 min-w-0">
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "9px",
              fontWeight: 700,
              color: accent,
              opacity: 0.6,
              letterSpacing: "1.5px",
              textTransform: "uppercase" as const,
              marginBottom: "2px",
            }}
          >
            ◈ ocean
          </div>
          <h3
            className="truncate"
            style={{ fontFamily: "'Inter', sans-serif", fontSize: "14px", fontWeight: 700, color: "#fff" }}
          >
            {event.title || "Untitled Event"}
          </h3>
          <p
            className="truncate mt-0.5"
            style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.35)" }}
          >
            {formatDate(event.date_time)} · {event.location || "Location TBD"}
          </p>
        </div>
        <div
          style={{
            backgroundColor: "rgba(56,189,248,0.1)",
            border: "1px solid rgba(56,189,248,0.3)",
            borderRadius: "20px",
            padding: "4px 10px",
            fontFamily: "'Inter', sans-serif",
            fontSize: "10px",
            fontWeight: 700,
            color: accent,
            whiteSpace: "nowrap" as const,
          }}
        >
          {event.role === "host" ? "Host" : event.role === "going" ? "Going" : "Maybe"}
        </div>
      </div>
    </div>
  );
};

/** Upcoming section with max 3 visible, fade on 3rd, and "See all" toggle */
const UpcomingSection = ({
  events,
  navigate,
}: {
  events: EventWithRole[];
  navigate: ReturnType<typeof useNavigate>;
}) => {
  const [showAll, setShowAll] = React.useState(false);
  const displayEvents = showAll ? events : events.slice(0, 3);
  const hasMore = events.length > 3;

  const renderCard = (event: EventWithRole, index: number) => {
    const isFaded = !showAll && index === 2 && hasMore;

    if (isGalaxy(event.template_name)) {
      return (
        <div key={event.id} style={{ opacity: isFaded ? 0.45 : 1, transition: "opacity 0.3s" }}>
          <GalaxyUpcomingCard event={event} navigate={navigate} />
        </div>
      );
    }

    if (isSunny(event.template_name)) {
      return (
        <div key={event.id} style={{ opacity: isFaded ? 0.45 : 1, transition: "opacity 0.3s" }}>
          <SunnyUpcomingCard event={event} navigate={navigate} />
        </div>
      );
    }

    if (isVintage(event.template_name)) {
      return (
        <div key={event.id} style={{ opacity: isFaded ? 0.45 : 1, transition: "opacity 0.3s" }}>
          <VintageUpcomingCard event={event} navigate={navigate} />
        </div>
      );
    }

    if (isNoir(event.template_name)) {
      return (
        <div key={event.id} style={{ opacity: isFaded ? 0.45 : 1, transition: "opacity 0.3s" }}>
          <NoirUpcomingCard event={event} navigate={navigate} />
        </div>
      );
    }

    if (isOcean(event.template_name)) {
      return (
        <div key={event.id} style={{ opacity: isFaded ? 0.45 : 1, transition: "opacity 0.3s" }}>
          <OceanUpcomingCard event={event} navigate={navigate} />
        </div>
      );
    }

    if (isBlush(event.template_name)) {
      return (
        <div key={event.id} style={{ opacity: isFaded ? 0.45 : 1, transition: "opacity 0.3s" }}>
          <BlushUpcomingCard event={event} navigate={navigate} />
        </div>
      );
    }

    if (isForest(event.template_name)) {
      return (
        <div key={event.id} style={{ opacity: isFaded ? 0.45 : 1, transition: "opacity 0.3s" }}>
          <ForestUpcomingCard event={event} navigate={navigate} />
        </div>
      );
    }

    if (isMidnight(event.template_name)) {
      return (
        <div key={event.id} style={{ opacity: isFaded ? 0.45 : 1, transition: "opacity 0.3s" }}>
          <MidnightUpcomingCard event={event} navigate={navigate} />
        </div>
      );
    }

    if (isCustomTemplate(event.template_name)) {
      return (
        <div key={event.id} style={{ opacity: isFaded ? 0.45 : 1, transition: "opacity 0.3s" }}>
          <CustomUpcomingCard event={event} navigate={navigate} />
        </div>
      );
    }

    const gradientHex = event.gradient_color || "#aaee44";
    const fontFamily = FONT_MAP[event.font_style || "Bold"] || FONT_MAP.Bold;

    return (
      <div
        key={event.id}
        className="rounded-xl px-3.5 py-3 cursor-pointer overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${gradientHex}99 0%, #2b2b2b 60%)`,
          border: `1px solid ${gradientHex}40`,
          opacity: isFaded ? 0.45 : 1,
          transition: "opacity 0.3s",
        }}
        onClick={() => {
          const path = event.role === "host" ? `/event/${event.code}` : `/guest/${event.code}`;
          navigate(path);
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 mr-3 min-w-0">
            <h3
              className="truncate"
              style={{
                color: "#ffffff",
                fontFamily,
                fontSize: "14px",
                fontWeight: event.font_style === "Bold" || !event.font_style ? 700 : 400,
              }}
            >
              {event.title || "Untitled Event"}
            </h3>
            <p className="truncate mt-0.5" style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>
              {formatDate(event.date_time)} · {event.location || "Location TBD"}
            </p>
          </div>
          <RoleBadge role={event.role} />
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto pb-4">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Upcoming</h2>
      <div className="space-y-3">{displayEvents.map((event, i) => renderCard(event, i))}</div>
      {hasMore && !showAll && (
        <div className="flex justify-center mt-3">
          <button
            onClick={() => setShowAll(true)}
            className="rounded-full px-4 py-1.5 text-xs font-semibold"
            style={{ backgroundColor: "#383838", color: "#3D7BFF" }}
          >
            See all events →
          </button>
        </div>
      )}
    </div>
  );
};

const Home = () => {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const queryClient = useQueryClient();
  const { data: events, isLoading } = useUserEvents(user?.id);

  React.useEffect(() => {
    const channel = supabase
      .channel("home-events-realtime")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "events" }, () => {
        queryClient.invalidateQueries({ queryKey: ["user-events", user?.id] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // Pending friend requests badge
  const { data: pendingRequests } = useQuery({
    queryKey: ["pending-friends", user?.id],
    enabled: !!user?.id,
    refetchInterval: 30000,
    queryFn: async () => {
      if (!user?.id) return 0;
      const { data } = await (supabase as any)
        .from("friendships")
        .select("id")
        .eq("recipient_id", user.id)
        .eq("status", "pending");
      return (data || []).length;
    },
  });
  const pendingCount = pendingRequests || 0;

  const { data: topFriendRequest } = useQuery({
    queryKey: ["top-friend-request", user?.id],
    enabled: !!user?.id && pendingCount > 0,
    refetchInterval: 30000,
    queryFn: async () => {
      if (!user?.id) return null;
      const { data: reqs } = await (supabase as any)
        .from("friendships")
        .select("id, requester_id")
        .eq("recipient_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1);
      if (!reqs?.length) return null;
      const req = reqs[0];
      const { data: p } = await supabase
        .from("profiles")
        .select("user_id, name, username, avatar_url")
        .eq("user_id", req.requester_id)
        .maybeSingle();
      // Count mutual friends
      const { data: myFriends } = await (supabase as any)
        .from("friendships")
        .select("requester_id, recipient_id")
        .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .eq("status", "accepted");
      const myFriendIds = new Set((myFriends || []).map((f: any) =>
        f.requester_id === user.id ? f.recipient_id : f.requester_id
      ));
      const { data: theirFriends } = await (supabase as any)
        .from("friendships")
        .select("requester_id, recipient_id")
        .or(`requester_id.eq.${req.requester_id},recipient_id.eq.${req.requester_id}`)
        .eq("status", "accepted");
      const mutuals = (theirFriends || []).filter((f: any) => {
        const other = f.requester_id === req.requester_id ? f.recipient_id : f.requester_id;
        return myFriendIds.has(other);
      }).length;
      return { friendshipId: req.id, requesterId: req.requester_id, profile: p, mutuals };
    },
  });

  const { data: unreadNotifs } = useQuery({
    queryKey: ["unread-notifs", user?.id],
    enabled: !!user?.id,
    refetchInterval: 30000,
    queryFn: async () => {
      if (!user?.id) return 0;
      const { data } = await (supabase as any)
        .from("notifications")
        .select("id")
        .eq("user_id", user.id)
        .eq("read", false);
      return (data || []).length;
    },
  });
  const unreadNotifCount = unreadNotifs || 0;

  // Redirect to onboarding only if username is missing AND the user hasn't
  // completed onboarding before (localStorage flag). This prevents an infinite
  // redirect loop when the username column doesn't exist in the database yet.
  useEffect(() => {
    if (!loading && user && profile && !(profile as any).username) {
      const done = localStorage.getItem(`planit_onboarding_${user.id}`);
      if (!done) navigate("/onboarding");
    }
  }, [loading, user, profile, navigate]);

  const hasEvents = events && events.length > 0;
  const nextEvent = hasEvents ? events[0] : null;
  const firstName = profile?.name?.split(" ")[0] || "there";

  // New user / no events
  if (!hasEvents && !isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background" style={{ paddingBottom: 80 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-[18px] pt-[54px] mb-5">
          <div>
            <div style={{ fontFamily: "'Space Grotesk', monospace", fontSize: 11, letterSpacing: ".5px", color: "#7a8088" }}>{getGreeting()}</div>
            <div style={{ fontWeight: 700, fontSize: 24, color: "#fff", lineHeight: 1.1 }}>{firstName}</div>
          </div>
          <div className="flex items-center gap-[10px]">
            <div className="relative">
              <button type="button" onClick={() => navigate("/notifications")} style={{ width: 38, height: 38, borderRadius: "50%", background: "#16181d", display: "flex", alignItems: "center", justifyContent: "center", border: "none" }}>
                <Bell className="w-[18px] h-[18px]" style={{ color: "#aeb4bc" }} />
              </button>
              {unreadNotifCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center font-bold" style={{ minWidth: 16, height: 16, padding: "0 4px", borderRadius: 8, background: "#C6F24E", color: "#0a0b0e", fontSize: 10, border: "2px solid #0a0b0e" }}>
                  {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
                </span>
              )}
            </div>
            <button type="button" onClick={() => navigate("/profile")} style={{ width: 38, height: 38, borderRadius: "50%", padding: 2, background: "linear-gradient(150deg,#3D7BFF,#22D3EE)", border: "none" }}>
              <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: "#2a2d34", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {profile?.avatar_url ? <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>{profile?.name?.charAt(0)?.toUpperCase() || "?"}</span>}
              </div>
            </button>
          </div>
        </div>
        {/* Create bar */}
        <div className="flex gap-[10px] px-[18px] mb-10">
          <button onClick={() => navigate("/host")} style={{ flex: 1, height: 48, borderRadius: 13, background: "linear-gradient(120deg,#3D7BFF,#22D3EE)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontWeight: 700, fontSize: 15, color: "#06121f", border: "none" }}>
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#06121f" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>Host
          </button>
          <button onClick={() => navigate("/join")} style={{ flex: 1, height: 48, borderRadius: 13, background: "#16181d", border: "1px solid #23262e", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontWeight: 600, fontSize: 15, color: "#cfd3da" }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#C6F24E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg>Join code
          </button>
        </div>
        <div className="flex flex-col items-center justify-center flex-1 gap-4 px-6">
          <h1 className="text-7xl font-extrabold tracking-tight" style={{ background: "linear-gradient(120deg, #3D7BFF, #22D3EE)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>covo</h1>
          <p className="text-muted-foreground text-center text-sm">Host or join an event to get started</p>
        </div>
        {/* Tab bar */}
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, height: 80, background: "rgba(12,13,16,.92)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderTop: "1px solid #1a1c22", display: "flex", alignItems: "flex-start", justifyContent: "space-around", paddingTop: 14, zIndex: 50 }}>
          <button type="button" onClick={() => navigate("/home")} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, background: "none", border: "none" }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#22D3EE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-8 9 8M5 10v10h14V10"/></svg>
            <span style={{ fontFamily: "'Space Grotesk',monospace", fontSize: 10, color: "#22D3EE" }}>Home</span>
          </button>
          <button type="button" onClick={() => navigate("/events")} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, background: "none", border: "none" }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#6a7078" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            <span style={{ fontFamily: "'Space Grotesk',monospace", fontSize: 10, color: "#6a7078" }}>Events</span>
          </button>
          <button type="button" onClick={() => navigate("/messages")} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, background: "none", border: "none" }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#6a7078" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
            <span style={{ fontFamily: "'Space Grotesk',monospace", fontSize: 10, color: "#6a7078" }}>Chats</span>
          </button>
          <button type="button" onClick={() => navigate("/profile")} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, background: "none", border: "none" }}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#6a7078" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>
            <span style={{ fontFamily: "'Space Grotesk',monospace", fontSize: 10, color: "#6a7078" }}>Profile</span>
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <div className="text-muted-foreground text-lg">Loading...</div>
      </div>
    );
  }

  const upcomingEvents = events.slice(1, 3);
  const daysUntil = getDaysUntil(nextEvent?.date_time ?? null);
  const nextUpLabel = daysUntil === 0 ? "NEXT UP · TODAY" : daysUntil === 1 ? "NEXT UP · TOMORROW" : daysUntil != null ? `NEXT UP · IN ${daysUntil} DAYS` : "NEXT UP";

  const handleAcceptFriend = async (friendshipId: string) => {
    await (supabase as any).from("friendships").update({ status: "accepted" }).eq("id", friendshipId);
    queryClient.invalidateQueries({ queryKey: ["pending-friends", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["top-friend-request", user?.id] });
  };
  const handleDeclineFriend = async (friendshipId: string) => {
    await (supabase as any).from("friendships").delete().eq("id", friendshipId);
    queryClient.invalidateQueries({ queryKey: ["pending-friends", user?.id] });
    queryClient.invalidateQueries({ queryKey: ["top-friend-request", user?.id] });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background" style={{ paddingBottom: 80 }}>
      <div className="overflow-y-auto flex-1">
        {/* Header */}
        <div className="flex items-center justify-between px-[18px] pt-[54px] mb-5">
          <div>
            <div style={{ fontFamily: "'Space Grotesk', monospace", fontSize: 11, letterSpacing: ".5px", color: "#7a8088" }}>{getGreeting()}</div>
            <div style={{ fontWeight: 700, fontSize: 24, color: "#fff", lineHeight: 1.1 }}>{firstName}</div>
          </div>
          <div className="flex items-center gap-[10px]">
            {/* Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => navigate("/notifications")}
                style={{ width: 38, height: 38, borderRadius: "50%", background: "#16181d", display: "flex", alignItems: "center", justifyContent: "center", border: "none" }}
              >
                <Bell className="w-[18px] h-[18px]" style={{ color: "#aeb4bc" }} />
              </button>
              {unreadNotifCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center font-bold" style={{ minWidth: 16, height: 16, padding: "0 4px", borderRadius: 8, background: "#C6F24E", color: "#0a0b0e", fontSize: 10, border: "2px solid #0a0b0e" }}>
                  {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
                </span>
              )}
            </div>
            {/* Avatar with gradient ring */}
            <button
              type="button"
              onClick={() => navigate("/profile")}
              style={{ width: 38, height: 38, borderRadius: "50%", padding: 2, background: "linear-gradient(150deg,#3D7BFF,#22D3EE)", border: "none" }}
            >
              <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: "#2a2d34", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <span style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>{profile?.name?.charAt(0)?.toUpperCase() || "?"}</span>}
              </div>
            </button>
          </div>
        </div>

        {/* Create bar */}
        <div className="flex gap-[10px] px-[18px] mb-6">
          <button
            onClick={() => navigate("/host")}
            style={{ flex: 1, height: 48, borderRadius: 13, background: "linear-gradient(120deg,#3D7BFF,#22D3EE)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontWeight: 700, fontSize: 15, color: "#06121f", border: "none" }}
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#06121f" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            Host
          </button>
          <button
            onClick={() => navigate("/join")}
            style={{ flex: 1, height: 48, borderRadius: 13, background: "#16181d", border: "1px solid #23262e", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontWeight: 600, fontSize: 15, color: "#cfd3da" }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#C6F24E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg>
            Join code
          </button>
        </div>

        {/* Next Up hero */}
        {nextEvent && (
          <div className="px-[18px] mb-6">
            <div style={{ fontFamily: "'Space Grotesk',monospace", fontSize: 11, letterSpacing: "2px", color: "#7a8088", marginBottom: 10 }}>{nextUpLabel}</div>
            {isGalaxy(nextEvent.template_name) ? (
              <GalaxyNextUpCard event={nextEvent} navigate={navigate} />
            ) : isSunny(nextEvent.template_name) ? (
              <SunnyNextUpCard event={nextEvent} navigate={navigate} />
            ) : isVintage(nextEvent.template_name) ? (
              <VintageNextUpCard event={nextEvent} navigate={navigate} />
            ) : isNoir(nextEvent.template_name) ? (
              <NoirNextUpCard event={nextEvent} navigate={navigate} />
            ) : isOcean(nextEvent.template_name) ? (
              <OceanNextUpCard event={nextEvent} navigate={navigate} />
            ) : isBlush(nextEvent.template_name) ? (
              <BlushNextUpCard event={nextEvent} navigate={navigate} />
            ) : isForest(nextEvent.template_name) ? (
              <ForestNextUpCard event={nextEvent} navigate={navigate} />
            ) : isMidnight(nextEvent.template_name) ? (
              <MidnightNextUpCard event={nextEvent} navigate={navigate} />
            ) : isCustomTemplate(nextEvent.template_name) ? (
              <CustomNextUpCard event={nextEvent} navigate={navigate} />
            ) : (
              <div
                style={{ position: "relative", borderRadius: 28, overflow: "hidden", cursor: "pointer" }}
                onClick={() => navigate(nextEvent.role === "host" ? `/event/${nextEvent.code}` : `/guest/${nextEvent.code}`)}
              >
                {(() => { console.log(`[Home hero generic] "${nextEvent.title}" heroColor=${getEventCardColor(nextEvent)} bottomVignette=rgba(6,7,9,.88→0)`); return null; })()}
                <div style={{ position: "absolute", inset: 0, background: getEventCardColor(nextEvent) }} />
                <div style={{ position: "absolute", inset: 0, background: BOKEH_OVERLAY }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(6,7,9,.88) 0%, rgba(6,7,9,.2) 45%, rgba(6,7,9,.0) 70%)" }} />
                <div style={{ position: "relative", padding: "18px 18px 20px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 240 }}>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <span style={{
                      background: nextEvent.role === "host" ? "rgba(255,255,255,.14)" : "#C6F24E",
                      color: nextEvent.role === "host" ? "#fff" : "#0a0b0e",
                      fontWeight: 700, fontSize: 12, padding: "5px 13px", borderRadius: 999,
                      backdropFilter: nextEvent.role === "host" ? "blur(6px)" : undefined,
                      border: nextEvent.role === "host" ? "1px solid rgba(255,255,255,.18)" : undefined
                    }}>
                      {nextEvent.role === "host" ? "Hosting" : nextEvent.role === "going" ? "Going" : "Maybe"}
                    </span>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: 38, color: "#fff", lineHeight: 1, letterSpacing: "-.5px" }}>{nextEvent.title || "Untitled Event"}</div>
                    {nextEvent.date_time && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#FFD27A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                        <span style={{ fontSize: 14, color: "#f0eae0" }}>{formatDate(nextEvent.date_time)}</span>
                      </div>
                    )}
                    {nextEvent.location && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#FFD27A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        <span style={{ fontSize: 14, color: "#f0eae0" }}>{nextEvent.location}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
                      <span style={{ fontSize: 13, color: "#cfc6ba" }}>{nextEvent.guest_count} going</span>
                      <div style={{ marginLeft: "auto", background: "#fff", color: "#0a0b0e", fontWeight: 700, fontSize: 14, padding: "9px 20px", borderRadius: 12 }}>Open →</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upcoming preview — max 2, from events[1..] */}
        {upcomingEvents.length > 0 && (
          <div className="px-[18px] mb-6">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontFamily: "'Space Grotesk',monospace", fontSize: 11, letterSpacing: "2px", color: "#7a8088" }}>UPCOMING</div>
              <button type="button" onClick={() => navigate("/events")} style={{ fontFamily: "'Space Grotesk',monospace", fontSize: 12, color: "#22D3EE", background: "none", border: "none", padding: 0 }}>See all →</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {upcomingEvents.map((event) => {
                // Use the same vivid CSS gradient the event page shows (bg_photo), not the dark canvas bg_color
                const isCssGradient = (s: string | null) => !!s && /^(linear|radial|conic|repeating)/.test(s);
                const cardBg = isCssGradient(event.bg_photo) ? event.bg_photo! : getEventCardColor(event);
                console.log(`[Home upcoming] "${event.title}" bg_photo="${event.bg_photo?.slice(0,60)}" bg_color=${event.bg_color} gradient_color=${event.gradient_color} → using ${isCssGradient(event.bg_photo) ? "bg_photo CSS gradient" : cardBg}`);
                const dt = event.date_time ? parseISO(event.date_time) : null;
                const dayNum = dt ? format(dt, "dd") : "--";
                const monthStr = dt ? format(dt, "MMM").toUpperCase() : "";
                const timeStr = dt ? format(dt, "h:mm a") : "";
                const roleLabel = event.role === "host" ? "Hosting" : event.role === "going" ? "Going" : "Maybe";
                const roleBg = event.role === "host" ? "rgba(255,255,255,0.14)" : "#C6F24E";
                const roleColor = event.role === "host" ? "#fff" : "#0a0b0e";
                return (
                  <div
                    key={event.id}
                    style={{ position: "relative", height: 96, borderRadius: 24, overflow: "hidden", cursor: "pointer" }}
                    onClick={() => navigate(event.role === "host" ? `/event/${event.code}` : `/guest/${event.code}`)}
                  >
                    <div style={{ position: "absolute", inset: 0, background: cardBg }} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(6,7,9,.55) 0%, rgba(6,7,9,.10) 55%, rgba(6,7,9,.0) 100%)" }} />
                    <div style={{ position: "absolute", inset: 0, padding: "0 18px", display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ textAlign: "center", flex: "none" }}>
                        <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: 24, color: "#FFD27A", lineHeight: 1 }}>{dayNum}</div>
                        <div style={{ fontFamily: "'Space Grotesk',monospace", fontSize: 10, color: "#b89a86", letterSpacing: 1 }}>{monthStr}</div>
                      </div>
                      <div style={{ width: 1, height: 46, background: "rgba(255,255,255,0.12)", flex: "none" }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: 20, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{event.title || "Untitled"}</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>{timeStr}{timeStr && " · "}{roleLabel}</div>
                      </div>
                      <span style={{ flex: "none", background: roleBg, color: roleColor, fontWeight: 700, fontSize: 12, padding: "6px 14px", borderRadius: 999 }}>{event.role === "host" ? "Host" : event.role === "going" ? "Going" : "Maybe"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Friend Requests condensed */}
        {pendingCount > 0 && (
          <div className="px-[18px] mb-6">
            <div style={{ borderRadius: 16, background: "#101116", border: "1px solid #1c1e24", padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <div style={{ fontFamily: "'Space Grotesk',monospace", fontSize: 11, letterSpacing: "1.5px", color: "#7a8088" }}>FRIEND REQUESTS</div>
                  <span style={{ minWidth: 20, height: 20, padding: "0 6px", borderRadius: 999, background: "#C6F24E", color: "#0a0b0e", fontWeight: 700, fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>{pendingCount}</span>
                </div>
                <button type="button" onClick={() => navigate("/friends")} style={{ fontFamily: "'Space Grotesk',monospace", fontSize: 12, color: "#22D3EE", background: "none", border: "none", padding: 0 }}>See all →</button>
              </div>
              {topFriendRequest && (
                <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#3D7BFF", flex: "none", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#fff", fontSize: 16 }}>
                    {topFriendRequest.profile?.avatar_url
                      ? <img src={topFriendRequest.profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : (topFriendRequest.profile?.name?.charAt(0)?.toUpperCase() || "?")}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>{topFriendRequest.profile?.name || "Someone"}</div>
                    <div style={{ fontFamily: "'Space Grotesk',monospace", fontSize: 12, color: "#7a8088" }}>{topFriendRequest.mutuals} mutual{topFriendRequest.mutuals !== 1 ? "s" : ""}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAcceptFriend(topFriendRequest.friendshipId)}
                    style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(120deg,#3D7BFF,#22D3EE)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", border: "none" }}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#06121f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeclineFriend(topFriendRequest.friendshipId)}
                    style={{ width: 34, height: 34, borderRadius: 10, background: "#1c1e24", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", border: "none" }}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#7a8088" strokeWidth="2.6" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom tab bar */}
      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, height: 80, background: "rgba(12,13,16,.92)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderTop: "1px solid #1a1c22", display: "flex", alignItems: "flex-start", justifyContent: "space-around", paddingTop: 14, zIndex: 50 }}>
        <button type="button" onClick={() => navigate("/home")} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, background: "none", border: "none" }}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#22D3EE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-8 9 8M5 10v10h14V10"/></svg>
          <span style={{ fontFamily: "'Space Grotesk',monospace", fontSize: 10, color: "#22D3EE" }}>Home</span>
        </button>
        <button type="button" onClick={() => navigate("/events")} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, background: "none", border: "none" }}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#6a7078" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          <span style={{ fontFamily: "'Space Grotesk',monospace", fontSize: 10, color: "#6a7078" }}>Events</span>
        </button>
        <button type="button" onClick={() => navigate("/messages")} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, background: "none", border: "none" }}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#6a7078" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
          <span style={{ fontFamily: "'Space Grotesk',monospace", fontSize: 10, color: "#6a7078" }}>Chats</span>
        </button>
        <button type="button" onClick={() => navigate("/profile")} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, background: "none", border: "none" }}>
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#6a7078" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>
          <span style={{ fontFamily: "'Space Grotesk',monospace", fontSize: 10, color: "#6a7078" }}>Profile</span>
        </button>
      </div>
    </div>
  );
};

export default Home;
