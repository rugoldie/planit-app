import { Check, RotateCcw } from "lucide-react";
import BuildItSheet from "@/components/buildit/BuildItSheet";
import BuildItEditPanel from "@/components/buildit/BuildItEditPanel";
import BuildItFab, { BuildItTextEditFab } from "@/components/buildit/BuildItFab";
import type { useBuildIt } from "@/hooks/useBuildIt";

const COVO_ACCENT = "#3b82f6";

/** Host-only entry point shown while the event has no built page yet. */
const EntryButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="fixed rounded-full flex items-center gap-2 px-5 z-[30] text-sm font-bold"
    style={{
      right: 18,
      bottom: "calc(96px + env(safe-area-inset-bottom, 0px))",
      height: 48,
      backgroundColor: COVO_ACCENT,
      border: "1px solid rgba(255,255,255,0.18)",
      color: "#fff",
      boxShadow: "0 8px 24px -6px rgba(59,130,246,0.8)",
    }}
  >
    <span style={{ fontSize: 16 }}>✦</span> Build It
  </button>
);

/**
 * Post-generation bar. The page is already persisted by the time it renders
 * (the edge function saves before returning), so "Save ✓" confirms and
 * dismisses rather than performing the write.
 */
const ResultBar = ({ onRegenerate, onSave }: { onRegenerate: () => void; onSave: () => void }) => (
  <div
    // Sits below the event page's own nav row rather than on top of it.
    className="fixed left-0 right-0 z-[31] flex items-center justify-center gap-2.5 px-4"
    style={{ top: "calc(64px + env(safe-area-inset-top, 0px))" }}
  >
    <button
      type="button"
      onClick={onRegenerate}
      className="flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-bold"
      style={{
        backgroundColor: "rgba(10,10,14,0.82)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.16)",
        color: "#fff",
      }}
    >
      <RotateCcw className="w-3.5 h-3.5" /> Re-generate
    </button>
    <button
      type="button"
      onClick={onSave}
      className="flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-bold"
      style={{ background: "linear-gradient(135deg, #3b82f6, #4f46e5)", border: "none", color: "#fff" }}
    >
      Save <Check className="w-3.5 h-3.5" />
    </button>
  </div>
);

/**
 * Every Build It surface for an event page, driven by `useBuildIt`.
 * Renders nothing for guests except (implicitly) nothing at all — the built
 * page itself is rendered by the parent via BuiltPageFrame.
 *
 * Text-edit mode's own top bar (Cancel / Done) is rendered by the page, not
 * here — it replaces the page's normal nav header in place, and needs the
 * BuiltPageFrame ref this component doesn't have access to.
 */
const BuildItOverlays = ({ buildIt }: { buildIt: ReturnType<typeof useBuildIt> }) => {
  if (!buildIt.canEdit) return null;

  return (
    <>
      {!buildIt.hasBuiltPage && !buildIt.sheetOpen && <EntryButton onClick={buildIt.openSheet} />}

      {buildIt.hasBuiltPage && !buildIt.editOpen && !buildIt.textEditOpen && (
        <>
          <BuildItFab onClick={buildIt.openEdit} />
          <BuildItTextEditFab onClick={buildIt.openTextEdit} />
        </>
      )}

      {buildIt.hasBuiltPage && buildIt.justGenerated && !buildIt.textEditOpen && (
        <ResultBar onRegenerate={buildIt.regenerate} onSave={buildIt.confirmSaved} />
      )}

      <BuildItSheet
        open={buildIt.sheetOpen}
        initial={buildIt.initialForm}
        generating={buildIt.generating}
        error={buildIt.genError}
        onClose={buildIt.closeSheet}
        onGenerate={buildIt.handleGenerate}
      />

      <BuildItEditPanel
        open={buildIt.editOpen}
        busy={buildIt.editBusy}
        history={buildIt.editHistory}
        onClose={buildIt.closeEdit}
        onSubmit={buildIt.handleEdit}
      />
    </>
  );
};

export default BuildItOverlays;
