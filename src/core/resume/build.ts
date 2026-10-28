import { displayUrl, formatDateRange, formatMonth, joinNonEmpty } from "../render/format";
import { SECTION_KEYS, type Profile, type ResumeDraft, type SectionKey } from "../schema";
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
 * Turns the AI's draft into a finished resume. Facts (employers, titles,
 * dates, schools, certificate names) always come from the profile; the draft
 * only chooses which items to show and supplies the tailored wording.
 */
export function buildResume(profile: Profile, draft: ResumeDraft): BuildResult {
  const warnings: string[] = [];
  const unknown: string[] = [];

  function pick<T extends { id: string }, R extends { profileId: string }>(kind: string, items: T[], refs: R[]) {
    const seen = new Set<string>();
    const picked: { item: T; ref: R }[] = [];
    for (const ref of refs) {
      const item = items.find((i) => i.id === ref.profileId);
      if (!item) {
        unknown.push(`${kind} "${ref.profileId}"`);
      } else if (seen.has(ref.profileId)) {
        warnings.push(`${kind} "${ref.profileId}" was listed twice; the duplicate was dropped.`);
      } else {
        seen.add(ref.profileId);
        picked.push({ item, ref });
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
  if (!basics.name) warnings.push("The profile has no name. Ask the user to add it in the EasyResume web UI.");
  if (!basics.email && !basics.phone) warnings.push("The profile has no email or phone number.");

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
      entries: experience.map(({ item, ref }) =>
        entry({
          title: item.title,
          subtitle: item.company,
          meta: item.location,
          dates: formatDateRange(item.startDate, item.endDate, item.current),
          bullets: ref.bullets ?? item.achievements,
        }),
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
      entries: projects.map(({ item, ref }) =>
        entry({
          title: item.name,
          subtitle: item.role,
          meta: displayUrl(item.url),
          dates: formatDateRange(item.startDate, item.endDate),
          bullets: ref.bullets ?? item.highlights,
        }),
      ),
    });
  }

  if (education.length) {
    content.education = section({
      entries: education.map(({ item, ref }) =>
        entry({
          title: degreeTitle(item.degree, item.field),
          subtitle: item.institution,
          meta: item.location,
          dates: formatDateRange(item.startDate, item.endDate),
          bullets: [...(item.grade ? [gradeLine(item.grade)] : []), ...(ref.bullets ?? item.achievements)],
        }),
      ),
    });
  }

  if (certifications.length) {
    content.certifications = section({
      lines: certifications.map(({ item }) => withDate(joinNonEmpty([item.name, item.issuer], ", "), item.date)),
    });
  }

  if (awards.length) {
    content.awards = section({
      lines: awards.map(({ item }) => withDate(joinNonEmpty([item.title, item.awarder], ", "), item.date)),
    });
  }

  if (volunteer.length) {
    content.volunteer = section({
      entries: volunteer.map(({ item, ref }) =>
        entry({
          title: item.role,
          subtitle: item.organization,
          meta: "",
          dates: formatDateRange(item.startDate, item.endDate, item.current),
          bullets: ref.bullets ?? volunteerBullets(item),
        }),
      ),
    });
  }

  if (publications.length) {
    content.publications = section({
      lines: publications.map(({ item }) => withDate(joinNonEmpty([item.name, item.publisher], ", "), item.date)),
    });
  }

  if (languages.length) {
    content.languages = section({
      lines: [languages.map(({ item }) => (item.fluency ? `${item.language} (${item.fluency})` : item.language)).join(", ")],
    });
  }

  const order = [...new Set([...draft.sectionOrder, ...SECTION_KEYS])];
  const sections: ResumeSection[] = order
    .filter((key) => content[key])
    .map((key) => ({ key, title: SECTION_TITLES[key], ...content[key]! }));

  const location = joinNonEmpty([basics.location.city, basics.location.region, basics.location.country], ", ");
  const document: ResumeDocument = {
    name: basics.name,
    // The headline matches the job being applied for, not the profile's general one.
    headline: (draft.headline || draft.targetTitle).trim(),
    contact: [basics.email, basics.phone, location, ...basics.links.map((l) => displayUrl(l.url))].filter(Boolean),
    sections,
    pageSize: profile.settings.pageSize,
    template: draft.template,
    // Set by the PDF renderer once it knows how much space the content needs.
    fitLevel: 0,
  };

  return { document, warnings };
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
  /** What the entry shows when the draft has no tailored bullets for it. */
  bullets: string[];
}

/** Every profile item a resume can include, labelled for the web UI's resume editor. */
export function profileItemOptions(profile: Profile): Record<ProfileRefKey, ProfileItemOption[]> {
  const option = (id: string, label: string, detail = "", bullets: string[] = []) => ({ id, label, detail, bullets });
  return {
    experience: profile.experience.map((e) =>
      option(e.id, joinNonEmpty([e.title, e.company], " — "), formatDateRange(e.startDate, e.endDate, e.current), e.achievements),
    ),
    projects: profile.projects.map((p) =>
      option(p.id, joinNonEmpty([p.name, p.role], " — "), formatDateRange(p.startDate, p.endDate), p.highlights),
    ),
    education: profile.education.map((e) =>
      option(
        e.id,
        joinNonEmpty([degreeTitle(e.degree, e.field), e.institution], " — "),
        formatDateRange(e.startDate, e.endDate),
        e.achievements,
      ),
    ),
    volunteer: profile.volunteer.map((v) =>
      option(v.id, joinNonEmpty([v.role, v.organization], " — "), formatDateRange(v.startDate, v.endDate, v.current), volunteerBullets(v)),
    ),
    certifications: profile.certifications.map((c) => option(c.id, joinNonEmpty([c.name, c.issuer], ", "), formatMonth(c.date))),
    awards: profile.awards.map((a) => option(a.id, joinNonEmpty([a.title, a.awarder], ", "), formatMonth(a.date))),
    publications: profile.publications.map((p) => option(p.id, joinNonEmpty([p.name, p.publisher], ", "), formatMonth(p.date))),
    languages: profile.languages.map((l) => option(l.id, l.fluency ? `${l.language} (${l.fluency})` : l.language)),
  };
}

function volunteerBullets(item: Profile["volunteer"][number]): string[] {
  return item.highlights.length ? item.highlights : item.summary ? [item.summary] : [];
}

function entry(e: ResumeEntry): ResumeEntry {
  return {
    title: e.title.trim(),
    subtitle: e.subtitle.trim(),
    meta: e.meta.trim(),
    dates: e.dates,
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
