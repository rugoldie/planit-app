import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const Profile = () => {
  const navigate = useNavigate();
  const raw = localStorage.getItem("planit_user");
  const user = raw ? JSON.parse(raw) : { name: "User", events: [] };
  const [profilePhoto, setProfilePhoto] = useState<string | null>(
    localStorage.getItem("planit_profile_photo")
  );
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Gather all events from localStorage
  const allEvents = useMemo(() => {
    const events: { name: string; date: string; code: string; role: "Host" | "Guest" }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("planit_event_")) {
        try {
          const ev = JSON.parse(localStorage.getItem(key)!);
          const code = key.replace("planit_event_", "");
          events.push({ name: ev.name || "Untitled", date: ev.date || "", code, role: "Host" });
        } catch {}
      }
    }
    // Also add events from user profile
    if (user.events) {
      user.events.forEach((e: any) => {
        if (!events.find(ev => ev.name === e.name && ev.date === e.date)) {
          events.push({ name: e.name, date: e.date, code: "", role: "Guest" });
        }
      });
    }
    return events;
  }, []);

  const hostedCount = allEvents.filter(e => e.role === "Host").length;
  const joinedCount = allEvents.filter(e => e.role === "Guest").length;

  const now = new Date();
  const upcoming = allEvents.filter(e => !e.date || new Date(e.date) >= now);
  const past = allEvents.filter(e => e.date && new Date(e.date) < now);
  const displayedEvents = tab === "upcoming" ? upcoming : past;

  // Calendar helpers
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  const eventDatesInMonth = useMemo(() => {
    const map: Record<number, string[]> = {};
    allEvents.forEach(ev => {
      if (!ev.date) return;
      const d = new Date(ev.date);
      if (d.getMonth() === calMonth && d.getFullYear() === calYear) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(ev.name);
      }
    });
    return map;
  }, [allEvents, calMonth, calYear]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setProfilePhoto(result);
      localStorage.setItem("planit_profile_photo", result);
    };
    reader.readAsDataURL(file);
  };

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background px-5 py-6 overflow-y-auto">
      {/* Back arrow */}
      <button onClick={() => navigate("/home")} className="self-start mb-4">
        <ArrowLeft className="w-7 h-7 text-muted-foreground" />
      </button>

      {/* Profile photo */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative">
          <div className="w-28 h-28 rounded-full bg-card border-2 border-border overflow-hidden flex items-center justify-center">
            {profilePhoto ? (
              <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-bold text-muted-foreground">
                {user.name?.charAt(0)?.toUpperCase() || "U"}
              </span>
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute bottom-0 right-0 w-9 h-9 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "hsl(82 80% 60%)" }}
          >
            <Camera className="w-4 h-4" style={{ color: "hsl(0 0% 7%)" }} />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
        </div>

        <h1 className="text-2xl font-bold text-secondary-foreground mt-4">{user.name}</h1>

        {/* Counters */}
        <div className="flex gap-3 mt-3">
          <div className="bg-card rounded-full px-4 py-2 flex items-center gap-2 border border-border">
            <span className="text-primary font-bold">{hostedCount}</span>
            <span className="text-muted-foreground text-sm">Events Hosted</span>
          </div>
          <div className="bg-card rounded-full px-4 py-2 flex items-center gap-2 border border-border">
            <span className="text-primary font-bold">{joinedCount}</span>
            <span className="text-muted-foreground text-sm">Events Joined</span>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-card rounded-[var(--radius)] border border-border p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth}><ChevronLeft className="w-5 h-5 text-muted-foreground" /></button>
          <span className="text-secondary-foreground font-semibold text-sm">{MONTHS[calMonth]} {calYear}</span>
          <button onClick={nextMonth}><ChevronRight className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-2">
          {DAYS.map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1 text-center relative">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const hasEvent = !!eventDatesInMonth[day];
            const isToday = day === now.getDate() && calMonth === now.getMonth() && calYear === now.getFullYear();
            return (
              <button
                key={day}
                onClick={() => hasEvent ? setSelectedDate(selectedDate === `${day}` ? null : `${day}`) : null}
                className={`relative py-1.5 text-sm rounded-lg transition-colors ${
                  isToday ? "text-primary font-bold" : "text-secondary-foreground"
                } ${hasEvent ? "cursor-pointer hover:bg-muted" : "cursor-default"}`}
              >
                {day}
                {hasEvent && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                )}
                {selectedDate === `${day}` && hasEvent && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-muted border border-border rounded-lg px-3 py-1.5 text-xs text-secondary-foreground whitespace-nowrap z-10 shadow-lg">
                    {eventDatesInMonth[day].join(", ")}
                    <button onClick={(e) => { e.stopPropagation(); setSelectedDate(null); }} className="ml-1.5 text-muted-foreground">
                      <X className="w-3 h-3 inline" />
                    </button>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab("upcoming")}
          className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-colors ${
            tab === "upcoming"
              ? "bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground border border-border"
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setTab("past")}
          className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-colors ${
            tab === "past"
              ? "bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground border border-border"
          }`}
        >
          Past
        </button>
      </div>

      {/* Event list */}
      <div className="flex flex-col gap-3 flex-1 mb-6 overflow-y-auto">
        {displayedEvents.length > 0 ? displayedEvents.map((ev, i) => (
          <button
            key={i}
            onClick={() => ev.code ? navigate(`/event/${ev.code}`) : null}
            className="bg-card border border-border rounded-[var(--radius)] px-5 py-4 text-left flex items-center justify-between"
          >
            <div>
              <p className="font-bold text-secondary-foreground">{ev.name}</p>
              <p className="text-muted-foreground text-sm">{ev.date || "No date set"}</p>
            </div>
            <Badge className={`text-xs ${
              ev.role === "Host"
                ? "bg-primary text-primary-foreground border-transparent"
                : "bg-card text-muted-foreground border border-border"
            }`}>
              {ev.role}
            </Badge>
          </button>
        )) : (
          <div className="bg-card border border-border rounded-[var(--radius)] px-5 py-8 text-center text-muted-foreground">
            No {tab} events
          </div>
        )}
      </div>

      {/* Log out */}
      <button
        onClick={() => {
          localStorage.removeItem("planit_user");
          navigate("/");
        }}
        className="w-full bg-card border border-border rounded-[var(--radius)] py-4 text-lg font-bold text-primary mb-2"
      >
        Log out
      </button>
    </div>
  );
};

export default Profile;
