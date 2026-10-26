const FAB_CSS = `
@keyframes buildit-fab-glow {
  0%, 100% { box-shadow: 0 6px 20px -4px rgba(0,0,0,0.6), 0 0 0 0 rgba(59,130,246,0.55), 0 0 22px 2px rgba(59,130,246,0.45); }
  50%      { box-shadow: 0 6px 20px -4px rgba(0,0,0,0.6), 0 0 0 10px rgba(59,130,246,0),  0 0 34px 8px rgba(79,70,229,0.55); }
}
.buildit-fab { animation: buildit-fab-glow 2.8s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .buildit-fab { animation: none; } }
`;

/** Host-only floating editor entry point, bottom-right above the RSVP bar. */
const BuildItFab = ({ onClick, label = "Edit your page" }: { onClick: () => void; label?: string }) => (
  <>
    <style>{FAB_CSS}</style>
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="buildit-fab fixed rounded-full flex items-center justify-center z-[30]"
      style={{
        right: 18,
        bottom: "calc(96px + env(safe-area-inset-bottom, 0px))",
        width: 56,
        height: 56,
        background: "linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%)",
        border: "1px solid rgba(255,255,255,0.22)",
        color: "#fff",
        fontSize: 22,
        lineHeight: 1,
        padding: 0,
      }}
    >
      ✦
    </button>
  </>
);

/** Secondary host-only entry point, sitting just left of the main FAB —
 *  jumps straight into tap-to-edit text mode, skipping the AI chat. */
export const BuildItTextEditFab = ({ onClick, label = "Edit text directly" }: { onClick: () => void; label?: string }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className="fixed rounded-full flex items-center justify-center z-[30]"
    style={{
      right: 84,
      bottom: "calc(96px + env(safe-area-inset-bottom, 0px))",
      width: 44,
      height: 44,
      backgroundColor: "rgba(10,14,26,0.9)",
      border: "1px solid rgba(59,130,246,0.4)",
      color: "#c7d2fe",
      fontSize: 17,
      lineHeight: 1,
      padding: 0,
    }}
  >
    ✏️
  </button>
);

export default BuildItFab;
