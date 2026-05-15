import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MoreVertical,
  X,
  Send,
  Maximize2,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Copy,
  Check,
} from "lucide-react";
import { useEffect, useState, useRef, useMemo } from "react";
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
import {
  VintageCircles,
  VintageDivider,
  VintageHostDivider,
  VintageLocationCard,
  VintageDateCard,
  VintageDressCard,
  VintageNotesCard,
  VintageAttendeeStrip,
  VintageSharedSections,
  VintageRsvpBar,
} from "@/components/layouts/VintageLayout";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type Comment = { id: string; user_name: string; text: string; created_at: string; avatar_url?: string };
type RsvpEntry = { name: string; avatar_url?: string; status: string; user_id: string };
type DM = { id: string; sender_id: string; text: string; created_at: string; sender_name?: string };

const EventView = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);

  // Delete
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // RSVP
  const [rsvp, setRsvp] = useState<string | null>(null);
  const [barMinimised, setBarMinimised] = useState(false);
  const [rsvpList, setRsvpList] = useState<RsvpEntry[]>([]);
  const [guestListExpanded, setGuestListExpanded] = useState(false);

  // Comments
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentDraft, setCommentDraft] = useState("");
  const [showFullComments, setShowFullComments] = useState(false);
  const fullCommentInputRef = useRef<HTMLInputElement>(null);

  // DMs - host sees all conversations
  const [showDMs, setShowDMs] = useState(false);
  const [dmThreads, setDmThreads] = useState<
    { user_id: string; name: string; avatar_url?: string; lastMsg: string; lastTime: string }[]
  >([]);
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<DM[]>([]);
  const [dmDraft, setDmDraft] = useState("");

  // Gallery
  const [photos, setPhotos] = useState<{ id: string; photo_url: string }[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);

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
      });
  }, [code]);

  // Auto-RSVP host as "going"
  useEffect(() => {
    if (!event || !user || event.host_id !== user.id) return;
    const autoRsvp = async () => {
      const { data: existing } = await supabase
        .from("event_guests")
        .select("id, rsvp_status")
        .eq("event_id", event.id)
        .eq("user_id", user.id)
        .single();
      if (!existing) {
        await supabase.from("event_guests").insert({ event_id: event.id, user_id: user.id, rsvp_status: "yes" });
      }
      setRsvp(existing?.rsvp_status || "yes");
      setBarMinimised(true);
    };
    autoRsvp();
  }, [event, user]);

  // Fetch RSVPs
  useEffect(() => {
    if (!event) return;
    const fetchRsvps = async () => {
      const { data } = await supabase.from("event_guests").select("user_id, rsvp_status").eq("event_id", event.id);
      if (data) {
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
    const channel = supabase
      .channel(`host-rsvps-${event.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_guests", filter: `event_id=eq.${event.id}` },
        () => fetchRsvps(),
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
      .channel(`host-comments-${event.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments", filter: `event_id=eq.${event.id}` },
        () => fetchComments(),
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
      .channel(`host-photos-${event.id}`)
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
    if (!event || !user || event.host_id !== user.id) return;
    const fetchThreads = async () => {
      const { data } = await supabase
        .from("direct_messages")
        .select("*")
        .eq("event_id", event.id)
        .order("created_at", { ascending: false });
      if (!data || data.length === 0) {
        setDmThreads([]);
        return;
      }
      // Group by guest user_id
      const guestIds = new Set<string>();
      data.forEach((m: any) => {
        if (m.sender_id !== user.id) guestIds.add(m.sender_id);
        if (m.receiver_id !== user.id) guestIds.add(m.receiver_id);
      });
      const ids = [...guestIds];
      const { data: profiles } = await supabase
        .from("profiles_public" as any)
        .select("user_id, name, avatar_url")
        .in("user_id", ids);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      const threads = ids.map((gId) => {
        const msgs = data.filter((m: any) => m.sender_id === gId || m.receiver_id === gId);
        const last = msgs[0];
        const p = profileMap.get(gId);
        return {
          user_id: gId,
          name: p?.name || "Guest",
          avatar_url: p?.avatar_url,
          lastMsg: last?.text || "",
          lastTime: last?.created_at || "",
        };
      });
      setDmThreads(threads);
    };
    fetchThreads();
    const channel = supabase
      .channel(`host-dms-${event.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages", filter: `event_id=eq.${event.id}` },
        () => fetchThreads(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [event, user]);

  // Fetch thread messages when active
  useEffect(() => {
    if (!activeThread || !event || !user) return;
    const fetchThread = async () => {
      const { data } = await supabase
        .from("direct_messages")
        .select("*")
        .eq("event_id", event.id)
        .or(
          `and(sender_id.eq.${activeThread},receiver_id.eq.${user.id}),and(sender_id.eq.${user.id},receiver_id.eq.${activeThread})`,
        )
        .order("created_at", { ascending: true });
      if (data) {
        setThreadMessages(
          data.map((m: any) => ({ id: m.id, sender_id: m.sender_id, text: m.text, created_at: m.created_at })),
        );
      }
    };
    fetchThread();
    const channel = supabase
      .channel(`host-thread-${activeThread}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages", filter: `event_id=eq.${event.id}` },
        () => fetchThread(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeThread, event, user]);

  const goingList = useMemo(() => rsvpList.filter((r) => r.status === "yes"), [rsvpList]);
  const maybeList = useMemo(() => rsvpList.filter((r) => r.status === "maybe"), [rsvpList]);

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  if (!event)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6">
        <p className="text-foreground font-bold text-xl">Event not found</p>
        <button
          onClick={() => navigate("/home")}
          className="mt-4 text-muted-foreground underline text-sm font-semibold"
        >
          Go home
        </button>
      </div>
    );

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

  const sendComment = async () => {
    if (!commentDraft.trim() || !user || !event) return;
    const text = commentDraft.trim();
    const optimistic: Comment = {
      id: crypto.randomUUID(),
      user_name: profile?.name || "Host",
      text,
      created_at: new Date().toISOString(),
      avatar_url: profile?.avatar_url || undefined,
    };
    setComments((prev) => [...prev, optimistic]);
    setCommentDraft("");
    await supabase
      .from("comments")
      .insert({ event_id: event.id, user_id: user.id, user_name: profile?.name || "Host", text });
  };

  const sendDM = async () => {
    if (!dmDraft.trim() || !user || !activeThread || !event) return;
    await supabase
      .from("direct_messages")
      .insert({ event_id: event.id, sender_id: user.id, receiver_id: activeThread, text: dmDraft.trim() });
    setDmDraft("");
  };

  const copyCode = () => {
    navigator.clipboard.writeText(event.code);
    setCodeCopied(true);
    toast.success("Event code copied!");
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const deleteEvent = async () => {
    if (!event || !isHost) return;
    const { error } = await supabase.from("events").delete().eq("id", event.id).eq("host_id", user!.id);
    if (error) {
      toast.error("Could not delete event");
      return;
    }
    toast.success("Event deleted");
    navigate("/home", { replace: true });
  };

  const rsvpLabel = rsvp === "yes" ? "You're going! 🎉" : rsvp === "no" ? "You're not going 👎" : "You're a maybe 🤷";
  const getInitials = (name: string) => name.charAt(0).toUpperCase();
  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

  // Auto-contrast: determine if bg is light so text on it should be dark
  const isLightBg = (() => {
    if (!event.bg_color) return false;
    // bg_color is HSL without "hsl()" wrapper, e.g. "0 0% 100%"
    const parts = event.bg_color.trim().split(/[\s,]+/);
    const l = parseFloat(parts[2]); // lightness %
    return l > 55;
  })();
  const bgTextColor = isLightBg ? "#111111" : "#ffffff";
  const bgTextMuted = isLightBg ? "rgba(17,17,17,0.6)" : "rgba(255,255,255,0.6)";
  const bgTextSoft = isLightBg ? "rgba(17,17,17,0.8)" : "rgba(255,255,255,0.8)";

  const eventDate = event.date_time ? new Date(event.date_time) : null;
  const monthName = eventDate ? eventDate.toLocaleString(undefined, { month: "short" }).toUpperCase() : "";
  const dayNum = eventDate ? eventDate.getDate() : "";
  const timeStr = eventDate ? eventDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  const dayOfWeek = eventDate ? eventDate.toLocaleString(undefined, { weekday: "long" }) : "";

  const isNoir = (event as any).template_name === "planit-noir";
  const isVintage = (event as any).template_name === "vintage";
  const isGalaxy = ((event as any).template_name || "").toLowerCase() === "galaxy";
  const isSunny = ((event as any).template_name || "").toLowerCase() === "sunny";
  const isMidnight = ((event as any).template_name || "").toLowerCase() === "midnight";
  const isOcean = ((event as any).template_name || "").toLowerCase() === "ocean";
  const isBlush = ((event as any).template_name || "").toLowerCase() === "blush";
  const isForest = ((event as any).template_name || "").toLowerCase() === "forest";
  const isClassic = ((event as any).template_name || "").toLowerCase() === "planit-classic";
  const isCustom = ((event as any).template_name || "").toLowerCase().startsWith("planit-custom");
  const customLayout = ((event as any).template_name || "").includes("-centered") ? "centered" : ((event as any).template_name || "").includes("-editorial") ? "editorial" : "card-stack";
  const galaxyAccent = (event as any).bubble_color ? `hsl(${(event as any).bubble_color})` : "#a855f7";
  const isHost = !authLoading && !!user && !!event && user.id === event.host_id;
  const vintageAccent = (event as any).gradient_color || "#8b7355";
  const containerBg = isVintage
    ? "#f5f0e8"
    : isGalaxy
      ? "#0d0d2b"
      : isSunny
        ? "#ff6b35"
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

  return (
    <div className="flex flex-col min-h-screen pb-28" style={{ backgroundColor: containerBg }}>
      {isVintage ? (
        /* ═══ VINTAGE LAYOUT ═══ */
        <>
          <div className="relative" style={{ minHeight: "260px" }}>
            {/* Navigation */}
            <div className="flex items-center justify-between px-5 pt-6 relative z-20">
              <button onClick={() => navigate("/home")} className="self-start">
                <ArrowLeft className="w-6 h-6" style={{ color: vintageAccent }} />
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                  style={{ backgroundColor: `${vintageAccent}1f`, color: vintageAccent }}
                >
                  {codeCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {event.code}
                </button>
                <button onClick={() => setShowDMs(true)} className="flex flex-col items-center gap-0.5">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${vintageAccent}1f` }}
                  >
                    <MessageCircle className="w-4 h-4" style={{ color: vintageAccent }} />
                  </div>
                  <span style={{ fontSize: "9px", fontWeight: 600, color: vintageAccent }}>Messages</span>
                </button>
                {isHost && (
                  <div className="relative">
                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className="w-9 h-9 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${vintageAccent}1f` }}
                    >
                      <MoreVertical className="w-4 h-4" style={{ color: vintageAccent }} />
                    </button>
                  </div>
                )}
              </div>
            </div>
            {/* Title area */}
            <div className="relative z-10 px-6 pt-6 pb-2 text-center">
              <p
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.2em",
                  color: vintageAccent,
                  textTransform: "uppercase",
                }}
              >
                You are invited to
              </p>
              <h1
                className="mt-3"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: noirFontSize,
                  fontWeight: 900,
                  color: "#2c1810",
                  lineHeight: 1.1,
                }}
              >
                {event.title || "Untitled Event"}
              </h1>
              <VintageHostDivider hostName={profile?.name || "Host"} accentColor={vintageAccent} />
              <VintageDivider accentColor={vintageAccent} />
            </div>
          </div>

          <div className="px-5 pt-0">
            <div className="flex flex-col gap-3">
              {event.location && <VintageLocationCard location={event.location} accentColor={vintageAccent} />}
              {(eventDate || event.dress_code) && (
                <div className="flex gap-3">
                  {eventDate && (
                    <VintageDateCard
                      monthName={monthName}
                      dayNum={String(dayNum)}
                      timeStr={timeStr}
                      dayOfWeek={dayOfWeek}
                      accentColor={vintageAccent}
                    />
                  )}
                  {event.dress_code && <VintageDressCard dressCode={event.dress_code} accentColor={vintageAccent} />}
                </div>
              )}
              {event.extra && <VintageNotesCard notes={event.extra} accentColor={vintageAccent} />}
              <VintageAttendeeStrip goingList={goingList} getInitials={getInitials} accentColor={vintageAccent} />
            </div>
          </div>

          {/* Vintage shared sections */}
          <div className="px-5">
            <VintageSharedSections
              goingList={goingList}
              maybeList={maybeList}
              rsvpList={rsvpList}
              rsvp={rsvp}
              guestListExpanded={guestListExpanded}
              setGuestListExpanded={setGuestListExpanded}
              comments={comments}
              commentDraft={commentDraft}
              setCommentDraft={setCommentDraft}
              sendComment={sendComment}
              showFullComments={showFullComments}
              setShowFullComments={setShowFullComments}
              photos={photos}
              uploadingPhoto={uploadingPhoto}
              photoInput={photoInput}
              handlePhotoUpload={handlePhotoUpload}
              getInitials={getInitials}
              formatTime={formatTime}
              statusBadge={statusBadge}
              accentColor={vintageAccent}
            />
          </div>

          {/* Vintage RSVP bar */}
          <VintageRsvpBar
            rsvp={rsvp}
            barMinimised={barMinimised}
            setBarMinimised={setBarMinimised}
            handleRsvp={handleRsvp}
            rsvpLabel={rsvpLabel}
            accentColor={vintageAccent}
          />

          {/* Delete dialog, DM overlays, etc. reuse existing below */}
        </>
      ) : isGalaxy ? (
        /* ═══ GALAXY LAYOUT ═══ */
        <>
          <div style={{ backgroundColor: "#0d0d2b", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
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

            <div className="flex items-center justify-between px-5 pt-6 relative z-10">
              <button onClick={() => navigate("/home")}>
                <ArrowLeft className="w-6 h-6" style={{ color: "rgba(255,255,255,0.4)" }} />
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                  style={{
                    backgroundColor: "rgba(168,85,247,0.15)",
                    border: "1px solid rgba(168,85,247,0.3)",
                    color: galaxyAccent,
                  }}
                >
                  {codeCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {event.code}
                </button>
                <button onClick={() => setShowDMs(true)} className="flex flex-col items-center gap-0.5">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)" }}
                  >
                    <MessageCircle className="w-4 h-4" style={{ color: galaxyAccent }} />
                  </div>
                  <span className="text-[9px] font-semibold" style={{ color: galaxyAccent }}>
                    Messages
                  </span>
                </button>
                {isHost && (
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)" }}
                  >
                    <MoreVertical className="w-4 h-4" style={{ color: galaxyAccent }} />
                  </button>
                )}
              </div>
            </div>

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
                hosted by {profile?.name || "Host"}
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

            <div className="px-5 flex flex-col gap-3 relative z-10 pb-6">
              {event.location && (
                <div
                  style={{
                    background: "rgba(168,85,247,0.12)",
                    border: "1px solid rgba(168,85,247,0.3)",
                    borderRadius: "14px",
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                  }}
                >
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      background: "rgba(168,85,247,0.25)",
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "22px",
                      flexShrink: 0,
                    }}
                  >
                    📍
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: "9px",
                        color: galaxyAccent,
                        textTransform: "uppercase" as const,
                        letterSpacing: "2px",
                        margin: "0 0 3px",
                        fontFamily: "sans-serif",
                      }}
                    >
                      Location
                    </p>
                    <p
                      style={{ fontSize: "16px", fontWeight: 800, color: "#fff", margin: 0, fontFamily: "sans-serif" }}
                    >
                      {event.location}
                    </p>
                  </div>
                </div>
              )}
              {eventDate && (
                <div
                  style={{
                    background: "rgba(236,72,153,0.12)",
                    border: "1px solid rgba(236,72,153,0.3)",
                    borderRadius: "14px",
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                  }}
                >
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      background: "rgba(236,72,153,0.25)",
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "22px",
                      flexShrink: 0,
                    }}
                  >
                    🗓️
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: "9px",
                        color: "#ec4899",
                        textTransform: "uppercase" as const,
                        letterSpacing: "2px",
                        margin: "0 0 3px",
                        fontFamily: "sans-serif",
                      }}
                    >
                      Date
                    </p>
                    <p
                      style={{ fontSize: "16px", fontWeight: 800, color: "#fff", margin: 0, fontFamily: "sans-serif" }}
                    >
                      {dayOfWeek} {dayNum} {monthName} · {timeStr}
                    </p>
                  </div>
                </div>
              )}
              {event.dress_code && (
                <div
                  style={{
                    background: "rgba(99,102,241,0.12)",
                    border: "1px solid rgba(99,102,241,0.3)",
                    borderRadius: "14px",
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                  }}
                >
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      background: "rgba(99,102,241,0.25)",
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "22px",
                      flexShrink: 0,
                    }}
                  >
                    🎭
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: "9px",
                        color: "#818cf8",
                        textTransform: "uppercase" as const,
                        letterSpacing: "2px",
                        margin: "0 0 3px",
                        fontFamily: "sans-serif",
                      }}
                    >
                      Dress code
                    </p>
                    <p
                      style={{ fontSize: "16px", fontWeight: 800, color: "#fff", margin: 0, fontFamily: "sans-serif" }}
                    >
                      {event.dress_code}
                    </p>
                  </div>
                </div>
              )}
              {event.extra && (
                <div
                  style={{
                    background: "rgba(168,85,247,0.08)",
                    border: "1px solid rgba(168,85,247,0.15)",
                    borderRadius: "14px",
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "14px",
                  }}
                >
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      background: "rgba(168,85,247,0.15)",
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "22px",
                      flexShrink: 0,
                    }}
                  >
                    ✦
                  </div>
                  <div>
                    <p
                      style={{
                        fontSize: "9px",
                        color: galaxyAccent,
                        textTransform: "uppercase" as const,
                        letterSpacing: "2px",
                        margin: "0 0 3px",
                        fontFamily: "sans-serif",
                      }}
                    >
                      Note from host
                    </p>
                    <p
                      style={{
                        fontSize: "13px",
                        color: "rgba(255,255,255,0.55)",
                        fontStyle: "italic",
                        margin: 0,
                        fontFamily: "sans-serif",
                      }}
                    >
                      {event.extra}
                    </p>
                  </div>
                </div>
              )}
              <div>
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

            <div className="flex items-center justify-between px-5 pt-6 relative z-10">
              <button onClick={() => navigate("/home")}>
                <ArrowLeft className="w-6 h-6 text-white/60" />
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.15)",
                    border: "1px solid rgba(255,255,255,0.25)",
                    color: "#fff",
                  }}
                >
                  {codeCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {event.code}
                </button>
                <button onClick={() => setShowDMs(true)} className="flex flex-col items-center gap-0.5">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}
                  >
                    <MessageCircle className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-[9px] font-semibold text-white/70">Messages</span>
                </button>
                {isHost && (
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}
                  >
                    <MoreVertical className="w-4 h-4 text-white" />
                  </button>
                )}
              </div>
            </div>

            <div className="text-center px-6 pt-6 pb-4 relative z-10">
              <p
                style={{
                  fontFamily: "'Caveat', cursive",
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
                  fontFamily: "'Caveat', cursive",
                  fontSize: "38px",
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
                    fontFamily: "'Caveat', cursive",
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
                style={{
                  fontFamily: "'Caveat', cursive",
                  fontSize: "13px",
                  color: "rgba(255,255,255,0.4)",
                  marginBottom: "12px",
                }}
              >
                hosted by {profile?.name || "Host"}
              </p>
              <div className="flex items-center gap-3 justify-center">
                <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.2)" }} />
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "16px" }}>☀</span>
                <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.2)" }} />
              </div>
            </div>

            <div className="px-5 flex flex-col gap-3 relative z-10 pb-6">
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
                  <h2 style={{ fontFamily: "'Caveat', cursive", fontSize: "18px", fontWeight: 700, color: "#fff" }}>
                    Who's going
                  </h2>
                  <div className="flex items-center gap-2">
                    {goingList.length > 0 && (
                      <span
                        style={{ fontFamily: "'Caveat', cursive", fontSize: "13px", color: "rgba(255,255,255,0.6)" }}
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
                    <p style={{ fontFamily: "'Caveat', cursive", fontSize: "14px", color: "rgba(255,255,255,0.4)" }}>
                      No one yet
                    </p>
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
                          <span
                            style={{
                              fontFamily: "'Caveat', cursive",
                              fontSize: "14px",
                              fontWeight: 700,
                              color: "#fff",
                            }}
                          >
                            {getInitials(r.name)}
                          </span>
                        )}
                      </div>
                      <span
                        style={{ fontFamily: "'Caveat', cursive", fontSize: "12px", color: "rgba(255,255,255,0.6)" }}
                        className="mt-1 max-w-[40px] truncate"
                      >
                        {r.name.split(" ")[0]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "16px",
                  padding: "12px 14px",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 style={{ fontFamily: "'Caveat', cursive", fontSize: "18px", fontWeight: 700, color: "#fff" }}>
                    Chat
                  </h2>
                  <button onClick={() => setShowFullComments(true)}>
                    <Maximize2 className="w-4 h-4 text-white/60" />
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                  {comments.length === 0 && (
                    <p
                      style={{
                        fontFamily: "'Caveat', cursive",
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
                        <span
                          style={{ fontFamily: "'Caveat', cursive", fontSize: "14px", fontWeight: 700, color: "#fff" }}
                        >
                          {c.user_name}
                        </span>
                        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)" }}>
                          {formatTime(c.created_at)}
                        </span>
                      </div>
                      <p
                        style={{
                          fontFamily: "'Caveat', cursive",
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
                      fontFamily: "'Caveat', cursive",
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
                  <h2 style={{ fontFamily: "'Caveat', cursive", fontSize: "18px", fontWeight: 700, color: "#fff" }}>
                    Gallery
                  </h2>
                  <button
                    onClick={() => photoInput.current?.click()}
                    className="text-xs font-bold rounded-full px-3 py-1"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.9)",
                      color: "#c8440a",
                      fontFamily: "'Caveat', cursive",
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
                      fontFamily: "'Caveat', cursive",
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
                      fontFamily: "'Caveat', cursive",
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
            </div>
          </div>
        </>
      ) : isMidnight ? (
        /* ═══ MIDNIGHT LAYOUT ═══ */
        <>
          <div style={{ backgroundColor: containerBg, minHeight: "100vh" }}>
            <div className="flex items-center justify-between px-5 pt-6 relative z-10">
              <button onClick={() => navigate("/home")}>
                <ArrowLeft className="w-6 h-6" style={{ color: accentColor }} />
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                  style={{
                    backgroundColor: `${accentColor}18`,
                    border: `1px solid ${accentColor}40`,
                    color: accentColor,
                  }}
                >
                  {codeCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {event.code}
                </button>
                <button onClick={() => setShowDMs(true)} className="flex flex-col items-center gap-0.5">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${accentColor}18`, border: `1px solid ${accentColor}40` }}
                  >
                    <MessageCircle className="w-4 h-4" style={{ color: accentColor }} />
                  </div>
                  <span className="text-[9px] font-semibold" style={{ color: accentColor }}>
                    Messages
                  </span>
                </button>
                {isHost && (
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${accentColor}18`, border: `1px solid ${accentColor}40` }}
                  >
                    <MoreVertical className="w-4 h-4" style={{ color: accentColor }} />
                  </button>
                )}
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
                    hosted by {profile?.name || "Host"}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-5 pb-6 flex flex-col gap-3">
              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: "10px" }}>
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
                    onKeyDown={(e) => e.key === "Enter" && sendComment()}
                    placeholder="Write a message..."
                    className="flex-1 rounded-full px-4 py-2 text-sm outline-none"
                    style={{
                      backgroundColor: isLightBg ? "#ebebeb" : "#1a1a1a",
                      color: bgTextColor,
                      border: `1px solid ${accentColor}30`,
                    }}
                  />
                  <button
                    onClick={sendComment}
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: accentColor }}
                  >
                    <Send className="w-4 h-4" style={{ color: isLightBg ? "#fff" : "#111" }} />
                  </button>
                </div>
              </div>

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
                <button onClick={copyCode} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold" style={{ backgroundColor: "rgba(56,189,248,0.1)", border: "1px solid rgba(56,189,248,0.25)", color: "rgb(56,189,248)", fontFamily: "'Inter', sans-serif" }}>
                  {codeCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {event.code}
                </button>
                <button onClick={() => setShowDMs(true)} className="flex flex-col items-center gap-0.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.2)" }}>
                    <MessageCircle className="w-4 h-4" style={{ color: "rgba(56,189,248,0.7)" }} />
                  </div>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 600, color: "rgba(56,189,248,0.5)" }}>Messages</span>
                </button>
                {isHost && (
                  <button onClick={() => setShowMenu(!showMenu)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.2)" }}>
                    <MoreVertical className="w-4 h-4" style={{ color: "rgba(56,189,248,0.7)" }} />
                  </button>
                )}
              </div>
            </div>

            {/* Header */}
            <div className="px-5 pt-10 pb-2 relative z-10 text-center">
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(56,189,248,0.5)", marginBottom: "10px" }}>You're Invited</p>
              <h1 style={{ fontFamily: "'Inter', sans-serif", fontSize: noirFontSize, fontWeight: 900, color: "#ffffff", lineHeight: 1.1, marginBottom: "8px" }}>{event.title || "Untitled Event"}</h1>
              {event.vibe && <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", fontStyle: "italic", color: "rgba(56,189,248,0.45)", marginBottom: "6px" }}>{event.vibe}</p>}
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", color: "rgba(56,189,248,0.35)", marginBottom: "16px" }}>hosted by {profile?.name || "Host"}</p>
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
                  <input value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendComment()} placeholder="Write a message..." className="flex-1 rounded-full px-4 py-2 text-sm outline-none" style={{ backgroundColor: "rgba(56,189,248,0.07)", color: "#ffffff", border: "1px solid rgba(56,189,248,0.2)", fontFamily: "'Inter', sans-serif" }} />
                  <button onClick={sendComment} className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "rgb(56,189,248)" }}>
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
                <button onClick={copyCode} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold" style={{ backgroundColor: "rgba(244,114,182,0.1)", border: "1px solid rgba(244,114,182,0.25)", color: "#f472b6", fontFamily: "'Inter', sans-serif" }}>
                  {codeCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {event.code}
                </button>
                <button onClick={() => setShowDMs(true)} className="flex flex-col items-center gap-0.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(244,114,182,0.1)", border: "1px solid rgba(244,114,182,0.25)" }}>
                    <MessageCircle className="w-4 h-4" style={{ color: "rgba(244,114,182,0.7)" }} />
                  </div>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 600, color: "rgba(244,114,182,0.5)" }}>Messages</span>
                </button>
                {isHost && (
                  <button onClick={() => setShowMenu(!showMenu)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(244,114,182,0.1)", border: "1px solid rgba(244,114,182,0.25)" }}>
                    <MoreVertical className="w-4 h-4" style={{ color: "rgba(244,114,182,0.7)" }} />
                  </button>
                )}
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
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "rgba(244,114,182,0.4)" }}>hosted by {profile?.name || "Host"}</p>
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
                  <input value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendComment()} placeholder="Write a message..." className="flex-1 rounded-full px-4 py-2 text-sm outline-none" style={{ backgroundColor: "rgba(244,114,182,0.07)", color: "#fff", border: "1px solid rgba(244,114,182,0.2)", fontFamily: "'Inter', sans-serif" }} />
                  <button onClick={sendComment} className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#f472b6" }}>
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
            <div style={{ position: "absolute", inset: "12px", border: "1px solid rgba(74,222,128,0.08)", borderRadius: "8px", pointerEvents: "none" as const, zIndex: 0 }} />

            {/* Nav */}
            <div className="flex items-center justify-between px-5 pt-6 relative z-10">
              <button onClick={() => navigate("/home")}>
                <ArrowLeft className="w-6 h-6" style={{ color: "rgba(74,222,128,0.6)" }} />
              </button>
              <div className="flex items-center gap-2">
                <button onClick={copyCode} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold" style={{ backgroundColor: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", color: "#4ade80", fontFamily: "'Inter', sans-serif" }}>
                  {codeCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {event.code}
                </button>
                <button onClick={() => setShowDMs(true)} className="flex flex-col items-center gap-0.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)" }}>
                    <MessageCircle className="w-4 h-4" style={{ color: "rgba(74,222,128,0.7)" }} />
                  </div>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 600, color: "rgba(74,222,128,0.5)" }}>Messages</span>
                </button>
                {isHost && (
                  <button onClick={() => setShowMenu(!showMenu)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)" }}>
                    <MoreVertical className="w-4 h-4" style={{ color: "rgba(74,222,128,0.7)" }} />
                  </button>
                )}
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
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "7px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(74,222,128,0.5)", marginBottom: "6px" }}>From the host</p>
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
                  <input value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendComment()} placeholder="Write a message..." className="flex-1 rounded-full px-4 py-2 text-sm outline-none" style={{ backgroundColor: "rgba(74,222,128,0.06)", color: "#fff", border: "1px solid rgba(74,222,128,0.2)", fontFamily: "'Inter', sans-serif" }} />
                  <button onClick={sendComment} className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#4ade80" }}>
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
      ) : isClassic ? (
        /* ═══ PLANIT CLASSIC LAYOUT ═══ */
        <>
          <div style={{ backgroundColor: "#2b2b2b", minHeight: "100vh", position: "relative" }}>
            {/* Nav */}
            <div className="flex items-center justify-between px-5 pt-6 relative z-10">
              <button onClick={() => navigate("/home")}>
                <ArrowLeft className="w-6 h-6" style={{ color: "rgba(255,255,255,0.5)" }} />
              </button>
              <div className="flex items-center gap-2">
                <button onClick={copyCode} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold" style={{ backgroundColor: "rgba(170,238,68,0.08)", border: "1px solid rgba(170,238,68,0.2)", color: "#aaee44", fontFamily: "'Inter', sans-serif" }}>
                  {codeCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {event.code}
                </button>
                <button onClick={() => setShowDMs(true)} className="flex flex-col items-center gap-0.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(170,238,68,0.08)", border: "1px solid rgba(170,238,68,0.2)" }}>
                    <MessageCircle className="w-4 h-4" style={{ color: "rgba(170,238,68,0.7)" }} />
                  </div>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 600, color: "rgba(170,238,68,0.5)" }}>Messages</span>
                </button>
                {isHost && (
                  <button onClick={() => setShowMenu(!showMenu)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(170,238,68,0.08)", border: "1px solid rgba(170,238,68,0.2)" }}>
                    <MoreVertical className="w-4 h-4" style={{ color: "rgba(170,238,68,0.7)" }} />
                  </button>
                )}
              </div>
            </div>

            {/* Header */}
            <div className="px-5 pt-6 pb-3">
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase" as const, color: "#aaee44", marginBottom: "8px" }}>Planit</p>
              <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "58px", fontWeight: 400, color: "#ffffff", lineHeight: 0.95, letterSpacing: "0.02em", marginBottom: "8px" }}>{event.title || "Untitled Event"}</h1>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "rgba(170,238,68,0.6)", fontWeight: 500 }}>hosted by {profile?.name || "Host"}</p>
            </div>

            {/* Full-width stat bar — lime bg, dark text, no radius */}
            <div style={{ display: "flex", borderTop: "2px solid #aaee44", borderBottom: "2px solid #aaee44" }}>
              <div style={{ flex: 1, backgroundColor: "#aaee44", padding: "14px 8px", textAlign: "center" as const, borderRight: "1px solid rgba(0,0,0,0.2)" }}>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "32px", fontWeight: 400, color: "#111", display: "block", lineHeight: 1, letterSpacing: "0.02em" }}>{dayNum || "—"}</span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" as const, color: "rgba(0,0,0,0.55)", marginTop: "3px", display: "block" }}>{monthName || "TBD"}</span>
              </div>
              <div style={{ flex: 1, backgroundColor: "#aaee44", padding: "14px 8px", textAlign: "center" as const, borderRight: "1px solid rgba(0,0,0,0.2)" }}>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "32px", fontWeight: 400, color: "#111", display: "block", lineHeight: 1, letterSpacing: "0.02em" }}>{timeStr || "—"}</span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" as const, color: "rgba(0,0,0,0.55)", marginTop: "3px", display: "block" }}>Start</span>
              </div>
              <div style={{ flex: 1, backgroundColor: "#aaee44", padding: "14px 8px", textAlign: "center" as const }}>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "32px", fontWeight: 400, color: "#111", display: "block", lineHeight: 1, letterSpacing: "0.02em" }}>{goingList.length}</span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" as const, color: "rgba(0,0,0,0.55)", marginTop: "3px", display: "block" }}>Going</span>
              </div>
            </div>

            {/* Cards */}
            <div className="px-5 pt-4 pb-6 flex flex-col gap-3">
              {event.location && (
                <div style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "14px 16px" }}>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase" as const, color: "#aaee44", marginBottom: "6px" }}>Location</p>
                  <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "22px", fontWeight: 400, color: "#fff", lineHeight: 1.2, letterSpacing: "0.02em" }}>{event.location}</p>
                </div>
              )}
              {event.dress_code && (
                <div style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "14px 16px" }}>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase" as const, color: "#aaee44", marginBottom: "6px" }}>Dress Code</p>
                  <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "22px", fontWeight: 400, color: "#fff", lineHeight: 1.2, letterSpacing: "0.02em" }}>{event.dress_code}</p>
                </div>
              )}
              {event.extra && (
                <div style={{ border: "1px solid rgba(170,238,68,0.15)", borderRadius: "10px", padding: "14px 16px" }}>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase" as const, color: "rgba(170,238,68,0.5)", marginBottom: "6px" }}>From the host</p>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>{event.extra}</p>
                </div>
              )}

              {/* Who's going */}
              {goingList.length > 0 && (
                <div style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "14px 16px" }}>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase" as const, color: "#aaee44", marginBottom: "10px" }}>Who's going</p>
                  <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "8px" }}>
                    {goingList.map((r) => (
                      <div key={r.user_id} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "#aaee44", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", fontWeight: 700, color: "#111" }}>{getInitials(r.name)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ height: "100px" }} />
          </div>
        </>
      ) : isCustom ? (
        /* ═══ PLANIT CUSTOM LAYOUT ═══ */
        <>
          <div style={{ minHeight: "100vh", position: "relative", ...bgStyle }}>
            {event.bg_photo && !event.bg_photo.startsWith("linear-gradient") && (
              <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.38)", zIndex: 0 }} />
            )}
            {/* Nav */}
            <div className="flex items-center justify-between px-5 pt-6 relative z-10">
              <button onClick={() => navigate("/home")}>
                <ArrowLeft className="w-6 h-6" style={{ color: bgTextColor }} />
              </button>
              <div className="flex items-center gap-2">
                <button onClick={copyCode} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold" style={{ backgroundColor: `${accentColor}18`, border: `1px solid ${accentColor}40`, color: accentColor, fontFamily: "'Inter', sans-serif" }}>
                  {codeCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {event.code}
                </button>
                <button onClick={() => setShowDMs(true)} className="flex flex-col items-center gap-0.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: `${accentColor}18`, border: `1px solid ${accentColor}40` }}>
                    <MessageCircle className="w-4 h-4" style={{ color: accentColor }} />
                  </div>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 600, color: bgTextMuted }}>Messages</span>
                </button>
                {isHost && (
                  <button onClick={() => setShowMenu(!showMenu)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: `${accentColor}18`, border: `1px solid ${accentColor}40` }}>
                    <MoreVertical className="w-4 h-4" style={{ color: accentColor }} />
                  </button>
                )}
              </div>
            </div>

            {/* CENTERED layout */}
            {customLayout === "centered" && (
              <div className="flex flex-col items-center text-center px-5 pt-8 pb-6 relative z-10">
                {event.vibe && (
                  <div style={{ border: `1px solid ${accentColor}60`, borderRadius: "50px", padding: "4px 14px", backgroundColor: `${accentColor}18`, marginBottom: "12px", display: "inline-block" }}>
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" as const, color: accentColor }}>{event.vibe}</span>
                  </div>
                )}
                <h1 style={{ fontFamily: eventFontFamily, fontSize: noirFontSize, fontWeight: 800, color: bgTextColor, lineHeight: 1.05, marginBottom: "8px" }}>{event.title || "Untitled Event"}</h1>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: bgTextMuted, marginBottom: "20px" }}>hosted by {profile?.name || "Host"}</p>
                <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" as const, marginBottom: "20px" }}>
                  {dayNum && <div style={{ borderRadius: "50px", border: `1px solid ${accentColor}50`, padding: "8px 14px", backgroundColor: `${accentColor}18` }}><span style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 700, color: accentColor }}>{dayNum} {monthName}</span></div>}
                  {timeStr && <div style={{ borderRadius: "50px", border: `1px solid ${accentColor}50`, padding: "8px 14px", backgroundColor: `${accentColor}18` }}><span style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 700, color: accentColor }}>{timeStr}</span></div>}
                  <div style={{ borderRadius: "50px", border: `1px solid ${accentColor}50`, padding: "8px 14px", backgroundColor: `${accentColor}18` }}><span style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", fontWeight: 700, color: accentColor }}>{goingList.length} going</span></div>
                </div>
                <div className="w-full flex flex-col gap-3">
                  {event.location && <div style={{ border: `1px solid ${bgTextColor}18`, borderRadius: "12px", padding: "14px 16px", backgroundColor: `${bgTextColor}08` }}><p style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: accentColor, marginBottom: "6px" }}>Location</p><p style={{ fontFamily: eventFontFamily, fontSize: "18px", fontWeight: 600, color: bgTextColor, lineHeight: 1.2 }}>{event.location}</p></div>}
                  {event.dress_code && <div style={{ border: `1px solid ${bgTextColor}18`, borderRadius: "12px", padding: "14px 16px", backgroundColor: `${bgTextColor}08` }}><p style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: accentColor, marginBottom: "6px" }}>Dress Code</p><p style={{ fontFamily: eventFontFamily, fontSize: "18px", fontWeight: 600, color: bgTextColor, lineHeight: 1.2 }}>{event.dress_code}</p></div>}
                  {event.extra && <div style={{ border: `1px solid ${accentColor}20`, borderRadius: "12px", padding: "14px 16px" }}><p style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: accentColor, marginBottom: "6px" }}>From the host</p><p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: bgTextSoft, lineHeight: 1.5, textAlign: "center" as const }}>{event.extra}</p></div>}
                </div>
              </div>
            )}

            {/* EDITORIAL layout */}
            {customLayout === "editorial" && (
              <div className="px-5 pt-8 pb-6 relative z-10">
                {event.vibe && (
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <div style={{ width: "3px", height: "16px", borderRadius: "2px", backgroundColor: accentColor, flexShrink: 0 }} />
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase" as const, color: accentColor }}>{event.vibe}</p>
                  </div>
                )}
                <h1 style={{ fontFamily: eventFontFamily, fontSize: "52px", fontWeight: 900, color: bgTextColor, lineHeight: 0.95, marginBottom: "14px" }}>{event.title || "Untitled Event"}</h1>
                <div style={{ height: "1px", backgroundColor: `${accentColor}30`, marginBottom: "14px" }} />
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "14px", fontWeight: 500, color: bgTextSoft, marginBottom: "20px" }}>
                  {dayNum ? `${dayNum} ${monthName}` : "—"}
                  {dayNum && <span style={{ color: accentColor, margin: "0 8px" }}>·</span>}
                  {timeStr || "—"}
                  <span style={{ color: accentColor, margin: "0 8px" }}>·</span>
                  {goingList.length} going
                </p>
                <div className="flex flex-col gap-3">
                  {event.location && <div style={{ border: `1px solid ${accentColor}25`, borderRadius: "12px", padding: "14px 16px", backgroundColor: `${bgTextColor}06` }}><p style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: accentColor, marginBottom: "6px" }}>Location</p><p style={{ fontFamily: eventFontFamily, fontSize: "20px", fontWeight: 700, color: bgTextColor, lineHeight: 1.2 }}>{event.location}</p></div>}
                  {event.dress_code && <div style={{ border: `1px solid ${accentColor}25`, borderRadius: "12px", padding: "14px 16px", backgroundColor: `${bgTextColor}06` }}><p style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: accentColor, marginBottom: "6px" }}>Dress Code</p><p style={{ fontFamily: eventFontFamily, fontSize: "20px", fontWeight: 700, color: bgTextColor, lineHeight: 1.2 }}>{event.dress_code}</p></div>}
                  {event.extra && <div style={{ border: `1px solid ${accentColor}18`, borderRadius: "12px", padding: "14px 16px" }}><p style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: accentColor, marginBottom: "6px" }}>From the host</p><p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: bgTextSoft, lineHeight: 1.5 }}>{event.extra}</p></div>}
                </div>
              </div>
            )}

            {/* CARD STACK layout */}
            {customLayout === "card-stack" && (
              <div className="relative z-10">
                <div className="px-5 pt-8 pb-3">
                  {event.vibe && <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" as const, color: accentColor, marginBottom: "6px" }}>{event.vibe}</p>}
                  <h1 style={{ fontFamily: eventFontFamily, fontSize: noirFontSize, fontWeight: 800, color: bgTextColor, lineHeight: 1.05, marginBottom: "6px" }}>{event.title || "Untitled Event"}</h1>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: bgTextMuted }}>hosted by {profile?.name || "Host"}</p>
                </div>
                <div style={{ display: "flex", borderTop: `2px solid ${accentColor}`, borderBottom: `2px solid ${accentColor}` }}>
                  <div style={{ flex: 1, backgroundColor: accentColor, padding: "14px 8px", textAlign: "center" as const, borderRight: "1px solid rgba(0,0,0,0.15)" }}><span style={{ fontFamily: eventFontFamily, fontSize: "28px", fontWeight: 800, color: accentText, display: "block", lineHeight: 1 }}>{dayNum || "—"}</span><span style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" as const, color: `${accentText}99`, marginTop: "3px", display: "block" }}>{monthName || "TBD"}</span></div>
                  <div style={{ flex: 1, backgroundColor: accentColor, padding: "14px 8px", textAlign: "center" as const, borderRight: "1px solid rgba(0,0,0,0.15)" }}><span style={{ fontFamily: eventFontFamily, fontSize: "28px", fontWeight: 800, color: accentText, display: "block", lineHeight: 1 }}>{timeStr || "—"}</span><span style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" as const, color: `${accentText}99`, marginTop: "3px", display: "block" }}>Start</span></div>
                  <div style={{ flex: 1, backgroundColor: accentColor, padding: "14px 8px", textAlign: "center" as const }}><span style={{ fontFamily: eventFontFamily, fontSize: "28px", fontWeight: 800, color: accentText, display: "block", lineHeight: 1 }}>{goingList.length}</span><span style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" as const, color: `${accentText}99`, marginTop: "3px", display: "block" }}>Going</span></div>
                </div>
                <div className="px-5 pt-4 pb-6 flex flex-col gap-3">
                  {event.location && <div style={{ border: `1px solid ${accentColor}25`, borderRadius: "12px", padding: "14px 16px", backgroundColor: `${bgTextColor}06` }}><p style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase" as const, color: accentColor, marginBottom: "6px" }}>Location</p><p style={{ fontFamily: eventFontFamily, fontSize: "20px", fontWeight: 700, color: bgTextColor, lineHeight: 1.2 }}>{event.location}</p></div>}
                  {event.dress_code && <div style={{ border: `1px solid ${accentColor}25`, borderRadius: "12px", padding: "14px 16px", backgroundColor: `${bgTextColor}06` }}><p style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase" as const, color: accentColor, marginBottom: "6px" }}>Dress Code</p><p style={{ fontFamily: eventFontFamily, fontSize: "20px", fontWeight: 700, color: bgTextColor, lineHeight: 1.2 }}>{event.dress_code}</p></div>}
                  {event.extra && <div style={{ border: `1px solid ${accentColor}18`, borderRadius: "12px", padding: "14px 16px" }}><p style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase" as const, color: accentColor, marginBottom: "6px" }}>From the host</p><p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: bgTextSoft, lineHeight: 1.5 }}>{event.extra}</p></div>}
                  {goingList.length > 0 && (
                    <div style={{ backgroundColor: `${bgTextColor}04`, border: `1px solid ${bgTextColor}10`, borderRadius: "12px", padding: "14px 16px" }}>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase" as const, color: accentColor, marginBottom: "10px" }}>Who's going</p>
                      <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "8px" }}>
                        {goingList.map((r) => (
                          <div key={r.user_id} style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: accentColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", fontWeight: 700, color: accentText }}>{getInitials(r.name)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ height: "100px" }} />
          </div>
        </>
      ) : isNoir ? (
        /* ═══ PLANIT NOIR LAYOUT ═══ */
        <>
          <div className="relative" style={{ minHeight: "280px" }}>
            <ConcentricCircles accentColor={accentColor} />
            {/* Navigation overlay */}
            <div className="flex items-center justify-between px-5 pt-6 relative z-20">
              <button onClick={() => navigate("/home")} className="self-start">
                <ArrowLeft className="w-6 h-6 text-white/40" />
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                  style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
                >
                  {codeCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {event.code}
                </button>
                <button onClick={() => setShowDMs(true)} className="flex flex-col items-center gap-0.5">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
                  >
                    <MessageCircle className="w-4 h-4 text-white/40" />
                  </div>
                  <span className="text-[9px] font-semibold text-white/40">Messages</span>
                </button>
                {isHost && (
                  <div className="relative">
                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className="w-9 h-9 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
                    >
                      <MoreVertical className="w-4 h-4 text-white/40" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            {/* Title area */}
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
              <HostDivider hostName={profile?.name || "Host"} />
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
      ) : (
        /* ═══ DEFAULT LAYOUT ═══ */
        <>
          <div
            className="relative"
            style={{
              background: `linear-gradient(to bottom, ${eventGradient} 0%, ${containerBg} 100%)`,
              minHeight: "220px",
            }}
          >
            <div className="flex items-center justify-between px-5 pt-6">
              <button onClick={() => navigate("/home")} className="self-start">
                <ArrowLeft className="w-6 h-6 text-[#111]" />
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyCode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                  style={{ backgroundColor: "rgba(0,0,0,0.15)", color: "#111" }}
                >
                  {codeCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {event.code}
                </button>
                <button onClick={() => setShowDMs(true)} className="flex flex-col items-center gap-0.5">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center border border-[#111]/20"
                    style={{ backgroundColor: "rgba(0,0,0,0.15)" }}
                  >
                    <MessageCircle className="w-4 h-4 text-[#111]" />
                  </div>
                  <span className="text-[9px] font-semibold text-[#111]">Messages</span>
                </button>
                {isHost && (
                  <div className="relative">
                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className="w-9 h-9 rounded-full flex items-center justify-center border border-[#111]/20"
                      style={{ backgroundColor: "rgba(0,0,0,0.15)" }}
                    >
                      <MoreVertical className="w-4 h-4 text-[#111]" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 px-6 pb-5">
              <h1
                className={`${titleClass} drop-shadow-lg`}
                style={{ fontFamily: eventFontFamily, color: bgTextColor }}
              >
                {event.title || "Untitled Event"}
              </h1>
              {event.vibe && (
                <p className={`mt-1 ${vibeClass}`} style={{ fontFamily: eventFontFamily, color: bgTextMuted }}>
                  {event.vibe}
                </p>
              )}
            </div>
          </div>

          <div className="px-5 pt-4">
            {(event.location || event.date_time || event.dress_code || event.extra) && (
              <div className="flex flex-col gap-3">
                {event.location && (
                  <div className="overflow-hidden" style={{ backgroundColor: accentColor, borderRadius: "16px" }}>
                    <div className="px-4 py-1.5" style={{ backgroundColor: "rgba(0,0,0,0.2)" }}>
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: accentText }}>
                        Location
                      </span>
                    </div>
                    <div className="p-4 flex items-center gap-4">
                      <span style={{ fontSize: "28px" }}>📍</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-xl font-bold block truncate" style={{ color: accentText }}>
                          {event.location}
                        </span>
                      </div>
                      <span className="text-lg font-bold" style={{ color: accentText, opacity: 0.4 }}>
                        ›
                      </span>
                    </div>
                  </div>
                )}
                {(eventDate || event.dress_code) && (
                  <div className="flex gap-3">
                    {eventDate && (
                      <div
                        className="flex-1 overflow-hidden"
                        style={{ borderRadius: "16px", backgroundColor: accentColor }}
                      >
                        <div className="px-3 py-1.5 text-center" style={{ backgroundColor: "rgba(0,0,0,0.2)" }}>
                          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: accentText }}>
                            {monthName}
                          </span>
                        </div>
                        <div className="flex flex-col items-center py-3 px-3">
                          <span className="text-4xl font-extrabold leading-none" style={{ color: accentText }}>
                            {dayNum}
                          </span>
                          <span className="text-xs font-semibold mt-1" style={{ color: accentText, opacity: 0.7 }}>
                            {timeStr}
                          </span>
                          <span className="text-[10px] font-medium mt-0.5" style={{ color: accentText, opacity: 0.5 }}>
                            {dayOfWeek}
                          </span>
                        </div>
                      </div>
                    )}
                    {event.dress_code && (
                      <div
                        className="flex-1 overflow-hidden"
                        style={{ borderRadius: "16px", backgroundColor: accentColor }}
                      >
                        <div
                          className="px-3 py-1.5 flex items-center gap-2"
                          style={{ backgroundColor: "rgba(0,0,0,0.2)" }}
                        >
                          <span style={{ fontSize: "18px" }}>🎭</span>
                          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: accentText }}>
                            Dress Code
                          </span>
                        </div>
                        <div className="flex flex-col py-3 px-3">
                          <span className="text-lg font-bold leading-tight" style={{ color: accentText }}>
                            {event.dress_code}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {event.extra && (
                  <div
                    className="p-4 flex items-start gap-3"
                    style={{
                      borderRadius: "16px",
                      backgroundColor: bubbleBg
                        ? bubbleBg.replace("hsl(", "hsla(").replace(")", ", 0.15)")
                        : "rgba(170,238,68,0.15)",
                      border: `1px solid ${bubbleBg ? bubbleBg.replace("hsl(", "hsla(").replace(")", ", 0.3)") : "rgba(170,238,68,0.3)"}`,
                    }}
                  >
                    <span className="text-lg mt-0.5" style={{ color: bgTextMuted }}>
                      ✦
                    </span>
                    <div className="flex-1">
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider block"
                        style={{ color: accentColor }}
                      >
                        Notes from host
                      </span>
                      <span className="text-sm mt-1 block" style={{ color: bgTextSoft }}>
                        {event.extra}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Shared content area */}
      {!isVintage && !isGalaxy && !isSunny && !isMidnight && !isOcean && !isBlush && !isForest && !isClassic && !isCustom && (
        <div className="px-5 pt-4">
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

      {/* RSVP floating bar - all templates */}
      <div className="fixed bottom-4 left-4 right-4 z-50">
        {barMinimised && rsvp ? (
          <button
            onClick={() => setBarMinimised(false)}
            className="mx-auto block backdrop-blur-sm rounded-full px-5 py-2.5 text-sm font-bold border border-border"
            style={{ backgroundColor: "rgba(56,56,56,0.95)", color: "#aaee44" }}
          >
            {rsvpLabel}
          </button>
        ) : (
          <div
            className="backdrop-blur-sm rounded-[var(--radius)] p-4 border border-border"
            style={{ backgroundColor: "rgba(56,56,56,0.95)" }}
          >
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

      {/* Full-screen chat overlay - all templates */}
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

      {/* DM overlay - all templates */}
      {showDMs && (
        <div className="fixed inset-0 z-[60] flex flex-col" style={{ backgroundColor: "#2b2b2b" }}>
          {!activeThread ? (
            <>
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="text-white font-bold text-base">Private Messages</h2>
                <button onClick={() => setShowDMs(false)}>
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
                {dmThreads.length === 0 && (
                  <p className="text-muted-foreground text-sm text-center mt-10">
                    No messages yet. Guests can message you privately.
                  </p>
                )}
                {dmThreads.map((t) => (
                  <button
                    key={t.user_id}
                    onClick={() => setActiveThread(t.user_id)}
                    className="w-full flex items-center gap-3 rounded-xl px-4 py-3 border border-border"
                    style={{ backgroundColor: "#383838" }}
                  >
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {t.avatar_url ? (
                        <img src={t.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-muted-foreground">{getInitials(t.name)}</span>
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-white text-sm font-semibold">{t.name}</p>
                      <p className="text-muted-foreground text-xs truncate">{t.lastMsg}</p>
                    </div>
                    {t.lastTime && (
                      <span className="text-muted-foreground text-[10px] shrink-0">{formatTime(t.lastTime)}</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                <button
                  onClick={() => {
                    setActiveThread(null);
                    setThreadMessages([]);
                  }}
                >
                  <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                </button>
                <h2 className="text-white font-bold text-base">
                  {dmThreads.find((t) => t.user_id === activeThread)?.name || "Guest"}
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {threadMessages.length === 0 && (
                  <p className="text-muted-foreground text-sm text-center mt-10">No messages yet</p>
                )}
                {threadMessages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender_id === user?.id ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${m.sender_id === user?.id ? "bg-primary text-primary-foreground" : "border border-border"}`}
                      style={m.sender_id !== user?.id ? { backgroundColor: "#383838" } : undefined}
                    >
                      <p className="text-sm" style={m.sender_id !== user?.id ? { color: "white" } : undefined}>
                        {m.text}
                      </p>
                      <p className="text-[10px] opacity-50 mt-0.5">{formatTime(m.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 border-t border-border flex gap-2">
                <input
                  value={dmDraft}
                  onChange={(e) => setDmDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendDM()}
                  placeholder="Type a reply..."
                  className="flex-1 rounded-full px-4 py-2.5 text-sm text-white placeholder:text-muted-foreground outline-none border border-border"
                  style={{ backgroundColor: "#383838" }}
                />
                <button onClick={sendDM} className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                  <Send className="w-4 h-4 text-primary-foreground" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Host menu - all templates */}
      {showMenu && isHost && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setShowMenu(false)} />
          <div
            className="fixed top-16 right-5 rounded-xl border border-border shadow-lg z-[70] overflow-hidden"
            style={{ backgroundColor: "#383838" }}
          >
            <button
              onClick={() => {
                setShowMenu(false);
                navigate(`/host?edit=${event.code}`);
              }}
              className="px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 w-full text-left whitespace-nowrap"
            >
              Edit event
            </button>
            <button
              onClick={() => {
                setShowMenu(false);
                setShowDeleteDialog(true);
              }}
              className="px-5 py-3 text-sm font-semibold text-red-400 hover:bg-red-500/10 w-full text-left whitespace-nowrap"
            >
              Delete event
            </button>
          </div>
        </>
      )}

      {/* Delete confirmation - all templates */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent style={{ backgroundColor: "#2b2b2b", border: "1px solid #444" }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Event</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete this event? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-white hover:bg-muted">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteEvent} className="bg-red-600 text-white hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EventView;
