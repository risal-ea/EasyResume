"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ItemActions, ItemCard } from "@/components/ItemCard";
import { LinesInput } from "@/components/LinesInput";
import { ResumePreview } from "@/components/ResumePreview";
import { Score } from "@/components/Score";
import { TagInput } from "@/components/TagInput";
import { TemplatePicker } from "@/components/TemplatePicker";
import { MAX_PAGES } from "@/core/render/templates";
import { SECTION_TITLES, type ProfileItemOption, type ProfileRefKey } from "@/core/resume/build";
import type { HeaderOverride, ItemOverride, ResumeEdits, SectionKey, SectionTitles, TemplateId } from "@/core/schema";
import { previewResumeAction, saveResumeAction, type EditorPreview } from "../actions";

type EntryKey = "experience" | "projects" | "education" | "volunteer";
type LineKey = Exclude<ProfileRefKey, EntryKey>;
/** `edit` holds the user's rewording of the profile's text for this resume. */
type EntryRef = { profileId: string; bullets?: string[]; edit: ItemOverride };
type LineRef = { profileId: string; edit: ItemOverride };
type SkillGroup = { category: string; items: string[] };
type EntryField = [field: keyof ItemOverride, label: string];

export interface EditorState extends Record<EntryKey, EntryRef[]>, Record<LineKey, LineRef[]> {
  template: TemplateId;
  /** The user's own name and contact details for this resume. */
  header: HeaderOverride;
  headline: string;
  sectionTitles: SectionTitles;
  summary: string;
  skills: SkillGroup[];
  /** Every section key, in the order the resume shows them. */
  sectionOrder: SectionKey[];
}

type Status = { kind: "idle" | "saving" | "saved" | "error"; message?: string };

const ENTRY_KEYS: SectionKey[] = ["experience", "projects", "education", "volunteer"] satisfies EntryKey[];
const isEntryKey = (key: SectionKey): key is EntryKey => ENTRY_KEYS.includes(key);
const REF_KEYS = [
  "experience",
  "projects",
  "education",
  "volunteer",
  "certifications",
  "awards",
  "publications",
  "languages",
] as const satisfies ProfileRefKey[];

/** The text fields shown above each entry's bullets. */
const ENTRY_FIELDS: Record<EntryKey, EntryField[]> = {
  experience: [["title", "Job title"], ["subtitle", "Company"], ["meta", "Location"], ["dates", "Dates"]],
  projects: [["title", "Project"], ["subtitle", "Role"], ["meta", "Link"], ["dates", "Dates"]],
  education: [["title", "Degree"], ["subtitle", "School"], ["meta", "Location"], ["dates", "Dates"], ["grade", "Grade"]],
  volunteer: [["title", "Role"], ["subtitle", "Organization"], ["meta", "Location"], ["dates", "Dates"]],
};

const THIS_RESUME_ONLY = "Edits here change this resume only, not your profile or other resumes.";
const INTROS: Record<SectionKey, string> = {
  summary: "2-4 sentences aimed at this job. Left empty, the summary from your profile is used.",
  skills: "Put the skills the job asks for first.",
  experience: `Filled in from your profile. ${THIS_RESUME_ONLY}`,
  projects: `Filled in from your profile. ${THIS_RESUME_ONLY}`,
  education: `Filled in from your profile. Bullets are optional extras. ${THIS_RESUME_ONLY}`,
  certifications: `Most relevant first. ${THIS_RESUME_ONLY}`,
  awards: `Most relevant first. ${THIS_RESUME_ONLY}`,
  volunteer: `Filled in from your profile. ${THIS_RESUME_ONLY}`,
  publications: `Most relevant first. ${THIS_RESUME_ONLY}`,
  languages: `Spoken languages, shown on one line. ${THIS_RESUME_ONLY}`,
};

const DOWNLOADS = [
  ["pdf", "Download PDF"],
  ["docx", "DOCX"],
  ["md", "Markdown"],
] as const;

