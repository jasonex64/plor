# M14 — 14c-4, five themes rebuilt to the human's spec

**Status:** in progress (drafted 2026-11-05 from four rounds of guided questions; approved 2026-11-05: "Approve, start").

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
- [ ] A private font test page shows two candidates on prompt, answer and HUD across all five themes, and the human picks one before the rebuild starts.
- [ ] All five pages are republished at their existing links, and J's page is titled Afterglow.
- [ ] Every box in the spec's Acceptance checklist has pass or fail per theme, with a screenshot or clip, in a results table in the human's doc.
- [ ] Each theme's palette is written as hex in the human's doc; the human's existing words are unchanged.
- [ ] A script reports one font family across every screen of every theme.
- [ ] Each page runs at 60 fps time steps, and its average draw time stays under 16.7 ms at 1920×1080 and 390×844 in a scripted run; worst frames are reported too. This is desktop Chrome, not proof for a real phone, so the human checks on their phone.
- [ ] Scene art sits on the grid: a script samples the canvas and finds every source pixel a uniform block at the current scale.
- [ ] Text at rest sits on the grid: a script reports each text box's position as a whole multiple of the scale.
- [ ] At 390×844, each theme's mascot and key prop are visible and clear of the prompt, in screenshots at Q1, Q3 and Q6.
- [ ] A clip per theme shows the answer beat: foreground still, backdrop moving.
- [ ] No console errors in a scripted run at either size.

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
| The word's move, tracker and backdrop timings; the portrait mascot's position | The review pages only | **Proposed by Claude for the human to judge on the pages**, like 14c-3's mock timings; not carried into the app without the human's word |
| Two font candidates | The font test page | Human's spec, Type: "Shortlist 1–2 candidates" |

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

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
