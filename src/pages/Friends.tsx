import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Check, X, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { createNotification } from "@/lib/notifications";

const COVO_BLUE = "#3D7BFF";
const COVO_GRAD = "linear-gradient(120deg, #3D7BFF, #22D3EE)";

type FriendProfile = {
  id: string;
  user_id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
};

type Friendship = {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: string;
  other: FriendProfile;
};

const Avatar = ({ p, size = 40 }: { p: FriendProfile; size?: number }) => (
  <div
    className="rounded-full overflow-hidden bg-secondary flex items-center justify-center shrink-0"
    style={{ width: size, height: size }}
  >
    {p.avatar_url ? (
      <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
    ) : (
      <span className="font-bold text-foreground" style={{ fontSize: size * 0.38 }}>
        {p.name.charAt(0).toUpperCase()}
      </span>
    )}
  </div>
);

const Friends = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [searching, setSearching] = useState(false);

  const [pendingIn, setPendingIn] = useState<Friendship[]>([]);
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const loadFriendships = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("friendships")
      .select("*")
      .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`);

    if (!data) { setLoading(false); return; }

    const otherIds: string[] = data.map((f: any) =>
      f.requester_id === user.id ? f.recipient_id : f.requester_id
    );

    let profileMap = new Map<string, FriendProfile>();
    if (otherIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, user_id, name, username, avatar_url")
        .in("user_id", otherIds);
      (profiles || []).forEach((p: any) => profileMap.set(p.user_id, p));
    }

    const pending: Friendship[] = [];
    const accepted: Friendship[] = [];
    const sent = new Set<string>();

    for (const f of data as any[]) {
      const otherId = f.requester_id === user.id ? f.recipient_id : f.requester_id;
      const other = profileMap.get(otherId);
      if (!other) continue;
      const friendship: Friendship = { id: f.id, requester_id: f.requester_id, recipient_id: f.recipient_id, status: f.status, other };
      if (f.status === "pending") {
        if (f.recipient_id === user.id) pending.push(friendship);
        else sent.add(other.user_id);
      } else if (f.status === "accepted") {
        accepted.push(friendship);
      }
    }

    setPendingIn(pending);
    setFriends(accepted);
    setSentIds(sent);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadFriendships(); }, [loadFriendships]);

  // Search with debounce
  useEffect(() => {
    if (!search.trim() || !user) { setSearchResults([]); return; }
    const q = search.replace(/^@/, "").toLowerCase();
    setSearching(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, user_id, name, username, avatar_url")
        .ilike("username" as any, `%${q}%`)
        .neq("user_id", user.id)
        .limit(10);
      setSearchResults((data || []) as FriendProfile[]);
      setSearching(false);
    }, 400);
    return () => clearTimeout(t);
  }, [search, user]);

  const sendRequest = async (recipientUserId: string) => {
    if (!user) return;
    const { data: inserted } = await (supabase as any).from("friendships").insert({
      requester_id: user.id,
      recipient_id: recipientUserId,
      status: "pending",
    }).select().single();
    setSentIds((prev) => new Set([...prev, recipientUserId]));
    // Notify recipient
    try {
      const { data: myProfile } = await supabase.from("profiles").select("name").eq("user_id", user.id).single();
      const senderName = myProfile?.name || "Someone";
      await createNotification(
        recipientUserId,
        "friend_request",
        "New friend request",
        `${senderName} sent you a friend request`,
        { requester_id: user.id, friendship_id: inserted?.id }
      );
    } catch {}
  };

  const accept = async (friendshipId: string) => {
    await (supabase as any).from("friendships").update({ status: "accepted" }).eq("id", friendshipId);
    loadFriendships();
  };

  const decline = async (friendshipId: string) => {
    await (supabase as any).from("friendships").delete().eq("id", friendshipId);
    loadFriendships();
  };

  const showSearch = search.trim().length > 0;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-10 pb-4">
        <button type="button" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6 text-muted-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Friends</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-6">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by @username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-card text-foreground rounded-full pl-10 pr-4 py-2.5 text-sm outline-none border border-border placeholder:text-muted-foreground"
          />
        </div>

        {/* Search results */}
        {showSearch && (
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Results</p>
            {searching && (
              <p className="text-sm text-muted-foreground text-center py-6">Searching...</p>
            )}
            {!searching && searchResults.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">No users found for "{search}"</p>
            )}
            {searchResults.map((p) => {
              const isFriend = friends.some((f) => f.other.user_id === p.user_id);
              const isPending = sentIds.has(p.user_id) || pendingIn.some(f => f.other.user_id === p.user_id);
              return (
                <div key={p.user_id} className="flex items-center gap-3 bg-card rounded-2xl px-4 py-3 border border-border">
                  <Avatar p={p} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{p.name}</p>
                    {p.username && <p className="text-xs text-muted-foreground">@{p.username}</p>}
                  </div>
                  {isFriend ? (
                    <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: "rgba(61,123,255,0.15)", color: COVO_BLUE }}>
                      Friends
                    </span>
                  ) : isPending ? (
                    <span className="text-xs font-semibold text-muted-foreground px-3 py-1 rounded-full bg-secondary">
                      Pending
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => sendRequest(p.user_id)}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
                      style={{ background: COVO_GRAD, color: "#06121f", border: "none" }}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Add
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pending requests */}
        {!showSearch && pendingIn.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
              Friend Requests · {pendingIn.length}
            </p>
            {pendingIn.map((f) => (
              <div key={f.id} className="flex items-center gap-3 bg-card rounded-2xl px-4 py-3 border border-border">
                <Avatar p={f.other} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">{f.other.name}</p>
                  {f.other.username && <p className="text-xs text-muted-foreground">@{f.other.username}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => accept(f.id)}
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ background: COVO_GRAD }}
                  >
                    <Check className="w-4 h-4" style={{ color: "#06121f" }} />
                  </button>
                  <button
                    type="button"
                    onClick={() => decline(f.id)}
                    className="w-9 h-9 rounded-full flex items-center justify-center bg-secondary border border-border"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Friends list */}
        {!showSearch && (
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
              {friends.length > 0 ? `Friends · ${friends.length}` : "Friends"}
            </p>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>
            ) : friends.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm text-muted-foreground">No friends yet</p>
                <p className="text-xs text-muted-foreground mt-1">Search for people by @username to connect</p>
              </div>
            ) : (
              friends.map((f) => (
                <div key={f.id} className="flex items-center gap-3 bg-card rounded-2xl px-4 py-3 border border-border">
                  <Avatar p={f.other} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{f.other.name}</p>
                    {f.other.username && <p className="text-xs text-muted-foreground">@{f.other.username}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Friends;
