import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, X, Send, Plus } from "lucide-react";

type Message = { from: "guest" | "host"; text: string; time: string };
type Comment = { name: string; text: string; time: string };

const GuestEventView = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const events = JSON.parse(localStorage.getItem("planit_events") || "[]");
  const event = events.find((e: any) => e.code === code);

  const [rsvp, setRsvp] = useState<string | null>(null);
  const [barMinimised, setBarMinimised] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");

  // Comments
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentDraft, setCommentDraft] = useState("");

  // Gallery
  const [photos, setPhotos] = useState<string[]>([]);
  const photoInput = useRef<HTMLInputElement>(null);

  // Load saved RSVP & messages
  useEffect(() => {
    const saved = localStorage.getItem(`planit_rsvp_${code}`);
    if (saved) { setRsvp(saved); setBarMinimised(true); }
    const msgs = JSON.parse(localStorage.getItem(`planit_dm_${code}`) || "[]");
    setMessages(msgs);
    const savedComments = JSON.parse(localStorage.getItem(`planit_comments_${code}`) || "[]");
    setComments(savedComments);
    const savedPhotos = JSON.parse(localStorage.getItem(`planit_photos_${code}`) || "[]");
    setPhotos(savedPhotos);
  }, [code]);

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6">
        <p className="text-secondary-foreground font-bold text-xl">Event not found</p>
        <button onClick={() => navigate("/home")} className="mt-4 text-muted-foreground underline text-sm font-semibold">Go home</button>
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

  const bubbleBg = event.bubbleColor ? `hsl(${event.bubbleColor})` : undefined;
  const bubbleText = event.bubbleTextColor ? `hsl(${event.bubbleTextColor})` : undefined;

  const handleRsvp = (response: string) => {
    setRsvp(response);
    localStorage.setItem(`planit_rsvp_${code}`, response);
    setTimeout(() => setBarMinimised(true), 1500);
  };

  const sendMessage = () => {
    if (!draft.trim()) return;
    const msg: Message = { from: "guest", text: draft.trim(), time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    const updated = [...messages, msg];
    setMessages(updated);
    localStorage.setItem(`planit_dm_${code}`, JSON.stringify(updated));
    setDraft("");
  };

  const sendComment = () => {
    if (!commentDraft.trim()) return;
    const user = JSON.parse(localStorage.getItem("planit_user") || "{}");
    const c: Comment = { name: user.name || "Guest", text: commentDraft.trim(), time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    const updated = [...comments, c];
    setComments(updated);
    localStorage.setItem(`planit_comments_${code}`, JSON.stringify(updated));
    setCommentDraft("");
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const updated = [...photos, reader.result as string];
      setPhotos(updated);
      localStorage.setItem(`planit_photos_${code}`, JSON.stringify(updated));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const rsvpLabel = rsvp === "yes" ? "You're going! 🎉" : rsvp === "no" ? "You're not going 👎" : "You're a maybe 🤷";

  return (
    <div className="flex flex-col min-h-screen px-5 py-6 pb-28" style={bgStyle}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate("/home")}>
          <ArrowLeft className="w-6 h-6 text-muted-foreground" />
        </button>
        <button onClick={() => setShowChat(true)} className="w-9 h-9 rounded-full bg-secondary/80 flex items-center justify-center border border-border">
          <MessageCircle className="w-4 h-4 text-primary" />
        </button>
      </div>

      {/* Title card */}
      <div className="bg-card/90 rounded-[var(--radius)] p-6 mb-4 backdrop-blur-sm border border-border">
        <h1 className={`font-extrabold text-card-foreground ${textClass}`}>{event.title || "Untitled Event"}</h1>
        {event.vibe && <p className="text-muted-foreground mt-2 text-sm">{event.vibe}</p>}
      </div>

      {/* Detail bubbles */}
      {(event.location || event.dateTime || event.dressCode || event.extra) && (
        <div className="flex flex-col gap-2">
          {event.location && (
            <div className="rounded-[var(--radius)] p-4 backdrop-blur-sm flex items-center gap-3 border border-border" style={{ backgroundColor: bubbleBg }}>
              <span className="text-xl">📍</span>
              <span className="text-sm font-semibold" style={{ color: bubbleText }}>{event.location}</span>
            </div>
          )}
          {event.dateTime && (
            <div className="rounded-[var(--radius)] p-4 backdrop-blur-sm flex items-center gap-3 border border-border" style={{ backgroundColor: bubbleBg }}>
              <span className="text-xl">📅</span>
              <span className="text-sm font-semibold" style={{ color: bubbleText }}>
                {new Date(event.dateTime).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              </span>
            </div>
          )}
          {event.dressCode && (
            <div className="rounded-[var(--radius)] p-4 backdrop-blur-sm flex items-center gap-3 border border-border" style={{ backgroundColor: bubbleBg }}>
              <span className="text-xl">👗</span>
              <span className="text-sm font-semibold" style={{ color: bubbleText }}>{event.dressCode}</span>
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

      {/* Comments section */}
      <div className="mt-4 rounded-[var(--radius)] p-4 border border-border" style={{ backgroundColor: "#383838" }}>
        <h2 className="text-white font-bold text-sm mb-3">Comments</h2>
        <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
          {comments.length === 0 && (
            <p className="text-muted-foreground text-xs text-center py-3">No comments yet — be the first!</p>
          )}
          {comments.map((c, i) => (
            <div key={i} className="rounded-xl px-3 py-2" style={{ backgroundColor: "#2b2b2b" }}>
              <div className="flex items-center gap-2">
                <span className="text-primary text-xs font-bold">{c.name}</span>
                <span className="text-muted-foreground text-[10px]">{c.time}</span>
              </div>
              <p className="text-white text-sm mt-0.5">{c.text}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={commentDraft}
            onChange={(e) => setCommentDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendComment()}
            placeholder="Write a comment..."
            className="flex-1 rounded-full px-4 py-2 text-sm text-white placeholder:text-muted-foreground outline-none border border-border"
            style={{ backgroundColor: "#2b2b2b" }}
          />
          <button onClick={sendComment} className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0">
            <Send className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>
      </div>

      {/* Gallery section */}
      <div className="mt-4 rounded-[var(--radius)] p-4 border border-border" style={{ backgroundColor: "#383838" }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-bold text-sm">Gallery</h2>
          <button onClick={() => photoInput.current?.click()} className="text-xs font-bold bg-primary text-primary-foreground rounded-full px-3 py-1">
            Add photo
          </button>
          <input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
        </div>
        {photos.length === 0 ? (
          <p className="text-muted-foreground text-xs text-center py-4">No photos yet — add the first one!</p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {photos.map((src, i) => (
              <div key={i} className="aspect-square rounded-lg overflow-hidden">
                <img src={src} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RSVP floating bar */}
      <div className="fixed bottom-4 left-4 right-4 z-50">
        {barMinimised && rsvp ? (
          <button
            onClick={() => setBarMinimised(false)}
            className="mx-auto block bg-secondary/95 backdrop-blur-sm rounded-full px-5 py-2.5 text-sm font-bold text-primary border border-border"
          >
            {rsvpLabel}
          </button>
        ) : (
          <div className="bg-secondary/95 backdrop-blur-sm rounded-[var(--radius)] p-4 border border-border">
            <p className="text-muted-foreground text-xs font-semibold text-center mb-3">Are you going?</p>
            {rsvp ? (
              <p className="text-primary font-bold text-center text-sm">{rsvpLabel}</p>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => handleRsvp("yes")} className="flex-1 bg-primary text-primary-foreground rounded-full py-2.5 text-sm font-bold">Yes 🙌</button>
                <button onClick={() => handleRsvp("no")} className="flex-1 bg-muted text-secondary-foreground rounded-full py-2.5 text-sm font-bold border border-border">No 👎</button>
                <button onClick={() => handleRsvp("maybe")} className="flex-1 bg-muted text-secondary-foreground rounded-full py-2.5 text-sm font-bold border border-border">Maybe 🤷</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* DM overlay */}
      {showChat && (
        <div className="fixed inset-0 z-[60] bg-background flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-secondary-foreground font-bold text-base">Message the host</h2>
            <button onClick={() => setShowChat(false)}>
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-muted-foreground text-sm text-center mt-10">Send a private message to the host — e.g. dietary needs, questions, or a heads up.</p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === "guest" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${m.from === "guest" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground border border-border"}`}>
                  <p className="text-sm">{m.text}</p>
                  <p className="text-[10px] opacity-50 mt-0.5">{m.time}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 py-3 border-t border-border flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 bg-secondary rounded-full px-4 py-2.5 text-sm text-secondary-foreground placeholder:text-muted-foreground outline-none border border-border"
            />
            <button onClick={sendMessage} className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <Send className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuestEventView;
