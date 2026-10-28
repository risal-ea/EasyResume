"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState, useTransition, type ComponentProps, type ReactNode } from "react";
import { Controller, useFieldArray, useForm, useWatch, type Control, type FieldPath } from "react-hook-form";
import { LinesInput } from "@/components/LinesInput";
import { MonthInput } from "@/components/MonthInput";
import { TagInput } from "@/components/TagInput";
import { exampleLeftovers, exampleProfileForForm } from "@/core/exampleProfile";
import {
  AwardSchema,
  CertificationSchema,
  EducationSchema,
  ExperienceSchema,
  LanguageSchema,
  LinkSchema,
  ProfileSchema,
  ProjectSchema,
  PublicationSchema,
  SkillGroupSchema,
  VolunteerSchema,
  emptyProfile,
  type Profile,
  type ProfileInput,
} from "@/core/schema";
import { resetToNewUserAction, saveProfileAction } from "./actions";

type FormApi = ReturnType<typeof useForm<ProfileInput, unknown, Profile>>;
type Status = { kind: "idle" | "saving" | "saved" | "error" | "cleared" | "reset"; message?: string };

const SECTIONS = [
  ["basics", "Basics"],
  ["experience", "Experience"],
  ["education", "Education"],
  ["skills", "Skills"],
  ["certifications", "Certifications"],
  ["projects", "Projects"],
  ["awards", "Awards"],
  ["languages", "Languages"],
  ["volunteer", "Volunteering"],
  ["publications", "Publications"],
  ["notes", "Notes for the AI"],
  ["settings", "Settings"],
] as const;

