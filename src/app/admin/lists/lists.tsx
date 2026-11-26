"use client";

// The review of the researched lists (docs/milestones/M23-23b-research-and-review.md, 23b-2; the human's answers 25, 29
// and 30 in M23-offbeat-on-a-clock.md): each researched question with its counts, and one question's answers, the doubtful
// ones and the brands first, then every answer behind a search. An answer can be struck (Undo works until midnight),
// an answer added, an answer given another tier (23e-2; Undo works until the file holds it), and the list marked seen; the
// texts players typed on its clock days that are on no list wait under it, each to add or dismiss. Built from the admin's own pieces: the audit's table, the pool's page of 20,
// the base page's search row.
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { AnswerView, ListRow, ListView, Unlisted } from "@/admin/lists";
import { POOL_PAGE_SIZE, TYPED_ANSWER_MAX_LENGTH } from "@/config/tunables";
import type { ListTier } from "@/content/list";
import { normalize } from "@/content/puzzle";
import { api } from "@/lib/api-client";
import { errorText } from "../../messages";
import admin from "../admin.module.css";
import { Table } from "../audit/audit";
import kit from "../../kit.module.css";
import { Line, Skeleton } from "../../skeleton";

type Edit = { action: "strike" | "unstrike" | "add" | "seen" | "dismiss" | "untier"; name?: string } | { action: "tier"; name: string; tier: ListTier };

const TIER_NAMES: ListTier[] = ["common", "uncommon", "rare"];

const count = (n: number) => n.toLocaleString("en-US");
const CHECKED = ["Not checked", "Checked once", "Checked twice"];

