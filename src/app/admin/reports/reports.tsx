"use client";

// Reported comments (docs/milestones/M08-comments-and-reactions.md, 8c and D5): each comment with a report, the oldest
// first report first, and Delete, which removes it for everyone; then every deleted comment, newest first, with the
// admin who deleted it (M12 12d). Plain on purpose; the look is M14's job.
import { useCallback, useEffect, useState } from "react";
import type { DeletedComment, ReportedComment } from "@/admin/reports";
import { api } from "@/lib/api-client";
import { errorText } from "../../messages";

export function Reports() {
  const [reports, setReports] = useState<ReportedComment[] | null>(null);
  const [deletions, setDeletions] = useState<DeletedComment[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ reports: ReportedComment[]; deletions: DeletedComment[] }>("/api/admin/reports", { method: "GET" }).then(
      (r) => {
        setReports(r.reports);
        setDeletions(r.deletions);
        setError(null);
      },
      (err) => setError(errorText(err)),
    );
  }, []);
  useEffect(load, [load]);

  async function remove(id: string) {
    setBusy(true);
    setError(null);
    try {
      await api("/api/admin/reports/delete", { method: "POST", body: { id } });
      load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section aria-label="Reported comments">
        {reports && reports.length === 0 && <p>No reported comments.</p>}
        {reports && reports.length > 0 && (
          <ul>
            {reports.map((r) => (
              <li key={r.id}>
                <p>
                  <strong>{r.name}</strong> ({r.username}) on {r.date}: {r.reports} {r.reports === 1 ? "report" : "reports"}, first{" "}
                  <time dateTime={r.firstReportedAt}>{new Date(r.firstReportedAt).toLocaleString()}</time>
                </p>
                <p>{r.body}</p>
                <button type="button" disabled={busy} onClick={() => void remove(r.id)}>
                  Delete comment
                </button>
              </li>
            ))}
          </ul>
        )}
        {!reports && !error && <p>Loading…</p>}
        {error && <p role="alert">{error}</p>}
      </section>
      {deletions && (
        <section aria-label="Deleted comments">
          <h2>Deleted comments</h2>
          {deletions.length === 0 && <p>No deleted comments.</p>}
          {deletions.length > 0 && (
            <ul>
              {deletions.map((d) => (
                <li key={d.id}>
                  <p>
                    <time dateTime={d.deletedAt}>{new Date(d.deletedAt).toLocaleString()}</time>: {d.admin} deleted {d.author}&apos;s comment
                  </p>
                  <p>{d.body}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}
