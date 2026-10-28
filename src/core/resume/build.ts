import { displayUrl, formatDateRange, formatMonth, joinNonEmpty } from "../render/format";
import {
  SECTION_KEYS,
  type Certification,
  type Education,
  type Experience,
  type HeaderOverride,
  type ItemOverride,
  type Profile,
  type Project,
  type ResumeDraft,
  type SectionKey,
} from "../schema";
import type { ResumeDocument, ResumeEntry, ResumeSection } from "./types";

export const SECTION_TITLES: Record<SectionKey, string> = {
  summary: "Summary",
  skills: "Skills",
  experience: "Work Experience",
  projects: "Projects",
  education: "Education",
  certifications: "Certifications",
  awards: "Awards",
  volunteer: "Volunteer Experience",
  publications: "Publications",
  languages: "Languages",
};

/** The draft referenced something that does not exist in the profile. */
export class DraftError extends Error {}

export interface BuildResult {
  document: ResumeDocument;
  warnings: string[];
}

/**
 * Turns the AI's draft into a finished resume. Facts (name, contact details,
 * employers, titles, dates, schools, certificate names) come from the profile
 * unless the user reworded them in the web editor; the AI's part of the draft
 * only chooses which items to show and supplies the tailored wording.
 */
export function buildResume(profile: Profile, draft: ResumeDraft): BuildResult {
  const warnings: string[] = [];
  const unknown: string[] = [];

  function pick<T extends { id: string }, R extends { profileId: string }>(kind: string, items: T[], refs: R[]) {
    const seen = new Set<string>();
    const picked: { item: T; ref: R; edit: ItemOverride }[] = [];
    for (const ref of refs) {
      const item = items.find((i) => i.id === ref.profileId);
      if (!item) {
        unknown.push(`${kind} "${ref.profileId}"`);
      } else if (seen.has(ref.profileId)) {
        warnings.push(`${kind} "${ref.profileId}" was listed twice; the duplicate was dropped.`);
      } else {
        seen.add(ref.profileId);
        picked.push({ item, ref, edit: draft.overrides[ref.profileId] ?? {} });
      }
    }
    return picked;
  }

  const experience = pick("experience", profile.experience, draft.experience);
  const projects = pick("project", profile.projects, draft.projects);
  const education = pick("education", profile.education, draft.education);
  const certifications = pick("certification", profile.certifications, draft.certifications);
  const awards = pick("award", profile.awards, draft.awards);
  const volunteer = pick("volunteer", profile.volunteer, draft.volunteer);
  const publications = pick("publication", profile.publications, draft.publications);
  const languages = pick("language", profile.languages, draft.languages);

  if (unknown.length > 0) {
    throw new DraftError(
      `These ids are not in the profile: ${unknown.join(", ")}. Call get_profile and use the exact \`id\` values it returns.`,
    );
  }

  const { basics } = profile;
  const { header } = draft;
  const fromProfile = profileHeader(profile);
  const name = (header.name ?? fromProfile.name).trim();
  const email = (header.email ?? fromProfile.email).trim();
  const phone = (header.phone ?? fromProfile.phone).trim();
  const contact = [email, phone, header.location ?? fromProfile.location, ...(header.links ?? fromProfile.links)]
    .map((s) => s.trim())
    .filter(Boolean);
  if (!name) warnings.push("The resume has no name. Ask the user to add it to their profile in the EasyResume web UI.");
  if (!email && !phone) warnings.push("The resume has no email or phone number.");

  const content: Partial<Record<SectionKey, Omit<ResumeSection, "key" | "title">>> = {};
  const section = (fields: Partial<Omit<ResumeSection, "key" | "title">>) => ({
    paragraph: "",
    entries: [],
    lines: [],
    ...fields,
  });

  const summary = (draft.summary || basics.summary).trim();
  if (summary) content.summary = section({ paragraph: summary });

  const skillLines = draft.skills
    .map((g) => ({ category: g.category.trim(), items: g.items.map((s) => s.trim()).filter(Boolean) }))
    .filter((g) => g.items.length > 0)
    .map((g) => (g.category ? `${g.category}: ${g.items.join(", ")}` : g.items.join(", ")));
  if (skillLines.length) content.skills = section({ lines: skillLines });
  warnings.push(...unknownSkillWarnings(profile, draft));

  if (experience.length) {
    content.experience = section({
      entries: experience.map(({ item, ref, edit }) =>
        entry({ ...entryText.experience(item), bullets: ref.bullets ?? item.achievements }, edit),
      ),
    });
    if (!isReverseChronological(experience.map(({ item }) => item.current ? "9999-12" : item.endDate || item.startDate))) {
      warnings.push("Work experience is not in reverse-chronological order, which most ATS and recruiters expect.");
    }
  } else if (profile.experience.length) {
    warnings.push("No work experience was included, although the profile has some.");
  }

  if (projects.length) {
    content.projects = section({
      entries: projects.map(({ item, ref, edit }) => entry({ ...entryText.projects(item), bullets: ref.bullets ?? item.highlights }, edit)),
    });
  }

  if (education.length) {
    content.education = section({
      entries: education.map(({ item, ref, edit }) =>
        entry(
          { ...entryText.education(item), bullets: [edit.grade ?? gradeLine(item.grade), ...(ref.bullets ?? item.achievements)] },
          edit,
        ),
      ),
    });
  }

  // A line the user blanked out in the editor is left off.
  const lines = <T>(picked: { item: T; edit: ItemOverride }[], text: (item: T) => string) =>
    picked.map(({ item, edit }) => (edit.text ?? text(item)).trim()).filter(Boolean);

  const certificationLines = lines(certifications, lineText.certifications);
  if (certificationLines.length) content.certifications = section({ lines: certificationLines });

  const awardLines = lines(awards, lineText.awards);
  if (awardLines.length) content.awards = section({ lines: awardLines });

  if (volunteer.length) {
    content.volunteer = section({
      entries: volunteer.map(({ item, ref, edit }) =>
        entry({ ...entryText.volunteer(item), bullets: ref.bullets ?? volunteerBullets(item) }, edit),
      ),
    });
  }

  const publicationLines = lines(publications, lineText.publications);
  if (publicationLines.length) content.publications = section({ lines: publicationLines });

  const languageLines = lines(languages, lineText.languages);
  if (languageLines.length) content.languages = section({ lines: [languageLines.join(", ")] });

  const order = [...new Set([...draft.sectionOrder, ...SECTION_KEYS])];
  const sections: ResumeSection[] = order
    .filter((key) => content[key])
    .map((key) => ({ key, title: draft.sectionTitles[key]?.trim() || SECTION_TITLES[key], ...content[key]! }));

  const document: ResumeDocument = {
    name,
    // The headline matches the job being applied for, not the profile's general one.
    headline: (draft.headline || draft.targetTitle).trim(),
    contact,
    sections,
    pageSize: profile.settings.pageSize,
    template: draft.template,
    // Set by the PDF renderer once it knows how much space the content needs.
    fitLevel: 0,
  };

  return { document, warnings };
}

