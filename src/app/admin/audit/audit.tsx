"use client";

// The audit of what was learned from misses (docs/milestones/M13-13b-learning-from-misses.md): the texts waiting for a
// decision (held, held for a subset, rejected, near-typo), the answers players added, and what was decided, each
// undoable if it made an answer. Every decision takes effect from now: a day that has started keeps what it had. Laid
// out as round 10 draws it (docs/milestones/M14-14b-2b-2-admin-build.md, criterion 6): tables, the reason in words,
// each action a full-width button stacked in its column.
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Action, Review } from "@/admin/audit";
import { MISS_ACCEPT_MIN_PLAYERS, MISS_ACCEPT_SHARE_PERCENT } from "@/config/tunables";
import type { ThingView } from "@/admin/base";
import { api } from "@/lib/api-client";
import { errorText } from "../../messages";
import admin from "../admin.module.css";
import kit from "../../kit.module.css";
import { Line, Skeleton } from "../../skeleton";

// Why a text waits, in words.
const WHY: Record<Exclude<Review["outcome"], "accepted">, string> = {
  held: "Has a word on the offensive-word list",
  // A subset whose filter a new answer can't carry (through its country, or a number: M13 13e-4a, A2).
  held_subset: "Its filter can't be checked",
  rejected: "Names something outside the category",
  near_typo: "One letter from an answer",
};

type Decide = (id: number, action: Action, thing?: string) => Promise<void>;

