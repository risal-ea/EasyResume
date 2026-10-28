import type { ResumeDocument } from "../resume/types";
import { joinNonEmpty } from "./format";

/** Plain-text resume: what an ATS parser "sees". Used by the ATS check. */
export function renderText(doc: ResumeDocument): string {
  const out: string[] = [doc.name, doc.headline, doc.contact.join(" | ")];
  for (const section of doc.sections) {
    out.push("", section.title.toUpperCase());
    if (section.paragraph) out.push(section.paragraph);
    for (const e of section.entries) {
      out.push(joinNonEmpty([e.title, e.subtitle], " — "), joinNonEmpty([e.dates, e.meta], " | "));
      out.push(...e.bullets.map((b) => `• ${b}`));
    }
    out.push(...section.lines);
  }
  return out.filter((line, i, all) => line !== "" || all[i - 1] !== "").join("\n").trim() + "\n";
}