export function ProfileForm({ initial, dataFile, isNew }: { initial: Profile; dataFile: string; isNew: boolean }) {
  const form = useForm<ProfileInput, unknown, Profile>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: initial,
  });
  const { isDirty, isSubmitting } = form.formState;
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [everSaved, setEverSaved] = useState(!isNew);
  const [resetting, startReset] = useTransition();

  const save = form.handleSubmit(
    async (values) => {
      setStatus({ kind: "saving" });
      const result = await saveProfileAction(values);
      if (result.ok) {
        // Mark the submitted values as saved without re-mounting the cards being edited.
        form.reset(values, { keepValues: true });
        setEverSaved(true);
        setStatus({ kind: "saved", message: `Saved at ${new Date().toLocaleTimeString()}` });
      } else {
        setStatus({ kind: "error", message: result.error });
      }
    },
    () => setStatus({ kind: "error", message: "Some fields need fixing (marked in red)." }),
  );

  // Empties the form but keeps the page-size setting. Saving makes it permanent; reloading undoes it.
  const clearAll = () => {
    const ok = confirm(
      "Clear every field in your profile?\n\nNothing is saved until you click Save profile, so you can reload the page to undo.",
    );
    if (!ok) return;
    form.reset({ ...emptyProfile(), settings: form.getValues("settings") }, { keepDefaultValues: true });
    setStatus({ kind: "cleared" });
  };

  // Back to what a first-time user sees: everything entered is deleted and the example is shown.
  const startAsNewUser = () => {
    const ok = confirm(
      "Start over as a new user?\n\nThis permanently deletes everything you entered in your profile. It cannot be undone. Your generated resumes are kept.",
    );
    if (!ok) return;
    startReset(async () => {
      await resetToNewUserAction();
      form.reset(exampleProfileForForm());
      setEverSaved(false);
      setStatus({ kind: "reset", message: "Your profile was deleted. This is the example a new user sees." });
    });
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
      if (form.formState.isDirty) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onLeave);
    };
  }, [save, form.formState]);

  const saved = everSaved && !isDirty && !isSubmitting;
  const statusText =
    status.kind === "saving"
      ? "Saving…"
      : status.kind === "error"
        ? status.message
        : isDirty
          ? status.kind === "cleared"
            ? "Form cleared. Save to keep it, or reload the page to undo."
            : "Unsaved changes"
          : status.kind === "reset"
            ? status.message
            : !everSaved
              ? "Example profile, not saved yet"
              : (status.message ?? "All changes saved");
  const statusClass =
    status.kind === "error" ? "status-error" : isDirty ? "status-dirty" : status.kind === "saved" ? "status-ok" : "";

  return (
    <form onSubmit={save} noValidate>
      <div className="page-header">
        <div>
          <h1>Your profile</h1>
          <p>
            Add everything about your career here, even details you would not put on every resume. Your AI assistant
            picks what fits each job. Stored only on this computer in <code>{dataFile}</code>.
          </p>
        </div>
      </div>

      <div className="savebar">
        <span className={`status ${statusClass}`} role="status" style={{ whiteSpace: "pre-wrap" }}>
          {statusText}
        </span>
        <div className="row">
          <button type="button" className="btn" onClick={startAsNewUser} disabled={resetting}>
            Start as new user
          </button>
          <button type="button" className="btn btn-danger" onClick={clearAll}>
            Clear all
          </button>
          <button type="submit" className={`btn ${saved ? "btn-saved" : "btn-primary"}`} disabled={isSubmitting || saved}>
            {isSubmitting ? "Saving…" : saved ? "Saved" : "Save profile"}
          </button>
        </div>
      </div>

      <ExampleNotice control={form.control} />

      <div className="profile-layout">
        <nav className="section-nav" aria-label="Profile sections">
          {SECTIONS.map(([id, label]) => (
            <a key={id} href={`#${id}`}>
              {label}
            </a>
          ))}
        </nav>
        <div>
          <BasicsSection form={form} />
          <ExperienceSection form={form} />
          <EducationSection form={form} />
          <SkillsSection form={form} />
          <CertificationsSection form={form} />
          <ProjectsSection form={form} />
          <AwardsSection form={form} />
          <LanguagesSection form={form} />
          <VolunteerSection form={form} />
          <PublicationsSection form={form} />

          <section id="notes" className="card">
            <h2>Notes for the AI</h2>
            <p className="card-intro">
              Anything else that helps: career goals, roles you want or want to avoid, context behind your achievements,
              visa or relocation preferences, things you are proud of. The AI reads this but does not copy it into
              resumes.
            </p>
            <textarea rows={6} {...form.register("notes")} aria-label="Notes for the AI" />
          </section>

          <section id="settings" className="card">
            <h2>Settings</h2>
            <div className="grid">
              <label className="field">
                <span className="field-label">Resume page size</span>
                <select {...form.register("settings.pageSize")}>
                  <option value="A4">A4 (most countries)</option>
                  <option value="Letter">US Letter (US and Canada)</option>
                </select>
              </label>
            </div>
          </section>
        </div>
      </div>
    </form>
  );
}

