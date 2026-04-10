import { useNavigate } from "react-router-dom";
import { User, MapPin, Calendar, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, isPast, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";

type EventWithRole = {
  id: string;
  code: string;
  title: string;
  date_time: string | null;
  location: string | null;
  role: "host" | "going" | "maybe";
  guest_count: number;
};

const useUserEvents = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["user-events", userId],
    enabled: !!userId,
    queryFn: async (): Promise<EventWithRole[]> => {
      if (!userId) return [];

      // Fetch hosted events
      const { data: hosted } = await supabase
        .from("events")
        .select("id, code, title, date_time, location")
        .eq("host_id", userId);

      // Fetch RSVPd events
      const { data: rsvps } = await supabase
        .from("event_guests")
        .select("event_id, rsvp_status")
        .eq("user_id", userId);

      const rsvpMap = new Map(
        (rsvps || []).map((r) => [r.event_id, r.rsvp_status])
      );

      // Fetch event details for RSVPd events (exclude already hosted)
      const hostedIds = new Set((hosted || []).map((e) => e.id));
      const guestEventIds = (rsvps || [])
        .map((r) => r.event_id)
        .filter((id) => !hostedIds.has(id));

      let guestEvents: typeof hosted = [];
      if (guestEventIds.length > 0) {
        const { data } = await supabase
          .from("events")
          .select("id, code, title, date_time, location")
          .in("id", guestEventIds);
        guestEvents = data || [];
      }

      // Get guest counts for all events
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

      // Filter to upcoming only and sort by date
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

const Home = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { data: events, isLoading } = useUserEvents(user?.id);

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
          <h1 className="text-2xl font-extrabold text-foreground mt-0.5">{firstName}</h1>
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
            className="rounded-2xl p-5 cursor-pointer"
            style={{ backgroundColor: "#1e1e1e" }}
            onClick={() => {
              const path = nextEvent.role === "host" ? `/event/${nextEvent.code}` : `/guest/${nextEvent.code}`;
              navigate(path);
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-bold text-foreground flex-1 mr-3">{nextEvent.title || "Untitled Event"}</h3>
              <RoleBadge role={nextEvent.role} />
            </div>
            <div className="space-y-1.5 text-sm text-muted-foreground mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatDate(nextEvent.date_time)}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" />
                <span>{nextEvent.location || "Location TBD"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5" />
                <span>{nextEvent.guest_count} going</span>
              </div>
            </div>
            <button
              className="w-full rounded-xl py-2.5 text-sm font-bold"
              style={{ backgroundColor: "#aaee44", color: "#111" }}
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
          {events.map((event) => (
            <div
              key={event.id}
              className="rounded-xl p-4 cursor-pointer"
              style={{ backgroundColor: "#383838" }}
              onClick={() => {
                const path = event.role === "host" ? `/event/${event.code}` : `/guest/${event.code}`;
                navigate(path);
              }}
            >
              <div className="flex items-start justify-between mb-1.5">
                <h3 className="text-base font-bold text-foreground flex-1 mr-3">{event.title || "Untitled Event"}</h3>
                <RoleBadge role={event.role} />
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatDate(event.date_time)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{event.location || "Location TBD"}</span>
                </div>
              </div>
            </div>
          ))}
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
