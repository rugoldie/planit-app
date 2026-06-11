import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const ACCENT = "#aaee44";

type Message = {
  id: string;
  sender_id: string;
  text: string;
  created_at: string;
};

type OtherUser = {
  name: string;
  username: string | null;
  avatar_url: string | null;
  role: "Host" | "Guest";
};

const Avatar = ({ name, url, size = 36 }: { name: string; url: string | null; size?: number }) => (
  <div
    className="rounded-full overflow-hidden bg-secondary flex items-center justify-center shrink-0"
    style={{ width: size, height: size }}
  >
    {url ? (
      <img src={url} alt="" className="w-full h-full object-cover" />
    ) : (
      <span className="font-bold" style={{ fontSize: size * 0.38, color: ACCENT }}>
        {name.charAt(0).toUpperCase()}
      </span>
    )}
  </div>
);

const Conversation = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [other, setOther] = useState<OtherUser | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // conversationId is "${otherId}_${eventId}"
  const parts = conversationId?.split("_") ?? [];
  // UUIDs are 5 segments joined by hyphens; the full ID is two UUIDs joined by "_"
  // Since UUID contains only hyphens, a single underscore separates the two
  const underscoreIdx = conversationId?.indexOf("_") ?? -1;
  const otherId = underscoreIdx >= 0 ? conversationId!.slice(0, underscoreIdx) : parts[0];
  const eventId = underscoreIdx >= 0 ? conversationId!.slice(underscoreIdx + 1) : parts[1];

  useEffect(() => {
    if (!user || !otherId || !eventId) return;

    const load = async () => {
      const [{ data: profileData }, { data: eventData }, { data: msgData }] = await Promise.all([
        supabase.from("profiles").select("name, username, avatar_url").eq("user_id", otherId).maybeSingle(),
        supabase.from("events").select("title, host_id").eq("id", eventId).maybeSingle(),
        supabase
          .from("direct_messages")
          .select("id, sender_id, text, created_at")
          .eq("event_id", eventId)
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`)
          .order("created_at", { ascending: true }),
      ]);

      if (profileData && eventData) {
        setOther({
          name: (profileData as any).name || "User",
          username: (profileData as any).username || null,
          avatar_url: (profileData as any).avatar_url || null,
          role: eventData.host_id === otherId ? "Host" : "Guest",
        });
        setEventTitle((eventData as any).title || "");
      }

      setMessages((msgData || []).map((m: any) => ({ id: m.id, sender_id: m.sender_id, text: m.text, created_at: m.created_at })));

      // Mark as read
      const key = `${otherId}_${eventId}`;
      localStorage.setItem(`dm_last_read_${user.id}_${key}`, new Date().toISOString());
    };

    load();

    // Realtime subscription
    const channel = supabase
      .channel(`convo_${otherId}_${eventId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `event_id=eq.${eventId}` }, (payload) => {
        const m = payload.new as any;
        const isOurs = (m.sender_id === user.id && m.receiver_id === otherId) || (m.sender_id === otherId && m.receiver_id === user.id);
        if (!isOurs) return;
        setMessages(prev => [...prev, { id: m.id, sender_id: m.sender_id, text: m.text, created_at: m.created_at }]);
        localStorage.setItem(`dm_last_read_${user.id}_${otherId}_${eventId}`, new Date().toISOString());
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, otherId, eventId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!draft.trim() || !user || !otherId || !eventId || sending) return;
    setSending(true);
    const text = draft.trim();
    setDraft("");
    await supabase.from("direct_messages").insert({ event_id: eventId, sender_id: user.id, receiver_id: otherId, text });
    setSending(false);
  };

  const otherHandle = other ? (other.username ? `@${other.username}` : other.name) : "…";
  const otherLabel = other ? `${otherHandle} · ${other.role}` : "…";

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-10 pb-3 border-b border-border shrink-0">
        <button type="button" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6 text-muted-foreground" />
        </button>
        {other && <Avatar name={other.name} url={other.avatar_url} />}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{otherLabel}</p>
          {eventTitle && (
            <p className="text-[11px] text-muted-foreground truncate">{eventTitle}</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.map(m => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[75%] rounded-2xl px-4 py-2.5"
                style={mine
                  ? { backgroundColor: ACCENT, color: "#111" }
                  : { backgroundColor: "#2a2a2a", color: "white" }
                }
              >
                <p className="text-sm">{m.text}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-8 pt-3 border-t border-border shrink-0">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Message…"
            className="flex-1 bg-card text-foreground rounded-full px-4 py-2.5 text-sm outline-none border border-border placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={send}
            disabled={!draft.trim() || sending}
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 disabled:opacity-40"
            style={{ backgroundColor: ACCENT }}
          >
            <Send className="w-4 h-4" style={{ color: "#111" }} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Conversation;