/** Shown while any example entry is still unchanged. */
function ExampleNotice({ control }: { control: Control<ProfileInput, unknown, Profile> }) {
  const values = useWatch({ control }) as ProfileInput;
  const left = exampleLeftovers(values);
  if (left.length === 0) return null;
  const shown = left.slice(0, 5).join(", ");
  return (
    <div className="notice" role="note">
      <strong>This is example data</strong> showing how a complete profile looks. Replace it with your own details, or
      use <strong>Clear all</strong> to start with an empty form. Example entries you leave unchanged are hidden from
      your AI assistant and never appear on a resume.
      <div style={{ marginTop: 6 }}>
        Still example: {shown}
        {left.length > 5 ? ` and ${left.length - 5} more` : ""}.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function BasicsSection({ form }: { form: FormApi }) {
  const { register, formState } = form;
  const links = useFieldArray({ control: form.control, name: "basics.links" });
  return (
    <section id="basics" className="card">
      <h2>Basics</h2>
      <p className="card-intro">Contact details appear at the top of every resume.</p>
      <div className="grid">
        <Text label="Full name" autoComplete="name" {...register("basics.name")} />
        <Text
          label="Headline"
          placeholder="e.g. Senior Backend Engineer"
          hint="Your general title. Each resume uses the title from the job description instead."
          {...register("basics.headline")}
        />
        <Text
          label="Email"
          type="email"
          autoComplete="email"
          error={formState.errors.basics?.email?.message}
          {...register("basics.email")}
        />
        <Text label="Phone" type="tel" autoComplete="tel" {...register("basics.phone")} />
      </div>
      <div className="grid">
        <Text label="City" {...register("basics.location.city")} />
        <Text label="State / region" {...register("basics.location.region")} />
        <Text label="Country" {...register("basics.location.country")} />
      </div>

      <div className="field">
        <span className="field-label">Links</span>
        {links.fields.map((field, i) => (
          <div className="row" key={field.id}>
            <input type="text" placeholder="Label (e.g. LinkedIn)" style={{ flex: "1 1 140px" }} {...register(`basics.links.${i}.label`)} />
            <input type="url" placeholder="https://…" style={{ flex: "3 1 240px" }} {...register(`basics.links.${i}.url`)} />
            <button type="button" className="btn btn-ghost btn-small" onClick={() => links.remove(i)}>
              Remove
            </button>
          </div>
        ))}
        <div>
          <button type="button" className="btn btn-small" onClick={() => links.append(LinkSchema.parse({}))}>
            + Add link
          </button>
        </div>
      </div>

      <TextArea
        label="Professional summary"
        hint="A general summary. The AI rewrites it for each job."
        rows={4}
        {...register("basics.summary")}
      />
    </section>
  );
}

function ExperienceSection({ form }: { form: FormApi }) {
  const { register, control } = form;
  const array = useFieldArray({ control, name: "experience", keyName: "key" });
  const values = form.watch("experience") ?? [];
  return (
    <ListSection
      id="experience"
      title="Experience"
      intro="Every job, most recent first. List all your achievements: the AI chooses and rewrites the relevant ones."
      addLabel="Add experience"
      array={array}
      newItem={() => ExperienceSchema.parse({})}
      itemTitle={(i) => values[i]?.title}
      itemSubtitle={(i) => values[i]?.company}
    >
      {(i) => (
        <>
          <div className="grid">
            <Text label="Job title" {...register(`experience.${i}.title`)} />
            <Text label="Company" {...register(`experience.${i}.company`)} />
            <Text label="Location" placeholder="City, Country or Remote" {...register(`experience.${i}.location`)} />
          </div>
          <div className="grid">
            <Month control={form.control} name={`experience.${i}.startDate`} label="Start" />
            <Month control={form.control} name={`experience.${i}.endDate`} label="End" disabled={values[i]?.current} />
            <label className="checkbox" style={{ alignSelf: "end", paddingBottom: 8 }}>
              <input type="checkbox" {...register(`experience.${i}.current`)} /> I currently work here
            </label>
          </div>
          <TextArea
            label="About the role"
            hint="Team, product, scope. Context for the AI."
            rows={2}
            {...register(`experience.${i}.description`)}
          />
          <Lines
            control={control}
            name={`experience.${i}.achievements`}
            label="Achievements and responsibilities"
            placeholder={"Reduced API latency from 850 ms to 190 ms by adding Redis caching\nLed migration of 14 services to Kubernetes"}
            hint="One per line. Include numbers wherever you have them."
          />
          <Tags control={control} name={`experience.${i}.technologies`} label="Technologies and tools" placeholder="Go, Kafka, AWS…" />
        </>
      )}
    </ListSection>
  );
}

function EducationSection({ form }: { form: FormApi }) {
  const { register, control } = form;
  const array = useFieldArray({ control, name: "education", keyName: "key" });
  const values = form.watch("education") ?? [];
  return (
    <ListSection
      id="education"
      title="Education"
      addLabel="Add education"
      array={array}
      newItem={() => EducationSchema.parse({})}
      itemTitle={(i) => values[i]?.degree || values[i]?.field}
      itemSubtitle={(i) => values[i]?.institution}
    >
      {(i) => (
        <>
          <div className="grid">
            <Text label="School / university" {...register(`education.${i}.institution`)} />
            <Text label="Degree" placeholder="e.g. Bachelor of Science" {...register(`education.${i}.degree`)} />
            <Text label="Field of study" {...register(`education.${i}.field`)} />
          </div>
          <div className="grid">
            <Text label="Location" {...register(`education.${i}.location`)} />
            <Month control={form.control} name={`education.${i}.startDate`} label="Start" />
            <Month control={form.control} name={`education.${i}.endDate`} label="End (or expected)" />
            <Text label="Grade" placeholder="e.g. GPA 3.7/4.0" {...register(`education.${i}.grade`)} />
          </div>
          <Tags control={control} name={`education.${i}.courses`} label="Relevant courses" />
          <Lines control={control} name={`education.${i}.achievements`} label="Honors and activities" rows={2} />
        </>
      )}
    </ListSection>
  );
}

function SkillsSection({ form }: { form: FormApi }) {
  const { register, control } = form;
  const array = useFieldArray({ control, name: "skills", keyName: "key" });
  const values = form.watch("skills") ?? [];
  return (
    <ListSection
      id="skills"
      title="Skills"
      intro="Group your skills, e.g. Languages, Frameworks, Cloud, Tools, Soft skills. The AI only lists skills found in your profile."
      addLabel="Add skill group"
      array={array}
      newItem={() => SkillGroupSchema.parse({})}
      itemTitle={(i) => values[i]?.category}
      itemSubtitle={(i) => values[i]?.items?.join(", ")}
    >
      {(i) => (
        <>
          <Text label="Category" placeholder="e.g. Languages" {...register(`skills.${i}.category`)} />
          <Tags control={control} name={`skills.${i}.items`} label="Skills" placeholder="Type a skill and press Enter" />
        </>
      )}
    </ListSection>
  );
}

function CertificationsSection({ form }: { form: FormApi }) {
  const { register } = form;
  const array = useFieldArray({ control: form.control, name: "certifications", keyName: "key" });
  const values = form.watch("certifications") ?? [];
  return (
    <ListSection
      id="certifications"
      title="Certifications"
      addLabel="Add certification"
      array={array}
      newItem={() => CertificationSchema.parse({})}
      itemTitle={(i) => values[i]?.name}
      itemSubtitle={(i) => values[i]?.issuer}
    >
      {(i) => (
        <>
          <div className="grid">
            <Text label="Name" {...register(`certifications.${i}.name`)} />
            <Text label="Issuer" {...register(`certifications.${i}.issuer`)} />
          </div>
          <div className="grid">
            <Month control={form.control} name={`certifications.${i}.date`} label="Issued" />
            <Month control={form.control} name={`certifications.${i}.expiryDate`} label="Expires" />
            <Text label="Credential ID" {...register(`certifications.${i}.credentialId`)} />
            <Text label="Verification URL" type="url" {...register(`certifications.${i}.url`)} />
          </div>
        </>
      )}
    </ListSection>
  );
}

function ProjectsSection({ form }: { form: FormApi }) {
  const { register, control } = form;
  const array = useFieldArray({ control, name: "projects", keyName: "key" });
  const values = form.watch("projects") ?? [];
  return (
    <ListSection
      id="projects"
      title="Projects"
      intro="Side projects, open source, freelance or academic work."
      addLabel="Add project"
      array={array}
      newItem={() => ProjectSchema.parse({})}
      itemTitle={(i) => values[i]?.name}
      itemSubtitle={(i) => values[i]?.role}
    >
      {(i) => (
        <>
          <div className="grid">
            <Text label="Name" {...register(`projects.${i}.name`)} />
            <Text label="Your role" {...register(`projects.${i}.role`)} />
            <Text label="URL" type="url" {...register(`projects.${i}.url`)} />
          </div>
          <div className="grid">
            <Month control={form.control} name={`projects.${i}.startDate`} label="Start" />
            <Month control={form.control} name={`projects.${i}.endDate`} label="End" />
          </div>
          <TextArea label="Description" rows={2} {...register(`projects.${i}.description`)} />
          <Lines control={control} name={`projects.${i}.highlights`} label="Highlights" rows={3} />
          <Tags control={control} name={`projects.${i}.technologies`} label="Technologies" />
        </>
      )}
    </ListSection>
  );
}

function AwardsSection({ form }: { form: FormApi }) {
  const { register } = form;
  const array = useFieldArray({ control: form.control, name: "awards", keyName: "key" });
  const values = form.watch("awards") ?? [];
  return (
    <ListSection
      id="awards"
      title="Awards"
      addLabel="Add award"
      array={array}
      newItem={() => AwardSchema.parse({})}
      itemTitle={(i) => values[i]?.title}
      itemSubtitle={(i) => values[i]?.awarder}
    >
      {(i) => (
        <>
          <div className="grid">
            <Text label="Title" {...register(`awards.${i}.title`)} />
            <Text label="Awarded by" {...register(`awards.${i}.awarder`)} />
            <Month control={form.control} name={`awards.${i}.date`} label="Date" />
          </div>
          <TextArea label="Details" rows={2} {...register(`awards.${i}.summary`)} />
        </>
      )}
    </ListSection>
  );
}

function LanguagesSection({ form }: { form: FormApi }) {
  const { register } = form;
  const array = useFieldArray({ control: form.control, name: "languages", keyName: "key" });
  const values = form.watch("languages") ?? [];
  return (
    <ListSection
      id="languages"
      title="Languages"
      addLabel="Add language"
      array={array}
      newItem={() => LanguageSchema.parse({})}
      itemTitle={(i) => values[i]?.language}
      itemSubtitle={(i) => values[i]?.fluency}
    >
      {(i) => (
        <div className="grid">
          <Text label="Language" {...register(`languages.${i}.language`)} />
          <Text label="Fluency" list="fluency-levels" placeholder="e.g. Native, Fluent" {...register(`languages.${i}.fluency`)} />
          <datalist id="fluency-levels">
            {["Native", "Fluent", "Professional", "Conversational", "Basic"].map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        </div>
      )}
    </ListSection>
  );
}

function VolunteerSection({ form }: { form: FormApi }) {
  const { register, control } = form;
  const array = useFieldArray({ control, name: "volunteer", keyName: "key" });
  const values = form.watch("volunteer") ?? [];
  return (
    <ListSection
      id="volunteer"
      title="Volunteering"
      addLabel="Add volunteering"
      array={array}
      newItem={() => VolunteerSchema.parse({})}
      itemTitle={(i) => values[i]?.role}
      itemSubtitle={(i) => values[i]?.organization}
    >
      {(i) => (
        <>
          <div className="grid">
            <Text label="Role" {...register(`volunteer.${i}.role`)} />
            <Text label="Organization" {...register(`volunteer.${i}.organization`)} />
          </div>
          <div className="grid">
            <Month control={form.control} name={`volunteer.${i}.startDate`} label="Start" />
            <Month control={form.control} name={`volunteer.${i}.endDate`} label="End" disabled={values[i]?.current} />
            <label className="checkbox" style={{ alignSelf: "end", paddingBottom: 8 }}>
              <input type="checkbox" {...register(`volunteer.${i}.current`)} /> Ongoing
            </label>
          </div>
          <TextArea label="Summary" rows={2} {...register(`volunteer.${i}.summary`)} />
          <Lines control={control} name={`volunteer.${i}.highlights`} label="Highlights" rows={2} />
        </>
      )}
    </ListSection>
  );
}

function PublicationsSection({ form }: { form: FormApi }) {
  const { register } = form;
  const array = useFieldArray({ control: form.control, name: "publications", keyName: "key" });
  const values = form.watch("publications") ?? [];
  return (
    <ListSection
      id="publications"
      title="Publications"
      addLabel="Add publication"
      array={array}
      newItem={() => PublicationSchema.parse({})}
      itemTitle={(i) => values[i]?.name}
      itemSubtitle={(i) => values[i]?.publisher}
    >
      {(i) => (
        <>
          <div className="grid">
            <Text label="Title" {...register(`publications.${i}.name`)} />
            <Text label="Publisher / venue" {...register(`publications.${i}.publisher`)} />
            <Month control={form.control} name={`publications.${i}.date`} label="Date" />
            <Text label="URL" type="url" {...register(`publications.${i}.url`)} />
          </div>
          <TextArea label="Summary" rows={2} {...register(`publications.${i}.summary`)} />
        </>
      )}
    </ListSection>
  );
}

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

interface ArrayApi {
  fields: { key: string }[];
  append: (value: never) => void;
  remove: (index: number) => void;
  move: (from: number, to: number) => void;
}

function ListSection({
  id,
  title,
  intro,
  addLabel,
  array,
  newItem,
  itemTitle,
  itemSubtitle,
  children,
}: {
  id: string;
  title: string;
  intro?: string;
  addLabel: string;
  array: ArrayApi;
  newItem: () => unknown;
  itemTitle: (index: number) => string | undefined;
  itemSubtitle: (index: number) => string | undefined;
  children: (index: number) => ReactNode;
}) {
  // Saved items start collapsed; an item the user just added starts open.
  const justAdded = useRef(false);
  useEffect(() => {
    justAdded.current = false;
  });
  const count = array.fields.length;

  return (
    <section id={id} className="card">
      <h2>{title}</h2>
      {intro && <p className="card-intro">{intro}</p>}
      {!intro && <div style={{ height: 12 }} />}
      {count === 0 && <p className="empty">Nothing added yet.</p>}
      {array.fields.map((field, i) => (
        <ItemCard
          key={field.key}
          defaultOpen={justAdded.current && i === count - 1}
          title={itemTitle(i)}
          subtitle={itemSubtitle(i)}
          onUp={i > 0 ? () => array.move(i, i - 1) : undefined}
          onDown={i < count - 1 ? () => array.move(i, i + 1) : undefined}
          onRemove={() => array.remove(i)}
        >
          {children(i)}
        </ItemCard>
      ))}
      <button
        type="button"
        className="btn btn-small"
        onClick={() => {
          justAdded.current = true;
          array.append(newItem() as never);
        }}
      >
        + {addLabel}
      </button>
    </section>
  );
}

function ItemCard({
  defaultOpen,
  title,
  subtitle,
  onUp,
  onDown,
  onRemove,
  children,
}: {
  defaultOpen: boolean;
  title?: string;
  subtitle?: string;
  onUp?: () => void;
  onDown?: () => void;
  onRemove: () => void;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  // Buttons live inside <summary>; stop them from toggling the card.
  const action = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    fn();
  };
  return (
    <details className="item" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>
        <span className="item-title">
          {title || "Untitled"}
          {subtitle && <span className="muted"> · {subtitle}</span>}
        </span>
        <span className="item-actions">
          <button type="button" className="btn btn-ghost btn-small" aria-label="Move up" disabled={!onUp} onClick={action(() => onUp?.())}>
            ↑
          </button>
          <button type="button" className="btn btn-ghost btn-small" aria-label="Move down" disabled={!onDown} onClick={action(() => onDown?.())}>
            ↓
          </button>
          <button type="button" className="btn btn-ghost btn-small btn-danger" onClick={action(onRemove)}>
            Remove
          </button>
        </span>
      </summary>
      <div className="item-body">{children}</div>
    </details>
  );
}

function Text({ label, hint, error, ...input }: ComponentProps<"input"> & { label: string; hint?: string; error?: string }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input type="text" aria-invalid={error ? true : undefined} {...input} />
      {hint && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

function TextArea({ label, hint, ...textarea }: ComponentProps<"textarea"> & { label: string; hint?: string }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <textarea {...textarea} />
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

type ListPath = FieldPath<ProfileInput>;

function Lines(props: { control: Control<ProfileInput, unknown, Profile>; name: ListPath; label: string; placeholder?: string; hint?: string; rows?: number }) {
  const { control, name, ...rest } = props;
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <LinesInput {...rest} value={(field.value as string[] | undefined) ?? []} onChange={field.onChange} />
      )}
    />
  );
}

function Month(props: { control: Control<ProfileInput, unknown, Profile>; name: ListPath; label: string; disabled?: boolean }) {
  const { control, name, ...rest } = props;
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => <MonthInput {...rest} value={(field.value as string | undefined) ?? ""} onChange={field.onChange} />}
    />
  );
}

function Tags(props: { control: Control<ProfileInput, unknown, Profile>; name: ListPath; label: string; placeholder?: string; hint?: string }) {
  const { control, name, ...rest } = props;
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <TagInput {...rest} value={(field.value as string[] | undefined) ?? []} onChange={field.onChange} />
      )}
    />
  );
}
