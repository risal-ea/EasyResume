"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { TemplatePicker } from "@/components/TemplatePicker";
import type { TemplateId } from "@/core/schema";
import { saveResumeAction } from "./actions";

/** Switches the saved resume to another template right away, so the downloads match the preview. */
export function TemplateSwitcher({ id, template }: { id: string; template: TemplateId }) {
  const router = useRouter();
  const [value, setValue] = useState(template);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const choose = (next: TemplateId) => {
    setValue(next);
    setError("");
    startTransition(async () => {
      const result = await saveResumeAction(id, { template: next });
      if (result.ok) {
        router.refresh();
      } else {
        setValue(template);
        setError(result.error);
      }
    });
  };

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2>Template</h2>
        {pending && <span className="muted">Applying…</span>}
      </div>
      <p className="card-intro">Every template is single-column with real text, so ATS software reads them all reliably.</p>
      <TemplatePicker value={value} onChange={choose} disabled={pending} />
      {error && (
        <p className="field-error" style={{ marginTop: 8 }}>
          {error}
        </p>
      )}
    </div>
  );
}
