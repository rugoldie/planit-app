import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, X, Send, Maximize2, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  ConcentricCircles,
  StyledTitle,
  HostDivider,
  NoirDateCard,
  NoirDressCard,
  NoirLocationCard,
  NoirNotesCard,
  NoirAttendeeStrip,
} from "@/components/layouts/PlanitNoirLayout";
import { useAuth } from "@/contexts/AuthContext";

type Comment = { id: string; user_name: string; text: string; created_at: string; avatar_url?: string };
type RsvpEntry = { name: string; avatar_url?: string; status: string; user_id: string };

const GuestEventView = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rsvp, setRsvp] = useState<string | null>(null);
  const [barMinimised, setBarMinimised] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [draft, setDraft] = useState("");

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [showFullComments, setShowFullComments] = useState(false);
  const fullCommentInputRef = useRef<HTMLInputElement>(null);

  const [photos, setPhotos] = useState<{ id: string; photo_url: string }[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);

  const [rsvpList, setRsvpList] = useState<RsvpEntry[]>([]);
  const [guestListExpanded, setGuestListExpanded] = useState(false);
  const [hostName, setHostName] = useState<string>("Host");

  // Fetch event
  useEffect(() => {
    if (!code) return;
    supabase
      .from("events")
      .select("*")
      .eq("code", code)
      .single()
      .then(({ data }) => {
        setEvent(data);
        setLoading(false);
        // Fetch host name
        if (data?.host_id) {
          supabase
            .from("profiles_public" as any)
            .select("name")
            .eq("user_id", data.host_id)
            .single()
            .then(({ data: p }: any) => {
              if (p?.name) setHostName(p.name);
            });
        }
      });
  }, [code]);

  // Fetch RSVPs
  useEffect(() => {
    if (!event) return;
    const fetchRsvps = async () => {
      const { data } = await supabase.from("event_guests").select("user_id, rsvp_status").eq("event_id", event.id);
      if (data) {
        // Get profiles for all users
        const userIds = data.map((d: any) => d.user_id);
        const { data: profiles } = await supabase
          .from("profiles_public" as any)
          .select("user_id, name, avatar_url")
          .in("user_id", userIds);
        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        const list: RsvpEntry[] = data.map((d: any) => {
          const p = profileMap.get(d.user_id);
          return { name: p?.name || "Guest", avatar_url: p?.avatar_url, status: d.rsvp_status, user_id: d.user_id };
        });
        setRsvpList(list);
        // Set current user's RSVP
        if (user) {
          const mine = data.find((d: any) => d.user_id === user.id);
          if (mine) {
            setRsvp(mine.rsvp_status);
            setBarMinimised(true);
          }
        }
      }
    };
    fetchRsvps();

    // Realtime RSVPs
    const channel = supabase
      .channel(`rsvps-${event.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_guests", filter: `event_id=eq.${event.id}` },
        () => {
          fetchRsvps();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [event, user]);

  // Fetch comments
  useEffect(() => {
    if (!event) return;
    const fetchComments = async () => {
      const { data } = await supabase
        .from("comments")
        .select("*")
        .eq("event_id", event.id)
        .order("created_at", { ascending: true });
      if (data) {
        // Get avatar urls
        const userIds = [...new Set(data.map((c: any) => c.user_id))];
        const { data: profiles } = await supabase
          .from("profiles_public" as any)
          .select("user_id, avatar_url")
          .in("user_id", userIds);
        const avatarMap = new Map((profiles || []).map((p: any) => [p.user_id, p.avatar_url]));
        setComments(data.map((c: any) => ({ ...c, avatar_url: avatarMap.get(c.user_id) })));
      }
    };
    fetchComments();

    const channel = supabase
      .channel(`comments-${event.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments", filter: `event_id=eq.${event.id}` },
        () => {
          fetchComments();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [event]);

  // Fetch photos
  useEffect(() => {
    if (!event) return;
    const fetchPhotos = async () => {
      const { data } = await supabase
        .from("event_photos")
        .select("id, photo_url")
        .eq("event_id", event.id)
        .order("created_at", { ascending: true });
      if (data) setPhotos(data);
    };
    fetchPhotos();
    const channel = supabase
      .channel(`photos-${event.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "event_photos", filter: `event_id=eq.${event.id}` },
        () => fetchPhotos(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [event]);

  useEffect(() => {
    if (!event || !user) return;
    const hostId = event.host_id;
    const fetchDMs = async () => {
      const { data } = await supabase
        .from("direct_messages")
        .select("*")
        .eq("event_id", event.id)
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${hostId}),and(sender_id.eq.${hostId},receiver_id.eq.${user.id})`,
        )
        .order("created_at", { ascending: true });
      if (data) {
        setMessages(
          data.map((m: any) => ({
            id: m.id,
            from: m.sender_id === user.id ? "guest" : "host",
            text: m.text,
            time: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          })),
        );
      }
    };
    fetchDMs();
    const channel = supabase
      .channel(`guest-dms-${event.id}-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages", filter: `event_id=eq.${event.id}` },
        () => fetchDMs(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [event, user]);

  const goingList = useMemo(() => rsvpList.filter((r) => r.status === "yes"), [rsvpList]);
  const maybeList = useMemo(() => rsvpList.filter((r) => r.status === "maybe"), [rsvpList]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6">
        <p className="text-secondary-foreground font-bold text-xl">Event not found</p>
        <button
          onClick={() => navigate("/home")}
          className="mt-4 text-muted-foreground underline text-sm font-semibold"
        >
          Go home
        </button>
      </div>
    );
  }

  const titleClass =
    event.text_size === "Small"
      ? "text-lg font-bold"
      : event.text_size === "Large"
        ? "text-4xl font-extrabold"
        : "text-2xl font-extrabold";
  const vibeClass = event.text_size === "Small" ? "text-xs" : event.text_size === "Large" ? "text-base" : "text-sm";
  const bubbleTextClass =
    event.text_size === "Small"
      ? "text-xs font-medium"
      : event.text_size === "Large"
        ? "text-base font-bold"
        : "text-sm font-semibold";
  const hasBgImage =
    event.bg_photo &&
    (event.bg_photo.startsWith("blob:") ||
      event.bg_photo.startsWith("linear-gradient") ||
      event.bg_photo.startsWith("http"));
  const bgStyle: React.CSSProperties =
    hasBgImage && !event.bg_photo.startsWith("linear-gradient")
      ? { backgroundImage: `url(${event.bg_photo})`, backgroundSize: "cover", backgroundPosition: "center" }
      : hasBgImage
        ? { background: event.bg_photo }
        : { backgroundColor: `hsl(${event.bg_color})` };

  const bubbleBg = event.bubble_color ? `hsl(${event.bubble_color})` : undefined;
  const bubbleText = event.bubble_text_color ? `hsl(${event.bubble_text_color})` : undefined;

  const handleRsvp = async (response: string) => {
    if (!user || !event) return;
    setRsvp(response);

    const { data: existing } = await supabase
      .from("event_guests")
      .select("id")
      .eq("event_id", event.id)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      await supabase.from("event_guests").update({ rsvp_status: response }).eq("id", existing.id);
    } else {
      await supabase.from("event_guests").insert({ event_id: event.id, user_id: user.id, rsvp_status: response });
    }

    setTimeout(() => setBarMinimised(true), 1500);
  };

  const sendMessage = async () => {
    if (!draft.trim() || !user || !event) return;
    await supabase.from("direct_messages").insert({
      event_id: event.id,
      sender_id: user.id,
      receiver_id: event.host_id,
      text: draft.trim(),
    });
    setDraft("");
  };

  const sendComment = async () => {
    if (!commentDraft.trim() || !user || !event) return;
    const userName = profile?.name || "Guest";
    const text = commentDraft.trim();
    const optimistic: Comment = {
      id: crypto.randomUUID(),
      user_name: userName,
      text,
      created_at: new Date().toISOString(),
      avatar_url: profile?.avatar_url || undefined,
    };
    setComments((prev) => [...prev, optimistic]);
    setCommentDraft("");
    await supabase.from("comments").insert({
      event_id: event.id,
      user_id: user.id,
      user_name: userName,
      text,
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !event) return;
    setUploadingPhoto(true);
    const filePath = `${event.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from("event-photos").upload(filePath, file);
    if (uploadError) {
      setUploadingPhoto(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("event-photos").getPublicUrl(filePath);
    const photoUrl = urlData.publicUrl;
    setPhotos((prev) => [...prev, { id: crypto.randomUUID(), photo_url: photoUrl }]);
    await supabase.from("event_photos").insert({ event_id: event.id, user_id: user.id, photo_url: photoUrl });
    setUploadingPhoto(false);
    e.target.value = "";
  };

  const rsvpLabel = rsvp === "yes" ? "You're going! 🎉" : rsvp === "no" ? "You're not going 👎" : "You're a maybe 🤷";
  const getInitials = (name: string) => name.charAt(0).toUpperCase();

  const statusBadge = (status: string) => {
    if (status === "yes")
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">Going</span>
      );
    if (status === "maybe")
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Maybe</span>
      );
    return (
      <span
        className="text-[10px] font-bold px-2 py-0.5 rounded-full text-muted-foreground"
        style={{ backgroundColor: "#2b2b2b" }}
      >
        Can't make it
      </span>
    );
  };

  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const eventGradient = event.gradient_color || "#aaee44";
  const eventFontFamily =
    (
      {
        Bold: "'Bebas Neue', sans-serif",
        Handwritten: "'Caveat', cursive",
        Elegant: "'Playfair Display', serif",
      } as Record<string, string>
    )[event.font_style] || "'Bebas Neue', sans-serif";

  const accentColor = bubbleBg || "#aaee44";
  const accentText = bubbleText || "#111";

  // Auto-contrast for default template
  const isLightBg = (() => {
    if (!event.bg_color) return false;
    const parts = event.bg_color.trim().split(/[\s,]+/);
    const l = parseFloat(parts[2]);
    return l > 55;
  })();
  const bgTextColor = isLightBg ? "#111111" : "#ffffff";
  const bgTextMuted = isLightBg ? "rgba(17,17,17,0.6)" : "rgba(255,255,255,0.6)";
  const bgTextSoft = isLightBg ? "rgba(17,17,17,0.8)" : "rgba(255,255,255,0.8)";

  // Parse date parts
  const eventDate = event.date_time ? new Date(event.date_time) : null;
  const monthName = eventDate ? eventDate.toLocaleString(undefined, { month: "short" }).toUpperCase() : "";
  const dayNum = eventDate ? eventDate.getDate() : "";
  const timeStr = eventDate ? eventDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  const dayOfWeek = eventDate ? eventDate.toLocaleString(undefined, { weekday: "long" }) : "";

  const isNoir = (event as any).template_name === "planit-noir";
  const isVintage = ((event as any).template_name || "").toLowerCase() === "vintage";
  const isSunny = ((event as any).template_name || "").toLowerCase() === "sunny";
  const isGalaxy = ((event as any).template_name || "").toLowerCase() === "galaxy";
  const galaxyAccent = (event as any).bubble_color ? `hsl(${(event as any).bubble_color})` : "#a855f7";
  const vintageAccent = (event as any).gradient_color || "#8b7355";
  const containerBg = isSunny
    ? "transparent"
    : isGalaxy
      ? "#0d0d2b"
      : event.bg_color
        ? `hsl(${event.bg_color})`
        : isNoir
          ? "#0a0a0a"
          : "#1a1a1a";
  const noirFontSize = event.text_size === "Small" ? "28px" : event.text_size === "Large" ? "44px" : "36px";

  const SUNNY_ORANGE = "#ff6b35";
  const SUNNY_AMBER = "#ff8c00";
  const SUNNY_DARK = "#1a0a00";
  const SUNNY_FF = "'Caveat', cursive";

  return (
    <div
      className="flex flex-col min-h-screen pb-28"
      style={
        isSunny
          ? { background: `linear-gradient(180deg, ${SUNNY_ORANGE} 0%, ${SUNNY_AMBER} 30%, ${SUNNY_DARK} 70%)` }
          : { backgroundColor: containerBg }
      }
    >
      {isNoir ? (
        /* ═══ PLANIT NOIR LAYOUT ═══ */
        <>
          <div className="relative" style={{ minHeight: "280px" }}>
            <ConcentricCircles accentColor={accentColor} />
            <div className="flex items-center justify-between px-5 pt-6 relative z-10">
              <button onClick={() => navigate("/home")}>
                <ArrowLeft className="w-6 h-6 text-white/40" />
              </button>
              <button onClick={() => setShowChat(true)} className="flex flex-col items-center gap-0.5">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
                >
                  <MessageCircle className="w-4 h-4 text-white/40" />
                </div>
                <span className="text-[9px] font-semibold text-white/40">Message host</span>
              </button>
            </div>
            <div className="relative z-10 px-6 pt-4 pb-4">
              <p
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "13px",
                  fontStyle: "italic",
                  color: "rgba(255,255,255,0.4)",
                }}
              >
                you're invited to
              </p>
              <div className="mt-2">
                <StyledTitle
                  title={event.title || "Untitled Event"}
                  accentColor={accentColor}
                  fontFamily={eventFontFamily}
                  fontSize={noirFontSize}
                />
              </div>
              {event.vibe && (
                <p
                  className="mt-2"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "13px",
                    fontStyle: "italic",
                    color: "rgba(255,255,255,0.4)",
                  }}
                >
                  {event.vibe}
                </p>
              )}
              <HostDivider hostName={hostName} />
            </div>
          </div>

          <div className="px-5 pt-2">
            <div className="flex flex-col gap-3">
              {(eventDate || event.dress_code) && (
                <div className="flex gap-3">
                  {eventDate && (
                    <NoirDateCard
                      monthName={monthName}
                      dayNum={String(dayNum)}
                      timeStr={timeStr}
                      accentColor={accentColor}
                    />
                  )}
                  {event.dress_code && <NoirDressCard dressCode={event.dress_code} />}
                </div>
              )}
              {event.location && <NoirLocationCard location={event.location} accentColor={accentColor} />}
              {event.extra && <NoirNotesCard notes={event.extra} accentColor={accentColor} />}
              <NoirAttendeeStrip goingList={goingList} accentColor={accentColor} getInitials={getInitials} />
            </div>
          </div>
        </>
      ) : isVintage ? (
        /* ═══ VINTAGE LAYOUT ═══ */
        <>
          <div style={{ backgroundColor: "#f5f0e8" }}>
            <div className="flex items-center justify-between px-5 pt-6">
              <button onClick={() => navigate("/home")}>
                <ArrowLeft className="w-6 h-6" style={{ color: vintageAccent }} />
              </button>
              <button onClick={() => setShowChat(true)} className="flex flex-col items-center gap-0.5">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center border"
                  style={{ borderColor: vintageAccent, backgroundColor: `${vintageAccent}1a` }}
                >
                  <MessageCircle className="w-4 h-4" style={{ color: vintageAccent }} />
                </div>
                <span className="text-[9px] font-semibold" style={{ color: vintageAccent }}>
                  Message host
                </span>
              </button>
            </div>
            <div className="text-center px-6 pt-6 pb-4">
              <p
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "11px",
                  letterSpacing: "0.15em",
                  color: vintageAccent,
                  textTransform: "uppercase" as const,
                  marginBottom: "8px",
                }}
              >
                You are invited to
              </p>
              <h1
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "36px",
                  fontWeight: 900,
                  color: "#2c1810",
                  lineHeight: 1.1,
                  marginBottom: "6px",
                }}
              >
                {event.title || "Untitled Event"}
              </h1>
              {event.vibe && (
                <p
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "14px",
                    fontStyle: "italic",
                    color: vintageAccent,
                    marginBottom: "8px",
                  }}
                >
                  {event.vibe}
                </p>
              )}
              <p
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "12px",
                  fontStyle: "italic",
                  color: vintageAccent,
                  marginBottom: "12px",
                }}
              >
                hosted by {hostName}
              </p>
              <div className="flex items-center gap-3 px-4">
                <div className="flex-1 h-px" style={{ backgroundColor: vintageAccent }} />
                <span style={{ color: vintageAccent, fontSize: "16px" }}>✦</span>
                <div className="flex-1 h-px" style={{ backgroundColor: vintageAccent }} />
              </div>
            </div>
            <div className="px-5 flex flex-col gap-3 pb-8">
              {event.location && (
                <div className="overflow-hidden" style={{ borderRadius: "16px" }}>
                  <div className="px-4 py-1.5" style={{ backgroundColor: "#5c3d1e" }}>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase" as const,
                        color: "#c9a87c",
                        fontFamily: "sans-serif",
                      }}
                    >
                      📍 Location
                    </span>
                  </div>
                  <div className="p-4 flex items-center justify-between" style={{ backgroundColor: vintageAccent }}>
                    <span
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: "20px",
                        fontWeight: 700,
                        color: "#f5f0e8",
                      }}
                    >
                      {event.location}
                    </span>
                    <span style={{ color: "#f5f0e8", opacity: 0.5, fontSize: "18px" }}>›</span>
                  </div>
                </div>
              )}
              {eventDate && (
                <div className="flex gap-3">
                  <div className="flex-1 overflow-hidden" style={{ borderRadius: "16px" }}>
                    <div className="px-3 py-1.5 text-center" style={{ backgroundColor: "#5c3d1e" }}>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase" as const,
                          color: "#c9a87c",
                          fontFamily: "sans-serif",
                        }}
                      >
                        Date
                      </span>
                    </div>
                    <div className="flex flex-col items-center py-4" style={{ backgroundColor: "#2c1810" }}>
                      <span
                        style={{
                          fontFamily: "'Playfair Display', serif",
                          fontSize: "40px",
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
                          fontSize: "14px",
                          color: vintageAccent,
                          marginTop: "4px",
                        }}
                      >
                        {monthName}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden" style={{ borderRadius: "16px" }}>
                    <div className="px-3 py-1.5 text-center" style={{ backgroundColor: "#5c3d1e" }}>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase" as const,
                          color: "#c9a87c",
                          fontFamily: "sans-serif",
                        }}
                      >
                        Time
                      </span>
                    </div>
                    <div className="flex flex-col items-center py-4" style={{ backgroundColor: "#2c1810" }}>
                      <span
                        style={{
                          fontFamily: "'Playfair Display', serif",
                          fontSize: "28px",
                          fontWeight: 900,
                          color: "#f5f0e8",
                          lineHeight: 1,
                        }}
                      >
                        {timeStr}
                      </span>
                      <span
                        style={{
                          fontFamily: "'Playfair Display', serif",
                          fontSize: "13px",
                          color: vintageAccent,
                          marginTop: "4px",
                        }}
                      >
                        {dayOfWeek}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {event.dress_code && (
                <div className="overflow-hidden" style={{ borderRadius: "16px" }}>
                  <div className="px-4 py-1.5 flex items-center gap-2" style={{ backgroundColor: "#5c3d1e" }}>
                    <span style={{ fontSize: "16px" }}>🎭</span>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase" as const,
                        color: "#c9a87c",
                        fontFamily: "sans-serif",
                      }}
                    >
                      Dress Code
                    </span>
                  </div>
                  <div className="p-4" style={{ backgroundColor: "#2c1810" }}>
                    <span
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: "20px",
                        fontWeight: 700,
                        color: "#f5f0e8",
                      }}
                    >
                      {event.dress_code}
                    </span>
                  </div>
                </div>
              )}
              {event.extra && (
                <div
                  className="p-4 flex items-start gap-3"
                  style={{ borderRadius: "16px", backgroundColor: "#2c1810", border: `1px solid ${vintageAccent}` }}
                >
                  <span style={{ color: vintageAccent, fontSize: "16px", marginTop: "2px" }}>✦</span>
                  <div className="flex-1">
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        letterSpacing: "0.12em",
                        textTransform: "uppercase" as const,
                        color: vintageAccent,
                        display: "block",
                        marginBottom: "4px",
                        fontFamily: "sans-serif",
                      }}
                    >
                      Notes from host
                    </span>
                    <span
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: "14px",
                        fontStyle: "italic",
                        color: "#c9a87c",
                        lineHeight: 1.5,
                      }}
                    >
                      {event.extra}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Vintage Who's going */}
            <div className="mx-5 mb-4 rounded-2xl p-4" style={{ backgroundColor: "#2c1810" }}>
              <button
                onClick={() => setGuestListExpanded(!guestListExpanded)}
                className="flex items-center justify-between w-full mb-3"
              >
                <h2
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#f5f0e8",
                  }}
                >
                  Who's going
                </h2>
                <div className="flex items-center gap-2">
                  {goingList.length > 0 && (
                    <span
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: vintageAccent,
                      }}
                    >
                      {goingList.length} going
                    </span>
                  )}
                  {guestListExpanded ? (
                    <ChevronUp className="w-4 h-4" style={{ color: vintageAccent }} />
                  ) : (
                    <ChevronDown className="w-4 h-4" style={{ color: vintageAccent }} />
                  )}
                </div>
              </button>
              <div className="flex items-center gap-2 overflow-x-auto">
                {goingList.length === 0 && (
                  <p
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: "12px",
                      color: vintageAccent,
                      opacity: 0.6,
                    }}
                  >
                    No one yet
                  </p>
                )}
                {goingList.map((r, i) => (
                  <div key={i} className="flex flex-col items-center shrink-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden"
                      style={{ border: `2px solid ${vintageAccent}`, backgroundColor: "#1a0e05" }}
                    >
                      {r.avatar_url ? (
                        <img src={r.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span style={{ fontSize: "12px", fontWeight: 700, color: vintageAccent }}>
                          {getInitials(r.name)}
                        </span>
                      )}
                    </div>
                    <span
                      style={{ fontFamily: "'Playfair Display', serif", fontSize: "10px", color: vintageAccent }}
                      className="mt-1 max-w-[40px] truncate"
                    >
                      {r.name.split(" ")[0]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Vintage Chat */}
            <div className="mx-5 mb-4 rounded-2xl p-4" style={{ backgroundColor: "#2c1810" }}>
              <div className="flex items-center justify-between mb-3">
                <h2
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#f5f0e8",
                  }}
                >
                  Chat
                </h2>
                <button onClick={() => setShowFullComments(true)}>
                  <Maximize2 className="w-4 h-4" style={{ color: vintageAccent }} />
                </button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                {comments.length === 0 && (
                  <p
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: "12px",
                      fontStyle: "italic",
                      color: vintageAccent,
                      opacity: 0.6,
                      textAlign: "center",
                      padding: "12px 0",
                    }}
                  >
                    No messages yet — be the first!
                  </p>
                )}
                {comments.map((c, i) => (
                  <div key={i} className="rounded-xl px-3 py-2" style={{ backgroundColor: "#1a0e05" }}>
                    <div className="flex items-center gap-2">
                      <span
                        style={{
                          fontFamily: "'Playfair Display', serif",
                          fontSize: "12px",
                          fontWeight: 700,
                          color: vintageAccent,
                        }}
                      >
                        {c.user_name}
                      </span>
                      <span style={{ fontSize: "10px", color: vintageAccent, opacity: 0.4 }}>
                        {formatTime(c.created_at)}
                      </span>
                    </div>
                    <p
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: "13px",
                        color: "#f5f0e8",
                        marginTop: "2px",
                      }}
                    >
                      {c.text}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendComment()}
                  placeholder="Write a message..."
                  className="flex-1 rounded-full px-4 py-2 text-sm outline-none"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    backgroundColor: "#1a0e05",
                    color: "#f5f0e8",
                    border: `1px solid ${vintageAccent}40`,
                  }}
                />
                <button
                  onClick={sendComment}
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: vintageAccent }}
                >
                  <Send className="w-4 h-4" style={{ color: "#f5f0e8" }} />
                </button>
              </div>
            </div>

            {/* Vintage Gallery */}
            <div className="mx-5 mb-8 rounded-2xl p-4" style={{ backgroundColor: "#2c1810" }}>
              <div className="flex items-center justify-between mb-3">
                <h2
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#f5f0e8",
                  }}
                >
                  Gallery
                </h2>
                <button
                  onClick={() => photoInput.current?.click()}
                  className="text-xs font-bold rounded-full px-3 py-1"
                  style={{ backgroundColor: vintageAccent, color: "#f5f0e8", fontFamily: "'Playfair Display', serif" }}
                >
                  Add photo
                </button>
                <input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </div>
              {uploadingPhoto && (
                <p
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "12px",
                    color: vintageAccent,
                    textAlign: "center",
                    padding: "8px 0",
                  }}
                >
                  Uploading...
                </p>
              )}
              {photos.length === 0 && !uploadingPhoto ? (
                <p
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "12px",
                    fontStyle: "italic",
                    color: vintageAccent,
                    opacity: 0.6,
                    textAlign: "center",
                    padding: "16px 0",
                  }}
                >
                  No photos yet — add the first one!
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {photos.map((p) => (
                    <div key={p.id} className="aspect-square rounded-xl overflow-hidden">
                      <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : isGalaxy ? (
        /* ═══ GALAXY LAYOUT ═══ */
        <>
          <div style={{ backgroundColor: "#0d0d2b", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
            {/* Background orbs */}
            <div
              style={{
                position: "absolute",
                top: "-40px",
                right: "-40px",
                width: "140px",
                height: "140px",
                borderRadius: "50%",
                background: "rgba(147,51,234,0.18)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "80px",
                left: "-30px",
                width: "90px",
                height: "90px",
                borderRadius: "50%",
                background: "rgba(236,72,153,0.12)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "200px",
                right: "-20px",
                width: "70px",
                height: "70px",
                borderRadius: "50%",
                background: "rgba(99,102,241,0.15)",
                pointerEvents: "none",
              }}
            />

            {/* Nav */}
            <div className="flex items-center justify-between px-5 pt-6 relative z-10">
              <button onClick={() => navigate("/home")}>
                <ArrowLeft className="w-6 h-6" style={{ color: "rgba(255,255,255,0.4)" }} />
              </button>
              <button onClick={() => setShowChat(true)} className="flex flex-col items-center gap-0.5">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)" }}
                >
                  <MessageCircle className="w-4 h-4" style={{ color: galaxyAccent }} />
                </div>
                <span className="text-[9px] font-semibold" style={{ color: galaxyAccent }}>
                  Message host
                </span>
              </button>
            </div>

            {/* Header */}
            <div className="text-center px-6 pt-6 pb-4 relative z-10">
              <p
                style={{
                  fontSize: "10px",
                  color: galaxyAccent,
                  letterSpacing: "2px",
                  textTransform: "uppercase" as const,
                  marginBottom: "6px",
                  fontFamily: "sans-serif",
                }}
              >
                ✦ You are invited to ✦
              </p>
              <h1
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "28px",
                  fontWeight: 800,
                  color: "#fff",
                  lineHeight: 1.1,
                  marginBottom: "4px",
                }}
              >
                {event.title || "Untitled Event"}
              </h1>
              {event.vibe && (
                <p
                  style={{
                    fontSize: "13px",
                    color: "rgba(255,255,255,0.45)",
                    fontStyle: "italic",
                    fontFamily: "sans-serif",
                    marginBottom: "8px",
                  }}
                >
                  {event.vibe}
                </p>
              )}
              <p
                style={{
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.3)",
                  fontFamily: "sans-serif",
                  marginBottom: "10px",
                }}
              >
                hosted by {hostName}
              </p>
              <div
                style={{
                  width: "40px",
                  height: "2px",
                  background: `linear-gradient(90deg, ${galaxyAccent}, #ec4899)`,
                  margin: "0 auto",
                }}
              />
            </div>

            {/* Info rows */}
            <div className="px-5 flex flex-col gap-3 relative z-10 pb-6">
              {event.location && (
                <div
                  style={{
                    background: "rgba(168,85,247,0.12)",
                    border: "1px solid rgba(168,85,247,0.3)",
                    borderRadius: "14px",
                    padding: "10px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      color: galaxyAccent,
                      textTransform: "uppercase" as const,
                      letterSpacing: "1px",
                      fontFamily: "sans-serif",
                    }}
                  >
                    📍 Location
                  </span>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#e9d5ff", fontFamily: "sans-serif" }}>
                    {event.location}
                  </span>
                </div>
              )}
              {eventDate && (
                <div
                  style={{
                    background: "rgba(236,72,153,0.12)",
                    border: "1px solid rgba(236,72,153,0.3)",
                    borderRadius: "14px",
                    padding: "10px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      color: "#ec4899",
                      textTransform: "uppercase" as const,
                      letterSpacing: "1px",
                      fontFamily: "sans-serif",
                    }}
                  >
                    🗓️ Date
                  </span>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#fce7f3", fontFamily: "sans-serif" }}>
                    {dayOfWeek} {dayNum} {monthName} · {timeStr}
                  </span>
                </div>
              )}
              {event.dress_code && (
                <div
                  style={{
                    background: "rgba(99,102,241,0.12)",
                    border: "1px solid rgba(99,102,241,0.3)",
                    borderRadius: "14px",
                    padding: "10px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      color: "#818cf8",
                      textTransform: "uppercase" as const,
                      letterSpacing: "1px",
                      fontFamily: "sans-serif",
                    }}
                  >
                    🎭 Dress code
                  </span>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#e0e7ff", fontFamily: "sans-serif" }}>
                    {event.dress_code}
                  </span>
                </div>
              )}
              {event.extra && (
                <div
                  style={{
                    background: "rgba(168,85,247,0.08)",
                    border: "1px solid rgba(168,85,247,0.15)",
                    borderRadius: "14px",
                    padding: "10px 14px",
                  }}
                >
                  <p
                    style={{
                      fontSize: "10px",
                      color: galaxyAccent,
                      textTransform: "uppercase" as const,
                      letterSpacing: "1px",
                      marginBottom: "4px",
                      fontFamily: "sans-serif",
                    }}
                  >
                    ✦ Note from host
                  </p>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "rgba(255,255,255,0.55)",
                      fontStyle: "italic",
                      fontFamily: "sans-serif",
                    }}
                  >
                    {event.extra}
                  </p>
                </div>
              )}

              {/* Who's going */}
              <div
                style={{
                  background: "rgba(168,85,247,0.08)",
                  border: "1px solid rgba(168,85,247,0.15)",
                  borderRadius: "14px",
                  padding: "12px 14px",
                }}
              >
                <button
                  onClick={() => setGuestListExpanded(!guestListExpanded)}
                  className="flex items-center justify-between w-full mb-2"
                >
                  <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#fff", fontFamily: "sans-serif" }}>
                    Who's going
                  </h2>
                  <div className="flex items-center gap-2">
                    {goingList.length > 0 && (
                      <span
                        style={{ fontSize: "11px", fontWeight: 700, color: galaxyAccent, fontFamily: "sans-serif" }}
                      >
                        {goingList.length} going
                      </span>
                    )}
                    {guestListExpanded ? (
                      <ChevronUp className="w-4 h-4" style={{ color: galaxyAccent }} />
                    ) : (
                      <ChevronDown className="w-4 h-4" style={{ color: galaxyAccent }} />
                    )}
                  </div>
                </button>
                <div className="flex items-center gap-2 overflow-x-auto">
                  {goingList.length === 0 && (
                    <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", fontFamily: "sans-serif" }}>
                      No one yet
                    </p>
                  )}
                  {goingList.map((r, i) => (
                    <div key={i} className="flex flex-col items-center shrink-0">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden"
                        style={{ border: `2px solid ${galaxyAccent}`, backgroundColor: "#1a0a2e" }}
                      >
                        {r.avatar_url ? (
                          <img src={r.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span style={{ fontSize: "12px", fontWeight: 700, color: galaxyAccent }}>
                            {getInitials(r.name)}
                          </span>
                        )}
                      </div>
                      <span
                        style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", fontFamily: "sans-serif" }}
                        className="mt-1 max-w-[40px] truncate"
                      >
                        {r.name.split(" ")[0]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat */}
              <div
                style={{
                  background: "rgba(168,85,247,0.08)",
                  border: "1px solid rgba(168,85,247,0.15)",
                  borderRadius: "14px",
                  padding: "12px 14px",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#fff", fontFamily: "sans-serif" }}>Chat</h2>
                  <button onClick={() => setShowFullComments(true)}>
                    <Maximize2 className="w-4 h-4" style={{ color: galaxyAccent }} />
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                  {comments.length === 0 && (
                    <p
                      style={{
                        fontSize: "12px",
                        color: "rgba(255,255,255,0.3)",
                        textAlign: "center",
                        padding: "12px 0",
                        fontFamily: "sans-serif",
                      }}
                    >
                      No messages yet — be the first!
                    </p>
                  )}
                  {comments.map((c, i) => (
                    <div key={i} className="rounded-xl px-3 py-2" style={{ backgroundColor: "rgba(26,10,46,0.8)" }}>
                      <div className="flex items-center gap-2">
                        <span
                          style={{ fontSize: "12px", fontWeight: 700, color: galaxyAccent, fontFamily: "sans-serif" }}
                        >
                          {c.user_name}
                        </span>
                        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", fontFamily: "sans-serif" }}>
                          {formatTime(c.created_at)}
                        </span>
                      </div>
                      <p style={{ fontSize: "13px", color: "#e9d5ff", marginTop: "2px", fontFamily: "sans-serif" }}>
                        {c.text}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendComment()}
                    placeholder="Write a message..."
                    className="flex-1 rounded-full px-4 py-2 text-sm outline-none"
                    style={{
                      backgroundColor: "rgba(26,10,46,0.8)",
                      color: "#e9d5ff",
                      border: `1px solid rgba(168,85,247,0.3)`,
                    }}
                  />
                  <button
                    onClick={sendComment}
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: `linear-gradient(135deg, ${galaxyAccent}, #ec4899)` }}
                  >
                    <Send className="w-4 h-4" style={{ color: "#fff" }} />
                  </button>
                </div>
              </div>

              {/* Gallery */}
              <div
                style={{
                  background: "rgba(168,85,247,0.08)",
                  border: "1px solid rgba(168,85,247,0.15)",
                  borderRadius: "14px",
                  padding: "12px 14px",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#fff", fontFamily: "sans-serif" }}>
                    Gallery
                  </h2>
                  <button
                    onClick={() => photoInput.current?.click()}
                    className="text-xs font-bold rounded-full px-3 py-1"
                    style={{
                      background: `linear-gradient(135deg, ${galaxyAccent}, #ec4899)`,
                      color: "#fff",
                      fontFamily: "sans-serif",
                    }}
                  >
                    Add photo
                  </button>
                  <input
                    ref={photoInput}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </div>
                {uploadingPhoto && (
                  <p
                    style={{
                      fontSize: "12px",
                      color: galaxyAccent,
                      textAlign: "center",
                      padding: "8px 0",
                      fontFamily: "sans-serif",
                    }}
                  >
                    Uploading...
                  </p>
                )}
                {photos.length === 0 && !uploadingPhoto ? (
                  <p
                    style={{
                      fontSize: "12px",
                      color: "rgba(255,255,255,0.3)",
                      textAlign: "center",
                      padding: "16px 0",
                      fontFamily: "sans-serif",
                    }}
                  >
                    No photos yet — add the first one!
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5">
                    {photos.map((p) => (
                      <div key={p.id} className="aspect-square rounded-xl overflow-hidden">
                        <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : isSunny ? (
        /* ═══ SUNNY LAYOUT ═══ */
        <>
          <div
            style={{
              background: "linear-gradient(180deg, #ff6b35 0%, #ff8c00 40%, #2a0e00 100%)",
              minHeight: "100vh",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "-60px",
                right: "-60px",
                width: "180px",
                height: "180px",
                borderRadius: "50%",
                background: "rgba(255,200,100,0.15)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "60px",
                left: "-40px",
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                background: "rgba(255,150,50,0.1)",
                pointerEvents: "none",
              }}
            />

            {/* Nav */}
            <div className="flex items-center justify-between px-5 pt-6 relative z-10">
              <button onClick={() => navigate("/home")}>
                <ArrowLeft className="w-6 h-6 text-white/60" />
              </button>
              <button onClick={() => setShowChat(true)} className="flex flex-col items-center gap-0.5">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}
                >
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
                <span className="text-[9px] font-semibold text-white/70" style={{ fontFamily: SUNNY_FF }}>
                  Message host
                </span>
              </button>
            </div>

            {/* Header */}
            <div className="text-center px-6 pt-6 pb-4 relative z-10">
              <p
                style={{
                  fontFamily: SUNNY_FF,
                  fontSize: "14px",
                  color: "rgba(255,255,255,0.6)",
                  fontStyle: "italic",
                  marginBottom: "4px",
                }}
              >
                you're invited to
              </p>
              <h1
                style={{
                  fontFamily: SUNNY_FF,
                  fontSize: "52px",
                  fontWeight: 700,
                  color: "#fff",
                  lineHeight: 1.1,
                  marginBottom: "4px",
                }}
              >
                {event.title || "Untitled Event"}
              </h1>
              {event.vibe && (
                <p
                  style={{
                    fontFamily: SUNNY_FF,
                    fontSize: "16px",
                    fontStyle: "italic",
                    color: "rgba(255,255,255,0.7)",
                    marginBottom: "4px",
                  }}
                >
                  {event.vibe}
                </p>
              )}
              <p
                style={{ fontFamily: SUNNY_FF, fontSize: "13px", color: "rgba(255,255,255,0.4)", marginBottom: "12px" }}
              >
                hosted by {hostName}
              </p>
              <div className="flex items-center gap-3 justify-center">
                <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.2)" }} />
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "16px" }}>☀</span>
                <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.2)" }} />
              </div>
            </div>

            {/* Info rows */}
            <div className="px-5 flex flex-col gap-3 relative z-10">
              {event.location && (
                <div
                  style={{
                    background: "rgba(255,255,255,0.2)",
                    border: "1px solid rgba(255,255,255,0.35)",
                    borderRadius: "50px",
                    padding: "10px 20px",
                    textAlign: "center" as const,
                  }}
                >
                  <span style={{ fontFamily: "'Caveat', cursive", fontSize: "20px", fontWeight: 700, color: "#fff" }}>
                    📍 {event.location}
                  </span>
                </div>
              )}
              {eventDate && (
                <div
                  style={{
                    background: "rgba(255,255,255,0.2)",
                    border: "1px solid rgba(255,255,255,0.35)",
                    borderRadius: "50px",
                    padding: "10px 20px",
                    textAlign: "center" as const,
                  }}
                >
                  <span style={{ fontFamily: "'Caveat', cursive", fontSize: "20px", fontWeight: 700, color: "#fff" }}>
                    🗓️ {dayOfWeek} {dayNum} {monthName} · {timeStr}
                  </span>
                </div>
              )}
              {event.dress_code && (
                <div
                  style={{
                    background: "rgba(255,255,255,0.2)",
                    border: "1px solid rgba(255,255,255,0.35)",
                    borderRadius: "50px",
                    padding: "10px 20px",
                    textAlign: "center" as const,
                  }}
                >
                  <span style={{ fontFamily: "'Caveat', cursive", fontSize: "20px", fontWeight: 700, color: "#fff" }}>
                    🎭 {event.dress_code}
                  </span>
                </div>
              )}
              {event.extra && (
                <div
                  style={{
                    background: "rgba(0,0,0,0.25)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "20px",
                    padding: "12px 16px",
                    textAlign: "center" as const,
                  }}
                >
                  <p
                    style={{
                      fontSize: "9px",
                      color: "rgba(255,255,255,0.5)",
                      textTransform: "uppercase" as const,
                      letterSpacing: "2px",
                      margin: "0 0 4px",
                      fontFamily: "sans-serif",
                    }}
                  >
                    ✦ from the host
                  </p>
                  <p
                    style={{
                      fontFamily: "'Caveat', cursive",
                      fontSize: "17px",
                      color: "rgba(255,255,255,0.85)",
                      margin: 0,
                      fontStyle: "italic",
                    }}
                  >
                    {event.extra}
                  </p>
                </div>
              )}

              {/* Who's going */}
              <div
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "16px",
                  padding: "12px 14px",
                }}
              >
                <button
                  onClick={() => setGuestListExpanded(!guestListExpanded)}
                  className="flex items-center justify-between w-full mb-2"
                >
                  <h2 style={{ fontFamily: SUNNY_FF, fontSize: "18px", fontWeight: 700, color: "#fff" }}>
                    Who's going
                  </h2>
                  <div className="flex items-center gap-2">
                    {goingList.length > 0 && (
                      <span
                        style={{
                          fontFamily: SUNNY_FF,
                          fontSize: "13px",
                          fontWeight: 700,
                          color: "rgba(255,255,255,0.6)",
                        }}
                      >
                        {goingList.length} going
                      </span>
                    )}
                    {guestListExpanded ? (
                      <ChevronUp className="w-4 h-4 text-white/60" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-white/60" />
                    )}
                  </div>
                </button>
                <div className="flex items-center gap-2 overflow-x-auto">
                  {goingList.length === 0 && (
                    <p style={{ fontFamily: SUNNY_FF, fontSize: "14px", color: "rgba(255,255,255,0.4)" }}>No one yet</p>
                  )}
                  {goingList.map((r, i) => (
                    <div key={i} className="flex flex-col items-center shrink-0">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden"
                        style={{ border: "2px solid rgba(255,255,255,0.4)", backgroundColor: "rgba(255,255,255,0.15)" }}
                      >
                        {r.avatar_url ? (
                          <img src={r.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span style={{ fontFamily: SUNNY_FF, fontSize: "14px", fontWeight: 700, color: "#fff" }}>
                            {getInitials(r.name)}
                          </span>
                        )}
                      </div>
                      <span
                        style={{ fontFamily: SUNNY_FF, fontSize: "12px", color: "rgba(255,255,255,0.6)" }}
                        className="mt-1 max-w-[40px] truncate"
                      >
                        {r.name.split(" ")[0]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat */}
              <div
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "16px",
                  padding: "12px 14px",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 style={{ fontFamily: SUNNY_FF, fontSize: "18px", fontWeight: 700, color: "#fff" }}>Chat</h2>
                  <button onClick={() => setShowFullComments(true)}>
                    <Maximize2 className="w-4 h-4 text-white/60" />
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                  {comments.length === 0 && (
                    <p
                      style={{
                        fontFamily: SUNNY_FF,
                        fontSize: "14px",
                        color: "rgba(255,255,255,0.4)",
                        textAlign: "center",
                        padding: "12px 0",
                      }}
                    >
                      No messages yet — be the first!
                    </p>
                  )}
                  {comments.map((c, i) => (
                    <div key={i} className="rounded-xl px-3 py-2" style={{ backgroundColor: "rgba(0,0,0,0.2)" }}>
                      <div className="flex items-center gap-2">
                        <span style={{ fontFamily: SUNNY_FF, fontSize: "14px", fontWeight: 700, color: "#fff" }}>
                          {c.user_name}
                        </span>
                        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)" }}>
                          {formatTime(c.created_at)}
                        </span>
                      </div>
                      <p
                        style={{
                          fontFamily: SUNNY_FF,
                          fontSize: "15px",
                          color: "rgba(255,255,255,0.85)",
                          marginTop: "2px",
                        }}
                      >
                        {c.text}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendComment()}
                    placeholder="Write a message..."
                    className="flex-1 rounded-full px-4 py-2 text-sm outline-none"
                    style={{
                      fontFamily: SUNNY_FF,
                      backgroundColor: "rgba(0,0,0,0.2)",
                      color: "#fff",
                      border: "1px solid rgba(255,255,255,0.2)",
                    }}
                  />
                  <button
                    onClick={sendComment}
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: "rgba(255,255,255,0.9)" }}
                  >
                    <Send className="w-4 h-4" style={{ color: "#c8440a" }} />
                  </button>
                </div>
              </div>

              {/* Gallery */}
              <div
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "16px",
                  padding: "12px 14px",
                  marginBottom: "20px",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 style={{ fontFamily: SUNNY_FF, fontSize: "18px", fontWeight: 700, color: "#fff" }}>Gallery</h2>
                  <button
                    onClick={() => photoInput.current?.click()}
                    className="text-xs font-bold rounded-full px-3 py-1"
                    style={{ backgroundColor: "rgba(255,255,255,0.9)", color: "#c8440a", fontFamily: SUNNY_FF }}
                  >
                    Add photo
                  </button>
                  <input
                    ref={photoInput}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </div>
                {uploadingPhoto && (
                  <p
                    style={{
                      fontFamily: SUNNY_FF,
                      fontSize: "14px",
                      color: "rgba(255,255,255,0.6)",
                      textAlign: "center",
                      padding: "8px 0",
                    }}
                  >
                    Uploading...
                  </p>
                )}
                {photos.length === 0 && !uploadingPhoto ? (
                  <p
                    style={{
                      fontFamily: SUNNY_FF,
                      fontSize: "14px",
                      color: "rgba(255,255,255,0.4)",
                      textAlign: "center",
                      padding: "16px 0",
                    }}
                  >
                    No photos yet — add the first one!
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5">
                    {photos.map((p) => (
                      <div key={p.id} className="aspect-square rounded-xl overflow-hidden">
                        <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* View event button */}
              <div
                style={{
                  background: "rgba(255,255,255,0.92)",
                  borderRadius: "14px",
                  padding: "12px",
                  textAlign: "center",
                  marginBottom: "100px",
                }}
              >
                <span style={{ fontFamily: SUNNY_FF, fontSize: "18px", fontWeight: 700, color: "#c8440a" }}>
                  You're going! ☀
                </span>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {!isVintage && !isSunny && !isGalaxy && (
        <div className="px-5">
          {/* Who's going section */}
          <div className="mt-4 rounded-2xl p-4" style={{ backgroundColor: "#1e1e1e" }}>
            <button
              onClick={() => setGuestListExpanded(!guestListExpanded)}
              className="flex items-center justify-between w-full mb-3"
            >
              <h2 className="text-white font-bold text-sm">Who's going</h2>
              <div className="flex items-center gap-2">
                {goingList.length > 0 && (
                  <span className="font-bold text-xs" style={{ color: accentColor }}>
                    {goingList.length} going
                  </span>
                )}
                {guestListExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {!guestListExpanded ? (
              <>
                <div className="flex items-center gap-2 overflow-x-auto mb-2">
                  {goingList.length === 0 && <p className="text-muted-foreground text-xs">No one yet</p>}
                  {goingList.map((r, i) => (
                    <div key={i} className="flex flex-col items-center shrink-0">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden"
                        style={{ border: `2px solid ${accentColor}`, backgroundColor: "#2a2a2a" }}
                      >
                        {r.avatar_url ? (
                          <img src={r.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs font-bold" style={{ color: accentColor }}>
                            {getInitials(r.name)}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1 max-w-[40px] truncate">
                        {r.name.split(" ")[0]}
                      </span>
                    </div>
                  ))}
                </div>

                {maybeList.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto">
                    {maybeList.map((r, i) => (
                      <div key={i} className="flex flex-col items-center shrink-0">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden opacity-60">
                          {r.avatar_url ? (
                            <img src={r.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] font-bold text-muted-foreground">{getInitials(r.name)}</span>
                          )}
                        </div>
                        <span className="text-[9px] text-muted-foreground mt-0.5 max-w-[36px] truncate">
                          {r.name.split(" ")[0]}
                        </span>
                      </div>
                    ))}
                    <span className="text-muted-foreground text-[10px] font-semibold shrink-0">
                      {maybeList.length} maybe
                    </span>
                  </div>
                )}

                {rsvp === "yes" && (
                  <div className="mt-3 flex justify-center">
                    <div
                      className="rounded-full px-4 py-1.5 text-xs font-bold"
                      style={{
                        backgroundColor: bubbleBg
                          ? bubbleBg.replace("hsl(", "hsla(").replace(")", ", 0.15)")
                          : "rgba(170,238,68,0.15)",
                        color: accentColor,
                      }}
                    >
                      🎉 You're going!
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {rsvpList.length === 0 && (
                  <p className="text-muted-foreground text-xs text-center py-3">No RSVPs yet</p>
                )}
                {rsvpList.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-xl px-3 py-2"
                    style={{ backgroundColor: "#2a2a2a" }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden shrink-0"
                      style={{ border: `2px solid ${accentColor}`, backgroundColor: "#1a1a1a" }}
                    >
                      {r.avatar_url ? (
                        <img src={r.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-bold" style={{ color: accentColor }}>
                          {getInitials(r.name)}
                        </span>
                      )}
                    </div>
                    <span className="text-white text-sm font-semibold flex-1">{r.name}</span>
                    {statusBadge(r.status)}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chat section */}
          <div className="mt-4 rounded-2xl p-4" style={{ backgroundColor: "#1e1e1e" }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-bold text-sm">Chat</h2>
              <button onClick={() => setShowFullComments(true)}>
                <Maximize2 className="w-4 h-4" style={{ color: accentColor }} />
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
              {comments.length === 0 && (
                <p className="text-muted-foreground text-xs text-center py-3">No messages yet — be the first!</p>
              )}
              {comments.map((c, i) => (
                <div key={i} className="rounded-xl px-3 py-2" style={{ backgroundColor: "#2a2a2a" }}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold" style={{ color: accentColor }}>
                      {c.user_name}
                    </span>
                    <span className="text-muted-foreground text-[10px]">{formatTime(c.created_at)}</span>
                  </div>
                  <p className="text-white text-sm mt-0.5">{c.text}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendComment()}
                placeholder="Write a message..."
                className="flex-1 rounded-full px-4 py-2 text-sm text-white placeholder:text-muted-foreground outline-none"
                style={{ backgroundColor: "#2a2a2a" }}
              />
              <button
                onClick={sendComment}
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: "#b8f55a" }}
              >
                <Send className="w-4 h-4" style={{ color: "#111" }} />
              </button>
            </div>
          </div>

          {/* Gallery section */}
          <div className="mt-4 rounded-2xl p-4" style={{ backgroundColor: "#1e1e1e" }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-bold text-sm">Gallery</h2>
              <button
                onClick={() => photoInput.current?.click()}
                className="text-xs font-bold rounded-full px-3 py-1"
                style={{ backgroundColor: "#b8f55a", color: "#111" }}
              >
                Add photo
              </button>
              <input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </div>
            {uploadingPhoto && (
              <p className="text-xs text-center py-2" style={{ color: accentColor }}>
                Uploading...
              </p>
            )}
            {photos.length === 0 && !uploadingPhoto ? (
              <p className="text-muted-foreground text-xs text-center py-4">No photos yet — add the first one!</p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {photos.map((p) => (
                  <div key={p.id} className="aspect-square rounded-xl overflow-hidden">
                    <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* RSVP floating bar */}
      <div className="fixed bottom-4 left-4 right-4 z-50">
        {barMinimised && rsvp ? (
          <button
            onClick={() => setBarMinimised(false)}
            className="mx-auto block bg-secondary/95 backdrop-blur-sm rounded-full px-5 py-2.5 text-sm font-bold text-primary border border-border"
          >
            {rsvpLabel}
          </button>
        ) : (
          <div className="bg-secondary/95 backdrop-blur-sm rounded-[var(--radius)] p-4 border border-border">
            <p className="text-muted-foreground text-xs font-semibold text-center mb-3">
              {rsvp ? rsvpLabel : "Are you going?"}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleRsvp("yes")}
                className={`flex-1 rounded-full py-2.5 text-sm font-bold ${rsvp === "yes" ? "bg-primary text-primary-foreground" : "bg-muted text-secondary-foreground border border-border"}`}
              >
                Yes 🙌
              </button>
              <button
                onClick={() => handleRsvp("no")}
                className={`flex-1 rounded-full py-2.5 text-sm font-bold ${rsvp === "no" ? "bg-primary text-primary-foreground" : "bg-muted text-secondary-foreground border border-border"}`}
              >
                No 👎
              </button>
              <button
                onClick={() => handleRsvp("maybe")}
                className={`flex-1 rounded-full py-2.5 text-sm font-bold ${rsvp === "maybe" ? "bg-primary text-primary-foreground" : "bg-muted text-secondary-foreground border border-border"}`}
              >
                Maybe 🤷
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Full-screen chat overlay */}
      {showFullComments && (
        <div className="fixed inset-0 z-[60] flex flex-col" style={{ backgroundColor: "#2b2b2b" }}>
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <button onClick={() => setShowFullComments(false)}>
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <h2 className="text-white font-bold text-base">Chat</h2>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {comments.length === 0 && (
              <p className="text-muted-foreground text-sm text-center mt-10">No messages yet — be the first!</p>
            )}
            {comments.map((c, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {c.avatar_url ? (
                    <img src={c.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-bold text-muted-foreground">{getInitials(c.user_name)}</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-primary text-xs font-bold">{c.user_name}</span>
                    <span className="text-muted-foreground text-[10px]">{formatTime(c.created_at)}</span>
                  </div>
                  <div
                    className="rounded-2xl rounded-tl-sm px-3 py-2 inline-block"
                    style={{ backgroundColor: "#383838" }}
                  >
                    <p className="text-white text-sm">{c.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 py-3 border-t border-border flex gap-2">
            <input
              ref={fullCommentInputRef}
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendComment()}
              placeholder="Write a message..."
              className="flex-1 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-muted-foreground outline-none border border-border"
              style={{ backgroundColor: "#383838" }}
            />
            <button
              onClick={sendComment}
              className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0"
            >
              <Send className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* DM overlay */}
      {showChat && (
        <div className="fixed inset-0 z-[60] bg-background flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-secondary-foreground font-bold text-base">Message the host</h2>
            <button onClick={() => setShowChat(false)}>
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-muted-foreground text-sm text-center mt-10">
                Send a private message to the host — e.g. dietary needs, questions, or a heads up.
              </p>
            )}
            {messages.map((m: any, i: number) => (
              <div key={i} className={`flex ${m.from === "guest" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${m.from === "guest" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground border border-border"}`}
                >
                  <p className="text-sm">{m.text}</p>
                  <p className="text-[10px] opacity-50 mt-0.5">{m.time}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 py-3 border-t border-border flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 bg-secondary rounded-full px-4 py-2.5 text-sm text-secondary-foreground placeholder:text-muted-foreground outline-none border border-border"
            />
            <button
              onClick={sendMessage}
              className="w-10 h-10 rounded-full bg-primary flex items-center justify-center"
            >
              <Send className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuestEventView;
