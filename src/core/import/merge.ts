import { withoutExampleData } from "../exampleProfile";
import { displayUrl } from "../render/format";
import type { Profile } from "../schema";

/**
 * Adds imported data to an existing profile without overwriting anything the
 * user already entered: empty fields are filled, new items are appended and
 * items that already exist (same company and title, same school and degree, …)
 * are skipped. Skill groups with the same category are combined.
 *
 * Unchanged example data is not the user's: it is dropped first, so an import
 * replaces the example instead of being blocked by it.
 */
export function mergeImported(base: Profile, imported: Profile): Profile {
  const merged = withoutExampleData(base).profile;
  const b = merged.basics;
  const i = imported.basics;

  for (const field of ["name", "headline", "email", "phone", "summary"] as const) {
    if (!b[field]) b[field] = i[field];
  }
  for (const field of ["city", "region", "country"] as const) {
    if (!b.location[field]) b.location[field] = i.location[field];
  }
  const urls = new Set(b.links.map((l) => key(displayUrl(l.url))));
  b.links.push(...i.links.filter((l) => l.url && !urls.has(key(displayUrl(l.url)))));

  appendNew(merged.experience, imported.experience, (e) => key(e.company, e.title));
  appendNew(merged.education, imported.education, (e) => key(e.institution, e.degree, e.field));
  appendNew(merged.certifications, imported.certifications, (c) => key(c.name));
  appendNew(merged.projects, imported.projects, (p) => key(p.name));
  appendNew(merged.awards, imported.awards, (a) => key(a.title));
  appendNew(merged.languages, imported.languages, (l) => key(l.language));
  appendNew(merged.volunteer, imported.volunteer, (v) => key(v.organization, v.role));
  appendNew(merged.publications, imported.publications, (p) => key(p.name));

  for (const group of imported.skills) {
    const existing = merged.skills.find((g) => key(g.category) === key(group.category));
    if (!existing) {
      merged.skills.push(group);
      continue;
    }
    const have = new Set(existing.items.map((s) => key(s)));
    existing.items.push(...group.items.filter((s) => !have.has(key(s))));
  }

  if (imported.notes && !merged.notes.includes(imported.notes)) {
    merged.notes = merged.notes ? `${merged.notes}\n\n${imported.notes}` : imported.notes;
  }
  return merged;
}

function appendNew<T>(target: T[], incoming: T[], identity: (item: T) => string): void {
  const seen = new Set(target.map(identity));
  for (const item of incoming) {
    const id = identity(item);
    if (!seen.has(id)) {
      target.push(item);
      seen.add(id);
    }
  }
}

function key(...parts: string[]): string {
  return parts.map((p) => p.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "")).join("|");
}
