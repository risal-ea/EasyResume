import { z } from "zod";

// ---------------------------------------------------------------------------
// Profile: everything the user knows about themselves, edited in the web UI.
// Text fields default to "" (not undefined) so forms and renderers stay simple.
// ---------------------------------------------------------------------------

const text = z.string().default("");
const list = z.array(z.string()).default([]);
// "YYYY-MM", or just "YYYY" when only the year is known.
const month = z
  .string()
  .regex(/^(\d{4}(-(0[1-9]|1[0-2]))?)?$/, "Use YYYY-MM or YYYY")
  .default("");
const id = z
  .string()
  .min(1)
  .default(() => crypto.randomUUID());

export const LinkSchema = z.object({ label: text, url: text });

export const BasicsSchema = z.object({
  name: text,
  headline: text,
  email: z.union([z.literal(""), z.email("Enter a valid email")]).default(""),
  phone: text,
  location: z.object({ city: text, region: text, country: text }).prefault({}),
  links: z.array(LinkSchema).default([]),
  summary: text,
});

export const ExperienceSchema = z.object({
  id,
  company: text,
  title: text,
  location: text,
  startDate: month,
  endDate: month,
  current: z.boolean().default(false),
  description: text,
  achievements: list,
  technologies: list,
});

export const EducationSchema = z.object({
  id,
  institution: text,
  degree: text,
  field: text,
  location: text,
  startDate: month,
  endDate: month,
  grade: text,
  courses: list,
  achievements: list,
});

export const SkillGroupSchema = z.object({
  id,
  category: text,
  items: list,
});

export const CertificationSchema = z.object({
  id,
  name: text,
  issuer: text,
  date: month,
  expiryDate: month,
  credentialId: text,
  url: text,
});

export const ProjectSchema = z.object({
  id,
  name: text,
  role: text,
  url: text,
  startDate: month,
  endDate: month,
  description: text,
  highlights: list,
  technologies: list,
});

export const AwardSchema = z.object({
  id,
  title: text,
  awarder: text,
  date: month,
  summary: text,
});

export const LanguageSchema = z.object({
  id,
  language: text,
  fluency: text,
});

export const VolunteerSchema = z.object({
  id,
  organization: text,
  role: text,
  startDate: month,
  endDate: month,
  current: z.boolean().default(false),
  summary: text,
  highlights: list,
});

export const PublicationSchema = z.object({
  id,
  name: text,
  publisher: text,
  date: month,
  url: text,
  summary: text,
});

export const PageSizeSchema = z.enum(["A4", "Letter"]);

export const SettingsSchema = z.object({
  pageSize: PageSizeSchema.default("A4"),
});

export const ProfileSchema = z.object({
  basics: BasicsSchema.prefault({}),
  experience: z.array(ExperienceSchema).default([]),
  education: z.array(EducationSchema).default([]),
  skills: z.array(SkillGroupSchema).default([]),
  certifications: z.array(CertificationSchema).default([]),
  projects: z.array(ProjectSchema).default([]),
  awards: z.array(AwardSchema).default([]),
  languages: z.array(LanguageSchema).default([]),
  volunteer: z.array(VolunteerSchema).default([]),
  publications: z.array(PublicationSchema).default([]),
  notes: text,
  settings: SettingsSchema.prefault({}),
});

export type Profile = z.infer<typeof ProfileSchema>;
export type ProfileInput = z.input<typeof ProfileSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type Education = z.infer<typeof EducationSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Certification = z.infer<typeof CertificationSchema>;
export type PageSize = z.infer<typeof PageSizeSchema>;

export function emptyProfile(): Profile {
  return ProfileSchema.parse({});
}

/**
 * What the AI sends to import_profile after reading an uploaded resume: the
 * profile without ids (the server assigns them) and without settings.
 */
export const ProfileImportSchema = z.object({
  basics: BasicsSchema.prefault({}),
  experience: z.array(ExperienceSchema.omit({ id: true })).default([]),
  education: z.array(EducationSchema.omit({ id: true })).default([]),
  skills: z.array(SkillGroupSchema.omit({ id: true })).default([]),
  certifications: z.array(CertificationSchema.omit({ id: true })).default([]),
  projects: z.array(ProjectSchema.omit({ id: true })).default([]),
  awards: z.array(AwardSchema.omit({ id: true })).default([]),
  languages: z.array(LanguageSchema.omit({ id: true })).default([]),
  volunteer: z.array(VolunteerSchema.omit({ id: true })).default([]),
  publications: z.array(PublicationSchema.omit({ id: true })).default([]),
  notes: text,
});
export type ProfileImport = z.infer<typeof ProfileImportSchema>;

