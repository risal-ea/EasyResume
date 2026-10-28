"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Shows a page from renderHtml. Updates swap the new content into the loaded
 * page instead of reloading it, so the preview keeps its scroll position and
 * does not flash while the user edits.
 */
export function ResumePreview({ html }: { html: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [first] = useState(html);

  const show = useCallback(() => {
    const doc = frame.current?.contentDocument;
    const page = doc?.querySelector("main");
    if (!doc || !page) return; // still loading; onLoad calls this again
    const next = new DOMParser().parseFromString(html, "text/html");
    const nextPage = next.querySelector("main");
    if (!nextPage) return;
    doc.head.replaceWith(doc.importNode(next.head, true));
    page.replaceWith(doc.importNode(nextPage, true));
  }, [html]);

  // Also covers a first load that finished before React attached onLoad.
  useEffect(show, [show]);

  return <iframe ref={frame} className="preview-frame" srcDoc={first} title="Resume preview" onLoad={show} />;
}
