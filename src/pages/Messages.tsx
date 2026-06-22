import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const LIME = "#C6F24E";
const COVO_GRAD = "linear-gradient(120deg, #3D7BFF, #22D3EE)";
const COVO_CYAN = "#22D3EE";

type Convo = {
  key: string;
  otherId: string;
  otherName: string;
  otherLabel: string;
  otherAvatar: string | null;
  eventId: string;
  eventTitle: string;
  lastMessage: string;
  lastTime: string;
  isUnread: boolean;
};

const fmtTime = (ts: string) => {
  const d = new Date(ts);
  const now = new Date();
  const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return d.toLocaleDateString(undefined, { weekday: "short" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const Avatar = ({ name, url, size = 48, accent }: { name: string; url: string | null; size?: number; accent?: boolean }) => (
  <div
    className="rounded-full overflow-hidden bg-secondary flex items-center justify-center shrink-0"
    style={{ width: size, height: size }}
  >
    {url ? (
      <img src={url} alt="" className="w-full h-full object-cover" />
    ) : (
      <span className="font-bold" style={{ fontSize: size * 0.35, color: accent ? COVO_CYAN : "#aaa" }}>
        {name.charAt(0).toUpperCase()}
      </span>
    )}
  </div>
);

const Messages = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [convos, setConvos] = useState<Convo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    // Record visit so Home.tsx badge resets
    localStorage.setItem(`dm_last_visited_${user.id}`, new Date().toISOString());

    const load = async () => {
      const { data: dms } = await supabase
        .from("direct_messages")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (!dms?.length) { setLoading(false); return; }

      // Deduplicate — one entry per (otherId, eventId), keeping latest
      const seen = new Set<string>();
      const threads: Array<{ otherId: string; eventId: string; lastMessage: string; lastTime: string; fromOther: boolean }> = [];
      for (const dm of dms) {
        const otherId = dm.sender_id === user.id ? dm.receiver_id : dm.sender_id;
        const key = `${otherId}_${dm.event_id}`;
        if (!seen.has(key)) {
          seen.add(key);
          threads.push({ otherId, eventId: dm.event_id, lastMessage: dm.text, lastTime: dm.created_at, fromOther: dm.sender_id !== user.id });
        }
      }

      const otherIds = [...new Set(threads.map(t => t.otherId))];
      const eventIds = [...new Set(threads.map(t => t.eventId))];

      const [{ data: profiles }, { data: events }] = await Promise.all([
        supabase.from("profiles").select("user_id, name, username, avatar_url").in("user_id", otherIds),
        supabase.from("events").select("id, title, host_id").in("id", eventIds),
      ]);

      const pm = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      const em = new Map((events || []).map((e: any) => [e.id, e]));

      setConvos(threads.map(t => {
        const key = `${t.otherId}_${t.eventId}`;
        const lastRead = localStorage.getItem(`dm_last_read_${user.id}_${key}`);
        const isUnread = t.fromOther && (!lastRead || new Date(t.lastTime) > new Date(lastRead));
        const other = pm.get(t.otherId);
        const ev = em.get(t.eventId);
        const role = ev?.host_id === t.otherId ? "Host" : "Guest";
        const handle = (other as any)?.username || other?.name || "User";
        const prefix = (other as any)?.username ? `@${(other as any).username}` : handle;
        return {
          key,
          otherId: t.otherId,
          otherName: handle,
          otherLabel: `${prefix} · ${role}`,
          otherAvatar: other?.avatar_url || null,
          eventId: t.eventId,
          eventTitle: ev?.title || "Event",
          lastMessage: t.lastMessage,
          lastTime: t.lastTime,
          isUnread,
        };
      }));
      setLoading(false);
    };
    load();
  }, [user]);

  const filtered = search.trim()
    ? convos.filter(c => c.otherName.toLowerCase().includes(search.toLowerCase()) || c.eventTitle.toLowerCase().includes(search.toLowerCase()))
    : convos;

  const unreadCount = convos.filter(c => c.isUnread).length;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex items-center gap-3 px-5 pt-10 pb-3">
        <button type="button" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6 text-muted-foreground" />
        </button>
        <h1
          className="flex-1 text-xl font-bold"
          style={{ background: COVO_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
        >
          Messages
        </h1>
        {unreadCount > 0 && (
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: LIME, color: "#0d0e11" }}>
            {unreadCount} new
          </span>
        )}
      </div>

      <div className="px-5 pb-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search conversations…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-card text-foreground rounded-full pl-10 pr-4 py-2.5 text-sm outline-none border border-border placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="text-muted-foreground text-sm text-center py-12">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 px-6">
            <div className="w-16 h-16 rounded-full bg-card border border-border flex items-center justify-center">
              <MessageCircle className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-foreground font-semibold">{search ? "No conversations found" : "No messages yet"}</p>
            <p className="text-muted-foreground text-sm text-center">
              {search ? "Try a different search" : "Private messages from events will appear here"}
            </p>
          </div>
        ) : (
          filtered.map(c => (
            <button
              key={c.key}
              type="button"
              onClick={() => navigate(`/messages/${c.otherId}_${c.eventId}`)}
              className="w-full flex items-center gap-3 px-5 py-3.5 border-b border-border text-left active:bg-card transition-colors"
            >
              {/* Avatar with unread dot */}
              <div className="relative shrink-0">
                <Avatar name={c.otherName} url={c.otherAvatar} accent />
                {c.isUnread && (
                  <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-background" style={{ backgroundColor: LIME }} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-sm truncate ${c.isUnread ? "font-bold text-foreground" : "font-semibold text-foreground"}`}>
                    {c.otherLabel}
                  </span>
                  <span className="text-[11px] text-muted-foreground ml-2 shrink-0">{fmtTime(c.lastTime)}</span>
                </div>
                <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mb-0.5" style={{ backgroundColor: c.isUnread ? "rgba(34,211,238,0.13)" : "rgba(198,242,78,0.1)", color: c.isUnread ? COVO_CYAN : LIME }}>
                  {c.eventTitle}
                </span>
                <p className={`text-xs truncate ${c.isUnread ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                  {c.lastMessage}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default Messages;
