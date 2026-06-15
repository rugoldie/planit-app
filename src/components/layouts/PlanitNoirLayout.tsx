import React from "react";

/**
 * Concentric circle SVG background pattern for Planit Noir
 */
export const ConcentricCircles = ({ accentColor = "#aaee44" }: { accentColor?: string }) => (
  <svg
    className="absolute inset-0 w-full h-full pointer-events-none"
    style={{ opacity: 0.04 }}
    viewBox="0 0 400 600"
    preserveAspectRatio="xMidYMid slice"
  >
    {[80, 130, 180, 230, 280, 330].map((r) => (
      <circle key={r} cx="200" cy="300" r={r} fill="none" stroke={accentColor} strokeWidth="0.8" />
    ))}
  </svg>
);

/**
 * Helper: split a title and make the second word (or middle word) italic + green
 */
export const StyledTitle = ({
  title,
  isInput,
  value,
  onChange,
  placeholder,
  accentColor = "#aaee44",
  fontFamily,
  fontSize,
}: {
  title?: string;
  isInput?: boolean;
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  accentColor?: string;
  fontFamily?: string;
  fontSize?: string;
}) => {
  const ff = fontFamily || "'Playfair Display', serif";
  const fs = fontSize || "36px";

  if (isInput) {
    return (
      <input
        type="text"
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder || "Event name..."}
        className="w-full bg-transparent outline-none text-white placeholder:text-white/20"
        style={{
          fontFamily: ff,
          fontSize: fs,
          fontWeight: 900,
          lineHeight: 1.1,
        }}
      />
    );
  }

  if (!title) return null;
  const words = title.split(" ");
  if (words.length <= 1) {
    return (
      <h1
        style={{
          fontFamily: ff,
          fontSize: fs,
          fontWeight: 900,
          lineHeight: 1.1,
          color: "white",
        }}
      >
        {title}
      </h1>
    );
  }

  const greenIndex = words.length <= 2 ? 1 : Math.floor(words.length / 2);
  return (
    <h1
      style={{
        fontFamily: ff,
        fontSize: fs,
        fontWeight: 900,
        lineHeight: 1.1,
      }}
    >
      {words.map((word, i) => (
        <React.Fragment key={i}>
          {i > 0 && " "}
          {i === greenIndex ? (
            <span style={{ color: accentColor, fontStyle: "italic" }}>{word}</span>
          ) : (
            <span style={{ color: "white" }}>{word}</span>
          )}
          {i === greenIndex && i < words.length - 1 && <br />}
        </React.Fragment>
      ))}
    </h1>
  );
};

/**
 * "BY [HOST NAME]" divider line
 */
export const HostDivider = ({ hostName }: { hostName?: string }) => (
  <div className="flex items-center gap-3 mt-4">
    <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.12)" }} />
    <span
      style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: "10px",
        fontWeight: 600,
        letterSpacing: "0.2em",
        color: "rgba(255,255,255,0.4)",
        textTransform: "uppercase",
      }}
    >
      by {hostName || "Host"}
    </span>
    <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.12)" }} />
  </div>
);

/** Planit Noir date card (left, accent colored) */
export const NoirDateCard = ({
  monthName,
  dayNum,
  timeStr,
  isInput,
  dateTime,
  onDateChange,
  accentColor = "#aaee44",
}: {
  monthName: string;
  dayNum: string | number;
  timeStr: string;
  isInput?: boolean;
  dateTime?: string;
  onDateChange?: (v: string) => void;
  accentColor?: string;
}) => (
  <div
    className="flex-1 flex flex-col overflow-hidden"
    style={{ backgroundColor: accentColor, borderRadius: "14px", position: "relative" }}
  >
    <div className="flex flex-col items-center py-3 px-3">
      <span
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "22px",
          fontWeight: 900,
          color: "#0a0a0a",
          lineHeight: 1,
        }}
      >
        {dayNum || "?"}
      </span>
      <span
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "11px",
          fontWeight: 700,
          color: "#0a0a0a",
          opacity: 0.7,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginTop: "2px",
        }}
      >
        {monthName || "DATE"}
      </span>
      <span
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "10px",
          color: "#0a0a0a",
          opacity: 0.5,
          marginTop: "2px",
        }}
      >
        {timeStr || ""}
      </span>
    </div>
    {isInput && (
      <input
        type="datetime-local"
        value={dateTime || ""}
        onChange={(e) => onDateChange?.(e.target.value)}
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
    )}
  </div>
);

/** Planit Noir dress code card (right, dark) */
export const NoirDressCard = ({
  dressCode,
  isInput,
  onChange,
}: {
  dressCode: string;
  isInput?: boolean;
  onChange?: (v: string) => void;
}) => (
  <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: "#111", borderRadius: "14px" }}>
    <div className="flex flex-col py-3 px-3">
      <span
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "9px",
          fontWeight: 600,
          color: "rgba(255,255,255,0.4)",
          textTransform: "uppercase",
          letterSpacing: "0.15em",
        }}
      >
        Dress Code
      </span>
      {isInput ? (
        <input
          type="text"
          value={dressCode}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="Theme..."
          className="bg-transparent outline-none text-base font-bold mt-1 placeholder:opacity-30"
          style={{ fontFamily: "'Playfair Display', serif", color: "white" }}
        />
      ) : (
        <span
          className="mt-1"
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "16px",
            fontWeight: 700,
            color: "white",
          }}
        >
          {dressCode}
        </span>
      )}
    </div>
  </div>
);

