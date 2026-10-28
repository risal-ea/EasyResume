// The example profile shown to new users, plus helpers that keep any part the
// user never changed out of resumes. Example items are recognised by their
// `example-` id *and* unchanged content: once edited, an item is the user's.
import { ProfileSchema, type Profile, type ProfileInput } from "./schema";

export const EXAMPLE_PROFILE: Profile = ProfileSchema.parse({
  basics: {
    name: "Jordan Lee",
    headline: "Senior Product Manager",
    email: "jordan.lee@example.com",
    phone: "+1 555 0100",
    location: { city: "Seattle", region: "WA", country: "USA" },
    links: [{ label: "LinkedIn", url: "https://www.linkedin.com/in/jordan-lee-example" }],
    summary:
      "Product manager with 8 years of experience shipping B2B SaaS products, from discovery to launch and growth.",
  },
  experience: [
    {
      id: "example-exp-1",
      title: "Senior Product Manager",
      company: "Brightlane Software",
      location: "Seattle, WA",
      startDate: "2021-04",
      current: true,
      description: "Owns the billing and subscriptions product area for a 40,000-customer SaaS platform.",
      achievements: [
        "Launched usage-based pricing, growing expansion revenue by 22% in the first year",
        "Cut checkout drop-off from 18% to 9% by redesigning the upgrade flow with UX and engineering",
        "Led a team of 7 engineers and 2 designers using two-week discovery and delivery cycles",
        "Defined product OKRs and quarterly roadmap with sales, finance and customer success",
      ],
      technologies: ["Jira", "Amplitude", "SQL", "Figma"],
    },
    {
      id: "example-exp-2",
      title: "Product Manager",
      company: "Northfield Analytics",
      location: "Remote",
      startDate: "2017-06",
      endDate: "2021-03",
      achievements: [
        "Shipped a self-serve reporting dashboard adopted by 65% of active accounts within 6 months",
        "Ran 30+ customer interviews per quarter to prioritise the roadmap",
        "Reduced support tickets by 35% by adding in-app onboarding guides",
      ],
      technologies: ["Mixpanel", "Looker", "Confluence"],
    },
  ],
  education: [
    {
      id: "example-edu-1",
      institution: "University of Washington",
      degree: "Bachelor of Science",
      field: "Information Systems",
      location: "Seattle, WA",
      startDate: "2011-09",
      endDate: "2015-06",
      grade: "GPA 3.6/4.0",
    },
  ],
  skills: [
    { id: "example-skill-1", category: "Product", items: ["Product strategy", "Roadmapping", "User research", "A/B testing", "Pricing"] },
    { id: "example-skill-2", category: "Data", items: ["SQL", "Amplitude", "Looker", "Mixpanel"] },
    { id: "example-skill-3", category: "Tools", items: ["Jira", "Figma", "Confluence"] },
  ],
  certifications: [
    {
      id: "example-cert-1",
      name: "Certified Scrum Product Owner (CSPO)",
      issuer: "Scrum Alliance",
      date: "2019-02",
    },
  ],
  projects: [
    {
      id: "example-proj-1",
      name: "PM Interview Prep Guide",
      role: "Author",
      url: "https://example.com/pm-guide",
      startDate: "2022-01",
      description: "Free guide for aspiring product managers.",
      highlights: ["Read by 12,000+ people; featured in two product newsletters"],
    },
  ],
  languages: [
    { id: "example-lang-1", language: "English", fluency: "Native" },
    { id: "example-lang-2", language: "Korean", fluency: "Conversational" },
  ],
  notes: "Looking for senior or group PM roles in B2B SaaS. Prefers hybrid or remote.",
});

/** What a new user sees: the example with the default settings. */
export function exampleProfileForForm(): Profile {
  return structuredClone({ ...EXAMPLE_PROFILE, settings: ProfileSchema.parse({}).settings });
}

const LIST_KEYS = [
  "experience",
  "education",
  "skills",
  "certifications",
  "projects",
  "awards",
  "languages",
  "volunteer",
  "publications",
] as const;

const BASIC_FIELDS = ["name", "headline", "email", "phone", "summary"] as const;

/** Human-readable list of the example parts the user has not changed yet. */
export function exampleLeftovers(profile: ProfileInput): string[] {
  const left: string[] = [];
  const basics = profile.basics ?? {};
  if (BASIC_FIELDS.some((f) => basics[f] && basics[f] === EXAMPLE_PROFILE.basics[f])) left.push("contact details");
  for (const key of LIST_KEYS) {
    for (const item of (profile[key] ?? []) as { id?: string }[]) {
      if (isUntouchedExample(key, item)) left.push(itemLabel(item));
    }
  }
  if (profile.notes && profile.notes === EXAMPLE_PROFILE.notes) left.push("notes");
  return left;
}

/** The profile as the AI should see it: unchanged example data removed. */
export function withoutExampleData(profile: Profile): { profile: Profile; removed: number } {
  let removed = 0;
  const copy = structuredClone(profile);
  const ex = EXAMPLE_PROFILE.basics;

  for (const f of BASIC_FIELDS) {
    if (copy.basics[f] && copy.basics[f] === ex[f]) {
      copy.basics[f] = "";
      removed++;
    }
  }
  if (deepEqual(copy.basics.location, ex.location)) {
    copy.basics.location = { city: "", region: "", country: "" };
    removed++;
  }
  copy.basics.links = copy.basics.links.filter((link) => {
    const keep = !ex.links.some((e) => deepEqual(e, link));
    if (!keep) removed++;
    return keep;
  });
  for (const key of LIST_KEYS) {
    const list = copy[key] as { id: string }[];
    const kept = list.filter((item) => !isUntouchedExample(key, item));
    removed += list.length - kept.length;
    (copy as Record<string, unknown>)[key] = kept;
  }
  if (copy.notes && copy.notes === EXAMPLE_PROFILE.notes) {
    copy.notes = "";
    removed++;
  }
  return { profile: copy, removed };
}

function isUntouchedExample(key: (typeof LIST_KEYS)[number], item: { id?: string }): boolean {
  if (!item.id?.startsWith("example-")) return false;
  const original = (EXAMPLE_PROFILE[key] as { id: string }[]).find((e) => e.id === item.id);
  return original !== undefined && deepEqual(normalize(item), normalize(original));
}

function itemLabel(item: Record<string, unknown>): string {
  const pick = (k: string) => (typeof item[k] === "string" ? (item[k] as string) : "");
  const main = pick("title") || pick("name") || pick("degree") || pick("category") || pick("language");
  const where = pick("company") || pick("institution") || pick("issuer");
  return where ? `${main} (${where})` : main;
}

/** Form values can carry blank lines in lists; ignore them when comparing. */
function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.filter((v) => v !== "").map(normalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalize(v)]));
  }
  return value;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || !a || !b) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  return (
    ka.length === kb.length &&
    ka.every((k) => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
  );
}
