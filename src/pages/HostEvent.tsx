import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Upload, Copy, Share2 } from "lucide-react";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import bgNeonCity from "@/assets/bg-neon-city.jpg";
import bgStarryNight from "@/assets/bg-starry-night.jpg";
import bgDarkFloral from "@/assets/bg-dark-floral.jpg";
import {
  ConcentricCircles,
  StyledTitle,
  HostDivider,
  NoirDateCard,
  NoirDressCard,
  NoirLocationCard,
  NoirNotesCard,
} from "@/components/layouts/PlanitNoirLayout";
import {
  VintageCircles,
  VintageDivider,
  VintageHostDivider,
} from "@/components/layouts/VintageLayout";

const PALETTE_COLORS = [
  { name: "White", hsl: "0 0% 100%" },
  { name: "Cream", hsl: "36 33% 93%" },
  { name: "Light Grey", hsl: "0 0% 88%" },
  { name: "Mid Grey", hsl: "0 0% 53%" },
  { name: "Dark Grey", hsl: "0 0% 17%" },
  { name: "Charcoal", hsl: "0 0% 11%" },
  { name: "Near Black", hsl: "0 0% 5%" },
  { name: "Black", hsl: "0 0% 0%" },
  { name: "Deep Navy", hsl: "213 52% 11%" },
  { name: "Deep Purple", hsl: "264 67% 11%" },
  { name: "Deep Green", hsl: "120 52% 8%" },
  { name: "Deep Red", hsl: "0 55% 6%" },
];

const NOIR_PALETTE_COLORS = [
  { name: "Charcoal", hsl: "0 0% 11%" },
  { name: "Near Black", hsl: "0 0% 5%" },
  { name: "Pure Black", hsl: "0 0% 0%" },
  { name: "Deep Navy", hsl: "213 52% 11%" },
  { name: "Deep Purple", hsl: "264 67% 11%" },
  { name: "Dark Grey", hsl: "0 0% 17%" },
  { name: "Deep Green", hsl: "120 52% 8%" },
  { name: "Deep Red", hsl: "0 55% 6%" },
];

const VINTAGE_ACCENT_COLORS = [
  { name: "Gold", color: "#8b7355" },
  { name: "Dusty Rose", color: "#c4917a" },
  { name: "Sage Green", color: "#7a9e7e" },
  { name: "Burgundy", color: "#722f37" },
  { name: "Navy", color: "#1e3a5f" },
  { name: "Forest Green", color: "#2d4a3e" },
  { name: "Slate", color: "#5c6b73" },
  { name: "Plum", color: "#6b3d5e" },
];

