import React from "react";
import { useNavigate } from "react-router-dom";
import { User, Users } from "lucide-react";
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

const formatDate = (dt: string | null) => {
  if (!dt) return "Date TBD";
  try {
    return format(parseISO(dt), "EEE, MMM d · h:mm a");
  } catch {
    return "Date TBD";
  }
};

const RoleBadge = ({ role, accentColor }: { role: "host" | "going" | "maybe"; accentColor?: string }) => {
  const bg = accentColor || "#aaee44";
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
  // CSS gradient from Build It — use bg_color as the solid card background so it reads clearly at card size
  if (
    bgPhoto.startsWith("linear-gradient") ||
    bgPhoto.startsWith("radial-gradient") ||
    bgPhoto.startsWith("conic-gradient") ||
    bgPhoto.startsWith("repeating-")
  ) {
    const solidBg = bgColor ? `hsl(${bgColor})` : "#111111";
    const isLight = bgColor ? parseFloat(bgColor.trim().split(/[\s,]+/)[2] ?? "0") > 55 : false;
    return { style: { backgroundColor: solidBg }, isLight, hasStars: false };
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

  return (
    <div className="overflow-hidden relative cursor-pointer" style={{ ...bgStyle, border: `2px solid ${accent}` }} onClick={() => navigate(navPath)}>
      {hasStars && [0,1,2,3,4].map(i => (
        <span key={i} style={{ position: "absolute", left: `${[8,22,55,72,88][i]}%`, top: `${[15,55,25,70,40][i]}%`, fontSize: `${[18,13,22,15,11][i]}px`, color: "#b91c1c", opacity: 0.6, pointerEvents: "none" }}>★</span>
      ))}
      {/* Rainbow indicator strip */}
      <div style={{ height: "3px", background: "linear-gradient(90deg, #f857a6, #ff5858, #43e97b, #38f9d7, #4776e6)" }} />
      <div className="p-3.5 pb-0">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" as const, color: accent }}>Custom ✦</span>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 700, color: accent, border: `1px solid ${accent}40`, borderRadius: "4px", padding: "2px 6px" }}>{event.role === "host" ? "Host" : event.role === "going" ? "Going" : "Maybe"}</span>
        </div>
        <h2 style={{ fontFamily, fontSize: "34px", fontWeight: 700, color: textCol, lineHeight: 1.0, marginBottom: "10px" }}>{event.title || "Untitled Event"}</h2>
      </div>
      {/* Stat bar */}
      <div style={{ display: "flex", borderTop: `2px solid ${accent}`, borderBottom: `2px solid ${accent}` }}>
        <div style={{ flex: 1, backgroundColor: accent, padding: "10px 8px", textAlign: "center" as const, borderRight: "1px solid rgba(0,0,0,0.15)" }}>
          <span style={{ fontFamily, fontSize: "22px", fontWeight: 700, color: accentTxt, display: "block", lineHeight: 1 }}>{dayNum}</span>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" as const, color: `${accentTxt}99` }}>{monthName}</span>
        </div>
        <div style={{ flex: 1, backgroundColor: accent, padding: "10px 8px", textAlign: "center" as const, borderRight: "1px solid rgba(0,0,0,0.15)" }}>
          <span style={{ fontFamily, fontSize: "22px", fontWeight: 700, color: accentTxt, display: "block", lineHeight: 1 }}>{timeStr}</span>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" as const, color: `${accentTxt}99` }}>Start</span>
        </div>
        <div style={{ flex: 1, backgroundColor: accent, padding: "10px 8px", textAlign: "center" as const }}>
          <span style={{ fontFamily, fontSize: "22px", fontWeight: 700, color: accentTxt, display: "block", lineHeight: 1 }}>{event.guest_count}</span>
          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" as const, color: `${accentTxt}99` }}>Going</span>
        </div>
      </div>
      {event.location && (
        <div className="px-3.5 py-3">
          <div style={{ border: `1px solid ${accent}25`, borderRadius: "8px", padding: "10px 12px", backgroundColor: bgIsLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)" }}>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "7px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: accent, marginBottom: "3px" }}>Location</p>
            <p style={{ fontFamily, fontSize: "16px", fontWeight: 700, color: textCol, lineHeight: 1.1 }}>{event.location}</p>
          </div>
        </div>
      )}
      {!event.location && <div style={{ height: "14px" }} />}
      <div style={{ height: "3px", background: "linear-gradient(90deg, #4776e6, #38f9d7, #43e97b, #ff5858, #f857a6)" }} />
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
            style={{ backgroundColor: "#383838", color: "#aaee44" }}
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
  const { user, profile } = useAuth();
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

  const hasEvents = events && events.length > 0;
  const nextEvent = hasEvents ? events[0] : null;
  const firstName = profile?.name?.split(" ")[0] || "there";

  // New user / no events
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

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <div className="text-muted-foreground text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background px-5 pt-6 pb-4">
      {/* Top bar */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-muted-foreground text-sm">{getGreeting()}</p>
          <h1 className="text-2xl font-extrabold mt-0.5" style={{ color: "#ffffff" }}>
            {firstName}
          </h1>
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
          ) : isCustomTemplate(nextEvent.template_name) ? (
            <CustomNextUpCard event={nextEvent} navigate={navigate} />
          ) : (
            <div
              className="rounded-2xl p-3.5 cursor-pointer overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${nextEvent.gradient_color || "#aaee44"}99 0%, #1e1e1e 60%)`,
                border: `1px solid ${nextEvent.gradient_color || "#aaee44"}40`,
              }}
              onClick={() => {
                const path = nextEvent.role === "host" ? `/event/${nextEvent.code}` : `/guest/${nextEvent.code}`;
                navigate(path);
              }}
            >
              <div className="flex items-start justify-between mb-1.5">
                <h3
                  className="flex-1 mr-3"
                  style={{
                    color: "#ffffff",
                    fontFamily: FONT_MAP[nextEvent.font_style || "Bold"] || FONT_MAP.Bold,
                    fontWeight: nextEvent.font_style === "Bold" || !nextEvent.font_style ? 700 : 400,
                    fontSize: "1rem",
                  }}
                >
                  {nextEvent.title || "Untitled Event"}
                </h3>
                <RoleBadge role={nextEvent.role} />
              </div>
              <p className="mb-2.5" style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>
                🗓️ {formatDate(nextEvent.date_time)} · 📍 {nextEvent.location || "TBD"} · {nextEvent.guest_count} going
              </p>
              <button
                className="w-full rounded-lg py-1.5 text-xs font-bold"
                style={{
                  backgroundColor: hslToColor(nextEvent.bubble_color, "#aaee44"),
                  color: textForBubble(nextEvent.bubble_color),
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  const path = nextEvent.role === "host" ? `/event/${nextEvent.code}` : `/guest/${nextEvent.code}`;
                  navigate(path);
                }}
              >
                View event
              </button>
            </div>
          )}
        </div>
      )}

      {/* Divider */}
      <div className="mb-4" style={{ height: "1px", backgroundColor: "#333" }} />

      {/* Host & Join buttons */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={() => navigate("/host")}
          className="flex-1 rounded-full py-5 text-lg font-extrabold"
          style={{ backgroundColor: "#aaee44", color: "#111" }}
        >
          Host
        </button>
        <button
          onClick={() => navigate("/join")}
          className="flex-1 rounded-full py-5 text-lg font-extrabold"
          style={{ backgroundColor: "#383838", color: "#fff" }}
        >
          Join
        </button>
      </div>

      {/* Divider */}
      <div className="mb-4" style={{ height: "1px", backgroundColor: "#333" }} />

      {/* Upcoming section */}
      <UpcomingSection events={events} navigate={navigate} />
    </div>
  );
};

export default Home;
