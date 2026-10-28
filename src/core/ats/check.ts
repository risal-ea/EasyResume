import { renderText } from "../render/text";
import type { AtsIssue, AtsReport, ResumeDocument } from "../resume/types";

/**
 * Deterministic ATS check. Keyword coverage is measured on the same plain text
 * an ATS would extract; the lint rules catch common parsing and style problems.
 */
export function checkAts(doc: ResumeDocument, keywords: string[], pageCount: number): AtsReport {
  const haystack = normalize(renderText(doc));
  const unique = [...new Map(keywords.map((k) => [normalize(k), k.trim()])).entries()].filter(([n]) => n);
  const foundKeywords: string[] = [];
  const missingKeywords: string[] = [];
  for (const [needle, original] of unique) {
    (containsTerm(haystack, needle) ? foundKeywords : missingKeywords).push(original);
  }

  return {
    keywordCoverage: unique.length ? Math.round((foundKeywords.length / unique.length) * 100) : null,
    foundKeywords,
    missingKeywords,
    issues: lint(doc, pageCount),
    pageCount,
  };
}

/** Lowercase, treat hyphens/slashes as spaces and collapse whitespace. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‐-―/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Whole-term match that still works for terms like "c++", "node.js" and ".net". */
function containsTerm(haystack: string, needle: string): boolean {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`).test(haystack) ||
    // Allow a simple plural/singular difference ("api" vs "apis").
    new RegExp(`(^|[^a-z0-9])${escaped}s($|[^a-z0-9])`).test(haystack) ||
    (needle.endsWith("s") && new RegExp(`(^|[^a-z0-9])${escaped.slice(0, -1)}($|[^a-z0-9])`).test(haystack));
}

const WEAK_OPENERS = /^(responsible for|worked on|helped|assisted|involved in|tasked with|duties included|participated in)\b/i;
const FIRST_PERSON = /\b(i|me|my|mine|myself)\b/i;
const ACTION_VERBS = new Set(
  `accelerate achieve administer advise analyze architect assess audit automate build champion coach collaborate
  configure consolidate coordinate create cut debug decrease define deliver deploy design develop devise diagnose direct
  document double drive eliminate enable engineer enhance establish evaluate execute expand facilitate forecast founded
  generate grow guide identify implement improve increase influence initiate innovate install integrate introduce launch
  lead maintain manage mentor migrate model modernize monitor negotiate optimize orchestrate organize oversee own partner
  pilot plan prepare present prioritize produce program prototype publish raise rebuild recruit redesign reduce refactor
  remediate resolve restructure revamp scale secure ship simplify spearhead standardize streamline strengthen support
  test train transform translate triple troubleshoot unify upgrade validate win write`.split(/\s+/),
);

function lint(doc: ResumeDocument, pageCount: number): AtsIssue[] {
  const issues: AtsIssue[] = [];
  const add = (level: AtsIssue["level"], message: string) => issues.push({ level, message });
  const contact = doc.contact.join(" ");

  if (!doc.name) add("error", "The resume has no name.");
  if (!/@/.test(contact)) add("error", "No email address in the contact line.");
  if (!/\d{3}/.test(contact)) add("warning", "No phone number in the contact line.");

  const section = (key: string) => doc.sections.find((s) => s.key === key);
  const summary = section("summary")?.paragraph ?? "";
  if (!summary) {
    add("warning", "No summary. A 2-4 sentence summary aimed at the role helps both ATS ranking and recruiters.");
  } else {
    const words = summary.split(/\s+/).length;
    if (words > 90) add("warning", `The summary is long (${words} words). Aim for 40-80 words.`);
    if (FIRST_PERSON.test(summary)) add("warning", "The summary uses first-person pronouns (I, my). Resumes usually leave them out.");
  }

  if (!section("experience") && !section("projects")) add("error", "No work experience or projects section.");
  if (!section("skills")) add("warning", "No skills section. ATS keyword matching relies heavily on it.");
  if (!section("education")) add("warning", "No education section.");

  const bullets: string[] = [];
  for (const s of doc.sections) {
    if (s.key !== "experience" && s.key !== "projects") continue;
    for (const e of s.entries) {
      bullets.push(...e.bullets);
      if (s.key === "experience" && e.bullets.length === 0) add("warning", `"${e.title}" at ${e.subtitle} has no bullets.`);
      if (e.bullets.length > 7) add("warning", `"${e.title}" has ${e.bullets.length} bullets. Keep it to the strongest 3-6.`);
      if (s.key === "experience" && !e.dates) add("warning", `"${e.title}" at ${e.subtitle} has no dates.`);
    }
  }

  const long = bullets.filter((b) => b.split(/\s+/).length > 35);
  if (long.length) add("warning", `${long.length} bullet(s) are longer than 35 words. Split or tighten them.`);

  const weak = bullets.filter((b) => WEAK_OPENERS.test(b));
  if (weak.length) {
    add("warning", `${weak.length} bullet(s) start with a weak phrase (e.g. "${clip(weak[0]!)}"). Lead with an action verb.`);
  }

  const noVerb = bullets.filter((b) => !WEAK_OPENERS.test(b) && !startsWithActionVerb(b));
  if (noVerb.length > Math.max(1, bullets.length * 0.3)) {
    add("warning", `${noVerb.length} bullet(s) don't start with an action verb (e.g. "${clip(noVerb[0]!)}").`);
  }

  const pronouns = bullets.filter((b) => FIRST_PERSON.test(b));
  if (pronouns.length) add("warning", `${pronouns.length} bullet(s) use first-person pronouns (I, my).`);

  if (bullets.length >= 4) {
    const quantified = bullets.filter((b) => /\d/.test(b)).length;
    if (quantified / bullets.length < 0.3) {
      add("warning", `Only ${quantified} of ${bullets.length} bullets include a number. Add metrics (%, $, time, scale) where the facts support it.`);
    }
  }

  if (pageCount > 2) add("warning", `The resume is ${pageCount} pages. Keep it to 1-2 pages.`);
  return issues;
}

function startsWithActionVerb(bullet: string): boolean {
  const word = bullet.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z-]/g, "") ?? "";
  if (!word) return false;
  if (ACTION_VERBS.has(word)) return true;
  // Past tense or third person ("led", "built", "manages") of most verbs.
  const stems = [word.replace(/ed$/, ""), word.replace(/ed$/, "e"), word.replace(/ied$/, "y"), word.replace(/s$/, ""), word.replace(/es$/, "")];
  if (stems.some((s) => ACTION_VERBS.has(s))) return true;
  return /^(led|built|ran|won|grew|cut|drove|wrote|made|took|set|shipped|owned|began|brought|taught|sold|spoke)$/.test(word) ||
    (word.length > 4 && word.endsWith("ed"));
}

function clip(s: string): string {
  return s.length > 50 ? `${s.slice(0, 47)}…` : s;
}
