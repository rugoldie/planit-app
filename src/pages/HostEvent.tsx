import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Upload, Copy, Share2 } from "lucide-react";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import bgNeonCity from "@/assets/bg-neon-city.jpg";
import bgStarryNight from "@/assets/bg-starry-night.jpg";
import bgDarkFloral from "@/assets/bg-dark-floral.jpg";

const PALETTE_COLORS = [
  { name: "Dark Grey", hsl: "0 0% 17%" },
  { name: "Deep Navy", hsl: "213 52% 11%" },
  { name: "Dark Purple", hsl: "264 67% 11%" },
  { name: "Dark Green", hsl: "120 52% 8%" },
  { name: "Deep Red", hsl: "0 55% 6%" },
  { name: "Charcoal", hsl: "0 0% 11%" },
  { name: "Black", hsl: "0 0% 0%" },
];

const BUBBLE_COLORS = [
  { name: "Lime Green", hsl: "82 100% 48%", text: "0 0% 10%" },
  { name: "White", hsl: "0 0% 100%", text: "0 0% 10%" },
  { name: "Hot Pink", hsl: "340 100% 71%", text: "0 0% 10%" },
  { name: "Sky Blue", hsl: "199 92% 64%", text: "0 0% 10%" },
  { name: "Purple", hsl: "282 37% 53%", text: "0 0% 100%" },
  { name: "Orange", hsl: "24 100% 63%", text: "0 0% 10%" },
  { name: "Yellow", hsl: "47 100% 62%", text: "0 0% 10%" },
  { name: "Red", hsl: "6 76% 57%", text: "0 0% 100%" },
];

const GRADIENT_COLORS = [
  { name: "Lime Green", color: "#aaee44" },
  { name: "Purple", color: "#7b2d8b" },
  { name: "Blue", color: "#1a6fb5" },
  { name: "Pink", color: "#c2185b" },
  { name: "Orange", color: "#e65100" },
  { name: "Teal", color: "#00695c" },
  { name: "Red", color: "#b71c1c" },
  { name: "Silver", color: "#e0e0e0" },
];

const FONT_STYLES = [
  { name: "Bold", family: "'Bebas Neue', sans-serif" },
  { name: "Handwritten", family: "'Caveat', cursive" },
  { name: "Elegant", family: "'Playfair Display', serif" },
] as const;

const FONT_MAP: Record<string, string> = {
  Bold: "'Bebas Neue', sans-serif",
  Handwritten: "'Caveat', cursive",
  Elegant: "'Playfair Display', serif",
};

