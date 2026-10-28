"use client";

import { resumeStyle, TEMPLATES } from "@/core/render/templates";
import type { TemplateId } from "@/core/schema";

interface Props {
  value: TemplateId;
  onChange: (template: TemplateId) => void;
  disabled?: boolean;
}

export function TemplatePicker({ value, onChange, disabled }: Props) {
  return (
    <div className="template-picker" role="radiogroup" aria-label="Template">
      {TEMPLATES.map((t) => (
        <label key={t.id} className="template-option">
          <input
            type="radio"
            name="template"
            value={t.id}
            checked={value === t.id}
            disabled={disabled}
            onChange={() => onChange(t.id)}
          />
          <Thumbnail template={t.id} />
          <strong style={{ fontFamily: resumeStyle({ template: t.id, fitLevel: 0 }).serif ? "Georgia, serif" : undefined }}>
            {t.name}
          </strong>
          <span className="muted">{t.description}</span>
        </label>
      ))}
    </div>
  );
}

/** A miniature page drawn from the template's own colours and layout. */
function Thumbnail({ template }: { template: TemplateId }) {
  const style = resumeStyle({ template, fitLevel: 0 });
  const header = { alignSelf: style.centerHeader ? "center" : "flex-start" } as const;
  const entry = (
    <span className="thumb-row">
      <span className="bar" style={{ width: "55%", background: "#888" }} />
      {style.datesRight && <span className="bar" style={{ width: "18%" }} />}
    </span>
  );
  return (
    <span className="thumb" aria-hidden>
      <span className="bar" style={{ ...header, width: "50%", height: 4, background: style.accent }} />
      <span className="bar" style={{ ...header, width: "72%" }} />
      <span className="bar" style={{ width: "32%", height: 3, marginTop: 3, background: style.accent }} />
      <span className="bar" style={{ height: 1, background: style.rule || "transparent" }} />
      {entry}
      {!style.datesRight && <span className="bar" style={{ width: "30%" }} />}
      <span className="bar" style={{ width: "88%" }} />
      <span className="bar" style={{ width: "76%" }} />
    </span>
  );
}
