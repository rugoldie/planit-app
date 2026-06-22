import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const COVO_CYAN = "#22D3EE";
const COVO_GRAD = "linear-gradient(120deg, #3D7BFF, #22D3EE)";

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
};

const Avatar = ({ name, url, size = 38 }: { name: string; url: string | null; size?: number }) => (
  <div
    className="rounded-full overflow-hidden bg-secondary flex items-center justify-center shrink-0"
    style={{ width: size, height: size }}
  >
    {url ? (
      <img src={url} alt="" className="w-full h-full object-cover" />
    ) : (
      <span className="font-bold" style={{ fontSize: size * 0.38, color: COVO_CYAN }}>
        {name.charAt(0).toUpperCase()}
      </span>
    )}
  </div>
);

// Parse "${otherId}_${eventId}" — UUIDs contain only hyphens so the
// single underscore is an unambiguous separator.
const parseConversationId = (id: string | undefined): [string, string] => {
  if (!id) return ["", ""];
  const idx = id.indexOf("_");
  if (idx < 0) return [id, ""];
  return [id.slice(0, idx), id.slice(idx + 1)];
};

const Conversation = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [otherId, eventId] = parseConversationId(conversationId);

  const [messages, setMessages] = useState<Message[]>([]);
  const [other, setOther] = useState<OtherUser | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user || !otherId || !eventId) return;

    // Fetch profile and event in parallel; messages separately so profile
    // failure doesn't block the chat from showing.
    const loadMeta = async () => {
      const [{ data: profileData }, { data: eventData }] = await Promise.all([
        (supabase.from("profiles") as any).select("*").eq("user_id", otherId).maybeSingle(),
        supabase.from("events").select("title").eq("id", eventId).maybeSingle(),
      ]);

      if (profileData) {
        setOther({
          name: profileData.name || "User",
          username: profileData.username || null,
          avatar_url: profileData.avatar_url || null,
        });
      }
      if (eventData) {
        setEventTitle((eventData as any).title || "");
      }
    };

    const loadMessages = async () => {
      const { data } = await supabase
        .from("direct_messages")
        .select("id, sender_id, text, created_at")
        .eq("event_id", eventId)
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true });

      setMessages(
        (data || []).map((m: any) => ({
          id: m.id,
          sender_id: m.sender_id,
          text: m.text,
          created_at: m.created_at,
        }))
      );

      // Mark thread as read
      localStorage.setItem(
        `dm_last_read_${user.id}_${otherId}_${eventId}`,
        new Date().toISOString()
      );
    };

    loadMeta();
    loadMessages();

    // Realtime: append new messages that belong to this thread
    const channel = supabase
      .channel(`convo_${otherId}_${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const m = payload.new as any;
          const belongs =
            (m.sender_id === user.id && m.receiver_id === otherId) ||
            (m.sender_id === otherId && m.receiver_id === user.id);
          if (!belongs) return;
          setMessages((prev) => {
            // Deduplicate — optimistic message was added with a temp id
            const exists = prev.some((p) => p.id === m.id);
            if (exists) return prev;
            // Replace the matching optimistic entry (same text, sender, no real id yet)
            const optimisticIdx = prev.findIndex(
              (p) => p.sender_id === user.id && p.text === m.text && p.id.startsWith("opt-")
            );
            if (optimisticIdx >= 0) {
              const next = [...prev];
              next[optimisticIdx] = { id: m.id, sender_id: m.sender_id, text: m.text, created_at: m.created_at };
              return next;
            }
            return [...prev, { id: m.id, sender_id: m.sender_id, text: m.text, created_at: m.created_at }];
          });
          localStorage.setItem(
            `dm_last_read_${user.id}_${otherId}_${eventId}`,
            new Date().toISOString()
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, otherId, eventId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !user || !otherId || !eventId || sending) return;

    setSending(true);
    setDraft("");

    // Optimistic insert so the message appears immediately
    const tempId = `opt-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: tempId, sender_id: user.id, text, created_at: new Date().toISOString() },
    ]);

    await supabase
      .from("direct_messages")
      .insert({ event_id: eventId, sender_id: user.id, receiver_id: otherId, text });

    setSending(false);
    inputRef.current?.focus();
  };

  const displayName = other
    ? other.username
      ? `@${other.username}`
      : other.name
    : null;

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-10 pb-3 border-b border-border shrink-0">
        <button type="button" onClick={() => navigate(-1)} className="shrink-0">
          <ArrowLeft className="w-6 h-6 text-muted-foreground" />
        </button>

        {other ? (
          <Avatar name={other.name} url={other.avatar_url} />
        ) : (
          <div className="w-[38px] h-[38px] rounded-full bg-secondary shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          {displayName ? (
            <p className="text-sm font-bold text-foreground truncate">{displayName}</p>
          ) : (
            <div className="h-4 w-32 rounded bg-secondary animate-pulse" />
          )}
          {eventTitle ? (
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{eventTitle}</p>
          ) : (
            <div className="h-3 w-20 rounded bg-secondary animate-pulse mt-1" />
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[75%] rounded-2xl px-4 py-2.5"
                style={
                  mine
                    ? { background: COVO_GRAD, color: "#06121f" }
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
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Message…"
            className="flex-1 bg-card text-foreground rounded-full px-4 py-2.5 text-sm outline-none border border-border placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={send}
            disabled={!draft.trim() || sending}
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
            style={{ background: COVO_GRAD }}
          >
            <Send className="w-4 h-4" style={{ color: "#06121f" }} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Conversation;
