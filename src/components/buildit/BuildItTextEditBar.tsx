/**
 * Replaces the event page's normal top nav while "Edit text" mode is active.
 * Fixed + a very high z-index so it's always reachable regardless of what
 * else is open (the chat edit panel included) — there is always a one-tap
 * way out of this mode.
 */
const BuildItTextEditBar = ({
  saving,
  onCancel,
  onDone,
}: {
  saving: boolean;
  onCancel: () => void;
  onDone: () => void;
}) => (
  <div
    className="fixed top-0 inset-x-0 z-[41] flex items-center justify-between px-4"
    style={{
      paddingTop: "max(14px, env(safe-area-inset-top, 0px))",
      paddingBottom: 10,
      backgroundColor: "#0a0e1a",
      borderBottom: "1px solid rgba(59,130,246,0.35)",
    }}
  >
    <button
      type="button"
      onClick={onCancel}
      disabled={saving}
      className="text-sm font-semibold px-2 py-1.5 disabled:opacity-40"
      style={{ color: "rgba(255,255,255,0.6)", background: "none", border: "none" }}
    >
      Cancel
    </button>
    <span className="text-xs font-semibold" style={{ color: "#c7d2fe" }}>
      ✏️ Tap any text to edit
    </span>
    <button
      type="button"
      onClick={onDone}
      disabled={saving}
      className="rounded-full px-4 py-1.5 text-xs font-bold disabled:opacity-60"
      style={{ background: "linear-gradient(135deg, #3b82f6, #4f46e5)", color: "#fff", border: "none" }}
    >
      {saving ? "Saving..." : "Done ✓"}
    </button>
  </div>
);

export default BuildItTextEditBar;
