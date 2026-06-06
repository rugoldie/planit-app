import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, X, Send, Maximize2, ChevronDown, ChevronUp, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
import { createNotification } from "@/lib/notifications";

type Comment = { id: string; user_name: string; text: string; created_at: string; avatar_url?: string };
type RsvpEntry = { name: string; avatar_url?: string; status: string; user_id: string };
type StickerItem = { id: string; emoji: string; x: number; y: number; size: number };

const hexMuted = (hex: string) => {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},0.55)`;
};

const getPatternBgStyle = (key: string): React.CSSProperties => {
  switch (key) {
    case "planit-pattern:retro-stars":    return { backgroundColor: "#ede8d8" };
    case "planit-pattern:checkerboard":   return { backgroundImage: "repeating-conic-gradient(#000 0% 25%, #fff 0% 50%)", backgroundSize: "24px 24px" };
    case "planit-pattern:tie-dye":        return { background: "radial-gradient(circle at 50% 50%, #ff6b6b, #ffd93d 30%, #6bcb77 55%, #4d96ff 75%, #c77dff)" };
    case "planit-pattern:holographic":    return { background: "conic-gradient(from 0deg at 50% 50%, #ff9de2, #a78bfa, #67e8f9, #86efac, #fde68a, #ff9de2)" };
    case "planit-pattern:cherry-blossom": return { background: "linear-gradient(135deg, #fce4ec 0%, #f8bbd0 50%, #fce4ec 100%)" };
    case "planit-pattern:camo":           return { backgroundColor: "#4a5240" };
    case "planit-pattern:blueprint":      return { backgroundColor: "#0a1628", backgroundImage: "repeating-linear-gradient(rgba(56,189,248,0.12) 1px, transparent 1px), repeating-linear-gradient(90deg, rgba(56,189,248,0.12) 1px, transparent 1px)", backgroundSize: "20px 20px" };
    case "planit-pattern:groovy":         return { backgroundColor: "#fdf6e3" };
    case "solid-softwhite":               return { backgroundColor: "#fafafa" };
    case "solid-cream":                   return { backgroundColor: "#fdf6e3" };
    case "solid-blushpink":               return { backgroundColor: "#fde8f0" };
    case "solid-lavender":                return { backgroundColor: "#ede9fe" };
    case "solid-mint":                    return { backgroundColor: "#ecfdf5" };
    case "solid-sky":                     return { backgroundColor: "#e0f2fe" };
    case "solid-peach":                   return { backgroundColor: "#fff7ed" };
    case "solid-lemon":                   return { backgroundColor: "#fefce8" };
    default: return {};
  }
};

const isLightPattern = (key: string) =>
  ["planit-pattern:retro-stars","planit-pattern:holographic","planit-pattern:cherry-blossom","planit-pattern:groovy",
   "solid-softwhite","solid-cream","solid-blushpink","solid-lavender","solid-mint","solid-sky","solid-peach","solid-lemon"].includes(key);

const PatternOverlay = ({ patternKey }: { patternKey: string }) => {
  if (patternKey === "planit-pattern:retro-stars") {
    return (
      <>
        {Array.from({ length: 22 }).map((_, i) => (
          <div key={i} style={{ position: "absolute", left: `${(i*17+5)%90+2}%`, top: `${(i*13+7)%88+2}%`, fontSize: `${i%3===0?26:i%2===0?18:13}px`, color: "#e63946", opacity: 0.78, pointerEvents: "none" as const, lineHeight: 1 }}>★</div>
        ))}
      </>
    );
  }
  if (patternKey === "planit-pattern:cherry-blossom") {
    return (
      <>
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} style={{ position: "absolute", left: `${(i*19+3)%86+4}%`, top: `${(i*11+9)%80+5}%`, fontSize: "22px", opacity: 0.45, pointerEvents: "none" as const, transform: `rotate(${i*25}deg)` }}>🌸</div>
        ))}
      </>
    );
  }
  if (patternKey === "planit-pattern:camo") {
    const blobs = [
      { x:8,  y:5,  w:120, h:70, c:"#3a4a32", r:-15 },
      { x:45, y:18, w:140, h:80, c:"#2d3a25", r:22  },
      { x:-5, y:48, w:110, h:65, c:"#5a6b4a", r:8   },
      { x:62, y:58, w:130, h:72, c:"#3a4a32", r:-28 },
      { x:15, y:68, w:100, h:60, c:"#2d3a25", r:18  },
      { x:72, y:28, w:90,  h:80, c:"#4a5a38", r:-12 },
      { x:30, y:82, w:115, h:55, c:"#35452d", r:30  },
    ];
    return (
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" as const }}>
        {blobs.map((b,i) => <div key={i} style={{ position:"absolute", left:`${b.x}%`, top:`${b.y}%`, width:`${b.w}px`, height:`${b.h}px`, backgroundColor:b.c, borderRadius:"50%", transform:`rotate(${b.r}deg)`, opacity:0.85 }} />)}
      </div>
    );
  }
  if (patternKey === "planit-pattern:blueprint") {
    return (
      <div style={{ position:"absolute", inset:0, pointerEvents:"none" as const }}>
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%" }} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="bp-sm-g" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#4da6ff" strokeWidth="0.4" opacity="0.35"/>
            </pattern>
            <pattern id="bp-lg-g" width="200" height="200" patternUnits="userSpaceOnUse">
              <rect width="200" height="200" fill="url(#bp-sm-g)"/>
              <path d="M 200 0 L 0 0 0 200" fill="none" stroke="#4da6ff" strokeWidth="0.9" opacity="0.4"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#bp-lg-g)"/>
          <circle cx="50%" cy="38%" r="90" fill="none" stroke="#4da6ff" strokeWidth="0.8" opacity="0.4"/>
          <circle cx="50%" cy="38%" r="55" fill="none" stroke="#4da6ff" strokeWidth="0.5" opacity="0.35"/>
          <circle cx="50%" cy="38%" r="130" fill="none" stroke="#4da6ff" strokeWidth="0.5" opacity="0.25"/>
          <line x1="50%" y1="15%" x2="50%" y2="62%" stroke="#4da6ff" strokeWidth="0.6" opacity="0.35"/>
          <line x1="25%" y1="38%" x2="75%" y2="38%" stroke="#4da6ff" strokeWidth="0.6" opacity="0.35"/>
        </svg>
      </div>
    );
  }
  if (patternKey === "planit-pattern:groovy") {
    return (
      <div style={{ position:"absolute", inset:0, pointerEvents:"none" as const }}>
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%" }} viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <circle cx="80"  cy="180" r="110" fill="none" stroke="#c2410c" strokeWidth="6" opacity="0.28"/>
          <circle cx="230" cy="140" r="140" fill="none" stroke="#d97706" strokeWidth="6" opacity="0.22"/>
          <circle cx="340" cy="320" r="100" fill="none" stroke="#c2410c" strokeWidth="5" opacity="0.28"/>
          <circle cx="100" cy="420" r="130" fill="none" stroke="#d97706" strokeWidth="6" opacity="0.22"/>
          <circle cx="280" cy="510" r="120" fill="none" stroke="#c2410c" strokeWidth="5" opacity="0.28"/>
          <circle cx="60"  cy="640" r="90"  fill="none" stroke="#d97706" strokeWidth="5" opacity="0.22"/>
          <circle cx="350" cy="680" r="110" fill="none" stroke="#c2410c" strokeWidth="5" opacity="0.26"/>
          <circle cx="170" cy="300" r="18"  fill="#d97706" opacity="0.18"/>
          <circle cx="310" cy="200" r="12"  fill="#c2410c" opacity="0.18"/>
          <circle cx="200" cy="650" r="20"  fill="#d97706" opacity="0.16"/>
          <path d="M-20,80  Q60,50  120,80  Q180,110 240,80  Q300,50  360,80  Q420,110 480,80"  fill="none" stroke="#c2410c" strokeWidth="4" opacity="0.2"/>
          <path d="M-20,220 Q60,190 120,220 Q180,250 240,220 Q300,190 360,220 Q420,250 480,220" fill="none" stroke="#d97706" strokeWidth="4" opacity="0.2"/>
          <path d="M-20,560 Q60,530 120,560 Q180,590 240,560 Q300,530 360,560 Q420,590 480,560" fill="none" stroke="#c2410c" strokeWidth="4" opacity="0.2"/>
          <path d="M-20,720 Q60,690 120,720 Q180,750 240,720 Q300,690 360,720 Q420,750 480,720" fill="none" stroke="#d97706" strokeWidth="4" opacity="0.2"/>
        </svg>
      </div>
    );
  }
  return null;
};

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

  const [photos, setPhotos] = useState<{ id: string; photo_url: string; user_name?: string; avatar_url?: string }[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<{ photo_url: string; user_name?: string; avatar_url?: string } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

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

  // Fetch comments — defined at component scope so sendComment can call it directly
  const fetchComments = useCallback(async () => {
    if (!event) return;
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("event_id", event.id)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("fetchComments error:", error);
      return;
    }
    if (data) {
      const userIds = [...new Set(data.map((c: any) => c.user_id))];
      const avatarMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, avatar_url")
          .in("user_id", userIds);
        (profiles || []).forEach((p: any) => avatarMap.set(p.user_id, p.avatar_url));
      }
      setComments(data.map((c: any) => ({ ...c, avatar_url: avatarMap.get(c.user_id) })));
    }
  }, [event]);

  useEffect(() => {
    if (!event) return;
    fetchComments();

    const channel = supabase
      .channel(`comments-${event.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments", filter: `event_id=eq.${event.id}` },
        () => fetchComments(),
      )
      .subscribe((status, err) => {
        console.log("comments realtime status:", status, err ? JSON.stringify(err) : "");
      });

    // Re-fetch when app returns to foreground — mobile browsers kill websockets in background
    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchComments();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      supabase.removeChannel(channel);
    };
  }, [event, fetchComments]);

  // Fetch photos
  useEffect(() => {
    if (!event) return;
    const fetchPhotos = async () => {
      const { data } = await supabase
        .from("event_photos")
        .select("id, photo_url, user_id")
        .eq("event_id", event.id)
        .order("created_at", { ascending: true });
      if (data) {
        const uids = [...new Set(data.map((p: any) => p.user_id).filter(Boolean))];
        let profMap = new Map<string, { name: string; avatar_url: string | null }>();
        if (uids.length > 0) {
          const { data: profs } = await supabase.from("profiles").select("user_id, name, avatar_url").in("user_id", uids);
          if (profs) profMap = new Map(profs.map((p: any) => [p.user_id, p]));
        }
        setPhotos(data.map((p: any) => ({
          id: p.id,
          photo_url: p.photo_url,
          user_name: profMap.get(p.user_id)?.name || "Guest",
          avatar_url: profMap.get(p.user_id)?.avatar_url || undefined,
        })));
      }
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

  // Fullscreen — must be before any early returns to satisfy rules of hooks
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

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

    // Notify host of RSVP
    try {
      const userName = profile?.name || "A guest";
      const statusLabel = response === "yes" ? "is going" : response === "maybe" ? "is a maybe" : "can't make it";
      await createNotification(
        event.host_id,
        "rsvp",
        `${userName} ${statusLabel}`,
        `${userName} has RSVP'd to ${event.title || "your event"}`,
        { event_code: event.code, event_id: event.id }
      );
    } catch {}

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
    if (!commentDraft.trim() || !event) return;
    if (!user) {
      console.error("sendComment: no authenticated user");
      toast.error("You must be logged in to send messages");
      return;
    }
    const userName = profile?.name || "Guest";
    const text = commentDraft.trim();
    const payload = { event_id: event.id, user_id: user.id, user_name: userName, text };
    console.log("sendComment payload:", payload);
    const result = await supabase.from("comments").insert(payload).select();
    console.log("sendComment full result:", JSON.stringify(result));
    const { error } = result;
    if (error) {
      console.error("sendComment error code:", error.code, "message:", error.message, "details:", error.details, "hint:", error.hint);
      toast.error(`Message failed: ${error.message}`);
    } else {
      await fetchComments();
      setCommentDraft("");
    }
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
    setPhotos((prev) => [...prev, { id: crypto.randomUUID(), photo_url: photoUrl, user_name: profile?.name || "You", avatar_url: profile?.avatar_url || undefined }]);
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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const downloadPhoto = async (url: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "planit-photo.jpg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, "_blank");
    }
  };

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
  const isMidnight = ((event as any).template_name || "").toLowerCase() === "midnight";
  const isOcean = ((event as any).template_name || "").toLowerCase() === "ocean";
  const isBlush = ((event as any).template_name || "").toLowerCase() === "blush";
  const isForest = ((event as any).template_name || "").toLowerCase() === "forest";
  const isCustom = ((event as any).template_name || "").toLowerCase() === "planit-custom";
  const galaxyAccent = (event as any).bubble_color ? `hsl(${(event as any).bubble_color})` : "#a855f7";
  const vintageAccent = (event as any).gradient_color || "#8b7355";
  const containerBg = isSunny
    ? "transparent"
    : isGalaxy
      ? "#0d0d2b"
      : isMidnight
        ? event.bg_color
          ? `hsl(${event.bg_color})`
          : "#ffffff"
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
              <div className="flex items-center gap-2">
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
              <div className="flex items-center gap-2">
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
                  enterKeyHint="send" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendComment(); } }}
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
                  type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); sendComment(); }}
                  className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
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
              <div className="flex items-center gap-2">
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
                    enterKeyHint="send" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendComment(); } }}
                    placeholder="Write a message..."
                    className="flex-1 rounded-full px-4 py-2 text-sm outline-none"
                    style={{
                      backgroundColor: "rgba(26,10,46,0.8)",
                      color: "#e9d5ff",
                      border: `1px solid rgba(168,85,247,0.3)`,
                    }}
                  />
                  <button
                    type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); sendComment(); }}
                    className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
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
      ) : isMidnight ? (
        /* ═══ MIDNIGHT LAYOUT ═══ */
        <>
          <div style={{ backgroundColor: containerBg, minHeight: "100vh", position: "relative" }}>
            <div className="flex items-center justify-between px-5 pt-6">
              <button onClick={() => navigate("/home")}>
                <ArrowLeft className="w-6 h-6" style={{ color: accentColor }} />
              </button>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowChat(true)} className="flex flex-col items-center gap-0.5">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${accentColor}18`, border: `1px solid ${accentColor}40` }}
                  >
                    <MessageCircle className="w-4 h-4" style={{ color: accentColor }} />
                  </div>
                  <span className="text-[9px] font-semibold" style={{ color: accentColor }}>
                    Message host
                  </span>
                </button>
              </div>
            </div>

            <div className="px-5 pt-6 pb-4">
              <div className="flex gap-3">
                <div style={{ width: "4px", borderRadius: "2px", backgroundColor: accentColor, flexShrink: 0 }} />
                <div>
                  {event.vibe && (
                    <p
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "10px",
                        fontWeight: 700,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase" as const,
                        color: isLightBg ? "#888" : "#555",
                        marginBottom: "6px",
                      }}
                    >
                      {event.vibe}
                    </p>
                  )}
                  <h1
                    style={{
                      fontFamily: eventFontFamily,
                      fontSize: noirFontSize,
                      fontWeight: 900,
                      color: bgTextColor,
                      lineHeight: 1.1,
                    }}
                  >
                    {event.title || "Untitled Event"}
                  </h1>
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "11px",
                      color: isLightBg ? "#999" : "#555",
                      marginTop: "6px",
                    }}
                  >
                    hosted by {hostName}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-5 pb-6 flex flex-col gap-3">
              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: "10px" }}>
                {/* Date block */}
                <div
                  style={{
                    backgroundColor: `${accentColor}22`,
                    border: `1px solid ${accentColor}40`,
                    borderRadius: "12px",
                    padding: "10px 8px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "8px",
                      fontWeight: 700,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase" as const,
                      color: accentColor,
                    }}
                  >
                    {monthName}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "30px",
                      fontWeight: 900,
                      color: bgTextColor,
                      lineHeight: 1,
                    }}
                  >
                    {dayNum || "?"}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "9px",
                      color: accentColor,
                      opacity: 0.6,
                      marginTop: "2px",
                    }}
                  >
                    {timeStr}
                  </span>
                </div>

                {/* Location + dress code */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {event.location && (
                    <div>
                      <p
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "8px",
                          fontWeight: 700,
                          letterSpacing: "0.14em",
                          textTransform: "uppercase" as const,
                          color: accentColor,
                          display: "flex",
                          alignItems: "center",
                          gap: "3px",
                        }}
                      >
                        📍 Location
                      </p>
                      <p
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "15px",
                          fontWeight: 700,
                          color: bgTextColor,
                          marginTop: "2px",
                        }}
                      >
                        {event.location}
                      </p>
                    </div>
                  )}
                  {event.location && event.dress_code && (
                    <div style={{ height: "1px", backgroundColor: isLightBg ? "#e5e5e5" : "#222" }} />
                  )}
                  {event.dress_code && (
                    <div>
                      <p
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "8px",
                          fontWeight: 700,
                          letterSpacing: "0.14em",
                          textTransform: "uppercase" as const,
                          color: accentColor,
                          display: "flex",
                          alignItems: "center",
                          gap: "3px",
                        }}
                      >
                        🎭 Dress code
                      </p>
                      <p
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "15px",
                          fontWeight: 700,
                          color: bgTextColor,
                          marginTop: "2px",
                        }}
                      >
                        {event.dress_code}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {event.extra && (
                <div
                  style={{
                    backgroundColor: isLightBg ? "#f5f5f5" : "#111",
                    borderRadius: "12px",
                    padding: "12px 14px",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "8px",
                      fontWeight: 700,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase" as const,
                      color: isLightBg ? "#888" : "#444",
                      marginBottom: "4px",
                    }}
                  >
                    From the host
                  </p>
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "13px",
                      color: isLightBg ? "#333" : "#aaa",
                      lineHeight: 1.5,
                    }}
                  >
                    {event.extra}
                  </p>
                </div>
              )}

              {/* Who's going */}
              <div
                style={{ backgroundColor: isLightBg ? "#f5f5f5" : "#111", borderRadius: "12px", padding: "12px 14px" }}
              >
                <button
                  onClick={() => setGuestListExpanded(!guestListExpanded)}
                  className="flex items-center justify-between w-full mb-2"
                >
                  <h2
                    style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 700, color: bgTextColor }}
                  >
                    Who's going
                  </h2>
                  <div className="flex items-center gap-2">
                    {goingList.length > 0 && (
                      <span
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "11px",
                          fontWeight: 700,
                          color: accentColor,
                        }}
                      >
                        {goingList.length} going
                      </span>
                    )}
                    {guestListExpanded ? (
                      <ChevronUp className="w-4 h-4" style={{ color: accentColor }} />
                    ) : (
                      <ChevronDown className="w-4 h-4" style={{ color: accentColor }} />
                    )}
                  </div>
                </button>
                <div className="flex items-center gap-2 overflow-x-auto">
                  {goingList.length === 0 && (
                    <p
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "12px",
                        color: isLightBg ? "#aaa" : "#555",
                      }}
                    >
                      No one yet
                    </p>
                  )}
                  {goingList.map((r, i) => (
                    <div key={i} className="flex flex-col items-center shrink-0">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden"
                        style={{
                          border: `2px solid ${accentColor}`,
                          backgroundColor: isLightBg ? "#e5e5e5" : "#1a1a1a",
                        }}
                      >
                        {r.avatar_url ? (
                          <img src={r.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span
                            style={{
                              fontFamily: "'Inter', sans-serif",
                              fontSize: "12px",
                              fontWeight: 700,
                              color: accentColor,
                            }}
                          >
                            {getInitials(r.name)}
                          </span>
                        )}
                      </div>
                      <span
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "10px",
                          color: isLightBg ? "#888" : "#555",
                        }}
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
                style={{ backgroundColor: isLightBg ? "#f5f5f5" : "#111", borderRadius: "12px", padding: "12px 14px" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h2
                    style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 700, color: bgTextColor }}
                  >
                    Chat
                  </h2>
                  <button onClick={() => setShowFullComments(true)}>
                    <Maximize2 className="w-4 h-4" style={{ color: accentColor }} />
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                  {comments.length === 0 && (
                    <p
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "12px",
                        color: isLightBg ? "#aaa" : "#555",
                        textAlign: "center",
                        padding: "12px 0",
                      }}
                    >
                      No messages yet — be the first!
                    </p>
                  )}
                  {comments.map((c, i) => (
                    <div
                      key={i}
                      className="rounded-xl px-3 py-2"
                      style={{ backgroundColor: isLightBg ? "#ebebeb" : "#1a1a1a" }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: "11px",
                            fontWeight: 700,
                            color: accentColor,
                          }}
                        >
                          {c.user_name}
                        </span>
                        <span style={{ fontSize: "10px", color: isLightBg ? "#bbb" : "#444" }}>
                          {formatTime(c.created_at)}
                        </span>
                      </div>
                      <p
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "13px",
                          color: bgTextColor,
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
                    enterKeyHint="send" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendComment(); } }}
                    placeholder="Write a message..."
                    className="flex-1 rounded-full px-4 py-2 text-sm outline-none"
                    style={{
                      backgroundColor: isLightBg ? "#ebebeb" : "#1a1a1a",
                      color: bgTextColor,
                      border: `1px solid ${accentColor}30`,
                    }}
                  />
                  <button
                    type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); sendComment(); }}
                    className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: accentColor }}
                  >
                    <Send className="w-4 h-4" style={{ color: isLightBg ? "#fff" : "#111" }} />
                  </button>
                </div>
              </div>

              {/* Gallery */}
              <div
                style={{
                  backgroundColor: isLightBg ? "#f5f5f5" : "#111",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  marginBottom: "20px",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h2
                    style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 700, color: bgTextColor }}
                  >
                    Gallery
                  </h2>
                  <button
                    onClick={() => photoInput.current?.click()}
                    className="text-xs font-bold rounded-full px-3 py-1"
                    style={{
                      backgroundColor: accentColor,
                      color: isLightBg ? "#fff" : "#111",
                      fontFamily: "'Inter', sans-serif",
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
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "12px",
                      color: accentColor,
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
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "12px",
                      color: isLightBg ? "#aaa" : "#555",
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
          </div>
        </>
      ) : isOcean ? (
        /* ═══ OCEAN LAYOUT ═══ */
        <>
          <div style={{ backgroundColor: "#0c1929", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
            {/* Glow orbs */}
            <div style={{ position: "absolute", top: "-80px", right: "-80px", width: "280px", height: "280px", borderRadius: "50%", background: "radial-gradient(circle, rgba(56,189,248,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: "120px", left: "-50px", width: "160px", height: "160px", borderRadius: "50%", background: "radial-gradient(circle, rgba(14,165,233,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />

            {/* Nav */}
            <div className="flex items-center justify-between px-5 pt-6 relative z-10">
              <button onClick={() => navigate("/home")}>
                <ArrowLeft className="w-6 h-6" style={{ color: "rgba(56,189,248,0.6)" }} />
              </button>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowChat(true)} className="flex flex-col items-center gap-0.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.2)" }}>
                    <MessageCircle className="w-4 h-4" style={{ color: "rgba(56,189,248,0.7)" }} />
                  </div>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 600, color: "rgba(56,189,248,0.5)" }}>Message host</span>
                </button>
              </div>
            </div>

            {/* Header */}
            <div className="px-5 pt-10 pb-2 relative z-10 text-center">
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(56,189,248,0.5)", marginBottom: "10px" }}>You're Invited</p>
              <h1 style={{ fontFamily: "'Inter', sans-serif", fontSize: noirFontSize, fontWeight: 900, color: "#ffffff", lineHeight: 1.1, marginBottom: "8px" }}>{event.title || "Untitled Event"}</h1>
              {event.vibe && <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", fontStyle: "italic", color: "rgba(56,189,248,0.45)", marginBottom: "6px" }}>{event.vibe}</p>}
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", color: "rgba(56,189,248,0.35)", marginBottom: "16px" }}>hosted by {hostName}</p>
              <svg viewBox="0 0 320 20" style={{ width: "100%", maxWidth: "280px", margin: "0 auto", display: "block", marginBottom: "20px" }}>
                <path d="M0,10 C26.7,2 53.3,18 80,10 C106.7,2 133.3,18 160,10 C186.7,2 213.3,18 240,10 C266.7,2 293.3,18 320,10" stroke="rgba(56,189,248,0.22)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              </svg>
            </div>

            <div className="px-5 pb-10 relative z-10 flex flex-col gap-3">
              {/* Stat cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                {/* DAY */}
                <div style={{ backgroundColor: "rgba(56,189,248,0.07)", border: "1px solid rgba(56,189,248,0.15)", borderRadius: "16px", padding: "14px 8px", textAlign: "center" }}>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "7px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(56,189,248,0.5)", marginBottom: "4px" }}>Day</p>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "34px", fontWeight: 900, color: "#ffffff", lineHeight: 1, display: "block" }}>{dayNum || "—"}</span>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 700, color: "rgb(56,189,248)", textTransform: "uppercase", marginTop: "2px" }}>{monthName || "TBD"}</p>
                </div>
                {/* TIME */}
                <div style={{ backgroundColor: "rgba(56,189,248,0.07)", border: "1px solid rgba(56,189,248,0.15)", borderRadius: "16px", padding: "14px 8px", textAlign: "center" }}>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "7px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(56,189,248,0.5)", marginBottom: "4px" }}>Time</p>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: eventDate ? "16px" : "28px", fontWeight: 900, color: eventDate ? "#ffffff" : "rgba(255,255,255,0.18)", lineHeight: 1.1, display: "block" }}>{timeStr || "—"}</span>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 700, color: "rgb(56,189,248)", textTransform: "uppercase", marginTop: "2px" }}>{dayOfWeek ? dayOfWeek.slice(0, 3).toUpperCase() : "TBD"}</p>
                </div>
                {/* GOING */}
                <div style={{ backgroundColor: "rgba(56,189,248,0.07)", border: "1px solid rgba(56,189,248,0.15)", borderRadius: "16px", padding: "14px 8px", textAlign: "center" }}>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "7px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(56,189,248,0.5)", marginBottom: "4px" }}>Going</p>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "34px", fontWeight: 900, color: "#ffffff", lineHeight: 1, display: "block" }}>{goingList.length}</span>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 700, color: "rgb(56,189,248)", textTransform: "uppercase", marginTop: "2px" }}>Guests</p>
                </div>
              </div>

              {/* Location pill */}
              {event.location && (
                <div style={{ borderRadius: "50px", backgroundColor: "rgba(56,189,248,0.07)", border: "1px solid rgba(56,189,248,0.15)", padding: "14px 22px" }}>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(56,189,248,0.5)", marginBottom: "3px" }}>📍 Location</p>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "14px", fontWeight: 600, color: "#ffffff" }}>{event.location}</p>
                </div>
              )}

              {/* Dress code pill */}
              {event.dress_code && (
                <div style={{ borderRadius: "50px", backgroundColor: "rgba(56,189,248,0.07)", border: "1px solid rgba(56,189,248,0.15)", padding: "14px 22px" }}>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(56,189,248,0.5)", marginBottom: "3px" }}>👗 Dress Code</p>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "14px", fontWeight: 600, color: "#ffffff" }}>{event.dress_code}</p>
                </div>
              )}

              {/* Notes card */}
              {event.extra && (
                <div style={{ backgroundColor: "rgba(10,25,50,0.8)", border: "1px solid rgba(56,189,248,0.1)", borderRadius: "16px", padding: "14px 16px" }}>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(56,189,248,0.45)", marginBottom: "6px" }}>From the host</p>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>{event.extra}</p>
                </div>
              )}

              {/* Who's going */}
              <div style={{ backgroundColor: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.12)", borderRadius: "16px", padding: "12px 14px" }}>
                <button onClick={() => setGuestListExpanded(!guestListExpanded)} className="flex items-center justify-between w-full mb-2">
                  <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 700, color: "#ffffff" }}>Who's going</h2>
                  <div className="flex items-center gap-2">
                    {goingList.length > 0 && <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", fontWeight: 700, color: "rgb(56,189,248)" }}>{goingList.length} going</span>}
                    {guestListExpanded ? <ChevronUp className="w-4 h-4" style={{ color: "rgb(56,189,248)" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "rgb(56,189,248)" }} />}
                  </div>
                </button>
                <div className="flex items-center gap-2 overflow-x-auto">
                  {goingList.length === 0 && <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "rgba(56,189,248,0.35)" }}>No one yet</p>}
                  {goingList.map((r, i) => (
                    <div key={i} className="flex flex-col items-center shrink-0">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden" style={{ border: "2px solid rgba(56,189,248,0.5)", backgroundColor: "rgba(56,189,248,0.1)" }}>
                        {r.avatar_url ? <img src={r.avatar_url} alt="" className="w-full h-full object-cover" /> : <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", fontWeight: 700, color: "rgb(56,189,248)" }}>{getInitials(r.name)}</span>}
                      </div>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "10px", color: "rgba(56,189,248,0.5)" }} className="mt-1 max-w-[40px] truncate">{r.name.split(" ")[0]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat */}
              <div style={{ backgroundColor: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.12)", borderRadius: "16px", padding: "12px 14px" }}>
                <div className="flex items-center justify-between mb-3">
                  <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 700, color: "#ffffff" }}>Chat</h2>
                  <button onClick={() => setShowFullComments(true)}><Maximize2 className="w-4 h-4" style={{ color: "rgba(56,189,248,0.6)" }} /></button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                  {comments.length === 0 && <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "rgba(56,189,248,0.35)", textAlign: "center", padding: "12px 0" }}>No messages yet — be the first!</p>}
                  {comments.map((c, i) => (
                    <div key={i} className="rounded-xl px-3 py-2" style={{ backgroundColor: "rgba(56,189,248,0.06)" }}>
                      <div className="flex items-center gap-2">
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", fontWeight: 700, color: "rgb(56,189,248)" }}>{c.user_name}</span>
                        <span style={{ fontSize: "10px", color: "rgba(56,189,248,0.35)" }}>{formatTime(c.created_at)}</span>
                      </div>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.8)", marginTop: "2px" }}>{c.text}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} enterKeyHint="send" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendComment(); } }} placeholder="Write a message..." className="flex-1 rounded-full px-4 py-2 text-sm outline-none" style={{ backgroundColor: "rgba(56,189,248,0.07)", color: "#ffffff", border: "1px solid rgba(56,189,248,0.2)", fontFamily: "'Inter', sans-serif" }} />
                  <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); sendComment(); }} className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "rgb(56,189,248)" }}>
                    <Send className="w-4 h-4" style={{ color: "#0c1929" }} />
                  </button>
                </div>
              </div>

              {/* Gallery */}
              <div style={{ backgroundColor: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.12)", borderRadius: "16px", padding: "12px 14px", marginBottom: "20px" }}>
                <div className="flex items-center justify-between mb-3">
                  <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 700, color: "#ffffff" }}>Gallery</h2>
                  <button onClick={() => photoInput.current?.click()} className="text-xs font-bold rounded-full px-3 py-1" style={{ backgroundColor: "rgb(56,189,248)", color: "#0c1929", fontFamily: "'Inter', sans-serif" }}>Add photo</button>
                  <input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </div>
                {uploadingPhoto && <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "rgb(56,189,248)", textAlign: "center", padding: "8px 0" }}>Uploading...</p>}
                {photos.length === 0 && !uploadingPhoto ? (
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "rgba(56,189,248,0.35)", textAlign: "center", padding: "16px 0" }}>No photos yet — add the first one!</p>
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
      ) : isBlush ? (
        /* ═══ BLUSH LAYOUT ═══ */
        <>
          <div style={{ backgroundColor: "#1a0a10", minHeight: "100vh", position: "relative" }}>
            {/* Nav */}
            <div className="flex items-center justify-between px-5 pt-6 relative z-10">
              <button onClick={() => navigate("/home")}>
                <ArrowLeft className="w-6 h-6" style={{ color: "rgba(244,114,182,0.6)" }} />
              </button>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowChat(true)} className="flex flex-col items-center gap-0.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(244,114,182,0.1)", border: "1px solid rgba(244,114,182,0.25)" }}>
                    <MessageCircle className="w-4 h-4" style={{ color: "rgba(244,114,182,0.7)" }} />
                  </div>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 600, color: "rgba(244,114,182,0.5)" }}>Message host</span>
                </button>
              </div>
            </div>

            {/* Header: pill badge top-left, title, hosted by */}
            <div className="px-5 pt-6 pb-3 relative z-10">
              {event.vibe && (
                <div style={{ display: "inline-block", backgroundColor: "rgba(244,114,182,0.14)", border: "1px solid rgba(244,114,182,0.3)", borderRadius: "50px", padding: "4px 14px", marginBottom: "12px" }}>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" as const, color: "#f472b6" }}>{event.vibe}</span>
                </div>
              )}
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: noirFontSize, fontWeight: 900, color: "#ffffff", lineHeight: 1.1, marginBottom: "6px" }}>{event.title || "Untitled Event"}</h1>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "rgba(244,114,182,0.4)" }}>hosted by {hostName}</p>
            </div>

            {/* Full-width striped stat bar — no rounded corners */}
            <div style={{ display: "flex", borderTop: "1px solid rgba(244,114,182,0.2)", borderBottom: "1px solid rgba(244,114,182,0.2)" }}>
              <div style={{ flex: 1, backgroundColor: "rgba(244,114,182,0.12)", padding: "16px 8px", textAlign: "center" as const, borderRight: "1px solid rgba(244,114,182,0.2)" }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "30px", fontWeight: 900, color: "#fff", display: "block", lineHeight: 1 }}>{dayNum || "—"}</span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" as const, color: "#f472b6", marginTop: "5px", display: "block" }}>{monthName || "TBD"}</span>
              </div>
              <div style={{ flex: 1, backgroundColor: "rgba(244,114,182,0.12)", padding: "16px 8px", textAlign: "center" as const, borderRight: "1px solid rgba(244,114,182,0.2)" }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: eventDate ? "20px" : "30px", fontWeight: 900, color: eventDate ? "#fff" : "rgba(255,255,255,0.2)", display: "block", lineHeight: 1 }}>{timeStr || "—"}</span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" as const, color: "#f472b6", marginTop: "5px", display: "block" }}>Start</span>
              </div>
              <div style={{ flex: 1, backgroundColor: "rgba(244,114,182,0.12)", padding: "16px 8px", textAlign: "center" as const }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "30px", fontWeight: 900, color: "#fff", display: "block", lineHeight: 1 }}>{goingList.length}</span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" as const, color: "#f472b6", marginTop: "5px", display: "block" }}>Going</span>
              </div>
            </div>

            <div className="px-5 pt-4 pb-10 relative z-10 flex flex-col gap-3">
              {event.location && (
                <div style={{ backgroundColor: "rgba(244,114,182,0.08)", border: "1px solid rgba(244,114,182,0.2)", borderRadius: "12px", padding: "14px 16px" }}>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: "rgba(244,114,182,0.6)", marginBottom: "6px" }}>Location</p>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>{event.location}</p>
                </div>
              )}
              {event.dress_code && (
                <div style={{ backgroundColor: "rgba(244,114,182,0.08)", border: "1px solid rgba(244,114,182,0.2)", borderRadius: "12px", padding: "14px 16px" }}>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: "rgba(244,114,182,0.6)", marginBottom: "6px" }}>Dress Code</p>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>{event.dress_code}</p>
                </div>
              )}
              {event.extra && (
                <div style={{ backgroundColor: "rgba(244,114,182,0.05)", border: "1px solid rgba(244,114,182,0.12)", borderRadius: "12px", padding: "12px 16px" }}>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" as const, color: "rgba(244,114,182,0.5)", marginBottom: "6px" }}>From the host</p>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>{event.extra}</p>
                </div>
              )}

              {/* Who's going */}
              <div style={{ backgroundColor: "rgba(244,114,182,0.06)", border: "1px solid rgba(244,114,182,0.15)", borderRadius: "12px", padding: "12px 14px" }}>
                <button onClick={() => setGuestListExpanded(!guestListExpanded)} className="flex items-center justify-between w-full mb-2">
                  <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 700, color: "#fff" }}>Who's going</h2>
                  <div className="flex items-center gap-2">
                    {goingList.length > 0 && <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", fontWeight: 700, color: "#f472b6" }}>{goingList.length} going</span>}
                    {guestListExpanded ? <ChevronUp className="w-4 h-4" style={{ color: "#f472b6" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "#f472b6" }} />}
                  </div>
                </button>
                <div className="flex items-center gap-2 overflow-x-auto">
                  {goingList.length === 0 && <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "rgba(244,114,182,0.4)" }}>No one yet</p>}
                  {goingList.map((r, i) => (
                    <div key={i} className="flex flex-col items-center shrink-0">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden" style={{ border: "2px solid rgba(244,114,182,0.5)", backgroundColor: "rgba(244,114,182,0.1)" }}>
                        {r.avatar_url ? <img src={r.avatar_url} alt="" className="w-full h-full object-cover" /> : <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", fontWeight: 700, color: "#f472b6" }}>{getInitials(r.name)}</span>}
                      </div>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "10px", color: "rgba(244,114,182,0.5)" }} className="mt-1 max-w-[40px] truncate">{r.name.split(" ")[0]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat */}
              <div style={{ backgroundColor: "rgba(244,114,182,0.06)", border: "1px solid rgba(244,114,182,0.15)", borderRadius: "12px", padding: "12px 14px" }}>
                <div className="flex items-center justify-between mb-3">
                  <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 700, color: "#fff" }}>Chat</h2>
                  <button onClick={() => setShowFullComments(true)}><Maximize2 className="w-4 h-4" style={{ color: "rgba(244,114,182,0.6)" }} /></button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                  {comments.length === 0 && <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "rgba(244,114,182,0.35)", textAlign: "center", padding: "12px 0" }}>No messages yet — be the first!</p>}
                  {comments.map((c, i) => (
                    <div key={i} className="rounded-xl px-3 py-2" style={{ backgroundColor: "rgba(244,114,182,0.07)" }}>
                      <div className="flex items-center gap-2">
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", fontWeight: 700, color: "#f472b6" }}>{c.user_name}</span>
                        <span style={{ fontSize: "10px", color: "rgba(244,114,182,0.4)" }}>{formatTime(c.created_at)}</span>
                      </div>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.8)", marginTop: "2px" }}>{c.text}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} enterKeyHint="send" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendComment(); } }} placeholder="Write a message..." className="flex-1 rounded-full px-4 py-2 text-sm outline-none" style={{ backgroundColor: "rgba(244,114,182,0.07)", color: "#fff", border: "1px solid rgba(244,114,182,0.2)", fontFamily: "'Inter', sans-serif" }} />
                  <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); sendComment(); }} className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#f472b6" }}>
                    <Send className="w-4 h-4" style={{ color: "#1a0a10" }} />
                  </button>
                </div>
              </div>

              {/* Gallery */}
              <div style={{ backgroundColor: "rgba(244,114,182,0.06)", border: "1px solid rgba(244,114,182,0.15)", borderRadius: "12px", padding: "12px 14px", marginBottom: "20px" }}>
                <div className="flex items-center justify-between mb-3">
                  <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 700, color: "#fff" }}>Gallery</h2>
                  <button onClick={() => photoInput.current?.click()} className="text-xs font-bold rounded-full px-3 py-1" style={{ backgroundColor: "#f472b6", color: "#1a0a10", fontFamily: "'Inter', sans-serif" }}>Add photo</button>
                  <input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </div>
                {uploadingPhoto && <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#f472b6", textAlign: "center", padding: "8px 0" }}>Uploading...</p>}
                {photos.length === 0 && !uploadingPhoto ? (
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "rgba(244,114,182,0.35)", textAlign: "center", padding: "16px 0" }}>No photos yet — add the first one!</p>
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
      ) : isForest ? (
        /* ═══ FOREST LAYOUT ═══ */
        <>
          <div style={{ backgroundColor: "#0a1f0a", minHeight: "100vh", position: "relative" }}>
            <div style={{ position: "absolute", inset: "12px", border: "1px solid rgba(74,222,128,0.08)", borderRadius: "8px", pointerEvents: "none", zIndex: 0 }} />

            {/* Nav */}
            <div className="flex items-center justify-between px-5 pt-6 relative z-10">
              <button onClick={() => navigate("/home")}>
                <ArrowLeft className="w-6 h-6" style={{ color: "rgba(74,222,128,0.6)" }} />
              </button>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowChat(true)} className="flex flex-col items-center gap-0.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)" }}>
                    <MessageCircle className="w-4 h-4" style={{ color: "rgba(74,222,128,0.7)" }} />
                  </div>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 600, color: "rgba(74,222,128,0.5)" }}>Message host</span>
                </button>
              </div>
            </div>

            {/* Header */}
            <div className="px-6 pt-6 pb-4 relative z-10">
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase" as const, color: "rgba(74,222,128,0.5)", marginBottom: "10px" }}>An Invitation</p>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: noirFontSize, fontWeight: 900, color: "#ffffff", lineHeight: 1.1, marginBottom: "6px" }}>{event.title || "Untitled Event"}</h1>
              {event.vibe && <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", fontStyle: "italic", color: "rgba(74,222,128,0.45)", marginBottom: "14px" }}>{event.vibe}</p>}
              {!event.vibe && <div style={{ marginBottom: "14px" }} />}

              {/* Diamond divider */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                <div style={{ flex: 1, height: "1px", backgroundColor: "rgba(74,222,128,0.25)" }} />
                <span style={{ color: "rgba(74,222,128,0.6)", fontSize: "13px" }}>◆</span>
                <div style={{ flex: 1, height: "1px", backgroundColor: "rgba(74,222,128,0.25)" }} />
              </div>

              {/* Single inline date · time · going row */}
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "14px", fontWeight: 500, color: "rgba(255,255,255,0.75)", letterSpacing: "0.01em" }}>
                {dayNum ? `${dayNum} ${monthName}` : "—"}
                <span style={{ color: "rgba(74,222,128,0.45)", margin: "0 8px" }}>·</span>
                {timeStr || "—"}
                <span style={{ color: "rgba(74,222,128,0.45)", margin: "0 8px" }}>·</span>
                {goingList.length} going
              </p>
            </div>

            <div className="px-5 pb-10 relative z-10 flex flex-col gap-3">
              {event.location && (
                <div style={{ backgroundColor: "rgba(74,222,128,0.13)", border: "1px solid rgba(74,222,128,0.28)", borderRadius: "14px", padding: "14px 16px" }}>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase" as const, color: "rgba(74,222,128,0.7)", marginBottom: "6px" }}>Location</p>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>{event.location}</p>
                </div>
              )}
              {event.dress_code && (
                <div style={{ backgroundColor: "rgba(74,222,128,0.13)", border: "1px solid rgba(74,222,128,0.28)", borderRadius: "14px", padding: "14px 16px" }}>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase" as const, color: "rgba(74,222,128,0.7)", marginBottom: "6px" }}>Dress Code</p>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>{event.dress_code}</p>
                </div>
              )}
              {event.extra && (
                <div style={{ border: "1px solid rgba(74,222,128,0.15)", borderRadius: "12px", padding: "12px 16px" }}>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: "rgba(74,222,128,0.5)", marginBottom: "6px" }}>From the host</p>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>{event.extra}</p>
                </div>
              )}

              {/* Who's going */}
              <div style={{ border: "1px solid rgba(74,222,128,0.18)", borderRadius: "12px", padding: "12px 14px" }}>
                <button onClick={() => setGuestListExpanded(!guestListExpanded)} className="flex items-center justify-between w-full mb-2">
                  <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 700, color: "#fff" }}>Who's going</h2>
                  <div className="flex items-center gap-2">
                    {goingList.length > 0 && <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", fontWeight: 700, color: "#4ade80" }}>{goingList.length} going</span>}
                    {guestListExpanded ? <ChevronUp className="w-4 h-4" style={{ color: "#4ade80" }} /> : <ChevronDown className="w-4 h-4" style={{ color: "#4ade80" }} />}
                  </div>
                </button>
                <div className="flex items-center gap-2 overflow-x-auto">
                  {goingList.length === 0 && <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "rgba(74,222,128,0.4)" }}>No one yet</p>}
                  {goingList.map((r, i) => (
                    <div key={i} className="flex flex-col items-center shrink-0">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden" style={{ border: "2px solid rgba(74,222,128,0.5)", backgroundColor: "rgba(74,222,128,0.1)" }}>
                        {r.avatar_url ? <img src={r.avatar_url} alt="" className="w-full h-full object-cover" /> : <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", fontWeight: 700, color: "#4ade80" }}>{getInitials(r.name)}</span>}
                      </div>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "10px", color: "rgba(74,222,128,0.5)" }} className="mt-1 max-w-[40px] truncate">{r.name.split(" ")[0]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat */}
              <div style={{ border: "1px solid rgba(74,222,128,0.18)", borderRadius: "12px", padding: "12px 14px" }}>
                <div className="flex items-center justify-between mb-3">
                  <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 700, color: "#fff" }}>Chat</h2>
                  <button onClick={() => setShowFullComments(true)}><Maximize2 className="w-4 h-4" style={{ color: "rgba(74,222,128,0.6)" }} /></button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                  {comments.length === 0 && <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "rgba(74,222,128,0.35)", textAlign: "center", padding: "12px 0" }}>No messages yet — be the first!</p>}
                  {comments.map((c, i) => (
                    <div key={i} className="rounded-xl px-3 py-2" style={{ backgroundColor: "rgba(74,222,128,0.06)" }}>
                      <div className="flex items-center gap-2">
                        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", fontWeight: 700, color: "#4ade80" }}>{c.user_name}</span>
                        <span style={{ fontSize: "10px", color: "rgba(74,222,128,0.4)" }}>{formatTime(c.created_at)}</span>
                      </div>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.8)", marginTop: "2px" }}>{c.text}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} enterKeyHint="send" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendComment(); } }} placeholder="Write a message..." className="flex-1 rounded-full px-4 py-2 text-sm outline-none" style={{ backgroundColor: "rgba(74,222,128,0.06)", color: "#fff", border: "1px solid rgba(74,222,128,0.2)", fontFamily: "'Inter', sans-serif" }} />
                  <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); sendComment(); }} className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#4ade80" }}>
                    <Send className="w-4 h-4" style={{ color: "#0a1f0a" }} />
                  </button>
                </div>
              </div>

              {/* Gallery */}
              <div style={{ border: "1px solid rgba(74,222,128,0.18)", borderRadius: "12px", padding: "12px 14px", marginBottom: "20px" }}>
                <div className="flex items-center justify-between mb-3">
                  <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 700, color: "#fff" }}>Gallery</h2>
                  <button onClick={() => photoInput.current?.click()} className="text-xs font-bold rounded-full px-3 py-1" style={{ backgroundColor: "#4ade80", color: "#0a1f0a", fontFamily: "'Inter', sans-serif" }}>Add photo</button>
                  <input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </div>
                {uploadingPhoto && <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#4ade80", textAlign: "center", padding: "8px 0" }}>Uploading...</p>}
                {photos.length === 0 && !uploadingPhoto ? (
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "rgba(74,222,128,0.35)", textAlign: "center", padding: "16px 0" }}>No photos yet — add the first one!</p>
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
      ) : isCustom ? (
        /* ═══ PLANIT CUSTOM LAYOUT ═══ */
        <>
          {(() => {
            const bp = (event as any).bg_photo as string | null;
            const isCssGradient = !!(bp && (
              bp.startsWith("linear-gradient") || bp.startsWith("radial-gradient") ||
              bp.startsWith("conic-gradient") || bp.startsWith("repeating-")
            ));
            const isPattern = !isCssGradient && !!(bp?.startsWith("planit-pattern:") || bp?.startsWith("solid-"));
            const bgColorHsl = (event as any).bg_color as string | null;
            const patStyle: React.CSSProperties = isPattern
              ? getPatternBgStyle(bp!)
              : isCssGradient
                ? { backgroundImage: bp!, backgroundSize: "auto", backgroundColor: bgColorHsl ? `hsl(${bgColorHsl})` : "" }
                : bp && (bp.startsWith("http") || bp.startsWith("blob:"))
                  ? { backgroundImage: `url(${bp})`, backgroundSize: "cover", backgroundPosition: "center" }
                  : { backgroundColor: bgColorHsl ? `hsl(${bgColorHsl})` : "#111111" };
            const bgL = bgColorHsl ? parseFloat(bgColorHsl.trim().split(/[\s,]+/)[2] ?? "0") : 0;
            const isLight = isPattern ? isLightPattern(bp!) : isCssGradient ? bgL > 55 : false;
            const storedFontColor = ((event as any).font_color as string | null) || "#ffffff";
            const tCol = storedFontColor;
            const tMuted = hexMuted(tCol);
            const frostBg = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.09)";
            const frostBorder = isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.16)";
            const fontFam = ({ Bold:"'Bebas Neue', sans-serif", Handwritten:"'Caveat', cursive", Elegant:"'Playfair Display', serif" } as Record<string,string>)[event.font_style||"Bold"] || "'Bebas Neue', sans-serif";
            const titleSz = event.text_size === "Small" ? "28px" : event.text_size === "Large" ? "44px" : "36px";
            const titleWt = event.font_style === "Bold" ? 400 : 800;
            let stickerItems: StickerItem[] = [];
            try { stickerItems = JSON.parse((event as any).stickers || "[]"); } catch {}
            return (
              <div style={{ minHeight: "100vh", position: "relative", overflow: "hidden", ...patStyle }}>
                {isPattern && bp?.startsWith("planit-pattern:") && <PatternOverlay patternKey={bp!} />}
                {/* Photo scrim — only for real images, not CSS gradients */}
                {!isPattern && !isCssGradient && bp && <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 1, pointerEvents: "none" }} />}
                {stickerItems.map(stk => (
                  <div key={stk.id} style={{ position: "absolute", left: `${stk.x}%`, top: `${stk.y}%`, fontSize: `${stk.size}px`, zIndex: 30, pointerEvents: "none" }}>{stk.emoji}</div>
                ))}
                {/* Nav */}
                <div className="flex items-center justify-between px-5 pt-5 relative z-10">
                  <button onClick={() => navigate("/home")}><ArrowLeft className="w-6 h-6" style={{ color: tCol }} /></button>
                  <div className="flex items-center gap-2">
                  <button onClick={() => setShowChat(true)} className="flex flex-col items-center gap-0.5">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: frostBg, border: `1px solid ${frostBorder}`, backdropFilter: "blur(8px)" }}>
                      <MessageCircle className="w-4 h-4" style={{ color: accentColor }} />
                    </div>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 600, color: tMuted }}>Message host</span>
                  </button>
                  </div>
                </div>
                {/* Content */}
                <div className="flex flex-col items-center text-center px-5 pt-6 pb-6 relative z-10">
                  {event.vibe && (
                    <div style={{ border: `1px solid ${accentColor}50`, borderRadius: "50px", padding: "3px 12px", backgroundColor: `${accentColor}15`, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", marginBottom: "10px", display: "inline-block" }}>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" as const, color: accentColor }}>{event.vibe}</span>
                    </div>
                  )}
                  <h1 style={{ fontFamily: fontFam, fontSize: titleSz, fontWeight: titleWt, color: tCol, lineHeight: 1.05, marginBottom: "6px", textShadow: isLight ? "none" : "0 1px 8px rgba(0,0,0,0.5)" }}>{event.title || "Untitled Event"}</h1>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: tMuted, marginBottom: "18px" }}>hosted by {hostName}</p>
                  {/* Date pill */}
                  {eventDate && (
                    <div style={{ borderRadius: "50px", border: `1px solid ${frostBorder}`, padding: "8px 18px", backgroundColor: frostBg, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", marginBottom: "18px", display: "inline-block" }}>
                      <span style={{ fontFamily: fontFam, fontSize: "15px", fontWeight: titleWt, color: accentColor, letterSpacing: event.font_style==="Bold"?"0.05em":0 }}>
                        {dayNum} {monthName}
                        <span style={{ color: tMuted, margin: "0 8px" }}>·</span>
                        {timeStr}
                        <span style={{ color: tMuted, margin: "0 8px" }}>·</span>
                        {goingList.length} going
                      </span>
                    </div>
                  )}
                  {/* Frosted bubbles */}
                  <div className="w-full flex flex-col gap-3">
                    {event.location && (
                      <div style={{ borderRadius: "20px", border: `1px solid ${frostBorder}`, padding: "16px 18px", backgroundColor: frostBg, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: accentColor, marginBottom: "5px" }}>Location</p>
                        <p style={{ fontFamily: fontFam, fontSize: "18px", fontWeight: titleWt, color: tCol, lineHeight: 1.2 }}>{event.location}</p>
                      </div>
                    )}
                    {event.dress_code && (
                      <div style={{ borderRadius: "20px", border: `1px solid ${frostBorder}`, padding: "16px 18px", backgroundColor: frostBg, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: accentColor, marginBottom: "5px" }}>Dress Code</p>
                        <p style={{ fontFamily: fontFam, fontSize: "18px", fontWeight: titleWt, color: tCol, lineHeight: 1.2 }}>{event.dress_code}</p>
                      </div>
                    )}
                    {event.extra && (
                      <div style={{ borderRadius: "20px", border: `1px solid ${frostBorder}`, padding: "16px 18px", backgroundColor: frostBg, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: accentColor, marginBottom: "5px" }}>From the host</p>
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: tCol, lineHeight: 1.5 }}>{event.extra}</p>
                      </div>
                    )}
                    {goingList.length > 0 && (
                      <div style={{ borderRadius: "20px", border: `1px solid ${frostBorder}`, padding: "16px 18px", backgroundColor: frostBg, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: accentColor, marginBottom: "8px" }}>Who's going</p>
                        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "8px", justifyContent: "center" }}>
                          {goingList.map((r) => (
                            <div key={r.user_id} style={{ width: "30px", height: "30px", borderRadius: "50%", backgroundColor: accentColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", fontWeight: 700, color: accentText }}>{getInitials(r.name)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Chat */}
                    <div style={{ borderRadius: "20px", border: `1px solid ${frostBorder}`, padding: "16px 18px", backgroundColor: frostBg, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: accentColor, margin: 0 }}>Chat</p>
                        <button onClick={() => setShowFullComments(true)}><Maximize2 className="w-4 h-4" style={{ color: accentColor }} /></button>
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                        {comments.length === 0 && (
                          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: tMuted, textAlign: "center", padding: "12px 0" }}>No messages yet — be the first!</p>
                        )}
                        {comments.map((c, i) => (
                          <div key={i} className="rounded-xl px-3 py-2" style={{ backgroundColor: isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)" }}>
                            <div className="flex items-center gap-2">
                              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", fontWeight: 700, color: accentColor }}>{c.user_name}</span>
                              <span style={{ fontSize: "10px", color: tMuted }}>{formatTime(c.created_at)}</span>
                            </div>
                            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: tCol, marginTop: "2px" }}>{c.text}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} enterKeyHint="send" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendComment(); } }} placeholder="Write a message..." className="flex-1 rounded-full px-4 py-2 text-sm outline-none" style={{ backgroundColor: isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)", color: tCol, border: `1px solid ${frostBorder}`, fontFamily: "'Inter', sans-serif" }} />
                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); sendComment(); }} className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: accentColor }}>
                          <Send className="w-4 h-4" style={{ color: accentText }} />
                        </button>
                      </div>
                    </div>
                    {/* Gallery */}
                    <div style={{ borderRadius: "20px", border: `1px solid ${frostBorder}`, padding: "16px 18px", backgroundColor: frostBg, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
                      <div className="flex items-center justify-between mb-3">
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: accentColor }}>Gallery</p>
                        <button onClick={() => photoInput.current?.click()} className="text-xs font-bold rounded-full px-3 py-1" style={{ backgroundColor: accentColor, color: accentText, fontFamily: "'Inter', sans-serif" }}>Add photo</button>
                        <input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                      </div>
                      {uploadingPhoto && <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: accentColor, textAlign: "center", padding: "8px 0" }}>Uploading...</p>}
                      {photos.length === 0 && !uploadingPhoto ? (
                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: tMuted, textAlign: "center", padding: "16px 0" }}>No photos yet — add the first one!</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-1.5">
                          {photos.map((p) => (
                            <div key={p.id} className="aspect-square rounded-xl overflow-hidden cursor-pointer" onClick={() => setSelectedPhoto(p)}>
                              <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ height: "100px" }} />
              </div>
            );
          })()}
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
              <div className="flex items-center gap-2">
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
                    enterKeyHint="send" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendComment(); } }}
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
                    type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); sendComment(); }}
                    className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
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

      {!isVintage && !isSunny && !isGalaxy && !isMidnight && !isOcean && !isBlush && !isForest && !isCustom && (
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
                enterKeyHint="send" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendComment(); } }}
                placeholder="Write a message..."
                className="flex-1 rounded-full px-4 py-2 text-sm text-white placeholder:text-muted-foreground outline-none"
                style={{ backgroundColor: "#2a2a2a" }}
              />
              <button
                type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); sendComment(); }}
                className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
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
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-white font-bold text-base">Chat</h2>
            <button onClick={() => setShowFullComments(false)}>
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
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

          <div className="px-4 py-3 border-t border-border flex gap-2" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
            <input
              ref={fullCommentInputRef}
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              enterKeyHint="send" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendComment(); } }}
              onFocus={() => setTimeout(() => fullCommentInputRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 300)}
              placeholder="Write a message..."
              className="flex-1 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-muted-foreground outline-none border border-border"
              style={{ backgroundColor: "#383838" }}
            />
            <button
              type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); sendComment(); }}
              className="w-11 h-11 rounded-full bg-primary flex items-center justify-center shrink-0"
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
              enterKeyHint="send" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendMessage(); } }}
              placeholder="Type a message..."
              className="flex-1 bg-secondary rounded-full px-4 py-2.5 text-sm text-secondary-foreground placeholder:text-muted-foreground outline-none border border-border"
            />
            <button
              type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); sendMessage(); }}
              className="w-11 h-11 rounded-full bg-primary flex items-center justify-center"
            >
              <Send className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* ─── Photo lightbox ─── */}
      {selectedPhoto && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 200, backgroundColor: "rgba(0,0,0,0.95)", display: "flex", flexDirection: "column" }}
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedPhoto(null); }}
        >
          {/* Header: uploader info + close */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {selectedPhoto.avatar_url ? (
                <img src={selectedPhoto.avatar_url} alt="" style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 700, color: "#fff" }}>
                    {(selectedPhoto.user_name || "G").charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "14px", fontWeight: 600, color: "#fff" }}>
                {selectedPhoto.user_name || "Guest"}
              </span>
            </div>
            <button onClick={() => setSelectedPhoto(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}>
              <X className="w-6 h-6" style={{ color: "#fff" }} />
            </button>
          </div>
          {/* Full-size photo */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", padding: "0 16px" }}>
            <img src={selectedPhoto.photo_url} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: "8px" }} />
          </div>
          {/* Save button */}
          <div style={{ padding: "24px 20px", flexShrink: 0, display: "flex", justifyContent: "center" }}>
            <button
              onClick={() => downloadPhoto(selectedPhoto.photo_url)}
              style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#fff", color: "#000", border: "none", borderRadius: "50px", padding: "13px 28px", fontFamily: "'Inter', sans-serif", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}
            >
              <Download className="w-4 h-4" />
              Save to Camera Roll
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuestEventView;
