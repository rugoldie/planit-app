import { useEffect, useState } from "react";
import { X } from "lucide-react";
import CovoWordmark from "@/components/CovoWordmark";

export type BuildItFormValues = {
  date: string;
  time: string;
  location: string;
  dresscode: string;
  about: string;
  look: string;
};

const SHEET_BG = "#060a18";

// "Your page is ready ✦" (as suggested) reads as a lie while this overlay is
// still up waiting on the actual response - swapped for something that stays
// true for however long generation takes.
const STATUS_MESSAGES = ["Cooking something up...", "Almost there...", "Adding the final sparkle ✦"];

/**
 * Keyframes live here rather than in tailwind.config so this screen stays
 * self-contained — it's the only place in Covo using these animations.
 */
const SHEET_CSS = `
@keyframes buildit-drift-a {
  0%   { transform: translate3d(-12%, -8%, 0) scale(1); }
  50%  { transform: translate3d(10%, 6%, 0) scale(1.18); }
  100% { transform: translate3d(-12%, -8%, 0) scale(1); }
}
@keyframes buildit-drift-b {
  0%   { transform: translate3d(8%, 10%, 0) scale(1.1); }
  50%  { transform: translate3d(-10%, -6%, 0) scale(0.92); }
  100% { transform: translate3d(8%, 10%, 0) scale(1.1); }
}
@keyframes buildit-orb-pulse {
  0%, 100% { transform: scale(1);    opacity: 0.85; }
  50%      { transform: scale(1.14); opacity: 1; }
}
@keyframes buildit-orb-ring {
  0%   { transform: scale(0.8); opacity: 0.55; }
  100% { transform: scale(2.1); opacity: 0; }
}
@keyframes buildit-fade-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.buildit-blob-a { animation: buildit-drift-a 18s ease-in-out infinite; }
.buildit-blob-b { animation: buildit-drift-b 22s ease-in-out infinite; }
.buildit-orb    { animation: buildit-orb-pulse 2.4s ease-in-out infinite; }
.buildit-ring   { animation: buildit-orb-ring 2.4s ease-out infinite; }
.buildit-status { animation: buildit-fade-in 0.45s ease-out; }
@media (prefers-reduced-motion: reduce) {
  .buildit-blob-a, .buildit-blob-b, .buildit-orb, .buildit-ring, .buildit-status { animation: none; }
}
.buildit-field { transition: border-color 0.15s ease, box-shadow 0.15s ease; }
.buildit-field:focus { border-color: #3b82f6 !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.25); }
`;

const Field = ({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) => (
  <div>
    <label className="flex items-center gap-2 mb-2">
      <span style={{ fontSize: 15 }}>{icon}</span>
      <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.55)" }}>
        {label}
      </span>
    </label>
    {children}
  </div>
);

const inputStyle: React.CSSProperties = {
  backgroundColor: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#fff",
};