const PRESET_BACKGROUNDS = [
  { name: "Moody Dark", gradient: "linear-gradient(135deg, hsl(240 10% 10%), hsl(260 20% 20%))" },
  { name: "Neon City", gradient: `url(${bgNeonCity})`, isImage: true },
  { name: "Starry Night", gradient: `url(${bgStarryNight})`, isImage: true },
  { name: "City Night", gradient: "linear-gradient(135deg, hsl(230 30% 15%), hsl(260 40% 30%))" },
  { name: "Dark Floral", gradient: `url(${bgDarkFloral})`, isImage: true },
  { name: "Marble", gradient: "linear-gradient(135deg, hsl(0 0% 95%), hsl(0 0% 80%), hsl(0 0% 90%))" },
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
  const [bgPresetIsImage, setBgPresetIsImage] = useState(false);
  const [textSize, setTextSize] = useState<typeof TEXT_SIZES[number]>("Medium");
  const [bubbleColor, setBubbleColor] = useState(BUBBLE_COLORS[0].hsl);
  const [bubbleTextColor, setBubbleTextColor] = useState(BUBBLE_COLORS[0].text);
  const [showCode, setShowCode] = useState(false);
  const [eventCode, setEventCode] = useState("");
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [gradientColor, setGradientColor] = useState(GRADIENT_COLORS[0].color);
  const [fontStyle, setFontStyle] = useState<string>("Bold");
  const [customizeTab, setCustomizeTab] = useState<"colours" | "style">("colours");

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
            setBubbleColor(data.bubble_color || BUBBLE_COLORS[0].hsl);
            setBubbleTextColor(data.bubble_text_color || BUBBLE_COLORS[0].text);
            setGradientColor(data.gradient_color || GRADIENT_COLORS[0].color);
            setFontStyle(data.font_style || "Bold");
            setEventCode(editCode);
            setEventId(data.id);
            if (data.bg_photo?.startsWith("linear-gradient")) {
              setBgPreset(data.bg_photo);
              setBgPresetIsImage(false);
            } else if (data.bg_photo?.startsWith("url(")) {
              setBgPreset(data.bg_photo);
              setBgPresetIsImage(true);
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
      gradient_color: gradientColor,
      font_style: fontStyle,
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
      setBgPresetIsImage(false);
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

  const isDarkBubble = (() => {
    const parts = bubbleColor.split(/\s+/);
    const lightness = parseFloat(parts[parts.length - 1]);
    return lightness <= 30;
  })();

  const previewBgStyle: React.CSSProperties = bgPhoto
    ? { backgroundImage: `url(${bgPhoto})`, backgroundSize: "cover", backgroundPosition: "center" }
    : bgPreset
      ? bgPresetIsImage
        ? { backgroundImage: bgPreset, backgroundSize: "cover", backgroundPosition: "center" }
        : { background: bgPreset }
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

  const titleClass = textSize === "Small" ? "text-2xl font-bold" : textSize === "Large" ? "text-5xl font-extrabold" : "text-4xl font-extrabold";
  const vibeClass = textSize === "Small" ? "text-xs" : textSize === "Large" ? "text-base" : "text-sm";
  const bubbleTextClass = textSize === "Small" ? "text-xs font-medium" : textSize === "Large" ? "text-base font-bold" : "text-sm font-medium";
  const currentFontFamily = FONT_MAP[fontStyle] || FONT_MAP["Bold"];

  return (
    <div className="flex flex-col min-h-screen transition-all duration-300" style={previewBgStyle}>
      {/* Hero gradient header */}
      <div
        className="relative"
        style={{
          background: `linear-gradient(to bottom, ${gradientColor} 0%, ${bgPreset || bgPhoto ? 'transparent' : `hsl(${bgColor})`} 100%)`,
          minHeight: "220px",
        }}
      >
        <button onClick={() => navigate("/home")} className="absolute top-5 left-5 z-10">
          <ArrowLeft className="w-6 h-6" style={{ color: "#111" }} />
        </button>

        <div className="absolute bottom-0 left-0 right-0 px-6 pb-5">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event name..."
            className={`w-full bg-transparent text-white placeholder:text-white/40 outline-none drop-shadow-lg ${titleClass}`}
            style={{ fontFamily: currentFontFamily }}
          />
          <textarea
            value={vibe}
            onChange={(e) => setVibe(e.target.value)}
            placeholder="Set the vibe..."
            rows={1}
            maxLength={120}
            className={`w-full bg-transparent text-white/60 placeholder:text-white/30 outline-none resize-none mt-1 ${vibeClass}`}
            style={{ fontFamily: currentFontFamily }}
          />
        </div>
      </div>

      {/* Detail bubbles */}
      <style>{`.host-detail-bubble input::placeholder, .host-detail-bubble textarea::placeholder { color: #ffffff !important; opacity: 0.7; }`}</style>
      <div className="px-5 pt-4 pb-10 flex flex-col gap-1.5">
        <div
          className="host-detail-bubble px-4 py-3 flex items-center gap-2.5"
          style={{ backgroundColor: "#383838", borderRadius: "12px" }}
        >
          <span className="text-lg">📍</span>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Where"
            className={`w-full bg-transparent outline-none ${bubbleTextClass}`}
            style={{ color: "#fff" }}
          />
        </div>

        <div
          className="host-detail-bubble px-4 py-3 flex items-center gap-2.5"
          style={{ backgroundColor: "#383838", borderRadius: "12px" }}
        >
          <span className="text-lg">📅</span>
          <input
            type="datetime-local"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
            className={`w-full bg-transparent outline-none ${bubbleTextClass}`}
            style={{ color: "#fff" }}
          />
        </div>

        <div
          className="host-detail-bubble px-4 py-3 flex items-center gap-2.5"
          style={{ backgroundColor: "#383838", borderRadius: "12px" }}
        >
          <span className="text-lg">🎭</span>
          <input
            type="text"
            value={dressCode}
            onChange={(e) => setDressCode(e.target.value)}
            placeholder="Theme / dress code"
            className={`w-full bg-transparent outline-none ${bubbleTextClass}`}
            style={{ color: "#fff" }}
          />
        </div>

        <div
          className="host-detail-bubble px-4 py-3 flex items-start gap-2.5"
          style={{ backgroundColor: "#383838", borderRadius: "12px" }}
        >
          <span className="text-lg mt-0.5">➕</span>
          <textarea
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            placeholder="Anything else..."
            rows={2}
            className={`w-full bg-transparent outline-none resize-none ${bubbleTextClass}`}
            style={{ color: "#fff" }}
          />
        </div>

        <Drawer>
          <DrawerTrigger asChild>
            <button
              className="rounded-[var(--radius)] px-4 py-3.5 mb-6 w-full text-center text-sm font-bold border"
              style={{ backgroundColor: "#383838", color: "#aaee44", borderColor: "#444" }}
            >
              Make it yours ✦
            </button>
          </DrawerTrigger>
          <DrawerContent className="bg-card px-5 pb-8 pt-2 border-t border-border max-h-[75vh]">
            <div className="mx-auto w-10 h-1 rounded-full bg-muted-foreground/30 mb-4" />

            {/* Tabs */}
            <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ backgroundColor: "#2b2b2b" }}>
              <button
                onClick={() => setCustomizeTab("colours")}
                className="flex-1 py-2 rounded-lg text-sm font-bold transition-all"
                style={{
                  backgroundColor: customizeTab === "colours" ? "#383838" : "transparent",
                  color: customizeTab === "colours" ? "#aaee44" : "#999",
                }}
              >
                Colours
              </button>
              <button
                onClick={() => setCustomizeTab("style")}
                className="flex-1 py-2 rounded-lg text-sm font-bold transition-all"
                style={{
                  backgroundColor: customizeTab === "style" ? "#383838" : "transparent",
                  color: customizeTab === "style" ? "#aaee44" : "#999",
                }}
              >
                Style
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {customizeTab === "colours" ? (
                <>
                  <p className="text-card-foreground font-bold text-sm mb-2">Background colour</p>
                  <div className="flex flex-wrap gap-2.5 mb-5">
                    {PALETTE_COLORS.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => { setBgColor(c.hsl); setBgPhoto(null); setBgPreset(null); setBgPresetIsImage(false); }}
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

                  <p className="text-card-foreground font-bold text-sm mb-2">Header gradient</p>
                  <div className="flex flex-wrap gap-2.5 mb-5">
                    {GRADIENT_COLORS.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => setGradientColor(c.color)}
                        className="w-8 h-8 rounded-full border-2 transition-all"
                        style={{
                          backgroundColor: c.color,
                          borderColor: gradientColor === c.color ? "hsl(82 80% 60%)" : "hsl(0 0% 30%)",
                          transform: gradientColor === c.color ? "scale(1.15)" : "scale(1)",
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
                        onClick={() => { setBgPhoto(uploadedPhoto); setBgPreset(null); setBgPresetIsImage(false); }}
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
                        onClick={() => { setBgPreset(p.gradient); setBgPresetIsImage(!!(p as any).isImage); setBgPhoto(null); }}
                        className="h-14 rounded-xl border-2 transition-all overflow-hidden"
                        style={{
                          ...(p as any).isImage
                            ? { backgroundImage: p.gradient, backgroundSize: "cover", backgroundPosition: "center" }
                            : { background: p.gradient },
                          borderColor: bgPreset === p.gradient ? "hsl(82 80% 60%)" : "transparent",
                        }}
                      >
                        <span className="text-[10px] font-bold text-white drop-shadow-sm">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
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

                  <p className="text-card-foreground font-bold text-sm mb-2">Font style</p>
                  <div className="flex gap-2.5 mb-6">
                    {FONT_STYLES.map((f) => (
                      <button
                        key={f.name}
                        onClick={() => setFontStyle(f.name)}
                        className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all"
                        style={{
                          backgroundColor: "#2b2b2b",
                          borderColor: fontStyle === f.name ? "#aaee44" : "#444",
                        }}
                      >
                        <span
                          className="text-2xl text-white"
                          style={{ fontFamily: f.family }}
                        >
                          {f.name}
                        </span>
                        <span className="text-[10px] font-semibold" style={{ color: fontStyle === f.name ? "#aaee44" : "#999" }}>
                          {f.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <DrawerTrigger asChild>
              <button className="w-full bg-secondary text-secondary-foreground rounded-[var(--radius)] py-4 text-base font-extrabold border border-border mt-4">
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
    </div>
  );
};

export default HostEvent;
