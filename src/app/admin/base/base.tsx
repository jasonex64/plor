"use client";

// Looking a thing up in the answer database (docs/milestones/M13-13a-the-base.md): by any of its names, with its
// aliases, where it came from, its facts and the categories it falls in. Read-only; editing and undo come with 13b.
// Plain on purpose; the look is M14's job.
import { useState, type FormEvent } from "react";
import type { ThingView } from "@/admin/base";
import { api } from "@/lib/api-client";
import { errorText } from "../../messages";

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
    <section>
      <form onSubmit={search}>
        <label>
          Name or alias
          <input value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <button type="submit" disabled={busy || query.trim() === ""}>
          Look up
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      {things && things.length === 0 && <p>Nothing goes by that name.</p>}
      {things?.map((t) => (
        <article key={t.id} aria-label={t.name}>
          <h2>{t.name}</h2>
          <p>Categories: {t.categories.length ? t.categories.join(", ") : "none"}</p>
          <p>Names: {t.aliases.map((a) => `${a.alias} (${a.kind}, ${a.origin})`).join("; ")}</p>
          <p>Facts: {t.facts.length ? t.facts.map((f) => `${f.trait.replace("_", " ")} ${f.value}`).join("; ") : "none"}</p>
          <p>Sources: {t.sources.map((s) => `${s.source} ${s.id}`).join("; ")}</p>
        </article>
      ))}
    </section>
  );
}
