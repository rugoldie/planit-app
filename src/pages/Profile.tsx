import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, ChevronLeft, ChevronRight, X, User, Users, Bell, LogOut, ChevronRight as ChevRight, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["S","M","T","W","T","F","S"];
const ACCENT = "#C6F24E";
const COVO_GRAD = "linear-gradient(120deg, #3D7BFF, #22D3EE)";
const COVO_CYAN = "#22D3EE";

type EventEntry = { name: string; date: string; code: string; role: "Host" | "Going" | "Maybe" | "Not going" };

const Profile = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();

  // Calendar state
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Events
  const [allEvents, setAllEvents] = useState<EventEntry[]>([]);

  // Stats
  const [friendsCount, setFriendsCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  // Edit sheet
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editAvatar, setEditAvatar] = useState<string | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<"idle"|"checking"|"available"|"taken">("idle");
  const [savingEdit, setSavingEdit] = useState(false);
  const editPhotoRef = useRef<HTMLInputElement>(null);
  const profilePhotoRef = useRef<HTMLInputElement>(null);

  // Fetch events
  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: hosted } = await supabase.from("events").select("title, date_time, code").eq("host_id", user.id);
      const { data: guestEntries } = await supabase.from("event_guests").select("event_id, rsvp_status, events(title, date_time, code)").eq("user_id", user.id);
      const events: EventEntry[] = [];
      (hosted || []).forEach((e: any) => events.push({ name: e.title || "Untitled", date: e.date_time || "", code: e.code, role: "Host" }));
      (guestEntries || []).forEach((g: any) => {
        const ev = g.events;
        if (ev && !events.find(e => e.code === ev.code)) {
          const r = g.rsvp_status;
          events.push({ name: ev.title || "Untitled", date: ev.date_time || "", code: ev.code, role: r === "yes" ? "Going" : r === "maybe" ? "Maybe" : "Not going" });
        }
      });
      setAllEvents(events);
    };
    fetch();
  }, [user]);

  // Fetch friends count
  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: accepted } = await (supabase as any).from("friendships").select("id").or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`).eq("status", "accepted");
      const { data: pending } = await (supabase as any).from("friendships").select("id").eq("recipient_id", user.id).eq("status", "pending");
      setFriendsCount((accepted || []).length);
      setPendingCount((pending || []).length);
    };
    fetch();
  }, [user]);

  const [eventsTab, setEventsTab] = useState<"upcoming" | "past">("upcoming");

  const hostedCount = allEvents.filter(e => e.role === "Host").length;
  const joinedCount = allEvents.filter(e => e.role !== "Host").length;
  const now = new Date();

  const upcoming = allEvents
    .filter(e => !e.date || new Date(e.date) >= now)
    .sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
  const past = allEvents
    .filter(e => !!e.date && new Date(e.date) < now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  const eventDatesInMonth = useMemo(() => {
    const map: Record<number, Array<{ name: string; code: string; role: EventEntry["role"] }>> = {};
    allEvents.filter(ev => ev.role !== "Not going").forEach(ev => {
      if (!ev.date) return;
      const d = new Date(ev.date);
      if (d.getMonth() === calMonth && d.getFullYear() === calYear) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push({ name: ev.name, code: ev.code, role: ev.role });
      }
    });
    return map;
  }, [allEvents, calMonth, calYear]);

  const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1); } else setCalMonth(m => m-1); };
  const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1); } else setCalMonth(m => m+1); };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  // Hero photo upload (direct from hero avatar)
  const handleHeroPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("user_id", user.id);
      await refreshProfile();
    } else {
      // fallback: store as data URL
      const reader = new FileReader();
      reader.onload = async () => {
        const result = reader.result as string;
        await supabase.from("profiles").update({ avatar_url: result }).eq("user_id", user.id);
        await refreshProfile();
      };
      reader.readAsDataURL(file);
    }
  };

  // Open edit sheet
  const openEdit = () => {
    setEditName(profile?.name || "");
    setEditUsername((profile as any)?.username || "");
    setEditAvatar(profile?.avatar_url || null);
    setEditAvatarPreview(profile?.avatar_url || null);
    setUsernameStatus("idle");
    setEditing(true);
  };

  // Username availability check
  useEffect(() => {
    if (!editing) return;
    const current = (profile as any)?.username || "";
    if (!editUsername || editUsername.length < 3 || editUsername === current) { setUsernameStatus("idle"); return; }
    setUsernameStatus("checking");
    const t = setTimeout(async () => {
      const { data } = await supabase.from("profiles").select("id").eq("username" as any, editUsername).maybeSingle();
      setUsernameStatus(data ? "taken" : "available");
    }, 400);
    return () => clearTimeout(t);
  }, [editUsername, editing, profile]);

  // Edit photo change
  const handleEditPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setEditAvatarPreview(URL.createObjectURL(file));
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setEditAvatar(data.publicUrl);
    } else {
      const reader = new FileReader();
      reader.onload = () => setEditAvatar(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const saveEdit = async () => {
    if (!user) return;
    setSavingEdit(true);
    const update: any = { name: editName.trim() };
    if (editUsername && usernameStatus !== "taken") update.username = editUsername;
    if (editAvatar) update.avatar_url = editAvatar;
    const { error } = await supabase.from("profiles").update(update).eq("user_id", user.id);
    if (error) { toast.error(`Save failed: ${error.message}`); setSavingEdit(false); return; }
    await refreshProfile();
    setSavingEdit(false);
    setEditing(false);
  };

  const avatarUrl = profile?.avatar_url || null;
  const displayName = profile?.name || "User";
  const username = (profile as any)?.username;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-10 pb-4">
        <button type="button" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-6 h-6 text-muted-foreground" />
        </button>
        <h1 className="text-lg font-bold" style={{ background: COVO_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Profile</h1>
        <button type="button" onClick={openEdit} className="text-sm font-semibold" style={{ color: COVO_CYAN }}>
          Edit
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        {/* Hero section */}
        <div className="mx-4 mb-4 rounded-2xl overflow-hidden" style={{ backgroundColor: "#141519" }}>
          <div className="flex flex-col items-center pt-8 pb-6 px-6">
            {/* Avatar with gradient ring + camera badge */}
            <div className="relative mb-4" style={{ width: 96, height: 96 }}>
              {/* Gradient ring */}
              <div style={{ position: "absolute", inset: -3, borderRadius: "50%", background: COVO_GRAD }} />
              {/* Avatar */}
              <div className="absolute inset-0 rounded-full overflow-hidden" style={{ background: "#1c1f26" }}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-3xl font-bold text-white">{displayName.charAt(0).toUpperCase()}</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => profilePhotoRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: ACCENT, border: "2px solid #141519" }}
              >
                <Camera className="w-4 h-4" style={{ color: "#0d0e11" }} />
              </button>
              <input ref={profilePhotoRef} type="file" accept="image/*" className="hidden" onChange={handleHeroPhotoChange} />
            </div>

            <h2 className="text-xl font-bold text-white mb-0.5">{displayName}</h2>
            {username && <p className="text-sm mb-4" style={{ color: "#8a9098", fontFamily: "'Space Grotesk', sans-serif" }}>@{username}</p>}
            {!username && <div className="mb-4" />}

            {/* Stat pills */}
            <div className="flex gap-2 w-full justify-center">
              {[
                { value: hostedCount, label: "Hosted" },
                { value: joinedCount, label: "Joined" },
                { value: friendsCount, label: "Friends" },
              ].map(({ value, label }) => (
                <div key={label} className="flex-1 rounded-xl py-2.5 text-center" style={{ backgroundColor: "#1c1f26" }}>
                  <p className="text-lg font-extrabold text-white">{value}</p>
                  <p className="text-xs" style={{ color: "#8a9098" }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="mx-4 mb-4 bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth}><ChevronLeft className="w-5 h-5" style={{ color: "#6a7078" }} /></button>
            <span className="font-semibold text-sm" style={{ background: COVO_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{MONTHS[calMonth]} {calYear}</span>
            <button type="button" onClick={nextMonth}><ChevronRight className="w-5 h-5" style={{ color: "#6a7078" }} /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-2">
            {DAYS.map((d, i) => <div key={i}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const hasEvent = !!eventDatesInMonth[day];
              const isToday = day === now.getDate() && calMonth === now.getMonth() && calYear === now.getFullYear();
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => hasEvent ? setSelectedDate(selectedDate === `${day}` ? null : `${day}`) : undefined}
                  className={`relative py-1.5 text-sm rounded-lg ${hasEvent ? "cursor-pointer" : "cursor-default"}`}
                  style={{ color: isToday ? "#fff" : "#8FE3F5", fontWeight: isToday ? 800 : 600 }}
                >
                  {day}
                  {hasEvent && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ACCENT }} />}
                  {selectedDate === `${day}` && hasEvent && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-card border border-border rounded-xl z-10 shadow-lg overflow-hidden" style={{ minWidth: "140px", maxWidth: "200px" }}>
                      {eventDatesInMonth[day].map((ev, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); navigate(ev.role === "Host" ? `/event/${ev.code}` : `/guest/${ev.code}`); }}
                          className="w-full text-left px-3 py-2 text-xs text-foreground border-b border-border last:border-0 truncate block"
                        >
                          {ev.name}
                        </button>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Events — tabbed Upcoming / Past */}
        {(upcoming.length > 0 || past.length > 0) && (() => {
          const list = eventsTab === "upcoming" ? upcoming : past;
          const rows = list.slice(0, 3);
          const applyFade = rows.length >= 3;
          return (
            <div className="mx-4 mb-4">
              {/* Pill toggles */}
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setEventsTab("upcoming")}
                  className="flex-1 py-2.5 rounded-full text-sm font-semibold transition-colors"
                  style={eventsTab === "upcoming"
                    ? { background: COVO_GRAD, color: "#06121f", border: "none" }
                    : { background: "#141519", color: "#8a9098", border: "none" }}
                >
                  Upcoming
                </button>
                <button
                  type="button"
                  onClick={() => setEventsTab("past")}
                  className="flex-1 py-2.5 rounded-full text-sm font-semibold transition-colors"
                  style={eventsTab === "past"
                    ? { background: COVO_GRAD, color: "#06121f", border: "none" }
                    : { background: "#141519", color: "#8a9098", border: "none" }}
                >
                  Past
                </button>
              </div>

              {rows.length === 0 ? (
                <p className="text-sm text-center py-6" style={{ color: "#555" }}>
                  No {eventsTab} events
                </p>
              ) : (
                <>
                  <div
                    className="bg-card rounded-2xl border border-border overflow-hidden"
                    style={applyFade ? {
                      maskImage: "linear-gradient(to bottom, black 0%, black 55%, transparent 95%)",
                      WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 55%, transparent 95%)",
                    } : {}}
                  >
                    {rows.map((ev, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => navigate(ev.role === "Host" ? `/event/${ev.code}` : `/guest/${ev.code}`)}
                        className="w-full flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: "#ffffff" }}>{ev.name}</p>
                          <p className="text-xs mt-0.5" style={{ color: "#888888" }}>
                            {ev.date ? new Date(ev.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "No date"}
                          </p>
                        </div>
                        <span
                          className="text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0"
                          style={{ backgroundColor: ev.role === "Host" ? ACCENT : "#2a2a2a", color: ev.role === "Host" ? "#111" : "#888" }}
                        >
                          {ev.role}
                        </span>
                      </button>
                    ))}
                  </div>
                  {list.length > 0 && (
                    <button
                      type="button"
                      onClick={() => navigate(`/events?tab=${eventsTab}`)}
                      className="mt-2 px-1 text-xs font-medium"
                      style={{ color: "#666666" }}
                    >
                      See all →
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })()}

        {/* Menu */}
        <div className="mx-4 bg-card rounded-2xl border border-border overflow-hidden">
          {/* Edit profile */}
          <button
            type="button"
            onClick={openEdit}
            className="w-full flex items-center gap-3 px-4 py-4 border-b border-border"
          >
            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
            <span className="flex-1 text-left text-sm font-medium text-foreground">Edit profile</span>
            <ChevRight className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Friends */}
          <button
            type="button"
            onClick={() => navigate("/friends")}
            className="w-full flex items-center gap-3 px-4 py-4 border-b border-border"
          >
            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
              <Users className="w-4 h-4 text-muted-foreground" />
            </div>
            <span className="flex-1 text-left text-sm font-medium text-foreground">Friends</span>
            {pendingCount > 0 && (
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mr-1" style={{ backgroundColor: "#ef4444", color: "#fff" }}>
                {pendingCount}
              </span>
            )}
            <ChevRight className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Notifications */}
          <button
            type="button"
            className="w-full flex items-center gap-3 px-4 py-4 border-b border-border"
          >
            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
              <Bell className="w-4 h-4 text-muted-foreground" />
            </div>
            <span className="flex-1 text-left text-sm font-medium text-foreground">Notifications</span>
            <ChevRight className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Sign out */}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-4"
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(239,68,68,0.12)" }}>
              <LogOut className="w-4 h-4" style={{ color: "#ef4444" }} />
            </div>
            <span className="flex-1 text-left text-sm font-semibold" style={{ color: "#ef4444" }}>Sign out</span>
          </button>
        </div>
      </div>

      {/* Edit profile overlay */}
      {editing && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <div className="bg-background rounded-t-3xl px-5 pt-5 pb-10 flex flex-col gap-5" style={{ maxHeight: "85vh", overflowY: "auto" }}>
            {/* Sheet header */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Edit profile</h2>
              <button type="button" onClick={() => setEditing(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Photo */}
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => editPhotoRef.current?.click()}
                className="w-20 h-20 rounded-full overflow-hidden border-2 relative"
                style={{ borderColor: ACCENT }}
              >
                {editAvatarPreview ? (
                  <img src={editAvatarPreview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-secondary flex items-center justify-center">
                    <Camera className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              </button>
              <span className="text-xs text-muted-foreground">Tap to change photo</span>
              <input ref={editPhotoRef} type="file" accept="image/*" className="hidden" onChange={handleEditPhotoChange} />
            </div>

            {/* Name */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Full name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-card border border-border rounded-[var(--radius)] px-4 py-3 text-foreground text-sm outline-none"
                placeholder="Your name"
              />
            </div>

            {/* Username */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Username</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">@</span>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  className="w-full bg-card border border-border rounded-[var(--radius)] pl-8 pr-10 py-3 text-foreground text-sm outline-none transition-colors"
                  style={{ borderColor: usernameStatus === "available" ? ACCENT : usernameStatus === "taken" ? "#ef4444" : undefined }}
                  placeholder="username"
                  maxLength={30}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {usernameStatus === "checking" && <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "#333", borderTopColor: ACCENT }} />}
                  {usernameStatus === "available" && <Check className="w-4 h-4" style={{ color: ACCENT }} />}
                  {usernameStatus === "taken" && <X className="w-4 h-4 text-destructive" />}
                </div>
              </div>
              {usernameStatus === "taken" && <p className="text-xs text-destructive mt-1">Username already taken</p>}
            </div>

            {/* Save */}
            <button
              type="button"
              onClick={saveEdit}
              disabled={savingEdit || usernameStatus === "taken"}
              className="w-full py-4 rounded-[var(--radius)] text-base font-bold disabled:opacity-40"
              style={{ backgroundColor: ACCENT, color: "#111" }}
            >
              {savingEdit ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
