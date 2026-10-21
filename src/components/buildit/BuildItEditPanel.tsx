import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";

const QUICK_ACTIONS = [
  "🎨 Change colours",
  "✏️ Bigger title",
  "🌟 Add animation",
  "🌙 Make it darker",
  "🔄 Redesign completely",
];

const PANEL_CSS = `
@keyframes buildit-panel-up {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
@keyframes buildit-dot {
  0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
  40%           { opacity: 1;    transform: translateY(-3px); }
}
.buildit-panel { animation: buildit-panel-up 0.28s cubic-bezier(0.22, 1, 0.36, 1); }
.buildit-dot   { animation: buildit-dot 1.2s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .buildit-panel, .buildit-dot { animation: none; }
}
`;

export type EditEntry = { id: number; instruction: string; status: "pending" | "done" | "failed"; error?: string };

const BuildItEditPanel = ({
  open,
  busy,
  history,
  onClose,
  onSubmit,
}: {
  open: boolean;
  busy: boolean;
  history: EditEntry[];
  onClose: () => void;
  onSubmit: (instruction: string) => void;
}) => {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [history, busy]);

  if (!open) return null;

  const send = (text: string) => {
    const instruction = text.trim();
    if (!instruction || busy) return;
    onSubmit(instruction);
    setDraft("");
  };

  return (
    <div className="fixed inset-0 z-[35] flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} />
      <div
        className="buildit-panel relative rounded-t-3xl flex flex-col overflow-hidden"
        style={{
          backgroundColor: "#0d0b16",
          borderTop: "1px solid rgba(168,85,247,0.3)",
          maxHeight: "62vh",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{PANEL_CSS}</style>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0">
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>✦ Edit your page</p>
            <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>
              Tell us what to change
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: "rgba(255,255,255,0.08)", border: "none" }}
          >
            <X className="w-4 h-4" style={{ color: "rgba(255,255,255,0.6)" }} />
          </button>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 overflow-x-auto px-5 pb-3 shrink-0" style={{ WebkitOverflowScrolling: "touch" }}>
          {QUICK_ACTIONS.map((chip) => (
            <button
              key={chip}
              type="button"
              disabled={busy}
              onClick={() => send(chip)}
              className="shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold whitespace-nowrap disabled:opacity-40"
              style={{
                backgroundColor: "rgba(168,85,247,0.14)",
                border: "1px solid rgba(168,85,247,0.3)",
                color: "#e9d5ff",
              }}
            >
              {chip}
            </button>
          ))}
        </div>

        {/* History */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-5 pb-3 space-y-2 min-h-0">
          {history.length === 0 && !busy && (
            <p className="text-center py-4" style={{ fontSize: 12.5, color: "rgba(255,255,255,0.3)" }}>
              Pick a shortcut above, or describe any change you want.
            </p>
          )}
          {history.map((h) => (
            <div key={h.id} className="flex flex-col gap-1">
              <div className="flex justify-end">
                <div
                  className="rounded-2xl px-3.5 py-2 max-w-[85%]"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #db2777)" }}
                >
                  <p className="text-sm break-words" style={{ color: "#fff" }}>
                    {h.instruction}
                  </p>
                </div>
              </div>
              {h.status === "done" && (
                <span style={{ fontSize: 11, color: "rgba(134,239,172,0.8)" }}>✓ Applied and saved</span>
              )}
              {h.status === "failed" && (
                <span className="break-words" style={{ fontSize: 11, color: "rgba(248,113,113,0.9)" }}>
                  ✕ {h.error || "Couldn't apply that change"}
                </span>
              )}
            </div>
          ))}
          {busy && (
            <div className="flex items-center gap-2 pt-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="buildit-dot rounded-full"
                  style={{ width: 6, height: 6, backgroundColor: "#c084fc", animationDelay: `${i * 0.16}s` }}
                />
              ))}
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginLeft: 4 }}>
                Updating your page...
              </span>
            </div>
          )}
        </div>

        {/* Input */}
        <div
          className="flex gap-2 px-4 pt-3 pb-4 shrink-0"
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            enterKeyHint="send"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                send(draft);
              }
            }}
            placeholder="Make the background a deep green..."
            disabled={busy}
            className="flex-1 min-w-0 rounded-full px-4 py-2.5 text-sm outline-none placeholder:text-white/25 disabled:opacity-50"
            style={{
              backgroundColor: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#fff",
            }}
          />
          <button
            type="button"
            onClick={() => send(draft)}
            disabled={busy || !draft.trim()}
            aria-label="Send"
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #7c3aed, #db2777)", border: "none" }}
          >
            <Send className="w-4 h-4" style={{ color: "#fff" }} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default BuildItEditPanel;
