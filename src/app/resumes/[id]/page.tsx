import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteResumeButton } from "@/components/DeleteResumeButton";
import { Score } from "@/components/Score";
import { MAX_PAGES } from "@/core/render/templates";
import { getResume, resumeFolder } from "@/core/store/resumeStore";
import { TemplateSwitcher } from "./TemplateSwitcher";

export const dynamic = "force-dynamic";

export default async function ResumePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = getResume(id);
  if (!record) notFound();
  const { draft, ats } = record;

  return (
    <>
      <div className="page-header">
        <div>
          <p style={{ margin: "0 0 4px" }}>
            <Link href="/resumes">← All resumes</Link>
          </p>
          <h1>{draft.targetTitle}</h1>
          <p>
            {[draft.company, `Updated ${new Date(record.updatedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="row">
          <Link className="btn" href={`/resumes/${id}/edit`}>
            Edit resume
          </Link>
          <a className="btn btn-primary" href={`/resumes/${id}/download/pdf`}>
            Download PDF
          </a>
          <a className="btn" href={`/resumes/${id}/download/docx`}>
            DOCX
          </a>
          <a className="btn" href={`/resumes/${id}/download/md`}>
            Markdown
          </a>
          <DeleteResumeButton id={id} />
        </div>
      </div>

      <div className="detail-layout">
        <div>
          <TemplateSwitcher key={record.updatedAt} id={id} template={draft.template} />
          {/* The query string reloads the preview after every change. */}
          <iframe className="preview-frame" src={`/resumes/${id}/preview?v=${record.updatedAt}`} title="Resume preview" />
        </div>

        <aside>
          <div className="card">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h2>ATS check</h2>
              <Score coverage={ats.keywordCoverage} />
            </div>
            <p className={ats.pageCount > MAX_PAGES ? "issue-error" : "muted"} style={{ margin: "8px 0 12px" }}>
              {ats.pageCount} page{ats.pageCount === 1 ? "" : "s"} (at most {MAX_PAGES})
            </p>
            {ats.foundKeywords.length + ats.missingKeywords.length > 0 && (
              <>
                <h3 style={{ marginBottom: 6 }}>Keywords</h3>
                <div style={{ marginBottom: 12 }}>
                  {ats.foundKeywords.map((k) => (
                    <span key={k} className="chip chip-ok">
                      {k}
                    </span>
                  ))}
                  {ats.missingKeywords.map((k) => (
                    <span key={k} className="chip chip-missing" title="Not found in the resume">
                      {k}
                    </span>
                  ))}
                </div>
              </>
            )}
            <h3 style={{ marginBottom: 6 }}>Format and wording</h3>
            {ats.issues.length === 0 ? (
              <p className="status-ok" style={{ margin: 0 }}>No issues found.</p>
            ) : (
              <ul className="issues">
                {ats.issues.map((issue, i) => (
                  <li key={i} className={issue.level === "error" ? "issue-error" : undefined}>
                    {issue.message}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {record.warnings.length > 0 && (
            <div className="card">
              <h2>Warnings</h2>
              <ul className="issues" style={{ marginTop: 8 }}>
                {record.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="card">
            <details className="jd">
              <summary>Job description</summary>
              <pre>{draft.jobDescription}</pre>
            </details>
          </div>

          <p className="muted" style={{ overflowWrap: "anywhere" }}>
            Files: <code>{resumeFolder(id)}</code>
          </p>
        </aside>
      </div>
    </>
  );
}
