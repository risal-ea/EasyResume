"use server";

import { redirect } from "next/navigation";
import { deleteResume } from "@/core/store/resumeStore";

export async function deleteResumeAction(id: string): Promise<void> {
  deleteResume(id);
  redirect("/resumes");
}
