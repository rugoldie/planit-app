import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";

/**
 * The generated page is mobile-first but won't always declare a viewport meta.
 * Inside the iframe the CSS viewport already equals the frame's own (phone)
 * width, so this is belt-and-braces for pages that set a fixed layout width.
 */
const withViewportMeta = (html: string): string => {
  if (/name=["']?viewport/i.test(html)) return html;
  const meta = '<meta name="viewport" content="width=device-width, initial-scale=1">';
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head([^>]*)>/i, `<head$1>${meta}`);
  if (/<html[^>]*>/i.test(html)) return html.replace(/<html([^>]*)>/i, `<html$1><head>${meta}</head>`);
  return `${meta}${html}`;
};

const FRAME_CSS = `
.buildit-frame {
  width: 100%;
  border: 0;
  display: block;
  background: #000;
  height: calc(100vh - var(--buildit-frame-offset, 56px));
}
@supports (height: 100dvh) {
  .buildit-frame { height: calc(100dvh - var(--buildit-frame-offset, 56px)); }
}
`;

const EDIT_MARK = "data-buildit-editable";
const EDIT_STYLE_MARK = "data-buildit-edit-style";

/** Elements whose own direct text content shouldn't be made editable. */
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "HEAD", "TITLE", "BR", "HR", "IMG"]);
const HTML_NS = "http://www.w3.org/1999/xhtml";

/** True for an element whose text a tap-to-edit mode should target: it carries
 *  its own visible text directly (not just via nested elements), and isn't
 *  markup we'd never want someone typing into.
 *
 *  Namespace-gated rather than a tag-name skip list for SVG: `contenteditable`
 *  is an HTMLElement concept, SVG elements don't implement it, and SVG tag
 *  names are lowercase in their namespace regardless of how any HTML skip
 *  list is cased - a `tagName === "SVG"` check would silently never match.
 */
const isEditableLeaf = (el: Element): boolean => {
  if (el.namespaceURI !== HTML_NS) return false;
  if (SKIP_TAGS.has(el.tagName)) return false;
  if (el.children.length > 0) return false;
  const text = (el.textContent || "").trim();
  return text.length > 0;
};

const walkEditableLeaves = (root: Element, visit: (el: Element) => void) => {
  if (isEditableLeaf(root)) {
    visit(root);
    return;
  }
  for (const child of Array.from(root.children)) walkEditableLeaves(child, visit);
};

/** Turns "Edit text" mode on/off inside the (same-origin) iframe document. */
const setTextEditable = (doc: Document, enabled: boolean) => {
  const existingStyle = doc.head.querySelector(`style[${EDIT_STYLE_MARK}]`);
  if (enabled) {
    walkEditableLeaves(doc.body, (el) => {
      // Plain "true" rather than "plaintext-only" - broader WebKit/Capacitor
      // compatibility. Rich paste is a minor rough edge; losing the feature
      // entirely on some iOS versions would not be.
      el.setAttribute("contenteditable", "true");
      el.setAttribute(EDIT_MARK, "1");
    });
    if (!existingStyle) {
      const style = doc.createElement("style");
      style.setAttribute(EDIT_STYLE_MARK, "1");
      style.textContent = `
        [${EDIT_MARK}] { outline: 2px dashed rgba(168,85,247,0.85); outline-offset: 3px; cursor: text; border-radius: 2px; }
        [${EDIT_MARK}]:focus { outline-color: #ec4899; background: rgba(168,85,247,0.08); }
      `;
      doc.head.appendChild(style);
    }
  } else {
    doc.querySelectorAll(`[${EDIT_MARK}]`).forEach((el) => {
      el.removeAttribute("contenteditable");
      el.removeAttribute(EDIT_MARK);
    });
    existingStyle?.remove();
  }
};

export type BuiltPageFrameHandle = {
  /** Serializes the (possibly hand-edited) document back to a clean HTML
   *  string, stripped of any editing affordances, ready to persist. */
  extractHtml: () => string;
};

/**
 * Renders a generated page in a sandboxed iframe.
 *
 * `allow-same-origin` is always granted so "Edit text" mode can reach
 * `contentDocument` — but `allow-scripts` never is, so any `<script>` that
 * made it into the model's output stays inert regardless: `allow-same-origin`
 * alone cannot execute code, it only affects same-origin DOM access. The
 * generate prompt already forbids JavaScript; the missing `allow-scripts` is
 * the actual enforcement of that, and is unaffected by this change.
 *
 * The frame is a fixed viewport-height box that scrolls internally, because
 * auto-sizing to content height would require scripting inside the frame.
 * Generated pages are designed as a single phone screen, so this is also what
 * makes their `100vh` layouts render as intended.
 */
const BuiltPageFrame = forwardRef<
  BuiltPageFrameHandle,
  { html: string; title?: string; offsetPx?: number; editable?: boolean }
>(({ html, title = "Event page", offsetPx = 56, editable = false }, ref) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const srcDoc = useMemo(() => withViewportMeta(html), [html]);

  // Re-apply (or lift) the editable styling whenever edit mode toggles, and
  // re-apply it after a reload (new `html`, e.g. "Cancel" resetting to the
  // last-saved version) so the two states always match the iframe's content.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const apply = () => {
      const doc = iframe.contentDocument;
      if (doc?.body) setTextEditable(doc, editable);
    };
    if (iframe.contentDocument?.readyState === "complete") apply();
    iframe.addEventListener("load", apply);
    return () => iframe.removeEventListener("load", apply);
  }, [editable, srcDoc]);

  useImperativeHandle(
    ref,
    () => ({
      extractHtml: () => {
        const doc = iframeRef.current?.contentDocument;
        if (!doc?.documentElement) return html;
        // Clone before stripping so the live, still-editable document is
        // untouched — the caller decides whether to keep editing or exit.
        const clone = doc.documentElement.cloneNode(true) as HTMLElement;
        clone.querySelectorAll(`[${EDIT_MARK}]`).forEach((el) => {
          el.removeAttribute("contenteditable");
          el.removeAttribute(EDIT_MARK);
        });
        clone.querySelector(`style[${EDIT_STYLE_MARK}]`)?.remove();
        return "<!doctype html>\n" + clone.outerHTML;
      },
    }),
    [html],
  );

  return (
    <>
      <style>{FRAME_CSS}</style>
      <iframe
        ref={iframeRef}
        className="buildit-frame"
        style={{ "--buildit-frame-offset": `${offsetPx}px` } as React.CSSProperties}
        title={title}
        srcDoc={srcDoc}
        sandbox="allow-same-origin"
        referrerPolicy="no-referrer"
      />
    </>
  );
});
BuiltPageFrame.displayName = "BuiltPageFrame";

export default BuiltPageFrame;