/** Planit Noir location row */
export const NoirLocationCard = ({
  location,
  isInput,
  onChange,
  accentColor = "#aaee44",
}: {
  location: string;
  isInput?: boolean;
  onChange?: (v: string) => void;
  accentColor?: string;
}) => (
  <div
    className="flex items-center gap-3"
    style={{ backgroundColor: "#111", borderRadius: "14px", padding: "14px 16px" }}
  >
    <div
      className="flex items-center justify-center shrink-0"
      style={{
        width: "36px",
        height: "36px",
        borderRadius: "8px",
        backgroundColor: accentColor,
      }}
    >
      <span style={{ fontSize: "18px" }}>📍</span>
    </div>
    <div className="flex-1 min-w-0">
      <span
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "9px",
          fontWeight: 600,
          color: "rgba(255,255,255,0.4)",
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          display: "block",
        }}
      >
        Location
      </span>
      {isInput ? (
        <input
          type="text"
          value={location}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="Where's the event?"
          className="w-full bg-transparent outline-none text-base font-bold mt-0.5 placeholder:opacity-30"
          style={{ fontFamily: "'Playfair Display', serif", color: "white" }}
        />
      ) : (
        <span
          className="block truncate mt-0.5"
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "16px",
            fontWeight: 700,
            color: "white",
          }}
        >
          {location}
        </span>
      )}
    </div>
    <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "20px", fontWeight: 300 }}>›</span>
  </div>
);

/** Planit Noir notes card */
export const NoirNotesCard = ({
  notes,
  isInput,
  onChange,
  accentColor = "#aaee44",
}: {
  notes: string;
  isInput?: boolean;
  onChange?: (v: string) => void;
  accentColor?: string;
}) => (
  <div
    className="flex items-start gap-3"
    style={{
      backgroundColor: "#0d0d0d",
      borderRadius: "14px",
      padding: "14px 16px",
      border: "1px solid rgba(255,255,255,0.06)",
    }}
  >
    <span style={{ color: accentColor, fontSize: "14px", marginTop: "1px" }}>✦</span>
    <div className="flex-1">
      <span
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "9px",
          fontWeight: 600,
          color: "rgba(255,255,255,0.3)",
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          display: "block",
        }}
      >
        Note from host
      </span>
      {isInput ? (
        <textarea
          value={notes}
          onChange={(e) => onChange?.(e.target.value)}
          onInput={(e) => { const t = e.currentTarget; t.style.height = "auto"; t.style.height = t.scrollHeight + "px"; }}
          placeholder="Anything else your guests should know..."
          rows={2}
          className="w-full bg-transparent outline-none resize-none text-sm mt-1 placeholder:text-white/20"
          style={{ fontFamily: "'Playfair Display', serif", color: "rgba(255,255,255,0.5)", fontStyle: "italic", overflow: "hidden" }}
        />
      ) : (
        <span
          className="block mt-1"
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "14px",
            fontStyle: "italic",
            color: "rgba(255,255,255,0.5)",
          }}
        >
          {notes}
        </span>
      )}
    </div>
  </div>
);

/** Planit Noir attendee strip — overlapping avatars + going count */
export const NoirAttendeeStrip = ({
  goingList,
  accentColor,
  getInitials,
}: {
  goingList: { name: string; avatar_url?: string }[];
  accentColor: string;
  getInitials: (name: string) => string;
}) => (
  <div className="flex items-center justify-between mt-5 px-1">
    <span
      style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: "9px",
        fontWeight: 600,
        color: "rgba(255,255,255,0.35)",
        textTransform: "uppercase",
        letterSpacing: "0.15em",
      }}
    >
      {goingList.length > 0 ? `${goingList.length} going` : "No one yet"}
    </span>
    <div
      className="flex items-center"
      style={{ marginRight: `${Math.max(0, goingList.slice(0, 5).length - 1) * -6}px` }}
    >
      {goingList.slice(0, 5).map((r, i) => (
        <div
          key={i}
          className="flex items-center justify-center overflow-hidden shrink-0"
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            border: "2px solid #0a0a0a",
            backgroundColor: "#1a1a1a",
            marginLeft: i > 0 ? "-8px" : 0,
            zIndex: 5 - i,
            position: "relative",
          }}
        >
          {r.avatar_url ? (
            <img src={r.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span style={{ fontSize: "9px", fontWeight: 700, color: accentColor }}>{getInitials(r.name)}</span>
          )}
        </div>
      ))}
      {goingList.length > 5 && (
        <div
          className="flex items-center justify-center shrink-0"
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            border: "2px solid #0a0a0a",
            backgroundColor: "#1a1a1a",
            marginLeft: "-8px",
            zIndex: 0,
            position: "relative",
          }}
        >
          <span style={{ fontSize: "8px", fontWeight: 700, color: "rgba(255,255,255,0.4)" }}>
            +{goingList.length - 5}
          </span>
        </div>
      )}
    </div>
  </div>
);
