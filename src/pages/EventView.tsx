import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MoreVertical, X, Send, Maximize2, ChevronDown, ChevronUp, MessageCircle, Copy, Check } from "lucide-react";
import { useEffect, useState, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  const { user, profile } = useAuth();

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

  // Fetch DM threads (host sees all messages for this event)
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
    if (!event) return;
    await supabase.from("events").delete().eq("id", event.id);
    toast.success("Event deleted");
    navigate("/home");
  };

  const rsvpLabel = rsvp === "yes" ? "You're going! 🎉" : rsvp === "no" ? "You're not going 👎" : "You're a maybe 🤷";
  const getInitials = (name: string) => name.charAt(0).toUpperCase();
  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const statusBadge = (status: string) => {
    if (status === "yes") return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">Going</span>;
    if (status === "maybe") return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Maybe</span>;
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-muted-foreground" style={{ backgroundColor: "#2b2b2b" }}>Can't make it</span>;
  };

  return (
    <div className="flex flex-col min-h-screen px-5 py-6 pb-28" style={bgStyle}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)} className="self-start">
          <ArrowLeft className="w-6 h-6 text-muted-foreground" />
        </button>

        <div className="flex items-center gap-2">
          {/* Event code pill */}
          <button
            onClick={copyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
            style={{ backgroundColor: "#383838", color: "#aaee44" }}
          >
            {codeCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {event.code}
          </button>

          {/* DM icon */}
          <button
            onClick={() => setShowDMs(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center border border-border"
            style={{ backgroundColor: "#383838" }}
          >
            <MessageCircle className="w-4 h-4" style={{ color: "#aaee44" }} />
          </button>

          {/* Three dot menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-9 h-9 rounded-full flex items-center justify-center border border-border"
              style={{ backgroundColor: "#383838" }}
            >
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-11 rounded-xl border border-border shadow-lg z-50 overflow-hidden" style={{ backgroundColor: "#383838" }}>
                  <button
                    onClick={() => { setShowMenu(false); navigate(`/host?edit=${code}`); }}
                    className="px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 w-full text-left whitespace-nowrap"
                  >
                    Edit event
                  </button>
                  <button
                    onClick={() => { setShowMenu(false); setShowDeleteDialog(true); }}
                    className="px-5 py-3 text-sm font-semibold text-red-400 hover:bg-red-500/10 w-full text-left whitespace-nowrap"
                  >
                    Delete event
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Title card */}
      <div className="bg-card/90 rounded-[var(--radius)] p-6 mb-4 backdrop-blur-sm border border-border">
        <h1 className={`font-extrabold text-card-foreground ${textClass}`}>{event.title || "Untitled Event"}</h1>
        {event.vibe && <p className="text-muted-foreground mt-2 text-sm">{event.vibe}</p>}
      </div>

      {/* Detail bubbles */}
      {(event.location || event.date_time || event.dress_code || event.extra) && (
        <div className="flex flex-col gap-2">
          {event.location && (
            <div className="rounded-[var(--radius)] p-4 backdrop-blur-sm flex items-center gap-3 border border-border" style={{ backgroundColor: bubbleBg }}>
              <span className="text-xl">📍</span>
              <span className="text-sm font-semibold" style={{ color: bubbleText }}>{event.location}</span>
            </div>
          )}
          {event.date_time && (
            <div className="rounded-[var(--radius)] p-4 backdrop-blur-sm flex items-center gap-3 border border-border" style={{ backgroundColor: bubbleBg }}>
              <span className="text-xl">📅</span>
              <span className="text-sm font-semibold" style={{ color: bubbleText }}>
                {new Date(event.date_time).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              </span>
            </div>
          )}
          {event.dress_code && (
            <div className="rounded-[var(--radius)] p-4 backdrop-blur-sm flex items-center gap-3 border border-border" style={{ backgroundColor: bubbleBg }}>
              <span className="text-xl">👗</span>
              <span className="text-sm font-semibold" style={{ color: bubbleText }}>{event.dress_code}</span>
            </div>
          )}
          {event.extra && (
            <div className="rounded-[var(--radius)] p-4 backdrop-blur-sm flex items-center gap-3 border border-border" style={{ backgroundColor: bubbleBg }}>
              <span className="text-xl">➕</span>
              <span className="text-sm font-semibold" style={{ color: bubbleText }}>{event.extra}</span>
            </div>
          )}
        </div>
      )}

      {/* Who's going section */}
      <div className="mt-4 rounded-[var(--radius)] p-4 border border-border" style={{ backgroundColor: "#383838" }}>
        <button onClick={() => setGuestListExpanded(!guestListExpanded)} className="flex items-center justify-between w-full mb-3">
          <h2 className="text-white font-bold text-sm">Who's going</h2>
          {guestListExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {!guestListExpanded ? (
          <>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center gap-2 overflow-x-auto flex-1">
                {goingList.length === 0 && <p className="text-muted-foreground text-xs">No one yet</p>}
                {goingList.map((r, i) => (
                  <div key={i} className="flex flex-col items-center shrink-0">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-primary">
                      {r.avatar_url ? <img src={r.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-muted-foreground">{getInitials(r.name)}</span>}
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 max-w-[40px] truncate">{r.name.split(" ")[0]}</span>
                  </div>
                ))}
              </div>
              {goingList.length > 0 && <span className="text-primary font-bold text-xs shrink-0">{goingList.length} going</span>}
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
              <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2" style={{ backgroundColor: "#2b2b2b" }}>
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {r.avatar_url ? <img src={r.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-[10px] font-bold text-muted-foreground">{getInitials(r.name)}</span>}
                </div>
                <span className="text-white text-sm font-semibold flex-1">{r.name}</span>
                {statusBadge(r.status)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comments section */}
      <div className="mt-4 rounded-[var(--radius)] p-4 border border-border" style={{ backgroundColor: "#383838" }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-bold text-sm">Comments</h2>
          <button onClick={() => setShowFullComments(true)}>
            <Maximize2 className="w-4 h-4 text-primary" />
          </button>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
          {comments.length === 0 && <p className="text-muted-foreground text-xs text-center py-3">No comments yet — be the first!</p>}
          {comments.map((c, i) => (
            <div key={i} className="rounded-xl px-3 py-2" style={{ backgroundColor: "#2b2b2b" }}>
              <div className="flex items-center gap-2">
                <span className="text-primary text-xs font-bold">{c.user_name}</span>
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
            placeholder="Write a comment..."
            className="flex-1 rounded-full px-4 py-2 text-sm text-white placeholder:text-muted-foreground outline-none border border-border"
            style={{ backgroundColor: "#2b2b2b" }}
          />
          <button onClick={sendComment} className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0">
            <Send className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>
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
            <p className="text-muted-foreground text-xs font-semibold text-center mb-3">Are you going?</p>
            {rsvp ? (
              <p className="font-bold text-center text-sm" style={{ color: "#aaee44" }}>{rsvpLabel}</p>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => handleRsvp("yes")} className="flex-1 bg-primary text-primary-foreground rounded-full py-2.5 text-sm font-bold">Yes 🙌</button>
                <button onClick={() => handleRsvp("no")} className="flex-1 bg-muted text-secondary-foreground rounded-full py-2.5 text-sm font-bold border border-border">No 👎</button>
                <button onClick={() => handleRsvp("maybe")} className="flex-1 bg-muted text-secondary-foreground rounded-full py-2.5 text-sm font-bold border border-border">Maybe 🤷</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full-screen comments overlay */}
      {showFullComments && (
        <div className="fixed inset-0 z-[60] flex flex-col" style={{ backgroundColor: "#2b2b2b" }}>
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <button onClick={() => setShowFullComments(false)}><ArrowLeft className="w-5 h-5 text-muted-foreground" /></button>
            <h2 className="text-white font-bold text-base">Comments</h2>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {comments.length === 0 && <p className="text-muted-foreground text-sm text-center mt-10">No comments yet — be the first!</p>}
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
              placeholder="Write a comment..."
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
  );
};

export default EventView;
