"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { CopyButton } from "@/components/CopyButton";
import { discardImportAction, uploadResumeAction } from "./actions";

const ASK = "Import my resume into EasyResume";

interface Props {
  upload: { fileName: string; uploadedAt: string; text: string } | null;
  /** Set when the form below is showing data the AI imported. */
  pending: { fileName: string; importedAt: string } | null;
}

/**
 * Upload an existing resume → the AI assistant structures it over MCP →
 * the result appears in the form for review. This panel walks through it.
 */
export function ImportPanel({ upload, pending }: Props) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  // While waiting for the AI assistant, check every few seconds whether it has finished.
  const waiting = upload !== null && pending === null;
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(async () => {
      try {
        const status = (await (await fetch("/profile/import-status", { cache: "no-store" })).json()) as {
          importedAt: string | null;
        };
        if (status.importedAt) {
          setReady(true);
          clearInterval(timer);
        }
      } catch {
        // web UI restarting; try again on the next tick
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [waiting]);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    setError("");
    const data = new FormData();
    data.append("file", file);
    startTransition(async () => {
      const result = await uploadResumeAction(data);
      if (result.ok) {
        setReady(false);
        router.refresh();
      } else {
        setError(result.error);
      }
      if (fileInput.current) fileInput.current.value = "";
    });
  };

  const discard = () =>
    startTransition(async () => {
      await discardImportAction();
      router.refresh();
    });

  const picker = (
    <input
      ref={fileInput}
      type="file"
      accept=".pdf,.docx,.txt,.md"
      hidden
      onChange={(e) => onFile(e.target.files?.[0])}
    />
  );

  if (pending) {
    return (
      <div className="card import-panel import-done">
        <h2>Imported from {pending.fileName}</h2>
        <p className="card-intro">
          Your AI assistant filled in the form below. Anything you already had was kept and new items were added. Check
          every section, fix anything that was read wrongly, then click <strong>Save profile</strong>.
        </p>
        <button type="button" className="btn btn-small" onClick={discard} disabled={busy}>
          Discard import
        </button>
      </div>
    );
  }

  if (upload) {
    return (
      <div className="card import-panel">
        {picker}
        <h2>{ready ? "Your AI assistant has finished" : `${upload.fileName} uploaded`}</h2>
        {ready ? (
          <>
            <p className="card-intro">The imported details are ready for you to review.</p>
            <button type="button" className="btn btn-primary" onClick={() => router.refresh()}>
              Review imported data
            </button>
          </>
        ) : (
          <>
            <p className="card-intro">
              Read {upload.text.length.toLocaleString()} characters of text. Now ask your AI assistant (Claude or Codex,
              connected on the Connect AI page):
            </p>
            <div className="snippet" style={{ marginBottom: 12 }}>
              <pre>
                <code>{ASK}</code>
              </pre>
              <CopyButton text={ASK} />
            </div>
            <p className="muted" style={{ marginTop: 0 }}>
              <span className="pulse" aria-hidden /> Waiting for your assistant. The result appears here, and nothing is
              saved until you review it.
            </p>
          </>
        )}
        <details className="jd" style={{ marginTop: 12 }}>
          <summary>Text read from the file</summary>
          <pre>{upload.text}</pre>
        </details>
        <div className="row" style={{ marginTop: 12 }}>
          <button type="button" className="btn btn-small" onClick={() => fileInput.current?.click()} disabled={busy}>
            {busy ? "Uploading…" : "Upload a different file"}
          </button>
          <button type="button" className="btn btn-small btn-ghost" onClick={discard} disabled={busy}>
            Remove
          </button>
        </div>
        {error && <p className="field-error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="card import-panel">
      {picker}
      <h2>Import from your existing resume</h2>
      <p className="card-intro">
        Upload your current resume (PDF, DOCX or TXT) and your AI assistant fills in this form for you. You review
        everything before it is saved.
      </p>
      <button type="button" className="btn" onClick={() => fileInput.current?.click()} disabled={busy}>
        {busy ? "Reading file…" : "Upload resume"}
      </button>
      {error && <p className="field-error" style={{ marginTop: 8 }}>{error}</p>}
    </div>
  );
}
