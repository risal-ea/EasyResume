"use client";

import { useState, type MouseEvent, type ReactNode } from "react";

interface ItemActionsProps {
  onUp?: () => void;
  onDown?: () => void;
  onRemove: () => void;
}

/** Move up / move down / remove buttons for one item in a list. */
export function ItemActions({ onUp, onDown, onRemove }: ItemActionsProps) {
  // The buttons may sit inside a <summary>; stop them from toggling it.
  const action = (fn: () => void) => (e: MouseEvent) => {
    e.preventDefault();
    fn();
  };
  return (
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
  );
}

/** A collapsible item in a list, with its title and move/remove actions in the header. */
export function ItemCard({
  defaultOpen,
  title,
  subtitle,
  children,
  ...actions
}: ItemActionsProps & { defaultOpen: boolean; title?: string; subtitle?: string; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details className="item" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>
        <span className="item-title">
          {title || "Untitled"}
          {subtitle && <span className="muted"> · {subtitle}</span>}
        </span>
        <ItemActions {...actions} />
      </summary>
      <div className="item-body">{children}</div>
    </details>
  );
}