export function Lists({ onChanged }: { onChanged: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  return open ? <ListPage category={open} onBack={() => setOpen(null)} onChanged={onChanged} /> : <Overview onOpen={setOpen} />;
}

const HEAD = ["Question", "Answers", "Doubtful", "Brands", "Checked", "Seen", "Review"];

function Overview({ onOpen }: { onOpen: (category: string) => void }) {
  const [lists, setLists] = useState<ListRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<{ lists: ListRow[] }>("/api/admin/lists", { method: "GET" }).then(
      (r) => setLists(r.lists),
      (err) => setError(errorText(err)),
    );
  }, []);

  if (!lists)
    return error ? (
      <p role="alert">{error}</p>
    ) : (
      <Skeleton label="Loading the lists">
        <Line />
      </Skeleton>
    );
  const unseen = lists.filter((l) => !l.seen).length;
  return (
    <>
      <p className={admin.note}>
        Answers a Claude session researched for everyday questions. Read each list&apos;s doubtful answers and brands, strike what is wrong, add what is missing,
        then mark it seen.
      </p>
      <section aria-label="Researched questions" className={kit.card}>
        <h3 className={admin.cardTitle}>
          Researched questions {unseen > 0 && <span className={`${kit.chip} ${admin.decide}`}>{unseen} not seen</span>}
        </h3>
        <Table head={HEAD}>
          {lists.map((l) => (
            <tr role="row" key={l.category} aria-label={l.prompt}>
              <td role="cell" className={admin.strong} data-label={HEAD[0]}>{l.prompt}</td>
              <td role="cell" data-label={HEAD[1]}>{count(l.answers)}</td>
              <td role="cell" data-label={HEAD[2]}>{count(l.borderline)}</td>
              <td role="cell" data-label={HEAD[3]}>{count(l.brand)}</td>
              <td role="cell" data-label={HEAD[4]}>{CHECKED[l.passes]}</td>
              <td role="cell" data-label={HEAD[5]}>{l.seen ? <time dateTime={l.seen}>{l.seen}</time> : <span className={`${kit.chip} ${admin.decide}`}>Not seen</span>}</td>
              <td role="cell">
                <div className={admin.actions}>
                  <button type="button" className={admin.button} onClick={() => onOpen(l.category)}>
                    Open<span className="sr-only"> {l.prompt}</span>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </section>
    </>
  );
}

function ListPage({ category, onBack, onChanged }: { category: string; onBack: () => void; onChanged: () => void }) {
  const [view, setView] = useState<ListView | null>(null);
  const [typed, setTyped] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    () => api<ListView>(`/api/admin/lists?${new URLSearchParams({ category })}`, { method: "GET" }).then(setView),
    [category],
  );
  useEffect(() => {
    load().catch((err) => setError(errorText(err)));
  }, [load]);

  async function change(edit: Edit): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      await api("/api/admin/lists", { method: "POST", body: { ...edit, category } });
      await load();
      onChanged();
      return true;
    } catch (err) {
      setError(errorText(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function add(event: FormEvent) {
    event.preventDefault();
    if (await change({ action: "add", name: typed })) setTyped("");
  }

  const back = (
    <button type="button" className={kit.link} onClick={onBack}>
      ‹ All lists
    </button>
  );
  if (!view)
    return (
      <>
        {back}
        {error ? (
          <p role="alert">{error}</p>
        ) : (
          <Skeleton label="Loading the list">
            <Line />
          </Skeleton>
        )}
      </>
    );
  const { list, answers } = view;
  const needle = normalize(query);
  const found = answers.filter((a) => normalize(a.name).includes(needle));
  const changed = answers.filter((a) => a.struck || a.added || a.tierWas);
  return (
    <>
      {back}
      <section aria-label={list.prompt} className={kit.card}>
        <h3 className={admin.cardTitle}>{list.prompt}</h3>
        <p className={admin.note}>
          <b>{count(list.answers)}</b> answers, <b>{count(list.borderline)}</b> doubtful, <b>{count(list.brand)}</b> brands. {CHECKED[list.passes]}.{" "}
          {list.seen ? `Seen ${list.seen}.` : "Not seen yet."}
        </p>
        <p className={admin.note}>
          A strike counts from midnight Pacific, and Undo brings the answer back until then. An added answer counts from the next day. A new tier counts
          in the next day you draft or approve; an answer you added has to be in the file first. Claude writes your changes into the list&apos;s file later.
        </p>
        {error && <p role="alert">{error}</p>}
        <form onSubmit={add} className={admin.search}>
          <label className={admin.field}>
            <span className="sr-only">Add an answer</span>
            <input value={typed} maxLength={TYPED_ANSWER_MAX_LENGTH} placeholder="Add an answer" onChange={(e) => setTyped(e.target.value)} />
          </label>
          <button type="submit" className={admin.button} disabled={busy || typed.trim() === ""}>
            Add
          </button>
        </form>
        <div>
          <button type="button" className={list.seen ? admin.button : `${kit.primary} ${admin.button}`} disabled={busy} onClick={() => void change({ action: "seen" })}>
            Mark as seen
          </button>
        </div>
      </section>
      {changed.length > 0 && <Answers label="Changed by you" answers={changed} busy={busy} change={change} />}
      <Typed unlisted={view.unlisted} busy={busy} change={change} />
      <Answers label="Doubtful answers" answers={answers.filter((a) => a.borderline)} empty="No doubtful answers." busy={busy} change={change} />
      <Answers label="Brands" answers={answers.filter((a) => a.brand)} empty="No brands." busy={busy} change={change} />
      <Answers label="All answers" answers={found} empty="No answer has that in its name." busy={busy} change={change} key={needle}>
        <div className={admin.search}>
          <label className={admin.field}>
            <span className="sr-only">Part of an answer&rsquo;s name</span>
            <input value={query} placeholder="Part of any name" onChange={(e) => setQuery(e.target.value)} />
          </label>
        </div>
      </Answers>
    </>
  );
}

const TYPED_HEAD = ["Text", "Players", "Change"];

// What players typed on this list's clock days that no list has, most players first. A text can be added to the list (the Add
// above) or dismissed, which keeps it from showing again however many more players type it. Guests' texts are not kept.
function Typed({ unlisted, busy, change }: { unlisted: Unlisted[]; busy: boolean; change: (edit: Edit) => Promise<boolean> }) {
  const [shown, setShown] = useState(POOL_PAGE_SIZE);
  return (
    <section aria-label="Typed on no list" className={kit.card}>
      <h3 className={admin.cardTitle}>
        Typed, on no list <span className={admin.muted}>{count(unlisted.length)}</span>
      </h3>
      <p className={admin.note}>Texts signed-in players typed on this question that no list has, the most typed first. Add one to the list, or dismiss it.</p>
      {unlisted.length === 0 ? (
        <p>No text is waiting.</p>
      ) : (
        <Table head={TYPED_HEAD}>
          {unlisted.slice(0, shown).map((u) => (
            <tr role="row" key={u.text} aria-label={u.text}>
              <td role="cell" className={admin.strong} data-label={TYPED_HEAD[0]}>{u.name}</td>
              <td role="cell" data-label={TYPED_HEAD[1]}>{count(u.players)}</td>
              <td role="cell">
                <div className={admin.actions}>
                  <button type="button" className={admin.button} disabled={busy} onClick={() => void change({ action: "add", name: u.name })}>
                    Add<span className="sr-only"> {u.name}</span>
                  </button>
                  <button type="button" className={admin.button} disabled={busy} onClick={() => void change({ action: "dismiss", name: u.text })}>
                    Dismiss<span className="sr-only"> {u.name}</span>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}
      {shown < unlisted.length && (
        <button type="button" className={kit.link} onClick={() => setShown(shown + POOL_PAGE_SIZE)}>
          Show more ({count(shown)} of {count(unlisted.length)})
        </button>
      )}
    </section>
  );
}

const ANSWER_HEAD = ["Answer", "About it", "Change"];

// One card of answers, a page of them at a time, as the answer pool pages (POOL_PAGE_SIZE).
function Answers({ label, answers, empty, busy, change, children }: {
  label: string;
  answers: AnswerView[];
  empty?: string;
  busy: boolean;
  change: (edit: Edit) => Promise<boolean>;
  children?: ReactNode;
}) {
  const [shown, setShown] = useState(POOL_PAGE_SIZE);
  return (
    <section aria-label={label} className={kit.card}>
      <h3 className={admin.cardTitle}>
        {label} <span className={admin.muted}>{count(answers.length)}</span>
      </h3>
      {children}
      {answers.length === 0 ? (
        <p>{empty}</p>
      ) : (
        <Table head={ANSWER_HEAD}>
          {answers.slice(0, shown).map((a) => (
            <AnswerRow key={a.name} answer={a} busy={busy} change={change} />
          ))}
        </Table>
      )}
      {shown < answers.length && (
        <button type="button" className={kit.link} onClick={() => setShown(shown + POOL_PAGE_SIZE)}>
          Show more ({count(shown)} of {count(answers.length)})
        </button>
      )}
    </section>
  );
}

function AnswerRow({ answer: a, busy, change }: { answer: AnswerView; busy: boolean; change: (edit: Edit) => Promise<boolean> }) {
  return (
    <tr role="row" aria-label={a.name}>
      <td role="cell" className={admin.strong} data-label={ANSWER_HEAD[0]}>
        {a.struck ? <s>{a.name}</s> : a.name}
      </td>
      <td role="cell" data-label={ANSWER_HEAD[1]}>
        <span className={admin.muted}>{a.tier}</span>
        {a.struck && <span className={kit.chip}> Struck</span>}
        {a.added && <span className={kit.chip}> Added</span>}
        {a.tierWas && <span className={kit.chip}> Was {a.tierWas}</span>}
        {a.borderline && <span className={`${kit.chip} ${admin.decide}`}> Doubtful</span>}
        {a.brand && <span className={kit.chip}> Brand</span>}
      </td>
      <td role="cell">
        <div className={admin.actions}>
          {!a.struck && (
            <button type="button" className={admin.button} disabled={busy} onClick={() => void change({ action: "strike", name: a.name })}>
              Strike<span className="sr-only"> {a.name}</span>
            </button>
          )}
          {a.struck?.undoUntil && (
            <>
              <button type="button" className={admin.button} disabled={busy} onClick={() => void change({ action: "unstrike", name: a.name })}>
                Undo<span className="sr-only"> striking {a.name}</span>
              </button>
              <span className={admin.muted}>Until midnight</span>
            </>
          )}
          {a.struck && !a.struck.undoUntil && <span className={admin.muted}>Not an answer now</span>}
          {!a.struck && !a.added && (
            <label className={kit.select}>
              <span className="sr-only">Tier of {a.name}</span>
              <select value={a.tier} disabled={busy} onChange={(e) => void change({ action: "tier", name: a.name, tier: e.target.value as ListTier })}>
                {TIER_NAMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          )}
          {a.tierWas && (
            <button type="button" className={admin.button} disabled={busy} onClick={() => void change({ action: "untier", name: a.name })}>
              Undo<span className="sr-only"> the tier change of {a.name}</span>
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
