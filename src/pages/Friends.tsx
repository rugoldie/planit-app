import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Check, X, UserPlus, Contact } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { createNotification } from "@/lib/notifications";
import { toast } from "sonner";

const COVO_BLUE = "#2563eb";
const CARD_BG = "#1a1a1a";

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

type Suggestion = {
  profile: FriendProfile;
  mutualCount: number;
  inContacts: boolean;
};

// The Contact Picker API has no persistent "permission granted" state to check
// ahead of time - every access requires a fresh user-gesture-triggered picker,
// and it's only available on Chromium-based mobile browsers (not iOS Safari,
// not desktop). We feature-detect and only show the contacts entry point when
// the browser actually supports it.
const contactsSupported =
  typeof navigator !== "undefined" && "contacts" in navigator && "ContactsManager" in window;

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

const MutualLabel = ({ count }: { count: number }) =>
  count > 0 ? (
    <p className="text-xs text-muted-foreground">{count} mutual friend{count === 1 ? "" : "s"}</p>
  ) : null;

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

  // user_id -> number of my friends who are also friends with that user
  const [mutualCounts, setMutualCounts] = useState<Map<string, number>>(new Map());
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const [contactsMatched, setContactsMatched] = useState<FriendProfile[]>([]);
  const [checkingContacts, setCheckingContacts] = useState(false);

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

    const profileMap = new Map<string, FriendProfile>();
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

  // Build the mutual-friend-count map via a "friends of friends" query: any
  // accepted friendship touching one of my friends contributes +1 to the
  // *other* side's mutual count, as long as that other side isn't me or
  // already one of my friends.
  const loadMutualCounts = useCallback(async () => {
    if (!user || friends.length === 0) { setMutualCounts(new Map()); return; }
    const myFriendIds = friends.map((f) => f.other.user_id);
    const myFriendSet = new Set(myFriendIds);
    const idList = myFriendIds.join(",");

    const { data: fof } = await (supabase as any)
      .from("friendships")
      .select("requester_id, recipient_id")
      .eq("status", "accepted")
      .or(`requester_id.in.(${idList}),recipient_id.in.(${idList})`);

    const counts = new Map<string, number>();
    for (const row of (fof || []) as any[]) {
      const { requester_id: a, recipient_id: b } = row;
      if (myFriendSet.has(a) && !myFriendSet.has(b) && b !== user.id) {
        counts.set(b, (counts.get(b) || 0) + 1);
      }
      if (myFriendSet.has(b) && !myFriendSet.has(a) && a !== user.id) {
        counts.set(a, (counts.get(a) || 0) + 1);
      }
    }
    setMutualCounts(counts);
  }, [user, friends]);

  useEffect(() => { loadMutualCounts(); }, [loadMutualCounts]);

  // Build "People you may know": friends-of-friends candidates merged with
  // any contacts-matched users, ranked by mutual friend count.
  useEffect(() => {
    if (!user) return;
    const excludeIds = new Set<string>([
      user.id,
      ...friends.map((f) => f.other.user_id),
      ...Array.from(sentIds),
      ...pendingIn.map((f) => f.other.user_id),
    ]);

    const candidateIds = Array.from(mutualCounts.keys()).filter((id) => !excludeIds.has(id));

    (async () => {
      // Same reason as the search query below: candidates here are, by
      // definition, not-yet-friends, so the base `profiles` table's RLS
      // (own row only) would silently return nothing for all of them.
      const profileMap = new Map<string, FriendProfile>();
      if (candidateIds.length > 0) {
        const { data } = await supabase
          .from("profiles_public")
          .select("user_id, name, avatar_url")
          .in("user_id", candidateIds);
        (data || []).forEach((p: any) =>
          profileMap.set(p.user_id, { id: p.user_id, user_id: p.user_id, name: p.name || "", username: null, avatar_url: p.avatar_url })
        );
      }

      const list: Suggestion[] = candidateIds
        .filter((id) => profileMap.has(id))
        .map((id) => ({ profile: profileMap.get(id)!, mutualCount: mutualCounts.get(id) || 0, inContacts: false }));

      for (const cp of contactsMatched) {
        if (excludeIds.has(cp.user_id)) continue;
        const existing = list.find((s) => s.profile.user_id === cp.user_id);
        if (existing) existing.inContacts = true;
        else list.push({ profile: cp, mutualCount: mutualCounts.get(cp.user_id) || 0, inContacts: true });
      }

      list.sort((a, b) => b.mutualCount - a.mutualCount);
      setSuggestions(list);
    })();
  }, [user, friends, sentIds, pendingIn, mutualCounts, contactsMatched]);

  // Search by username with debounce.
  //
  // This queries `profiles_public`, not `profiles` - the base `profiles`
  // table's RLS only allows reading your own row (confirmed: an unfiltered
  // query against it returns zero rows for any other user), so searching it
  // for someone else always silently returned []. `profiles_public` is a
  // view exposing (user_id, name, username, avatar_url) specifically for
  // cross-user discovery like this.
  useEffect(() => {
    if (!search.trim() || !user) { setSearchResults([]); return; }
    const q = search.replace(/^@/, "").toLowerCase();
    setSearching(true);
    const t = setTimeout(async () => {
      const { data, error } = await supabase
        .from("profiles_public")
        .select("user_id, name, username, avatar_url")
        .ilike("username", `%${q}%`)
        .neq("user_id", user.id)
        .limit(20);
      console.log("Friends search: query=", q, "data=", data, "error=", error);
      const results: FriendProfile[] = (data || []).map((p: any) => ({
        id: p.user_id,
        user_id: p.user_id,
        name: p.name || "",
        username: p.username || null,
        avatar_url: p.avatar_url,
      }));
      setSearchResults(results);
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
    const { data, error } = await (supabase as any)
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", friendshipId)
      .select();
    console.log("accept friend request:", friendshipId, "data=", data, "error=", error);
    if (error) {
      toast.error(`Couldn't accept request: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      // No error, but no row came back either - the update matched nothing,
      // most likely because auth.uid() didn't match what RLS expects (e.g. a
      // stale/expired session) rather than the request itself being invalid.
      console.error("accept friend request: update affected 0 rows for id", friendshipId);
      toast.error("Couldn't accept request — try logging out and back in.");
      return;
    }
    await loadFriendships();
  };

  const decline = async (friendshipId: string) => {
    const { data, error } = await (supabase as any)
      .from("friendships")
      .delete()
      .eq("id", friendshipId)
      .select();
    console.log("decline friend request:", friendshipId, "data=", data, "error=", error);
    if (error) {
      toast.error(`Couldn't decline request: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      console.error("decline friend request: delete affected 0 rows for id", friendshipId);
      toast.error("Couldn't decline request — try logging out and back in.");
      return;
    }
    await loadFriendships();
  };

  const findFromContacts = async () => {
    if (!contactsSupported) return;
    setCheckingContacts(true);
    try {
      const picked: any[] = await (navigator as any).contacts.select(["name", "tel"], { multiple: true });
      const deviceNumbers = picked
        .flatMap((c) => c.tel || [])
        .map((t: string) => t.replace(/\D/g, ""))
        .filter((d: string) => d.length >= 7);

      if (deviceNumbers.length > 0) {
        const { data } = await (supabase as any)
          .from("profiles")
          .select("id, user_id, name, username, avatar_url, phone")
          .not("phone", "is", null);
        const matched = (data || []).filter((p: any) => {
          const digits = (p.phone || "").replace(/\D/g, "");
          if (!digits || p.user_id === user?.id) return false;
          return deviceNumbers.some((cn: string) => digits.endsWith(cn.slice(-9)) || cn.endsWith(digits.slice(-9)));
        });
        setContactsMatched(matched);
      }
    } catch {
      // user cancelled the picker, or it's unavailable at runtime - no-op
    }
    setCheckingContacts(false);
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
            className="w-full text-foreground rounded-full pl-10 pr-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
            style={{ backgroundColor: CARD_BG }}
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
              const isPending = sentIds.has(p.user_id) || pendingIn.some((f) => f.other.user_id === p.user_id);
              return (
                <div key={p.user_id} className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ backgroundColor: CARD_BG }}>
                  <Avatar p={p} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{p.name}</p>
                    {p.username && <p className="text-xs text-muted-foreground">@{p.username}</p>}
                    <MutualLabel count={mutualCounts.get(p.user_id) || 0} />
                  </div>
                  {isFriend ? (
                    <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: "rgba(37,99,235,0.15)", color: COVO_BLUE }}>
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
                      style={{ background: COVO_BLUE, color: "#ffffff", border: "none" }}
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

        {/* Friend requests */}
        {!showSearch && (
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
              Friend Requests{pendingIn.length > 0 ? ` · ${pendingIn.length}` : ""}
            </p>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>
            ) : pendingIn.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No pending requests</p>
            ) : (
              pendingIn.map((f) => (
                <div key={f.id} className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ backgroundColor: CARD_BG }}>
                  <Avatar p={f.other} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{f.other.name}</p>
                    {f.other.username && <p className="text-xs text-muted-foreground">@{f.other.username}</p>}
                    <MutualLabel count={mutualCounts.get(f.other.user_id) || 0} />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => accept(f.id)}
                      className="w-9 h-9 rounded-full flex items-center justify-center"
                      style={{ background: COVO_BLUE, border: "none" }}
                    >
                      <Check className="w-4 h-4" style={{ color: "#ffffff" }} />
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
              ))
            )}
          </div>
        )}

        {/* People you may know */}
        {!showSearch && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">People You May Know</p>
              {contactsSupported && (
                <button
                  type="button"
                  onClick={findFromContacts}
                  disabled={checkingContacts}
                  className="flex items-center gap-1 text-xs font-semibold disabled:opacity-50"
                  style={{ color: COVO_BLUE, background: "none", border: "none" }}
                >
                  <Contact className="w-3.5 h-3.5" />
                  {checkingContacts ? "Checking..." : "Find from contacts"}
                </button>
              )}
            </div>
            {!loading && suggestions.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">No suggestions right now</p>
            )}
            {suggestions.map((s) => (
              <div key={s.profile.user_id} className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ backgroundColor: CARD_BG }}>
                <Avatar p={s.profile} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">{s.profile.name}</p>
                  {s.profile.username && <p className="text-xs text-muted-foreground">@{s.profile.username}</p>}
                  <div className="flex items-center gap-2 mt-0.5">
                    <MutualLabel count={s.mutualCount} />
                    {s.inContacts && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(37,99,235,0.15)", color: COVO_BLUE }}>
                        In your contacts
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => sendRequest(s.profile.user_id)}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full shrink-0"
                  style={{ background: COVO_BLUE, color: "#ffffff", border: "none" }}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Friends;
