"use client";

// The audit of what was learned from misses (docs/milestones/M13-13b-learning-from-misses.md): the texts waiting for a
// decision (held, rejected, near-typo), the answers players added, and what was decided. Every decision takes effect
// from now: a day that has started keeps what it had. Plain on purpose; the look is M14's job.
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { Action, Review } from "@/admin/audit";
import type { ThingView } from "@/admin/base";
import { api } from "@/lib/api-client";
import { errorText } from "../../messages";

const WHY: Record<Review["outcome"], string> = {
  accepted: "Added as a new answer.",
  held: "Held: it holds a word on the offensive-word list.",
  rejected: "Rejected: it names something outside the category.",
  near_typo: "Held as a typo: it's one letter from an answer.",
};

export function Audit() {
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

  async function decide(id: number, action: Action, thing?: string) {
    setBusy(true);
    setError(null);
    try {
      await api("/api/admin/audit", { method: "POST", body: { id, action, ...(thing ? { thing } : {}) } });
      load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  if (!reviews) return error ? <p role="alert">{error}</p> : <p>Loading…</p>;
  const waiting = reviews.filter((r) => r.outcome !== "accepted" && !r.decision);
  const added = reviews.filter((r) => r.outcome === "accepted" && !r.decision);
  const decided = reviews.filter((r) => r.decision);
  const props = { busy, decide };
  return (
    <>
      {error && <p role="alert">{error}</p>}
      <section aria-label="To review">
        <h2>To review</h2>
        {waiting.length === 0 && <p>Nothing to review.</p>}
        {waiting.map((r) => (
          <Entry key={r.id} review={r} {...props} />
        ))}
      </section>
      <section aria-label="Added by players">
        <h2>Added by players</h2>
        {added.length === 0 && <p>No answers added.</p>}
        {added.map((r) => (
          <Entry key={r.id} review={r} {...props} />
        ))}
      </section>
      <section aria-label="Decided">
        <h2>Decided</h2>
        {decided.length === 0 && <p>Nothing decided yet.</p>}
        <ul>
          {decided.map((r) => (
            <li key={r.id}>
              &ldquo;{r.text}&rdquo; for {r.category_name}: {r.decision}
              {r.chosen ? ` (${r.chosen.name})` : ""}, <time dateTime={r.decided_at!}>{new Date(r.decided_at!).toLocaleString()}</time>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

type EntryProps = { review: Review; busy: boolean; decide: (id: number, action: Action, thing?: string) => Promise<void> };

function Entry({ review: r, busy, decide }: EntryProps) {
  return (
    <article aria-label={r.text}>
      <h3>
        &ldquo;{r.text}&rdquo; for {r.category_name}
      </h3>
      <p>
        {WHY[r.outcome]} Typed by {r.players} of the {r.answered} players who answered the category.
        {r.thing ? ` It's now the answer "${r.thing.name}".` : ""}
      </p>
      {r.outcome === "accepted" && (
        <button type="button" disabled={busy} onClick={() => void decide(r.id, "undo")}>
          Undo
        </button>
      )}
      {r.outcome === "held" && (
        <button type="button" disabled={busy} onClick={() => void decide(r.id, "accept")}>
          Accept
        </button>
      )}
      {r.outcome === "rejected" &&
        r.named.map((t) => (
          <button key={t.id} type="button" disabled={busy} onClick={() => void decide(r.id, "accept_for_category", t.id)}>
            Accept {t.name} as {r.category_name}
          </button>
        ))}
      {r.outcome !== "accepted" && (
        <button type="button" disabled={busy} onClick={() => void decide(r.id, "dismiss")}>
          Dismiss
        </button>
      )}
      {(r.outcome === "accepted" || r.outcome === "near_typo") && <LinkTo review={r} busy={busy} decide={decide} />}
    </article>
  );
}

// "Same as": find the member the text is another name for, by any of its names, and link the text to it ("New
// answer, you link (Recommended)").
function LinkTo({ review: r, busy, decide }: EntryProps) {
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

  return (
    <form onSubmit={search}>
      <label>
        Same as
        <input value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <button type="submit" disabled={busy || query.trim() === ""}>
        Find
      </button>
      {error && <p role="alert">{error}</p>}
      {found && found.length === 0 && <p>No {r.category_name} goes by that name.</p>}
      {found?.map((t) => (
        <button key={t.id} type="button" disabled={busy} onClick={() => void decide(r.id, "link", t.id)}>
          Link to {t.name}
        </button>
      ))}
    </form>
  );
}
