import { useState, useRef, useEffect } from "react";

import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Upload, Copy, Share2, Users, Check } from "lucide-react";
import {
  IconConfetti, IconGlassFull, IconMusic, IconStar, IconCake, IconCrown,
  IconSun, IconWaveSine, IconTrees, IconFlower, IconMountain, IconSnowflake,
  IconPizza, IconBeer, IconCoffee, IconMeat, IconFish, IconSalad,
  IconTrophy, IconBallFootball, IconHorseToy, IconSwimming, IconBike, IconRun,
} from "@tabler/icons-react";
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

const TABLER_ICON_MAP: Record<string, React.ComponentType<{size?: number; stroke?: number; color?: string}>> = {
  "confetti": IconConfetti, "glass-full": IconGlassFull, "music": IconMusic, "star": IconStar, "cake": IconCake, "crown": IconCrown,
  "sun": IconSun, "wave-sine": IconWaveSine, "trees": IconTrees, "flower": IconFlower, "mountain": IconMountain, "snowflake": IconSnowflake,
  "pizza": IconPizza, "beer": IconBeer, "coffee": IconCoffee, "meat": IconMeat, "fish": IconFish, "salad": IconSalad,
  "trophy": IconTrophy, "ball-football": IconBallFootball, "horse-toy": IconHorseToy, "swimming": IconSwimming, "bike": IconBike, "run": IconRun,
};

const STICKER_CATEGORIES = [
  { label: "Party",        keys: ["confetti","glass-full","music","star","cake","crown"] },
  { label: "Nature",       keys: ["sun","wave-sine","trees","flower","mountain","snowflake"] },
  { label: "Food & drink", keys: ["pizza","beer","coffee","meat","fish","salad"] },
  { label: "Sports",       keys: ["trophy","ball-football","horse-toy","swimming","bike","run"] },
];

const BLANK_BG_COLORS = [
  { name: "Black",         hsl: "0 0% 4%",    hex: "#0a0a0a" },
  { name: "Cream",         hsl: "40 88% 95%", hex: "#fdf6e3" },
  { name: "Deep Purple",   hsl: "270 100% 10%", hex: "#1a0033" },
  { name: "Forest Green",  hsl: "120 52% 8%", hex: "#0a1f0a" },
  { name: "Navy",          hsl: "235 58% 11%", hex: "#0a0d2b" },
  { name: "Wine",          hsl: "340 100% 12%", hex: "#3d0014" },
];

