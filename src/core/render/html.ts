import type { ResumeDocument } from "../resume/types";
import { joinNonEmpty } from "./format";
import { splitLabel } from "./markdown";
import { resumeStyle } from "./templates";

/** Standalone HTML page that mirrors the PDF layout. Shown in the web UI preview. */
export function renderHtml(doc: ResumeDocument): string {
  const style = resumeStyle(doc);
  const { size } = style;
  const body: string[] = [`<header><h1>${esc(doc.name || "Resume")}</h1>`];
  if (doc.headline) body.push(`<p class="headline">${esc(doc.headline)}</p>`);
  if (doc.contact.length) body.push(`<p class="contact">${doc.contact.map(esc).join(" &nbsp;|&nbsp; ")}</p>`);
  body.push("</header>");

  for (const section of doc.sections) {
    body.push(`<section><h2>${esc(section.title)}</h2>`);
    if (section.paragraph) body.push(`<p>${esc(section.paragraph)}</p>`);
    for (const e of section.entries) {
      const dates = style.datesRight && e.dates ? `<span class="dates">${esc(e.dates)}</span>` : "";
      body.push(
        `<div class="entry"><p class="entry-title"><span><strong>${esc(e.title)}</strong>${e.subtitle ? ` — ${esc(e.subtitle)}` : ""}</span>${dates}</p>`,
      );
      const meta = style.datesRight ? e.meta : joinNonEmpty([e.dates, e.meta], " | ");
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
  // The page plus its 24px side margins, in CSS pixels.
  const fullWidth = (doc.pageSize === "Letter" ? 816 : 794) + 48;
  const font = style.serif ? `"Times New Roman", Times, serif` : "Helvetica, Arial, sans-serif";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(doc.name || "Resume")}</title>
<style>
  * { box-sizing: border-box; }
  html { zoom: var(--fit, 1); }
  body { margin: 0; background: #e9e9ec; font: ${size.body}pt/1.35 ${font}; color: #111; }
  main { width: ${width}; margin: 24px auto; padding: ${style.margin.y}pt ${style.margin.x}pt; background: #fff; box-shadow: 0 1px 6px rgba(0,0,0,.15); }
  header { text-align: ${style.centerHeader ? "center" : "left"}; }
  h1 { font-size: ${size.name}pt; margin: 0 0 2px; color: ${style.accent}; }
  .headline { font-size: ${size.headline}pt; margin: 0 0 2px; color: #333; }
  .contact { font-size: ${size.contact}pt; margin: 0; color: #333; overflow-wrap: anywhere; }
  h2 { font-size: ${size.heading}pt; text-transform: uppercase; letter-spacing: .04em; color: ${style.accent}; margin: ${style.sectionGap + 4}pt 0 5pt; padding-bottom: 2px; border-bottom: ${style.rule ? `0.7pt solid ${style.rule}` : "0"}; }
  p { margin: 0 0 3px; }
  .entry + .entry { margin-top: ${style.entryGap + 1}pt; }
  .entry-title { display: flex; justify-content: space-between; align-items: baseline; gap: 12pt; margin: 0; font-size: ${size.title}pt; }
  .dates { flex: none; font-size: ${size.meta}pt; color: #444; }
  .meta { font-size: ${size.meta}pt; color: #444; margin: 0 0 2px; }
  ul { margin: 2px 0 0; padding-left: 16px; }
  li { margin-bottom: 1px; }
  .line { margin-bottom: 1px; }
  @media (max-width: 640px) { main { width: auto; margin: 0; padding: 20px 16px; box-shadow: none; } }
  @media print { body { background: #fff; } html { zoom: 1; } main { margin: 0; box-shadow: none; width: auto; } }
</style>
</head>
<body><main>
${body.join("\n")}
</main>
<script>
  // Between phone and full page width, scale the page down rather than reflow it, so line breaks match the PDF.
  const fit = () =>
    document.documentElement.style.setProperty("--fit", innerWidth > 640 ? String(Math.min(1, innerWidth / ${fullWidth})) : "1");
  addEventListener("resize", fit);
  fit();
</script>
</body>
</html>
`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