const BUBBLE_COLORS = [
  { name: "Dark Grey", hsl: "0 0% 22%", text: "0 0% 100%" },
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

const TEMPLATES = [
  {
    name: "Planit Noir",
    bgColor: "0 0% 4%",
    bubbleColor: "82 100% 48%",
    bubbleTextColor: "0 0% 10%",
    gradientColor: "#aaee44",
    fontStyle: "Elegant",
    previewBg: "#0a0a0a",
    templateName: "planit-noir",
  },
  {
    name: "Vintage",
    bgColor: "40 30% 92%",
    bubbleColor: "0 0% 15%",
    bubbleTextColor: "0 0% 100%",
    gradientColor: "#8b7355",
    fontStyle: "Elegant",
    previewBg: "#ede8df",
    templateName: "vintage",
  },
  {
    name: "Galaxy",
    bgColor: "264 67% 11%",
    bubbleColor: "282 37% 53%",
    bubbleTextColor: "0 0% 100%",
    gradientColor: "#7b2d8b",
    fontStyle: "Bold",
    previewBg: "#1a0a2e",
    templateName: "galaxy",
  },
  {
    name: "Sunny",
    bgColor: "24 100% 20%",
    bubbleColor: "24 100% 63%",
    bubbleTextColor: "0 0% 10%",
    gradientColor: "#e65100",
    fontStyle: "Handwritten",
    previewBg: "#3d1e00",
    templateName: "sunny",
  },
  {
    name: "Midnight",
    bgColor: "0 0% 100%",
    bubbleColor: "0 0% 10%",
    bubbleTextColor: "0 0% 100%",
    gradientColor: "#222222",
    fontStyle: "Bold",
    previewBg: "#ffffff",
    templateName: "midnight",
  },
  {
    name: "Ocean",
    bgColor: "213 52% 11%",
    bubbleColor: "199 92% 64%",
    bubbleTextColor: "0 0% 10%",
    gradientColor: "#1a6fb5",
    fontStyle: "Bold",
    previewBg: "#0c1929",
    templateName: "ocean",
  },
  {
    name: "Blush",
    bgColor: "340 30% 10%",
    bubbleColor: "340 100% 71%",
    bubbleTextColor: "0 0% 10%",
    gradientColor: "#c2185b",
    fontStyle: "Bold",
    previewBg: "#2a0f1a",
    templateName: "blush",
  },
  {
    name: "Forest",
    bgColor: "120 52% 8%",
    bubbleColor: "120 40% 40%",
    bubbleTextColor: "0 0% 100%",
    gradientColor: "#00695c",
    fontStyle: "Elegant",
    previewBg: "#0a1f0a",
    templateName: "forest",
  },
  {
    name: "Planit Classic",
    bgColor: "0 0% 17%",
    bubbleColor: "82 100% 48%",
    bubbleTextColor: "0 0% 10%",
    gradientColor: "#aaee44",
    fontStyle: "Bold",
    previewBg: "#2b2b2b",
    templateName: "planit-classic",
  },
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
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const editCode = searchParams.get("edit");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [vibe, setVibe] = useState("");
  const [location, setLocation] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [dressCode, setDressCode] = useState("");
  const [extra, setExtra] = useState("");
  const [bgColor, setBgColor] = useState("0 0% 4%");
  const [bgPhoto, setBgPhoto] = useState<string | null>(null);
  const [bgPreset, setBgPreset] = useState<string | null>(null);
  const [bgPresetIsImage, setBgPresetIsImage] = useState(false);
  const [textSize, setTextSize] = useState<typeof TEXT_SIZES[number]>("Medium");
  const [bubbleColor, setBubbleColor] = useState("82 100% 48%");
  const [bubbleTextColor, setBubbleTextColor] = useState("0 0% 10%");
  const [showCode, setShowCode] = useState(false);
  const [eventCode, setEventCode] = useState("");
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [gradientColor, setGradientColor] = useState(GRADIENT_COLORS[0].color);
  const [fontStyle, setFontStyle] = useState<string>("Elegant");
  const [templateName, setTemplateName] = useState<string>("planit-noir");
  const [customizeTab, setCustomizeTab] = useState<"templates" | "customise">("templates");
  const [customisePanel, setCustomisePanel] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(!!editCode);
  const [titleError, setTitleError] = useState("");

  // Load event data if editing
  useEffect(() => {
    if (editCode) {
      setEditLoading(true);
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
            setFontStyle(data.font_style || "Elegant");
            setTemplateName((data as any).template_name || "planit-noir");
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
          setEditLoading(false);
        });
    }
  }, [editCode]);

  const handleCreate = async () => {
    if (!title.trim()) {
      setTitleError("Please add an event name");
      return;
    }
    setTitleError("");
    if (!user) {
      navigate("/login");
      return;
    }
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
      template_name: templateName,
    } as any;

    if (editCode && eventId) {
      await supabase.from("events").update(eventData).eq("id", eventId);
      navigate("/event/" + code);
    } else {
      const { error } = await supabase.from("events").insert(eventData);
      if (error) {
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

  // Loading screen for edit mode — prevents flash
  if (editLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: "#1a1a1a" }}>
        <p className="text-white/50 text-sm">Loading event...</p>
      </div>
    );
  }

  if (showCode) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-screen bg-background px-6">
        <button onClick={() => navigate("/home")} className="absolute top-5 left-5 z-10">
          <ArrowLeft className="w-6 h-6 text-muted-foreground" />
        </button>
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
  const currentFontFamily = FONT_MAP[fontStyle] || FONT_MAP["Bold"];
  const accentColor = `hsl(${bubbleColor})`;
  const accentText = `hsl(${bubbleTextColor})`;
  const noirFontSize = textSize === "Small" ? "28px" : textSize === "Large" ? "44px" : "36px";

  // Parsed date for calendar bubble preview
  const eventDate = dateTime ? new Date(dateTime) : null;
  const monthName = eventDate ? eventDate.toLocaleString(undefined, { month: "short" }).toUpperCase() : "";
  const dayNum = eventDate ? eventDate.getDate() : "";
  const timeStr = eventDate ? eventDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  const dayOfWeek = eventDate ? eventDate.toLocaleString(undefined, { weekday: "long" }) : "";

  const isNoir = templateName === "planit-noir";
  const isVintage = templateName === "vintage";
  const hostName = profile?.name || "Host";
  const containerBg = isVintage ? "#f5f0e8" : `hsl(${bgColor})`;

  return (
    <div className="flex flex-col min-h-screen transition-all duration-300" style={{ backgroundColor: containerBg }}>

      {isNoir ? (
        /* ═══ PLANIT NOIR LAYOUT ═══ */
        <>
          {/* Concentric circle bg pattern */}
          <div className="relative" style={{ minHeight: "260px" }}>
            <ConcentricCircles accentColor={accentColor} />
            <button onClick={() => navigate(editCode ? `/event/${editCode}` : "/home")} className="absolute top-5 left-5 z-20" style={{ pointerEvents: "auto" }}>
              <ArrowLeft className="w-6 h-6 text-white/40" />
            </button>
            <div className="relative z-10 px-6 pt-16 pb-4">
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "13px", fontStyle: "italic", color: "rgba(255,255,255,0.4)" }}>
                you're invited to
              </p>
              <div className="mt-2">
                <StyledTitle isInput value={title} onChange={(v) => { setTitle(v); setTitleError(""); }} placeholder="Event name..." accentColor={accentColor} fontFamily={currentFontFamily} fontSize={noirFontSize} />
              </div>
              {titleError && <p className="text-red-500 text-xs mt-1">{titleError}</p>}
              <textarea
                value={vibe}
                onChange={(e) => setVibe(e.target.value)}
                placeholder="Set the vibe..."
                rows={1}
                maxLength={120}
                className="w-full bg-transparent outline-none resize-none mt-1 placeholder:text-white/15"
                style={{ fontFamily: "'Playfair Display', serif", fontSize: "13px", fontStyle: "italic", color: "rgba(255,255,255,0.4)" }}
              />
              <HostDivider hostName={hostName} />
            </div>
          </div>

          <div className="px-5 pt-2 pb-10 flex flex-col gap-3">
            {/* Date + Dress code side by side */}
            <div className="flex gap-3">
              <NoirDateCard monthName={monthName} dayNum={String(dayNum)} timeStr={timeStr} isInput dateTime={dateTime} onDateChange={setDateTime} accentColor={accentColor} />
              <NoirDressCard dressCode={dressCode} isInput onChange={setDressCode} />
            </div>

            {/* Location */}
            <NoirLocationCard location={location} isInput onChange={setLocation} accentColor={accentColor} />

            {/* Notes */}
            <NoirNotesCard notes={extra} isInput onChange={setExtra} accentColor={accentColor} />
          </div>
        </>
      ) : isVintage ? (
        /* ═══ VINTAGE LAYOUT ═══ */
        <>
          <div className="relative" style={{ minHeight: "260px" }}>
            <VintageCircles />
            <button onClick={() => navigate(editCode ? `/event/${editCode}` : "/home")} className="absolute top-5 left-5 z-20">
              <ArrowLeft className="w-6 h-6" style={{ color: gradientColor }} />
            </button>
            <div className="relative z-10 px-6 pt-16 pb-4 text-center">
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "11px", fontWeight: 600, letterSpacing: "0.2em", color: gradientColor, textTransform: "uppercase" }}>
                you're invited to
              </p>
              <input
                type="text"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setTitleError(""); }}
                placeholder="Event name..."
                className="w-full bg-transparent outline-none text-center mt-2 placeholder:opacity-30"
                style={{ fontFamily: "'Playfair Display', serif", fontSize: noirFontSize, fontWeight: 900, color: "#2c1810" }}
              />
              {titleError && <p className="text-red-500 text-xs mt-1">{titleError}</p>}
              <textarea
                value={vibe}
                onChange={(e) => setVibe(e.target.value)}
                placeholder="Set the vibe..."
                rows={1}
                maxLength={120}
                className="w-full bg-transparent outline-none resize-none mt-1 text-center placeholder:opacity-30"
                style={{ fontFamily: "'Playfair Display', serif", fontSize: "14px", fontStyle: "italic", color: gradientColor }}
              />
              <VintageHostDivider hostName={hostName} accentColor={gradientColor} />
            </div>
          </div>

          <div className="px-5 pt-2 pb-10 flex flex-col gap-3">
            {/* Location */}
            <div className="overflow-hidden" style={{ backgroundColor: gradientColor, borderRadius: "16px" }}>
              <div className="px-4 py-1.5" style={{ backgroundColor: "rgba(0,0,0,0.2)" }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", color: "#f5f0e8", textTransform: "uppercase" }}>Location</span>
              </div>
              <div className="p-4">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Where's the event?"
                  className="w-full bg-transparent outline-none placeholder:opacity-40"
                  style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", fontWeight: 900, color: "#2c1810" }}
                />
              </div>
            </div>

            {/* Date + Dress code row */}
            <div className="flex gap-3">
              {/* Date */}
              <div className="flex-1 overflow-hidden" style={{ borderRadius: "16px", backgroundColor: "#2c1810" }}>
                <div className="px-3 py-1.5 text-center" style={{ backgroundColor: "rgba(0,0,0,0.2)" }}>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", color: gradientColor, textTransform: "uppercase" }}>{monthName || "DATE"}</span>
                </div>
                <div className="flex flex-col items-center py-3 px-3">
                  {eventDate ? (
                    <>
                      <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "36px", fontWeight: 900, color: "#f5f0e8", lineHeight: 1 }}>{dayNum}</span>
                      <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "11px", fontWeight: 600, color: gradientColor, opacity: 0.8, marginTop: "4px" }}>{timeStr}</span>
                      <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "10px", color: gradientColor, opacity: 0.5, marginTop: "2px" }}>{dayOfWeek}</span>
                    </>
                  ) : (
                    <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "36px", fontWeight: 900, color: "#f5f0e8", opacity: 0.4, lineHeight: 1 }}>?</span>
                  )}
                  <input
                    type="datetime-local"
                    value={dateTime}
                    onChange={(e) => setDateTime(e.target.value)}
                    className="w-full bg-transparent outline-none text-[10px] mt-2 text-center"
                    style={{ color: gradientColor, opacity: 0.6 }}
                  />
                </div>
              </div>

              {/* Dress code */}
              <div className="flex-1 overflow-hidden" style={{ borderRadius: "16px", backgroundColor: gradientColor }}>
                <div className="px-3 py-1.5 flex items-center gap-2" style={{ backgroundColor: "rgba(0,0,0,0.15)" }}>
                  <span style={{ fontSize: "16px" }}>🎭</span>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", color: "#f5f0e8", textTransform: "uppercase" }}>Dress Code</span>
                </div>
                <div className="flex flex-col py-3 px-3">
                  <input
                    type="text"
                    value={dressCode}
                    onChange={(e) => setDressCode(e.target.value)}
                    placeholder="Theme..."
                    className="bg-transparent outline-none placeholder:opacity-40"
                    style={{ fontFamily: "'Playfair Display', serif", fontSize: "18px", fontWeight: 900, color: "#f5f0e8" }}
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="flex items-start gap-3" style={{ backgroundColor: "#2c1810", borderRadius: "14px", padding: "14px 16px", border: `1px solid ${gradientColor}33` }}>
              <span style={{ color: gradientColor, fontSize: "14px", marginTop: "1px" }}>✦</span>
              <div className="flex-1">
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "9px", fontWeight: 600, color: gradientColor, textTransform: "uppercase", letterSpacing: "0.15em", display: "block" }}>Notes from host</span>
                <textarea
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  placeholder="Anything else your guests should know..."
                  rows={2}
                  className="w-full bg-transparent outline-none resize-none mt-1 placeholder:opacity-30"
                  style={{ fontFamily: "'Playfair Display', serif", fontSize: "14px", fontStyle: "italic", color: "#f5f0e8", opacity: 0.8 }}
                />
              </div>
            </div>
          </div>
        </>
      ) : (
        /* ═══ DEFAULT LAYOUT ═══ */
        <>
          {/* Hero gradient header */}
          <div
            className="relative"
            style={{
              background: `linear-gradient(to bottom, ${gradientColor} 0%, ${containerBg} 100%)`,
              minHeight: "220px",
            }}
          >
            <button onClick={() => navigate(editCode ? `/event/${editCode}` : "/home")} className="absolute top-5 left-5 z-20" style={{ pointerEvents: "auto" }}>
              <ArrowLeft className="w-6 h-6" style={{ color: "#111" }} />
            </button>

            <div className="absolute bottom-0 left-0 right-0 px-6 pb-5">
              <input
                type="text"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setTitleError(""); }}
                placeholder="Event name..."
                className={`w-full bg-transparent text-white placeholder:text-white/40 outline-none drop-shadow-lg ${titleClass}`}
                style={{ fontFamily: currentFontFamily }}
              />
              {titleError && <p className="text-red-500 text-xs mt-1">{titleError}</p>}
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

          <div className="px-5 pt-4 pb-10 flex flex-col gap-3">
            {/* Location bubble — full width with header band */}
            <div className="overflow-hidden" style={{ backgroundColor: accentColor, borderRadius: "16px" }}>
              <div className="px-4 py-1.5" style={{ backgroundColor: "rgba(0,0,0,0.2)" }}>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: accentText }}>Location</span>
              </div>
              <div className="p-4 flex items-center gap-4">
                <span style={{ fontSize: "28px" }}>📍</span>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Where's the event?"
                  className="flex-1 min-w-0 bg-transparent outline-none text-xl font-bold placeholder:opacity-50"
                  style={{ color: accentText }}
                />
              </div>
            </div>

            {/* Date + Dress code row */}
            <div className="flex gap-3">
              <div className="flex-1 overflow-hidden" style={{ borderRadius: "16px", backgroundColor: accentColor }}>
                <div className="px-3 py-1.5 text-center" style={{ backgroundColor: "rgba(0,0,0,0.2)" }}>
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: accentText }}>
                    {monthName || "DATE"}
                  </span>
                </div>
                <div className="flex flex-col items-center py-3 px-3">
                  {eventDate ? (
                    <>
                      <span className="text-4xl font-extrabold leading-none" style={{ color: accentText }}>{dayNum}</span>
                      <span className="text-xs font-semibold mt-1" style={{ color: accentText, opacity: 0.7 }}>{timeStr}</span>
                      <span className="text-[10px] font-medium mt-0.5" style={{ color: accentText, opacity: 0.5 }}>{dayOfWeek}</span>
                    </>
                  ) : (
                    <span className="text-3xl font-extrabold leading-none" style={{ color: accentText, opacity: 0.4 }}>?</span>
                  )}
                  <input
                    type="datetime-local"
                    value={dateTime}
                    onChange={(e) => setDateTime(e.target.value)}
                    className="w-full bg-transparent outline-none text-[10px] mt-2 text-center opacity-60"
                    style={{ color: accentText }}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-hidden" style={{ borderRadius: "16px", backgroundColor: accentColor }}>
                <div className="px-3 py-1.5 flex items-center gap-2" style={{ backgroundColor: "rgba(0,0,0,0.2)" }}>
                  <span style={{ fontSize: "18px" }}>🎭</span>
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: accentText }}>Dress Code</span>
                </div>
                <div className="flex flex-col py-3 px-3">
                  <input
                    type="text"
                    value={dressCode}
                    onChange={(e) => setDressCode(e.target.value)}
                    placeholder="Theme..."
                    className="bg-transparent outline-none text-lg font-bold placeholder:opacity-50"
                    style={{ color: accentText }}
                  />
                </div>
              </div>
            </div>

            {/* Notes bubble */}
            <div className="p-4 flex items-start gap-3" style={{
              borderRadius: "16px",
              backgroundColor: accentColor.replace("hsl(", "hsla(").replace(")", ", 0.15)"),
              border: `1px solid ${accentColor.replace("hsl(", "hsla(").replace(")", ", 0.3)")}`,
            }}>
              <span className="text-lg mt-0.5">✦</span>
              <div className="flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: accentColor }}>Notes from host</span>
                <textarea
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  placeholder="Anything else your guests should know..."
                  rows={2}
                  className="w-full bg-transparent outline-none resize-none text-sm text-white/80 mt-1 placeholder:text-white/30"
                />
              </div>
            </div>
          </div>
        </>
      )}

      <div className="px-5 pb-10 flex flex-col gap-3">
        {/* Make it yours + action buttons */}
        <Drawer>
          <DrawerTrigger asChild>
            <button
              className="rounded-2xl px-4 py-3.5 mb-4 w-full text-center text-sm font-bold border mt-2"
              style={{ backgroundColor: accentColor, color: accentText, borderColor: "rgba(0,0,0,0.1)" }}
            >
              Make it yours ✦
            </button>
          </DrawerTrigger>
          <DrawerContent className="bg-card px-5 pb-8 pt-2 border-t border-border max-h-[75vh]">
            <div className="mx-auto w-10 h-1 rounded-full bg-muted-foreground/30 mb-4" />

            {/* Tabs */}
            <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ backgroundColor: "#2b2b2b" }}>
              <button
                onClick={() => { setCustomizeTab("templates"); setCustomisePanel(null); }}
                className="flex-1 py-2 rounded-lg text-sm font-bold transition-all"
                style={{
                  backgroundColor: customizeTab === "templates" ? "#383838" : "transparent",
                  color: customizeTab === "templates" ? "#aaee44" : "#999",
                }}
              >
                Templates
              </button>
              <button
                onClick={() => { setCustomizeTab("customise"); setCustomisePanel(null); }}
                className="flex-1 py-2 rounded-lg text-sm font-bold transition-all"
                style={{
                  backgroundColor: customizeTab === "customise" ? "#383838" : "transparent",
                  color: customizeTab === "customise" ? "#aaee44" : "#999",
                }}
              >
                Customise
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {customizeTab === "templates" ? (
                <div className="grid grid-cols-3 gap-2">
                  {TEMPLATES.map((t) => {
                    const isSelected = templateName === t.templateName;
                    const isNoir = t.templateName === "planit-noir";
                    const isVint = t.templateName === "vintage";
                    const isSunny = t.templateName === "sunny";
                    const font = t.fontStyle === "Elegant" ? "'Playfair Display', serif" : t.fontStyle === "Handwritten" ? "'Caveat', cursive" : "'Bebas Neue', sans-serif";
                    const titleWords = ["Your", "event"];
                    const accentWord = 1;

                    return (
                      <button
                        key={t.name}
                        onClick={() => {
                          setBgColor(t.bgColor);
                          setBubbleColor(t.bubbleColor);
                          setBubbleTextColor(t.bubbleTextColor);
                          setGradientColor(t.gradientColor);
                          setFontStyle(t.fontStyle);
                          setTemplateName(t.templateName);
                          setBgPhoto(null);
                          setBgPreset(null);
                          setBgPresetIsImage(false);
                        }}
                        className="flex flex-col rounded-xl overflow-hidden transition-all"
                        style={{
                          border: isSelected ? "2px solid #aaee44" : "2px solid #333",
                        }}
                      >
                        {/* Mini layout preview */}
                        <div
                          className="w-full flex flex-col px-1.5 pt-1.5 pb-1"
                          style={{
                            aspectRatio: "4/5",
                            backgroundColor: isVint ? "#f5f0e8" : isSunny ? undefined : t.previewBg,
                            background: isSunny ? "linear-gradient(to bottom, #ff6b35, #ff8c00, #3d1e00)" : undefined,
                          }}
                        >
                          {/* Title */}
                          <div style={{ fontFamily: font, lineHeight: 1.1 }}>
                            <span style={{ fontSize: "8px", fontWeight: 900, color: isVint ? "#2c1810" : isSunny ? "#fff" : "#fff" }}>
                              {titleWords[0]}{" "}
                            </span>
                            <span style={{ fontSize: "8px", fontWeight: 900, color: t.gradientColor, fontStyle: isNoir || isVint ? "italic" : "normal" }}>
                              {titleWords[accentWord]}
                            </span>
                          </div>
                          {/* Date + Location pills */}
                          <div className="mt-auto flex flex-col gap-0.5">
                            <div
                              className="rounded-sm px-0.5 py-px truncate"
                              style={{
                                fontSize: "6px",
                                fontFamily: font,
                                fontWeight: 700,
                                backgroundColor: isVint ? "#2c1810" : isSunny ? "rgba(255,255,255,0.2)" : `hsl(${t.bubbleColor})`,
                                color: isVint ? "#f5f0e8" : isSunny ? "#fff" : `hsl(${t.bubbleTextColor})`,
                              }}
                            >
                              5 Jun
                            </div>
                            <div
                              className="rounded-sm px-0.5 py-px truncate"
                              style={{
                                fontSize: "6px",
                                fontFamily: font,
                                fontWeight: 700,
                                backgroundColor: isVint ? t.gradientColor : isSunny ? "rgba(255,255,255,0.2)" : `hsl(${t.bubbleColor})`,
                                color: isVint ? "#f5f0e8" : isSunny ? "#fff" : `hsl(${t.bubbleTextColor})`,
                                opacity: isVint ? 1 : 0.7,
                              }}
                            >
                              Your venue
                            </div>
                          </div>
                        </div>
                        {/* Name banner */}
                        <div className="py-0.5 px-0.5 text-center" style={{ backgroundColor: t.gradientColor }}>
                          <span style={{
                            fontSize: "6px",
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase" as const,
                            color: isNoir || t.templateName === "planit-classic" ? "#111" : isVint ? "#f5f0e8" : isSunny ? "#fff" : ["#ffffff", "#222222"].includes(t.gradientColor) ? "#111" : "#fff",
                          }}>
                            {t.name}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : customisePanel === null ? (
                <div className="flex flex-col gap-1">
                  {/* Background colour — hidden for Vintage */}
                  {!isVintage && (
                    <button onClick={() => setCustomisePanel("bg")} className="flex items-center justify-between py-3.5 px-1">
                      <span className="text-sm font-semibold text-white">Background colour</span>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full border border-white/20" style={{ backgroundColor: `hsl(${bgColor})` }} />
                        <span className="text-white/40 text-lg">›</span>
                      </div>
                    </button>
                  )}
                  {/* Accent colour — Vintage only */}
                  {isVintage && (
                    <button onClick={() => setCustomisePanel("accent")} className="flex items-center justify-between py-3.5 px-1">
                      <span className="text-sm font-semibold text-white">Accent colour</span>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full border border-white/20" style={{ backgroundColor: gradientColor }} />
                        <span className="text-white/40 text-lg">›</span>
                      </div>
                    </button>
                  )}
                  {/* Bubble colour — hidden for Vintage */}
                  {!isVintage && (
                    <button onClick={() => setCustomisePanel("bubble")} className="flex items-center justify-between py-3.5 px-1">
                      <span className="text-sm font-semibold text-white">Bubble colour</span>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full border border-white/20" style={{ backgroundColor: accentColor }} />
                        <span className="text-white/40 text-lg">›</span>
                      </div>
                    </button>
                  )}
                  {/* Header gradient — hidden for Noir & Vintage */}
                  {!isNoir && !isVintage && (
                    <button onClick={() => setCustomisePanel("gradient")} className="flex items-center justify-between py-3.5 px-1">
                      <span className="text-sm font-semibold text-white">Header gradient</span>
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full border border-white/20" style={{ background: `linear-gradient(135deg, ${gradientColor}, #1a1a1a)` }} />
                        <span className="text-white/40 text-lg">›</span>
                      </div>
                    </button>
                  )}
                  {/* Font style — hidden for Vintage */}
                  {!isVintage && (
                    <button onClick={() => setCustomisePanel("font")} className="flex items-center justify-between py-3.5 px-1">
                      <span className="text-sm font-semibold text-white">Font style</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/60">{fontStyle}</span>
                        <span className="text-white/40 text-lg">›</span>
                      </div>
                    </button>
                  )}
                  {/* Text size */}
                  <button onClick={() => setCustomisePanel("size")} className="flex items-center justify-between py-3.5 px-1">
                    <span className="text-sm font-semibold text-white">Text size</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/60">{textSize}</span>
                      <span className="text-white/40 text-lg">›</span>
                    </div>
                  </button>
                </div>
              ) : (
                <div>
                  <button onClick={() => setCustomisePanel(null)} className="flex items-center gap-1 text-sm text-white/60 mb-4">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>

                  {customisePanel === "bg" && (
                    <>
                      <p className="text-card-foreground font-bold text-sm mb-2">Background colour</p>
                      <div className="flex gap-2.5 mb-5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                        {(isNoir ? NOIR_PALETTE_COLORS : PALETTE_COLORS).map((c) => (
                          <button
                            key={c.name}
                            onClick={() => { setBgColor(c.hsl); setBgPhoto(null); setBgPreset(null); setBgPresetIsImage(false); }}
                            className="w-8 h-8 rounded-full border-2 transition-all shrink-0"
                            style={{
                              backgroundColor: `hsl(${c.hsl})`,
                              borderColor: bgColor === c.hsl && !bgPhoto && !bgPreset ? "#aaee44" : "hsl(0 0% 30%)",
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
                            onClick={() => { setBgPhoto(uploadedPhoto); setBgPreset(null); setBgPresetIsImage(false); }}
                            className="w-11 h-11 rounded-xl overflow-hidden border-2"
                            style={{ borderColor: bgPhoto === uploadedPhoto ? "#aaee44" : "transparent" }}
                          >
                            <img src={uploadedPhoto} alt="Uploaded" className="w-full h-full object-cover" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2.5">
                        {PRESET_BACKGROUNDS.map((p) => (
                          <button
                            key={p.name}
                            onClick={() => { setBgPreset(p.gradient); setBgPresetIsImage(!!(p as any).isImage); setBgPhoto(null); }}
                            className="h-14 rounded-xl border-2 transition-all overflow-hidden"
                            style={{
                              ...(p as any).isImage
                                ? { backgroundImage: p.gradient, backgroundSize: "cover", backgroundPosition: "center" }
                                : { background: p.gradient },
                              borderColor: bgPreset === p.gradient ? "#aaee44" : "transparent",
                            }}
                          >
                            <span className="text-[10px] font-bold text-white drop-shadow-sm">{p.name}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {customisePanel === "bubble" && (
                    <>
                      <p className="text-card-foreground font-bold text-sm mb-2">Bubble colour</p>
                      <div className="flex flex-wrap gap-2.5">
                        {BUBBLE_COLORS.map((c) => (
                          <button
                            key={c.name}
                            onClick={() => { setBubbleColor(c.hsl); setBubbleTextColor(c.text); }}
                            className="w-8 h-8 rounded-full border-2 transition-all"
                            style={{
                              backgroundColor: `hsl(${c.hsl})`,
                              borderColor: bubbleColor === c.hsl ? "#aaee44" : "hsl(0 0% 30%)",
                              transform: bubbleColor === c.hsl ? "scale(1.15)" : "scale(1)",
                            }}
                            title={c.name}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  {customisePanel === "gradient" && (
                    <>
                      <p className="text-card-foreground font-bold text-sm mb-2">Header gradient</p>
                      <div className="flex flex-wrap gap-2.5">
                        {GRADIENT_COLORS.map((c) => (
                          <button
                            key={c.name}
                            onClick={() => setGradientColor(c.color)}
                            className="w-8 h-8 rounded-full border-2 transition-all"
                            style={{
                              backgroundColor: c.color,
                              borderColor: gradientColor === c.color ? "#aaee44" : "hsl(0 0% 30%)",
                              transform: gradientColor === c.color ? "scale(1.15)" : "scale(1)",
                            }}
                            title={c.name}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  {customisePanel === "accent" && (
                    <>
                      <p className="text-card-foreground font-bold text-sm mb-2">Accent colour</p>
                      <div className="flex flex-wrap gap-2.5">
                        {VINTAGE_ACCENT_COLORS.map((c) => (
                          <button
                            key={c.name}
                            onClick={() => setGradientColor(c.color)}
                            className="w-8 h-8 rounded-full border-2 transition-all"
                            style={{
                              backgroundColor: c.color,
                              borderColor: gradientColor === c.color ? "#aaee44" : "hsl(0 0% 30%)",
                              transform: gradientColor === c.color ? "scale(1.15)" : "scale(1)",
                            }}
                            title={c.name}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  {customisePanel === "font" && (
                    <>
                      <p className="text-card-foreground font-bold text-sm mb-2">Font style</p>
                      <div className="flex gap-2.5">
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
                            <span className="text-2xl text-white" style={{ fontFamily: f.family }}>{f.name}</span>
                            <span className="text-[10px] font-semibold" style={{ color: fontStyle === f.name ? "#aaee44" : "#999" }}>{f.name}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {customisePanel === "size" && (
                    <>
                      <p className="text-card-foreground font-bold text-sm mb-2">Text size</p>
                      <div className="flex gap-2">
                        {TEXT_SIZES.map((s) => (
                          <button
                            key={s}
                            onClick={() => setTextSize(s)}
                            className={`flex-1 py-2 rounded-[var(--radius)] text-sm font-bold transition-all ${
                              textSize === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
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
          className="w-full rounded-[var(--radius)] py-5 text-xl font-extrabold"
          style={{ backgroundColor: "#aaee44", color: "#111" }}
        >
          {editCode ? "Update Event" : "Create Event"}
        </button>
      </div>
    </div>
  );
};

export default HostEvent;
