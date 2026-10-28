import type { ResumeDocument } from "../resume/types";
import { joinNonEmpty } from "./format";
import { splitLabel } from "./markdown";

/** Standalone HTML page that mirrors the PDF layout. Shown in the web UI preview. */
export function renderHtml(doc: ResumeDocument): string {
  const body: string[] = [`<header><h1>${esc(doc.name || "Resume")}</h1>`];
  if (doc.headline) body.push(`<p class="headline">${esc(doc.headline)}</p>`);
  if (doc.contact.length) body.push(`<p class="contact">${doc.contact.map(esc).join(" &nbsp;|&nbsp; ")}</p>`);
  body.push("</header>");

  for (const section of doc.sections) {
    body.push(`<section><h2>${esc(section.title)}</h2>`);
    if (section.paragraph) body.push(`<p>${esc(section.paragraph)}</p>`);
    for (const e of section.entries) {
      body.push(
        `<div class="entry"><p class="entry-title"><strong>${esc(e.title)}</strong>${e.subtitle ? ` — ${esc(e.subtitle)}` : ""}</p>`,
      );
      const meta = joinNonEmpty([e.dates, e.meta], " | ");
      if (meta) body.push(`<p class="meta">${esc(meta)}</p>`);
      if (e.bullets.length) body.push(`<ul>${e.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`);
      body.push("</div>");
    }
    for (const line of section.lines) {
      const [label, rest] = splitLabel(line, section.key === "skills");
      body.push(`<p class="line">${label ? `<strong>${esc(label)}:</strong> ${esc(rest)}` : esc(line)}</p>`);
    }
    body.push("</section>");
  }

  const width = doc.pageSize === "Letter" ? "8.5in" : "210mm";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(doc.name || "Resume")}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #e9e9ec; font: 10.5pt/1.4 Helvetica, Arial, sans-serif; color: #111; }
  main { width: ${width}; max-width: 100%; margin: 24px auto; padding: 0.7in 0.75in; background: #fff; box-shadow: 0 1px 6px rgba(0,0,0,.15); }
  h1 { font-size: 20pt; margin: 0 0 2px; }
  .headline { font-size: 11pt; margin: 0 0 2px; color: #333; }
  .contact { font-size: 9.5pt; margin: 0; color: #333; overflow-wrap: anywhere; }
  h2 { font-size: 11pt; text-transform: uppercase; letter-spacing: .04em; margin: 14px 0 6px; padding-bottom: 2px; border-bottom: 1px solid #999; }
  p { margin: 0 0 4px; }
  .entry { margin-bottom: 8px; }
  .entry-title { margin: 0; }
  .meta { font-size: 9.5pt; color: #444; margin: 0 0 2px; }
  ul { margin: 2px 0 0; padding-left: 18px; }
  li { margin-bottom: 2px; }
  .line { margin-bottom: 2px; }
  @media (max-width: 640px) { main { margin: 0; padding: 20px 16px; box-shadow: none; } }
  @media print { body { background: #fff; } main { margin: 0; box-shadow: none; width: auto; } }
</style>
</head>
<body><main>
${body.join("\n")}
</main></body>
</html>
`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
