import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const EventView = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const events = JSON.parse(localStorage.getItem("planit_events") || "[]");
  const event = events.find((e: any) => e.code === code);

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

  const textClass = event.textSize === "Small" ? "text-base" : event.textSize === "Large" ? "text-4xl" : "text-2xl";
  const hasBgImage = event.bgPhoto && (event.bgPhoto.startsWith("blob:") || event.bgPhoto.startsWith("linear-gradient"));
  const bgStyle: React.CSSProperties = hasBgImage && !event.bgPhoto.startsWith("linear-gradient")
    ? { backgroundImage: `url(${event.bgPhoto})`, backgroundSize: "cover", backgroundPosition: "center" }
    : hasBgImage
      ? { background: event.bgPhoto }
      : { backgroundColor: `hsl(${event.bgColor})` };

  return (
    <div className="flex flex-col min-h-screen px-5 py-6" style={bgStyle}>
      <button onClick={() => navigate(-1)} className="self-start mb-6">
        <ArrowLeft className="w-6 h-6 text-muted-foreground" />
      </button>

      <div className="bg-card/90 rounded-[var(--radius)] p-6 mb-4 backdrop-blur-sm border border-border">
        <h1 className={`font-extrabold text-card-foreground ${textClass}`}>{event.title || "Untitled Event"}</h1>
        {event.vibe && <p className="text-muted-foreground mt-2 text-sm">{event.vibe}</p>}
      </div>

      {(event.location || event.dateTime || event.dressCode || event.extra) && (
        <div className="flex flex-col gap-3">
          {event.location && (
            <div className="bg-card/90 rounded-[var(--radius)] p-4 backdrop-blur-sm flex items-center gap-3 border border-border">
              <span className="text-xl">📍</span>
              <span className="text-card-foreground text-sm font-semibold">{event.location}</span>
            </div>
          )}
          {event.dateTime && (
            <div className="bg-card/90 rounded-[var(--radius)] p-4 backdrop-blur-sm flex items-center gap-3 border border-border">
              <span className="text-xl">📅</span>
              <span className="text-card-foreground text-sm font-semibold">
                {new Date(event.dateTime).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              </span>
            </div>
          )}
          {event.dressCode && (
            <div className="bg-card/90 rounded-[var(--radius)] p-4 backdrop-blur-sm flex items-center gap-3 border border-border">
              <span className="text-xl">👗</span>
              <span className="text-card-foreground text-sm font-semibold">{event.dressCode}</span>
            </div>
          )}
          {event.extra && (
            <div className="bg-card/90 rounded-[var(--radius)] p-4 backdrop-blur-sm flex items-center gap-3 border border-border">
              <span className="text-xl">➕</span>
              <span className="text-card-foreground text-sm font-semibold">{event.extra}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EventView;