const GenerationOverlay = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Advance through the messages and hold on the last one, rather than
    // looping — looping back to "Cooking something up..." reads as a stall.
    const timers = [
      window.setTimeout(() => setStep(1), 6000),
      window.setTimeout(() => setStep(2), 15000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center px-8"
      style={{ backgroundColor: "rgba(6,10,24,0.92)", backdropFilter: "blur(8px)", paddingTop: "max(11vh, 56px)" }}
    >
      {/* Logo block — anchored in the top third, not centred with the rest.
          Same COVO mark as the pre-login splash screen (not a typeset
          approximation of it), with "BUILD IT" set the same way as the
          form header beneath it. */}
      <div className="flex flex-col items-center shrink-0 w-full">
        <CovoWordmark style={{ maxWidth: 240 }} />
        <p
          style={{
            fontFamily: "'Fredoka', sans-serif",
            fontWeight: 600,
            fontSize: 24,
            lineHeight: 1,
            letterSpacing: "0.01em",
            color: "#ffffff",
            marginTop: 14,
          }}
        >
          BUILD IT
        </p>
      </div>

      {/* Spinner + status — centred in the remaining space below the logo */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-0">
        <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
          <div
            className="buildit-ring absolute rounded-full"
            style={{ width: 96, height: 96, border: "1px solid rgba(79,70,229,0.5)" }}
          />
          <div
            className="buildit-orb rounded-full"
            style={{
              width: 96,
              height: 96,
              background: "radial-gradient(circle at 32% 28%, #93c5fd 0%, #3b82f6 38%, #4f46e5 72%, #1e1b4b 100%)",
              boxShadow: "0 0 60px 12px rgba(59,130,246,0.55), 0 0 120px 30px rgba(79,70,229,0.3)",
            }}
          />
        </div>
        <p
          key={step}
          className="buildit-status mt-8 text-center"
          style={{ fontSize: 17, fontWeight: 600, color: "#fff", letterSpacing: "0.01em" }}
        >
          {STATUS_MESSAGES[step]}
        </p>
        <p className="mt-2 text-center" style={{ fontSize: 12.5, color: "rgba(255,255,255,0.4)" }}>
          This can take up to a minute — worth the wait.
        </p>
      </div>
    </div>
  );
};

const BuildItSheet = ({
  open,
  initial,
  generating,
  error,
  onClose,
  onGenerate,
}: {
  open: boolean;
  initial: BuildItFormValues;
  generating: boolean;
  error: string | null;
  onClose: () => void;
  onGenerate: (values: BuildItFormValues) => void;
}) => {
  const [values, setValues] = useState<BuildItFormValues>(initial);

  // Re-seed from event data each time the sheet is opened (and not while it's
  // open, so typing is never clobbered by a parent re-render).
  useEffect(() => {
    if (open) setValues(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const set = <K extends keyof BuildItFormValues>(key: K, v: BuildItFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: v }));

  const canGenerate = values.about.trim().length > 0 || values.look.trim().length > 0;

  return (
    <div className="fixed inset-0 z-[70] overflow-hidden" style={{ backgroundColor: SHEET_BG }}>
      <style>{SHEET_CSS}</style>

      {/* Animated blue/indigo wash behind the form */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="buildit-blob-a absolute rounded-full"
          style={{
            top: "-18%",
            left: "-22%",
            width: "80vw",
            height: "80vw",
            background: "radial-gradient(circle, rgba(59,130,246,0.38) 0%, rgba(59,130,246,0) 68%)",
            filter: "blur(20px)",
          }}
        />
        <div
          className="buildit-blob-b absolute rounded-full"
          style={{
            bottom: "-24%",
            right: "-20%",
            width: "88vw",
            height: "88vw",
            background: "radial-gradient(circle, rgba(79,70,229,0.34) 0%, rgba(79,70,229,0) 70%)",
            filter: "blur(20px)",
          }}
        />
      </div>

      {/* Form */}
      <div
        className="relative z-10 h-full overflow-y-auto px-6"
        style={{
          paddingTop: "max(28px, env(safe-area-inset-top, 0px))",
          paddingBottom: "max(40px, env(safe-area-inset-bottom, 0px))",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h1
              style={{
                fontSize: 40,
                lineHeight: 1,
                fontWeight: 600,
                letterSpacing: "0.01em",
                color: "#fff",
                fontFamily: "'Fredoka', sans-serif",
              }}
            >
              BUILD IT
            </h1>
            <p className="mt-2.5" style={{ fontSize: 13.5, color: "rgba(255,255,255,0.5)", maxWidth: 260 }}>
              Describe your event — we'll design the page
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "none" }}
          >
            <X className="w-4 h-4" style={{ color: "rgba(255,255,255,0.6)" }} />
          </button>
        </div>

        <div className="mt-8 flex flex-col gap-5">
          <Field icon="📅" label="Date & Time">
            <div className="flex gap-2.5">
              <input
                type="date"
                value={values.date}
                onChange={(e) => set("date", e.target.value)}
                className="flex-1 min-w-0 rounded-xl px-3.5 py-3 text-sm outline-none buildit-field"
                style={inputStyle}
              />
              <input
                type="time"
                value={values.time}
                onChange={(e) => set("time", e.target.value)}
                className="flex-1 min-w-0 rounded-xl px-3.5 py-3 text-sm outline-none buildit-field"
                style={inputStyle}
              />
            </div>
          </Field>

          <Field icon="📍" label="Location">
            <input
              type="text"
              value={values.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="Where is it?"
              className="w-full rounded-xl px-3.5 py-3 text-sm outline-none placeholder:text-white/25 buildit-field"
              style={inputStyle}
            />
          </Field>

          <Field icon="👗" label="Dress Code">
            <input
              type="text"
              value={values.dresscode}
              onChange={(e) => set("dresscode", e.target.value)}
              placeholder="Optional"
              className="w-full rounded-xl px-3.5 py-3 text-sm outline-none placeholder:text-white/25 buildit-field"
              style={inputStyle}
            />
          </Field>

          <Field icon="📝" label="About your event">
            <input
              type="text"
              value={values.about}
              onChange={(e) => set("about", e.target.value)}
              placeholder="e.g. Jake's leaving do, Halloween house party, summer rooftop drinks"
              className="w-full rounded-xl px-3.5 py-3 text-sm outline-none placeholder:text-white/25 buildit-field"
              style={inputStyle}
            />
          </Field>

          <Field icon="🎨" label="How should the page look?">
            <textarea
              value={values.look}
              onChange={(e) => set("look", e.target.value)}
              placeholder="Describe colours, mood, aesthetic — e.g. dark and electric, hot pink and black, chaotic neon energy"
              rows={4}
              className="w-full rounded-xl px-3.5 py-3 text-sm outline-none resize-none placeholder:text-white/25 buildit-field"
              style={inputStyle}
            />
          </Field>

          {error && (
            <div
              className="rounded-xl px-4 py-3"
              style={{ backgroundColor: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)" }}
            >
              <p className="text-sm font-semibold mb-1" style={{ color: "#f87171" }}>
                Couldn't build your page
              </p>
              <p className="text-xs break-words" style={{ color: "rgba(248,113,113,0.85)" }}>
                {error}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => onGenerate(values)}
            disabled={!canGenerate || generating}
            className="w-full rounded-2xl py-4 mt-1 text-base font-bold"
            style={{
              background: canGenerate ? "linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%)" : "rgba(255,255,255,0.07)",
              color: canGenerate ? "#fff" : "rgba(255,255,255,0.3)",
              border: "none",
              boxShadow: canGenerate ? "0 10px 36px -10px rgba(59,130,246,0.7)" : "none",
            }}
          >
            ✦ Generate my event page
          </button>
          {!canGenerate && (
            <p className="text-center" style={{ fontSize: 11.5, color: "rgba(255,255,255,0.3)", marginTop: -8 }}>
              Tell us about your event or how it should look to get started
            </p>
          )}
        </div>
      </div>

      {generating && <GenerationOverlay />}
    </div>
  );
};

export default BuildItSheet;
