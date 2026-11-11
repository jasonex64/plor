"use client";

// The recap when a run ends in the play frame (docs/milestones/M14-14c-8-plain-game-1.md, Plan 2; human, 2026-11-10:
// "Answer recap before results"): how it ended, each answer with its points, the total, then See results. Shared by both
// games, which say their own words in the props. The heading takes focus, since the question or reveal that had it is
// gone (WCAG 2.2 2.4.3). A screen reader hears the result and the total once each (4.1.3).
import { useEffect, useRef } from "react";
import { StatusMessage } from "./play-frame";
import kit from "./kit.module.css";

export function Recap({
  heading,
  answers,
  total,
  onSeeResults,
}: {
  heading: string;
  answers: { key: number; text: string }[];
  total: string;
  onSeeResults: () => void;
}) {
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => title.current!.focus(), []);
  return (
    <div className={`${kit.card} ${kit.soft}`}>
      <h2 ref={title} tabIndex={-1}>
        {heading}
      </h2>
      <StatusMessage text={heading} />
      <ol className={kit.rows} aria-label="Your answers">
        {answers.map((a) => (
          <li key={a.key} className={kit.row}>
            {a.text}
          </li>
        ))}
      </ol>
      <p>
        <strong>{total}</strong>
      </p>
      <StatusMessage text={total} />
      <button type="button" className={kit.primary} onClick={onSeeResults}>
        See results
      </button>
    </div>
  );
}
