"use client";

// The kit's sample page (docs/milestones/M20-design-rules-and-clean-up.md, 20a; answer 2: "Also a live sample page"):
// every piece docs/DESIGN.md's Rules name, at rest and disabled, live under the pointer, the press and the keyboard, in
// the current theme. Nothing here is data: it is the kit drawn as the screens draw it.
import type { ReactNode } from "react";
import admin from "../admin.module.css";
import kit from "../../kit.module.css";
import { ButtonLink } from "../../button-link";
import { Reactions } from "../../reactions";
import type { Reactions as ReactionsData } from "@/reactions/reactions";
import { Looks } from "./looks";
import styles from "./kit.module.css";

// Each section is named as DESIGN.md's Rules name the piece, which the e2e reads.
function Piece({ name, when, children }: { name: string; when: string; children: ReactNode }) {
  return (
    <section aria-label={name} className={kit.card}>
      <h3 className={admin.cardTitle}>{name}</h3>
      <p className={styles.when}>{when}</p>
      {children}
    </section>
  );
}

// The heading and small-text sizes in use (the M20 audit, 2026-11-16); which stay is 20f's question to the human.
const HEADINGS = ["2.5rem", "1.875rem", "1.625rem", "1.5rem", "1.25rem"];
const SMALL = ["0.9375rem", "0.875rem", "0.8125rem", "0.75rem"];
// The names box's sample, not a rule: three 😂, one of them yours, and one ❤️ (docs/milestones/M20-design-rules-and-clean-up.md, 20j).
const SAMPLE_REACTIONS: ReactionsData = { counts: [{ emoji: "😂", count: 3, names: ["Ana", "Sam"] }, { emoji: "❤️", count: 1, names: ["Ben"] }], mine: "😂" };

export function Kit() {
  return (
    <div className={styles.page}>
      <p>Every piece of the kit, as the screens draw it. Hover, press and tab through them; each is also shown disabled.</p>
      <Piece name="Main button" when="A screen's one main action.">
        <div className={kit.chips}>
          <button type="button" className={kit.primary}>Play</button>
          <button type="button" className={kit.primary} disabled>Play</button>
        </div>
      </Piece>
      <Piece name="Flat button" when="Every action that isn't the main one, a button or a link drawn as one: the hover rule, no shadow, no press.">
        <div className={kit.chips}>
          <button type="button">How to play</button>
          <button type="button" disabled>How to play</button>
          <ButtonLink href="/admin/kit">A link drawn as a button</ButtonLink>
          <button type="button" className={kit.link}>Profile</button>
        </div>
      </Piece>
      <Piece name="Danger" when="A warning or a step that can't be undone: the danger colour on a button's edge and text, or a chip's.">
        <div className={kit.chips}>
          <button type="button" className={`${kit.link} ${kit.danger}`}>Delete</button>
          <span className={`${kit.chip} ${kit.danger}`}>Not drafted</span>
        </div>
      </Piece>
      <Piece name="Close button" when="The one × for a frame, a dialog or a sheet: no border, the hover rule's square fill.">
        <div className={kit.chips}>
          <button type="button" className={kit.close} aria-label="Close">
            ×
          </button>
        </div>
      </Piece>
      <Piece name="Text link" when="A link inside running text: the accent colour, underlined.">
        <p>
          Read the <a href="/privacy">Privacy</a> page.
        </p>
      </Piece>
      <Piece name="Field" when="Typed input, at the controls' one 44px height.">
        <label htmlFor="kit-field">Your answer</label>
        <input id="kit-field" placeholder="Type here" />
        <input aria-label="Disabled field" placeholder="Disabled" disabled />
        <select aria-label="A choice" defaultValue="Offbeat">
          <option>Offbeat</option>
          <option>Fragments</option>
        </select>
      </Piece>
      <Piece name="Card" when="A section of a page. The soft card is the one tinted card on a screen.">
        <div className={`${kit.card} ${kit.soft}`}>
          <h2>A soft card</h2>
          <p>Its heading is the card heading.</p>
        </div>
      </Piece>
      <Piece name="Row" when="One item in a list. Your own row takes the soft tint; any row takes it under the pointer.">
        <ul className={kit.rows}>
          <li className={kit.row}>
            <span className={kit.badge} data-place="1" />
            <span className={kit.grow}>A friend</span>
            <span className={kit.chip}>Question 3</span>
          </li>
          <li className={`${kit.row} ${kit.you}`}>
            <span className={kit.badge} data-place="2" />
            <span className={kit.grow}>You</span>
            <span className={kit.chip}>620</span>
          </li>
        </ul>
      </Piece>
      <Piece name="Chip" when="A short fact beside something else; the dark, safe and caught kinds.">
        <div className={kit.chips}>
          <span className={kit.chip}>7 rounds</span>
          <span className={`${kit.chip} ${kit.dark}`}>Question 1 of 7</span>
          <span className={`${kit.chip} ${kit.safe}`}>Safe</span>
          <span className={`${kit.chip} ${kit.caught}`}>Caught</span>
        </div>
      </Piece>
      <Piece name="Badge" when="A place or a count in a round badge; the first is the accent one.">
        <div className={kit.chips}>
          <span className={`${kit.badge} ${kit.hot}`} data-place="1" />
          <span className={kit.badge} data-place="2" />
        </div>
      </Piece>
      <Piece name="Names box" when="Who used a reaction, under its line: hover or focus a reaction, or hold it on a phone.">
        <Reactions reactions={SAMPLE_REACTIONS} />
      </Piece>
      <Piece name="Hover rule" when="Anything pressable that isn't the main button: the soft fill and the text colour under the pointer.">
        <a href="/admin/kit" className={`${kit.hover} ${styles.hoverSample}`}>
          A pressable thing
        </a>
      </Piece>
      <Piece name="Headings and small text" when="The sizes in use today; which stay is 20f's question.">
        {HEADINGS.map((size) => (
          <p key={size} className={styles.sample} style={{ fontSize: size }}>
            Heading {size}
          </p>
        ))}
        {SMALL.map((size) => (
          <p key={size} className={styles.small} style={{ fontSize: size }}>
            Small text {size}
          </p>
        ))}
      </Piece>
      <Looks />
    </div>
  );
}
