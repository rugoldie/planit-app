import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Upload, Copy, Share2 } from "lucide-react";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const PALETTE_COLORS = [
  { name: "Dark Grey", hsl: "0 0% 17%" },
  { name: "Lime Green", hsl: "82 100% 48%" },
  { name: "Black", hsl: "0 0% 10%" },
  { name: "White", hsl: "0 0% 100%" },
  { name: "Navy", hsl: "220 60% 20%" },
  { name: "Blush Pink", hsl: "340 80% 85%" },
  { name: "Purple", hsl: "270 60% 50%" },
  { name: "Burnt Orange", hsl: "25 90% 50%" },
  { name: "Sky Blue", hsl: "200 80% 65%" },
  { name: "Cream", hsl: "40 60% 90%" },
  { name: "Forest Green", hsl: "150 50% 30%" },
];

const BUBBLE_COLORS = [
  { name: "White", hsl: "0 0% 100%", text: "0 0% 10%" },
  { name: "Lime Green", hsl: "82 100% 48%", text: "0 0% 10%" },
  { name: "Dark Grey", hsl: "0 0% 22%", text: "0 0% 100%" },
  { name: "Black", hsl: "0 0% 5%", text: "0 0% 100%" },
  { name: "Blush Pink", hsl: "340 80% 85%", text: "0 0% 10%" },
  { name: "Sky Blue", hsl: "200 80% 65%", text: "0 0% 10%" },
];

const PRESET_BACKGROUNDS = [
  { name: "Moody Dark", gradient: "linear-gradient(135deg, hsl(240 10% 10%), hsl(260 20% 20%))" },
  { name: "Confetti", gradient: "linear-gradient(135deg, hsl(340 80% 70%), hsl(50 90% 70%), hsl(200 80% 70%))" },
  { name: "Floral", gradient: "linear-gradient(135deg, hsl(330 60% 80%), hsl(120 40% 75%))" },
  { name: "City Night", gradient: "linear-gradient(135deg, hsl(230 30% 15%), hsl(260 40% 30%))" },
  { name: "Marble", gradient: "linear-gradient(135deg, hsl(0 0% 95%), hsl(0 0% 80%), hsl(0 0% 90%))" },
  { name: "Gradient Sunset", gradient: "linear-gradient(135deg, hsl(20 90% 60%), hsl(340 80% 55%), hsl(270 60% 50%))" },
];

const TEXT_SIZES = ["Small", "Medium", "Large"] as const;

const generateCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

