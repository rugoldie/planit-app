import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, UserPlus, Check, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { createNotification } from "@/lib/notifications";
import { toast } from "sonner";

const COVO_BLUE = "#2563eb";
const CARD_BG = "#1a1a1a";

type PublicProfile = {
  user_id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
};

type FriendStatus = "none" | "pending_out" | "pending_in" | "friends";

const UserProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [status, setStatus] = useState<FriendStatus>("none");
  const [mutualCount, setMutualCount] = useState(0);
  const [acting, setActing] = useState(false);

  // Viewing your own profile goes to the editable /profile screen instead.
  useEffect(() => {
    if (user && userId && user.id === userId) {
      navigate("/profile", { replace: true });
    }
  }, [user, userId, navigate]);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setNotFound(false);
    supabase
      .from("profiles_public")
      .select("user_id, name, username, avatar_url")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) setNotFound(true);
        setProfile(data as PublicProfile | null);
        setLoading(false);
      });
  }, [userId]);

  const loadFriendship = useCallback(async () => {
    if (!user || !userId || user.id === userId) return;
    const { data } = await (supabase as any)
      .from("friendships")
      .select("*")
      .or(`and(requester_id.eq.${user.id},recipient_id.eq.${userId}),and(requester_id.eq.${userId},recipient_id.eq.${user.id})`)
      .maybeSingle();
    if (!data) {
      setStatus("none");
      setFriendshipId(null);
      return;
    }
    setFriendshipId(data.id);
    if (data.status === "accepted") setStatus("friends");
    else if (data.requester_id === user.id) setStatus("pending_out");
    else setStatus("pending_in");
  }, [user, userId]);

  useEffect(() => { loadFriendship(); }, [loadFriendship]);

  // Realtime: pick up accept/decline from the other side instantly.
  useEffect(() => {
    if (!user || !userId) return;
    const channel = supabase
      .channel(`user-profile-friendship-${user.id}-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships", filter: `requester_id=eq.${user.id}` }, loadFriendship)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships", filter: `recipient_id=eq.${user.id}` }, loadFriendship)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, userId, loadFriendship]);

  // Mutual friend count
  useEffect(() => {
    if (!user || !userId || user.id === userId) return;
    (async () => {
      const { data: mine } = await (supabase as any)
        .from("friendships")
        .select("requester_id, recipient_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`);
      const myIds = new Set((mine || []).map((f: any) => (f.requester_id === user.id ? f.recipient_id : f.requester_id)));
      if (myIds.size === 0) { setMutualCount(0); return; }
      const { data: theirs } = await (supabase as any)
        .from("friendships")
        .select("requester_id, recipient_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`);
      let count = 0;
      (theirs || []).forEach((f: any) => {
        const other = f.requester_id === userId ? f.recipient_id : f.requester_id;
        if (myIds.has(other)) count++;
      });
      setMutualCount(count);
    })();
  }, [user, userId]);

  const sendRequest = async () => {
    if (!user || !userId) return;
    setActing(true);
    const { data: inserted, error } = await (supabase as any)
      .from("friendships")
      .insert({ requester_id: user.id, recipient_id: userId, status: "pending" })
      .select()
      .single();
    if (error) {
      toast.error(`Couldn't send request: ${error.message}`);
      setActing(false);
      return;
    }
    setStatus("pending_out");
    setFriendshipId(inserted?.id ?? null);
    try {
      const { data: myProfile } = await supabase.from("profiles").select("name").eq("user_id", user.id).single();
      await createNotification(
        userId,
        "friend_request",
        "New friend request",
        `${myProfile?.name || "Someone"} sent you a friend request`,
        { requester_id: user.id, friendship_id: inserted?.id }
      );
    } catch {}
    setActing(false);
  };

  const accept = async () => {
    if (!friendshipId) return;
    setActing(true);
    const { error } = await (supabase as any).from("friendships").update({ status: "accepted" }).eq("id", friendshipId).select();
    if (error) { toast.error(`Couldn't accept request: ${error.message}`); setActing(false); return; }
    setStatus("friends");
    setActing(false);
  };

  const decline = async () => {
    if (!friendshipId) return;
    setActing(true);
    const { error } = await (supabase as any).from("friendships").delete().eq("id", friendshipId).select();
    if (error) { toast.error(`Couldn't decline request: ${error.message}`); setActing(false); return; }
    setStatus("none");
    setFriendshipId(null);
    setActing(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <div className="flex items-center gap-3 px-5 pt-10 pb-4">
          <button type="button" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6 text-muted-foreground" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground text-center py-12">Loading...</p>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <div className="flex items-center gap-3 px-5 pt-10 pb-4">
          <button type="button" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-6 h-6 text-muted-foreground" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground text-center py-12">User not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex items-center gap-3 px-5 pt-10 pb-4">
        <button type="button" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6 text-muted-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Profile</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        <div className="flex flex-col items-center text-center pt-4 pb-6">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-secondary flex items-center justify-center mb-4">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="font-bold text-foreground text-3xl">{(profile.name || "?").charAt(0).toUpperCase()}</span>
            )}
          </div>
          <p className="text-xl font-bold text-foreground">{profile.name || "Guest"}</p>
          {profile.username && <p className="text-sm text-muted-foreground">@{profile.username}</p>}
          {mutualCount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">{mutualCount} mutual friend{mutualCount === 1 ? "" : "s"}</p>
          )}

          <div className="mt-5 w-full max-w-xs">
            {status === "friends" ? (
              <div className="flex items-center justify-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-full" style={{ backgroundColor: "rgba(37,99,235,0.15)", color: COVO_BLUE }}>
                <Check className="w-4 h-4" /> Friends
              </div>
            ) : status === "pending_out" ? (
              <div className="flex items-center justify-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-full bg-secondary text-muted-foreground">
                <Clock className="w-4 h-4" /> Requested
              </div>
            ) : status === "pending_in" ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={acting}
                  onClick={accept}
                  className="flex-1 flex items-center justify-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-full disabled:opacity-50"
                  style={{ background: COVO_BLUE, color: "#ffffff", border: "none" }}
                >
                  <Check className="w-4 h-4" /> Accept
                </button>
                <button
                  type="button"
                  disabled={acting}
                  onClick={decline}
                  className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-full bg-secondary border border-border text-muted-foreground disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={acting}
                onClick={sendRequest}
                className="w-full flex items-center justify-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-full disabled:opacity-50"
                style={{ background: COVO_BLUE, color: "#ffffff", border: "none" }}
              >
                <UserPlus className="w-4 h-4" /> Add friend
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
