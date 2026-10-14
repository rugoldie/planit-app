import { useMemo } from "react";

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

/**
 * Renders a generated page in a fully sandboxed iframe.
 *
 * `sandbox=""` grants nothing — crucially not `allow-scripts`, so any <script>
 * that made it into the model's output is inert, and not `allow-same-origin`,
 * so the frame can never reach the Covo page around it. The generate prompt
 * already forbids JavaScript; this is the enforcement.
 *
 * The frame is a fixed viewport-height box that scrolls internally, because
 * auto-sizing to content height would require scripting inside the frame.
 * Generated pages are designed as a single phone screen, so this is also what
 * makes their `100vh` layouts render as intended.
 */
const BuiltPageFrame = ({
  html,
  title = "Event page",
  offsetPx = 56,
}: {
  html: string;
  title?: string;
  offsetPx?: number;
}) => {
  const srcDoc = useMemo(() => withViewportMeta(html), [html]);

  return (
    <>
      <style>{FRAME_CSS}</style>
      <iframe
        className="buildit-frame"
        style={{ "--buildit-frame-offset": `${offsetPx}px` } as React.CSSProperties}
        title={title}
        srcDoc={srcDoc}
        sandbox=""
        referrerPolicy="no-referrer"
      />
    </>
  );
};

export default BuiltPageFrame;