const HostEvent = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const editCode = searchParams.get("edit");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [vibe, setVibe] = useState("");
  const [location, setLocation] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [dressCode, setDressCode] = useState("");
  const [extra, setExtra] = useState("");
  const [bgColor, setBgColor] = useState("0 0% 17%");
  const [bgPhoto, setBgPhoto] = useState<string | null>(null);
  const [bgPreset, setBgPreset] = useState<string | null>(null);
  const [textSize, setTextSize] = useState<typeof TEXT_SIZES[number]>("Medium");
  const [bubbleColor, setBubbleColor] = useState(BUBBLE_COLORS[1].hsl);
  const [bubbleTextColor, setBubbleTextColor] = useState(BUBBLE_COLORS[1].text);
  const [showCode, setShowCode] = useState(false);
  const [eventCode, setEventCode] = useState("");
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);

  // Load event data if editing
  useEffect(() => {
    if (editCode) {
      supabase
        .from("events")
        .select("*")
        .eq("code", editCode)
        .single()
        .then(({ data }) => {
          if (data) {
            setTitle(data.title || "");
            setVibe(data.vibe || "");
            setLocation(data.location || "");
            setDateTime(data.date_time ? new Date(data.date_time).toISOString().slice(0, 16) : "");
            setDressCode(data.dress_code || "");
            setExtra(data.extra || "");
            setBgColor(data.bg_color || PALETTE_COLORS[0].hsl);
            setTextSize((data.text_size as typeof TEXT_SIZES[number]) || "Medium");
            setBubbleColor(data.bubble_color || BUBBLE_COLORS[1].hsl);
            setBubbleTextColor(data.bubble_text_color || BUBBLE_COLORS[1].text);
            setEventCode(editCode);
            setEventId(data.id);
            if (data.bg_photo?.startsWith("linear-gradient")) {
              setBgPreset(data.bg_photo);
            } else if (data.bg_photo) {
              setBgPhoto(data.bg_photo);
              setUploadedPhoto(data.bg_photo);
            }
          }
        });
    }
  }, [editCode]);

  const handleCreate = async () => {
    if (!user) return;
    const code = editCode || generateCode();
    const eventData = {
      host_id: user.id,
      code,
      title,
      vibe: vibe || null,
      location: location || null,
      date_time: dateTime ? new Date(dateTime).toISOString() : null,
      dress_code: dressCode || null,
      extra: extra || null,
      bg_color: bgColor,
      bg_photo: bgPhoto || bgPreset || null,
      text_size: textSize,
      bubble_color: bubbleColor,
      bubble_text_color: bubbleTextColor,
    };

    if (editCode && eventId) {
      await supabase.from("events").update(eventData).eq("id", eventId);
      navigate("/event/" + code);
    } else {
      const { error } = await supabase.from("events").insert(eventData);
      if (error) {
        // Code collision — try again
        if (error.code === "23505") {
          const newCode = generateCode();
          await supabase.from("events").insert({ ...eventData, code: newCode });
          setEventCode(newCode);
        }
      } else {
        setEventCode(code);
      }
      setShowCode(true);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setUploadedPhoto(url);
      setBgPhoto(url);
      setBgPreset(null);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(eventCode);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: "Join my event on Planit!", text: `Use code ${eventCode} to join!` });
    } else {
      handleCopy();
    }
  };

  const previewBgStyle: React.CSSProperties = bgPhoto
    ? { backgroundImage: `url(${bgPhoto})`, backgroundSize: "cover", backgroundPosition: "center" }
    : bgPreset
      ? { background: bgPreset }
      : { backgroundColor: `hsl(${bgColor})` };

  if (showCode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6">
        <div className="bg-card rounded-[var(--radius)] p-8 w-full max-w-sm text-center border border-border">
          <p className="text-muted-foreground text-sm font-semibold mb-2">Your event code</p>
          <p className="text-5xl font-extrabold text-primary tracking-widest mb-4">{eventCode}</p>
          <p className="text-muted-foreground text-sm">Share this code with your guests</p>
        </div>

        <div className="flex gap-4 mt-8 w-full max-w-sm">
          <button
            onClick={handleCopy}
            className="flex-1 bg-secondary text-secondary-foreground rounded-[var(--radius)] py-4 text-base font-bold flex items-center justify-center gap-2 border border-border"
          >
            <Copy className="w-4 h-4" /> Copy link
          </button>
          <button
            onClick={handleShare}
            className="flex-1 bg-primary text-primary-foreground rounded-[var(--radius)] py-4 text-base font-bold flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" /> Share
          </button>
        </div>

        <button
          onClick={() => navigate("/event/" + eventCode)}
          className="mt-6 text-foreground text-sm font-semibold underline underline-offset-4"
        >
          View my event
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen px-5 py-6 pb-10 transition-all duration-300" style={previewBgStyle}>
      <button onClick={() => navigate("/home")} className="self-start mb-4">
        <ArrowLeft className="w-6 h-6 text-muted-foreground" />
      </button>

      <div className="bg-card rounded-[var(--radius)] px-4 py-3 mb-2 border border-border">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Event name..."
          className={`w-full bg-transparent text-card-foreground placeholder:text-muted-foreground outline-none ${textSize === "Small" ? "text-lg font-bold" : textSize === "Large" ? "text-4xl font-extrabold" : "text-2xl font-extrabold"}`}
        />
      </div>

      <div className="bg-card rounded-[var(--radius)] px-4 py-3 mb-2 border border-border">
        <textarea
          value={vibe}
          onChange={(e) => setVibe(e.target.value)}
          placeholder="Set the vibe... e.g. sit down dinner, pub crawl, smart casual night out"
          rows={2}
          maxLength={120}
          className={`w-full bg-transparent text-card-foreground placeholder:text-muted-foreground outline-none resize-none ${textSize === "Small" ? "text-xs" : textSize === "Large" ? "text-base" : "text-sm"}`}
        />
      </div>

      <div
        className="px-4 py-3 mb-1.5 flex items-center gap-2.5"
        style={{ backgroundColor: `hsl(${bubbleColor})`, borderLeft: `3px solid ${isDarkBubble ? "#aaee44" : "#111"}`, borderRadius: "0 12px 12px 0", color: `hsl(${bubbleTextColor})` }}
      >
        <span className="text-lg" style={{ color: isDarkBubble ? "#aaee44" : "#111" }}>📍</span>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Where"
          className={`w-full bg-transparent outline-none placeholder:opacity-50 ${textSize === "Small" ? "text-xs font-medium" : textSize === "Large" ? "text-base font-bold" : "text-sm font-medium"}`}
          style={{ color: `hsl(${bubbleTextColor})` }}
        />
      </div>

      <div
        className="px-4 py-3 mb-1.5 flex items-center gap-2.5"
        style={{ backgroundColor: `hsl(${bubbleColor})`, borderLeft: `3px solid ${isDarkBubble ? "#aaee44" : "#111"}`, borderRadius: "0 12px 12px 0", color: `hsl(${bubbleTextColor})` }}
      >
        <span className="text-lg" style={{ color: isDarkBubble ? "#aaee44" : "#111" }}>📅</span>
        <input
          type="datetime-local"
          value={dateTime}
          onChange={(e) => setDateTime(e.target.value)}
          className={`w-full bg-transparent outline-none ${textSize === "Small" ? "text-xs font-medium" : textSize === "Large" ? "text-base font-bold" : "text-sm font-medium"}`}
          style={{ color: `hsl(${bubbleTextColor})` }}
        />
      </div>

      <div
        className="px-4 py-3 mb-1.5 flex items-center gap-2.5"
        style={{ backgroundColor: `hsl(${bubbleColor})`, borderLeft: `3px solid ${isDarkBubble ? "#aaee44" : "#111"}`, borderRadius: "0 12px 12px 0", color: `hsl(${bubbleTextColor})` }}
      >
        <span className="text-lg" style={{ color: isDarkBubble ? "#aaee44" : "#111" }}>🎭</span>
        <input
          type="text"
          value={dressCode}
          onChange={(e) => setDressCode(e.target.value)}
          placeholder="Theme / dress code"
          className={`w-full bg-transparent outline-none placeholder:opacity-50 ${textSize === "Small" ? "text-xs font-medium" : textSize === "Large" ? "text-base font-bold" : "text-sm font-medium"}`}
          style={{ color: `hsl(${bubbleTextColor})` }}
        />
      </div>

      <div
        className="px-4 py-3 mb-3 flex items-start gap-2.5"
        style={{ backgroundColor: `hsl(${bubbleColor})`, borderLeft: `3px solid ${isDarkBubble ? "#aaee44" : "#111"}`, borderRadius: "0 12px 12px 0", color: `hsl(${bubbleTextColor})` }}
      >
        <span className="text-lg mt-0.5" style={{ color: isDarkBubble ? "#aaee44" : "#111" }}>➕</span>
        <textarea
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          placeholder="Anything else..."
          rows={2}
          className={`w-full bg-transparent outline-none resize-none placeholder:opacity-50 ${textSize === "Small" ? "text-xs font-medium" : textSize === "Large" ? "text-base font-bold" : "text-sm font-medium"}`}
          style={{ color: `hsl(${bubbleTextColor})` }}
        />
      </div>

      <Drawer>
        <DrawerTrigger asChild>
          <button className="bg-secondary rounded-[var(--radius)] px-4 py-3.5 mb-6 w-full text-center text-sm font-bold text-primary border border-border">
            Make it yours ✦
          </button>
        </DrawerTrigger>
        <DrawerContent className="bg-card px-5 pb-8 pt-2 border-t border-border">
          <div className="mx-auto w-10 h-1 rounded-full bg-muted-foreground/30 mb-5" />

          <p className="text-card-foreground font-bold text-sm mb-2">Bubble colour</p>
          <div className="flex flex-wrap gap-2.5 mb-5">
            {BUBBLE_COLORS.map((c) => (
              <button
                key={c.name}
                onClick={() => { setBubbleColor(c.hsl); setBubbleTextColor(c.text); }}
                className="w-8 h-8 rounded-full border-2 transition-all"
                style={{
                  backgroundColor: `hsl(${c.hsl})`,
                  borderColor: bubbleColor === c.hsl ? "hsl(82 80% 60%)" : "hsl(0 0% 30%)",
                  transform: bubbleColor === c.hsl ? "scale(1.15)" : "scale(1)",
                }}
                title={c.name}
              />
            ))}
          </div>

          <p className="text-card-foreground font-bold text-sm mb-2">Background colour</p>
          <div className="flex flex-wrap gap-2.5 mb-5">
            {PALETTE_COLORS.map((c) => (
              <button
                key={c.name}
                onClick={() => { setBgColor(c.hsl); setBgPhoto(null); setBgPreset(null); }}
                className="w-8 h-8 rounded-full border-2 transition-all"
                style={{
                  backgroundColor: `hsl(${c.hsl})`,
                  borderColor: bgColor === c.hsl && !bgPhoto && !bgPreset ? "hsl(82 80% 60%)" : "hsl(0 0% 30%)",
                  transform: bgColor === c.hsl && !bgPhoto && !bgPreset ? "scale(1.15)" : "scale(1)",
                }}
                title={c.name}
              />
            ))}
          </div>

          <p className="text-card-foreground font-bold text-sm mb-2">Background photo</p>
          <div className="flex gap-2.5 mb-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 bg-muted text-card-foreground rounded-[var(--radius)] py-2.5 text-sm font-bold flex items-center justify-center gap-2 border border-border"
            >
              <Upload className="w-4 h-4" /> Upload photo
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            {uploadedPhoto && (
              <button
                onClick={() => { setBgPhoto(uploadedPhoto); setBgPreset(null); }}
                className="w-11 h-11 rounded-xl overflow-hidden border-2"
                style={{ borderColor: bgPhoto === uploadedPhoto ? "hsl(82 80% 60%)" : "transparent" }}
              >
                <img src={uploadedPhoto} alt="Uploaded" className="w-full h-full object-cover" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2.5 mb-5">
            {PRESET_BACKGROUNDS.map((p) => (
              <button
                key={p.name}
                onClick={() => { setBgPreset(p.gradient); setBgPhoto(null); }}
                className="h-14 rounded-xl border-2 transition-all"
                style={{
                  background: p.gradient,
                  borderColor: bgPreset === p.gradient ? "hsl(82 80% 60%)" : "transparent",
                }}
              >
                <span className="text-[10px] font-bold text-secondary-foreground drop-shadow-sm">{p.name}</span>
              </button>
            ))}
          </div>

          <p className="text-card-foreground font-bold text-sm mb-2">Text size</p>
          <div className="flex gap-2 mb-6">
            {TEXT_SIZES.map((s) => (
              <button
                key={s}
                onClick={() => setTextSize(s)}
                className={`flex-1 py-2 rounded-[var(--radius)] text-sm font-bold transition-all ${
                  textSize === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <DrawerTrigger asChild>
            <button className="w-full bg-secondary text-secondary-foreground rounded-[var(--radius)] py-4 text-base font-extrabold border border-border">
              Done
            </button>
          </DrawerTrigger>
        </DrawerContent>
      </Drawer>

      <button
        onClick={handleCreate}
        className="w-full bg-primary text-primary-foreground rounded-[var(--radius)] py-5 text-xl font-extrabold"
      >
        {editCode ? "Update Event" : "Create Event"}
      </button>
    </div>
  );
};

export default HostEvent;
