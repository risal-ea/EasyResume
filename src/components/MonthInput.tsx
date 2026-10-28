"use client";

import { useId, useState } from "react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface Props {
  label: string;
  /** "YYYY-MM", "YYYY" (year only) or "". */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * Month + year dropdowns. Replaces <input type="month">, whose picker makes the
 * year hard to change and which some browsers (Safari, webviews) don't support.
 */
export function MonthInput({ label, value, onChange, disabled }: Props) {
  const labelId = useId();
  const parsed = /^(\d{4})(?:-(\d{2}))?$/.exec(value);
  // A month picked before any year is held here until a year is chosen.
  const [pendingMonth, setPendingMonth] = useState("");
  const year = parsed?.[1] ?? "";
  const month = parsed ? (parsed[2] ?? "") : pendingMonth;

  // A year alone is a valid date ("2019"); a month alone is not.
  const update = (next: { year: string; month: string }) => {
    if (next.year) {
      setPendingMonth("");
      onChange(next.month ? `${next.year}-${next.month}` : next.year);
    } else {
      setPendingMonth(next.month);
      if (value) onChange("");
    }
  };

  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 71 }, (_, i) => String(thisYear + 6 - i));
  if (year && !years.includes(year)) years.push(year);

  return (
    <div className="field" role="group" aria-labelledby={labelId}>
      <span className="field-label" id={labelId}>
        {label}
      </span>
      <div className="month-input">
        <select
          aria-label={`${label} month`}
          value={month}
          disabled={disabled}
          onChange={(e) => update({ year, month: e.target.value })}
        >
          <option value="">Month</option>
          {MONTHS.map((name, i) => (
            <option key={name} value={String(i + 1).padStart(2, "0")}>
              {name}
            </option>
          ))}
        </select>
        <select
          aria-label={`${label} year`}
          value={year}
          disabled={disabled}
          onChange={(e) => update({ year: e.target.value, month })}
        >
          <option value="">Year</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
