import type { ResumeDocument } from "../resume/types";
import { joinNonEmpty } from "./format";

export function renderMarkdown(doc: ResumeDocument): string {
  const out: string[] = [`# ${doc.name || "Resume"}`, ""];
  if (doc.headline) out.push(`**${doc.headline}**  `);
  if (doc.contact.length) out.push(doc.contact.join(" · "));

  for (const section of doc.sections) {
    out.push("", `## ${section.title}`, "");
    if (section.paragraph) out.push(section.paragraph, "");
    for (const e of section.entries) {
      out.push(`### ${joinNonEmpty([e.title, e.subtitle], " — ")}`);
      const meta = joinNonEmpty([e.dates, e.meta], " | ");
      if (meta) out.push(`*${meta}*`);
      out.push("");
      if (e.bullets.length) out.push(...e.bullets.map((b) => `- ${b}`), "");
    }
    for (const line of section.lines) {
      const [label, rest] = splitLabel(line, section.key === "skills");
      out.push(label ? `- **${label}:** ${rest}` : `- ${line}`);
    }
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

/** "Languages: Go, Rust" → ["Languages", "Go, Rust"] for skill lines. */
export function splitLabel(line: string, enabled: boolean): [string, string] {
  const i = line.indexOf(": ");
  return enabled && i > 0 ? [line.slice(0, i), line.slice(i + 2)] : ["", line];
}
