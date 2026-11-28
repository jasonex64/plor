"use client";

// The kit's sample page (docs/milestones/M20-design-rules-and-clean-up.md, 20a; answer 2: "Also a live sample page"):
// every piece docs/DESIGN.md's Rules name, at rest and disabled, live under the pointer, the press and the keyboard, in
// the current theme. Nothing here is data: it is the kit drawn as the screens draw it.
import type { ReactNode } from "react";
import admin from "../admin.module.css";
import kit from "../../kit.module.css";
import { ButtonLink } from "../../button-link";
import { PlaceBadge } from "../../place-badge";
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
// The kit's text sizes (kit.module.css; docs/milestones/M20-design-rules-and-clean-up.md, answers 60 to 62).
const SIZES = [
  ["--text-display", "A page's name, a big number"],
  ["--text-heading", "A card's heading"],
  ["--text-subheading", "A heading in a card"],
  ["--text-body", "The body"],
  ["--text-note", "A note, a label, a flat button"],
  ["--text-caption", "The reactions line, a date"],
  ["--text-label", "A chip, a badge"],
];
// The names box's sample, not a rule: three 😂, one of them yours, and one ❤️ (docs/milestones/M20-design-rules-and-clean-up.md, 20j).
const SAMPLE_REACTIONS: ReactionsData = { counts: [{ emoji: "😂", count: 3, names: ["Ana", "Sam"] }, { emoji: "❤️", count: 1, names: ["Ben"] }], mine: "😂" };

// The board's places on the sample: the top three, each with its drawing, and the first plain one
// (docs/milestones/M20-design-rules-and-clean-up.md, 20n-6a, answers 94 to 96).
const PLACES = [1, 2, 3, 4];

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
          <button type="button" className={kit.link}>Cancel</button>
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
      </Piece>
      <Piece name="Dropdown" when="A choice among many, with the kit's own arrow; a choice of two or three is the Game switch.">
        <label className={kit.select}>
          <span className="sr-only">A choice</span>
          <select defaultValue="Friends">
            <option>Friends</option>
            <option>Book Club</option>
          </select>
        </label>
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
      <Piece name="Board row" when="A row on a board: a hairline with the board's game edge; your own row the accent edge, in bold.">
        <ul className={`${kit.rows} ${kit.offbeat}`}>
          <li className={`${kit.row} ${kit.board}`}>
            <span className={`${kit.badge} ${kit.hot}`} data-place="1" />
            <span className={kit.grow}>A friend</span>
            <span>1,210</span>
          </li>
          <li className={`${kit.row} ${kit.board} ${kit.you}`}>
            <span className={kit.badge} data-place="2" />
            <span className={kit.grow}>You</span>
            <span>1,140</span>
          </li>
        </ul>
      </Piece>
      <Piece name="Comment row" when="A comment: no box, so the card's edge is the one strong line.">
        <ul className={kit.rows}>
          <li className={`${kit.row} ${kit.bare}`}>
            <span className={kit.grow}>that last question was brutal</span>
          </li>
        </ul>
      </Piece>
      <Piece name="Chip" when="A short fact beside something else; the dark and safe kinds.">
        <div className={kit.chips}>
          <span className={kit.chip}>7 rounds</span>
          <span className={`${kit.chip} ${kit.dark}`}>Question 1 of 7</span>
          <span className={`${kit.chip} ${kit.safe}`}>Safe</span>
        </div>
      </Piece>
      <Piece name="Badge" when="A place or a count in a round badge; the first is the accent one. On a board the top three stand out: a crown, then ribbon tails.">
        <div className={kit.chips}>
          <span className={`${kit.badge} ${kit.hot}`} data-place="1" />
          <span className={kit.badge} data-place="2" />
        </div>
        <div className={`${kit.chips} ${styles.places}`}>
          {PLACES.map((place) => (
            <PlaceBadge key={place} place={place} />
          ))}
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
      <Piece name="Text sizes" when="Every text by its role, from the kit's seven sizes.">
        {SIZES.map(([size, role]) => (
          <p key={size} className={styles.sample} style={{ fontSize: `var(${size})` }}>
            {role} <span className={styles.small}>{size}</span>
          </p>
        ))}
      </Piece>
      <Looks />
    </div>
  );
}
