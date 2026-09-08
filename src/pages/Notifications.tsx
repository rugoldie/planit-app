import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, Check, X, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const COVO_BLUE = "#2563eb";
const COVO_CYAN = "#2563eb";
const COVO_GRAD = "#2563eb";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, any>;
  read: boolean;
  created_at: string;
};

const formatTime = (ts: string) => {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const Notifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  // friendship_id -> current status ("pending" | "accepted"); missing key
  // means the friendship row is gone (declined, or never existed).
  const [friendshipStatus, setFriendshipStatus] = useState<Record<string, string>>({});

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    const list = (data || []) as Notification[];
    setNotifications(list);

    const friendshipIds = list
      .filter(n => n.type === "friend_request" && n.data?.friendship_id)
      .map(n => n.data.friendship_id);
    if (friendshipIds.length > 0) {
      const { data: friendships } = await (supabase as any)
        .from("friendships")
        .select("id, status")
        .in("id", friendshipIds);
      const map: Record<string, string> = {};
      (friendships || []).forEach((f: any) => { map[f.id] = f.status; });
      setFriendshipStatus(map);
    }
    setLoading(false);
  };

  useEffect(() => { fetchNotifications(); }, [user]);

  const markRead = async (id: string) => {
    await (supabase as any).from("notifications").update({ read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    if (!user) return;
    await (supabase as any).from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleAcceptFriend = async (n: Notification) => {
    const friendshipId = n.data?.friendship_id;
    if (!friendshipId) return;
    const { data, error } = await (supabase as any)
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", friendshipId)
      .select();
    if (error) {
      toast.error(`Couldn't accept request: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      // No error, but no row came back either - the request is gone (already
      // declined) or RLS didn't recognize this session as the recipient.
      toast.error("Couldn't accept request — it may no longer be available.");
      return;
    }
    setFriendshipStatus(prev => ({ ...prev, [friendshipId]: "accepted" }));
    await markRead(n.id);
  };

  const handleDeclineFriend = async (n: Notification) => {
    const friendshipId = n.data?.friendship_id;
    if (!friendshipId) return;
    const { data, error } = await (supabase as any)
      .from("friendships")
      .delete()
      .eq("id", friendshipId)
      .select();
    if (error) {
      toast.error(`Couldn't decline request: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      toast.error("Couldn't decline request — it may no longer be available.");
      return;
    }
    setFriendshipStatus(prev => {
      const next = { ...prev };
      delete next[friendshipId];
      return next;
    });
    await markRead(n.id);
  };

  const handleTap = async (n: Notification) => {
    if (!n.read) await markRead(n.id);
    if (n.data?.event_code) {
      navigate(n.data.is_host ? `/event/${n.data.event_code}` : `/guest/${n.data.event_code}`);
    } else if (n.type === "friend_request") {
      navigate("/friends");
    }
  };

  const isDeadlineOrReminder = (type: string) => type === "rsvp_deadline" || type === "event_reminder";

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-10 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6 text-muted-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Notifications</h1>
        </div>
        {unreadCount > 0 && (
          <button type="button" onClick={markAllRead} className="text-sm font-medium" style={{ color: COVO_BLUE }}>
            Mark all read
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="text-muted-foreground text-sm text-center py-12">Loading...</p>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-16 h-16 rounded-full bg-card border border-border flex items-center justify-center">
              <Bell className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-foreground font-semibold">No notifications yet</p>
            <p className="text-muted-foreground text-sm text-center px-8">
              You'll see friend requests, RSVPs and event reminders here
            </p>
          </div>
        ) : (
          notifications.map(n => (
            // Not a <button> - the friend-request row nests real <button>s
            // (Accept/Decline) inside it, and interactive elements can't
            // nest inside a <button> without the browser breaking the DOM.
            <div
              key={n.id}
              role="button"
              tabIndex={0}
              onClick={() => handleTap(n)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleTap(n); }}
              className="w-full text-left px-5 py-4 border-b border-border flex gap-3 items-start cursor-pointer"
              style={{ backgroundColor: n.read ? "transparent" : "rgba(61,123,255,0.04)" }}
            >
              {/* Unread dot */}
              <div className="mt-1.5 shrink-0">
                {!n.read ? (
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COVO_CYAN }} />
                ) : (
                  <div className="w-2 h-2" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-0.5">
                  <p
                    className="text-sm font-semibold"
                    style={{ color: isDeadlineOrReminder(n.type) ? "#f97316" : "#ffffff" }}
                  >
                    {n.title}
                  </p>
                  <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(n.created_at)}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{n.body}</p>

                {/* Inline actions */}
                {n.type === "friend_request" && n.data?.friendship_id && (
                  friendshipStatus[n.data.friendship_id] === "accepted" ? (
                    <p className="text-xs font-semibold mt-2" style={{ color: COVO_BLUE }}>Friend request accepted</p>
                  ) : friendshipStatus[n.data.friendship_id] === "pending" ? (
                    <div className="flex gap-2 mt-2" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleAcceptFriend(n)}
                        className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
                        style={{ background: COVO_GRAD, color: "#ffffff", border: "none" }}
                      >
                        <Check className="w-3 h-3" /> Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeclineFriend(n)}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-secondary border border-border text-muted-foreground"
                      >
                        <X className="w-3 h-3" /> Decline
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-2">Request no longer available</p>
                  )
                )}

                {n.type === "event_invite" && n.data?.event_code && (
                  <div className="mt-2" onClick={e => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => navigate(`/guest/${n.data.event_code}`)}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
                      style={{ background: COVO_GRAD, color: "#ffffff", border: "none" }}
                    >
                      <Eye className="w-3 h-3" /> View invite
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;
