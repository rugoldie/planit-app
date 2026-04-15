import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MoreVertical, X, Send, Maximize2, ChevronDown, ChevronUp, MessageCircle, Copy, Check } from "lucide-react";
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
  const [dmThreads, setDmThreads] = useState<{ user_id: string; name: string; avatar_url?: string; lastMsg: string; lastTime: string }[]>([]);
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
    if (uploadError) { setUploadingPhoto(false); return; }
    const { data: urlData } = supabase.storage.from("event-photos").getPublicUrl(filePath);
    await supabase.from("event_photos").insert({ event_id: event.id, user_id: user.id, photo_url: urlData.publicUrl });
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
      const { data } = await supabase
        .from("event_guests")
        .select("user_id, rsvp_status")
        .eq("event_id", event.id);
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
      .on("postgres_changes", { event: "*", schema: "public", table: "event_guests", filter: `event_id=eq.${event.id}` }, () => fetchRsvps())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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
        const { data: profiles } = await supabase.from("profiles_public" as any).select("user_id, avatar_url").in("user_id", userIds);
        const avatarMap = new Map((profiles || []).map((p: any) => [p.user_id, p.avatar_url]));
        setComments(data.map((c: any) => ({ ...c, avatar_url: avatarMap.get(c.user_id) })));
      }
    };
    fetchComments();
    const channel = supabase
      .channel(`host-comments-${event.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments", filter: `event_id=eq.${event.id}` }, () => fetchComments())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "event_photos", filter: `event_id=eq.${event.id}` }, () => fetchPhotos())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [event]);


  useEffect(() => {
    if (!event || !user || event.host_id !== user.id) return;
    const fetchThreads = async () => {
      const { data } = await supabase
        .from("direct_messages")
        .select("*")
        .eq("event_id", event.id)
        .order("created_at", { ascending: false });
      if (!data || data.length === 0) { setDmThreads([]); return; }
      // Group by guest user_id
      const guestIds = new Set<string>();
      data.forEach((m: any) => {
        if (m.sender_id !== user.id) guestIds.add(m.sender_id);
        if (m.receiver_id !== user.id) guestIds.add(m.receiver_id);
      });
      const ids = [...guestIds];
      const { data: profiles } = await supabase.from("profiles_public" as any).select("user_id, name, avatar_url").in("user_id", ids);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      const threads = ids.map(gId => {
        const msgs = data.filter((m: any) => m.sender_id === gId || m.receiver_id === gId);
        const last = msgs[0];
        const p = profileMap.get(gId);
        return { user_id: gId, name: p?.name || "Guest", avatar_url: p?.avatar_url, lastMsg: last?.text || "", lastTime: last?.created_at || "" };
      });
      setDmThreads(threads);
    };
    fetchThreads();
    const channel = supabase
      .channel(`host-dms-${event.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `event_id=eq.${event.id}` }, () => fetchThreads())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [event, user]);

  // Fetch thread messages when active
  useEffect(() => {
    if (!activeThread || !event || !user) return;
    const fetchThread = async () => {
      const { data } = await supabase
        .from("direct_messages")
        .select("*")
        .eq("event_id", event.id)
        .or(`and(sender_id.eq.${activeThread},receiver_id.eq.${user.id}),and(sender_id.eq.${user.id},receiver_id.eq.${activeThread})`)
        .order("created_at", { ascending: true });
      if (data) {
        setThreadMessages(data.map((m: any) => ({ id: m.id, sender_id: m.sender_id, text: m.text, created_at: m.created_at })));
      }
    };
    fetchThread();
    const channel = supabase
      .channel(`host-thread-${activeThread}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `event_id=eq.${event.id}` }, () => fetchThread())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeThread, event, user]);

  const goingList = useMemo(() => rsvpList.filter(r => r.status === "yes"), [rsvpList]);
  const maybeList = useMemo(() => rsvpList.filter(r => r.status === "maybe"), [rsvpList]);

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-background"><p className="text-muted-foreground">Loading...</p></div>;
  if (!event) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6">
      <p className="text-foreground font-bold text-xl">Event not found</p>
      <button onClick={() => navigate("/home")} className="mt-4 text-muted-foreground underline text-sm font-semibold">Go home</button>
    </div>
  );

  const titleClass = event.text_size === "Small" ? "text-lg font-bold" : event.text_size === "Large" ? "text-4xl font-extrabold" : "text-2xl font-extrabold";
  const vibeClass = event.text_size === "Small" ? "text-xs" : event.text_size === "Large" ? "text-base" : "text-sm";
  const bubbleTextClass = event.text_size === "Small" ? "text-xs font-medium" : event.text_size === "Large" ? "text-base font-bold" : "text-sm font-semibold";
  const hasBgImage = event.bg_photo && (event.bg_photo.startsWith("blob:") || event.bg_photo.startsWith("linear-gradient") || event.bg_photo.startsWith("http"));
  const bgStyle: React.CSSProperties = hasBgImage && !event.bg_photo.startsWith("linear-gradient")
    ? { backgroundImage: `url(${event.bg_photo})`, backgroundSize: "cover", backgroundPosition: "center" }
    : hasBgImage ? { background: event.bg_photo } : { backgroundColor: `hsl(${event.bg_color})` };
  const bubbleBg = event.bubble_color ? `hsl(${event.bubble_color})` : undefined;
  const bubbleText = event.bubble_text_color ? `hsl(${event.bubble_text_color})` : undefined;
  

  const handleRsvp = async (response: string) => {
    if (!user || !event) return;
    setRsvp(response);
    const { data: existing } = await supabase.from("event_guests").select("id").eq("event_id", event.id).eq("user_id", user.id).single();
    if (existing) {
      await supabase.from("event_guests").update({ rsvp_status: response }).eq("id", existing.id);
    } else {
      await supabase.from("event_guests").insert({ event_id: event.id, user_id: user.id, rsvp_status: response });
    }
    setTimeout(() => setBarMinimised(true), 1500);
  };

  const sendComment = async () => {
    if (!commentDraft.trim() || !user || !event) return;
    await supabase.from("comments").insert({ event_id: event.id, user_id: user.id, user_name: profile?.name || "Host", text: commentDraft.trim() });
    setCommentDraft("");
  };

  const sendDM = async () => {
    if (!dmDraft.trim() || !user || !activeThread || !event) return;
    await supabase.from("direct_messages").insert({ event_id: event.id, sender_id: user.id, receiver_id: activeThread, text: dmDraft.trim() });
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
    if (status === "yes") return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">Going</span>;
    if (status === "maybe") return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Maybe</span>;
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-muted-foreground" style={{ backgroundColor: "#2b2b2b" }}>Can't make it</span>;
  };

  const eventGradient = event.gradient_color || "#aaee44";
  const eventFontFamily = ({
    Bold: "'Bebas Neue', sans-serif",
    Handwritten: "'Caveat', cursive",
    Elegant: "'Playfair Display', serif",
  } as Record<string, string>)[event.font_style] || "'Bebas Neue', sans-serif";

  const accentColor = bubbleBg || "#aaee44";
  const accentText = bubbleText || "#111";

  const eventDate = event.date_time ? new Date(event.date_time) : null;
  const monthName = eventDate ? eventDate.toLocaleString(undefined, { month: "short" }).toUpperCase() : "";
  const dayNum = eventDate ? eventDate.getDate() : "";
  const timeStr = eventDate ? eventDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  const dayOfWeek = eventDate ? eventDate.toLocaleString(undefined, { weekday: "long" }) : "";

  const isNoir = (event as any).template_name === "planit-noir";
  const isVintage = (event as any).template_name === "vintage";
  const isHost = !authLoading && !!user && !!event && user.id === event.host_id;
  const vintageAccent = (event as any).gradient_color || "#8b7355";
  const containerBg = isVintage ? "#f5f0e8" : (event.bg_color ? `hsl(${event.bg_color})` : (isNoir ? "#0a0a0a" : "#1a1a1a"));
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
                <button onClick={copyCode} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold" style={{ backgroundColor: `${vintageAccent}1f`, color: vintageAccent }}>
                  {codeCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {event.code}
                </button>
                <button onClick={() => setShowDMs(true)} className="flex flex-col items-center gap-0.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: `${vintageAccent}1f` }}>
                    <MessageCircle className="w-4 h-4" style={{ color: vintageAccent }} />
                  </div>
                  <span style={{ fontSize: "9px", fontWeight: 600, color: vintageAccent }}>Messages</span>
                </button>
                {isHost && (
                  <div className="relative">
                    <button onClick={() => setShowMenu(!showMenu)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: `${vintageAccent}1f` }}>
                      <MoreVertical className="w-4 h-4" style={{ color: vintageAccent }} />
                    </button>
                  </div>
                )}
              </div>
            </div>
            {/* Title area */}
            <div className="relative z-10 px-6 pt-6 pb-2 text-center">
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.2em", color: vintageAccent, textTransform: "uppercase" }}>
                You are invited to
              </p>
              <h1 className="mt-3" style={{ fontFamily: "'Playfair Display', serif", fontSize: noirFontSize, fontWeight: 900, color: "#2c1810", lineHeight: 1.1 }}>
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
                  {eventDate && <VintageDateCard monthName={monthName} dayNum={String(dayNum)} timeStr={timeStr} dayOfWeek={dayOfWeek} accentColor={vintageAccent} />}
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
          <VintageRsvpBar rsvp={rsvp} barMinimised={barMinimised} setBarMinimised={setBarMinimised} handleRsvp={handleRsvp} rsvpLabel={rsvpLabel} accentColor={vintageAccent} />

          {/* Delete dialog, DM overlays, etc. reuse existing below */}
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
                <button onClick={copyCode} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold" style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
                  {codeCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {event.code}
                </button>
                <button onClick={() => setShowDMs(true)} className="flex flex-col items-center gap-0.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
                    <MessageCircle className="w-4 h-4 text-white/40" />
                  </div>
                  <span className="text-[9px] font-semibold text-white/40">Messages</span>
                </button>
                {isHost && (
                  <div className="relative">
                    <button onClick={() => setShowMenu(!showMenu)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
                      <MoreVertical className="w-4 h-4 text-white/40" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            {/* Title area */}
            <div className="relative z-10 px-6 pt-4 pb-4">
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "13px", fontStyle: "italic", color: "rgba(255,255,255,0.4)" }}>you're invited to</p>
              <div className="mt-2">
                <StyledTitle title={event.title || "Untitled Event"} accentColor={accentColor} fontFamily={eventFontFamily} fontSize={noirFontSize} />
              </div>
              {event.vibe && <p className="mt-2" style={{ fontFamily: "'Playfair Display', serif", fontSize: "13px", fontStyle: "italic", color: "rgba(255,255,255,0.4)" }}>{event.vibe}</p>}
              <HostDivider hostName={profile?.name || "Host"} />
            </div>
          </div>

          <div className="px-5 pt-2">
            <div className="flex flex-col gap-3">
              {(eventDate || event.dress_code) && (
                <div className="flex gap-3">
                   {eventDate && <NoirDateCard monthName={monthName} dayNum={String(dayNum)} timeStr={timeStr} accentColor={accentColor} />}
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
          <div className="relative" style={{ background: `linear-gradient(to bottom, ${eventGradient} 0%, ${containerBg} 100%)`, minHeight: "220px" }}>
            <div className="flex items-center justify-between px-5 pt-6">
              <button onClick={() => navigate("/home")} className="self-start">
                <ArrowLeft className="w-6 h-6 text-[#111]" />
              </button>
              <div className="flex items-center gap-2">
                <button onClick={copyCode} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold" style={{ backgroundColor: "rgba(0,0,0,0.15)", color: "#111" }}>
                  {codeCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {event.code}
                </button>
                <button onClick={() => setShowDMs(true)} className="flex flex-col items-center gap-0.5">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center border border-[#111]/20" style={{ backgroundColor: "rgba(0,0,0,0.15)" }}>
                    <MessageCircle className="w-4 h-4 text-[#111]" />
                  </div>
                  <span className="text-[9px] font-semibold text-[#111]">Messages</span>
                </button>
                {isHost && (
                  <div className="relative">
                    <button onClick={() => setShowMenu(!showMenu)} className="w-9 h-9 rounded-full flex items-center justify-center border border-[#111]/20" style={{ backgroundColor: "rgba(0,0,0,0.15)" }}>
                      <MoreVertical className="w-4 h-4 text-[#111]" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 px-6 pb-5">
              <h1 className={`text-white ${titleClass} drop-shadow-lg`} style={{ fontFamily: eventFontFamily }}>{event.title || "Untitled Event"}</h1>
              {event.vibe && <p className={`text-white/60 mt-1 ${vibeClass}`} style={{ fontFamily: eventFontFamily }}>{event.vibe}</p>}
            </div>
          </div>

          <div className="px-5 pt-4">
            {(event.location || event.date_time || event.dress_code || event.extra) && (
              <div className="flex flex-col gap-3">
                {event.location && (
                  <div className="overflow-hidden" style={{ backgroundColor: accentColor, borderRadius: "16px" }}>
                    <div className="px-4 py-1.5" style={{ backgroundColor: "rgba(0,0,0,0.2)" }}>
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: accentText }}>Location</span>
                    </div>
                    <div className="p-4 flex items-center gap-4">
                      <span style={{ fontSize: "28px" }}>📍</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-xl font-bold block truncate" style={{ color: accentText }}>{event.location}</span>
                      </div>
                      <span className="text-lg font-bold" style={{ color: accentText, opacity: 0.4 }}>›</span>
                    </div>
                  </div>
                )}
                {(eventDate || event.dress_code) && (
                  <div className="flex gap-3">
                    {eventDate && (
                      <div className="flex-1 overflow-hidden" style={{ borderRadius: "16px", backgroundColor: accentColor }}>
                        <div className="px-3 py-1.5 text-center" style={{ backgroundColor: "rgba(0,0,0,0.2)" }}>
                          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: accentText }}>{monthName}</span>
                        </div>
                        <div className="flex flex-col items-center py-3 px-3">
                          <span className="text-4xl font-extrabold leading-none" style={{ color: accentText }}>{dayNum}</span>
                          <span className="text-xs font-semibold mt-1" style={{ color: accentText, opacity: 0.7 }}>{timeStr}</span>
                          <span className="text-[10px] font-medium mt-0.5" style={{ color: accentText, opacity: 0.5 }}>{dayOfWeek}</span>
                        </div>
                      </div>
                    )}
                    {event.dress_code && (
                      <div className="flex-1 overflow-hidden" style={{ borderRadius: "16px", backgroundColor: accentColor }}>
                        <div className="px-3 py-1.5 flex items-center gap-2" style={{ backgroundColor: "rgba(0,0,0,0.2)" }}>
                          <span style={{ fontSize: "18px" }}>🎭</span>
                          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: accentText }}>Dress Code</span>
                        </div>
                        <div className="flex flex-col py-3 px-3">
                          <span className="text-lg font-bold leading-tight" style={{ color: accentText }}>{event.dress_code}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {event.extra && (
                  <div className="p-4 flex items-start gap-3" style={{
                    borderRadius: "16px",
                    backgroundColor: bubbleBg ? bubbleBg.replace("hsl(", "hsla(").replace(")", ", 0.15)") : "rgba(170,238,68,0.15)",
                    border: `1px solid ${bubbleBg ? bubbleBg.replace("hsl(", "hsla(").replace(")", ", 0.3)") : "rgba(170,238,68,0.3)"}`,
                  }}>
                    <span className="text-lg mt-0.5">✦</span>
                    <div className="flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: accentColor }}>Notes from host</span>
                      <span className="text-sm text-white/80 mt-1 block">{event.extra}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Shared content area */}
      <div className="px-5 pt-4">
      {/* Who's going section */}
      <div className="mt-4 rounded-2xl p-4" style={{ backgroundColor: "#1e1e1e" }}>
        <button onClick={() => setGuestListExpanded(!guestListExpanded)} className="flex items-center justify-between w-full mb-3">
          <h2 className="text-white font-bold text-sm">Who's going</h2>
          <div className="flex items-center gap-2">
            {goingList.length > 0 && <span className="font-bold text-xs" style={{ color: accentColor }}>{goingList.length} going</span>}
            {guestListExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </button>
        {!guestListExpanded ? (
          <>
            <div className="flex items-center gap-2 overflow-x-auto mb-2">
              {goingList.length === 0 && <p className="text-muted-foreground text-xs">No one yet</p>}
              {goingList.map((r, i) => (
                <div key={i} className="flex flex-col items-center shrink-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden" style={{ border: `2px solid ${accentColor}`, backgroundColor: "#2a2a2a" }}>
                    {r.avatar_url ? <img src={r.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-xs font-bold" style={{ color: accentColor }}>{getInitials(r.name)}</span>}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 max-w-[40px] truncate">{r.name.split(" ")[0]}</span>
                </div>
              ))}
            </div>
            {maybeList.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto">
                {maybeList.map((r, i) => (
                  <div key={i} className="flex flex-col items-center shrink-0">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden opacity-60">
                      {r.avatar_url ? <img src={r.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-[10px] font-bold text-muted-foreground">{getInitials(r.name)}</span>}
                    </div>
                    <span className="text-[9px] text-muted-foreground mt-0.5 max-w-[36px] truncate">{r.name.split(" ")[0]}</span>
                  </div>
                ))}
                <span className="text-muted-foreground text-[10px] font-semibold shrink-0">{maybeList.length} maybe</span>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {rsvpList.length === 0 && <p className="text-muted-foreground text-xs text-center py-3">No RSVPs yet</p>}
            {rsvpList.map((r, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2" style={{ backgroundColor: "#2a2a2a" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden shrink-0" style={{ border: `2px solid ${accentColor}`, backgroundColor: "#1a1a1a" }}>
                  {r.avatar_url ? <img src={r.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-[10px] font-bold" style={{ color: accentColor }}>{getInitials(r.name)}</span>}
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
          {comments.length === 0 && <p className="text-muted-foreground text-xs text-center py-3">No messages yet — be the first!</p>}
          {comments.map((c, i) => (
            <div key={i} className="rounded-xl px-3 py-2" style={{ backgroundColor: "#2a2a2a" }}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold" style={{ color: accentColor }}>{c.user_name}</span>
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
          <button onClick={sendComment} className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#b8f55a" }}>
            <Send className="w-4 h-4" style={{ color: "#111" }} />
          </button>
        </div>
      </div>

      {/* Gallery section */}
      <div className="mt-4 rounded-2xl p-4" style={{ backgroundColor: "#1e1e1e" }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-bold text-sm">Gallery</h2>
          <button onClick={() => photoInput.current?.click()} className="text-xs font-bold rounded-full px-3 py-1" style={{ backgroundColor: "#b8f55a", color: "#111" }}>
            Add photo
          </button>
          <input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        </div>
        {uploadingPhoto && <p className="text-xs text-center py-2" style={{ color: accentColor }}>Uploading...</p>}
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

      {/* RSVP floating bar */}
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
          <div className="backdrop-blur-sm rounded-[var(--radius)] p-4 border border-border" style={{ backgroundColor: "rgba(56,56,56,0.95)" }}>
            <p className="text-muted-foreground text-xs font-semibold text-center mb-3">{rsvp ? rsvpLabel : "Are you going?"}</p>
            <div className="flex gap-2">
              <button onClick={() => handleRsvp("yes")} className={`flex-1 rounded-full py-2.5 text-sm font-bold ${rsvp === "yes" ? "bg-primary text-primary-foreground" : "bg-muted text-secondary-foreground border border-border"}`}>Yes 🙌</button>
              <button onClick={() => handleRsvp("no")} className={`flex-1 rounded-full py-2.5 text-sm font-bold ${rsvp === "no" ? "bg-primary text-primary-foreground" : "bg-muted text-secondary-foreground border border-border"}`}>No 👎</button>
              <button onClick={() => handleRsvp("maybe")} className={`flex-1 rounded-full py-2.5 text-sm font-bold ${rsvp === "maybe" ? "bg-primary text-primary-foreground" : "bg-muted text-secondary-foreground border border-border"}`}>Maybe 🤷</button>
            </div>
          </div>
        )}
      </div>

      {/* Full-screen chat overlay */}
      {showFullComments && (
        <div className="fixed inset-0 z-[60] flex flex-col" style={{ backgroundColor: "#2b2b2b" }}>
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <button onClick={() => setShowFullComments(false)}><ArrowLeft className="w-5 h-5 text-muted-foreground" /></button>
            <h2 className="text-white font-bold text-base">Chat</h2>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {comments.length === 0 && <p className="text-muted-foreground text-sm text-center mt-10">No messages yet — be the first!</p>}
            {comments.map((c, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {c.avatar_url ? <img src={c.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-[10px] font-bold text-muted-foreground">{getInitials(c.user_name)}</span>}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-primary text-xs font-bold">{c.user_name}</span>
                    <span className="text-muted-foreground text-[10px]">{formatTime(c.created_at)}</span>
                  </div>
                  <div className="rounded-2xl rounded-tl-sm px-3 py-2 inline-block" style={{ backgroundColor: "#383838" }}>
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
            <button onClick={sendComment} className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0">
              <Send className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* DM overlay - thread list or active conversation */}
      {showDMs && (
        <div className="fixed inset-0 z-[60] flex flex-col" style={{ backgroundColor: "#2b2b2b" }}>
          {!activeThread ? (
            <>
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="text-white font-bold text-base">Private Messages</h2>
                <button onClick={() => setShowDMs(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
                {dmThreads.length === 0 && <p className="text-muted-foreground text-sm text-center mt-10">No messages yet. Guests can message you privately.</p>}
                {dmThreads.map((t) => (
                  <button key={t.user_id} onClick={() => setActiveThread(t.user_id)} className="w-full flex items-center gap-3 rounded-xl px-4 py-3 border border-border" style={{ backgroundColor: "#383838" }}>
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {t.avatar_url ? <img src={t.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-muted-foreground">{getInitials(t.name)}</span>}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-white text-sm font-semibold">{t.name}</p>
                      <p className="text-muted-foreground text-xs truncate">{t.lastMsg}</p>
                    </div>
                    {t.lastTime && <span className="text-muted-foreground text-[10px] shrink-0">{formatTime(t.lastTime)}</span>}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                <button onClick={() => { setActiveThread(null); setThreadMessages([]); }}><ArrowLeft className="w-5 h-5 text-muted-foreground" /></button>
                <h2 className="text-white font-bold text-base">{dmThreads.find(t => t.user_id === activeThread)?.name || "Guest"}</h2>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {threadMessages.length === 0 && <p className="text-muted-foreground text-sm text-center mt-10">No messages yet</p>}
                {threadMessages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender_id === user?.id ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${m.sender_id === user?.id ? "bg-primary text-primary-foreground" : "border border-border"}`}
                      style={m.sender_id !== user?.id ? { backgroundColor: "#383838" } : undefined}>
                      <p className="text-sm" style={m.sender_id !== user?.id ? { color: "white" } : undefined}>{m.text}</p>
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

      {/* Host menu dropdown - rendered outside nav stacking context */}
      {showMenu && isHost && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setShowMenu(false)} />
          <div className="fixed top-16 right-5 rounded-xl border border-border shadow-lg z-[70] overflow-hidden" style={{ backgroundColor: "#383838" }}>
            <button onClick={() => { console.log("[Planit] Edit event tapped, code:", event.code); setShowMenu(false); navigate(`/host?edit=${event.code}`); }} className="px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 w-full text-left whitespace-nowrap">Edit event</button>
            <button onClick={() => { console.log("[Planit] Delete event tapped, id:", event.id); setShowMenu(false); setShowDeleteDialog(true); }} className="px-5 py-3 text-sm font-semibold text-red-400 hover:bg-red-500/10 w-full text-left whitespace-nowrap">Delete event</button>
          </div>
        </>
      )}

      {/* Delete confirmation */}
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
    </div>
  );
};

export default EventView;
