"use client";

// Reported comments (docs/milestones/M08-comments-and-reactions.md, 8c and D5): each comment with a report, the oldest
// first report first, and Delete, which removes it for everyone; then every deleted comment, newest first, with the
// admin who deleted it (M12 12d). Laid out as round 10 draws it (docs/milestones/M14-14b-2b-2-admin-build.md,
// criterion 6): Delete asks inline before it deletes for everyone, and the decisions are one log.
import { useCallback, useEffect, useState } from "react";
import type { DeletedComment, ReportedComment } from "@/admin/reports";
import { api } from "@/lib/api-client";
import { Avatar } from "../../avatar";
import { errorText } from "../../messages";
import admin from "../admin.module.css";
import { dayText } from "../day-text";
import styles from "./reports.module.css";

const when = (at: string) => new Date(at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function Reports({ onChanged }: { onChanged: () => void }) {
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
      onChanged();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p className={admin.note}>Delete removes a comment for everyone and is logged below.</p>
      <section aria-label="Reported comments" className={admin.card}>
        <h3 className={admin.cardTitle}>
          Reported {reports && reports.length > 0 && <span className={admin.badge}>{reports.length}</span>}
        </h3>
        {reports && reports.length === 0 && <p>No reported comments.</p>}
        {reports && reports.length > 0 && (
          <ul className={styles.reported}>
            {reports.map((r) => (
              <Reported key={r.id} report={r} busy={busy} onDelete={() => void remove(r.id)} />
            ))}
          </ul>
        )}
        {!reports && !error && <p>Loading…</p>}
        {error && <p role="alert">{error}</p>}
      </section>
      {deletions && (
        <section aria-label="Decisions" className={admin.card}>
          <h3 className={admin.cardTitle}>Decisions</h3>
          {deletions.length === 0 ? (
            <p>No decisions yet.</p>
          ) : (
            <table className={admin.table}>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Decision</th>
                  <th>By</th>
                  <th>Author</th>
                  <th>Comment</th>
                </tr>
              </thead>
              <tbody>
                {deletions.map((d) => (
                  <tr key={d.id}>
                    <td className={`${admin.nowrap} ${admin.muted}`}>
                      <time dateTime={d.deletedAt}>{when(d.deletedAt)}</time>
                    </td>
                    <td>
                      <span className={`${admin.tag} ${admin.state}`}>Deleted</span>
                    </td>
                    <td>{d.admin ?? `the admin with no username, ${d.adminId}`}</td>
                    <td>{d.author}</td>
                    <td>{d.body}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}
    </>
  );
}

// A reported comment: who wrote it, on which day, how many reported it and when first; then Delete…, which asks before
// it deletes for everyone.
function Reported({ report: r, busy, onDelete }: { report: ReportedComment; busy: boolean; onDelete: () => void }) {
  const [asking, setAsking] = useState(false);
  return (
    <li className={styles.item}>
      <p className={styles.who}>
        <Avatar name={r.name} /> <strong>{r.name}</strong>{" "}
        <span className={admin.muted}>
          ({r.username}) · on {dayText(r.date)} · {r.reports} {r.reports === 1 ? "report" : "reports"}, first{" "}
          <time dateTime={r.firstReportedAt}>{when(r.firstReportedAt)}</time>
        </span>
      </p>
      <p className={styles.body}>{r.body}</p>
      {asking ? (
        <div role="group" aria-label="Confirm delete" className={styles.confirm}>
          <strong className={styles.confirmText}>Delete for everyone? This can&apos;t be undone.</strong>
          <button type="button" className={`${admin.button} ${admin.dangerFill}`} disabled={busy} onClick={onDelete}>
            Delete
          </button>
          <button type="button" className={admin.button} onClick={() => setAsking(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <div className={styles.buttons}>
          <button type="button" className={`${admin.button} ${admin.danger}`} onClick={() => setAsking(true)}>
            Delete…
          </button>
        </div>
      )}
    </li>
  );
}
