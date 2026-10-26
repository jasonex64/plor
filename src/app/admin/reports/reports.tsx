"use client";

// Reported comments (docs/milestones/M08-comments-and-reactions.md, 8c and D5): each comment with an open report, the
// oldest first report first, with Keep comment, which leaves it for everyone (M14 14b-2b-2b), and Delete, which removes
// it for everyone; then every decision, newest first, with the admin who made it (M12 12d). Laid out as round 10 draws
// it (docs/milestones/M14-14b-2b-2-admin-build.md, criterion 6): Delete asks inline before it deletes for everyone.
import { useCallback, useEffect, useState } from "react";
import type { Decision, ReportedComment } from "@/admin/reports";
import { api } from "@/lib/api-client";
import { Avatar } from "../../avatar";
import { errorText } from "../../messages";
import admin from "../admin.module.css";
import { dayText } from "../day-text";
import styles from "./reports.module.css";

const when = (at: string) => new Date(at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function Reports({ onChanged }: { onChanged: () => void }) {
  const [reports, setReports] = useState<ReportedComment[] | null>(null);
  const [decisions, setDecisions] = useState<Decision[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ reports: ReportedComment[]; decisions: Decision[] }>("/api/admin/reports", { method: "GET" }).then(
      (r) => {
        setReports(r.reports);
        setDecisions(r.decisions);
        setError(null);
      },
      (err) => setError(errorText(err)),
    );
  }, []);
  useEffect(load, [load]);

  async function decide(path: "delete" | "keep", id: string) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/reports/${path}`, { method: "POST", body: { id } });
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
      <p className={admin.note}>
        Keep comment leaves it for everyone but the players who reported it; Delete removes it for everyone. Both are logged
        below.
      </p>
      <section aria-label="Reported comments" className={admin.card}>
        <h3 className={admin.cardTitle}>
          Reported {reports && reports.length > 0 && <span className={admin.badge}>{reports.length}</span>}
        </h3>
        {reports && reports.length === 0 && <p>No reported comments.</p>}
        {reports && reports.length > 0 && (
          <ul className={styles.reported}>
            {reports.map((r) => (
              <Reported key={r.id} report={r} busy={busy} onKeep={() => void decide("keep", r.id)} onDelete={() => void decide("delete", r.id)} />
            ))}
          </ul>
        )}
        {!reports && !error && <p>Loading…</p>}
        {error && <p role="alert">{error}</p>}
      </section>
      {decisions && (
        <section aria-label="Decisions" className={admin.card}>
          <h3 className={admin.cardTitle}>Decisions</h3>
          {decisions.length === 0 ? (
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
                {decisions.map((d) => (
                  // A comment is kept again after a new report, so the time tells its decisions apart.
                  <tr key={`${d.decision}-${d.id}-${d.at}`}>
                    <td className={`${admin.nowrap} ${admin.muted}`}>
                      <time dateTime={d.at}>{when(d.at)}</time>
                    </td>
                    <td>
                      <span className={`${admin.tag} ${admin.state}`}>{d.decision === "deleted" ? "Deleted" : "Kept"}</span>
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

// A reported comment: who wrote it, on which day, how many reported it and when first; then Keep comment, and Delete…,
// which asks before it deletes for everyone.
function Reported({ report: r, busy, onKeep, onDelete }: { report: ReportedComment; busy: boolean; onKeep: () => void; onDelete: () => void }) {
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
          <button type="button" className={admin.button} disabled={busy} onClick={onKeep}>
            Keep comment
          </button>
          <button type="button" className={`${admin.button} ${admin.danger}`} onClick={() => setAsking(true)}>
            Delete…
          </button>
        </div>
      )}
    </li>
  );
}
