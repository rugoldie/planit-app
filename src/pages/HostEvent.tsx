import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Copy, Share2 } from "lucide-react";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";

const PALETTE_COLORS = [
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [vibe, setVibe] = useState("");
  const [location, setLocation] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [dressCode, setDressCode] = useState("");
  const [extra, setExtra] = useState("");
  const [bgColor, setBgColor] = useState(PALETTE_COLORS[0].hsl);
  const [bgPhoto, setBgPhoto] = useState<string | null>(null);
  const [bgPreset, setBgPreset] = useState<string | null>(null);
  const [textSize, setTextSize] = useState<typeof TEXT_SIZES[number]>("Medium");
  const [showCode, setShowCode] = useState(false);
  const [eventCode, setEventCode] = useState("");
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);

  const handleCreate = () => {
    const code = generateCode();
    setEventCode(code);
    const event = { title, vibe, location, dateTime, dressCode, extra, bgColor, bgPhoto: bgPhoto || bgPreset, textSize, code };
    const existing = JSON.parse(localStorage.getItem("planit_events") || "[]");
    existing.push(event);
    localStorage.setItem("planit_events", JSON.stringify(existing));
    setShowCode(true);
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

  if (showCode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background px-6">
        <div className="bg-card rounded-[var(--radius)] p-8 w-full max-w-sm text-center shadow-sm">
          <p className="text-muted-foreground text-sm font-semibold mb-2">Your event code</p>
          <p className="text-5xl font-extrabold text-card-foreground tracking-widest mb-4">{eventCode}</p>
          <p className="text-muted-foreground text-sm">Share this code with your guests</p>
        </div>

        <div className="flex gap-4 mt-8 w-full max-w-sm">
          <button
            onClick={handleCopy}
            className="flex-1 bg-secondary text-secondary-foreground rounded-[var(--radius)] py-4 text-base font-bold flex items-center justify-center gap-2"
          >
            <Copy className="w-4 h-4" /> Copy link
          </button>
          <button
            onClick={handleShare}
            className="flex-1 bg-secondary text-secondary-foreground rounded-[var(--radius)] py-4 text-base font-bold flex items-center justify-center gap-2"
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
    <div className="flex flex-col min-h-screen bg-background px-5 py-6 pb-10">
      <button onClick={() => navigate("/home")} className="self-start mb-4">
        <ArrowLeft className="w-6 h-6 text-foreground" />
      </button>

      {/* Title */}
      <div className="bg-card rounded-[var(--radius)] px-4 py-3 mb-2 shadow-sm">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Event name..."
          className="w-full bg-transparent text-2xl font-extrabold text-card-foreground placeholder:text-muted-foreground/70 outline-none"
        />
      </div>

      {/* Vibe */}
      <div className="bg-card rounded-[var(--radius)] px-4 py-3 mb-2 shadow-sm">
        <textarea
          value={vibe}
          onChange={(e) => setVibe(e.target.value)}
          placeholder="Set the vibe... e.g. sit down dinner, pub crawl, smart casual night out"
          rows={2}
          maxLength={120}
          className="w-full bg-transparent text-sm text-card-foreground placeholder:text-muted-foreground/70 outline-none resize-none"
        />
      </div>

      {/* Details */}
      <div className="bg-card rounded-[var(--radius)] px-4 py-3 mb-1.5 shadow-sm flex items-center gap-2.5">
        <span className="text-lg">📍</span>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Where"
          className="w-full bg-transparent text-sm text-card-foreground placeholder:text-muted-foreground/70 outline-none"
        />
      </div>

      <div className="bg-card rounded-[var(--radius)] px-4 py-3 mb-1.5 shadow-sm flex items-center gap-2.5">
        <span className="text-lg">📅</span>
        <input
          type="datetime-local"
          value={dateTime}
          onChange={(e) => setDateTime(e.target.value)}
          className="w-full bg-transparent text-sm text-card-foreground outline-none"
        />
      </div>

      <div className="bg-card rounded-[var(--radius)] px-4 py-3 mb-1.5 shadow-sm flex items-center gap-2.5">
        <span className="text-lg">👗</span>
        <input
          type="text"
          value={dressCode}
          onChange={(e) => setDressCode(e.target.value)}
          placeholder="Theme / dress code"
          className="w-full bg-transparent text-sm text-card-foreground placeholder:text-muted-foreground/70 outline-none"
        />
      </div>

      <div className="bg-card rounded-[var(--radius)] px-4 py-3 mb-3 shadow-sm flex items-start gap-2.5">
        <span className="text-lg mt-0.5">➕</span>
        <textarea
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          placeholder="Anything else..."
          rows={2}
          className="w-full bg-transparent text-sm text-card-foreground placeholder:text-muted-foreground/70 outline-none resize-none"
        />
      </div>

      {/* Make it yours — opens bottom sheet */}
      <Drawer>
        <DrawerTrigger asChild>
          <button className="bg-card rounded-[var(--radius)] px-4 py-3.5 mb-6 shadow-sm w-full text-center text-sm font-bold text-card-foreground">
            Make it yours ✦
          </button>
        </DrawerTrigger>
        <DrawerContent className="px-5 pb-8 pt-2">
          <div className="mx-auto w-10 h-1 rounded-full bg-muted mb-5" />

          {/* Background colour */}
          <p className="text-card-foreground font-bold text-sm mb-2">Background colour</p>
          <div className="flex flex-wrap gap-2.5 mb-5">
            {PALETTE_COLORS.map((c) => (
              <button
                key={c.name}
                onClick={() => { setBgColor(c.hsl); setBgPhoto(null); setBgPreset(null); }}
                className="w-8 h-8 rounded-full border-2 transition-all"
                style={{
                  backgroundColor: `hsl(${c.hsl})`,
                  borderColor: bgColor === c.hsl && !bgPhoto && !bgPreset ? "hsl(0 0% 10%)" : "hsl(0 0% 85%)",
                  transform: bgColor === c.hsl && !bgPhoto && !bgPreset ? "scale(1.15)" : "scale(1)",
                }}
                title={c.name}
              />
            ))}
          </div>

          {/* Background photo */}
          <p className="text-card-foreground font-bold text-sm mb-2">Background photo</p>
          <div className="flex gap-2.5 mb-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 bg-secondary text-secondary-foreground rounded-[var(--radius)] py-2.5 text-sm font-bold flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" /> Upload photo
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            {uploadedPhoto && (
              <button
                onClick={() => { setBgPhoto(uploadedPhoto); setBgPreset(null); }}
                className="w-11 h-11 rounded-xl overflow-hidden border-2"
                style={{ borderColor: bgPhoto === uploadedPhoto ? "hsl(0 0% 10%)" : "transparent" }}
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
                  borderColor: bgPreset === p.gradient ? "hsl(0 0% 10%)" : "transparent",
                }}
              >
                <span className="text-[10px] font-bold text-card drop-shadow-sm">{p.name}</span>
              </button>
            ))}
          </div>

          {/* Text size */}
          <p className="text-card-foreground font-bold text-sm mb-2">Text size</p>
          <div className="flex gap-2 mb-6">
            {TEXT_SIZES.map((s) => (
              <button
                key={s}
                onClick={() => setTextSize(s)}
                className={`flex-1 py-2 rounded-[var(--radius)] text-sm font-bold transition-all ${
                  textSize === s
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Done button */}
          <DrawerTrigger asChild>
            <button className="w-full bg-secondary text-secondary-foreground rounded-[var(--radius)] py-4 text-base font-extrabold">
              Done
            </button>
          </DrawerTrigger>
        </DrawerContent>
      </Drawer>

      {/* Create button */}
      <button
        onClick={handleCreate}
        className="w-full bg-secondary text-secondary-foreground rounded-[var(--radius)] py-5 text-xl font-extrabold shadow-sm"
      >
        Create Event
      </button>
    </div>
  );
};

export default HostEvent;
