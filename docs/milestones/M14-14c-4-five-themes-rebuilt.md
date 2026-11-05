# M14 — 14c-4, five themes rebuilt to the human's spec

**Status:** in review (drafted 2026-11-05 from four rounds of guided questions; approved 2026-11-05: "Approve, start").

## Goal
Rebuild Off the Menu, Afterglow (Asterism until now), Uncounted, Marmo and Moonbrew on their private claude.ai pages to the human's spec, so the human can choose the one theme that becomes the game.

## Who uses it / what breaks without it
- Used by: the human, choosing the game's identity (14c-3's open step: "The human picks").
- Breaks without it: the five mockups fail the human's own spec (several fonts, 12 to 15 fps, mascots behind the prompt, large result cards, colour changes with no visible cause), so the choice would be made on looks the human has already rejected, and `/play` has no design to build.

## Source
- **The spec:** "Daily Game — UI Moodboard & Spec" (https://claude.ai/artifact/Fh9HjdcC57yr7mtv16pTAs), the human's own doc, read at rev 37 on 2026-11-05. It is the source of truth for the look; the build reads its latest version, and a change there beats this ticket. No entry in SOURCES.md covers the game's look (as in 14c-3); the human's doc and answers stand in for one.
- **14c-3** (`docs/milestones/M14-14c-3-pixel-directions.md`): its answers stand unless the table below changes them.
- CLAUDE.md, "Ask before designing".

## Answers (human, 2026-11-05)
Round 1
1. How players meet the themes: "still chooisng one. if i like 2 or 3 then they can be spinoffs. also we can just iterate and develop more themes later".
2. Rollout: "All five pages together".
3. Phone: "Phone gets own layout (Recommended)". (The 14c-3 harness at 390×844, 3× device pixels, gives scale 8, so 146 of 640 source pixels across: all inside the spec's 40% quiet centre column.)
4. The answer beat: "Foreground stills only (Recommended)".

Round 2
5. Score: "Both (Recommended)": the HUD panel holds the number, and the scene shows progress.
6. Art: "code only u can use nodejs or typescript or anything i trust u".
7. Text and motion: "not sure what this means, but for text it's okay since it can technically move around and maybe itll break the grid a bit? i just want it to be more fluid ( reaalized i dont like the 12 fps type and prefer smoother)".
8. Font: "Test sheet first (Recommended)".

Round 3
9. Frame rate: "60 fps everything (Recommended)".
10. Grid: "can do the art snaps text can glide but subject to change later".
11. Asterism's name: "Claude proposes names (Recommended)".
12. The doc: "Add both to your doc (Recommended)": a palette section and a per-theme results table, leaving the human's text alone.

Round 4
13. Name: "Afterglow (Recommended)".
14. Source: "Private folder (Recommended)".

## What this changes from 14c-3
| 14c-3 | Now | Why |
|---|---|---|
| Answer 6, pixel font varies per direction | One font for the whole game | The spec's Type rule |
| Answer 14, frame rate varies per direction | 60 fps on all five | Answer 9 |
| Answer 9, text on the pixel grid | Art stays on the grid; text may glide while moving and lands on the grid when still | Answers 7, 10; "subject to change later" |
| Direction J, Asterism (star chart) | Afterglow (fireworks) | The spec's theme table; answer 13 |
| The source in a temp folder | A private folder (Plan, step 1) | Answer 14; a temp folder can vanish between sessions |

Unchanged: 640×360 with whole-number nearest-neighbour scaling, fill and crop, shifts at questions 3 and 6, always animating, real page text, the rules and the mock's scoring.

## Design (proposed)
**Screen.** The spec's Layout rules: a fixed HUD on its own opaque panel, top-right; a quiet centre column; the mascot to one side; a compact, centred result card.

**Portrait phones.** Any viewport taller than wide draws a second composition of the same world at the same crop: mascot and key prop moved into the visible slice, above or beside the prompt, never behind it.

**The answer beat.** The word makes one move. Mascot, HUD and interface hold still; the backdrop keeps idling. Reactions (crow, fox, dragon) wait until the beat ends. Quality shows in the size of the move:

| Theme | The word's move | A rarer answer | Scene tracker (answer 5) |
|---|---|---|---|
| Off the Menu | Flips into the ramen pot | Flips higher and lands with a bigger splash | Lanterns light along the street |
| Afterglow | Launches and bursts | Climbs higher and bursts wider | The skyline's show builds, shell by shell |
| Uncounted | Tumbles into the hoard | Bigger spray of coins and gems | The hoard grows; the spec's chest, crown and goblets appear |
| Marmo | Is struck by the chisel and shakes | Larger chunks fall from the block | The sculpture forms (the spec's Keep) |
| Moonbrew | Drops into the pot | Bigger swirl and burst, stronger colour change | The brew's colour deepens |

**Escalation.** Each shift at questions 3 and 6 is caused by something visible: the sun moves, lanterns light, clouds drift. No bare palette fades.

**Art.** Drawn by code only, with no generated sprites: boxy characters with 3+ colour ramps, depth layers and varied silhouettes. Every motion stays a function of time and a seeded index, so nothing accumulates over long runs.

## Acceptance criteria
- [x] A private font test page shows the candidates on prompt, answer and HUD across all five themes, and the human picks one before the rebuild starts. (Four options on the last page, after two rounds; the Evidence has them.)
- [x] All five pages are published and J's page is titled Afterglow. (At new links, not the existing ones: Source diff.)
- [x] Every box in the spec's Acceptance checklist has pass or fail per theme, with screenshots, in a results table in the human's doc.
- [x] Each theme's palette is written as hex in the human's doc; the human's existing words are unchanged. (The font decision's box is ticked; the palettes wait for the human to lock.)
- [x] A script reports one font family across every screen of every theme.
- [x] Each page runs at 60 fps time steps, and its average draw time stays under 16.7 ms at 1920×1080 and 390×844 in a scripted run; worst frames are reported too. This is desktop Chrome, not proof for a real phone, so the human checks on their phone.
- [x] Scene art sits on the grid: a script logs every drawing call and finds none off the art grid. (The first wording, sampling the screen, couldn't fail: Review.)
- [x] Panels and the word's landing sit on the grid: a script reports each one's position as a whole multiple of the scale. (Reworded: Source diff.)
- [x] At 390×844, each theme's mascot and key prop are visible and clear of the prompt, in screenshots at Q1, Q3 and Q6.
- [ ] A clip per theme shows the answer beat: foreground still, backdrop moving. (Frame strips exist, and a script proves the clocks; video doesn't. Waits on the human: Source diff.)
- [x] No console errors in a scripted run at either size.

## Out of scope
- Building any theme into `/play` (the next sub-ticket, after the human picks). WCAG 2.2.2 and the rest of answer 12 in 14c-3 go to DECISIONS.md then.
- The other six directions (A, C, D, E, F, G): kept for other games (14c-3, answer 20).
- Spinoffs and new themes (answer 1).
- Rule changes.
- Copying any reference's art, palette or words; Krillion and refs 18 to 20 give ideas only. Their images stay in the human's doc.
- 14c-3's known sample-data gap: on Q3 and Q7, every host pick holds a taken letter, so those questions can't be caught.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 60 fps | All five themes | Human, 2026-11-05 (answer 9) |
| 16.7 ms | Draw budget per frame | Worked out from 60 fps (1000 ÷ 60) |
| 40% of width | The quiet centre column | Human's spec, default, Layout |
| 35% of screen height at most | The result card | Human's spec, default, Layout |
| 3+ colours | Every material's ramp | Human's spec, Art |
| Top-right | The HUD | Human's spec, default, Layout |
| 640×360, whole-number scale, shifts at Q3 and Q6, 390×844 and 1920×1080 checks | Every theme | 14c-3 (answers 8, 10, 13, and its Evidence) |
| Points, 7 questions, 20 s, sample data | The mock's run | 14c-3's Numbers (unchanged) |
| 24 art pixels, 0.25, four tf steps of 0.37, 1.1, 2.3 and 4.7 s | `themes/check.mjs`: the region around a mascot, the share of its changed pixels that may follow the backdrop clock, and how far the foreground clock is stepped | Proposed by Claude; measured 0 to 5% on all five |
| 0.1 | The share of foreground pixels that may also move with the backdrop clock, in `themes/check.mjs` (a spark passing a mascot is fine; a moving mascot isn't) | Proposed by Claude; measured 0 to 7% on all five |
| Art-pixel spacing in the core (EDGE 6, the side mascot zone 40, 60, 8, 2, the prompt offsets 34 and 24), the refused-letter shake (2, −2, 1, 0 art pixels at 40 ms), type sizes 13 and 20 × K, line heights 1.15 and 1.05, panel padding and gaps | The review pages only | Proposed by Claude for the human to judge on the pages; not carried into the app without the human's word |
| K = min(3, height ÷ 375, width ÷ 195) | The type scale, so the card stays under 35% | Worked out from the spec's 35% with the longest sample answer at six more screen sizes |
| The word's move, tracker and backdrop timings; the portrait mascot's position | The review pages only | **Proposed by Claude for the human to judge on the pages**, like 14c-3's mock timings; not carried into the app without the human's word |
| Two font candidates | The font test page | Human's spec, Type: "Shortlist 1–2 candidates" |
| Handjet at weight 400, 15 × K CSS px | The one font and its sizes | Human, 2026-11-05 ("Handjet heavier"); the size is proposed by Claude, on the test page the human chose from |
| 380 art pixels (stack below), 300 art pixels (card), 0.9 s (react), 36% of the visible height (the stacked prompt's top), 256 (the column, the spec's 40% of 640) | The review pages' layout and pacing | Proposed by Claude for the human to judge on the pages; not carried into the app without the human's word |

## Plan
1. Make `C:/Users/jason/RIFF-mocks` outside the repo, with its own local git, and copy in the five pages and the shared harness and game script from the temp folder. A Node script builds each theme into one self-contained HTML file. The handoff records the path. This folder lives on this PC only.
2. Build the font test page; the human picks.
3. Rebuild the shared parts to one standard: 60 fps, the HUD, the result card, text gliding and landing, the portrait switch, the answer beat.
4. Five subagents rebuild one theme each, from the spec's theme table and this ticket.
5. Check each theme by script at both sizes, then publish at its existing link.
6. Add the palettes and results table to the human's doc.
7. Review (the `reviewer` agent), then the human tries the pages and chooses.

Experiment, step 3. Expected: 60 fps stays under 16.7 ms on average, because 14c-3 measured 0.3 to 8.5 ms per frame. Reason for doubt: the new art is richer, and those frames ran at lower rates. Disproved by: a theme's average over budget at either size. If so, stop and ask rather than quietly lowering the rate.

## Removes
- The per-direction frame rates (`FPS` of 30, 15, 24, 24 and 15, and the fox's 12).
- The per-theme fonts (seven across the five pages, down to one), blackletter included.
- Mascots behind the prompt, and large result cards.
- The five pages' current versions, replaced at the same links.
- The temp folder as the source's home.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| Ticket: republished at the existing links | Five new private pages; the old links still show the 14c-3 versions | The publish tool refuses a replacement until each old page is read whole, and the five were too large for one session (about 40,000 tokens each). The human keeps the new links (2026-11-05: "Keep the new links") |
| Ticket: each text box on the grid | Panels and the word's landing on the grid; text inside a panel isn't | Handjet's pixels are finer than the art's (round 5, "Loosen it"), so a text box's grid position means nothing to its letters; the human said text "can technically move around and maybe itll break the grid a bit" (answer 7) |
| Ticket: a clip per theme | Frame strips in the human's doc, plus a script proving the clocks | The live pages show the motion. Waits on the human |
| Ticket: the scene tracker as the only themed progress | Moonbrew adds seven studs on the pot | The builder's addition, so each step reads clearly |
| Plan: Moonbrew's pot among the backdrop's idle motion | The pot's rock and jolt run on the foreground clock, and only its surface, steam and fire on the backdrop's | Review: the pot carries the tracker, so it's foreground |

## Evidence
**The font test page, waiting for the human's pick:** https://claude.ai/artifact/WKxNEsxefS4QGiUYsTYuHr (private, published 2026-11-05). Scripts: `fonts/measure.mjs`, `sheet.mjs`, `capture.mjs`, `build.mjs` and `check.mjs` in `C:/Users/jason/RIFF-mocks`.

Hypothesis (`fonts/measure.mjs`): most candidates have fixed-width digits, and each has one native grid. Half disproved: of 13 Google pixel fonts, 7 have proportional digits by default. Jersey's digits are fixed once `tnum` is on, and Pixelify Sans's and Silkscreen's stay proportional, which fails the rule that a new font needs tabular figures in Google's file (HANDOFF, Fonts).

Shortlist: the size that keeps one font pixel equal to one art pixel is 56/3 art pixels for Jersey 10 and 8 for Tiny5. Jersey 20's is 34, too large for a phone. Both have lowercase and tabular digits. Phone line length as measured by the page: Jersey 10 about 17 letters, Tiny5 about 34. `fonts/check.mjs` at 1000×900 and 390×844: no console errors, screenshots read by eye. It ran the page before the phone table fix; after that fix the page was rebuilt and published without a second run. The phone view in that run was at scale 7, not 8, because the page's 16px gutters leave 358px for the stage.

Round 5 of questions, after the first page (human, 2026-11-05): "dont really like either". Put off by: "Too heavy or blocky,Hard to read". Feel: "Clean and elegant". The one-font-pixel-to-one-art-pixel rule: "Loosen it (Recommended)", so a font may use finer pixels than the art. Next: "Wider sheet (Recommended)".

The page at the same link now shows eight fonts on all five themes, the human naming favourites by number: Galmuri 11, 9 and 14, DotGothic16, Handjet, VT323, Doto, Bitcount Single. The top two then go on the wide and phone test.

Hypothesis (`fonts/sheet2.mjs`): the Galmuri faces and DotGothic16 read cleanest and have one-width digits; the thin variable fonts lose letter shapes. Held by eye for Doto and Bitcount Single; Handjet held its shapes, and is on the sheet. Bitcount Prop Single (two digit widths) and Pixelify Sans (two, and heavy) are out. Galmuri is OFL-1.1 (`fonts/outside/Galmuri-LICENSE.txt`, package `galmuri` 2.40.3 from npm via jsDelivr); its files carry Korean glyphs at 430 to 565 KB each, so a build into the app needs a Latin subset. The other seven fonts' licences are unverified. Six other open pixel fonts were looked up by name on npm and not found there, so the sheet has one family from outside Google, fewer than planned. `fonts/check.mjs` at 1200×1500 and 390×844, after the card height fix: no console errors, no sideways scroll, no HUD overlapping a question box. Its font-loaded check reports DotGothic16 as not loaded, while the screenshot shows it rendered; the check is unreliable for that font, cause not found.

The human's favourites from the sheet (2026-11-05): "i like handjet, vt323, and galmuri9". All three went on the wide and phone test at the same link, on all five themes, with a heavier Handjet (weight 400) added for the human to compare.

Hypothesis (`fonts/check.mjs`): all three fit every panel at both sizes; Handjet at weight 300 is at risk on Marmo's light panel. Fit held: no panel overlaps the HUD or leaves its stage, for all four options at 1000×900 and 390×844, no sideways scroll, no console errors. The risk held by eye: at weight 300 on Marmo, Handjet is faint, and on a 1× display it shows coloured fringes from the browser's text smoothing; that smoothing isn't in the page's control on Windows. Phone line length as measured by the page: Galmuri 9 about 26 letters, Handjet about 27, VT323 about 21 (at weight 300 for Handjet; the heavier one wasn't measured). All three have one-width digits; licences read: Galmuri, Handjet and VT323 are OFL 1.1.

**The game's one font: Handjet, weight 400** (human, 2026-11-05: "Handjet heavier"). This settles the spec's first open decision.

**The build (2026-11-05).** The source is in `C:/Users/jason/RIFF-mocks/themes/`. The new pages, private: Off the Menu https://claude.ai/artifact/HCtwNQQWYyXbdGyNzZdYWp, Afterglow https://claude.ai/artifact/D6rt1tR2oi463Zf5WxJ8yk, Uncounted https://claude.ai/artifact/QC2yRYk5SzDrdEn3hxzD3w, Marmo https://claude.ai/artifact/GFdWVG8UNQ9dta1tBUYbox, Moonbrew https://claude.ai/artifact/KNhC1G8FttiSHVtBeHtSQV.

`node themes/check.mjs <id>`, run one theme at a time on the final builds: ALL PASS on all five. Average draw time 0.61 to 4.51 ms and worst frame 11.90 ms (Uncounted, wide, Q6) against the 16.7 ms budget, 60 fps; result card at most 34% with the longest answer on every end at 1366×768, 1440×900, 1024×768, 375×667, 360×640 and 844×390. Desktop headless Chrome only: a real phone is untried.

`node themes/mutants.mjs`: nine broken builds, all caught. On Afterglow: foreground never stops (6 FAIL lines), backdrop stops in the beat (6), off-grid drawing (2), card too big (6), taken letters allowed (2), HUD moves (2), second font (2). The reviewer repeated those seven on Uncounted with the same counts. On Moonbrew: foreground drawn on the backdrop clock (12), and taken letters stripped mid-composition (2), which gave the reviewer's "lemlemolemon".

Hypothesis, step 3: held. Draw times stayed well inside 60 fps.

Proof sheets, palettes and the per-theme results are in the human's doc. By eye, in the screenshots: the mascot's place, repeated shapes, and each Q3 shift. From the builders' reports only: each Q6 shift, and the 3+ colour ramps. Motion hasn't been watched live.

## Review
- Blocking findings and how each was fixed (the reviewer's 11, 2026-11-05):
  1. "Mascot still" couldn't see a moving foreground: replaced by a check that the foreground clock stops, and a redraw comparing what follows each clock.
  2. "Backdrop moving" counted the word's own effects: same redraw.
  3. The grid check couldn't fail, as an upscale is always uniform: replaced by logging every drawing call. The art was clean on the reviewer's own hook.
  4. Text at rest off the grid: criterion reworded (Source diff).
  5. The font checks passed with no font: Handjet is now inside each page, a missing face shows on screen and logs an error (a corrupt one only logs), and the check needs a loaded face. A real Google Fonts timeout hit this in testing.
  6. Console errors unwatched during a run: fixed.
  7. Result card up to 61% on common screens: the type scale now follows the screen, checked at six more sizes on every end.
  8. Moonbrew's pot moved in the beat: now on the foreground clock.
  9. Moonbrew's centre column was busy: the cauldron stands right of the prompt on wide.
  10. A taken letter got in through non-cancelable input: the input event now strips it, with a check.
  11. Numbers without an origin, and the ticket's stale state: Numbers and this file are updated.
- Blocking findings from the reviewer's second pass, both fixed: the check still passed Moonbrew's old pot and a mascot on the wrong clock, so it now compares each clock's pixels around the mascot and on the pot's belly; and the taken-letter fix scrambled text during a composition, so letters now leave when the composition ends and at submit, tested with real composition events. The reviewer confirmed the other fixes (card, pot, digits) and Handjet's one-width digits; these last two fixes are proved by the broken builds above, not by a third review.
- Deferred to ROADMAP "Next revision": seven items, under "Found in 14c-4's review".
