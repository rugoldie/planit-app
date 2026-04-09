import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, X, Send, Maximize2, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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

  // Fetch RSVPs
  useEffect(() => {
    if (!event) return;
    const fetchRsvps = async () => {
      const { data } = await supabase
        .from("event_guests")
        .select("user_id, rsvp_status")
        .eq("event_id", event.id);
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
      .on("postgres_changes", { event: "*", schema: "public", table: "event_guests", filter: `event_id=eq.${event.id}` }, () => {
        fetchRsvps();
      })
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
        // Get avatar urls
        const userIds = [...new Set(data.map((c: any) => c.user_id))];
        const { data: profiles } = await supabase.from("profiles_public" as any).select("user_id, avatar_url").in("user_id", userIds);
        const avatarMap = new Map((profiles || []).map((p: any) => [p.user_id, p.avatar_url]));
        setComments(data.map((c: any) => ({ ...c, avatar_url: avatarMap.get(c.user_id) })));
      }
    };
    fetchComments();

    const channel = supabase
      .channel(`comments-${event.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments", filter: `event_id=eq.${event.id}` }, () => {
        fetchComments();
      })
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
      .channel(`photos-${event.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "event_photos", filter: `event_id=eq.${event.id}` }, () => fetchPhotos())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [event]);


  useEffect(() => {
    if (!event || !user) return;
    const hostId = event.host_id;
    const fetchDMs = async () => {
      const { data } = await supabase
        .from("direct_messages")
        .select("*")
        .eq("event_id", event.id)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${hostId}),and(sender_id.eq.${hostId},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true });
      if (data) {
        setMessages(data.map((m: any) => ({
          id: m.id,
          from: m.sender_id === user.id ? "guest" : "host",
          text: m.text,
          time: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        })));
      }
    };
    fetchDMs();
    const channel = supabase
      .channel(`guest-dms-${event.id}-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `event_id=eq.${event.id}` }, () => fetchDMs())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [event, user]);

  const goingList = useMemo(() => rsvpList.filter(r => r.status === "yes"), [rsvpList]);
  const maybeList = useMemo(() => rsvpList.filter(r => r.status === "maybe"), [rsvpList]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-background"><p className="text-muted-foreground">Loading...</p></div>;
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6">
        <p className="text-secondary-foreground font-bold text-xl">Event not found</p>
        <button onClick={() => navigate("/home")} className="mt-4 text-muted-foreground underline text-sm font-semibold">Go home</button>
      </div>
    );
  }

  const titleClass = event.text_size === "Small" ? "text-lg font-bold" : event.text_size === "Large" ? "text-4xl font-extrabold" : "text-2xl font-extrabold";
  const vibeClass = event.text_size === "Small" ? "text-xs" : event.text_size === "Large" ? "text-base" : "text-sm";
  const bubbleTextClass = event.text_size === "Small" ? "text-xs font-medium" : event.text_size === "Large" ? "text-base font-bold" : "text-sm font-semibold";
  const hasBgImage = event.bg_photo && (event.bg_photo.startsWith("blob:") || event.bg_photo.startsWith("linear-gradient") || event.bg_photo.startsWith("http"));
  const bgStyle: React.CSSProperties = hasBgImage && !event.bg_photo.startsWith("linear-gradient")
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
    await supabase.from("comments").insert({
      event_id: event.id,
      user_id: user.id,
      user_name: userName,
      text: commentDraft.trim(),
    });
    setCommentDraft("");
  };

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

  const rsvpLabel = rsvp === "yes" ? "You're going! 🎉" : rsvp === "no" ? "You're not going 👎" : "You're a maybe 🤷";
  const getInitials = (name: string) => name.charAt(0).toUpperCase();

  const statusBadge = (status: string) => {
    if (status === "yes") return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">Going</span>;
    if (status === "maybe") return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Maybe</span>;
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-muted-foreground" style={{ backgroundColor: "#2b2b2b" }}>Can't make it</span>;
  };

  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const eventGradient = event.gradient_color || "#aaee44";
  const eventFontFamily = ({
    Bold: "'Bebas Neue', sans-serif",
    Handwritten: "'Caveat', cursive",
    Elegant: "'Playfair Display', serif",
  } as Record<string, string>)[event.font_style] || "'Bebas Neue', sans-serif";

  return (
    <div className="flex flex-col min-h-screen pb-28" style={{ backgroundColor: "#2b2b2b" }}>
      {/* Gradient hero section */}
      <div className="relative" style={{ background: `linear-gradient(to bottom, ${eventGradient} 0%, #2b2b2b 100%)`, minHeight: "220px" }}>
        {/* Navigation overlay */}
        <div className="flex items-center justify-between px-5 pt-6">
          <button onClick={() => navigate("/home")}>
            <ArrowLeft className="w-6 h-6 text-[#111]" />
          </button>
          <button onClick={() => setShowChat(true)} className="flex flex-col items-center gap-0.5">
            <div className="w-9 h-9 rounded-full flex items-center justify-center border border-[#111]/20" style={{ backgroundColor: "rgba(0,0,0,0.15)" }}>
              <MessageCircle className="w-4 h-4 text-[#111]" />
            </div>
            <span className="text-[9px] font-semibold text-[#111]">Message host</span>
          </button>
        </div>
        {/* Event title at bottom of gradient */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-5">
          <h1 className={`text-white ${titleClass} drop-shadow-lg`} style={{ fontFamily: eventFontFamily }}>{event.title || "Untitled Event"}</h1>
          {event.vibe && <p className={`text-white/60 mt-1 ${vibeClass}`} style={{ fontFamily: eventFontFamily }}>{event.vibe}</p>}
        </div>
      </div>

      {/* Content area */}
      <div className="px-5 pt-4">

      {/* Detail bubbles */}
      {(event.location || event.date_time || event.dress_code || event.extra) && (
        <div className="flex flex-col gap-2">
          {event.location && (
            <div className="p-4 backdrop-blur-sm flex items-center gap-3" style={{ backgroundColor: bubbleBg, borderRadius: "12px" }}>
              <span className="text-xl">📍</span>
              <span className={bubbleTextClass} style={{ color: bubbleText }}>{event.location}</span>
            </div>
          )}
          {event.date_time && (
            <div className="p-4 backdrop-blur-sm flex items-center gap-3" style={{ backgroundColor: bubbleBg, borderRadius: "12px" }}>
              <span className="text-xl">📅</span>
              <span className={bubbleTextClass} style={{ color: bubbleText }}>
                {new Date(event.date_time).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              </span>
            </div>
          )}
          {event.dress_code && (
            <div className="p-4 backdrop-blur-sm flex items-center gap-3" style={{ backgroundColor: bubbleBg, borderRadius: "12px" }}>
              <span className="text-xl">🎭</span>
              <span className={bubbleTextClass} style={{ color: bubbleText }}>{event.dress_code}</span>
            </div>
          )}
          {event.extra && (
            <div className="p-4 backdrop-blur-sm flex items-center gap-3" style={{ backgroundColor: bubbleBg, borderRadius: "12px" }}>
              <span className="text-xl">➕</span>
              <span className={bubbleTextClass} style={{ color: bubbleText }}>{event.extra}</span>
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
          {comments.length === 0 && (
            <p className="text-muted-foreground text-xs text-center py-3">No comments yet — be the first!</p>
          )}
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

      {/* Gallery section */}
      <div className="mt-4 rounded-[var(--radius)] p-4 border border-border" style={{ backgroundColor: "#383838" }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-bold text-sm">Gallery</h2>
          <button onClick={() => photoInput.current?.click()} className="text-xs font-bold bg-primary text-primary-foreground rounded-full px-3 py-1">
            Add photo
          </button>
          <input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        </div>
        {uploadingPhoto && <p className="text-primary text-xs text-center py-2">Uploading...</p>}
        {photos.length === 0 && !uploadingPhoto ? (
          <p className="text-muted-foreground text-xs text-center py-4">No photos yet — add the first one!</p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {photos.map((p, i) => (
              <div key={p.id} className="aspect-square rounded-lg overflow-hidden">
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
            className="mx-auto block bg-secondary/95 backdrop-blur-sm rounded-full px-5 py-2.5 text-sm font-bold text-primary border border-border"
          >
            {rsvpLabel}
          </button>
        ) : (
          <div className="bg-secondary/95 backdrop-blur-sm rounded-[var(--radius)] p-4 border border-border">
            <p className="text-muted-foreground text-xs font-semibold text-center mb-3">{rsvp ? rsvpLabel : "Are you going?"}</p>
            <div className="flex gap-2">
              <button onClick={() => handleRsvp("yes")} className={`flex-1 rounded-full py-2.5 text-sm font-bold ${rsvp === "yes" ? "bg-primary text-primary-foreground" : "bg-muted text-secondary-foreground border border-border"}`}>Yes 🙌</button>
              <button onClick={() => handleRsvp("no")} className={`flex-1 rounded-full py-2.5 text-sm font-bold ${rsvp === "no" ? "bg-primary text-primary-foreground" : "bg-muted text-secondary-foreground border border-border"}`}>No 👎</button>
              <button onClick={() => handleRsvp("maybe")} className={`flex-1 rounded-full py-2.5 text-sm font-bold ${rsvp === "maybe" ? "bg-primary text-primary-foreground" : "bg-muted text-secondary-foreground border border-border"}`}>Maybe 🤷</button>
            </div>
          </div>
        )}
      </div>

      {/* Full-screen comments overlay */}
      {showFullComments && (
        <div className="fixed inset-0 z-[60] flex flex-col" style={{ backgroundColor: "#2b2b2b" }}>
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <button onClick={() => setShowFullComments(false)}>
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <h2 className="text-white font-bold text-base">Comments</h2>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {comments.length === 0 && (
              <p className="text-muted-foreground text-sm text-center mt-10">No comments yet — be the first!</p>
            )}
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
              <p className="text-muted-foreground text-sm text-center mt-10">Send a private message to the host — e.g. dietary needs, questions, or a heads up.</p>
            )}
            {messages.map((m: any, i: number) => (
              <div key={i} className={`flex ${m.from === "guest" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${m.from === "guest" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground border border-border"}`}>
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
            <button onClick={sendMessage} className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <Send className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default GuestEventView;