/** The name and contact details the profile gives a resume's header. */
export function profileHeader(profile: Profile): Required<HeaderOverride> {
  const { basics } = profile;
  return {
    name: basics.name,
    email: basics.email,
    phone: basics.phone,
    location: joinNonEmpty([basics.location.city, basics.location.region, basics.location.country], ", "),
    links: basics.links.map((l) => displayUrl(l.url)).filter(Boolean),
  };
}

/** Draft fields that pick profile items by id. */
export type ProfileRefKey =
  | "experience"
  | "projects"
  | "education"
  | "volunteer"
  | "certifications"
  | "awards"
  | "publications"
  | "languages";

export interface ProfileItemOption {
  id: string;
  label: string;
  /** Dates, to tell similar items apart. */
  detail: string;
  /** What the item shows on a resume until the user rewords it: an entry's fields, or a one-line item's `text`. */
  defaults: ItemOverride;
  /** What the entry shows when the draft has no tailored bullets for it. */
  bullets: string[];
}

/** Every profile item a resume can include, labelled for the web UI's resume editor. */
export function profileItemOptions(profile: Profile): Record<ProfileRefKey, ProfileItemOption[]> {
  const entryOption = (id: string, text: EntryText, bullets: string[], extra: ItemOverride = {}) => ({
    id,
    label: joinNonEmpty([text.title, text.subtitle], " — "),
    detail: text.dates,
    defaults: { ...text, ...extra },
    bullets,
  });
  const lineOption = (id: string, label: string, detail: string, text: string) => ({ id, label, detail, defaults: { text }, bullets: [] });
  return {
    experience: profile.experience.map((e) => entryOption(e.id, entryText.experience(e), e.achievements)),
    projects: profile.projects.map((p) => entryOption(p.id, entryText.projects(p), p.highlights)),
    education: profile.education.map((e) => entryOption(e.id, entryText.education(e), e.achievements, { grade: gradeLine(e.grade) })),
    volunteer: profile.volunteer.map((v) => entryOption(v.id, entryText.volunteer(v), volunteerBullets(v))),
    certifications: profile.certifications.map((c) =>
      lineOption(c.id, joinNonEmpty([c.name, c.issuer], ", "), formatMonth(c.date), lineText.certifications(c)),
    ),
    awards: profile.awards.map((a) => lineOption(a.id, joinNonEmpty([a.title, a.awarder], ", "), formatMonth(a.date), lineText.awards(a))),
    publications: profile.publications.map((p) =>
      lineOption(p.id, joinNonEmpty([p.name, p.publisher], ", "), formatMonth(p.date), lineText.publications(p)),
    ),
    languages: profile.languages.map((l) => lineOption(l.id, lineText.languages(l), "", lineText.languages(l))),
  };
}

