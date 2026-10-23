import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { describeDateTime, editBuiltPage, generateBuiltPage, saveBuiltPageHtml } from "@/lib/buildIt";
import type { BuildItFormValues } from "@/components/buildit/BuildItSheet";
import type { EditEntry } from "@/components/buildit/BuildItEditPanel";

const emptyForm: BuildItFormValues = { date: "", time: "", location: "", dresscode: "", about: "", look: "" };

/** Splits a stored timestamp into the <input type="date"> / <input type="time"> pair. */
const splitDateTime = (iso: string | null | undefined): { date: string; time: string } => {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
};

type EventLike = { id: string; title?: string | null; location?: string | null; dress_code?: string | null; date_time?: string | null; built_page_html?: string | null } | null;

/**
 * Owns every piece of Build It state for an event page.
 *
 * `builtHtml` is treated as locally authoritative once the event has loaded:
 * the edge function persists before it returns, neither event view subscribes
 * to realtime `events` changes, and re-syncing from the prop on every render
 * would flicker the iframe back to the pre-edit page.
 */
export const useBuildIt = ({
  event,
  isHost,
  onEventUpdated,
}: {
  event: EventLike;
  isHost: boolean;
  /** Called with the events-table fields the edge function detected as
   *  changed (title/location/date_time), so the caller can merge them into
   *  its own local event state for same-page immediacy without a refetch. */
  onEventUpdated?: (patch: Record<string, unknown>) => void;
}) => {
  const [builtHtml, setBuiltHtml] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editHistory, setEditHistory] = useState<EditEntry[]>([]);
  const [textEditOpen, setTextEditOpen] = useState(false);
  const [textEditSaving, setTextEditSaving] = useState(false);
  const [justGenerated, setJustGenerated] = useState(false);
  // What the host last submitted, so "Re-generate" reopens the form as they
  // left it instead of making them retype their description.
  const [lastForm, setLastForm] = useState<BuildItFormValues | null>(null);
  const entryId = useRef(0);
  const queryClient = useQueryClient();

  const eventId = event?.id;

  // Seed (and reset) only when the event itself changes.
  useEffect(() => {
    setBuiltHtml(event?.built_page_html ?? null);
    setJustGenerated(false);
    setEditHistory([]);
    setLastForm(null);
    setEditOpen(false);
    setTextEditOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const initialForm: BuildItFormValues =
    lastForm ??
    (event
      ? {
          ...splitDateTime(event.date_time),
          location: event.location ?? "",
          dresscode: event.dress_code ?? "",
          about: "",
          look: "",
        }
      : emptyForm);

  const openSheet = useCallback(() => {
    setGenError(null);
    setSheetOpen(true);
  }, []);

  const closeSheet = useCallback(() => {
    if (generating) return; // don't let a tap orphan an in-flight generation
    setSheetOpen(false);
    setGenError(null);
  }, [generating]);

  const handleGenerate = useCallback(
    async (values: BuildItFormValues) => {
      if (!eventId) return;
      setGenerating(true);
      setGenError(null);
      setLastForm(values);
      try {
        const { html } = await generateBuiltPage({
          eventId,
          eventName: (event?.title || values.about).trim(),
          about: values.about.trim(),
          date: describeDateTime(values.date, values.time),
          location: values.location.trim(),
          dresscode: values.dresscode.trim(),
          visualDescription: values.look.trim(),
        });
        setBuiltHtml(html);
        setSheetOpen(false);
        setJustGenerated(true);
        setEditHistory([]);
      } catch (err: any) {
        setGenError(err?.message ?? "Something went wrong. Please try again.");
      } finally {
        setGenerating(false);
      }
    },
    [eventId, event?.title],
  );

  const handleEdit = useCallback(
    async (instruction: string) => {
      if (!eventId || !builtHtml) return;
      const id = ++entryId.current;
      setEditHistory((prev) => [...prev, { id, instruction, status: "pending" }]);
      setEditBusy(true);
      try {
        const { html, updatedFields } = await editBuiltPage({ eventId, currentHtml: builtHtml, instruction });
        setBuiltHtml(html);
        setEditHistory((prev) => prev.map((e) => (e.id === id ? { ...e, status: "done" } : e)));
        if (updatedFields && Object.keys(updatedFields).length > 0) {
          onEventUpdated?.(updatedFields);
          // Home's feed query is React Query-cached (5s poll); invalidate so
          // it reflects the new title/date/location immediately rather than
          // waiting out the interval. Profile/EventsList fetch fresh on every
          // mount, so they need no explicit invalidation here.
          queryClient.invalidateQueries({ queryKey: ["user-events"] });
        }
      } catch (err: any) {
        const message = err?.message ?? "Couldn't apply that change.";
        setEditHistory((prev) => prev.map((e) => (e.id === id ? { ...e, status: "failed", error: message } : e)));
      } finally {
        setEditBusy(false);
      }
    },
    [eventId, builtHtml, onEventUpdated, queryClient],
  );

  // Chat-edit and text-edit are mutually exclusive overlays on the same page.
  const openEdit = useCallback(() => {
    setTextEditOpen(false);
    setEditOpen(true);
  }, []);
  const closeEdit = useCallback(() => setEditOpen(false), []);

  const openTextEdit = useCallback(() => {
    setEditOpen(false);
    setTextEditOpen(true);
  }, []);
  // Cancel: just closes - BuiltPageFrame drops contentEditable and any
  // in-progress, unsaved DOM edits are discarded along with it.
  const closeTextEdit = useCallback(() => setTextEditOpen(false), []);

  const saveTextEdit = useCallback(
    async (html: string) => {
      if (!eventId) return;
      setTextEditSaving(true);
      try {
        await saveBuiltPageHtml(eventId, html);
        setBuiltHtml(html);
        setTextEditOpen(false);
      } catch (err: any) {
        toast.error(err?.message ?? "Couldn't save your changes. Please try again.");
      } finally {
        setTextEditSaving(false);
      }
    },
    [eventId],
  );

  const regenerate = useCallback(() => {
    setJustGenerated(false);
    openSheet();
  }, [openSheet]);

  const confirmSaved = useCallback(() => {
    setJustGenerated(false);
    toast.success("Your page is saved");
  }, []);

  return {
    builtHtml,
    hasBuiltPage: !!builtHtml,
    // Host-only affordances; guests get the page and nothing else.
    canEdit: isHost,
    initialForm,
    sheetOpen,
    openSheet,
    closeSheet,
    generating,
    genError,
    handleGenerate,
    editOpen,
    openEdit,
    closeEdit,
    editBusy,
    editHistory,
    handleEdit,
    textEditOpen,
    openTextEdit,
    closeTextEdit,
    textEditSaving,
    saveTextEdit,
    justGenerated,
    regenerate,
    confirmSaved,
  };
};