// ---------------------------------------------------------------------------
// Resume draft: what the AI sends to create_resume / update_resume.
// Facts (company, title, dates, school, certificate names) are never sent:
// entries reference profile items by id and the server fills them in.
// ---------------------------------------------------------------------------

export const SECTION_KEYS = [
  "summary",
  "skills",
  "experience",
  "projects",
  "education",
  "certifications",
  "awards",
  "volunteer",
  "publications",
  "languages",
] as const;

export const SectionKeySchema = z.enum(SECTION_KEYS);
export type SectionKey = z.infer<typeof SectionKeySchema>;

const profileId = z.string().min(1).describe("The `id` of the item in the profile (from get_profile).");
const bullets = z
  .array(z.string().min(1))
  .describe(
    "Achievement bullets rewritten for this job: start with a strong action verb, include metrics where the profile supports them, mirror the job description's wording. Plain text, no leading bullet characters.",
  );

const withBullets = z.object({ profileId, bullets: bullets.optional() });
const ref = z.object({ profileId });

export const resumeDraftShape = {
  targetTitle: z
    .string()
    .min(1)
    .describe(
      "The job title as the job description writes it, without location or team suffixes, e.g. 'Senior Backend Engineer'. It becomes the resume headline unless `headline` is set.",
    ),
  company: z.string().optional().describe("The hiring company's name, if known."),
  jobDescription: z.string().min(1).describe("The full job description text, as the user provided it."),
  keywords: z
    .array(z.string().min(1))
    .optional()
    .describe(
      "15-30 important keywords and phrases from the job description (hard skills, tools, certifications, domain terms), exactly as they are written there. Used for the ATS keyword-coverage check.",
    ),
  headline: z
    .string()
    .optional()
    .describe(
      "Headline under the name. Defaults to targetTitle. Set it only to adjust the job description's title to the user's real level or specialty (e.g. 'Backend Engineer | Payments & Distributed Systems').",
    ),
  summary: z
    .string()
    .optional()
    .describe("2-4 sentence professional summary tailored to the job. No first-person pronouns. Omit to use the profile summary."),
  experience: z
    .array(withBullets)
    .optional()
    .describe(
      "Work experience to include, in reverse-chronological order. Company, title, location and dates come from the profile. If bullets are omitted, the profile achievements are used.",
    ),
  projects: z.array(withBullets).optional().describe("Projects to include. Name, role, URL and dates come from the profile."),
  education: z
    .array(withBullets)
    .optional()
    .describe("Education to include. Degree, school, dates and grade come from the profile; bullets are optional extras such as relevant coursework or honors."),
  certifications: z.array(ref).optional().describe("Certifications to include, most relevant first."),
  skills: z
    .array(z.object({ category: z.string().min(1), items: z.array(z.string().min(1)).min(1) }))
    .optional()
    .describe(
      "Skill groups to show, e.g. {category: 'Languages', items: ['TypeScript', 'Go']}. Put the skills the job asks for first. Only list skills the user actually has (from the profile skills, technologies, or what the user told you).",
    ),
  awards: z.array(ref).optional(),
  volunteer: z.array(withBullets).optional(),
  publications: z.array(ref).optional(),
  languages: z.array(ref).optional().describe("Spoken languages to include."),
  sectionOrder: z
    .array(SectionKeySchema)
    .optional()
    .describe("Optional section order. Sections with content that are not listed are appended in the default order."),
};

export const ResumeDraftInputSchema = z.object(resumeDraftShape);
export type ResumeDraftInput = z.infer<typeof ResumeDraftInputSchema>;

export interface ResumeDraft {
  targetTitle: string;
  company: string;
  jobDescription: string;
  keywords: string[];
  headline: string;
  summary: string;
  experience: { profileId: string; bullets?: string[] }[];
  projects: { profileId: string; bullets?: string[] }[];
  education: { profileId: string; bullets?: string[] }[];
  certifications: { profileId: string }[];
  skills: { category: string; items: string[] }[];
  awards: { profileId: string }[];
  volunteer: { profileId: string; bullets?: string[] }[];
  publications: { profileId: string }[];
  languages: { profileId: string }[];
  sectionOrder: SectionKey[];
}

export function normalizeDraft(input: ResumeDraftInput): ResumeDraft {
  return {
    targetTitle: input.targetTitle.trim(),
    company: input.company?.trim() ?? "",
    jobDescription: input.jobDescription,
    keywords: input.keywords ?? [],
    headline: input.headline ?? "",
    summary: input.summary ?? "",
    experience: input.experience ?? [],
    projects: input.projects ?? [],
    education: input.education ?? [],
    certifications: input.certifications ?? [],
    skills: input.skills ?? [],
    awards: input.awards ?? [],
    volunteer: input.volunteer ?? [],
    publications: input.publications ?? [],
    languages: input.languages ?? [],
    sectionOrder: input.sectionOrder ?? [],
  };
}
