import { useState, useRef, useEffect } from "react";

import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Upload, Copy, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
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
import { VintageCircles, VintageDivider, VintageHostDivider } from "@/components/layouts/VintageLayout";

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

type StickerItem = { id: string; emoji: string; x: number; y: number; size: number };

const STICKER_EMOJIS = ["🍷","🌟","😊","🎉","🎈","🌸","🔥","💫","🦋","🍾","💎","🌙","🎂","👑","🕺","💃","🍕","🎸"];

const FONT_COLORS = [
  { label: "White",    value: "#ffffff" },
  { label: "Black",    value: "#111111" },
  { label: "Cream",    value: "#fdf6e3" },
  { label: "Hot Pink", value: "#ff70b0" },
  { label: "Sky Blue", value: "#38bdf8" },
  { label: "Lime",     value: "#aaee44" },
];

const hexMuted = (hex: string) => {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},0.55)`;
};

const CUSTOM_BG_PATTERNS = [
  { key: "planit-pattern:retro-stars",   name: "Retro Stars",   isLight: true  },
  { key: "planit-pattern:checkerboard",  name: "Checker",       isLight: false },
  { key: "planit-pattern:tie-dye",       name: "Tie Dye",       isLight: false },
  { key: "planit-pattern:holographic",   name: "Holo",          isLight: true  },
  { key: "planit-pattern:cherry-blossom",name: "Blossom",       isLight: true  },
  { key: "planit-pattern:camo",          name: "Camo",          isLight: false },
  { key: "planit-pattern:blueprint",     name: "Blueprint",     isLight: false },
  { key: "planit-pattern:groovy",        name: "Groovy",        isLight: true  },
];

const CUSTOM_SOLID_COLORS = [
  { key: "solid-softwhite",  name: "Soft White",  color: "#fafafa"  },
  { key: "solid-cream",      name: "Warm Cream",  color: "#fdf6e3"  },
  { key: "solid-blushpink",  name: "Blush Pink",  color: "#fde8f0"  },
  { key: "solid-lavender",   name: "Lavender",    color: "#ede9fe"  },
  { key: "solid-mint",       name: "Mint",        color: "#ecfdf5"  },
  { key: "solid-sky",        name: "Sky",         color: "#e0f2fe"  },
  { key: "solid-peach",      name: "Peach",       color: "#fff7ed"  },
  { key: "solid-lemon",      name: "Lemon",       color: "#fefce8"  },
];

const getPatternBgStyle = (key: string): React.CSSProperties => {
  // Always return both backgroundColor and backgroundImage so React clears stale values on each render.
  switch (key) {
    case "planit-pattern:retro-stars":    return { backgroundColor: "#ede8d8", backgroundImage: "none", backgroundSize: "auto" };
    case "planit-pattern:checkerboard":   return { backgroundColor: "", backgroundImage: "repeating-conic-gradient(#000 0% 25%, #fff 0% 50%)", backgroundSize: "24px 24px" };
    case "planit-pattern:tie-dye":        return { backgroundColor: "", backgroundImage: "radial-gradient(circle at 50% 50%, #ff6b6b, #ffd93d 30%, #6bcb77 55%, #4d96ff 75%, #c77dff)", backgroundSize: "auto" };
    case "planit-pattern:holographic":    return { backgroundColor: "", backgroundImage: "conic-gradient(from 0deg at 50% 50%, #ff9de2, #a78bfa, #67e8f9, #86efac, #fde68a, #ff9de2)", backgroundSize: "auto" };
    case "planit-pattern:cherry-blossom": return { backgroundColor: "", backgroundImage: "linear-gradient(135deg, #fce4ec 0%, #f8bbd0 50%, #fce4ec 100%)", backgroundSize: "auto" };
    case "planit-pattern:camo":           return { backgroundColor: "#4a5240", backgroundImage: "none", backgroundSize: "auto" };
    case "planit-pattern:blueprint":      return { backgroundColor: "#0a1628", backgroundImage: "repeating-linear-gradient(rgba(56,189,248,0.12) 1px, transparent 1px), repeating-linear-gradient(90deg, rgba(56,189,248,0.12) 1px, transparent 1px)", backgroundSize: "20px 20px" };
    case "planit-pattern:groovy":         return { backgroundColor: "#fdf6e3", backgroundImage: "none", backgroundSize: "auto" };
    case "solid-softwhite":               return { backgroundColor: "#fafafa", backgroundImage: "none", backgroundSize: "auto" };
    case "solid-cream":                   return { backgroundColor: "#fdf6e3", backgroundImage: "none", backgroundSize: "auto" };
    case "solid-blushpink":               return { backgroundColor: "#fde8f0", backgroundImage: "none", backgroundSize: "auto" };
    case "solid-lavender":                return { backgroundColor: "#ede9fe", backgroundImage: "none", backgroundSize: "auto" };
    case "solid-mint":                    return { backgroundColor: "#ecfdf5", backgroundImage: "none", backgroundSize: "auto" };
    case "solid-sky":                     return { backgroundColor: "#e0f2fe", backgroundImage: "none", backgroundSize: "auto" };
    case "solid-peach":                   return { backgroundColor: "#fff7ed", backgroundImage: "none", backgroundSize: "auto" };
    case "solid-lemon":                   return { backgroundColor: "#fefce8", backgroundImage: "none", backgroundSize: "auto" };
    default: return { backgroundColor: "", backgroundImage: "none", backgroundSize: "auto" };
  }
};

const isLightPattern = (key: string) =>
  ["planit-pattern:retro-stars","planit-pattern:holographic","planit-pattern:cherry-blossom","planit-pattern:groovy",
   "solid-softwhite","solid-cream","solid-blushpink","solid-lavender","solid-mint","solid-sky","solid-peach","solid-lemon"].includes(key);

const PatternOverlay = ({ patternKey }: { patternKey: string }) => {
  if (patternKey === "planit-pattern:retro-stars") {
    return (
      <>
        {Array.from({ length: 22 }).map((_, i) => (
          <div key={i} style={{ position: "absolute", left: `${(i*17+5)%90+2}%`, top: `${(i*13+7)%88+2}%`, fontSize: `${i%3===0?26:i%2===0?18:13}px`, color: "#e63946", opacity: 0.78, pointerEvents: "none" as const, lineHeight: 1 }}>★</div>
        ))}
      </>
    );
  }
  if (patternKey === "planit-pattern:cherry-blossom") {
    return (
      <>
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} style={{ position: "absolute", left: `${(i*19+3)%86+4}%`, top: `${(i*11+9)%80+5}%`, fontSize: "22px", opacity: 0.45, pointerEvents: "none" as const, transform: `rotate(${i*25}deg)` }}>🌸</div>
        ))}
      </>
    );
  }
  if (patternKey === "planit-pattern:camo") {
    const blobs = [
      { x:8,  y:5,  w:120, h:70, c:"#3a4a32", r:-15 },
      { x:45, y:18, w:140, h:80, c:"#2d3a25", r:22  },
      { x:-5, y:48, w:110, h:65, c:"#5a6b4a", r:8   },
      { x:62, y:58, w:130, h:72, c:"#3a4a32", r:-28 },
      { x:15, y:68, w:100, h:60, c:"#2d3a25", r:18  },
      { x:72, y:28, w:90,  h:80, c:"#4a5a38", r:-12 },
      { x:30, y:82, w:115, h:55, c:"#35452d", r:30  },
    ];
    return (
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" as const }}>
        {blobs.map((b,i) => <div key={i} style={{ position:"absolute", left:`${b.x}%`, top:`${b.y}%`, width:`${b.w}px`, height:`${b.h}px`, backgroundColor:b.c, borderRadius:"50%", transform:`rotate(${b.r}deg)`, opacity:0.85 }} />)}
      </div>
    );
  }
  if (patternKey === "planit-pattern:blueprint") {
    return (
      <div style={{ position:"absolute", inset:0, pointerEvents:"none" as const }}>
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%" }} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="bp-sm" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#4da6ff" strokeWidth="0.4" opacity="0.35"/>
            </pattern>
            <pattern id="bp-lg" width="200" height="200" patternUnits="userSpaceOnUse">
              <rect width="200" height="200" fill="url(#bp-sm)"/>
              <path d="M 200 0 L 0 0 0 200" fill="none" stroke="#4da6ff" strokeWidth="0.9" opacity="0.4"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#bp-lg)"/>
          <circle cx="50%" cy="38%" r="90" fill="none" stroke="#4da6ff" strokeWidth="0.8" opacity="0.4"/>
          <circle cx="50%" cy="38%" r="55" fill="none" stroke="#4da6ff" strokeWidth="0.5" opacity="0.35"/>
          <circle cx="50%" cy="38%" r="130" fill="none" stroke="#4da6ff" strokeWidth="0.5" opacity="0.25"/>
          <line x1="50%" y1="15%" x2="50%" y2="62%" stroke="#4da6ff" strokeWidth="0.6" opacity="0.35"/>
          <line x1="25%" y1="38%" x2="75%" y2="38%" stroke="#4da6ff" strokeWidth="0.6" opacity="0.35"/>
        </svg>
      </div>
    );
  }
  if (patternKey === "planit-pattern:groovy") {
    return (
      <div style={{ position:"absolute", inset:0, pointerEvents:"none" as const }}>
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%" }} viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
          <circle cx="80"  cy="180" r="110" fill="none" stroke="#c2410c" strokeWidth="6" opacity="0.28"/>
          <circle cx="230" cy="140" r="140" fill="none" stroke="#d97706" strokeWidth="6" opacity="0.22"/>
          <circle cx="340" cy="320" r="100" fill="none" stroke="#c2410c" strokeWidth="5" opacity="0.28"/>
          <circle cx="100" cy="420" r="130" fill="none" stroke="#d97706" strokeWidth="6" opacity="0.22"/>
          <circle cx="280" cy="510" r="120" fill="none" stroke="#c2410c" strokeWidth="5" opacity="0.28"/>
          <circle cx="60"  cy="640" r="90"  fill="none" stroke="#d97706" strokeWidth="5" opacity="0.22"/>
          <circle cx="350" cy="680" r="110" fill="none" stroke="#c2410c" strokeWidth="5" opacity="0.26"/>
          <circle cx="170" cy="300" r="18"  fill="#d97706" opacity="0.18"/>
          <circle cx="310" cy="200" r="12"  fill="#c2410c" opacity="0.18"/>
          <circle cx="200" cy="650" r="20"  fill="#d97706" opacity="0.16"/>
          <path d="M-20,80  Q60,50  120,80  Q180,110 240,80  Q300,50  360,80  Q420,110 480,80"  fill="none" stroke="#c2410c" strokeWidth="4" opacity="0.2"/>
          <path d="M-20,220 Q60,190 120,220 Q180,250 240,220 Q300,190 360,220 Q420,250 480,220" fill="none" stroke="#d97706" strokeWidth="4" opacity="0.2"/>
          <path d="M-20,560 Q60,530 120,560 Q180,590 240,560 Q300,530 360,560 Q420,590 480,560" fill="none" stroke="#c2410c" strokeWidth="4" opacity="0.2"/>
          <path d="M-20,720 Q60,690 120,720 Q180,750 240,720 Q300,690 360,720 Q420,750 480,720" fill="none" stroke="#d97706" strokeWidth="4" opacity="0.2"/>
        </svg>
      </div>
    );
  }
  return null;
};

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
    name: "Custom ✦",
    bgColor: "0 0% 4%",
    bubbleColor: "82 100% 48%",
    bubbleTextColor: "0 0% 10%",
    gradientColor: "#aaee44",
    fontStyle: "Bold",
    previewBg: "rainbow",
    templateName: "planit-custom",
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
];

const TEXT_SIZES = ["Small", "Medium", "Large"] as const;

const BUILD_IT_SYSTEM_PROMPT = `You are a world-class event designer and creative director with deep expertise in colour theory, typography, and visual mood-setting. You create bespoke visual identities for events.

When given an event description, you will design a complete visual style by returning a JSON object. You must think carefully about:
- The emotional tone and energy of the event
- Colour psychology (deep blacks for drama, warm creams for romance, electric neons for energy)
- Typographic personality (Elegant = serif/refined, Handwritten = casual/warm, Bold = strong/modern)
- How pattern, colour, and font work together as a cohesive whole

ALWAYS return template as "planit-custom" — you are creating something fully bespoke, not picking a preset.

Available background patterns (choose one that fits, or null for a pure solid colour):
- "planit-pattern:retro-stars" — light cream base, illustrated stars; great for retro, nostalgic, cinema, Hollywood events
- "planit-pattern:checkerboard" — black and white checks; great for race days, ska, 60s mod, diner parties
- "planit-pattern:tie-dye" — psychedelic rainbow swirl; great for festivals, hippie, Woodstock, Coachella vibes
- "planit-pattern:holographic" — iridescent rainbow conic; great for futuristic, Y2K, holographic, fashion events
- "planit-pattern:cherry-blossom" — soft pink gradient; great for Japanese-inspired, spring, floral, garden events
- "planit-pattern:camo" — dark olive/green; great for military themed, outdoors, hunting, army events
- "planit-pattern:blueprint" — dark navy with grid lines; great for architecture, industrial, technical, art events
- "planit-pattern:groovy" — warm cream with 70s circles and wavy lines; great for retro 70s, disco, soul, funk events
- null — use a pure solid bgColor; best for sleek minimal, editorial, or when a custom colour tells the whole story

