"use client";

import { useId } from "react";

interface Props {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  hint?: string;
  rows?: number;
}

/** A textarea edited as one list item per line (blank lines are dropped on save). */
export function LinesInput({ label, value, onChange, placeholder, hint, rows = 4 }: Props) {
  const id = useId();
  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        rows={Math.max(rows, value.length + 1)}
        value={value.join("\n")}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.split("\n"))}
      />
      <span className="field-hint">{hint ?? "One per line."}</span>
    </div>
  );
}