const FONT_COLORS = [
  { label: "White",    value: "#ffffff" },
  { label: "Black",    value: "#111111" },
  { label: "Cream",    value: "#fdf6e3" },
  { label: "Gold",     value: "#ffd700" },
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

const BUILD_IT_SYSTEM_PROMPT = `You are a world-class event designer. Generate a "customCSS" value that is a CSS background property using ONLY gradients and no SVG or images. The background must feel rich, atmospheric and premium — like a professional photograph or high-end print.

Fields to return:
- template: always "planit-custom"
- bgColor: HSL string WITHOUT "hsl()" wrapper e.g. "240 15% 8%" — a solid fallback colour matching the theme's dominant tone
- bubbleColor: HSL string WITHOUT "hsl()" wrapper e.g. "45 80% 55%" — vivid accent used as the date bubble background. Must pop dramatically against the customCSS background.
- bubbleTextColor: HSL string WITHOUT "hsl()" wrapper e.g. "0 0% 0%" — text ON TOP of bubbleColor. "0 0% 0%" for bright accents, "0 0% 100%" for dark accents.
- fontStyle: one of "Bold", "Handwritten", "Elegant"
- gradientColor: hex colour e.g. "#c9a84c" — for decorative accents
- customCSS: the full value for the CSS background property (not background-color). Layer MANY gradient values separated by commas. NEVER use SVG, url(), or image references. The value should be 500+ characters long with 20+ layers.

CUSTOMCSS TECHNIQUES:

Layer these techniques to build depth:
1. Large soft elliptical radial-gradient blobs for atmospheric colour and light sources (e.g. radial-gradient(ellipse 80% 60% at 20% 30%, #c9a84c55 0%, transparent 100%))
2. repeating-linear-gradient for subtle textures — fine crosshatch for glitter (45deg and -45deg at very low opacity ~0.06), horizontal lines for retro, diagonal for silk/satin
3. Small tight radial-gradient circles (2-6px radius as "circle 2px at X% Y%") scattered at 25+ different positions — these create glitter, bokeh, stars, wildflowers, fireflies. USE MANY OF THESE.
4. A rich linear-gradient base sweep (not flat — always at least 3 colour stops spanning light to dark or horizon to sky)
5. Always end with a solid base colour as the final background-color via bgColor

EXAMPLE ARCHETYPES (use these as exact templates — match this CSS density and style):

Gatsby/Art Deco/1920s/Champagne:
→ bgColor "30 85% 4%", bubbleColor "45 80% 55%", bubbleTextColor "0 0% 0%", Elegant, gradientColor "#d4af37"
→ customCSS EXAMPLE:
radial-gradient(ellipse 80% 60% at 50% 40%, rgba(212,175,55,0.45) 0%, rgba(180,130,20,0.2) 50%, transparent 80%),radial-gradient(ellipse 50% 40% at 30% 70%, rgba(180,130,20,0.3) 0%, transparent 65%),radial-gradient(ellipse 40% 30% at 75% 20%, rgba(212,175,55,0.25) 0%, transparent 60%),radial-gradient(circle 2px at 8% 15%, rgba(212,175,55,0.95) 0%, transparent 100%),radial-gradient(circle 1.5px at 15% 32%, rgba(255,215,0,0.9) 0%, transparent 100%),radial-gradient(circle 2px at 23% 8%, rgba(212,175,55,0.85) 0%, transparent 100%),radial-gradient(circle 1.5px at 31% 45%, rgba(255,215,0,0.9) 0%, transparent 100%),radial-gradient(circle 2px at 42% 12%, rgba(212,175,55,0.95) 0%, transparent 100%),radial-gradient(circle 1.5px at 51% 28%, rgba(255,215,0,0.85) 0%, transparent 100%),radial-gradient(circle 2px at 58% 55%, rgba(212,175,55,0.9) 0%, transparent 100%),radial-gradient(circle 1.5px at 66% 18%, rgba(255,215,0,0.95) 0%, transparent 100%),radial-gradient(circle 2px at 74% 38%, rgba(212,175,55,0.85) 0%, transparent 100%),radial-gradient(circle 1.5px at 82% 22%, rgba(255,215,0,0.9) 0%, transparent 100%),radial-gradient(circle 2px at 91% 48%, rgba(212,175,55,0.95) 0%, transparent 100%),radial-gradient(circle 1.5px at 12% 62%, rgba(255,215,0,0.85) 0%, transparent 100%),radial-gradient(circle 2px at 20% 78%, rgba(212,175,55,0.9) 0%, transparent 100%),radial-gradient(circle 1.5px at 35% 70%, rgba(255,215,0,0.85) 0%, transparent 100%),radial-gradient(circle 2px at 48% 85%, rgba(212,175,55,0.9) 0%, transparent 100%),radial-gradient(circle 1.5px at 62% 72%, rgba(255,215,0,0.85) 0%, transparent 100%),radial-gradient(circle 2px at 77% 88%, rgba(212,175,55,0.9) 0%, transparent 100%),radial-gradient(circle 1.5px at 88% 65%, rgba(255,215,0,0.85) 0%, transparent 100%),radial-gradient(circle 2px at 96% 78%, rgba(212,175,55,0.9) 0%, transparent 100%),radial-gradient(circle 1.5px at 5% 90%, rgba(255,215,0,0.85) 0%, transparent 100%),linear-gradient(160deg, #0a0600 0%, #1a0e02 30%, #120800 60%, #080400 100%)

Beach/Tropical/Tiki/Sunset/Summer:
→ bgColor "25 70% 40%", bubbleColor "15 85% 65%", bubbleTextColor "0 0% 0%", Handwritten, gradientColor "#ff8c42"
→ customCSS EXAMPLE:
radial-gradient(ellipse 50% 40% at 50% 5%, rgba(255,240,150,0.95) 0%, rgba(255,180,50,0.5) 35%, transparent 65%),radial-gradient(ellipse 90% 30% at 50% 52%, rgba(255,120,60,0.6) 0%, rgba(255,100,40,0.3) 50%, transparent 80%),radial-gradient(ellipse 100% 25% at 50% 88%, rgba(240,210,150,0.6) 0%, rgba(235,200,130,0.3) 60%, transparent 100%),radial-gradient(ellipse 60% 20% at 20% 80%, rgba(30,160,200,0.35) 0%, transparent 70%),radial-gradient(ellipse 50% 18% at 85% 78%, rgba(20,150,190,0.3) 0%, transparent 70%),radial-gradient(circle 2px at 10% 58%, rgba(255,255,200,0.85) 0%, transparent 100%),radial-gradient(circle 2px at 22% 54%, rgba(255,255,210,0.8) 0%, transparent 100%),radial-gradient(circle 2px at 35% 60%, rgba(255,255,200,0.85) 0%, transparent 100%),radial-gradient(circle 2px at 48% 56%, rgba(255,255,210,0.8) 0%, transparent 100%),radial-gradient(circle 2px at 62% 59%, rgba(255,255,200,0.85) 0%, transparent 100%),radial-gradient(circle 2px at 75% 55%, rgba(255,255,210,0.8) 0%, transparent 100%),radial-gradient(circle 2px at 88% 61%, rgba(255,255,200,0.85) 0%, transparent 100%),radial-gradient(circle 2px at 15% 72%, rgba(255,240,180,0.8) 0%, transparent 100%),radial-gradient(circle 2px at 42% 76%, rgba(255,255,200,0.8) 0%, transparent 100%),radial-gradient(circle 2px at 68% 70%, rgba(255,240,180,0.8) 0%, transparent 100%),radial-gradient(circle 2px at 92% 74%, rgba(255,255,200,0.8) 0%, transparent 100%),linear-gradient(180deg, #1a7ab8 0%, #4ab0e8 18%, #f4a460 42%, #ff7043 52%, #f5c87a 68%, #f0d8a0 82%, #e8d09a 100%)

Dark Forest/Woodland/Enchanted/Fairy lights:
→ bgColor "120 60% 4%", bubbleColor "140 35% 55%", bubbleTextColor "0 0% 0%", Elegant, gradientColor "#4a7c2f"
→ customCSS EXAMPLE:
radial-gradient(ellipse 60% 40% at 25% 35%, rgba(60,120,30,0.45) 0%, transparent 65%),radial-gradient(ellipse 50% 35% at 75% 25%, rgba(80,140,40,0.35) 0%, transparent 60%),radial-gradient(ellipse 70% 30% at 50% 70%, rgba(50,100,20,0.4) 0%, transparent 60%),radial-gradient(ellipse 40% 25% at 10% 80%, rgba(70,130,30,0.3) 0%, transparent 55%),radial-gradient(ellipse 45% 20% at 90% 65%, rgba(60,120,25,0.3) 0%, transparent 55%),radial-gradient(circle 2px at 7% 22%, rgba(255,255,200,0.9) 0%, transparent 100%),radial-gradient(circle 1.5px at 14% 48%, rgba(255,240,150,0.85) 0%, transparent 100%),radial-gradient(circle 2px at 21% 71%, rgba(255,255,200,0.9) 0%, transparent 100%),radial-gradient(circle 1.5px at 29% 34%, rgba(200,255,150,0.75) 0%, transparent 100%),radial-gradient(circle 2px at 38% 58%, rgba(255,255,180,0.9) 0%, transparent 100%),radial-gradient(circle 1.5px at 46% 18%, rgba(255,240,150,0.85) 0%, transparent 100%),radial-gradient(circle 2px at 53% 82%, rgba(255,255,200,0.9) 0%, transparent 100%),radial-gradient(circle 1.5px at 62% 44%, rgba(200,255,150,0.8) 0%, transparent 100%),radial-gradient(circle 2px at 69% 67%, rgba(255,255,180,0.9) 0%, transparent 100%),radial-gradient(circle 1.5px at 77% 29%, rgba(255,240,150,0.85) 0%, transparent 100%),radial-gradient(circle 2px at 84% 55%, rgba(255,255,200,0.9) 0%, transparent 100%),radial-gradient(circle 1.5px at 91% 78%, rgba(200,255,150,0.8) 0%, transparent 100%),radial-gradient(circle 2px at 5% 91%, rgba(255,255,180,0.85) 0%, transparent 100%),radial-gradient(circle 1.5px at 33% 88%, rgba(255,240,150,0.8) 0%, transparent 100%),radial-gradient(circle 2px at 57% 93%, rgba(255,255,200,0.85) 0%, transparent 100%),radial-gradient(circle 1.5px at 79% 90%, rgba(200,255,150,0.8) 0%, transparent 100%),radial-gradient(circle 2px at 96% 12%, rgba(255,255,180,0.85) 0%, transparent 100%),linear-gradient(180deg, #020a02 0%, #041204 25%, #051505 50%, #061808 75%, #040e04 100%)

Disco/Club/80s/Glitter:
→ bgColor "270 40% 3%", bubbleColor "320 100% 65%", bubbleTextColor "0 0% 0%", Bold, gradientColor "#ff00aa"
→ customCSS EXAMPLE:
radial-gradient(ellipse 80% 55% at 20% 15%, rgba(255,0,180,0.5) 0%, transparent 60%),radial-gradient(ellipse 70% 45% at 80% 70%, rgba(160,0,255,0.45) 0%, transparent 55%),radial-gradient(ellipse 60% 40% at 60% 20%, rgba(0,200,255,0.35) 0%, transparent 55%),radial-gradient(ellipse 50% 35% at 10% 75%, rgba(255,100,200,0.35) 0%, transparent 50%),radial-gradient(ellipse 55% 30% at 90% 30%, rgba(200,0,255,0.3) 0%, transparent 50%),radial-gradient(circle 2px at 5% 8%, rgba(255,215,0,0.95) 0%, transparent 100%),radial-gradient(circle 2px at 13% 22%, rgba(255,255,255,0.95) 0%, transparent 100%),radial-gradient(circle 2px at 19% 6%, rgba(0,255,255,0.9) 0%, transparent 100%),radial-gradient(circle 2px at 27% 35%, rgba(255,215,0,0.9) 0%, transparent 100%),radial-gradient(circle 2px at 34% 14%, rgba(255,255,255,0.95) 0%, transparent 100%),radial-gradient(circle 2px at 41% 28%, rgba(255,100,200,0.9) 0%, transparent 100%),radial-gradient(circle 2px at 49% 7%, rgba(255,215,0,0.95) 0%, transparent 100%),radial-gradient(circle 2px at 56% 42%, rgba(0,255,255,0.9) 0%, transparent 100%),radial-gradient(circle 2px at 63% 18%, rgba(255,255,255,0.95) 0%, transparent 100%),radial-gradient(circle 2px at 71% 31%, rgba(255,215,0,0.9) 0%, transparent 100%),radial-gradient(circle 2px at 78% 9%, rgba(255,100,200,0.95) 0%, transparent 100%),radial-gradient(circle 2px at 85% 24%, rgba(0,255,255,0.9) 0%, transparent 100%),radial-gradient(circle 2px at 93% 38%, rgba(255,215,0,0.9) 0%, transparent 100%),radial-gradient(circle 2px at 8% 52%, rgba(255,255,255,0.9) 0%, transparent 100%),radial-gradient(circle 2px at 17% 65%, rgba(255,215,0,0.95) 0%, transparent 100%),radial-gradient(circle 2px at 25% 78%, rgba(0,255,255,0.9) 0%, transparent 100%),radial-gradient(circle 2px at 36% 61%, rgba(255,100,200,0.9) 0%, transparent 100%),radial-gradient(circle 2px at 44% 74%, rgba(255,215,0,0.95) 0%, transparent 100%),radial-gradient(circle 2px at 52% 58%, rgba(255,255,255,0.9) 0%, transparent 100%),radial-gradient(circle 2px at 60% 82%, rgba(0,255,255,0.9) 0%, transparent 100%),radial-gradient(circle 2px at 68% 68%, rgba(255,100,200,0.95) 0%, transparent 100%),radial-gradient(circle 2px at 76% 55%, rgba(255,215,0,0.9) 0%, transparent 100%),radial-gradient(circle 2px at 84% 76%, rgba(255,255,255,0.95) 0%, transparent 100%),radial-gradient(circle 2px at 91% 62%, rgba(0,255,255,0.9) 0%, transparent 100%),radial-gradient(circle 2px at 3% 88%, rgba(255,215,0,0.85) 0%, transparent 100%),radial-gradient(circle 2px at 97% 85%, rgba(255,100,200,0.9) 0%, transparent 100%),linear-gradient(155deg, #04000a 0%, #0a0015 35%, #07000f 65%, #030008 100%)

Masquerade/Black tie/Luxury/Opera:
→ bgColor "270 50% 2%", bubbleColor "42 70% 60%", bubbleTextColor "0 0% 0%", Elegant, gradientColor "#c9a84c"
→ Note: this is the ONLY archetype where crosshatch texture is appropriate
→ customCSS EXAMPLE:
radial-gradient(ellipse 70% 50% at 50% 30%, rgba(130,0,180,0.4) 0%, transparent 60%),radial-gradient(ellipse 50% 40% at 15% 70%, rgba(180,0,130,0.35) 0%, transparent 55%),radial-gradient(ellipse 55% 35% at 85% 60%, rgba(100,0,160,0.35) 0%, transparent 55%),radial-gradient(ellipse 40% 25% at 70% 10%, rgba(160,0,120,0.25) 0%, transparent 50%),repeating-linear-gradient(45deg, rgba(200,168,76,0.06) 0px, rgba(200,168,76,0.06) 1px, transparent 1px, transparent 10px),repeating-linear-gradient(-45deg, rgba(200,168,76,0.06) 0px, rgba(200,168,76,0.06) 1px, transparent 1px, transparent 10px),radial-gradient(circle 2px at 8% 12%, rgba(212,175,55,0.85) 0%, transparent 100%),radial-gradient(circle 2px at 18% 38%, rgba(255,215,0,0.8) 0%, transparent 100%),radial-gradient(circle 2px at 28% 22%, rgba(212,175,55,0.85) 0%, transparent 100%),radial-gradient(circle 2px at 39% 55%, rgba(255,215,0,0.8) 0%, transparent 100%),radial-gradient(circle 2px at 51% 18%, rgba(212,175,55,0.85) 0%, transparent 100%),radial-gradient(circle 2px at 62% 42%, rgba(255,215,0,0.75) 0%, transparent 100%),radial-gradient(circle 2px at 73% 28%, rgba(212,175,55,0.85) 0%, transparent 100%),radial-gradient(circle 2px at 83% 58%, rgba(255,215,0,0.8) 0%, transparent 100%),radial-gradient(circle 2px at 92% 15%, rgba(212,175,55,0.85) 0%, transparent 100%),radial-gradient(circle 2px at 11% 68%, rgba(255,215,0,0.75) 0%, transparent 100%),radial-gradient(circle 2px at 33% 82%, rgba(212,175,55,0.8) 0%, transparent 100%),radial-gradient(circle 2px at 57% 72%, rgba(255,215,0,0.75) 0%, transparent 100%),radial-gradient(circle 2px at 79% 88%, rgba(212,175,55,0.8) 0%, transparent 100%),radial-gradient(circle 2px at 95% 72%, rgba(255,215,0,0.75) 0%, transparent 100%),linear-gradient(160deg, #050005 0%, #0c0010 30%, #080008 60%, #030003 100%)

RULES:
- NEVER use SVG, url(), image-set(), or any non-gradient CSS value
- Use at least 20 comma-separated gradient layers — more is better
- For glitter/club/disco: use 25+ tiny dot gradients, they are what make it look sparkly
- For nature themes: use large dappled glow blobs + scattered tiny dots as wildflowers/fireflies
- Glitter/sparkle/firefly dots must use "circle 2px at X% Y%" or "circle 1.5px at X% Y%" syntax
- Cloud puffs use large "ellipse 35% 15% at X% Y%" syntax in near-white/rgba(255,255,255,0.6+)
- Keep all rgba alpha values high enough to be visible (0.7+ for dots, 0.4+ for blobs)
- NO crosshatch repeating-linear-gradient textures UNLESS the event is masquerade/black-tie/luxury
- customCSS must be 500+ characters — short CSS means not enough layers
- Make every result feel genuinely unique and atmospheric for the specific event type
- IMPORTANT: The bubbleColor must always strongly contrast with and complement the customCSS background. Dark backgrounds need bright vivid bubbleColors. Light backgrounds need darker richer bubbleColors. Never use a similar hue for both background and bubble.

Return ONLY a valid JSON object. No markdown, no code fences, no explanation. Just the JSON.
The customCSS value must be a single-line string with no unescaped quotes and no newline characters inside it. Do not break string values across multiple lines.`;

const generateCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

const autoExpand = (e: React.FormEvent<HTMLTextAreaElement>) => {
  const t = e.currentTarget;
  t.style.height = "auto";
  t.style.height = t.scrollHeight + "px";
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
  const [bgPreset, _setBgPreset] = useState<string | null>(null);
  const [bgPresetIsImage, setBgPresetIsImage] = useState(false);
  const [textSize, setTextSize] = useState<(typeof TEXT_SIZES)[number]>("Medium");
  const [bubbleColor, setBubbleColor] = useState("82 100% 48%");
  const [bubbleTextColor, setBubbleTextColor] = useState("0 0% 10%");
  const [customAccentHex, setCustomAccentHex] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [eventCode, setEventCode] = useState("");
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [gradientColor, setGradientColor] = useState(GRADIENT_COLORS[0].color);
  const [fontStyle, setFontStyle] = useState<string>("Elegant");
  const [templateName, _setTemplateName] = useState<string>("planit-noir");
  const setTemplateName = (value: string) => {
    if (buildItAppliedRef.current && value !== "planit-custom") {
      console.log("[templateName] BLOCKED — Build It is active, refusing overwrite to:", value);
      return;
    }
    _setTemplateName(value);
  };
  const [showStyleScreen, setShowStyleScreen] = useState(!editCode);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showCustomiseDrawer, setShowCustomiseDrawer] = useState(false);
  const { toast } = useToast();
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
    customCSS: string;
  } | null>(null);
  const [buildItError, setBuildItError] = useState<string | null>(null);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [fontColor, setFontColor] = useState<string>("#ffffff");
  const [customLayout, setCustomLayout] = useState<"cards" | "editorial" | "ocean">("cards");
  const [bubbleStyle, setBubbleStyle] = useState<"frosted" | "solid" | "outlined">("frosted");
  const [rsvpDeadline, setRsvpDeadline] = useState("");
  const [showInviteDrawer, setShowInviteDrawer] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [inviteFriends, setInviteFriends] = useState<{user_id: string; name: string; avatar_url: string | null}[]>([]);
  const [inviteSelected, setInviteSelected] = useState<Set<string>>(new Set());
  const [inviting, setInviting] = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const customContainerRef = useRef<HTMLDivElement>(null);
  const stickerDragRef = useRef<{ id: string; startX: number; startY: number; sx: number; sy: number } | null>(null);
  const stickerPinchRef = useRef<{ id: string; initDist: number; initSize: number } | null>(null);
  const isDraggingRef = useRef(false);
  const activeStickerIdRef = useRef<string | null>(null);
  const didDragRef = useRef(false);
  const initialPinchDistRef = useRef(0);
  const initialStickerSizeRef = useRef(40);
  // Prevents a stale Supabase load callback from overwriting state after the user applies a Build It style
  const buildItAppliedRef = useRef(false);

  // Guarded setter: once Build It applies a CSS gradient, null writes are blocked
  // until the user explicitly picks a new template/bg (which clears buildItAppliedRef).
  const setBgPreset = (value: string | null) => {
    console.log("[bgPreset] SET TO:", value ? value.slice(0, 100) + (value.length > 100 ? "…" : "") : "null");
    if (buildItAppliedRef.current && value === null) {
      console.log("[bgPreset] BLOCKED — Build It gradient is active, refusing null overwrite");
      return;
    }
    _setBgPreset(value);
  };

  // Load event data if editing
  useEffect(() => {
    if (!editCode) return;
    let cancelled = false;
    setEditLoading(true);
    supabase
      .from("events")
      .select("*")
      .eq("code", editCode)
      .single()
      .then(({ data }) => {
        if (cancelled || buildItAppliedRef.current) return;
        if (data) {
          setTitle(data.title || "");
          setVibe(data.vibe || "");
          setLocation(data.location || "");
          setDateTime(data.date_time ? new Date(data.date_time).toISOString().slice(0, 16) : "");
          setRsvpDeadline(data.rsvp_deadline ? new Date(data.rsvp_deadline).toISOString().slice(0, 16) : "");
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
          const bp = data.bg_photo;
          const isCssGradient = !!(bp && (
            bp.startsWith("linear-gradient") ||
            bp.startsWith("radial-gradient") ||
            bp.startsWith("conic-gradient") ||
            bp.startsWith("repeating-")
          ));
          if (bp?.startsWith("planit-pattern:") || bp?.startsWith("solid-")) {
            setBgPreset(bp);
            setBgPresetIsImage(false);
          } else if (isCssGradient) {
            // Any CSS gradient — linear, radial, conic, repeating — produced by
            // Build It or the preset picker must be restored as bgPreset so the
            // planit-custom template preview renders identically to the guest view.
            setBgPreset(bp!);
            setBgPresetIsImage(false);
          } else if (bp?.startsWith("url(")) {
            setBgPreset(bp);
            setBgPresetIsImage(true);
          } else if (bp) {
            setBgPhoto(bp);
            setUploadedPhoto(bp);
          }
          setFontColor((data as any).font_color || "#ffffff");
          if ((data as any).stickers) {
            try {
              const parsed = JSON.parse((data as any).stickers);
              if (Array.isArray(parsed)) {
                setStickers(parsed);
              } else {
                setStickers(parsed.items || []);
                if (parsed.customLayout) { const cl = parsed.customLayout as string; setCustomLayout((cl === "centred" ? "cards" : cl === "cards" ? "cards" : cl === "ocean" ? "ocean" : "editorial") as "cards" | "editorial" | "ocean"); }
                if (parsed.bubbleStyle) setBubbleStyle(parsed.bubbleStyle as "frosted" | "solid" | "outlined");
                if (parsed.customAccentHex) setCustomAccentHex(parsed.customAccentHex as string);
              }
            } catch {}
          }
        }
        setEditLoading(false);
      });
    return () => { cancelled = true; };
  }, [editCode]);

  const loadFriendsForInvite = async () => {
    if (!user) return;
    setLoadingFriends(true);
    const { data: friendships } = await (supabase as any)
      .from("friendships")
      .select("*")
      .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .eq("status", "accepted");
    if (friendships?.length) {
      const otherIds = friendships.map((f: any) =>
        f.requester_id === user.id ? f.recipient_id : f.requester_id
      );
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", otherIds);
      setInviteFriends(profiles || []);
    } else {
      setInviteFriends([]);
    }
    setLoadingFriends(false);
  };

  const sendInvites = async () => {
    if (!eventCode || inviteSelected.size === 0) return;
    setInviting(true);
    // Get the event id from eventCode
    const { data: evData } = await supabase.from("events").select("id").eq("code", eventCode).single();
    if (evData) {
      const rows = [...inviteSelected].map((uid) => ({
        event_id: evData.id,
        user_id: uid,
        rsvp_status: "invited",
      }));
      await supabase.from("event_guests").upsert(rows, { onConflict: "event_id,user_id" });
    }
    setInviting(false);
    setShowInviteDrawer(false);
    setInviteSelected(new Set());
  };

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
      bg_photo: bgPreset || bgPhoto || null,
      text_size: textSize,
      bubble_color: bubbleColor,
      bubble_text_color: bubbleTextColor,
      gradient_color: gradientColor,
      font_style: fontStyle,
      template_name: templateName,
      font_color: fontColor,
      stickers: JSON.stringify({ items: stickers, customLayout, bubbleStyle, ...(customAccentHex ? { customAccentHex } : {}) }),
      rsvp_deadline: rsvpDeadline ? new Date(rsvpDeadline).toISOString() : null,
    } as any;

    // Helper: strip optional/new columns so the retry only sends core fields.
    // On ANY column error (PGRST116 or message mentioning a specific column)
    // we strip every field that might not exist in older DB schemas, keeping
    // all core style fields (bg_color, bg_photo, bubble_color, font_style,
    // gradient_color, template_name) so the Build It style is always saved.
    const withFallback = (data: any, err: any) => {
      if (!err) return null;
      const msg: string = err?.message || "";
      const isColError =
        err?.code === "PGRST116" ||
        msg.includes("column") ||
        msg.includes("font_color") ||
        msg.includes("stickers") ||
        msg.includes("bubble_text_color") ||
        msg.includes("text_size") ||
        msg.includes("font_color");
      if (isColError) {
        // Strip all columns that may be absent in an older schema
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { font_color, stickers: _s, bubble_text_color, text_size, ...safe } = data;
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
      buildItAppliedRef.current = false;
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
      console.log("[BuildIt] Calling Anthropic API directly. Prompt:", buildItPrompt.trim());

      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
      if (!apiKey) throw new Error("VITE_ANTHROPIC_API_KEY is not configured");

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-opus-4-8",
          max_tokens: 2048,
          system: BUILD_IT_SYSTEM_PROMPT,
          messages: [
            { role: "user", content: `Design the perfect visual style for this event: ${buildItPrompt.trim()}` },
          ],
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Anthropic API error ${res.status}: ${errText.slice(0, 200)}`);
      }

      const aiData = await res.json();
      const content: string = aiData.content?.[0]?.text ?? "";
      if (!content) throw new Error("Empty response from Anthropic");

      console.log("[BuildIt] Raw response (first 400):", content.slice(0, 400));

      // Robust JSON extraction with char-by-char newline sanitizer
      const extractJSON = (raw: string) => {
        let s = raw.replace(/```(?:json)?/g, "").trim();
        const start = s.indexOf("{");
        const end = s.lastIndexOf("}");
        if (start < 0 || end < 0) throw new Error("Could not extract JSON from response");
        s = s.slice(start, end + 1);
        try { return JSON.parse(s); } catch {}
        let out = "";
        let inStr = false;
        let esc = false;
        for (let i = 0; i < s.length; i++) {
          const ch = s[i];
          if (esc) { out += ch; esc = false; continue; }
          if (ch === "\\") { out += ch; esc = true; continue; }
          if (ch === '"') { out += ch; inStr = !inStr; continue; }
          if (inStr && ch === "\n") { out += "\\n"; continue; }
          if (inStr && ch === "\r") continue;
          out += ch;
        }
        return JSON.parse(out);
      };

      const style = extractJSON(content);
      style.template = "planit-custom";

      if (typeof style.customCSS !== "string" || !style.customCSS.trim()) {
        style.customCSS = `linear-gradient(135deg, hsl(${style.bgColor}) 0%, hsl(${style.bgColor}) 100%)`;
      }

      if (!["Bold", "Handwritten", "Elegant"].includes(style.fontStyle)) style.fontStyle = "Bold";

      const required = ["bgColor", "bubbleColor", "bubbleTextColor", "fontStyle", "gradientColor", "customCSS"];
      for (const field of required) {
        if (!style[field]) throw new Error(`Missing field in response: ${field}`);
      }

      console.log("[BuildIt] Style ready — customCSS length:", style.customCSS.length);
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

  useEffect(() => {
    const handler = (e: TouchEvent) => {
      if (isDraggingRef.current && activeStickerIdRef.current) e.preventDefault();
    };
    document.addEventListener("touchmove", handler, { passive: false });
    return () => document.removeEventListener("touchmove", handler);
  }, []);

  const applyStyle = () => {
    if (!buildItResult) return;
    // Mark that the user has applied a Build It style so any in-flight DB load callback won't overwrite it
    buildItAppliedRef.current = true;
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
    console.log("[BuildIt] → setBgPhoto(null), setBgPreset (customCSS):", buildItResult.customCSS.slice(0, 60));
    setBgPhoto(null);
    setBgPreset(buildItResult.customCSS);
    setCustomAccentHex(null);
    setBgPresetIsImage(false);
    console.log("[BuildIt] → setShowBuildIt(false) — closing modal");
    setShowBuildIt(false);
    setBuildItResult(null);
    setBuildItPrompt("");
    // Scroll to top so the user sees the updated layout
    window.scrollTo({ top: 0, behavior: "smooth" });
    console.log("[BuildIt] applyStyle dispatched — waiting for React re-render (see ★ STATE RENDER log)");
  };

  const eventUrl = eventCode ? `${window.location.origin}/event/${eventCode}` : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(eventUrl);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: `Join ${title || "my event"} on Planit!`, url: eventUrl });
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
    e.preventDefault();
    e.stopPropagation();
    didDragRef.current = false;
    activeStickerIdRef.current = id;
    setSelectedStickerId(prev => prev === id ? prev : id);
    const stk = stickers.find(s => s.id === id);
    if (!stk) return;
    if (e.touches.length === 1) {
      stickerDragRef.current = { id, startX: e.touches[0].clientX, startY: e.touches[0].clientY, sx: stk.x, sy: stk.y };
      stickerPinchRef.current = null;
      initialPinchDistRef.current = 0;
      isDraggingRef.current = true;
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0], t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      initialPinchDistRef.current = dist;
      initialStickerSizeRef.current = stk.size;
      stickerPinchRef.current = { id, initDist: dist, initSize: stk.size };
      stickerDragRef.current = null;
      isDraggingRef.current = false;
    }
  };
  const handleStickerTouchMove = (e: React.TouchEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.touches.length === 1 && stickerDragRef.current?.id === id) {
      const rect = customContainerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const dx = e.touches[0].clientX - stickerDragRef.current.startX;
      const dy = e.touches[0].clientY - stickerDragRef.current.startY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) didDragRef.current = true;
      setStickers(prev => prev.map(s => s.id === id ? { ...s, x: Math.max(0,Math.min(88, stickerDragRef.current!.sx + (dx/rect.width)*100)), y: Math.max(0,Math.min(88, stickerDragRef.current!.sy + (dy/rect.height)*100)) } : s));
    } else if (e.touches.length === 2) {
      if (initialPinchDistRef.current === 0) {
        const curStk = stickers.find(s => s.id === id);
        if (curStk) {
          const t1 = e.touches[0], t2 = e.touches[1];
          initialPinchDistRef.current = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
          initialStickerSizeRef.current = curStk.size;
          stickerPinchRef.current = { id, initDist: initialPinchDistRef.current, initSize: curStk.size };
        }
      }
      if (stickerPinchRef.current?.id === id && initialPinchDistRef.current > 0) {
        const t1 = e.touches[0], t2 = e.touches[1];
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        const newSize = Math.max(24, Math.min(180, initialStickerSizeRef.current * (dist / initialPinchDistRef.current)));
        setStickers(prev => prev.map(s => s.id === id ? { ...s, size: newSize } : s));
      }
    }
  };
  const handleStickerTouchEnd = (e: React.TouchEvent) => { e.preventDefault(); e.stopPropagation(); stickerDragRef.current = null; stickerPinchRef.current = null; initialPinchDistRef.current = 0; isDraggingRef.current = false; activeStickerIdRef.current = null; };

  // Loading screen for edit mode — prevents flash
  if (editLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: "#1a1a1a" }}>
        <p className="text-white/50 text-sm">Loading event...</p>
      </div>
    );
  }

  if (showCode) {
    const previewBgKey = bgPreset?.startsWith("planit-pattern:") || bgPreset?.startsWith("solid-") ? bgPreset : null;
    const previewCssGradient = bgPreset && (bgPreset.includes("gradient") || bgPreset.startsWith("radial")) ? bgPreset : null;
    const previewFontFam = FONT_MAP[fontStyle] || FONT_MAP["Bold"];
    const previewBgStyle: React.CSSProperties = previewBgKey
      ? getPatternBgStyle(previewBgKey)
      : previewCssGradient
        ? { background: bgPreset! }
        : bgPhoto
          ? { backgroundImage: `url(${bgPhoto})`, backgroundSize: "cover", backgroundPosition: "center" }
          : bgColor
            ? { backgroundColor: `hsl(${bgColor})` }
            : { backgroundColor: "#1a1a1a" };
    return (
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        {/* Header: back + live badge + event name */}
        <div className="px-5 pt-12 pb-3 shrink-0">
          <button onClick={() => navigate("/home")} className="mb-3">
            <ArrowLeft className="w-6 h-6 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-2 h-2 rounded-full bg-[#aaee44]" style={{ boxShadow: "0 0 6px #aaee44" }} />
            <span className="text-xs font-semibold text-muted-foreground">Event is live</span>
          </div>
          <p className="text-[22px] font-bold text-foreground leading-tight">{title || "Your Event"}</p>
        </div>

        {/* Body */}
        <div className="flex flex-col px-5 gap-3 flex-1 pb-8">
          {/* Mini preview card */}
          <div style={{ position: "relative", height: "130px", borderRadius: "16px", overflow: "hidden", flexShrink: 0, ...previewBgStyle }}>
            {previewBgKey?.startsWith("planit-pattern:") && <PatternOverlay patternKey={previewBgKey} />}
            {bgPhoto && <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.38)", zIndex: 1 }} />}
            <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
              <p style={{ fontFamily: previewFontFam, fontSize: "22px", fontWeight: 900, color: fontColor || "#fff", lineHeight: 1.05, textAlign: "center" }}>{title || "Your Event"}</p>
            </div>
          </div>

          {/* Event code row */}
          <div className="flex items-center bg-card border border-border rounded-xl px-4 py-3 shrink-0">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">Event code</p>
              <p className="font-black text-foreground text-lg tracking-[0.18em]" style={{ fontFamily: "'Courier New', monospace" }}>{eventCode}</p>
            </div>
            <button
              onClick={handleCopy}
              className="ml-3 w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors"
              style={{ backgroundColor: linkCopied ? "#aaee44" : "rgba(255,255,255,0.07)" }}
            >
              {linkCopied
                ? <Check className="w-4 h-4" style={{ color: "#111" }} />
                : <Copy className="w-4 h-4 text-muted-foreground" />}
            </button>
          </div>

          {/* Share button */}
          <button
            onClick={handleShare}
            className="w-full rounded-xl py-3.5 font-bold text-sm flex items-center justify-center gap-2 shrink-0"
            style={{ backgroundColor: "#aaee44", color: "#111" }}
          >
            <Share2 className="w-4 h-4" /> Share event
          </button>

          {/* Invite friends */}
          <button
            type="button"
            onClick={() => { setShowInviteDrawer(true); loadFriendsForInvite(); }}
            className="w-full rounded-xl py-3.5 font-bold text-sm flex items-center justify-center gap-2 bg-card border border-border text-foreground shrink-0"
          >
            <Users className="w-4 h-4" /> Invite friends
          </button>

          {/* Divider */}
          <div className="h-px bg-border shrink-0" />

          {/* View event */}
          <button
            onClick={() => navigate("/event/" + eventCode)}
            className="w-full rounded-xl py-3.5 font-bold text-sm flex items-center justify-center gap-1 border shrink-0"
            style={{ borderColor: "#aaee44", color: "#aaee44", backgroundColor: "transparent" }}
          >
            View event <span style={{ marginLeft: 2 }}>→</span>
          </button>
        </div>

        {/* Invite friends drawer */}
        <Drawer open={showInviteDrawer} onOpenChange={setShowInviteDrawer}>
          <DrawerContent className="bg-background border-t border-border max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Invite friends</h2>
              {inviteSelected.size > 0 && (
                <button
                  type="button"
                  onClick={sendInvites}
                  disabled={inviting}
                  className="text-sm font-bold px-4 py-1.5 rounded-full disabled:opacity-50"
                  style={{ backgroundColor: "#aaee44", color: "#111" }}
                >
                  {inviting ? "Sending..." : `Invite ${inviteSelected.size}`}
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {loadingFriends ? (
                <p className="text-sm text-muted-foreground text-center py-8">Loading friends...</p>
              ) : inviteFriends.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-sm text-muted-foreground">No friends to invite yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Add friends from the Friends page first</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {inviteFriends.map((f) => {
                    const selected = inviteSelected.has(f.user_id);
                    return (
                      <button
                        type="button"
                        key={f.user_id}
                        onClick={() => setInviteSelected(prev => {
                          const next = new Set(prev);
                          if (next.has(f.user_id)) next.delete(f.user_id); else next.add(f.user_id);
                          return next;
                        })}
                        className="w-full flex items-center gap-3 bg-card rounded-2xl px-4 py-3 border transition-colors"
                        style={{ borderColor: selected ? "#aaee44" : "hsl(var(--border))" }}
                      >
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary flex items-center justify-center shrink-0">
                          {f.avatar_url ? (
                            <img src={f.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-bold text-foreground text-sm">{f.name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <span className="flex-1 text-left font-semibold text-foreground text-sm">{f.name}</span>
                        <div
                          className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                          style={{ borderColor: selected ? "#aaee44" : "#555", backgroundColor: selected ? "#aaee44" : "transparent" }}
                        >
                          {selected && <Check className="w-3 h-3" style={{ color: "#111" }} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </DrawerContent>
        </Drawer>
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
  const accentColor = (templateName === "planit-custom" && customAccentHex) ? customAccentHex : `hsl(${bubbleColor})`;
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
  const noirFontSize = textSize === "Small" ? "28px" : textSize === "Large" ? "52px" : "38px";
  const customSubtitleSz = textSize === "Small" ? "9px" : textSize === "Large" ? "13px" : "11px";
  const customLabelSz = textSize === "Small" ? "8px" : textSize === "Large" ? "10px" : "9px";
  const customValueSz = textSize === "Small" ? "12px" : textSize === "Large" ? "16px" : "14px";
  const customHostedBySz = textSize === "Small" ? "10px" : textSize === "Large" ? "13px" : "11px";
  const isGalaxy = templateName === "galaxy";
  const isSunny = templateName === "sunny";
  const isMidnight = templateName === "midnight";
  const isOcean = templateName === "ocean";
  const isBlush = templateName === "blush";
  const isForest = templateName === "forest";
  console.log('[DEBUG] templateName at render:', templateName, 'isCustom:', templateName === "planit-custom");
  const isCustom = templateName === "planit-custom";
  const customPatternKey = bgPreset?.startsWith("planit-pattern:") ? bgPreset : null;
  const customBgKey = (bgPreset?.startsWith("planit-pattern:") || bgPreset?.startsWith("solid-")) ? bgPreset : null;
  const customCssGradient = bgPreset && (bgPreset.includes("gradient") || bgPreset.startsWith("radial")) ? bgPreset : null;
  const bgLForCustom = parseFloat(bgColor.trim().split(/[\s,]+/)[2] ?? "0");
  const customIsLight = customBgKey ? isLightPattern(customBgKey) : customCssGradient ? bgLForCustom > 55 : false;
  const customFrostBg = customIsLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.09)";
  const customFrostBorder = customIsLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.16)";
  const fontColorMuted = hexMuted(fontColor);
  const galaxyAccent = "#a78bfa";

  // Build It layout helpers — bubble card style based on bubbleStyle state
  const infoBubbleStyle: React.CSSProperties = bubbleStyle === "solid"
    ? { borderRadius: "20px", padding: "16px 18px", backgroundColor: accentColor }
    : bubbleStyle === "outlined"
      ? { borderRadius: "20px", border: `2px solid ${accentColor}`, padding: "16px 18px", backgroundColor: "transparent" }
      : { borderRadius: "20px", border: `1px solid ${customFrostBorder}`, padding: "16px 18px", backgroundColor: customFrostBg, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" };
  const infoBubbleTextColor = bubbleStyle === "solid" ? `hsl(${bubbleTextColor})` : fontColor;
  const infoBubbleLabelColor = bubbleStyle === "solid" ? `hsl(${bubbleTextColor})` : accentColor;

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
          : isCustom && customCssGradient
            ? { background: bgPreset! }
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
                  rows={2} onInput={autoExpand}
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
                  rows={2} onInput={autoExpand}
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
                  rows={2} onInput={autoExpand}
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
                <input type="text" value={vibe} onChange={(e) => setVibe(e.target.value)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "text", zIndex: 10 }} />
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
                <textarea value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Anything else your guests should know..." rows={2} onInput={autoExpand} className="w-full bg-transparent outline-none resize-none placeholder:opacity-20" style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }} />
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
              <textarea value={vibe} onChange={(e) => setVibe(e.target.value)} placeholder="Add a tagline..." rows={1} className="w-full bg-transparent outline-none resize-none placeholder:opacity-20" style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", fontStyle: "italic", color: "rgba(74,222,128,0.45)", marginBottom: "14px" }} />

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
                <textarea value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Anything else your guests should know..." rows={2} onInput={autoExpand} className="w-full bg-transparent outline-none resize-none placeholder:opacity-20" style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }} />
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
                    rows={2} onInput={autoExpand}
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
                  rows={2} onInput={autoExpand}
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
              : customCssGradient
                ? { background: bgPreset! }
                : bgPhoto
                  ? { backgroundColor: "transparent", backgroundImage: `url(${bgPhoto})`, backgroundSize: "cover", backgroundPosition: "center" }
                  : { backgroundColor: `hsl(${bgColor})`, backgroundImage: "none", backgroundSize: "auto" };
            const hasPhotoScrim = !!bgPhoto;
            return (
              <div ref={customContainerRef} style={{ minHeight: "100vh", position: "relative", overflow: "hidden", touchAction: "none", ...patternStyle }} onClick={() => setSelectedStickerId(null)}>
                {/* Pattern overlays for complex patterns */}
                {customPatternKey && <PatternOverlay patternKey={customPatternKey} />}
                {/* Photo scrim */}
                {hasPhotoScrim && <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 1, pointerEvents: "none" }} />}
                {/* Stickers layer */}
                {stickers.map(stk => {
                  const isTabler = stk.emoji.startsWith("tabler:");
                  const TablerIcon = isTabler ? TABLER_ICON_MAP[stk.emoji.replace("tabler:", "")] : null;
                  return (
                    <div
                      key={stk.id}
                      style={{ position: "absolute", left: `${stk.x}%`, top: `${stk.y}%`, fontSize: `${stk.size}px`, zIndex: 30, cursor: "move", userSelect: "none" as const, touchAction: "none", lineHeight: 1 }}
                      onTouchStart={(e) => handleStickerTouchStart(e, stk.id)}
                      onTouchMove={(e) => handleStickerTouchMove(e, stk.id)}
                      onTouchEnd={handleStickerTouchEnd}
                      onClick={(e) => { e.stopPropagation(); if (didDragRef.current) { didDragRef.current = false; return; } setSelectedStickerId(prev => prev === stk.id ? null : stk.id); }}
                    >
                      {TablerIcon ? <TablerIcon size={stk.size} stroke={1.5} color={fontColor} /> : stk.emoji}
                      {selectedStickerId === stk.id && (
                        <button
                          style={{ position: "absolute", top: "-10px", right: "-10px", width: "22px", height: "22px", borderRadius: "50%", backgroundColor: "#ff3b30", border: "2px solid #fff", color: "#fff", fontSize: "11px", fontWeight: 900, cursor: "pointer", zIndex: 40, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
                          onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); deleteSticker(stk.id); }}
                        >✕</button>
                      )}
                    </div>
                  );
                })}
                {/* Back nav */}
                <button onClick={() => navigate(editCode ? `/event/${editCode}` : "/home")} className="absolute top-5 left-5 z-20">
                  <ArrowLeft className="w-6 h-6" style={{ color: fontColor }} />
                </button>
                {/* Content — three layout variants */}
                {customLayout === "ocean" ? (
                  /* ── Ocean layout: YOU'RE INVITED, stat cards, full-width info ── */
                  <div className="px-5 pt-16 pb-4 relative z-10">
                    <div className="text-center mb-1">
                      <p style={{ fontFamily:"'Inter',sans-serif",fontSize:customSubtitleSz,fontWeight:700,letterSpacing:"0.28em",textTransform:"uppercase" as const,color:`${accentColor}90`,marginBottom:"10px" }}>You're Invited</p>
                      <div style={{ position:"relative",marginBottom:"8px" }}>
                        <input type="text" value={title} onChange={(e)=>{setTitle(e.target.value);setTitleError("");}} placeholder="Event name..." className="w-full bg-transparent outline-none text-center placeholder:opacity-20 block" style={{ fontFamily:currentFontFamily,fontSize:noirFontSize,fontWeight:900,color:fontColor,lineHeight:1.05 }} />
                        {titleError && <p className="text-red-400 text-xs mt-1">{titleError}</p>}
                      </div>
                      <div style={{ position:"relative",marginBottom:"6px",display:"inline-block" }}>
                        <textarea value={vibe} onChange={(e)=>setVibe(e.target.value)} placeholder="Add a tagline..." rows={1} className="bg-transparent outline-none resize-none text-center placeholder:opacity-20" style={{ fontFamily:"'Inter',sans-serif",fontSize:customSubtitleSz,fontStyle:"italic",color:`${accentColor}70` }} />
                      </div>
                      <p style={{ fontFamily:"'Inter',sans-serif",fontSize:customHostedBySz,color:fontColorMuted,marginBottom:"12px" }}>hosted by {hostName}</p>
                      <div style={{ margin:"10px 0 4px" }}>
                        <svg viewBox="0 0 320 20" xmlns="http://www.w3.org/2000/svg" style={{ width:"100%",height:"20px",display:"block" }}>
                          <path d="M0,10 C26.7,2 53.3,18 80,10 C106.7,2 133.3,18 160,10 C186.7,2 213.3,18 240,10 C266.7,2 293.3,18 320,10" stroke={`${accentColor}40`} strokeWidth="1.5" fill="none" strokeLinecap="round" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px" }}>
                        <div style={{ backgroundColor:"rgba(255,255,255,0.07)",border:`1px solid ${accentColor}25`,borderRadius:"16px",padding:"14px 8px",textAlign:"center" as const,position:"relative" }}>
                          <p style={{ fontFamily:"'Inter',sans-serif",fontSize:customLabelSz,fontWeight:700,letterSpacing:"0.22em",textTransform:"uppercase" as const,color:`${accentColor}80`,marginBottom:"8px" }}>Day</p>
                          <span style={{ fontFamily:"'Inter',sans-serif",fontSize:"28px",fontWeight:900,color:fontColor,lineHeight:1,display:"block" }}>{dayNum||"—"}</span>
                          <p style={{ fontFamily:"'Inter',sans-serif",fontSize:"9px",fontWeight:700,color:accentColor,textTransform:"uppercase" as const,letterSpacing:"0.1em",marginTop:"5px",opacity:0.8 }}>{monthName||"TBD"}</p>
                          <input type="datetime-local" value={dateTime} onChange={(e)=>setDateTime(e.target.value)} style={{ position:"absolute",inset:0,width:"100%",height:"100%",opacity:0,cursor:"pointer",zIndex:10 }} />
                        </div>
                        <div style={{ backgroundColor:"rgba(255,255,255,0.07)",border:`1px solid ${accentColor}25`,borderRadius:"16px",padding:"14px 8px",textAlign:"center" as const,position:"relative" }}>
                          <p style={{ fontFamily:"'Inter',sans-serif",fontSize:customLabelSz,fontWeight:700,letterSpacing:"0.22em",textTransform:"uppercase" as const,color:`${accentColor}80`,marginBottom:"8px" }}>Time</p>
                          <span style={{ fontFamily:"'Inter',sans-serif",fontSize:eventDate?"17px":"28px",fontWeight:900,color:eventDate?fontColor:`${fontColor}30`,lineHeight:1,display:"block" }}>{eventDate?timeStr:"—"}</span>
                          <p style={{ fontFamily:"'Inter',sans-serif",fontSize:"9px",fontWeight:700,color:accentColor,textTransform:"uppercase" as const,letterSpacing:"0.06em",marginTop:"5px",opacity:0.7 }}>{dayOfWeek?dayOfWeek.slice(0,3).toUpperCase():"TBD"}</p>
                          <input type="datetime-local" value={dateTime} onChange={(e)=>setDateTime(e.target.value)} style={{ position:"absolute",inset:0,width:"100%",height:"100%",opacity:0,cursor:"pointer",zIndex:10 }} />
                        </div>
                        <div style={{ backgroundColor:"rgba(255,255,255,0.07)",border:`1px solid ${accentColor}25`,borderRadius:"16px",padding:"14px 8px",textAlign:"center" as const }}>
                          <p style={{ fontFamily:"'Inter',sans-serif",fontSize:customLabelSz,fontWeight:700,letterSpacing:"0.22em",textTransform:"uppercase" as const,color:`${accentColor}80`,marginBottom:"8px" }}>Going</p>
                          <span style={{ fontFamily:"'Inter',sans-serif",fontSize:"28px",fontWeight:900,color:fontColor,lineHeight:1,display:"block" }}>0</span>
                          <p style={{ fontFamily:"'Inter',sans-serif",fontSize:"9px",fontWeight:700,color:accentColor,textTransform:"uppercase" as const,letterSpacing:"0.1em",marginTop:"5px",opacity:0.8 }}>Guests</p>
                        </div>
                      </div>
                      <div style={{ backgroundColor:"rgba(255,255,255,0.07)",border:`1px solid ${accentColor}25`,borderRadius:"50px",padding:"14px 22px",position:"relative" }}>
                        <p style={{ fontFamily:"'Inter',sans-serif",fontSize:customLabelSz,fontWeight:700,letterSpacing:"0.22em",textTransform:"uppercase" as const,color:`${accentColor}80`,marginBottom:"4px" }}>📍 Location</p>
                        <p style={{ fontFamily:"'Inter',sans-serif",fontSize:customValueSz,fontWeight:700,color:location?fontColor:`${fontColor}30` }}>{location||"Where's the event?"}</p>
                        <input type="text" value={location} onChange={(e)=>setLocation(e.target.value)} style={{ position:"absolute",inset:0,width:"100%",height:"100%",opacity:0,cursor:"text",zIndex:10 }} />
                      </div>
                      <div style={{ backgroundColor:"rgba(255,255,255,0.07)",border:`1px solid ${accentColor}25`,borderRadius:"50px",padding:"14px 22px",position:"relative" }}>
                        <p style={{ fontFamily:"'Inter',sans-serif",fontSize:customLabelSz,fontWeight:700,letterSpacing:"0.22em",textTransform:"uppercase" as const,color:`${accentColor}80`,marginBottom:"4px" }}>🎭 Dress Code</p>
                        <p style={{ fontFamily:"'Inter',sans-serif",fontSize:customValueSz,fontWeight:700,color:dressCode?fontColor:`${fontColor}30` }}>{dressCode||"Theme..."}</p>
                        <input type="text" value={dressCode} onChange={(e)=>setDressCode(e.target.value)} style={{ position:"absolute",inset:0,width:"100%",height:"100%",opacity:0,cursor:"text",zIndex:10 }} />
                      </div>
                      <div style={{ backgroundColor:"rgba(255,255,255,0.05)",border:`1px solid ${accentColor}15`,borderRadius:"16px",padding:"14px 16px" }}>
                        <p style={{ fontFamily:"'Inter',sans-serif",fontSize:customLabelSz,fontWeight:700,letterSpacing:"0.22em",textTransform:"uppercase" as const,color:`${accentColor}60`,marginBottom:"6px" }}>From the host</p>
                        <textarea value={extra} onChange={(e)=>setExtra(e.target.value)} placeholder="Anything else your guests should know..." rows={2} onInput={autoExpand} className="w-full bg-transparent outline-none resize-none placeholder:opacity-20" style={{ fontFamily:"'Inter',sans-serif",fontSize:customValueSz,color:fontColor,lineHeight:1.5 }} />
                      </div>
                    </div>
                  </div>
                ) : customLayout === "editorial" ? (
                  /* ── Editorial layout: left-aligned title + frosted info bubbles ── */
                  <div className="flex flex-col px-6 pt-20 pb-8 relative z-10">
                    <div style={{ position:"relative",marginBottom:"16px",alignSelf:"flex-start" }}>
                      <div style={{ border:`1px solid ${accentColor}55`,borderRadius:"6px",padding:"2px 10px",backgroundColor:`${accentColor}15`,display:"inline-block" }}>
                        <span style={{ fontFamily:"'Inter',sans-serif",fontSize:customSubtitleSz,fontWeight:700,letterSpacing:"0.2em",textTransform:"uppercase" as const,color:vibe?accentColor:`${accentColor}45` }}>{vibe||"Event type..."}</span>
                      </div>
                      <input type="text" value={vibe} onChange={(e)=>setVibe(e.target.value)} style={{ position:"absolute",inset:0,width:"100%",height:"100%",opacity:0,cursor:"text",zIndex:10 }} />
                    </div>
                    <input type="text" value={title} onChange={(e)=>{setTitle(e.target.value);setTitleError("");}} placeholder="Event name..." className="w-full bg-transparent outline-none placeholder:opacity-20 block" style={{ fontFamily:currentFontFamily,fontSize:noirFontSize,fontWeight:fontStyle==="Bold"?400:900,color:fontColor,lineHeight:0.95,marginBottom:"8px",textShadow:customIsLight?"none":"0 1px 12px rgba(0,0,0,0.4)" }} />
                    {titleError && <p className="text-red-400 text-xs mb-2">{titleError}</p>}
                    <p style={{ fontFamily:"'Inter',sans-serif",fontSize:customHostedBySz,color:fontColorMuted,marginBottom:"18px" }}>hosted by {hostName}</p>
                    <div style={{ width:"56px",height:"3px",backgroundColor:accentColor,marginBottom:"22px",borderRadius:"2px" }} />
                    <div style={{ position:"relative",marginBottom:"18px" }}>
                      <div className="flex items-center gap-3">
                        <span style={{ fontSize:"15px" }}>📅</span>
                        <div>
                          <p style={{ fontFamily:"'Inter',sans-serif",fontSize:customLabelSz,fontWeight:700,letterSpacing:"0.18em",textTransform:"uppercase" as const,color:accentColor,marginBottom:"2px" }}>Date & Time</p>
                          <p style={{ fontFamily:currentFontFamily,fontSize:customValueSz,color:fontColor,lineHeight:1.1 }}>
                            {dayNum?`${dayNum} ${monthName}`:"Add date"}<span style={{ opacity:0.5,margin:"0 6px" }}>·</span>{timeStr||"Add time"}
                          </p>
                        </div>
                      </div>
                      <input type="datetime-local" value={dateTime} onChange={(e)=>setDateTime(e.target.value)} style={{ position:"absolute",inset:0,width:"100%",height:"100%",opacity:0,cursor:"pointer",zIndex:10 }} />
                    </div>
                    <div className="w-full flex flex-col gap-3">
                      <div style={{ ...infoBubbleStyle,position:"relative" }}>
                        <p style={{ fontFamily:"'Inter',sans-serif",fontSize:customLabelSz,fontWeight:700,letterSpacing:"0.22em",textTransform:"uppercase" as const,color:infoBubbleLabelColor,marginBottom:"5px" }}>Location</p>
                        <p style={{ fontFamily:currentFontFamily,fontSize:customValueSz,fontWeight:fontStyle==="Bold"?400:600,color:location?infoBubbleTextColor:`${infoBubbleTextColor}40`,lineHeight:1.2 }}>{location||"Where's the event?"}</p>
                        <input type="text" value={location} onChange={(e)=>setLocation(e.target.value)} style={{ position:"absolute",inset:0,width:"100%",height:"100%",opacity:0,cursor:"text",zIndex:10 }} />
                      </div>
                      <div style={{ ...infoBubbleStyle,position:"relative" }}>
                        <p style={{ fontFamily:"'Inter',sans-serif",fontSize:customLabelSz,fontWeight:700,letterSpacing:"0.22em",textTransform:"uppercase" as const,color:infoBubbleLabelColor,marginBottom:"5px" }}>Dress Code</p>
                        <p style={{ fontFamily:currentFontFamily,fontSize:customValueSz,fontWeight:fontStyle==="Bold"?400:600,color:dressCode?infoBubbleTextColor:`${infoBubbleTextColor}40`,lineHeight:1.2 }}>{dressCode||"Theme..."}</p>
                        <input type="text" value={dressCode} onChange={(e)=>setDressCode(e.target.value)} style={{ position:"absolute",inset:0,width:"100%",height:"100%",opacity:0,cursor:"text",zIndex:10 }} />
                      </div>
                      <div style={{ ...infoBubbleStyle }}>
                        <p style={{ fontFamily:"'Inter',sans-serif",fontSize:customLabelSz,fontWeight:700,letterSpacing:"0.22em",textTransform:"uppercase" as const,color:infoBubbleLabelColor,marginBottom:"5px" }}>From the host</p>
                        <textarea value={extra} onChange={(e)=>setExtra(e.target.value)} placeholder="Anything else..." rows={2} onInput={autoExpand} className="w-full bg-transparent outline-none resize-none placeholder:opacity-20" style={{ fontFamily:"'Inter',sans-serif",fontSize:customValueSz,color:infoBubbleTextColor,lineHeight:1.5 }} />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ── Cards layout (default): centred with frosted info bubbles ── */
                  <div className="flex flex-col items-center text-center px-5 pt-16 pb-6 relative z-10">
                    <div style={{ display:"inline-block",position:"relative",marginBottom:"10px" }}>
                      <div style={{ border:`1px solid ${accentColor}55`,borderRadius:"50px",padding:"3px 12px",backgroundColor:`${accentColor}15`,backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)" }}>
                        <span style={{ fontFamily:"'Inter',sans-serif",fontSize:customSubtitleSz,fontWeight:700,letterSpacing:"0.18em",textTransform:"uppercase" as const,color:vibe?accentColor:`${accentColor}45` }}>{vibe||"Event type..."}</span>
                      </div>
                      <input type="text" value={vibe} onChange={(e)=>setVibe(e.target.value)} style={{ position:"absolute",inset:0,width:"100%",height:"100%",opacity:0,cursor:"text",zIndex:10 }} />
                    </div>
                    <input type="text" value={title} onChange={(e)=>{setTitle(e.target.value);setTitleError("");}} placeholder="Event name..." className="w-full bg-transparent outline-none placeholder:opacity-20 text-center block" style={{ fontFamily:currentFontFamily,fontSize:noirFontSize,fontWeight:fontStyle==="Bold"?400:800,color:fontColor,lineHeight:1.05,marginBottom:"6px",textShadow:customIsLight?"none":"0 1px 8px rgba(0,0,0,0.5)" }} />
                    {titleError && <p className="text-red-400 text-xs mb-2">{titleError}</p>}
                    <p style={{ fontFamily:"'Inter',sans-serif",fontSize:customHostedBySz,color:fontColorMuted,marginBottom:"20px",textShadow:customIsLight?"none":"0 1px 6px rgba(0,0,0,0.4)" }}>hosted by {hostName}</p>
                    <div style={{ position:"relative",marginBottom:"20px" }}>
                      <div style={{ borderRadius:"50px",padding:"10px 22px",backgroundColor:accentColor,display:"inline-block",boxShadow:"0 2px 14px rgba(0,0,0,0.28)" }}>
                        <span style={{ fontFamily:currentFontFamily,fontSize:customValueSz,fontWeight:fontStyle==="Bold"?400:700,color:`hsl(${bubbleTextColor})`,letterSpacing:fontStyle==="Bold"?"0.05em":0 }}>
                          {dayNum?`${dayNum} ${monthName}`:"Date"}<span style={{ color:`hsl(${bubbleTextColor})`,opacity:0.6,margin:"0 8px" }}>·</span>{timeStr||"Time"}
                        </span>
                      </div>
                      <input type="datetime-local" value={dateTime} onChange={(e)=>setDateTime(e.target.value)} style={{ position:"absolute",inset:0,width:"100%",height:"100%",opacity:0,cursor:"pointer",zIndex:10 }} />
                    </div>
                    <div className="w-full flex flex-col gap-3">
                      <div style={{ ...infoBubbleStyle,position:"relative" }}>
                        <p style={{ fontFamily:"'Inter',sans-serif",fontSize:customLabelSz,fontWeight:700,letterSpacing:"0.22em",textTransform:"uppercase" as const,color:infoBubbleLabelColor,marginBottom:"5px" }}>Location</p>
                        <p style={{ fontFamily:currentFontFamily,fontSize:customValueSz,fontWeight:fontStyle==="Bold"?400:600,color:location?infoBubbleTextColor:`${infoBubbleTextColor}40`,lineHeight:1.2 }}>{location||"Where's the event?"}</p>
                        <input type="text" value={location} onChange={(e)=>setLocation(e.target.value)} style={{ position:"absolute",inset:0,width:"100%",height:"100%",opacity:0,cursor:"text",zIndex:10 }} />
                      </div>
                      <div style={{ ...infoBubbleStyle,position:"relative" }}>
                        <p style={{ fontFamily:"'Inter',sans-serif",fontSize:customLabelSz,fontWeight:700,letterSpacing:"0.22em",textTransform:"uppercase" as const,color:infoBubbleLabelColor,marginBottom:"5px" }}>Dress Code</p>
                        <p style={{ fontFamily:currentFontFamily,fontSize:customValueSz,fontWeight:fontStyle==="Bold"?400:600,color:dressCode?infoBubbleTextColor:`${infoBubbleTextColor}40`,lineHeight:1.2 }}>{dressCode||"Theme..."}</p>
                        <input type="text" value={dressCode} onChange={(e)=>setDressCode(e.target.value)} style={{ position:"absolute",inset:0,width:"100%",height:"100%",opacity:0,cursor:"text",zIndex:10 }} />
                      </div>
                      <div style={{ ...infoBubbleStyle }}>
                        <p style={{ fontFamily:"'Inter',sans-serif",fontSize:customLabelSz,fontWeight:700,letterSpacing:"0.22em",textTransform:"uppercase" as const,color:infoBubbleLabelColor,marginBottom:"5px" }}>From the host</p>
                        <textarea value={extra} onChange={(e)=>setExtra(e.target.value)} placeholder="Anything else..." rows={2} onInput={autoExpand} className="w-full bg-transparent outline-none resize-none placeholder:opacity-20 text-center" style={{ fontFamily:"'Inter',sans-serif",fontSize:customValueSz,color:infoBubbleTextColor,lineHeight:1.5 }} />
                      </div>
                    </div>
                  </div>
                )}
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
              background: customCssGradient ? bgPreset! : `linear-gradient(to bottom, ${gradientColor} 0%, ${containerBg} 100%)`,
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
                  rows={2} onInput={autoExpand}
                  className="w-full bg-transparent outline-none resize-none text-sm mt-1 placeholder:opacity-30"
                  style={{ color: bgTextSoft }}
                />
              </div>
            </div>
          </div>
        </>
      )}

      <div className="px-5 pb-10">
        <div className="flex gap-3 mt-2">
          <button
            onClick={() => setShowCustomiseDrawer(true)}
            className="flex-1 rounded-2xl py-4 text-sm font-bold"
            style={{ backgroundColor: "#1a1a1a", color: "#fff", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            Customise
          </button>
          <button
            onClick={handleCreate}
            className="flex-1 rounded-2xl py-4 text-sm font-extrabold"
            style={{ backgroundColor: "#aaee44", color: "#111" }}
          >
            {editCode ? "Update Event" : "Create Event"}
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
      </div>

      {/* ─── Customise drawer ─── */}
      {showCustomiseDrawer && (
        <div
          className="fixed inset-0 z-40"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setShowCustomiseDrawer(false)}
        >
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-2xl px-5 pt-4 pb-8"
            style={{ backgroundColor: "#141414", maxHeight: "55vh", overflowY: "auto", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto w-10 h-1 rounded-full mb-4" style={{ backgroundColor: "#333" }} />
            {customCssGradient ? (
              /* ─── Build It panel ─── */
              <div className="flex flex-col gap-5 pb-2">
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2.5">Font</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(["Bold","Handwritten","Elegant"] as const).map(fv => (
                      <button key={fv} onClick={() => setFontStyle(fv)} className="py-2.5 rounded-xl text-sm text-center" style={{ backgroundColor:"#1e1e1e", border: fontStyle===fv ? "2px solid #aaee44" : "2px solid transparent", fontFamily: FONT_MAP[fv], color:"#fff" }}>{fv}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2.5">Size</p>
                  <div className="flex gap-2">
                    {(["Small","Medium","Large"] as const).map((sz, i) => (
                      <button key={sz} onClick={() => setTextSize(sz)} className="flex-1 py-2.5 rounded-xl font-bold" style={{ backgroundColor:"#1e1e1e", border: textSize===sz ? "2px solid #aaee44" : "2px solid transparent", color:"#fff", fontSize:[12,14,16][i] }}>
                        {["S","M","L"][i]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2.5">Font colour</p>
                  <div className="flex flex-wrap gap-2.5">
                    {FONT_COLORS.map(c => (
                      <button key={c.value} onClick={() => setFontColor(c.value)} title={c.label} style={{ width:32,height:32,borderRadius:"50%",backgroundColor:c.value,border:fontColor===c.value?"3px solid #aaee44":"2px solid rgba(255,255,255,0.2)",flexShrink:0 }} />
                    ))}
                    <label title="Custom" style={{ width:32,height:32,borderRadius:"50%",background:"conic-gradient(red,yellow,lime,cyan,blue,magenta,red)",border:"2px solid rgba(255,255,255,0.2)",cursor:"pointer",flexShrink:0,display:"block",position:"relative" }}>
                      <input type="color" value={fontColor} onChange={e => setFontColor(e.target.value)} style={{ position:"absolute",inset:0,opacity:0,cursor:"pointer",width:"100%",height:"100%" }} />
                    </label>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2.5">Accent colour</p>
                  <div className="flex flex-wrap gap-2.5">
                    {(["#ffffff","#ffd700","#ff70b0","#38bdf8","#aaee44","#ff6b6b","#4ade80","#c084fc"] as const).map(hex => (
                      <button key={hex} onClick={() => setCustomAccentHex(hex)} style={{ width:32,height:32,borderRadius:"50%",backgroundColor:hex,border:customAccentHex===hex?"3px solid #aaee44":"2px solid rgba(255,255,255,0.2)",flexShrink:0 }} />
                    ))}
                    <label style={{ width:32,height:32,borderRadius:"50%",background:"conic-gradient(red,yellow,lime,cyan,blue,magenta,red)",border:"2px solid rgba(255,255,255,0.2)",cursor:"pointer",flexShrink:0,display:"block",position:"relative" }}>
                      <input type="color" value={customAccentHex||"#aaee44"} onChange={e => setCustomAccentHex(e.target.value)} style={{ position:"absolute",inset:0,opacity:0,cursor:"pointer",width:"100%",height:"100%" }} />
                    </label>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2.5">Info cards</p>
                  <div className="grid grid-cols-3 gap-2">
                    {([ ["frosted","Frosted"], ["solid","Solid"], ["outlined","Outlined"] ] as const).map(([val, label]) => (
                      <button key={val} onClick={() => setBubbleStyle(val)} className="py-2.5 rounded-xl text-sm text-center" style={{ backgroundColor:"#1e1e1e", border: bubbleStyle===val ? "2px solid #aaee44" : "2px solid transparent", color:"#fff" }}>{label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2.5">Stickers</p>
                  {STICKER_CATEGORIES.map((cat) => (
                    <div key={cat.label} className="mb-3">
                      <p className="text-[9px] text-white/30 uppercase tracking-widest mb-2">{cat.label}</p>
                      <div className="grid grid-cols-6 gap-2">
                        {cat.keys.map((key) => {
                          const Icon = TABLER_ICON_MAP[key];
                          return (
                            <button key={key} onClick={() => addSticker(`tabler:${key}`)} className="flex items-center justify-center rounded-xl" style={{ height:40, backgroundColor:"#1e1e1e", border:"1px solid rgba(255,255,255,0.08)" }}>
                              {Icon && <Icon size={20} stroke={1.5} color="#fff" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => { setShowCustomiseDrawer(false); setTimeout(() => { setShowBuildIt(true); setBuildItError(null); }, 200); }}
                  className="w-full rounded-2xl py-3.5 text-sm font-bold"
                  style={{ background:"linear-gradient(135deg,#7c3aed,#db2777)",color:"#fff",border:"none" }}
                >
                  ✦ Regenerate Background
                </button>
              </div>
            ) : (
              /* ─── Start Blank / canvas customise panel ─── */
              <div className="flex flex-col gap-6 pb-4">

                {/* BACKGROUND */}
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Background</p>
                  <div className="flex gap-2.5 mb-3">
                    {BLANK_BG_COLORS.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => { buildItAppliedRef.current = false; setBgColor(c.hsl); setBgPreset(null); setBgPhoto(null); setBgPresetIsImage(false); }}
                        className="w-9 h-9 rounded-full shrink-0 transition-all"
                        style={{ backgroundColor: c.hex, border: bgColor === c.hsl && !bgPreset && !bgPhoto ? "3px solid #aaee44" : "2px solid rgba(255,255,255,0.18)", transform: bgColor === c.hsl && !bgPreset && !bgPhoto ? "scale(1.15)" : "scale(1)" }}
                        title={c.name}
                      />
                    ))}
                    <label title="Custom colour" className="w-9 h-9 rounded-full shrink-0 cursor-pointer relative" style={{ background: "conic-gradient(red,yellow,lime,cyan,blue,magenta,red)", border: "2px solid rgba(255,255,255,0.18)" }}>
                      <input type="color" onChange={e => { buildItAppliedRef.current = false; const hex = e.target.value; const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16); const max=Math.max(r,g,b)/255,min=Math.min(r,g,b)/255,l=(max+min)/2; const s=max===min?0:(max-min)/(l<0.5?max+min:2-max-min); const h=max===r?((g/255-b/255)/(max-min)*60+360)%360:max===g?(b/255-r/255)/(max-min)*60+120:(r/255-g/255)/(max-min)*60+240; setBgColor(`${Math.round(h)} ${Math.round(s*100)}% ${Math.round(l*100)}%`); setBgPreset(null); setBgPhoto(null); setBgPresetIsImage(false); }} style={{ position:"absolute",inset:0,opacity:0,cursor:"pointer",width:"100%",height:"100%" }} />
                    </label>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                    {CUSTOM_BG_PATTERNS.map((p) => {
                      const patStyle = getPatternBgStyle(p.key);
                      const isActive = bgPreset === p.key;
                      return (
                        <button
                          key={p.key}
                          onClick={() => { buildItAppliedRef.current = false; setBgPreset(p.key); setBgPhoto(null); setBgPresetIsImage(false); }}
                          className="shrink-0 flex flex-col items-center gap-1 rounded-lg overflow-hidden transition-all"
                          style={{ border: isActive ? "2px solid #aaee44" : "2px solid rgba(255,255,255,0.12)", width: 52 }}
                          title={p.name}
                        >
                          <div style={{ width: "100%", height: 36, ...patStyle }} />
                          <span style={{ fontSize: 8, color: "#888", paddingBottom: 3, lineHeight: 1, textAlign: "center" as const }}>{p.name}</span>
                        </button>
                      );
                    })}
                  </div>
                  <label
                    className="mt-3 w-full rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-semibold cursor-pointer"
                    style={{ border: "1.5px dashed rgba(255,255,255,0.25)", color: "#888", backgroundColor: "transparent" }}
                  >
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                    <Upload className="w-4 h-4" /> Upload from camera roll
                  </label>
                </div>

                {/* TEXT */}
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Text</p>
                  <div className="flex gap-2.5 mb-3">
                    {([
                      { label:"White",    hex:"#ffffff" }, { label:"Gold",     hex:"#ffd700" },
                      { label:"Hot Pink", hex:"#ff70b0" }, { label:"Sky Blue", hex:"#38bdf8" },
                      { label:"Lime",     hex:"#aaee44" }, { label:"Black",    hex:"#111111" },
                    ]).map(({ label, hex }) => (
                      <button key={hex} onClick={() => setFontColor(hex)} className="w-9 h-9 rounded-full shrink-0 transition-all" style={{ backgroundColor: hex, border: fontColor===hex ? "3px solid #aaee44" : "2px solid rgba(255,255,255,0.18)", transform: fontColor===hex ? "scale(1.15)" : "scale(1)" }} title={label} />
                    ))}
                  </div>
                  <div className="flex gap-2 mb-3">
                    {(["Bold","Elegant","Handwritten"] as const).map(fv => (
                      <button key={fv} onClick={() => setFontStyle(fv)} className="flex-1 py-2.5 rounded-xl text-sm text-center" style={{ backgroundColor:"#1e1e1e", border: fontStyle===fv ? "2px solid #aaee44" : "2px solid transparent", fontFamily: FONT_MAP[fv], color:"#fff" }}>{fv}</button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {(["Small","Medium","Large"] as const).map((sz, i) => (
                      <button key={sz} onClick={() => setTextSize(sz)} className="flex-1 py-2.5 rounded-xl font-bold" style={{ backgroundColor:"#1e1e1e", border: textSize===sz ? "2px solid #aaee44" : "2px solid transparent", color:"#fff", fontSize:[12,14,16][i] }}>
                        {["S","M","L"][i]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ACCENT COLOUR */}
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Accent colour</p>
                  <div className="flex flex-wrap gap-2.5">
                    {(["#ffffff","#ffd700","#ff70b0","#38bdf8","#aaee44","#ff6b6b","#4ade80","#c084fc"] as const).map(hex => (
                      <button key={hex} onClick={() => setCustomAccentHex(hex)} style={{ width:36,height:36,borderRadius:"50%",backgroundColor:hex,border:customAccentHex===hex?"3px solid #aaee44":"2px solid rgba(255,255,255,0.18)",flexShrink:0 }} />
                    ))}
                    <label style={{ width:36,height:36,borderRadius:"50%",background:"conic-gradient(red,yellow,lime,cyan,blue,magenta,red)",border:"2px solid rgba(255,255,255,0.18)",cursor:"pointer",flexShrink:0,display:"block",position:"relative" }}>
                      <input type="color" value={customAccentHex||"#aaee44"} onChange={e => setCustomAccentHex(e.target.value)} style={{ position:"absolute",inset:0,opacity:0,cursor:"pointer",width:"100%",height:"100%" }} />
                    </label>
                  </div>
                </div>

                {/* BUBBLES */}
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Bubbles</p>
                  <div className="flex gap-2">
                    {([ ["frosted","Frosted"], ["solid","Solid"], ["outlined","Outlined"] ] as const).map(([val, label]) => (
                      <button key={val} onClick={() => setBubbleStyle(val)} className="flex-1 py-2.5 rounded-xl text-sm text-center" style={{ backgroundColor:"#1e1e1e", border: bubbleStyle===val ? "2px solid #aaee44" : "2px solid transparent", color:"#fff" }}>{label}</button>
                    ))}
                  </div>
                </div>

                {/* STICKERS */}
                <div>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Stickers</p>
                  {STICKER_CATEGORIES.map((cat) => (
                    <div key={cat.label} className="mb-4">
                      <p className="text-[9px] text-white/30 uppercase tracking-widest mb-2">{cat.label}</p>
                      <div className="grid grid-cols-6 gap-2">
                        {cat.keys.map((key) => {
                          const Icon = TABLER_ICON_MAP[key];
                          return (
                            <button key={key} onClick={() => addSticker(`tabler:${key}`)} className="flex items-center justify-center rounded-xl" style={{ height:44, backgroundColor:"#1e1e1e", border:"1px solid rgba(255,255,255,0.08)" }}>
                              {Icon && <Icon size={22} stroke={1.5} color="#fff" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Style screen ─── */}
      {showStyleScreen && (
        <div className="fixed inset-0 z-40 flex flex-col" style={{ backgroundColor: "#0a0a0a" }}>
          {showTemplatePicker ? (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="px-5 pt-14 pb-5">
                <button
                  onClick={() => setShowTemplatePicker(false)}
                  className="flex items-center gap-2 text-sm mb-6"
                  style={{ color: "rgba(255,255,255,0.5)", background: "none", border: "none" }}
                >
                  ← Back
                </button>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "24px", fontWeight: 700, color: "#fff" }}>Pick a template</p>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#666", marginTop: "4px" }}>You can customise it after</p>
              </div>
              <div className="flex-1 overflow-y-auto px-5 pb-10">
                <div className="grid grid-cols-3 gap-3">
                  {TEMPLATES.map((t) => {
                    const isSelected = templateName === t.templateName;
                    const tn = t.templateName;
                    const cfgMap: Record<string, { bg: string; bgGrad?: string; titleColor: string; accentColor: string; accentStyle?: React.CSSProperties; font: string; barColor: string; barText: string }> = {
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
                    const c = cfgMap[tn] || { bg: "#2b2b2b", titleColor: "#fff", accentColor: "#aaee44", font: "sans-serif", barColor: "#aaee44", barText: "#111" };
                    return (
                      <button
                        key={t.name}
                        onClick={() => {
                          buildItAppliedRef.current = false;
                          setBgColor(t.bgColor);
                          setBubbleColor(t.bubbleColor);
                          setBubbleTextColor(t.bubbleTextColor);
                          setGradientColor(t.gradientColor);
                          setFontStyle(t.fontStyle);
                          setTemplateName(t.templateName);
                          setBgPhoto(null);
                          setBgPreset(null);
                          setBgPresetIsImage(false);
                          setShowTemplatePicker(false);
                          setShowStyleScreen(false);
                        }}
                        className="flex flex-col rounded-xl overflow-hidden transition-all"
                        style={{ border: isSelected ? "2px solid #aaee44" : "2px solid transparent" }}
                      >
                        <div
                          style={{
                            width: "100%",
                            height: "80px",
                            background: c.bgGrad || c.bg,
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
                            <span style={{ fontSize: 20, filter: "drop-shadow(0 0 4px rgba(255,255,255,0.6))" }}>✦</span>
                          ) : tn === "midnight" ? (
                            <div style={{ borderLeft: "2px solid #000", paddingLeft: 3 }}>
                              <span style={{ fontFamily: c.font, fontSize: 9, fontWeight: 800, color: c.titleColor, textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>EVENT</span>
                            </div>
                          ) : (
                            <span style={{ fontFamily: c.font, fontSize: 9, fontWeight: 700, color: c.titleColor, lineHeight: 1.2, textAlign: "center" as const, position: "relative", zIndex: 1 }}>
                              Your <span style={{ color: c.accentColor, ...c.accentStyle }}>event</span>
                            </span>
                          )}
                        </div>
                        <div
                          className="py-1.5 text-center"
                          style={tn === "planit-custom" ? { background: "linear-gradient(90deg, #f857a6, #ff5858, #43e97b, #38f9d7, #4776e6)" } : { backgroundColor: c.barColor }}
                        >
                          <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: tn === "planit-custom" ? "#fff" : c.barText, display: "block", lineHeight: 1.4 }}>
                            {t.name}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col flex-1 justify-center px-5 pb-10">
              <div className="mb-10">
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "26px", fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>Choose your style</p>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px", color: "#666", marginTop: "6px" }}>You can always change this later</p>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => { setShowStyleScreen(false); setShowBuildIt(true); setBuildItError(null); }}
                  className="w-full rounded-2xl px-5 py-5 flex items-center gap-4 text-left"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #db2777)", border: "none" }}
                >
                  <span style={{ fontSize: "28px" }}>🪄</span>
                  <div>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "16px", fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>✦ Build It</p>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "rgba(255,255,255,0.7)", marginTop: "3px" }}>AI creates your vibe</p>
                  </div>
                </button>
                <button
                  onClick={() => setShowTemplatePicker(true)}
                  className="w-full rounded-2xl px-5 py-5 flex items-center gap-4 text-left"
                  style={{ backgroundColor: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <span style={{ fontSize: "28px" }}>🎨</span>
                  <div>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "16px", fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>Templates</p>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#666", marginTop: "3px" }}>Pick from 8 styles</p>
                  </div>
                  <span style={{ marginLeft: "auto", color: "#aaee44", fontSize: "20px" }}>›</span>
                </button>
                <button
                  onClick={() => {
                    buildItAppliedRef.current = false;
                    _setTemplateName("planit-custom");
                    setBgColor("0 0% 4%");
                    setBgPreset(null);
                    setBgPhoto(null);
                    setBgPresetIsImage(false);
                    setCustomLayout("cards");
                    setShowStyleScreen(false);
                  }}
                  className="w-full rounded-2xl px-5 py-5 flex items-center gap-4 text-left"
                  style={{ backgroundColor: "#111", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <span style={{ fontSize: "28px" }}>✏️</span>
                  <div>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "16px", fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>Start blank</p>
                    <p style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px", color: "#666", marginTop: "3px" }}>Keep it simple</p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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
                    backgroundImage: buildItResult.customCSS,
                    backgroundSize: "auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <span
                    style={{
                      fontFamily: FONT_MAP[buildItResult.fontStyle] || FONT_MAP["Bold"],
                      fontSize: "20px",
                      color: `hsl(${buildItResult.bubbleColor})`,
                      position: "relative",
                      zIndex: 1,
                      textShadow: "0 1px 6px rgba(0,0,0,0.5)",
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
