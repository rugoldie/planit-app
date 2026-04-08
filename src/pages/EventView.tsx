import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const EventView = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6">
        <p className="text-foreground font-bold text-xl">Event not found</p>
        <button onClick={() => navigate("/home")} className="mt-4 text-muted-foreground underline text-sm font-semibold">
          Go home
        </button>
      </div>
    );
  }

  const textClass = event.text_size === "Small" ? "text-base" : event.text_size === "Large" ? "text-4xl" : "text-2xl";
  const hasBgImage = event.bg_photo && (event.bg_photo.startsWith("blob:") || event.bg_photo.startsWith("linear-gradient") || event.bg_photo.startsWith("http"));
  const bgStyle: React.CSSProperties = hasBgImage && !event.bg_photo.startsWith("linear-gradient")
    ? { backgroundImage: `url(${event.bg_photo})`, backgroundSize: "cover", backgroundPosition: "center" }
    : hasBgImage
      ? { background: event.bg_photo }
      : { backgroundColor: `hsl(${event.bg_color})` };

  const bubbleBg = event.bubble_color ? `hsl(${event.bubble_color})` : undefined;
  const bubbleText = event.bubble_text_color ? `hsl(${event.bubble_text_color})` : undefined;

  return (
    <div className="flex flex-col min-h-screen px-5 py-6" style={bgStyle}>
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate(-1)} className="self-start">
          <ArrowLeft className="w-6 h-6 text-muted-foreground" />
        </button>
        <button
          onClick={() => navigate(`/host?edit=${code}`)}
          className="px-4 py-1.5 rounded-full text-xs font-bold"
          style={{ backgroundColor: "hsl(0 0% 22%)", color: "hsl(82 100% 48%)" }}
        >
          Edit
        </button>
      </div>

      <div className="bg-card/90 rounded-[var(--radius)] p-6 mb-4 backdrop-blur-sm border border-border">
        <h1 className={`font-extrabold text-card-foreground ${textClass}`}>{event.title || "Untitled Event"}</h1>
        {event.vibe && <p className="text-muted-foreground mt-2 text-sm">{event.vibe}</p>}
      </div>

      {(event.location || event.date_time || event.dress_code || event.extra) && (
        <div className="flex flex-col gap-3">
          {event.location && (
            <div className="rounded-[var(--radius)] p-4 backdrop-blur-sm flex items-center gap-3 border border-border" style={{ backgroundColor: bubbleBg }}>
              <span className="text-xl">📍</span>
              <span className="text-sm font-semibold" style={{ color: bubbleText }}>{event.location}</span>
            </div>
          )}
          {event.date_time && (
            <div className="rounded-[var(--radius)] p-4 backdrop-blur-sm flex items-center gap-3 border border-border" style={{ backgroundColor: bubbleBg }}>
              <span className="text-xl">📅</span>
              <span className="text-sm font-semibold" style={{ color: bubbleText }}>
                {new Date(event.date_time).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              </span>
            </div>
          )}
          {event.dress_code && (
            <div className="rounded-[var(--radius)] p-4 backdrop-blur-sm flex items-center gap-3 border border-border" style={{ backgroundColor: bubbleBg }}>
              <span className="text-xl">👗</span>
              <span className="text-sm font-semibold" style={{ color: bubbleText }}>{event.dress_code}</span>
            </div>
          )}
          {event.extra && (
            <div className="rounded-[var(--radius)] p-4 backdrop-blur-sm flex items-center gap-3 border border-border" style={{ backgroundColor: bubbleBg }}>
              <span className="text-xl">➕</span>
              <span className="text-sm font-semibold" style={{ color: bubbleText }}>{event.extra}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EventView;
