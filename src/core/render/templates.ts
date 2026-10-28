import type { ResumeDocument } from "../resume/types";
import type { TemplateId } from "../schema";

/** Resumes never go past this many pages: longer content is laid out tighter, or rejected. */
export const MAX_PAGES = 2;

export const TEMPLATES: { id: TemplateId; name: string; description: string }[] = [
  { id: "classic", name: "Classic", description: "Clean sans-serif with ruled section headings." },
  { id: "modern", name: "Modern", description: "Navy accents, dates aligned to the right." },
  { id: "traditional", name: "Traditional", description: "Serif type with a centred header." },
  { id: "compact", name: "Compact", description: "Smaller type and tight spacing for long careers." },
];

/**
 * Layout values shared by the PDF, DOCX and HTML renderers, so every format
 * looks the same. Sizes are in points.
 */
export interface ResumeStyle {
  serif: boolean;
  /** Centre the name, headline and contact line. */
  centerHeader: boolean;
  /** Colour of the name and section headings. */
  accent: string;
  /** Colour of the line under section headings, or "" for none. */
  rule: string;
  /** Put an entry's dates at the right end of its title line instead of on the line below. */
  datesRight: boolean;
  size: { name: number; headline: number; contact: number; heading: number; title: number; body: number; meta: number };
  /** Space above each section heading. */
  sectionGap: number;
  /** Space between entries in a section. */
  entryGap: number;
  /** Extra space between wrapped lines. */
  lineGap: number;
  margin: { x: number; y: number };
}

const STYLES: Record<TemplateId, ResumeStyle> = {
  classic: {
    serif: false,
    centerHeader: false,
    accent: "#111111",
    rule: "#999999",
    datesRight: false,
    size: { name: 20, headline: 11, contact: 9.5, heading: 11, title: 10.5, body: 10, meta: 9.5 },
    sectionGap: 9,
    entryGap: 5.5,
    lineGap: 1.5,
    margin: { x: 54, y: 46 },
  },
  modern: {
    serif: false,
    centerHeader: false,
    accent: "#1f3a68",
    rule: "#1f3a68",
    datesRight: true,
    size: { name: 22, headline: 11.5, contact: 9.5, heading: 11, title: 10.5, body: 10, meta: 9.5 },
    sectionGap: 10,
    entryGap: 6,
    lineGap: 1.6,
    margin: { x: 54, y: 46 },
  },
  traditional: {
    serif: true,
    centerHeader: true,
    accent: "#111111",
    rule: "#444444",
    datesRight: true,
    // Times sets narrower than Helvetica, so the same line holds more at a larger size.
    size: { name: 21, headline: 11.5, contact: 10, heading: 11.5, title: 11, body: 10.5, meta: 10 },
    sectionGap: 9,
    entryGap: 5.5,
    lineGap: 1.4,
    margin: { x: 58, y: 50 },
  },
  compact: {
    serif: false,
    centerHeader: false,
    accent: "#111111",
    rule: "#bbbbbb",
    datesRight: true,
    size: { name: 17, headline: 10, contact: 8.5, heading: 9.5, title: 9.5, body: 9, meta: 8.5 },
    sectionGap: 6,
    entryGap: 3.5,
    lineGap: 1,
    margin: { x: 42, y: 36 },
  },
};

// Each level tightens spacing first and only then shrinks the type a little.
const FIT_LEVELS = [
  { text: 1, space: 1, margin: 1 },
  { text: 1, space: 0.6, margin: 0.85 },
  { text: 0.95, space: 0.45, margin: 0.75 },
  { text: 0.9, space: 0.3, margin: 0.7 },
];
export const MAX_FIT_LEVEL = FIT_LEVELS.length - 1;

// Never shrink text below this, whatever the template or fit level.
const MIN_TEXT_SIZE = 8;

export function resumeStyle(doc: Pick<ResumeDocument, "template" | "fitLevel">): ResumeStyle {
  // Resumes saved before templates existed have neither field.
  const base = STYLES[doc.template] ?? STYLES.classic;
  const fit = FIT_LEVELS[doc.fitLevel] ?? FIT_LEVELS[0]!;
  const text = (pt: number) => Math.max(MIN_TEXT_SIZE, round(pt * fit.text));
  return {
    ...base,
    size: Object.fromEntries(Object.entries(base.size).map(([k, v]) => [k, text(v)])) as ResumeStyle["size"],
    sectionGap: round(base.sectionGap * fit.space),
    entryGap: round(base.entryGap * fit.space),
    lineGap: round(base.lineGap * Math.max(fit.space, 0.5)),
    margin: { x: round(base.margin.x * fit.margin), y: round(base.margin.y * fit.margin) },
  };
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
