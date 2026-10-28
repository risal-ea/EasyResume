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
import type { ResumeEdits, SectionKey, TemplateId } from "@/core/schema";
import { previewResumeAction, saveResumeAction, type EditorPreview } from "../actions";

type EntryKey = "experience" | "projects" | "education" | "volunteer";
type LineKey = Exclude<ProfileRefKey, EntryKey>;
type EntryRef = { profileId: string; bullets?: string[] };
type LineRef = { profileId: string };
type SkillGroup = { category: string; items: string[] };

export interface EditorState extends Record<EntryKey, EntryRef[]>, Record<LineKey, LineRef[]> {
  template: TemplateId;
  headline: string;
  summary: string;
  skills: SkillGroup[];
  /** Every section key, in the order the resume shows them. */
  sectionOrder: SectionKey[];
}

type Status = { kind: "idle" | "saving" | "saved" | "error"; message?: string };

const ENTRY_KEYS: SectionKey[] = ["experience", "projects", "education", "volunteer"] satisfies EntryKey[];
const isEntryKey = (key: SectionKey): key is EntryKey => ENTRY_KEYS.includes(key);

const INTROS: Record<SectionKey, string> = {
  summary: "2-4 sentences aimed at this job. Left empty, the summary from your profile is used.",
  skills: "Put the skills the job asks for first.",
  experience: "Job titles, employers and dates come from your profile. Edit the bullets here.",
  projects: "Names, roles and dates come from your profile. Edit the bullets here.",
  education: "Degrees, schools, dates and grades come from your profile. Bullets are optional extras.",
  certifications: "Most relevant first.",
  awards: "Most relevant first.",
  volunteer: "Roles, organizations and dates come from your profile. Edit the bullets here.",
  publications: "Most relevant first.",
  languages: "Spoken languages, shown on one line.",
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
  options: Record<ProfileRefKey, ProfileItemOption[]>;
  initialPreview: EditorPreview;
}

export function ResumeEditor({ id, target, initial, options, initialPreview }: Props) {
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
    if (isEntryKey(key)) return <EntryList refs={state[key]} options={options[key]} onChange={(refs) => update(key, refs)} />;
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
            : "Edit the content or switch templates. The preview updates as you type.";
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
            <h2>Headline</h2>
            <p className="card-intro">
              Shown under your name. Your name and contact details come from your <Link href="/profile">profile</Link>.
            </p>
            <input type="text" aria-label="Headline" value={state.headline} onChange={(e) => update("headline", e.target.value)} />
          </section>

          {visible.map((key, i) => (
            <section key={key} className="card">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <h2>{SECTION_TITLES[key]}</h2>
                <span className="item-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    aria-label={`Move ${SECTION_TITLES[key]} up`}
                    disabled={i === 0}
                    onClick={() => moveSection(key, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    aria-label={`Move ${SECTION_TITLES[key]} down`}
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

/** What the server gets: blank bullets and empty skill groups dropped. */
function toEdits(state: EditorState): ResumeEdits {
  const entries = (refs: EntryRef[]) =>
    refs.map(({ profileId, bullets }) => ({ profileId, bullets: bullets?.map((b) => b.trim()).filter(Boolean) }));
  return {
    ...state,
    headline: state.headline.trim(),
    summary: state.summary.trim(),
    skills: state.skills.map((g) => ({ category: g.category.trim(), items: g.items })).filter((g) => g.items.length > 0),
    experience: entries(state.experience),
    projects: entries(state.projects),
    education: entries(state.education),
    volunteer: entries(state.volunteer),
  };
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

function EntryList({ refs, options, onChange }: { refs: EntryRef[]; options: ProfileItemOption[]; onChange: (refs: EntryRef[]) => void }) {
  return (
    <>
      {refs.length === 0 && <p className="empty">None on this resume.</p>}
      {refs.map((ref, i) => {
        const option = options.find((o) => o.id === ref.profileId);
        return (
          <ItemCard key={ref.profileId} defaultOpen title={option?.label ?? GONE} subtitle={option?.detail} {...listActions(refs, i, onChange)}>
            {option ? (
              <LinesInput
                label="Bullets"
                value={ref.bullets ?? option.bullets}
                onChange={(bullets) => onChange(refs.map((r, j) => (j === i ? { ...r, bullets } : r)))}
                hint="One per line. Start with an action verb and include numbers where you have them."
              />
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
        onAdd={(profileId) => onChange([...refs, { profileId }])}
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
                <span className="item-title">
                  {option?.label ?? GONE}
                  {option?.detail && <span className="muted"> · {option.detail}</span>}
                </span>
                <ItemActions {...listActions(refs, i, onChange)} />
              </li>
            );
          })}
        </ul>
      )}
      <AddFromProfile
        options={options.filter((o) => !refs.some((r) => r.profileId === o.id))}
        onAdd={(profileId) => onChange([...refs, { profileId }])}
      />
    </>
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
