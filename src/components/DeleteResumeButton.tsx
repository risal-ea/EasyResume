"use client";

import { useTransition } from "react";
import { deleteResumeAction } from "@/app/(app)/resumes/[id]/actions";

export function DeleteResumeButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="btn btn-danger"
      disabled={pending}
      onClick={() => {
        if (confirm("Delete this resume and its files?")) startTransition(() => deleteResumeAction(id));
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