export function Audit({ onChanged }: { onChanged: () => void }) {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ reviews: Review[] }>("/api/admin/audit", { method: "GET" }).then(
      (r) => {
        setReviews(r.reviews);
        setError(null);
      },
      (err) => setError(errorText(err)),
    );
  }, []);
  useEffect(load, [load]);

  const decide: Decide = async (id, action, thing) => {
    setBusy(true);
    setError(null);
    try {
      await api("/api/admin/audit", { method: "POST", body: { id, action, ...(thing ? { thing } : {}) } });
      load();
      onChanged();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  if (!reviews)
    return error ? (
      <p role="alert">{error}</p>
    ) : (
      <Skeleton label="Loading answers to review">
        <Line />
      </Skeleton>
    );
  const waiting = reviews.filter((r) => r.outcome !== "accepted" && !r.decision);
  const added = reviews.filter((r) => r.outcome === "accepted" && !r.decision);
  const decided = reviews.filter((r) => r.decision);
  return (
    <>
      <p className={admin.note}>
        What players typed that wasn&apos;t an answer, once {MISS_ACCEPT_MIN_PLAYERS} players and {MISS_ACCEPT_SHARE_PERCENT}% of a category typed
        it. A decision counts from now: a day already started keeps its answers.
      </p>
      {error && <p role="alert">{error}</p>}
      <section aria-label="To review" className={kit.card}>
        <h3 className={admin.cardTitle}>
          To review {waiting.length > 0 && <span className={`${kit.chip} ${admin.decide}`}>{waiting.length}</span>}
        </h3>
        {waiting.length === 0 ? (
          <p>Nothing to review.</p>
        ) : (
          <Table head={WAITING}>
            {waiting.map((r) => (
              <Row key={r.id} head={WAITING} review={r} cells={[<span key="w" className={`${kit.chip} ${admin.decide}`}>{WHY[r.outcome as keyof typeof WHY]}</span>]}>
                <Waiting review={r} busy={busy} decide={decide} />
              </Row>
            ))}
          </Table>
        )}
        <p className={admin.note}>Dismiss is final: the text stays a miss and isn&apos;t asked about again.</p>
      </section>
      <section aria-label="Added by players" className={kit.card}>
        <h3 className={admin.cardTitle}>Added by players</h3>
        {added.length === 0 ? (
          <p>No answers added.</p>
        ) : (
          <Table head={ADDED}>
            {added.map((r) => (
              <Row key={r.id} head={ADDED} review={r} cells={[<span key="t">{r.thing?.name ?? "—"}</span>]}>
                <button type="button" className={`${kit.small} ${admin.button}`} disabled={busy} onClick={() => void decide(r.id, "undo")}>
                  Undo
                </button>
                <LinkTo review={r} busy={busy} decide={decide} label="Same as another answer…" />
              </Row>
            ))}
          </Table>
        )}
      </section>
      <section aria-label="Decided" className={kit.card}>
        <h3 className={admin.cardTitle}>Decided</h3>
        {decided.length === 0 ? (
          <p>Nothing decided yet.</p>
        ) : (
          <table className={admin.table} role="table">
            <thead role="rowgroup" className="sr-only-on-phones">
              <tr role="row">
                <th role="columnheader">Typed</th>
                <th role="columnheader">Category</th>
                <th role="columnheader">Decision</th>
                <th role="columnheader">When</th>
                <th role="columnheader">
                  <span className="sr-only">Undo</span>
                </th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {decided.map((r) => (
                <tr role="row" key={r.id} aria-label={r.text}>
                  <td role="cell" className={admin.strong} data-label="Typed">&ldquo;{r.text}&rdquo;</td>
                  <td role="cell" data-label="Category">{r.category_name}</td>
                  <td role="cell" data-label="Decision">
                    {r.decision}
                    {r.chosen ? ` (${r.chosen.name})` : ""}
                  </td>
                  <td role="cell" className={`${admin.nowrap} ${admin.muted}`} data-label="When">
                    <time dateTime={r.decided_at!}>{new Date(r.decided_at!).toLocaleString()}</time>
                  </td>
                  <td role="cell">
                    {/* Every decision that made an answer can be undone (human, 2026-10-24: "Yes, undo anything (Recommended)"). */}
                    {r.decision === "accepted" || r.decision === "linked" ? (
                      <div className={admin.actions}>
                        <button type="button" className={`${kit.small} ${admin.button}`} disabled={busy} onClick={() => void decide(r.id, "undo")}>
                          Undo
                        </button>
                      </div>
                    ) : r.decision === "dismissed" ? (
                      <span className={admin.muted}>Final</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <table className={admin.table} role="table">
      <thead role="rowgroup" className="sr-only-on-phones">
        <tr role="row">
          {head.map((h) => (
            <th role="columnheader" key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody role="rowgroup">{children}</tbody>
    </table>
  );
}

// The columns of the waiting texts' table and the added answers', named once for each table's header and for the
// labels its cells show on phones (docs/milestones/M14-14b-2c-review-items.md, answer 17).
const WAITING = ["Typed", "Category", "Why it waits", "Players", "Decide"];
const ADDED = ["Typed", "Category", "Now the answer", "Players", "Change"];

// A text's row: what was typed, its category, the given cells, how many typed it, then its actions stacked. head is
// its table's columns, which label the cells on phones; the actions' cell needs none.
function Row({ head, review: r, cells, children }: { head: string[]; review: Review; cells: ReactNode[]; children: ReactNode }) {
  return (
    <tr role="row" aria-label={r.text}>
      <td role="cell" className={admin.strong} data-label={head[0]}>&ldquo;{r.text}&rdquo;</td>
      <td role="cell" data-label={head[1]}>{r.category_name}</td>
      {cells.map((c, i) => (
        <td role="cell" key={i} data-label={head[2 + i]}>
          {c}
        </td>
      ))}
      <td role="cell" className={admin.nowrap} data-label={head[2 + cells.length]}>
        {r.players} of {r.answered}
      </td>
      <td role="cell">
        <div className={admin.actions}>{children}</div>
      </td>
    </tr>
  );
}

// The actions that fit a waiting text.
function Waiting({ review: r, busy, decide }: { review: Review; busy: boolean; decide: Decide }) {
  return (
    <>
      {(r.outcome === "held" || r.outcome === "held_subset") && (
        <button type="button" className={`${kit.small} ${admin.button}`} disabled={busy} onClick={() => void decide(r.id, "accept")}>
          {r.outcome === "held_subset" ? "Accept for this category only" : "Accept"}
        </button>
      )}
      {r.outcome === "rejected" &&
        r.named.map((t) => (
          <button key={t.id} type="button" className={`${kit.small} ${admin.button}`} disabled={busy} onClick={() => void decide(r.id, "accept_for_category", t.id)}>
            Accept {t.name} as {r.category_name}
          </button>
        ))}
      {/* A near-typo links to the answer it's a typo of in one click; the search is for any other (round 10, board 3). */}
      {r.outcome === "near_typo" &&
        r.near.map((t) => (
          <button key={t.id} type="button" className={`${kit.small} ${admin.button}`} disabled={busy} onClick={() => void decide(r.id, "link", t.id)}>
            Link to {t.name}
          </button>
        ))}
      {r.outcome === "near_typo" && <LinkTo review={r} busy={busy} decide={decide} label={r.near.length > 0 ? "Different answer…" : "Same as…"} />}
      <button type="button" className={`${kit.small} ${admin.button}`} disabled={busy} onClick={() => void decide(r.id, "dismiss")}>
        Dismiss
      </button>
    </>
  );
}

// "Same as": find the member the text is another name for, by any of its names, and link the text to it ("New
// answer, you link (Recommended)"). Behind a button, so the column shows one action per row until it's wanted.
function LinkTo({ review: r, busy, decide, label }: { review: Review; busy: boolean; decide: Decide; label: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<ThingView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function search(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const { things } = await api<{ things: ThingView[] }>(`/api/admin/base?q=${encodeURIComponent(query)}`, { method: "GET" });
      setFound(things.filter((t) => t.categories.includes(r.category) && t.id !== r.thing?.id));
    } catch (err) {
      setError(errorText(err));
    }
  }

  if (!open) {
    return (
      <button type="button" className={`${kit.small} ${admin.button}`} onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  }
  return (
    <form onSubmit={search} className={admin.actions}>
      <label className={admin.field}>
        <span className="sr-only">Same as</span>
        <input value={query} placeholder="Same as…" onChange={(e) => setQuery(e.target.value)} />
      </label>
      <button type="submit" className={`${kit.small} ${admin.button}`} disabled={busy || query.trim() === ""}>
        Find
      </button>
      {error && <p role="alert">{error}</p>}
      {found && found.length === 0 && <p>No {r.category_name} goes by that name.</p>}
      {found?.map((t) => (
        <button key={t.id} type="button" className={`${kit.small} ${admin.button}`} disabled={busy} onClick={() => void decide(r.id, "link", t.id)}>
          Link to {t.name}
        </button>
      ))}
    </form>
  );
}
