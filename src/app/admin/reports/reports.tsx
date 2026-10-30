"use client";

// Reported comments (docs/milestones/M08-comments-and-reactions.md, 8c and D5): each comment with an open report, the
// oldest first report first, with Keep comment, which leaves it for everyone but its reporters (M14 14b-2b-2b), and
// Delete, which removes it for everyone; then every decision, newest first, with the admin who made it (M12 12d). Laid
// out as round 10 draws it (docs/milestones/M14-14b-2b-2-admin-build.md, criterion 6): Delete asks inline before it
// deletes for everyone.
import { useCallback, useEffect, useRef, useState } from "react";
import type { Decision, ReportedComment } from "@/admin/reports";
import { api } from "@/lib/api-client";
import { Avatar } from "../../avatar";
import { errorText } from "../../messages";
import admin from "../admin.module.css";
import kit from "../../kit.module.css";
import { dayText, whenText } from "../../day-text";
import styles from "./reports.module.css";
import { Line, Skeleton } from "../../skeleton";

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
      <section aria-label="Reported comments" className={kit.card}>
        <h3 className={admin.cardTitle}>
          Reported {reports && reports.length > 0 && <span className={`${kit.chip} ${admin.decide}`}>{reports.length}</span>}
        </h3>
        {reports && reports.length === 0 && <p>No reported comments.</p>}
        {reports && reports.length > 0 && (
          <ul className={kit.rows}>
            {reports.map((r) => (
              <Reported key={r.id} report={r} busy={busy} onKeep={() => void decide("keep", r.id)} onDelete={() => void decide("delete", r.id)} />
            ))}
          </ul>
        )}
        {!reports && !error && (
          <Skeleton label="Loading reported comments">
            <Line />
          </Skeleton>
        )}
        {error && <p role="alert">{error}</p>}
      </section>
      {decisions && (
        <section aria-label="Decisions" className={kit.card}>
          <h3 className={admin.cardTitle}>Decisions</h3>
          {decisions.length === 0 ? (
            <p>No decisions yet.</p>
          ) : (
            <table className={admin.table} role="table">
              <thead role="rowgroup" className="sr-only-on-phones">
                <tr role="row">
                  <th role="columnheader">When</th>
                  <th role="columnheader">Decision</th>
                  <th role="columnheader">By</th>
                  <th role="columnheader">Author</th>
                  <th role="columnheader">Comment</th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {decisions.map((d) => (
                  // A comment is kept again after a new report, so the time tells its decisions apart.
                  <tr role="row" key={`${d.decision}-${d.id}-${d.at}`}>
                    <td role="cell" className={`${admin.nowrap} ${admin.muted}`} data-label="When">
                      <time dateTime={d.at}>{whenText(d.at)}</time>
                    </td>
                    <td role="cell" data-label="Decision">
                      <span className={kit.chip}>{d.decision === "deleted" ? "Deleted" : "Kept"}</span>
                    </td>
                    <td role="cell" data-label="By">{d.admin ?? `the admin with no username, ${d.adminId}`}</td>
                    <td role="cell" data-label="Author">{d.author}</td>
                    <td role="cell" data-label="Comment">{d.body}</td>
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
// which asks before it deletes for everyone. The keyboard's focus follows the swap: to Cancel, the safe choice, when it
// asks, and back to Delete… on Cancel (docs/milestones/M14-14b-2c-review-items.md, item 41).
function Reported({ report: r, busy, onKeep, onDelete }: { report: ReportedComment; busy: boolean; onKeep: () => void; onDelete: () => void }) {
  const [asking, setAsking] = useState(false);
  const cancel = useRef<HTMLButtonElement>(null);
  const ask = useRef<HTMLButtonElement>(null);
  const swapped = useRef(false);
  useEffect(() => {
    if (!swapped.current) return;
    (asking ? cancel : ask).current?.focus();
  }, [asking]);
  const swap = (next: boolean) => {
    swapped.current = true;
    setAsking(next);
  };
  return (
    <li className={`${kit.row} ${styles.item}`}>
      <p className={styles.who}>
        <Avatar name={r.name} /> <strong>{r.name}</strong>{" "}
        <span className={admin.muted}>
          ({r.username}) · on {dayText(r.date)} · {r.reports} {r.reports === 1 ? "report" : "reports"}, first{" "}
          <time dateTime={r.firstReportedAt}>{whenText(r.firstReportedAt)}</time>
        </span>
      </p>
      <p className={styles.body}>{r.body}</p>
      {asking ? (
        <div role="group" aria-label="Confirm delete" className={styles.confirm}>
          <strong className={styles.confirmText}>Delete for everyone? This can&apos;t be undone.</strong>
          <button type="button" className={`${kit.small} ${admin.button} ${kit.danger}`} disabled={busy} onClick={onDelete}>
            Delete
          </button>
          <button type="button" ref={cancel} className={`${kit.small} ${admin.button}`} onClick={() => swap(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <div className={kit.chips}>
          <button type="button" className={`${kit.small} ${admin.button}`} disabled={busy} onClick={onKeep}>
            Keep comment
          </button>
          <button type="button" ref={ask} className={`${kit.small} ${admin.button} ${kit.danger}`} onClick={() => swap(true)}>
            Delete…
          </button>
        </div>
      )}
    </li>
  );
}
