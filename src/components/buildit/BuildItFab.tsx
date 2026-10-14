const FAB_CSS = `
@keyframes buildit-fab-glow {
  0%, 100% { box-shadow: 0 6px 20px -4px rgba(0,0,0,0.6), 0 0 0 0 rgba(168,85,247,0.55), 0 0 22px 2px rgba(168,85,247,0.45); }
  50%      { box-shadow: 0 6px 20px -4px rgba(0,0,0,0.6), 0 0 0 10px rgba(168,85,247,0),  0 0 34px 8px rgba(219,39,119,0.55); }
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
      className="buildit-fab fixed rounded-full flex items-center justify-center z-[55]"
      style={{
        right: 18,
        bottom: "calc(96px + env(safe-area-inset-bottom, 0px))",
        width: 56,
        height: 56,
        background: "linear-gradient(135deg, #7c3aed 0%, #db2777 100%)",
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

export default BuildItFab;
