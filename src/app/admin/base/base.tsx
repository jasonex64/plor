"use client";

// Looking a thing up in the answer database (docs/milestones/M13-13a-the-base.md): by any of its names, with its
// aliases, where it came from, its facts and the categories it falls in. Read-only; what players added is audited on
// /admin/audit (13b). Laid out as round 10 draws it (docs/milestones/M14-14b-2b-2-admin-build.md, criterion 6): the
// search, then each thing as a card.
import { useState, type FormEvent } from "react";
import type { ThingView } from "@/admin/base";
import { api } from "@/lib/api-client";
import { errorText } from "../../messages";
import admin from "../admin.module.css";

export function AnswerBase() {
  const [query, setQuery] = useState("");
  const [things, setThings] = useState<ThingView[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ things: ThingView[] }>(`/api/admin/base?q=${encodeURIComponent(query)}`, { method: "GET" });
      setThings(r.things);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form onSubmit={search} className={admin.search}>
        <label className={admin.field}>
          <span className={admin.sr}>Name or alias</span>
          <input value={query} placeholder="Name or alias" onChange={(e) => setQuery(e.target.value)} />
        </label>
        <button type="submit" className={admin.primary} disabled={busy || query.trim() === ""}>
          Look up
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      {things && things.length === 0 && <p>Nothing goes by that name.</p>}
      {things && things.length > 0 && <p className={admin.note}>{things.length === 1 ? "1 thing goes" : `${things.length} things go`} by that name.</p>}
      {things?.map((t) => (
        <article key={t.id} aria-label={t.name} className={admin.card}>
          <h3 className={admin.cardTitle}>{t.name}</h3>
          <dl className={admin.facts}>
            <dt>Categories</dt>
            <dd>{t.categories.length ? t.categories.join(", ") : "none"}</dd>
            <dt>Facts</dt>
            <dd>{t.facts.length ? t.facts.map((f) => `${f.trait.replace("_", " ")} ${f.value}`).join("; ") : "none"}</dd>
            <dt>Sources</dt>
            <dd>{t.sources.map((s) => `${s.source} ${s.id}`).join("; ")}</dd>
          </dl>
          <table className={admin.table} role="table">
            <thead role="rowgroup">
              <tr role="row">
                <th role="columnheader">Name</th>
                <th role="columnheader">Kind</th>
                <th role="columnheader">From</th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {t.aliases.map((a) => (
                <tr role="row" key={`${a.alias}-${a.kind}-${a.origin}`}>
                  <td role="cell" className={admin.strong} data-label="Name">{a.alias}</td>
                  <td role="cell" data-label="Kind">{a.kind}</td>
                  <td role="cell" className={admin.muted} data-label="From">{a.origin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      ))}
    </>
  );
}