interface Props {
  id: string;
  /** "Senior Backend Engineer at Acme" */
  target: string;
  initial: EditorState;
  /** The name and contact details from the profile, shown where the user has not changed them. */
  profileHeader: Required<HeaderOverride>;
  options: Record<ProfileRefKey, ProfileItemOption[]>;
  initialPreview: EditorPreview;
}

export function ResumeEditor({ id, target, initial, profileHeader, options, initialPreview }: Props) {
  const [state, setState] = useState(initial);
  const edits = toEdits(state);
  const editsJson = JSON.stringify(edits);
  const [savedJson, setSavedJson] = useState(() => JSON.stringify(toEdits(initial)));
  const dirty = editsJson !== savedJson;
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const [preview, setPreview] = useState(initialPreview);
  const [previewError, setPreviewError] = useState("");
  // The edits the current preview (or preview error) was made from.
  const [previewedJson, setPreviewedJson] = useState(savedJson);
  const updating = editsJson !== previewedJson;
  const latestRequest = useRef(0);

  // Lay the resume out again shortly after the user stops typing.
  useEffect(() => {
    const request = ++latestRequest.current;
    if (editsJson === previewedJson) return;
    const timer = setTimeout(async () => {
      const result = await previewResumeAction(id, JSON.parse(editsJson));
      if (request !== latestRequest.current) return; // a newer edit is on its way
      if (result.ok) {
        setPreview(result.preview);
        setPreviewError("");
      } else {
        setPreviewError(result.error);
      }
      setPreviewedJson(editsJson);
    }, 400);
    return () => clearTimeout(timer);
  }, [id, editsJson, previewedJson]);

  const tooLong = !updating && preview.pageCount > MAX_PAGES;
  const saving = status.kind === "saving";
  const canSave = dirty && !saving && !tooLong;

  const save = async () => {
    if (!canSave) return;
    setStatus({ kind: "saving" });
    const result = await saveResumeAction(id, edits);
    if (result.ok) {
      setSavedJson(editsJson);
      setStatus({ kind: "saved", message: `Saved at ${new Date().toLocaleTimeString()}. The downloads are up to date.` });
    } else {
      setStatus({ kind: "error", message: result.error });
    }
  };

  // Cmd/Ctrl+S saves; warn before leaving with unsaved changes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        void save();
      }
    };
    const onLeave = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onLeave);
    };
  });

  const update = <K extends keyof EditorState>(key: K, value: EditorState[K]) => {
    setState((s) => ({ ...s, [key]: value }));
    setStatus((s) => (s.kind === "error" ? { kind: "idle" } : s));
  };
  const setHeader = <K extends keyof HeaderOverride>(field: K, value: Required<HeaderOverride>[K]) =>
    update("header", setField(state.header, field, value, profileHeader));
  const headerValue = <K extends keyof HeaderOverride>(field: K) => state.header[field] ?? profileHeader[field];
  const sectionTitle = (key: SectionKey) => state.sectionTitles[key]?.trim() || SECTION_TITLES[key];

  // Sections with nothing to show and nothing in the profile to add are left out.
  const visible = state.sectionOrder.filter(
    (key) => key === "summary" || key === "skills" || state[key].length > 0 || options[key].length > 0,
  );
  const moveSection = (key: SectionKey, step: -1 | 1) => {
    const other = visible[visible.indexOf(key) + step];
    if (!other) return;
    const order = [...state.sectionOrder];
    const [a, b] = [order.indexOf(key), order.indexOf(other)];
    [order[a], order[b]] = [other, key];
    update("sectionOrder", order);
  };

  const sectionBody = (key: SectionKey): ReactNode => {
    if (key === "summary") {
      return (
        <textarea aria-label="Summary" rows={5} value={state.summary} onChange={(e) => update("summary", e.target.value)} />
      );
    }
    if (key === "skills") return <SkillsEditor groups={state.skills} onChange={(skills) => update("skills", skills)} />;
    if (isEntryKey(key)) {
      return <EntryList refs={state[key]} options={options[key]} fields={ENTRY_FIELDS[key]} onChange={(refs) => update(key, refs)} />;
    }
    return <LineList refs={state[key]} options={options[key]} onChange={(refs) => update(key, refs)} />;
  };

  const statusText =
    status.kind === "saving"
      ? "Saving…"
      : status.kind === "error"
        ? status.message
        : dirty
          ? tooLong
            ? `Over the ${MAX_PAGES}-page limit. Remove some content to save.`
            : "Unsaved changes"
          : status.kind === "saved"
            ? status.message
            : "Edit any text, rename section headings or switch templates. The preview updates as you type.";
  const statusClass =
    status.kind === "error" || (dirty && tooLong) ? "status-error" : dirty ? "status-dirty" : status.kind === "saved" ? "status-ok" : "";

  return (
    <>
      <div className="page-header">
        <div>
          <p style={{ margin: "0 0 4px" }}>
            <Link href={`/resumes/${id}`}>← Back to resume</Link>
          </p>
          <h1>Edit resume</h1>
          <p>{target}</p>
          <p className="muted" style={{ margin: 0 }}>
            Edits here change only this resume. Your profile and your other resumes stay as they are.
          </p>
        </div>
      </div>

      <div className="savebar">
        <span className={`status ${statusClass}`} role="status" style={{ whiteSpace: "pre-wrap" }}>
          {statusText}
        </span>
        <div className="row">
          {DOWNLOADS.map(([format, label]) =>
            dirty ? (
              <button key={format} type="button" className="btn" disabled title="Save your changes first">
                {label}
              </button>
            ) : (
              <a key={format} className="btn" href={`/resumes/${id}/download/${format}`}>
                {label}
              </a>
            ),
          )}
          <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={!canSave}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      <div className="editor-layout">
        <div>
          <section className="card">
            <h2>Template</h2>
            <p className="card-intro">Every template is single-column with real text, so ATS software reads them all reliably.</p>
            <TemplatePicker value={state.template} onChange={(template) => update("template", template)} />
          </section>

          <section className="card">
            <h2>Header</h2>
            <p className="card-intro">
              Filled in from your <Link href="/profile">profile</Link>. {THIS_RESUME_ONLY}
            </p>
            <div className="grid">
              <TextField label="Name" value={headerValue("name")} onChange={(v) => setHeader("name", v)} />
              <TextField label="Headline" value={state.headline} onChange={(v) => update("headline", v)} />
            </div>
            <div className="grid">
              <TextField label="Email" value={headerValue("email")} onChange={(v) => setHeader("email", v)} />
              <TextField label="Phone" value={headerValue("phone")} onChange={(v) => setHeader("phone", v)} />
              <TextField label="Location" value={headerValue("location")} onChange={(v) => setHeader("location", v)} />
            </div>
            <LinesInput
              label="Links"
              rows={2}
              value={headerValue("links")}
              onChange={(links) => setHeader("links", links)}
              hint="One per line, as the resume should show them, e.g. linkedin.com/in/jane."
            />
          </section>

          {visible.map((key, i) => (
            <section key={key} className="card">
              <div className="row" style={{ justifyContent: "space-between", flexWrap: "nowrap" }}>
                <input
                  type="text"
                  className="heading-input"
                  aria-label={`Heading for ${SECTION_TITLES[key]}`}
                  title="Click to rename this heading"
                  placeholder={SECTION_TITLES[key]}
                  value={state.sectionTitles[key] ?? SECTION_TITLES[key]}
                  onChange={(e) => update("sectionTitles", setField(state.sectionTitles, key, e.target.value, SECTION_TITLES))}
                />
                <span className="item-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    aria-label={`Move ${sectionTitle(key)} up`}
                    disabled={i === 0}
                    onClick={() => moveSection(key, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    aria-label={`Move ${sectionTitle(key)} down`}
                    disabled={i === visible.length - 1}
                    onClick={() => moveSection(key, 1)}
                  >
                    ↓
                  </button>
                </span>
              </div>
              <p className="card-intro" style={{ marginTop: 4 }}>
                {INTROS[key]}
              </p>
              {sectionBody(key)}
            </section>
          ))}
        </div>

        <aside className="editor-preview">
          <div className="row">
            <span className={`pages ${tooLong ? "pages-over" : ""}`}>
              {updating
                ? "Updating…"
                : `${preview.pageCount} page${preview.pageCount === 1 ? "" : "s"}${tooLong ? `: over the ${MAX_PAGES}-page limit` : ""}`}
            </span>
            <Score coverage={preview.coverage} />
          </div>
          {preview.missingKeywords.length > 0 && (
            <div>
              <span className="muted">Missing keywords: </span>
              {preview.missingKeywords.map((k) => (
                <span key={k} className="chip chip-missing">
                  {k}
                </span>
              ))}
            </div>
          )}
          {previewError && <p className="field-error">{previewError}</p>}
          <ResumePreview html={preview.html} />
          {preview.warnings.length > 0 && (
            <details className="jd">
              <summary>Warnings ({preview.warnings.length})</summary>
              <ul className="issues" style={{ marginTop: 8 }}>
                {preview.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </details>
          )}
        </aside>
      </div>
    </>
  );
}

/** What the server gets: blank bullets and empty skill groups dropped, rewording moved to `overrides`. */
function toEdits(state: EditorState): ResumeEdits {
  const entries = (refs: EntryRef[]) =>
    refs.map(({ profileId, bullets }) => ({ profileId, bullets: bullets?.map((b) => b.trim()).filter(Boolean) }));
  const lines = (refs: LineRef[]) => refs.map(({ profileId }) => ({ profileId }));
  return {
    ...state,
    header: { ...state.header, ...(state.header.links && { links: state.header.links.map((l) => l.trim()).filter(Boolean) }) },
    headline: state.headline.trim(),
    // A blanked-out heading goes back to the standard one.
    sectionTitles: Object.fromEntries(
      Object.entries(state.sectionTitles)
        .map(([key, title]) => [key, title.trim()])
        .filter(([, title]) => title),
    ),
    summary: state.summary.trim(),
    skills: state.skills.map((g) => ({ category: g.category.trim(), items: g.items })).filter((g) => g.items.length > 0),
    experience: entries(state.experience),
    projects: entries(state.projects),
    education: entries(state.education),
    volunteer: entries(state.volunteer),
    certifications: lines(state.certifications),
    awards: lines(state.awards),
    publications: lines(state.publications),
    languages: lines(state.languages),
    // Only items still on the resume keep their rewording.
    overrides: Object.fromEntries(
      REF_KEYS.flatMap((key) => state[key])
        .filter((ref) => Object.keys(ref.edit).length > 0)
        .map((ref) => [ref.profileId, ref.edit]),
    ),
  };
}

/** `edits` with one field set. Text matching the default is not stored, so later profile changes still show. */
function setField<T extends object, K extends keyof T>(edits: T, field: K, value: T[K], defaults: T): T {
  const next = { ...edits, [field]: value };
  if (JSON.stringify(value) === JSON.stringify(defaults[field] ?? "")) delete next[field];
  return next;
}

/** Sets one field of an item's rewording. */
function withEdit<R extends { edit: ItemOverride }>(ref: R, field: keyof ItemOverride, value: string, defaults: ItemOverride): R {
  return { ...ref, edit: setField(ref.edit, field, value, defaults) };
}

function move<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  next.splice(to, 0, ...next.splice(from, 1));
  return next;
}

/** Up/down/remove handlers for item `i` of a list. */
function listActions<T>(list: T[], i: number, onChange: (list: T[]) => void) {
  return {
    onUp: i > 0 ? () => onChange(move(list, i, i - 1)) : undefined,
    onDown: i < list.length - 1 ? () => onChange(move(list, i, i + 1)) : undefined,
    onRemove: () => onChange(list.filter((_, j) => j !== i)),
  };
}

const GONE = "No longer in your profile";

function EntryList({
  refs,
  options,
  fields,
  onChange,
}: {
  refs: EntryRef[];
  options: ProfileItemOption[];
  fields: EntryField[];
  onChange: (refs: EntryRef[]) => void;
}) {
  const set = (i: number, ref: EntryRef) => onChange(refs.map((r, j) => (j === i ? ref : r)));
  return (
    <>
      {refs.length === 0 && <p className="empty">None on this resume.</p>}
      {refs.map((ref, i) => {
        const option = options.find((o) => o.id === ref.profileId);
        const shown = (field: keyof ItemOverride) => ref.edit[field] ?? option?.defaults[field] ?? "";
        return (
          <ItemCard
            key={ref.profileId}
            defaultOpen
            title={option ? [shown("title"), shown("subtitle")].filter(Boolean).join(" — ") : GONE}
            subtitle={option && shown("dates")}
            {...listActions(refs, i, onChange)}
          >
            {option ? (
              <>
                <div className="grid">
                  {fields.map(([field, label]) => (
                    <TextField
                      key={field}
                      label={label}
                      value={shown(field)}
                      onChange={(value) => set(i, withEdit(ref, field, value, option.defaults))}
                    />
                  ))}
                </div>
                <LinesInput
                  label="Bullets"
                  value={ref.bullets ?? option.bullets}
                  onChange={(bullets) => set(i, { ...ref, bullets })}
                  hint="One per line. Start with an action verb and include numbers where you have them."
                />
              </>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                This item was deleted from your profile. Remove it to save the resume.
              </p>
            )}
          </ItemCard>
        );
      })}
      <AddFromProfile
        options={options.filter((o) => !refs.some((r) => r.profileId === o.id))}
        onAdd={(profileId) => onChange([...refs, { profileId, edit: {} }])}
      />
    </>
  );
}

function LineList({ refs, options, onChange }: { refs: LineRef[]; options: ProfileItemOption[]; onChange: (refs: LineRef[]) => void }) {
  return (
    <>
      {refs.length === 0 && <p className="empty">None on this resume.</p>}
      {refs.length > 0 && (
        <ul className="line-list">
          {refs.map((ref, i) => {
            const option = options.find((o) => o.id === ref.profileId);
            return (
              <li key={ref.profileId}>
                {option ? (
                  <input
                    type="text"
                    aria-label={option.label}
                    value={ref.edit.text ?? option.defaults.text ?? ""}
                    onChange={(e) => onChange(refs.map((r, j) => (j === i ? withEdit(r, "text", e.target.value, option.defaults) : r)))}
                  />
                ) : (
                  <span className="item-title">{GONE}</span>
                )}
                <ItemActions {...listActions(refs, i, onChange)} />
              </li>
            );
          })}
        </ul>
      )}
      <AddFromProfile
        options={options.filter((o) => !refs.some((r) => r.profileId === o.id))}
        onAdd={(profileId) => onChange([...refs, { profileId, edit: {} }])}
      />
    </>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function AddFromProfile({ options, onAdd }: { options: ProfileItemOption[]; onAdd: (profileId: string) => void }) {
  if (options.length === 0) return null;
  return (
    <select className="add-from-profile" value="" aria-label="Add from your profile" onChange={(e) => e.target.value && onAdd(e.target.value)}>
      <option value="">+ Add from your profile…</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.detail ? `${o.label} (${o.detail})` : o.label}
        </option>
      ))}
    </select>
  );
}

function SkillsEditor({ groups, onChange }: { groups: SkillGroup[]; onChange: (groups: SkillGroup[]) => void }) {
  const set = (i: number, group: SkillGroup) => onChange(groups.map((g, j) => (j === i ? group : g)));
  return (
    <>
      {groups.map((group, i) => (
        <div key={i} className="skill-group">
          <div className="row" style={{ flexWrap: "nowrap" }}>
            <input
              type="text"
              aria-label="Group name"
              placeholder="Group name, e.g. Languages"
              value={group.category}
              onChange={(e) => set(i, { ...group, category: e.target.value })}
            />
            <ItemActions {...listActions(groups, i, onChange)} />
          </div>
          <TagInput label="Skills" value={group.items} onChange={(items) => set(i, { ...group, items })} placeholder="Type a skill, then Enter" />
        </div>
      ))}
      <button type="button" className="btn btn-small" onClick={() => onChange([...groups, { category: "", items: [] }])}>
        + Add skill group
      </button>
    </>
  );
}
