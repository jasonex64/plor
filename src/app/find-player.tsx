"use client";

// Find a player, over the leaderboard's graphs (docs/milestones/M14-14b-14-leaderboard-graph.md, answers 16, 18, 19
// and 25): a text field with suggestions, as the WAI-ARIA APG Combobox's list autocomplete with automatic selection
// ("About This Pattern", item 3). The players whose names start with what's typed are listed, the first selected;
// Down and Up move through them and wrap; Enter or leaving the field takes the selected one; Escape closes the list,
// then clears the field. The pick is the board's, so a tap on a graph shows here too.
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Avatar } from "./avatar";
import styles from "./race.module.css";

export type Findable = { key: string; name: string };

export function FindPlayer({ players, picked, onPick }: { players: Findable[]; picked: string | null; onPick: (key: string | null) => void }) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const pickedName = players.find((p) => p.key === picked)?.name ?? "";
  const [text, setText] = useState(pickedName);
  // The pick this field last showed: a pick made elsewhere (a tap) puts its name in the field.
  const [shown, setShown] = useState(picked);
  if (shown !== picked) {
    setShown(picked);
    setText(pickedName);
  }
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const typed = text.trim().toLowerCase();
  const matches = typed && text !== pickedName ? players.filter((p) => p.name.toLowerCase().startsWith(typed)) : [];
  const listed = open && matches.length > 0;

  function pick(player: Findable | null) {
    setShown(player?.key ?? null);
    setText(player?.name ?? "");
    setOpen(false);
    onPick(player?.key ?? null);
  }

  // A name typed in full is picked as it's typed; anything else clears the pick until a suggestion is taken.
  function type(value: string) {
    const exact = players.find((p) => p.name.toLowerCase() === value.trim().toLowerCase()) ?? null;
    setText(value);
    setOpen(true);
    setActive(0);
    setShown(exact?.key ?? null);
    if ((exact?.key ?? null) !== picked) onPick(exact?.key ?? null);
  }

  function key(event: KeyboardEvent<HTMLInputElement>) {
    const count = matches.length;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (count === 0) return;
      event.preventDefault();
      const down = event.key === "ArrowDown";
      if (!listed) {
        setOpen(true);
        setActive(down ? 0 : count - 1);
      } else {
        setActive((active + (down ? 1 : count - 1)) % count);
      }
    } else if (event.key === "Enter" && listed) {
      event.preventDefault();
      pick(matches[active]);
    } else if (event.key === "Escape") {
      if (listed) setOpen(false);
      else pick(null);
    }
  }

  return (
    <div>
      <label htmlFor={`${id}-field`} className={styles.findLabel}>
        Find a player
      </label>
      <div className={styles.field}>
        <input
          ref={input}
          id={`${id}-field`}
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={listed}
          aria-controls={listed ? `${id}-list` : undefined}
          aria-autocomplete="list"
          aria-activedescendant={listed ? `${id}-${active}` : undefined}
          aria-describedby={`${id}-hint`}
          value={text}
          onChange={(e) => type(e.target.value)}
          onKeyDown={key}
          onBlur={() => (listed ? pick(matches[active]) : setOpen(false))}
        />
        {text !== "" && (
          <button
            type="button"
            className={styles.clear}
            aria-label="Clear"
            onClick={() => {
              pick(null);
              input.current?.focus();
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
      </div>
      {listed && (
        <ul id={`${id}-list`} role="listbox" aria-label="Players" className={styles.options}>
          {matches.map((p, i) => (
            // The field keeps focus (APG: focus stays on the combobox), so a press doesn't blur it first.
            <li
              key={p.key}
              id={`${id}-${i}`}
              role="option"
              aria-selected={i === active}
              className={styles.option}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(p)}
            >
              <Avatar name={p.name} />
              {p.name}
            </li>
          ))}
        </ul>
      )}
      {typed && text !== pickedName && matches.length === 0 && <p className={styles.none}>No player called “{text}” here.</p>}
      <p id={`${id}-hint`} className={styles.hint}>
        Or choose someone&apos;s line on a graph. You&apos;ll see them in both weeks.
      </p>
    </div>
  );
}