Fields to return:
- template: always "planit-custom"
- bgColor: HSL string WITHOUT "hsl()" wrapper e.g. "240 15% 8%" — the solid background colour. Even if a pattern is chosen, pick a bgColor that would work as a fallback.
- bubbleColor: HSL string WITHOUT "hsl()" wrapper e.g. "45 80% 55%" — the primary accent/highlight colour. This is used as the BACKGROUND of the date bubble and key UI elements. Make it vivid and dramatically different per theme — this is the most visible colour on the card.
- bubbleTextColor: HSL string WITHOUT "hsl()" wrapper e.g. "0 0% 0%" — text rendered ON TOP of the bubbleColor background. Use "0 0% 0%" for light/bright accents, "0 0% 100%" for dark accents. Must contrast strongly.
- fontStyle: one of "Bold", "Handwritten", "Elegant"
- gradientColor: hex colour string e.g. "#c9a84c" — used for gradient headers and decorative accents
- bgPattern: one of the pattern keys above, or null

CREATIVE GUIDELINES — think boldly:

Masquerade / Black Tie / Opera / Glitter:
→ bgColor "0 0% 4%", bubbleColor "45 80% 55%" (gold), bubbleTextColor "0 0% 0%", Elegant font, gradientColor "#c9a84c", bgPattern null

Beach / Tropical / Summer:
→ bgColor "195 60% 85%", bubbleColor "15 90% 60%" (coral), Handwritten font, gradientColor "#ff6b35", bgPattern null

Rave / Club / Electronic / Underground:
→ bgColor "270 20% 5%", bubbleColor "280 100% 65%" (electric purple), Bold font, gradientColor "#9333ea", bgPattern null

Garden Party / Floral / Afternoon Tea:
→ bgColor "120 15% 90%", bubbleColor "150 40% 45%" (sage green), Elegant font, bgPattern "planit-pattern:cherry-blossom"

Disco / 70s / Funk / Soul:
→ bgColor "35 60% 15%", bubbleColor "45 95% 60%" (mustard), Bold font, bgPattern "planit-pattern:groovy"

Retro / Vintage Cinema / Hollywood:
→ bgColor "30 25% 12%", bubbleColor "47 80% 55%", Elegant font, bgPattern "planit-pattern:retro-stars"

Festival / Coachella / Boho:
→ bgColor "270 30% 15%", bubbleColor "320 80% 65%", Bold font, bgPattern "planit-pattern:tie-dye"

Neon / Y2K / Cyber:
→ bgColor "220 30% 8%", bubbleColor "160 100% 50%", Bold font, bgPattern "planit-pattern:holographic"

Industrial / Art Show / Gallery:
→ bgColor "0 0% 8%", bubbleColor "0 0% 85%", Bold font, bgPattern "planit-pattern:blueprint"

Kids Birthday / Playful / Rainbow:
→ bgColor "200 80% 92%", bubbleColor "340 90% 55%", Handwritten font, bgPattern "planit-pattern:tie-dye"

DO NOT pick boring or generic choices. Every event deserves a unique, considered, beautiful result. Think like a creative director pitching to a client — make them say "wow".

