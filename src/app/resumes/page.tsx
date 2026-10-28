import Link from "next/link";
import { Score } from "@/components/Score";
import { listResumes } from "@/core/store/resumeStore";

export const dynamic = "force-dynamic";

export default function ResumesPage() {
  const resumes = listResumes();
  return (
    <>
      <div className="page-header">
        <div>
          <h1>Resumes</h1>
          <p>Tailored resumes your AI assistant created. The newest are first.</p>
        </div>
      </div>
      {resumes.length === 0 ? (
        <div className="card">
          <h2>No resumes yet</h2>
          <p className="card-intro" style={{ marginTop: 8 }}>
            Fill in your <Link href="/profile">profile</Link>, <Link href="/connect">connect your AI assistant</Link>, then
            paste a job description and ask it to create an ATS-friendly resume with EasyResume.
          </p>
        </div>
      ) : (
        <div className="resume-list">
          {resumes.map((r) => (
            <Link key={r.id} href={`/resumes/${r.id}`} className="resume-row">
              <div className="resume-row-main">
                <strong>{r.draft.targetTitle}</strong>
                <span className="muted">
                  {[r.draft.company, new Date(r.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
              <Score coverage={r.ats.keywordCoverage} />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