type EntryText = Omit<ResumeEntry, "bullets">;

/** The text each kind of entry shows from the profile. */
const entryText = {
  experience: (e: Experience): EntryText => ({
    title: e.title,
    subtitle: e.company,
    meta: e.location,
    dates: formatDateRange(e.startDate, e.endDate, e.current),
  }),
  projects: (p: Project): EntryText => ({
    title: p.name,
    subtitle: p.role,
    meta: displayUrl(p.url),
    dates: formatDateRange(p.startDate, p.endDate),
  }),
  education: (e: Education): EntryText => ({
    title: degreeTitle(e.degree, e.field),
    subtitle: e.institution,
    meta: e.location,
    dates: formatDateRange(e.startDate, e.endDate),
  }),
  volunteer: (v: Profile["volunteer"][number]): EntryText => ({
    title: v.role,
    subtitle: v.organization,
    meta: "",
    dates: formatDateRange(v.startDate, v.endDate, v.current),
  }),
};

/** The text each kind of one-line item shows from the profile. */
const lineText = {
  certifications: (c: Certification) => withDate(joinNonEmpty([c.name, c.issuer], ", "), c.date),
  awards: (a: Profile["awards"][number]) => withDate(joinNonEmpty([a.title, a.awarder], ", "), a.date),
  publications: (p: Profile["publications"][number]) => withDate(joinNonEmpty([p.name, p.publisher], ", "), p.date),
  languages: (l: Profile["languages"][number]) => (l.fluency ? `${l.language} (${l.fluency})` : l.language),
};

function volunteerBullets(item: Profile["volunteer"][number]): string[] {
  return item.highlights.length ? item.highlights : item.summary ? [item.summary] : [];
}

/** The entry with the user's rewording from the web editor (`edit`) in place of the profile's text. */
function entry(e: ResumeEntry, edit: ItemOverride): ResumeEntry {
  return {
    title: (edit.title ?? e.title).trim(),
    subtitle: (edit.subtitle ?? e.subtitle).trim(),
    meta: (edit.meta ?? e.meta).trim(),
    dates: (edit.dates ?? e.dates).trim(),
    bullets: e.bullets.map(stripBulletMarker).filter(Boolean),
  };
}

/** The AI sometimes sends "• Did X" or "- Did X"; renderers add their own bullet. */
function stripBulletMarker(text: string): string {
  return text.replace(/^\s*(?:[-*•▪◦·]|\d+[.)])\s+/, "").trim();
}

function degreeTitle(degree: string, field: string): string {
  if (degree && field) return `${degree} in ${field}`;
  return degree || field;
}

function gradeLine(grade: string): string {
  if (!grade) return "";
  return /gpa|cgpa|grade|%|class|hono|distinction|cum laude/i.test(grade) ? grade : `Grade: ${grade}`;
}

function withDate(text: string, date: string): string {
  const formatted = formatMonth(date);
  return formatted ? `${text} (${formatted})` : text;
}

function isReverseChronological(dates: string[]): boolean {
  const known = dates.filter(Boolean);
  return known.every((d, i) => i === 0 || d <= known[i - 1]!);
}

/** Skills the AI listed that appear nowhere in the profile: a hint of fabrication. */
function unknownSkillWarnings(profile: Profile, draft: ResumeDraft): string[] {
  const known = new Set(
    [
      ...profile.skills.flatMap((g) => g.items),
      ...profile.experience.flatMap((e) => e.technologies),
      ...profile.projects.flatMap((p) => p.technologies),
      ...profile.education.flatMap((e) => e.courses),
      ...profile.certifications.map((c) => c.name),
    ].map(normalizeSkill),
  );
  // Free text also counts: a skill mentioned in an achievement or the notes is still the user's.
  const corpus = normalizeSkill(
    [
      profile.notes,
      profile.basics.summary,
      ...profile.experience.flatMap((e) => [e.description, ...e.achievements]),
      ...profile.projects.flatMap((p) => [p.description, ...p.highlights]),
    ].join(" "),
  );
  const missing = draft.skills
    .flatMap((g) => g.items)
    .filter((skill) => {
      const n = normalizeSkill(skill);
      return n && !known.has(n) && !corpus.includes(n);
    });
  return missing.length
    ? [
        `These skills are not in the profile: ${[...new Set(missing)].join(", ")}. Only keep them if the user confirmed they have them (and suggest adding them to the profile).`,
      ]
    : [];
}

function normalizeSkill(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9+#]+/g, "");
}