Return ONLY a valid JSON object. No markdown, no code fences, no explanation. Just the JSON.`;

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
  const [textSize, setTextSize] = useState<(typeof TEXT_SIZES)[number]>("Medium");
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { toast } = useToast();
  const [customisePanel, setCustomisePanel] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(!!editCode);
  const [titleError, setTitleError] = useState("");
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [showBuildIt, setShowBuildIt] = useState(false);
  const [buildItPrompt, setBuildItPrompt] = useState("");
  const [buildItGenerating, setBuildItGenerating] = useState(false);
  const [buildItResult, setBuildItResult] = useState<{
    template: string;
    bubbleColor: string;
    bubbleTextColor: string;
    bgColor: string;
    fontStyle: string;
    gradientColor: string;
    bgPattern: string | null;
  } | null>(null);
  const [buildItError, setBuildItError] = useState<string | null>(null);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [fontColor, setFontColor] = useState<string>("#ffffff");
  const customContainerRef = useRef<HTMLDivElement>(null);
  const stickerDragRef = useRef<{ id: string; startX: number; startY: number; sx: number; sy: number } | null>(null);
  const stickerPinchRef = useRef<{ id: string; initDist: number; initSize: number } | null>(null);

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
            setTextSize((data.text_size as (typeof TEXT_SIZES)[number]) || "Medium");
            setBubbleColor(data.bubble_color || BUBBLE_COLORS[0].hsl);
            setBubbleTextColor(data.bubble_text_color || BUBBLE_COLORS[0].text);
            setGradientColor(data.gradient_color || GRADIENT_COLORS[0].color);
            setFontStyle(data.font_style || "Elegant");
            setTemplateName((data as any).template_name || "planit-noir");
            setEventCode(editCode);
            setEventId(data.id);
            if (data.bg_photo?.startsWith("planit-pattern:") || data.bg_photo?.startsWith("solid-")) {
              setBgPreset(data.bg_photo);
              setBgPresetIsImage(false);
            } else if (data.bg_photo?.startsWith("linear-gradient")) {
              setBgPreset(data.bg_photo);
              setBgPresetIsImage(false);
            } else if (data.bg_photo?.startsWith("url(")) {
              setBgPreset(data.bg_photo);
              setBgPresetIsImage(true);
            } else if (data.bg_photo) {
              setBgPhoto(data.bg_photo);
              setUploadedPhoto(data.bg_photo);
            }
            setFontColor((data as any).font_color || "#ffffff");
            if ((data as any).stickers) {
              try { setStickers(JSON.parse((data as any).stickers)); } catch {}
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
      font_color: fontColor,
      stickers: stickers.length > 0 ? JSON.stringify(stickers) : null,
    } as any;

    // Helper: strip columns that may not exist yet if the DB schema is behind
    const withFallback = (data: any, err: any) => {
      if (!err) return null;
      const msg: string = err?.message || "";
      if (msg.includes("font_color") || msg.includes("stickers") || err?.code === "PGRST116") {
        const { font_color, stickers: _s, ...safe } = data;
        return safe;
      }
      return null;
    };

    if (editCode && eventId) {
      let { error: updateError } = await supabase.from("events").update(eventData).eq("id", eventId);
      if (updateError) {
        const fallback = withFallback(eventData, updateError);
        if (fallback) ({ error: updateError } = await supabase.from("events").update(fallback).eq("id", eventId));
      }
      if (!updateError) navigate("/event/" + code);
    } else {
      let { error } = await supabase.from("events").insert(eventData);
      if (error) {
        const fallback = withFallback(eventData, error);
        if (fallback) ({ error } = await supabase.from("events").insert(fallback));
      }
      if (error) {
        if (error.code === "23505") {
          const newCode = generateCode();
          let { error: retryError } = await supabase.from("events").insert({ ...eventData, code: newCode });
          if (retryError) {
            const fallback = withFallback({ ...eventData, code: newCode }, retryError);
            if (fallback) ({ error: retryError } = await supabase.from("events").insert(fallback));
          }
          if (!retryError) { setEventCode(newCode); setShowCode(true); }
        }
        return;
      }
      setEventCode(code);
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

  const generateStyle = async () => {
    if (!buildItPrompt.trim()) return;
    setBuildItGenerating(true);
    setBuildItError(null);
    setBuildItResult(null);
    try {
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("VITE_ANTHROPIC_API_KEY is not set in .env");

      console.log("[BuildIt] Calling Anthropic API directly. Prompt:", buildItPrompt.trim());

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 512,
          system: BUILD_IT_SYSTEM_PROMPT,
          messages: [{ role: "user", content: `Design the perfect visual style for this event: ${buildItPrompt.trim()}` }],
        }),
      });

      const rawText = await res.text();
      console.log("[BuildIt] Anthropic status:", res.status, "| response (first 300):", rawText.slice(0, 300));

      if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${rawText.slice(0, 200)}`);

      const anthropicData = JSON.parse(rawText);
      const claudeText: string = anthropicData.content?.[0]?.text ?? "";
      if (!claudeText) throw new Error("Claude returned empty content");

      const jsonMatch = claudeText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Could not extract JSON from Claude response");

      const style = JSON.parse(jsonMatch[0]);
      style.template = "planit-custom";

      const required = ["bgColor", "bubbleColor", "bubbleTextColor", "fontStyle", "gradientColor"];
      for (const field of required) {
        if (!style[field]) throw new Error(`Missing field in Claude response: ${field}`);
      }
      if (!["Bold", "Handwritten", "Elegant"].includes(style.fontStyle)) style.fontStyle = "Bold";

      const validPatterns = [
        "planit-pattern:retro-stars", "planit-pattern:checkerboard", "planit-pattern:tie-dye",
        "planit-pattern:holographic", "planit-pattern:cherry-blossom", "planit-pattern:camo",
        "planit-pattern:blueprint", "planit-pattern:groovy",
      ];
      if (style.bgPattern && !validPatterns.includes(style.bgPattern)) style.bgPattern = null;
      if (!("bgPattern" in style)) style.bgPattern = null;

      console.log("[BuildIt] Style received:", JSON.stringify(style));
      setBuildItResult(style);
    } catch (err: any) {
      console.error("[BuildIt] generateStyle failed:", err?.message ?? err);
      setBuildItError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setBuildItGenerating(false);
    }
  };

  // Log whenever Build It style state actually changes after a render
  useEffect(() => {
    console.log("[BuildIt] ★ STATE RENDER — templateName:", templateName, "| bgColor:", bgColor, "| bubbleColor:", bubbleColor, "| fontStyle:", fontStyle, "| bgPreset:", bgPreset);
  }, [templateName, bgColor, bubbleColor, fontStyle, bgPreset]);

  const applyStyle = () => {
    if (!buildItResult) return;
    console.log("[BuildIt] applyStyle CALLED with:", JSON.stringify(buildItResult));
    console.log("[BuildIt] → setTemplateName('planit-custom')");
    setTemplateName("planit-custom");
    console.log("[BuildIt] → setBubbleColor:", buildItResult.bubbleColor);
    setBubbleColor(buildItResult.bubbleColor);
    console.log("[BuildIt] → setBubbleTextColor:", buildItResult.bubbleTextColor);
    setBubbleTextColor(buildItResult.bubbleTextColor);
    console.log("[BuildIt] → setBgColor:", buildItResult.bgColor);
    setBgColor(buildItResult.bgColor);
    // Compute font color based on whether bgColor is light or dark
    const bgLParts = buildItResult.bgColor.trim().split(/[\s,]+/);
    const bgL = parseFloat(bgLParts[2] ?? "0");
    const computedFontColor = bgL > 55 ? "#111111" : "#ffffff";
    console.log("[BuildIt] → setFontColor:", computedFontColor, "(bgL:", bgL, ")");
    setFontColor(computedFontColor);
    console.log("[BuildIt] → setFontStyle:", buildItResult.fontStyle);
    setFontStyle(buildItResult.fontStyle);
    console.log("[BuildIt] → setGradientColor:", buildItResult.gradientColor);
    setGradientColor(buildItResult.gradientColor);
    console.log("[BuildIt] → setBgPhoto(null), setBgPreset:", buildItResult.bgPattern ?? "null");
    setBgPhoto(null);
    setBgPreset(buildItResult.bgPattern ?? null);
    setBgPresetIsImage(false);
    console.log("[BuildIt] → setShowBuildIt(false) — closing modal");
    setShowBuildIt(false);
    setBuildItResult(null);
    setBuildItPrompt("");
    // Scroll to top so the user sees the updated layout
    window.scrollTo({ top: 0, behavior: "smooth" });
    console.log("[BuildIt] applyStyle dispatched — waiting for React re-render (see ★ STATE RENDER log)");
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

  const addSticker = (emoji: string) => {
    setStickers(prev => [...prev, { id: Date.now().toString(), emoji, x: Math.random()*60+15, y: Math.random()*35+12, size: 48 }]);
  };
  const deleteSticker = (id: string) => { setStickers(prev => prev.filter(s => s.id !== id)); setSelectedStickerId(null); };

  const handleStickerTouchStart = (e: React.TouchEvent, id: string) => {
    e.stopPropagation();
    setSelectedStickerId(prev => prev === id ? prev : id);
    const stk = stickers.find(s => s.id === id);
    if (!stk) return;
    if (e.touches.length === 1) {
      stickerDragRef.current = { id, startX: e.touches[0].clientX, startY: e.touches[0].clientY, sx: stk.x, sy: stk.y };
      stickerPinchRef.current = null;
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      stickerPinchRef.current = { id, initDist: Math.sqrt(dx*dx+dy*dy), initSize: stk.size };
      stickerDragRef.current = null;
    }
  };
  const handleStickerTouchMove = (e: React.TouchEvent, id: string) => {
    e.stopPropagation();
    if (e.touches.length === 1 && stickerDragRef.current?.id === id) {
      const rect = customContainerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dx = e.touches[0].clientX - stickerDragRef.current.startX;
      const dy = e.touches[0].clientY - stickerDragRef.current.startY;
      setStickers(prev => prev.map(s => s.id === id ? { ...s, x: Math.max(0,Math.min(88, stickerDragRef.current!.sx + (dx/rect.width)*100)), y: Math.max(0,Math.min(88, stickerDragRef.current!.sy + (dy/rect.height)*100)) } : s));
    } else if (e.touches.length === 2 && stickerPinchRef.current?.id === id) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx*dx+dy*dy);
      const newSize = Math.max(20, Math.min(120, stickerPinchRef.current.initSize * (dist/stickerPinchRef.current.initDist)));
      setStickers(prev => prev.map(s => s.id === id ? { ...s, size: newSize } : s));
    }
  };
  const handleStickerTouchEnd = (e: React.TouchEvent) => { e.stopPropagation(); stickerDragRef.current = null; stickerPinchRef.current = null; };

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

  const titleClass =
    textSize === "Small"
      ? "text-2xl font-bold"
      : textSize === "Large"
        ? "text-5xl font-extrabold"
        : "text-4xl font-extrabold";
  const vibeClass = textSize === "Small" ? "text-xs" : textSize === "Large" ? "text-base" : "text-sm";
  const currentFontFamily = FONT_MAP[fontStyle] || FONT_MAP["Bold"];
  const accentColor = `hsl(${bubbleColor})`;
  const accentText = `hsl(${bubbleTextColor})`;

  // Auto-contrast for default template text on bg
  const isLightBg = (() => {
    const parts = bgColor.trim().split(/[\s,]+/);
    const l = parseFloat(parts[2]);
    return l > 55;
  })();
  const bgTextColor = isLightBg ? "#111111" : "#ffffff";
  const bgTextMuted = isLightBg ? "rgba(17,17,17,0.6)" : "rgba(255,255,255,0.6)";
  const bgTextSoft = isLightBg ? "rgba(17,17,17,0.8)" : "rgba(255,255,255,0.8)";
  const noirFontSize = textSize === "Small" ? "28px" : textSize === "Large" ? "44px" : "36px";
  const isGalaxy = templateName === "galaxy";
  const isSunny = templateName === "sunny";
  const isMidnight = templateName === "midnight";
  const isOcean = templateName === "ocean";
  const isBlush = templateName === "blush";
  const isForest = templateName === "forest";
  const isCustom = templateName === "planit-custom";
  const customPatternKey = bgPreset?.startsWith("planit-pattern:") ? bgPreset : null;
  const customBgKey = (bgPreset?.startsWith("planit-pattern:") || bgPreset?.startsWith("solid-")) ? bgPreset : null;
  const customIsLight = customBgKey ? isLightPattern(customBgKey) : false;
  const customFrostBg = customIsLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.09)";
  const customFrostBorder = customIsLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.16)";
  const fontColorMuted = hexMuted(fontColor);
  const galaxyAccent = "#a78bfa";

  // Parsed date for calendar bubble preview
  const eventDate = dateTime ? new Date(dateTime) : null;
  const monthName = eventDate ? eventDate.toLocaleString(undefined, { month: "short" }).toUpperCase() : "";
  const dayNum = eventDate ? eventDate.getDate() : "";
  const timeStr = eventDate ? eventDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  const dayOfWeek = eventDate ? eventDate.toLocaleString(undefined, { weekday: "long" }) : "";

  const isNoir = templateName === "planit-noir";
  const isVintage = templateName === "vintage";
  const hostName = profile?.name || "Host";
  const containerBg = isVintage
    ? "#f5f0e8"
    : isGalaxy
      ? "#0d0d2b"
      : isSunny
        ? "transparent"
        : isMidnight
          ? `hsl(${bgColor})`
          : `hsl(${bgColor})`;

  return (
    <div
      className="flex flex-col min-h-screen transition-all duration-300"
      style={
        isCustom && customBgKey
          ? getPatternBgStyle(customBgKey)
          : {
              backgroundColor: isSunny ? "transparent" : containerBg,
              backgroundImage: isSunny ? "linear-gradient(180deg, #ff6b35 0%, #ff8c00 40%, #2a0e00 100%)" : "none",
            }
      }
    >
      {isNoir ? (
        /* ═══ PLANIT NOIR LAYOUT ═══ */
        <>
          {/* Concentric circle bg pattern */}
          <div className="relative" style={{ minHeight: "260px" }}>
            <ConcentricCircles accentColor={accentColor} />
            <button
              onClick={() => navigate(editCode ? `/event/${editCode}` : "/home")}
              className="absolute top-5 left-5 z-20"
              style={{ pointerEvents: "auto" }}
            >
              <ArrowLeft className="w-6 h-6 text-white/40" />
            </button>
            <div className="relative z-10 px-6 pt-16 pb-4">
              <p
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "13px",
                  fontStyle: "italic",
                  color: "rgba(255,255,255,0.4)",
                }}
              >
                you're invited to
              </p>
              <div className="mt-2">
                <StyledTitle
                  isInput
                  value={title}
                  onChange={(v) => {
                    setTitle(v);
                    setTitleError("");
                  }}
                  placeholder="Event name..."
                  accentColor={accentColor}
                  fontFamily={currentFontFamily}
                  fontSize={noirFontSize}
                />
              </div>
              {titleError && <p className="text-red-500 text-xs mt-1">{titleError}</p>}
              <textarea
                value={vibe}
                onChange={(e) => setVibe(e.target.value)}
                placeholder="Set the vibe..."
                rows={1}
                maxLength={120}
                className="w-full bg-transparent outline-none resize-none mt-1 placeholder:text-white/15"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "13px",
                  fontStyle: "italic",
                  color: "rgba(255,255,255,0.4)",
                }}
              />
              <HostDivider hostName={hostName} />
            </div>
          </div>

          <div className="px-5 pt-2 pb-10 flex flex-col gap-3">
            {/* Date + Dress code side by side */}
            <div className="flex gap-3">
              <NoirDateCard
                monthName={monthName}
                dayNum={String(dayNum)}
                timeStr={timeStr}
                isInput
                dateTime={dateTime}
                onDateChange={setDateTime}
                accentColor={accentColor}
              />
              <NoirDressCard dressCode={dressCode} isInput onChange={setDressCode} />
            </div>

            {/* Location */}
            <NoirLocationCard location={location} isInput onChange={setLocation} accentColor={accentColor} />

            {/* Notes */}
            <NoirNotesCard notes={extra} isInput onChange={setExtra} accentColor={accentColor} />
          </div>
        </>
      ) : isSunny ? (
        /* ═══ SUNNY LAYOUT ═══ */
        <>
          <div
            style={{
              background: "linear-gradient(180deg, #ff6b35 0%, #ff8c00 40%, #2a0e00 100%)",
              minHeight: "100vh",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "-60px",
                right: "-60px",
                width: "180px",
                height: "180px",
                borderRadius: "50%",
                background: "rgba(255,200,100,0.15)",
                pointerEvents: "none",
              }}
            />
            <button
              onClick={() => navigate(editCode ? `/event/${editCode}` : "/home")}
              className="absolute top-5 left-5 z-20"
            >
              <ArrowLeft className="w-6 h-6 text-white/60" />
            </button>
            <div className="text-center px-6 pt-16 pb-4 relative z-10">
              <p
                style={{
                  fontFamily: "'Caveat', cursive",
                  fontSize: "14px",
                  color: "rgba(255,255,255,0.6)",
                  fontStyle: "italic",
                  marginBottom: "4px",
                }}
              >
                you're invited to
              </p>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setTitleError("");
                }}
                placeholder="Event name..."
                className="w-full bg-transparent outline-none text-center placeholder:opacity-30"
                style={{ fontFamily: "'Caveat', cursive", fontSize: "52px", fontWeight: 700, color: "#fff" }}
              />
              {titleError && <p className="text-red-500 text-xs mt-1">{titleError}</p>}
              <textarea
                value={vibe}
                onChange={(e) => setVibe(e.target.value)}
                placeholder="Set the vibe..."
                rows={1}
                maxLength={120}
                className="w-full bg-transparent outline-none resize-none mt-1 text-center placeholder:opacity-30"
                style={{
                  fontFamily: "'Caveat', cursive",
                  fontSize: "16px",
                  fontStyle: "italic",
                  color: "rgba(255,255,255,0.7)",
                }}
              />
              <p
                style={{
                  fontFamily: "'Caveat', cursive",
                  fontSize: "13px",
                  color: "rgba(255,255,255,0.4)",
                  marginTop: "6px",
                  marginBottom: "12px",
                }}
              >
                hosted by {hostName}
              </p>
              <div className="flex items-center gap-3 justify-center">
                <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.2)" }} />
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "16px" }}>☀</span>
                <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.2)" }} />
              </div>
            </div>

            <div className="px-5 flex flex-col gap-3 relative z-10 pb-6">
              <div
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "1px solid rgba(255,255,255,0.35)",
                  borderRadius: "50px",
                  padding: "10px 20px",
                  position: "relative",
                }}
              >
                <div style={{ textAlign: "center" as const }}>
                  <span
                    style={{
                      fontFamily: "'Caveat', cursive",
                      fontSize: "20px",
                      fontWeight: 700,
                      color: location ? "#fff" : "rgba(255,255,255,0.4)",
                    }}
                  >
                    📍 {location || "Where's the event?"}
                  </span>
                </div>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    opacity: 0,
                    cursor: "text",
                    zIndex: 10,
                  }}
                />
              </div>

              <div
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "1px solid rgba(255,255,255,0.35)",
                  borderRadius: "50px",
                  padding: "10px 20px",
                  textAlign: "center" as const,
                  position: "relative",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Caveat', cursive",
                    fontSize: "20px",
                    fontWeight: 700,
                    color: eventDate ? "#fff" : "rgba(255,255,255,0.4)",
                  }}
                >
                  🗓️ {eventDate ? `${dayOfWeek} ${dayNum} ${monthName} · ${timeStr}` : "When's the event?"}
                </span>
                <input
                  type="datetime-local"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    opacity: 0,
                    cursor: "pointer",
                    zIndex: 10,
                  }}
                />
              </div>

              <div
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "1px solid rgba(255,255,255,0.35)",
                  borderRadius: "50px",
                  padding: "10px 20px",
                  position: "relative",
                }}
              >
                <div style={{ textAlign: "center" as const }}>
                  <span
                    style={{
                      fontFamily: "'Caveat', cursive",
                      fontSize: "20px",
                      fontWeight: 700,
                      color: dressCode ? "#fff" : "rgba(255,255,255,0.4)",
                    }}
                  >
                    🎭 {dressCode || "Theme..."}
                  </span>
                </div>
                <input
                  type="text"
                  value={dressCode}
                  onChange={(e) => setDressCode(e.target.value)}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    opacity: 0,
                    cursor: "text",
                    zIndex: 10,
                  }}
                />
              </div>

              <div
                style={{
                  background: "rgba(0,0,0,0.25)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "20px",
                  padding: "12px 16px",
                }}
              >
                <p
                  style={{
                    fontSize: "9px",
                    color: "rgba(255,255,255,0.5)",
                    textTransform: "uppercase" as const,
                    letterSpacing: "2px",
                    margin: "0 0 4px",
                    fontFamily: "sans-serif",
                    textAlign: "center" as const,
                  }}
                >
                  ✦ from the host
                </p>
                <textarea
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  placeholder="Anything else your guests should know..."
                  rows={2}
                  className="w-full bg-transparent outline-none resize-none placeholder:opacity-30 text-center"
                  style={{
                    fontFamily: "'Caveat', cursive",
                    fontSize: "17px",
                    color: "rgba(255,255,255,0.85)",
                    fontStyle: "italic",
                  }}
                />
              </div>
            </div>
          </div>
        </>
      ) : isMidnight ? (
        /* ═══ MIDNIGHT LAYOUT ═══ */
        <>
          <div style={{ backgroundColor: containerBg, minHeight: "100vh" }}>
            <button
              onClick={() => navigate(editCode ? `/event/${editCode}` : "/home")}
              className="absolute top-5 left-5 z-20"
            >
              <ArrowLeft className="w-6 h-6" style={{ color: accentColor }} />
            </button>

            <div className="px-5 pt-16 pb-4">
              <div className="flex gap-3">
                <div style={{ width: "4px", borderRadius: "2px", backgroundColor: accentColor, flexShrink: 0 }} />
                <div className="flex-1">
                  <textarea
                    value={vibe}
                    onChange={(e) => setVibe(e.target.value)}
                    placeholder="EVENT TYPE (e.g. Birthday Party)"
                    rows={1}
                    maxLength={60}
                    className="w-full bg-transparent outline-none resize-none placeholder:opacity-30 uppercase"
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "10px",
                      fontWeight: 700,
                      letterSpacing: "0.18em",
                      color: isLightBg ? "#888" : "#555",
                    }}
                  />
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setTitleError("");
                    }}
                    placeholder="Event name..."
                    className="w-full bg-transparent outline-none placeholder:opacity-30"
                    style={{
                      fontFamily: currentFontFamily,
                      fontSize: noirFontSize,
                      fontWeight: 900,
                      color: bgTextColor,
                      lineHeight: 1.1,
                    }}
                  />
                  {titleError && <p className="text-red-500 text-xs mt-1">{titleError}</p>}
                  <p
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "11px",
                      color: isLightBg ? "#999" : "#555",
                      marginTop: "6px",
                    }}
                  >
                    hosted by {hostName}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-5 pb-10 flex flex-col gap-3">
              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: "10px" }}>
                <div
                  style={{
                    backgroundColor: `${accentColor}22`,
                    border: `1px solid ${accentColor}40`,
                    borderRadius: "12px",
                    padding: "10px 8px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "8px",
                      fontWeight: 700,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase" as const,
                      color: accentColor,
                    }}
                  >
                    {monthName || "DATE"}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "30px",
                      fontWeight: 900,
                      color: bgTextColor,
                      lineHeight: 1,
                    }}
                  >
                    {dayNum || "?"}
                  </span>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", color: accentColor, opacity: 0.6, marginTop: "2px" }}>
                    {timeStr}
                  </span>
                  <input
                    type="datetime-local"
                    value={dateTime}
                    onChange={(e) => setDateTime(e.target.value)}
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      opacity: 0,
                      cursor: "pointer",
                      zIndex: 10,
                    }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div>
                    <p
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "8px",
                        fontWeight: 700,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase" as const,
                        color: accentColor,
                      }}
                    >
                      📍 Location
                    </p>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Where's the event?"
                      className="w-full bg-transparent outline-none placeholder:opacity-30"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "15px",
                        fontWeight: 700,
                        color: bgTextColor,
                        marginTop: "2px",
                      }}
                    />
                  </div>
                  <div style={{ height: "1px", backgroundColor: isLightBg ? "#e5e5e5" : "#222" }} />
                  <div>
                    <p
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "8px",
                        fontWeight: 700,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase" as const,
                        color: accentColor,
                      }}
                    >
                      🎭 Dress code
                    </p>
                    <input
                      type="text"
                      value={dressCode}
                      onChange={(e) => setDressCode(e.target.value)}
                      placeholder="Theme..."
                      className="w-full bg-transparent outline-none placeholder:opacity-30"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: "15px",
                        fontWeight: 700,
                        color: bgTextColor,
                        marginTop: "2px",
                      }}
                    />
                  </div>
                </div>
              </div>

              <div
                style={{ backgroundColor: isLightBg ? "#f5f5f5" : "#111", borderRadius: "12px", padding: "12px 14px" }}
              >
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "8px",
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase" as const,
                    color: isLightBg ? "#888" : "#444",
                    marginBottom: "4px",
                  }}
                >
                  From the host
                </p>
                <textarea
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  placeholder="Anything else your guests should know..."
                  rows={2}
                  className="w-full bg-transparent outline-none resize-none placeholder:opacity-30"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "13px",
                    color: isLightBg ? "#333" : "#aaa",
                    lineHeight: 1.5,
                  }}
                />
              </div>
            </div>
          </div>
        </>
      ) : isOcean ? (
        /* ═══ OCEAN LAYOUT ═══ */
        <>
          <div style={{ backgroundColor: "#0c1929", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: "-80px", right: "-80px", width: "280px", height: "280px", borderRadius: "50%", background: "radial-gradient(circle, rgba(56,189,248,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: "120px", left: "-50px", width: "160px", height: "160px", borderRadius: "50%", background: "radial-gradient(circle, rgba(14,165,233,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />

            <button onClick={() => navigate(editCode ? `/event/${editCode}` : "/home")} className="absolute top-5 left-5 z-20">
              <ArrowLeft className="w-6 h-6" style={{ color: "rgba(56,189,248,0.6)" }} />
            </button>

            {/* Header */}
            <div className="px-5 pt-16 pb-2 relative z-10 text-center">
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase" as const, color: "rgba(56,189,248,0.55)", marginBottom: "10px" }}>
                You're Invited
              </p>
              <input
                type="text"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setTitleError(""); }}
                placeholder="Event name..."
                className="w-full bg-transparent outline-none text-center placeholder:opacity-20"
                style={{ fontFamily: "'Inter', sans-serif", fontSize: noirFontSize, fontWeight: 900, color: "#ffffff", lineHeight: 1.1 }}
              />
              {titleError && <p className="text-red-400 text-xs mt-1">{titleError}</p>}
              <textarea
                value={vibe}
                onChange={(e) => setVibe(e.target.value)}
                placeholder="Add a tagline..."
                rows={1}
                maxLength={80}
                className="w-full bg-transparent outline-none resize-none text-center placeholder:opacity-20 mt-1"
                style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", fontStyle: "italic", color: "rgba(56,189,248,0.45)" }}
              />
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", color: "rgba(56,189,248,0.35)", marginTop: "6px" }}>
                hosted by {hostName}
              </p>
              <div style={{ margin: "14px 0 4px" }}>
                <svg viewBox="0 0 320 20" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "20px", display: "block" }}>
                  <path d="M0,10 C26.7,2 53.3,18 80,10 C106.7,2 133.3,18 160,10 C186.7,2 213.3,18 240,10 C266.7,2 293.3,18 320,10" stroke="rgba(56,189,248,0.22)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* Stat cards + fields */}
            <div className="px-5 pb-10 relative z-10 flex flex-col gap-3">
              {/* Three stat cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                {/* DAY */}
                <div style={{ backgroundColor: "rgba(56,189,248,0.07)", border: "1px solid rgba(56,189,248,0.15)", borderRadius: "16px", padding: "14px 8px", textAlign: "center" as const, position: "relative" }}>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "7px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: "rgba(56,189,248,0.5)", marginBottom: "8px" }}>Day</p>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "34px", fontWeight: 900, color: "#fff", lineHeight: 1, display: "block" }}>{dayNum || "—"}</span>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 700, color: accentColor, textTransform: "uppercase" as const, letterSpacing: "0.1em", marginTop: "5px", opacity: 0.8 }}>{monthName || "TBD"}</p>
                  <input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", zIndex: 10 }} />
                </div>
                {/* TIME */}
                <div style={{ backgroundColor: "rgba(56,189,248,0.07)", border: "1px solid rgba(56,189,248,0.15)", borderRadius: "16px", padding: "14px 8px", textAlign: "center" as const, position: "relative" }}>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "7px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: "rgba(56,189,248,0.5)", marginBottom: "8px" }}>Time</p>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: eventDate ? "17px" : "28px", fontWeight: 900, color: eventDate ? "#fff" : "rgba(255,255,255,0.18)", lineHeight: 1, display: "block" }}>{eventDate ? timeStr : "—"}</span>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 700, color: accentColor, textTransform: "uppercase" as const, letterSpacing: "0.06em", marginTop: "5px", opacity: 0.7 }}>{dayOfWeek ? dayOfWeek.slice(0, 3).toUpperCase() : "TBD"}</p>
                  <input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", zIndex: 10 }} />
                </div>
                {/* GOING */}
                <div style={{ backgroundColor: "rgba(56,189,248,0.07)", border: "1px solid rgba(56,189,248,0.15)", borderRadius: "16px", padding: "14px 8px", textAlign: "center" as const }}>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "7px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: "rgba(56,189,248,0.5)", marginBottom: "8px" }}>Going</p>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "34px", fontWeight: 900, color: "#fff", lineHeight: 1, display: "block" }}>0</span>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 700, color: accentColor, textTransform: "uppercase" as const, letterSpacing: "0.1em", marginTop: "5px", opacity: 0.8 }}>Guests</p>
                </div>
              </div>

              {/* Location pill */}
              <div style={{ backgroundColor: "rgba(56,189,248,0.07)", border: "1px solid rgba(56,189,248,0.15)", borderRadius: "50px", padding: "14px 22px", position: "relative" }}>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "7px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: "rgba(56,189,248,0.5)", marginBottom: "4px" }}>📍 Location</p>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "16px", fontWeight: 700, color: location ? "#fff" : "rgba(255,255,255,0.18)" }}>{location || "Where's the event?"}</p>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "text", zIndex: 10 }} />
              </div>

              {/* Dress code pill */}
              <div style={{ backgroundColor: "rgba(56,189,248,0.07)", border: "1px solid rgba(56,189,248,0.15)", borderRadius: "50px", padding: "14px 22px", position: "relative" }}>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "7px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: "rgba(56,189,248,0.5)", marginBottom: "4px" }}>🎭 Dress Code</p>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "16px", fontWeight: 700, color: dressCode ? "#fff" : "rgba(255,255,255,0.18)" }}>{dressCode || "Theme..."}</p>
                <input type="text" value={dressCode} onChange={(e) => setDressCode(e.target.value)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "text", zIndex: 10 }} />
              </div>

              {/* Notes */}
              <div style={{ backgroundColor: "rgba(10,25,50,0.8)", border: "1px solid rgba(56,189,248,0.1)", borderRadius: "16px", padding: "14px 16px" }}>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "7px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: "rgba(56,189,248,0.45)", marginBottom: "6px" }}>From the host</p>
                <textarea
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  placeholder="Anything else your guests should know..."
                  rows={2}
                  className="w-full bg-transparent outline-none resize-none placeholder:opacity-20"
                  style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}
                />
              </div>
            </div>
          </div>
        </>
      ) : isBlush ? (
        /* ═══ BLUSH LAYOUT ═══ */
        <>
          <div style={{ backgroundColor: "#1a0a10", minHeight: "100vh", position: "relative" }}>
            <button onClick={() => navigate(editCode ? `/event/${editCode}` : "/home")} className="absolute top-5 left-5 z-20">
              <ArrowLeft className="w-6 h-6" style={{ color: "rgba(244,114,182,0.6)" }} />
            </button>

            {/* Header: vibe pill top-left, title, hosted by */}
            <div className="px-5 pt-14 pb-3 relative z-10">
              <div style={{ display: "inline-block", position: "relative", marginBottom: "12px" }}>
                <div style={{ backgroundColor: "rgba(244,114,182,0.14)", border: "1px solid rgba(244,114,182,0.3)", borderRadius: "50px", padding: "4px 14px" }}>
                  <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" as const, color: vibe ? "#f472b6" : "rgba(244,114,182,0.35)" }}>{vibe || "Event type..."}</span>
                </div>
                <input type="text" value={vibe} onChange={(e) => setVibe(e.target.value)} maxLength={40} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "text", zIndex: 10 }} />
              </div>
              <input type="text" value={title} onChange={(e) => { setTitle(e.target.value); setTitleError(""); }} placeholder="Event name..." className="w-full bg-transparent outline-none placeholder:opacity-20 block" style={{ fontFamily: "'Playfair Display', serif", fontSize: noirFontSize, fontWeight: 900, color: "#ffffff", lineHeight: 1.1, marginBottom: "6px" }} />
              {titleError && <p className="text-red-400 text-xs mt-1">{titleError}</p>}
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "rgba(244,114,182,0.4)" }}>hosted by {hostName}</p>
            </div>

            {/* Full-width striped stat bar — no rounded corners */}
            <div style={{ display: "flex", borderTop: "1px solid rgba(244,114,182,0.2)", borderBottom: "1px solid rgba(244,114,182,0.2)", marginBottom: "0" }}>
              <div style={{ flex: 1, backgroundColor: "rgba(244,114,182,0.12)", padding: "16px 8px", textAlign: "center" as const, position: "relative", borderRight: "1px solid rgba(244,114,182,0.2)" }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "30px", fontWeight: 900, color: "#fff", display: "block", lineHeight: 1 }}>{dayNum || "—"}</span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" as const, color: "#f472b6", marginTop: "5px", display: "block" }}>{monthName || "TBD"}</span>
                <input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", zIndex: 10 }} />
              </div>
              <div style={{ flex: 1, backgroundColor: "rgba(244,114,182,0.12)", padding: "16px 8px", textAlign: "center" as const, position: "relative", borderRight: "1px solid rgba(244,114,182,0.2)" }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: eventDate ? "20px" : "30px", fontWeight: 900, color: eventDate ? "#fff" : "rgba(255,255,255,0.2)", display: "block", lineHeight: 1 }}>{timeStr || "—"}</span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" as const, color: "#f472b6", marginTop: "5px", display: "block" }}>Start</span>
                <input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", zIndex: 10 }} />
              </div>
              <div style={{ flex: 1, backgroundColor: "rgba(244,114,182,0.12)", padding: "16px 8px", textAlign: "center" as const }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "30px", fontWeight: 900, color: "#fff", display: "block", lineHeight: 1 }}>0</span>
                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" as const, color: "#f472b6", marginTop: "5px", display: "block" }}>Going</span>
              </div>
            </div>

            {/* Fields */}
            <div className="px-5 pt-4 pb-10 relative z-10 flex flex-col gap-3">
              <div style={{ backgroundColor: "rgba(244,114,182,0.08)", border: "1px solid rgba(244,114,182,0.2)", borderRadius: "12px", padding: "14px 16px", position: "relative" }}>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: "rgba(244,114,182,0.6)", marginBottom: "6px" }}>Location</p>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", fontWeight: 700, color: location ? "#fff" : "rgba(255,255,255,0.2)", lineHeight: 1.2 }}>{location || "Where's the event?"}</p>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "text", zIndex: 10 }} />
              </div>
              <div style={{ backgroundColor: "rgba(244,114,182,0.08)", border: "1px solid rgba(244,114,182,0.2)", borderRadius: "12px", padding: "14px 16px", position: "relative" }}>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: "rgba(244,114,182,0.6)", marginBottom: "6px" }}>Dress Code</p>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", fontWeight: 700, color: dressCode ? "#fff" : "rgba(255,255,255,0.2)", lineHeight: 1.2 }}>{dressCode || "Theme..."}</p>
                <input type="text" value={dressCode} onChange={(e) => setDressCode(e.target.value)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "text", zIndex: 10 }} />
              </div>
              <div style={{ backgroundColor: "rgba(244,114,182,0.05)", border: "1px solid rgba(244,114,182,0.12)", borderRadius: "12px", padding: "12px 16px" }}>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" as const, color: "rgba(244,114,182,0.5)", marginBottom: "6px" }}>From the host</p>
                <textarea value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Anything else your guests should know..." rows={2} className="w-full bg-transparent outline-none resize-none placeholder:opacity-20" style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }} />
              </div>
            </div>
          </div>
        </>
      ) : isForest ? (
        /* ═══ FOREST LAYOUT ═══ */
        <>
          <div style={{ backgroundColor: "#0a1f0a", minHeight: "100vh", position: "relative" }}>
            <div style={{ position: "absolute", inset: "10px", border: "1px solid rgba(74,222,128,0.1)", borderRadius: "6px", pointerEvents: "none" as const, zIndex: 0 }} />
            <button onClick={() => navigate(editCode ? `/event/${editCode}` : "/home")} className="absolute top-5 left-5 z-20">
              <ArrowLeft className="w-6 h-6" style={{ color: "rgba(74,222,128,0.6)" }} />
            </button>

            {/* Header */}
            <div className="px-6 pt-14 pb-4 relative z-10">
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase" as const, color: "rgba(74,222,128,0.5)", marginBottom: "10px" }}>An Invitation</p>
              <input type="text" value={title} onChange={(e) => { setTitle(e.target.value); setTitleError(""); }} placeholder="Event name..." className="w-full bg-transparent outline-none placeholder:opacity-20 block" style={{ fontFamily: "'Playfair Display', serif", fontSize: noirFontSize, fontWeight: 900, color: "#ffffff", lineHeight: 1.1, marginBottom: "6px" }} />
              {titleError && <p className="text-red-400 text-xs mt-1">{titleError}</p>}
              <textarea value={vibe} onChange={(e) => setVibe(e.target.value)} placeholder="Add a tagline..." rows={1} maxLength={80} className="w-full bg-transparent outline-none resize-none placeholder:opacity-20" style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", fontStyle: "italic", color: "rgba(74,222,128,0.45)", marginBottom: "14px" }} />

              {/* Diamond divider */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                <div style={{ flex: 1, height: "1px", backgroundColor: "rgba(74,222,128,0.25)" }} />
                <span style={{ color: "rgba(74,222,128,0.6)", fontSize: "13px" }}>◆</span>
                <div style={{ flex: 1, height: "1px", backgroundColor: "rgba(74,222,128,0.25)" }} />
              </div>

              {/* Single inline date · time · going — overlaid with datetime picker */}
              <div style={{ position: "relative" }}>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "14px", fontWeight: 500, color: "rgba(255,255,255,0.75)", letterSpacing: "0.01em" }}>
                  {dayNum ? `${dayNum} ${monthName}` : "—"}
                  <span style={{ color: "rgba(74,222,128,0.45)", margin: "0 8px" }}>·</span>
                  {timeStr || "—"}
                  <span style={{ color: "rgba(74,222,128,0.45)", margin: "0 8px" }}>·</span>
                  0 going
                </p>
                <input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", zIndex: 10 }} />
              </div>
            </div>

            {/* Fields */}
            <div className="px-5 pb-10 relative z-10 flex flex-col gap-3">
              <div style={{ backgroundColor: "rgba(74,222,128,0.13)", border: "1px solid rgba(74,222,128,0.28)", borderRadius: "14px", padding: "14px 16px", position: "relative" }}>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase" as const, color: "rgba(74,222,128,0.7)", marginBottom: "6px" }}>Location</p>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", fontWeight: 700, color: location ? "#fff" : "rgba(255,255,255,0.2)", lineHeight: 1.2 }}>{location || "Where's the event?"}</p>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "text", zIndex: 10 }} />
              </div>
              <div style={{ backgroundColor: "rgba(74,222,128,0.13)", border: "1px solid rgba(74,222,128,0.28)", borderRadius: "14px", padding: "14px 16px", position: "relative" }}>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase" as const, color: "rgba(74,222,128,0.7)", marginBottom: "6px" }}>Dress Code</p>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "20px", fontWeight: 700, color: dressCode ? "#fff" : "rgba(255,255,255,0.2)", lineHeight: 1.2 }}>{dressCode || "Theme..."}</p>
                <input type="text" value={dressCode} onChange={(e) => setDressCode(e.target.value)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "text", zIndex: 10 }} />
              </div>
              <div style={{ border: "1px solid rgba(74,222,128,0.15)", borderRadius: "12px", padding: "12px 16px" }}>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: "rgba(74,222,128,0.5)", marginBottom: "6px" }}>From the host</p>
                <textarea value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Anything else your guests should know..." rows={2} className="w-full bg-transparent outline-none resize-none placeholder:opacity-20" style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }} />
              </div>
            </div>
          </div>
        </>
      ) : isGalaxy ? (
        /* ═══ GALAXY LAYOUT ═══ */
        <>
          <div style={{ backgroundColor: "#0d0d2b", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
            <div
              style={{
                position: "absolute",
                top: "-40px",
                right: "-40px",
                width: "140px",
                height: "140px",
                borderRadius: "50%",
                background: "rgba(147,51,234,0.18)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "80px",
                left: "-30px",
                width: "90px",
                height: "90px",
                borderRadius: "50%",
                background: "rgba(236,72,153,0.12)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "200px",
                right: "-20px",
                width: "70px",
                height: "70px",
                borderRadius: "50%",
                background: "rgba(99,102,241,0.15)",
                pointerEvents: "none",
              }}
            />

            <button
              onClick={() => navigate(editCode ? `/event/${editCode}` : "/home")}
              className="absolute top-5 left-5 z-20"
            >
              <ArrowLeft className="w-6 h-6" style={{ color: "rgba(255,255,255,0.4)" }} />
            </button>

            <div className="text-center px-6 pt-16 pb-4 relative z-10">
              <p
                style={{
                  fontSize: "10px",
                  color: galaxyAccent,
                  letterSpacing: "2px",
                  textTransform: "uppercase" as const,
                  marginBottom: "6px",
                  fontFamily: "sans-serif",
                }}
              >
                ✦ You are invited to ✦
              </p>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setTitleError("");
                }}
                placeholder="Event name..."
                className="w-full bg-transparent outline-none text-center placeholder:opacity-30"
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: noirFontSize, fontWeight: 800, color: "#fff" }}
              />
              {titleError && <p className="text-red-500 text-xs mt-1">{titleError}</p>}
              <textarea
                value={vibe}
                onChange={(e) => setVibe(e.target.value)}
                placeholder="Set the vibe..."
                rows={1}
                maxLength={120}
                className="w-full bg-transparent outline-none resize-none mt-1 text-center placeholder:opacity-30"
                style={{
                  fontSize: "13px",
                  color: "rgba(255,255,255,0.45)",
                  fontStyle: "italic",
                  fontFamily: "sans-serif",
                }}
              />
              <p
                style={{
                  fontSize: "11px",
                  color: "rgba(255,255,255,0.3)",
                  fontFamily: "sans-serif",
                  marginTop: "6px",
                  marginBottom: "10px",
                }}
              >
                hosted by {hostName}
              </p>
              <div
                style={{
                  width: "40px",
                  height: "2px",
                  background: `linear-gradient(90deg, ${galaxyAccent}, #ec4899)`,
                  margin: "0 auto",
                }}
              />
            </div>

            <div className="px-5 flex flex-col gap-3 relative z-10 pb-6">
              <div
                style={{
                  background: "rgba(168,85,247,0.12)",
                  border: "1px solid rgba(168,85,247,0.3)",
                  borderRadius: "14px",
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                }}
              >
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    background: "rgba(168,85,247,0.25)",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "22px",
                    flexShrink: 0,
                  }}
                >
                  📍
                </div>
                <div className="flex-1">
                  <p
                    style={{
                      fontSize: "9px",
                      color: galaxyAccent,
                      textTransform: "uppercase" as const,
                      letterSpacing: "2px",
                      margin: "0 0 3px",
                      fontFamily: "sans-serif",
                    }}
                  >
                    Location
                  </p>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Where's the event?"
                    className="w-full bg-transparent outline-none placeholder:opacity-30"
                    style={{ fontSize: "16px", fontWeight: 800, color: "#fff", fontFamily: "sans-serif" }}
                  />
                </div>
              </div>

              <div
                style={{
                  background: "rgba(236,72,153,0.12)",
                  border: "1px solid rgba(236,72,153,0.3)",
                  borderRadius: "14px",
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                }}
              >
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    background: "rgba(236,72,153,0.25)",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "22px",
                    flexShrink: 0,
                  }}
                >
                  🗓️
                </div>
                <div className="flex-1">
                  <p
                    style={{
                      fontSize: "9px",
                      color: "#ec4899",
                      textTransform: "uppercase" as const,
                      letterSpacing: "2px",
                      margin: "0 0 3px",
                      fontFamily: "sans-serif",
                    }}
                  >
                    Date
                  </p>
                  {eventDate ? (
                    <p
                      style={{ fontSize: "16px", fontWeight: 800, color: "#fff", margin: 0, fontFamily: "sans-serif" }}
                    >
                      {dayOfWeek} {dayNum} {monthName} · {timeStr}
                    </p>
                  ) : (
                    <p
                      style={{
                        fontSize: "16px",
                        fontWeight: 800,
                        color: "rgba(255,255,255,0.3)",
                        margin: 0,
                        fontFamily: "sans-serif",
                      }}
                    >
                      When's the event?
                    </p>
                  )}
                  <input
                    type="datetime-local"
                    value={dateTime}
                    onChange={(e) => setDateTime(e.target.value)}
                    className="w-full bg-transparent outline-none text-[10px] mt-1 opacity-50"
                    style={{ color: "#ec4899" }}
                  />
                </div>
              </div>

              <div
                style={{
                  background: "rgba(99,102,241,0.12)",
                  border: "1px solid rgba(99,102,241,0.3)",
                  borderRadius: "14px",
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                }}
              >
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    background: "rgba(99,102,241,0.25)",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "22px",
                    flexShrink: 0,
                  }}
                >
                  🎭
                </div>
                <div className="flex-1">
                  <p
                    style={{
                      fontSize: "9px",
                      color: "#818cf8",
                      textTransform: "uppercase" as const,
                      letterSpacing: "2px",
                      margin: "0 0 3px",
                      fontFamily: "sans-serif",
                    }}
                  >
                    Dress code
                  </p>
                  <input
                    type="text"
                    value={dressCode}
                    onChange={(e) => setDressCode(e.target.value)}
                    placeholder="Theme..."
                    className="w-full bg-transparent outline-none placeholder:opacity-30"
                    style={{ fontSize: "16px", fontWeight: 800, color: "#fff", fontFamily: "sans-serif" }}
                  />
                </div>
              </div>

              <div
                style={{
                  background: "rgba(168,85,247,0.08)",
                  border: "1px solid rgba(168,85,247,0.15)",
                  borderRadius: "14px",
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "14px",
                }}
              >
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    background: "rgba(168,85,247,0.15)",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "22px",
                    flexShrink: 0,
                  }}
                >
                  ✦
                </div>
                <div className="flex-1">
                  <p
                    style={{
                      fontSize: "9px",
                      color: galaxyAccent,
                      textTransform: "uppercase" as const,
                      letterSpacing: "2px",
                      margin: "0 0 3px",
                      fontFamily: "sans-serif",
                    }}
                  >
                    Note from host
                  </p>
                  <textarea
                    value={extra}
                    onChange={(e) => setExtra(e.target.value)}
                    placeholder="Anything else your guests should know..."
                    rows={2}
                    className="w-full bg-transparent outline-none resize-none placeholder:opacity-30"
                    style={{
                      fontSize: "13px",
                      color: "rgba(255,255,255,0.55)",
                      fontStyle: "italic",
                      fontFamily: "sans-serif",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      ) : isVintage ? (
        /* ═══ VINTAGE LAYOUT ═══ */
        <>
          <div className="relative" style={{ minHeight: "260px" }}>
            <VintageCircles />
            <button
              onClick={() => navigate(editCode ? `/event/${editCode}` : "/home")}
              className="absolute top-5 left-5 z-20"
            >
              <ArrowLeft className="w-6 h-6" style={{ color: gradientColor }} />
            </button>
            <div className="relative z-10 px-6 pt-16 pb-4 text-center">
              <p
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.2em",
                  color: gradientColor,
                  textTransform: "uppercase",
                }}
              >
                you're invited to
              </p>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setTitleError("");
                }}
                placeholder="Event name..."
                className="w-full bg-transparent outline-none text-center mt-2 placeholder:opacity-30"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: noirFontSize,
                  fontWeight: 900,
                  color: "#2c1810",
                }}
              />
              {titleError && <p className="text-red-500 text-xs mt-1">{titleError}</p>}
              <textarea
                value={vibe}
                onChange={(e) => setVibe(e.target.value)}
                placeholder="Set the vibe..."
                rows={1}
                maxLength={120}
                className="w-full bg-transparent outline-none resize-none mt-1 text-center placeholder:opacity-30"
                style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: "14px",
                  fontStyle: "italic",
                  color: gradientColor,
                }}
              />
              <VintageHostDivider hostName={hostName} accentColor={gradientColor} />
            </div>
          </div>

          <div className="px-5 pt-2 pb-10 flex flex-col gap-3">
            {/* Location */}
            <div className="overflow-hidden" style={{ backgroundColor: gradientColor, borderRadius: "16px" }}>
              <div className="px-4 py-1.5" style={{ backgroundColor: "rgba(0,0,0,0.2)" }}>
                <span
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.18em",
                    color: "#f5f0e8",
                    textTransform: "uppercase",
                  }}
                >
                  Location
                </span>
              </div>
              <div className="p-4">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Where's the event?"
                  className="w-full bg-transparent outline-none placeholder:opacity-40"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "20px",
                    fontWeight: 900,
                    color: "#2c1810",
                  }}
                />
              </div>
            </div>

            {/* Date + Dress code row */}
            <div className="flex gap-3">
              {/* Date */}
              <div
                className="flex-1 overflow-hidden"
                style={{ borderRadius: "16px", backgroundColor: "#2c1810", position: "relative" }}
              >
                <div className="px-3 py-1.5 text-center" style={{ backgroundColor: "rgba(0,0,0,0.2)" }}>
                  <span
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: "10px",
                      fontWeight: 700,
                      letterSpacing: "0.15em",
                      color: gradientColor,
                      textTransform: "uppercase",
                    }}
                  >
                    {monthName || "DATE"}
                  </span>
                </div>
                <div className="flex flex-col items-center py-3 px-3">
                  {eventDate ? (
                    <>
                      <span
                        style={{
                          fontFamily: "'Playfair Display', serif",
                          fontSize: "36px",
                          fontWeight: 900,
                          color: "#f5f0e8",
                          lineHeight: 1,
                        }}
                      >
                        {dayNum}
                      </span>
                      <span
                        style={{
                          fontFamily: "'Playfair Display', serif",
                          fontSize: "11px",
                          fontWeight: 600,
                          color: gradientColor,
                          opacity: 0.8,
                          marginTop: "4px",
                        }}
                      >
                        {timeStr}
                      </span>
                      <span
                        style={{
                          fontFamily: "'Playfair Display', serif",
                          fontSize: "10px",
                          color: gradientColor,
                          opacity: 0.5,
                          marginTop: "2px",
                        }}
                      >
                        {dayOfWeek}
                      </span>
                    </>
                  ) : (
                    <span
                      style={{
                        fontFamily: "'Playfair Display', serif",
                        fontSize: "36px",
                        fontWeight: 900,
                        color: "#f5f0e8",
                        opacity: 0.4,
                        lineHeight: 1,
                      }}
                    >
                      ?
                    </span>
                  )}
                </div>
                <input
                  type="datetime-local"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    opacity: 0,
                    cursor: "pointer",
                    zIndex: 10,
                  }}
                />
              </div>

              {/* Dress code */}
              <div className="flex-1 overflow-hidden" style={{ borderRadius: "16px", backgroundColor: gradientColor }}>
                <div className="px-3 py-1.5 flex items-center gap-2" style={{ backgroundColor: "rgba(0,0,0,0.15)" }}>
                  <span style={{ fontSize: "16px" }}>🎭</span>
                  <span
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: "10px",
                      fontWeight: 700,
                      letterSpacing: "0.15em",
                      color: "#f5f0e8",
                      textTransform: "uppercase",
                    }}
                  >
                    Dress Code
                  </span>
                </div>
                <div className="flex flex-col py-3 px-3">
                  <input
                    type="text"
                    value={dressCode}
                    onChange={(e) => setDressCode(e.target.value)}
                    placeholder="Theme..."
                    className="bg-transparent outline-none placeholder:opacity-40"
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      fontSize: "18px",
                      fontWeight: 900,
                      color: "#f5f0e8",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div
              className="flex items-start gap-3"
              style={{
                backgroundColor: "#2c1810",
                borderRadius: "14px",
                padding: "14px 16px",
                border: `1px solid ${gradientColor}33`,
              }}
            >
              <span style={{ color: gradientColor, fontSize: "14px", marginTop: "1px" }}>✦</span>
              <div className="flex-1">
                <span
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "9px",
                    fontWeight: 600,
                    color: gradientColor,
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                    display: "block",
                  }}
                >
                  Notes from host
                </span>
                <textarea
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  placeholder="Anything else your guests should know..."
                  rows={2}
                  className="w-full bg-transparent outline-none resize-none mt-1 placeholder:opacity-30"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "14px",
                    fontStyle: "italic",
                    color: "#f5f0e8",
                    opacity: 0.8,
                  }}
                />
              </div>
            </div>
          </div>
        </>
      ) : isCustom ? (
        /* ═══ PLANIT CUSTOM LAYOUT ═══ */
        <>
          {(() => {
            const patternStyle: React.CSSProperties = customBgKey
              ? getPatternBgStyle(customBgKey)
              : bgPhoto
                ? { backgroundColor: "", backgroundImage: `url(${bgPhoto})`, backgroundSize: "cover", backgroundPosition: "center" }
                : { backgroundColor: `hsl(${bgColor})`, backgroundImage: "none", backgroundSize: "auto" };
            const hasPhotoScrim = !!bgPhoto;
            return (
              <div ref={customContainerRef} style={{ minHeight: "100vh", position: "relative", overflow: "hidden", ...patternStyle }} onClick={() => setSelectedStickerId(null)}>
                {/* Pattern overlays for complex patterns */}
                {customPatternKey && <PatternOverlay patternKey={customPatternKey} />}
                {/* Photo scrim */}
                {hasPhotoScrim && <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 1, pointerEvents: "none" }} />}
                {/* Stickers layer */}
                {stickers.map(stk => (
                  <div
                    key={stk.id}
                    style={{ position: "absolute", left: `${stk.x}%`, top: `${stk.y}%`, fontSize: `${stk.size}px`, zIndex: 30, cursor: "move", userSelect: "none" as const, touchAction: "none", lineHeight: 1 }}
                    onTouchStart={(e) => handleStickerTouchStart(e, stk.id)}
                    onTouchMove={(e) => handleStickerTouchMove(e, stk.id)}
                    onTouchEnd={handleStickerTouchEnd}
                    onClick={(e) => { e.stopPropagation(); setSelectedStickerId(prev => prev === stk.id ? null : stk.id); }}
                  >
                    {stk.emoji}
                    {selectedStickerId === stk.id && (
                      <button
                        style={{ position: "absolute", top: "-10px", right: "-10px", width: "22px", height: "22px", borderRadius: "50%", backgroundColor: "#ff3b30", border: "2px solid #fff", color: "#fff", fontSize: "11px", fontWeight: 900, cursor: "pointer", zIndex: 40, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
                        onClick={(e) => { e.stopPropagation(); deleteSticker(stk.id); }}
                      >✕</button>
                    )}
                  </div>
                ))}
                {/* Back nav */}
                <button onClick={() => navigate(editCode ? `/event/${editCode}` : "/home")} className="absolute top-5 left-5 z-20">
                  <ArrowLeft className="w-6 h-6" style={{ color: fontColor }} />
                </button>
                {/* Content */}
                <div className="flex flex-col items-center text-center px-5 pt-16 pb-6 relative z-10">
                  {/* Vibe */}
                  <div style={{ display: "inline-block", position: "relative", marginBottom: "10px" }}>
                    <div style={{ border: `1px solid ${accentColor}55`, borderRadius: "50px", padding: "3px 12px", backgroundColor: `${accentColor}15`, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" as const, color: vibe ? accentColor : `${accentColor}45` }}>{vibe || "Event type..."}</span>
                    </div>
                    <input type="text" value={vibe} onChange={(e) => setVibe(e.target.value)} maxLength={30} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "text", zIndex: 10 }} />
                  </div>
                  {/* Title */}
                  <input type="text" value={title} onChange={(e) => { setTitle(e.target.value); setTitleError(""); }} placeholder="Event name..." className="w-full bg-transparent outline-none placeholder:opacity-20 text-center block" style={{ fontFamily: currentFontFamily, fontSize: noirFontSize, fontWeight: fontStyle === "Bold" ? 400 : 800, color: fontColor, lineHeight: 1.05, marginBottom: "6px", textShadow: customIsLight ? "none" : "0 1px 8px rgba(0,0,0,0.5)" }} />
                  {titleError && <p className="text-red-400 text-xs mb-2">{titleError}</p>}
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: fontColorMuted, marginBottom: "20px", textShadow: customIsLight ? "none" : "0 1px 6px rgba(0,0,0,0.4)" }}>hosted by {hostName}</p>

                  {/* Date/time picker — accent colour pill */}
                  <div style={{ position: "relative", marginBottom: "20px" }}>
                    <div style={{ borderRadius: "50px", padding: "10px 22px", backgroundColor: `hsl(${bubbleColor})`, display: "inline-block", boxShadow: "0 2px 14px rgba(0,0,0,0.28)" }}>
                      <span style={{ fontFamily: currentFontFamily, fontSize: "16px", fontWeight: fontStyle==="Bold"?400:700, color: `hsl(${bubbleTextColor})`, letterSpacing: fontStyle==="Bold"?"0.05em":0 }}>
                        {dayNum ? `${dayNum} ${monthName}` : "Date"}
                        <span style={{ color: `hsl(${bubbleTextColor})`, opacity: 0.6, margin: "0 8px" }}>·</span>
                        {timeStr || "Time"}
                      </span>
                    </div>
                    <input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer", zIndex: 10 }} />
                  </div>

                  {/* Info bubbles */}
                  <div className="w-full flex flex-col gap-3">
                    {/* Location */}
                    <div style={{ borderRadius: "20px", border: `1px solid ${customFrostBorder}`, padding: "16px 18px", backgroundColor: customFrostBg, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", position: "relative" }}>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: accentColor, marginBottom: "5px" }}>Location</p>
                      <p style={{ fontFamily: currentFontFamily, fontSize: "18px", fontWeight: fontStyle==="Bold"?400:600, color: location ? fontColor : `${fontColor}40`, lineHeight: 1.2 }}>{location || "Where's the event?"}</p>
                      <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "text", zIndex: 10 }} />
                    </div>
                    {/* Dress Code */}
                    <div style={{ borderRadius: "20px", border: `1px solid ${customFrostBorder}`, padding: "16px 18px", backgroundColor: customFrostBg, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", position: "relative" }}>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: accentColor, marginBottom: "5px" }}>Dress Code</p>
                      <p style={{ fontFamily: currentFontFamily, fontSize: "18px", fontWeight: fontStyle==="Bold"?400:600, color: dressCode ? fontColor : `${fontColor}40`, lineHeight: 1.2 }}>{dressCode || "Theme..."}</p>
                      <input type="text" value={dressCode} onChange={(e) => setDressCode(e.target.value)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "text", zIndex: 10 }} />
                    </div>
                    {/* Notes */}
                    <div style={{ borderRadius: "20px", border: `1px solid ${customFrostBorder}`, padding: "16px 18px", backgroundColor: customFrostBg, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
                      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "8px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase" as const, color: accentColor, marginBottom: "5px" }}>From the host</p>
                      <textarea value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Anything else..." rows={2} className="w-full bg-transparent outline-none resize-none placeholder:opacity-20 text-center" style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: fontColor, lineHeight: 1.5 }} />
                    </div>
                  </div>
                </div>
                <div style={{ height: "100px" }} />
              </div>
            );
          })()}
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
            <button
              onClick={() => navigate(editCode ? `/event/${editCode}` : "/home")}
              className="absolute top-5 left-5 z-20"
              style={{ pointerEvents: "auto" }}
            >
              <ArrowLeft className="w-6 h-6" style={{ color: "#111" }} />
            </button>

            <div className="absolute bottom-0 left-0 right-0 px-6 pb-5">
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setTitleError("");
                }}
                placeholder="Event name..."
                className={`w-full bg-transparent placeholder:opacity-40 outline-none drop-shadow-lg ${titleClass}`}
                style={{ fontFamily: currentFontFamily, color: bgTextColor }}
              />
              {titleError && <p className="text-red-500 text-xs mt-1">{titleError}</p>}
              <textarea
                value={vibe}
                onChange={(e) => setVibe(e.target.value)}
                placeholder="Set the vibe..."
                rows={1}
                maxLength={120}
                className={`w-full bg-transparent placeholder:opacity-30 outline-none resize-none mt-1 ${vibeClass}`}
                style={{ fontFamily: currentFontFamily, color: bgTextMuted }}
              />
            </div>
          </div>

          <div className="px-5 pt-4 pb-10 flex flex-col gap-3">
            {/* Location bubble — full width with header band */}
            <div className="overflow-hidden" style={{ backgroundColor: accentColor, borderRadius: "16px" }}>
              <div className="px-4 py-1.5" style={{ backgroundColor: "rgba(0,0,0,0.2)" }}>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: accentText }}>
                  Location
                </span>
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
                      <span className="text-4xl font-extrabold leading-none" style={{ color: accentText }}>
                        {dayNum}
                      </span>
                      <span className="text-xs font-semibold mt-1" style={{ color: accentText, opacity: 0.7 }}>
                        {timeStr}
                      </span>
                      <span className="text-[10px] font-medium mt-0.5" style={{ color: accentText, opacity: 0.5 }}>
                        {dayOfWeek}
                      </span>
                    </>
                  ) : (
                    <span className="text-3xl font-extrabold leading-none" style={{ color: accentText, opacity: 0.4 }}>
                      ?
                    </span>
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
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: accentText }}>
                    Dress Code
                  </span>
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
            <div
              className="p-4 flex items-start gap-3"
              style={{
                borderRadius: "16px",
                backgroundColor: accentColor.replace("hsl(", "hsla(").replace(")", ", 0.15)"),
                border: `1px solid ${accentColor.replace("hsl(", "hsla(").replace(")", ", 0.3)")}`,
              }}
            >
              <span className="text-lg mt-0.5" style={{ color: bgTextMuted }}>
                ✦
              </span>
              <div className="flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider block" style={{ color: accentColor }}>
                  Notes from host
                </span>
                <textarea
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  placeholder="Anything else your guests should know..."
                  rows={2}
                  className="w-full bg-transparent outline-none resize-none text-sm mt-1 placeholder:opacity-30"
                  style={{ color: bgTextSoft }}
                />
              </div>
            </div>
          </div>
        </>
      )}

      <div className="px-5 pb-10 flex flex-col gap-3">
        {/* Make it yours + action buttons */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="rounded-2xl px-4 py-3.5 mb-4 w-full text-center text-sm font-bold border mt-2"
          style={{ backgroundColor: accentColor, color: accentText, borderColor: "rgba(0,0,0,0.1)" }}
        >
          Make it yours ✦
        </button>
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerContent className="bg-card px-5 pb-8 pt-2 border-t border-border max-h-[80vh]">
            <div className="mx-auto w-10 h-1 rounded-full bg-muted-foreground/30 mb-4" />

            <div className="overflow-y-auto flex-1">
              {customisePanel !== null ? (
                /* ─── Sub-panel screen ─── */
                <div>
                  <button
                    onClick={() => setCustomisePanel(null)}
                    className="flex items-center gap-1 text-sm text-white/60 mb-4"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>

                  {customisePanel === "bg" && (
                    <>
                      <p className="text-card-foreground font-bold text-sm mb-2">Background colour</p>
                      <div className="flex gap-2.5 mb-5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                        {(isNoir ? NOIR_PALETTE_COLORS : PALETTE_COLORS).map((c) => (
                          <button
                            key={c.name}
                            onClick={() => {
                              setBgColor(c.hsl);
                              setBgPhoto(null);
                              setBgPreset(null);
                              setBgPresetIsImage(false);
                            }}
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
                        {uploadedPhoto && (
                          <button
                            onClick={() => {
                              setBgPhoto(uploadedPhoto);
                              setBgPreset(null);
                              setBgPresetIsImage(false);
                            }}
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
                            onClick={() => {
                              setBgPreset(p.gradient);
                              setBgPresetIsImage(!!(p as any).isImage);
                              setBgPhoto(null);
                            }}
                            className="h-14 rounded-xl border-2 transition-all overflow-hidden"
                            style={{
                              ...((p as any).isImage
                                ? { backgroundImage: p.gradient, backgroundSize: "cover", backgroundPosition: "center" }
                                : { background: p.gradient }),
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
                            onClick={() => {
                              setBubbleColor(c.hsl);
                              setBubbleTextColor(c.text);
                            }}
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
                            <span className="text-2xl text-white" style={{ fontFamily: f.family }}>
                              {f.name}
                            </span>
                            <span
                              className="text-[10px] font-semibold"
                              style={{ color: fontStyle === f.name ? "#aaee44" : "#999" }}
                            >
                              {f.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {customisePanel === "custom-bg" && (
                    <>
                      <p className="text-card-foreground font-bold text-sm mb-3">Background</p>
                      <div className="grid grid-cols-4 gap-2 mb-4">
                        {CUSTOM_BG_PATTERNS.map((p) => (
                          <button
                            key={p.key}
                            onClick={() => { setBgPreset(p.key); setBgPresetIsImage(false); setBgPhoto(null); setUploadedPhoto(null); }}
                            className="flex flex-col items-center gap-1"
                            style={{ border: bgPreset === p.key ? "2px solid #aaee44" : "2px solid transparent", borderRadius: "10px", overflow: "hidden", padding: "2px" }}
                          >
                            <div style={{ width: "100%", aspectRatio: "1", borderRadius: "8px", overflow: "hidden", position: "relative", ...getPatternBgStyle(p.key) }}>
                              {(p.key === "planit-pattern:retro-stars" || p.key === "planit-pattern:camo" || p.key === "planit-pattern:blueprint" || p.key === "planit-pattern:cherry-blossom" || p.key === "planit-pattern:groovy") && (
                                <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
                                  <PatternOverlay patternKey={p.key} />
                                </div>
                              )}
                            </div>
                            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 600, color: "#ccc", textAlign: "center" as const }}>{p.name}</span>
                          </button>
                        ))}
                        {/* Camera Roll */}
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="flex flex-col items-center gap-1"
                          style={{ border: (bgPhoto && !customBgKey) ? "2px solid #aaee44" : "2px solid transparent", borderRadius: "10px", overflow: "hidden", padding: "2px" }}
                        >
                          <div style={{ width: "100%", aspectRatio: "1", borderRadius: "8px", backgroundColor: "#2b2b2b", border: "1px dashed #555", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                            {uploadedPhoto ? <img src={uploadedPhoto} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: "22px" }}>📷</span>}
                          </div>
                          <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 600, color: "#ccc" }}>Camera Roll</span>
                        </button>
                      </div>
                      {(customBgKey || bgPhoto) && (
                        <button onClick={() => { setBgPreset(null); setBgPhoto(null); setUploadedPhoto(null); setBgPresetIsImage(false); }} className="text-xs text-white/50 underline mb-2">Clear (use solid colour)</button>
                      )}
                      <p className="text-xs text-white/40 mb-2 mt-1">Solid colours</p>
                      <div className="grid grid-cols-4 gap-2">
                        {CUSTOM_SOLID_COLORS.map((c) => (
                          <button
                            key={c.key}
                            onClick={() => { setBgPreset(c.key); setBgPresetIsImage(false); setBgPhoto(null); setUploadedPhoto(null); }}
                            className="flex flex-col items-center gap-1"
                            style={{ border: bgPreset === c.key ? "2px solid #aaee44" : "2px solid transparent", borderRadius: "10px", overflow: "hidden", padding: "2px" }}
                          >
                            <div style={{ width: "100%", aspectRatio: "1", borderRadius: "8px", backgroundColor: c.color, border: "1px solid #444" }} />
                            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: "9px", fontWeight: 600, color: "#ccc", textAlign: "center" as const }}>{c.name}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {customisePanel === "custom-font-color" && (
                    <>
                      <p className="text-card-foreground font-bold text-sm mb-3">Font colour</p>
                      <div className="grid grid-cols-3 gap-3">
                        {FONT_COLORS.map((c) => (
                          <button
                            key={c.value}
                            onClick={() => setFontColor(c.value)}
                            className="flex flex-col items-center gap-1.5 py-3 rounded-xl"
                            style={{
                              backgroundColor: c.value === "#ffffff" ? "#2b2b2b" : c.value === "#111111" ? "#333" : "#1a1a1a",
                              border: fontColor === c.value ? "2px solid #aaee44" : "2px solid transparent",
                            }}
                          >
                            <div className="w-8 h-8 rounded-full border border-white/20" style={{ backgroundColor: c.value }} />
                            <span className="text-xs text-white/70">{c.label}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {customisePanel === "custom-stickers" && (
                    <>
                      <p className="text-card-foreground font-bold text-sm mb-3">Stickers</p>
                      <p className="text-xs text-white/50 mb-3">Tap to place · Drag to move · Pinch to resize · Tap sticker → ✕ to remove</p>
                      <div className="grid grid-cols-6 gap-2 mb-4">
                        {STICKER_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => addSticker(emoji)}
                            className="flex items-center justify-center rounded-xl"
                            style={{ aspectRatio: "1", backgroundColor: "#2b2b2b", fontSize: "22px" }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                      {stickers.length > 0 && (
                        <div className="flex flex-col gap-1 mt-2">
                          <p className="text-xs text-white/40 mb-1">Placed stickers</p>
                          {stickers.map(stk => (
                            <div key={stk.id} className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ backgroundColor: "#2b2b2b" }}>
                              <span style={{ fontSize: "20px" }}>{stk.emoji}</span>
                              <button onClick={() => deleteSticker(stk.id)} className="text-xs text-red-400 font-bold">Remove</button>
                            </div>
                          ))}
                        </div>
                      )}
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
              ) : (
                /* ─── Tabbed drawer ─── */
                <div>
                  {/* Tab row */}
                  <div className="flex gap-2 mb-5 p-1.5 rounded-full" style={{ backgroundColor: "#1a1a1a" }}>
                    <button
                      onClick={() => setCustomizeTab("templates")}
                      className="flex-1 py-2 text-sm font-bold transition-all rounded-full"
                      style={{ backgroundColor: customizeTab === "templates" ? "#aaee44" : "transparent", color: customizeTab === "templates" ? "#111" : "#666" }}
                    >
                      Templates
                    </button>
                    <button
                      onClick={() => { setCustomizeTab("customise"); setCustomisePanel(null); }}
                      className="flex-1 py-2 text-sm font-bold transition-all rounded-full"
                      style={{ backgroundColor: customizeTab === "customise" ? "#aaee44" : "transparent", color: customizeTab === "customise" ? "#111" : "#666" }}
                    >
                      Customise
                    </button>
                  </div>

                  {customizeTab === "templates" ? (
                    /* ─── Templates tab ─── */
                    <div className="flex flex-col gap-5">
                      {/* Build It button */}
                      <button
                        onClick={() => {
                          setDrawerOpen(false);
                          setTimeout(() => {
                            setShowBuildIt(true);
                            setBuildItError(null);
                            
                          }, 300);
                        }}
                        className="w-full rounded-2xl py-4 px-4 flex items-center gap-3 text-left"
                        style={{ background: "linear-gradient(135deg, #7c3aed, #db2777)", border: "none" }}
                      >
                        <span style={{ fontSize: "22px" }}>🪄</span>
                        <div>
                          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "14px", fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>✦ Build It</p>
                          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", color: "rgba(255,255,255,0.7)", marginTop: "2px" }}>Describe your event, we'll create the art</p>
                        </div>
                      </button>
                      {/* Horizontal template scroll */}
                      <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                        {TEMPLATES.map((t) => {
                          const isSelected = templateName === t.templateName;
                          const tn = t.templateName;
                          const cfg: Record<string, { bg: string; bgGrad?: string; titleColor: string; accentColor: string; accentStyle?: React.CSSProperties; font: string; barColor: string; barText: string }> = {
                            "planit-noir":    { bg: "#0a0a0a", titleColor: "#fff", accentColor: "#aaee44", accentStyle: { fontStyle: "italic" }, font: "'Playfair Display', serif", barColor: "#aaee44", barText: "#111" },
                            vintage:          { bg: "#f5f0e8", titleColor: "#2c1810", accentColor: "#8b7355", font: "'Playfair Display', serif", barColor: "#8b7355", barText: "#f5f0e8" },
                            galaxy:           { bg: "#0d0d2b", titleColor: "#fff", accentColor: "#7c3aed", font: "'Bebas Neue', sans-serif", barColor: "#7c3aed", barText: "#fff" },
                            sunny:            { bg: "#ff6b35", bgGrad: "linear-gradient(135deg, #ff6b35, #ff8c00)", titleColor: "#fff", accentColor: "#fff", font: "'Caveat', cursive", barColor: "#ff6b35", barText: "#fff" },
                            midnight:         { bg: "#ffffff", titleColor: "#000", accentColor: "#000", font: "'Bebas Neue', sans-serif", barColor: "#000", barText: "#fff" },
                            ocean:            { bg: "#0d1b2a", titleColor: "#fff", accentColor: "#1e90ff", font: "'Bebas Neue', sans-serif", barColor: "#1e90ff", barText: "#fff" },
                            blush:            { bg: "#1a0a10", titleColor: "#fff", accentColor: "#e91e8c", font: "'Playfair Display', serif", barColor: "#e91e8c", barText: "#fff" },
                            forest:           { bg: "#0a1f0a", titleColor: "#fff", accentColor: "#2e7d32", font: "'Playfair Display', serif", barColor: "#2e7d32", barText: "#fff" },
                            "planit-custom":  { bg: "linear-gradient(135deg, #f857a6, #ff5858, #43e97b, #38f9d7, #4776e6)", titleColor: "#fff", accentColor: "#fff", font: "'Bebas Neue', sans-serif", barColor: "#fff", barText: "#111" },
                          };
                          const c = cfg[tn] || { bg: "#2b2b2b", titleColor: "#fff", accentColor: "#aaee44", font: "sans-serif", barColor: "#aaee44", barText: "#111" };

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
                              className="flex flex-col rounded-xl overflow-hidden shrink-0 transition-all"
                              style={{ width: "60px", border: isSelected ? "2px solid #aaee44" : "2px solid transparent" }}
                            >
                              <div
                                style={{
                                  width: "100%",
                                  height: "62px",
                                  background: c.bgGrad || c.bg,
                                  backgroundColor: c.bgGrad ? undefined : c.bg,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  position: "relative",
                                  overflow: "hidden",
                                }}
                              >
                                {tn === "galaxy" && (
                                  <div style={{ position: "absolute", top: "40%", left: "50%", transform: "translate(-50%,-50%)", width: 28, height: 28, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.5) 0%, transparent 70%)" }} />
                                )}
                                {tn === "planit-custom" ? (
                                  <span style={{ fontSize: 16, filter: "drop-shadow(0 0 4px rgba(255,255,255,0.6))" }}>✦</span>
                                ) : tn === "midnight" ? (
                                  <div style={{ borderLeft: "2px solid #000", paddingLeft: 3 }}>
                                    <span style={{ fontFamily: c.font, fontSize: 7, fontWeight: 800, color: c.titleColor, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>EVENT</span>
                                  </div>
                                ) : (
                                  <span style={{ fontFamily: c.font, fontSize: 7, fontWeight: 700, color: c.titleColor, lineHeight: 1.2, textAlign: "center", position: "relative", zIndex: 1 }}>
                                    Your <span style={{ color: c.accentColor, ...c.accentStyle }}>event</span>
                                  </span>
                                )}
                              </div>
                              <div
                                className="py-1 text-center"
                                style={tn === "planit-custom" ? { background: "linear-gradient(90deg, #f857a6, #ff5858, #43e97b, #38f9d7, #4776e6)" } : { backgroundColor: c.barColor }}
                              >
                                <span style={{ fontSize: 6, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: tn === "planit-custom" ? "#fff" : c.barText, display: "block", lineHeight: 1.4 }}>
                                  {t.name}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    /* ─── Customise tab ─── */
                    <div>
                      {isCustom ? (
                        <div className="flex flex-col gap-1">
                          <button onClick={() => setCustomisePanel("custom-bg")} className="flex items-center justify-between py-3.5 px-1">
                            <span className="text-sm font-semibold text-white">Background</span>
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full border border-white/20" style={customBgKey ? getPatternBgStyle(customBgKey) : bgPhoto ? { backgroundImage: `url(${bgPhoto})`, backgroundSize: "cover" } : { backgroundColor: `hsl(${bgColor})` }} />
                              <span className="text-white/40 text-lg">›</span>
                            </div>
                          </button>
                          <button onClick={() => setCustomisePanel("bubble")} className="flex items-center justify-between py-3.5 px-1">
                            <span className="text-sm font-semibold text-white">Accent colour</span>
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full border border-white/20" style={{ backgroundColor: accentColor }} />
                              <span className="text-white/40 text-lg">›</span>
                            </div>
                          </button>
                          <button onClick={() => setCustomisePanel("font")} className="flex items-center justify-between py-3.5 px-1">
                            <span className="text-sm font-semibold text-white">Font</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-white/60">{fontStyle}</span>
                              <span className="text-white/40 text-lg">›</span>
                            </div>
                          </button>
                          <button onClick={() => setCustomisePanel("size")} className="flex items-center justify-between py-3.5 px-1">
                            <span className="text-sm font-semibold text-white">Text size</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-white/60">{textSize}</span>
                              <span className="text-white/40 text-lg">›</span>
                            </div>
                          </button>
                          <button onClick={() => setCustomisePanel("custom-font-color")} className="flex items-center justify-between py-3.5 px-1">
                            <span className="text-sm font-semibold text-white">Font colour</span>
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full border border-white/20" style={{ backgroundColor: fontColor }} />
                              <span className="text-white/40 text-lg">›</span>
                            </div>
                          </button>
                          <button onClick={() => setCustomisePanel("custom-stickers")} className="flex items-center justify-between py-3.5 px-1">
                            <span className="text-sm font-semibold text-white">Stickers</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-white/60">{stickers.length > 0 ? `${stickers.length} placed` : "None"}</span>
                              <span className="text-white/40 text-lg">›</span>
                            </div>
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <button onClick={() => setCustomisePanel("bg")} className="flex items-center justify-between py-3.5 px-1">
                            <span className="text-sm font-semibold text-white">Background colour</span>
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full border border-white/20" style={{ backgroundColor: `hsl(${bgColor})` }} />
                              <span className="text-white/40 text-lg">›</span>
                            </div>
                          </button>
                          <button onClick={() => setCustomisePanel("bubble")} className="flex items-center justify-between py-3.5 px-1">
                            <span className="text-sm font-semibold text-white">Bubble colour</span>
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full border border-white/20" style={{ backgroundColor: accentColor }} />
                              <span className="text-white/40 text-lg">›</span>
                            </div>
                          </button>
                          <button onClick={() => setCustomisePanel("font")} className="flex items-center justify-between py-3.5 px-1">
                            <span className="text-sm font-semibold text-white">Font</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-white/60">{fontStyle}</span>
                              <span className="text-white/40 text-lg">›</span>
                            </div>
                          </button>
                          <button onClick={() => setCustomisePanel("size")} className="flex items-center justify-between py-3.5 px-1">
                            <span className="text-sm font-semibold text-white">Text size</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-white/60">{textSize}</span>
                              <span className="text-white/40 text-lg">›</span>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              onClick={() => setDrawerOpen(false)}
              className="w-full bg-secondary text-secondary-foreground rounded-[var(--radius)] py-4 text-base font-extrabold border border-border mt-4"
            >
              Done
            </button>
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

      {/* ─── Build It modal ─── */}
      {showBuildIt && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowBuildIt(false); } }}
        >
          <div
            className="w-full rounded-t-3xl px-5 pt-5 pb-10"
            style={{ backgroundColor: "#141414", maxHeight: "90vh", overflowY: "auto" }}
          >
            {/* Handle */}
            <div className="mx-auto w-10 h-1 rounded-full mb-5" style={{ backgroundColor: "#333" }} />

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "18px", fontWeight: 700, color: "#fff" }}>✦ Build It</p>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#666", marginTop: "2px" }}>Describe your event, we'll generate the art</p>
              </div>
              <button
                onClick={() => setShowBuildIt(false)}
                style={{ color: "#666", fontSize: "22px", lineHeight: 1, background: "none", border: "none", padding: "4px" }}
              >
                ✕
              </button>
            </div>

            {/* Prompt input */}
            <textarea
              value={buildItPrompt}
              onChange={(e) => setBuildItPrompt(e.target.value)}
              placeholder="e.g. a tropical birthday party on the beach at sunset with palm trees and fairy lights"
              rows={3}
              className="w-full rounded-2xl px-4 py-3 text-sm resize-none outline-none"
              style={{
                backgroundColor: "#1e1e1e",
                border: "1px solid #333",
                color: "#fff",
                fontFamily: "'Inter', sans-serif",
              }}
            />

            {/* Error */}
            {buildItError && (
              <div className="mt-3 rounded-xl px-4 py-3" style={{ backgroundColor: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)" }}>
                <p className="text-sm font-semibold mb-1" style={{ color: "#f87171" }}>Generation failed</p>
                <p className="text-xs" style={{ color: "rgba(248,113,113,0.8)", wordBreak: "break-word" }}>{buildItError}</p>
              </div>
            )}

            {/* Style preview */}
            {buildItResult && !buildItGenerating && (
              <div className="mt-4 rounded-2xl overflow-hidden" style={{ border: "1px solid #333" }}>
                {/* Background swatch */}
                <div
                  style={{
                    height: "100px",
                    backgroundColor: `hsl(${buildItResult.bgColor})`,
                    ...(buildItResult.bgPattern ? getPatternBgStyle(buildItResult.bgPattern) : {}),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {buildItResult.bgPattern && (
                    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
                      <PatternOverlay patternKey={buildItResult.bgPattern} />
                    </div>
                  )}
                  <span
                    style={{
                      fontFamily: FONT_MAP[buildItResult.fontStyle] || FONT_MAP["Bold"],
                      fontSize: "20px",
                      color: `hsl(${buildItResult.bubbleColor})`,
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    Your Event
                  </span>
                </div>
                {/* Details row */}
                <div className="flex items-center gap-2 px-4 py-3" style={{ backgroundColor: "#1a1a1a" }}>
                  <div
                    className="w-5 h-5 rounded-full shrink-0"
                    style={{ backgroundColor: `hsl(${buildItResult.bubbleColor})`, border: "1px solid rgba(255,255,255,0.15)" }}
                  />
                  <div
                    className="w-4 h-4 rounded-full shrink-0"
                    style={{ backgroundColor: buildItResult.gradientColor, border: "1px solid rgba(255,255,255,0.15)" }}
                  />
                  <span style={{ color: "#ccc", fontSize: "12px", marginLeft: "2px" }}>
                    {buildItResult.fontStyle}
                    {buildItResult.bgPattern
                      ? ` · ${CUSTOM_BG_PATTERNS.find(p => p.key === buildItResult.bgPattern)?.name ?? ""}`
                      : ""}
                  </span>
                </div>
              </div>
            )}

            {/* Loading spinner */}
            {buildItGenerating && (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <div
                  className="w-10 h-10 rounded-full border-4 animate-spin"
                  style={{ borderColor: "#333", borderTopColor: "#7c3aed" }}
                />
                <p style={{ color: "#999", fontSize: "13px" }}>Styling your event…</p>
              </div>
            )}

            {/* Action buttons */}
            {!buildItGenerating && (
              <div className="flex gap-3 mt-4">
                {!buildItResult ? (
                  <button
                    onClick={generateStyle}
                    disabled={!buildItPrompt.trim()}
                    className="flex-1 rounded-2xl py-3.5 text-sm font-bold"
                    style={{
                      background: buildItPrompt.trim() ? "linear-gradient(135deg, #7c3aed, #db2777)" : "#2b2b2b",
                      color: buildItPrompt.trim() ? "#fff" : "#555",
                      border: "none",
                    }}
                  >
                    Generate
                  </button>
                ) : (
                  <>
                    <button
                      onClick={generateStyle}
                      className="flex-1 rounded-2xl py-3.5 text-sm font-bold"
                      style={{ backgroundColor: "#1e1e1e", border: "1px solid #333", color: "#ccc" }}
                    >
                      Try again
                    </button>
                    <button
                      onClick={applyStyle}
                      className="flex-1 rounded-2xl py-3.5 text-sm font-bold"
                      style={{ background: "linear-gradient(135deg, #7c3aed, #db2777)", color: "#fff", border: "none" }}
                    >
                      Use this ✓
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HostEvent;
