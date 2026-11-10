# M14 14c-7 — Simpler games, side by side

**Status:** in progress (approved 2026-11-10: "Approve pictures"). Pauses 14c-6c and M16 16f until the human picks a direction.

## Goal
Show the human each game as built, calm and plain, side by side at phone size, so they can choose how far to simplify both games.

## Who uses it / what breaks without it
- Used by: the human, to choose the games' direction before anything more is built on either.
- Breaks without it: 14c-6c and 16f are built on a look the human may cut, or a look is cut without the human seeing the alternative.

## The human's answers (2026-11-10, guided questions, two rounds)
Round 1
1. Is the firework festival and the 3D village still the app you pictured ("small, welcoming but neutral, phone-first")? "It's gone too far".
2. What should the review session do beside the M14 and M16 sessions? "Take over everything". Both sessions confirmed their handoffs pushed, nothing running, nothing uncommitted, and stopped.
3. The ~500 Next revision items and the 2026-10-26 audit's 81 findings: "Sort, fix only launch-blockers (Recommended)".
4. A friend test before M17 and launch prep? "Keep the order" (ROADMAP, Going live, stands).

Round 2
5. Which game has gone too far? "Both".
6. How far back? "Show me first": side-by-side pictures of the options for each game before choosing. The options offered: the calm (Reduce motion) version becomes the game; plain screens with no world, the game in the app's own look; keep the look and cut the weight.
7. 14c-6c and 16f meanwhile: "Pause both (Recommended)".
8. The handover: "I message them to wrap up (Recommended)".

Round 3 (the planning session in `C:/Users/jason/RIFF`, which took this ticket over from the review session the same day)
9. Which session owns the plan from here? "This session" (the planning session). The review session confirmed it had stopped, with nothing running and this draft its only uncommitted change.
10. This draft ticket: "Take it over (Recommended)".
11. Pictures first, Reduce motion then freeze, or plain with no pictures? "if pics dont look good then go plain". So the pictures come first, and plain is the fallback for both games. This replaces the same session's earlier "Freeze after Reduce motion (Recommended)", given before it knew of answers 1 to 8.

## Source
- `docs/DESIGN.md`: the app's own look (colour slots, Baloo 2, cards, buttons), for the plain versions.
- `M14-14c-6-afterglow-in-play.md`, Design, "Reduce motion" (answers 8, 83 to 91): the calm Afterglow, designed, not built.
- `M16-16g-2-midnight-brew-in-play2.md`, 16g-2b: the calm village, built.
- `M14-14c-2-neutral-words.md` and the game screen at commit `8309555`: the game in the app's own look, as it was on 2026-11-03.

## Acceptance criteria
- [ ] One private claude.ai page shows, for each of the two games, three versions side by side: as built, calm, plain.
- [ ] Each picture is marked as a screenshot of the running game or as a drawing of something not built.
- [ ] The page reads at phone width without scrolling sideways.
- [ ] `git status` in the checkout shows no change under `src/`, `e2e/` or `supabase/`, and no server is left running.
- [ ] The human's choice is recorded here, quoted.

## Out of scope
- Any change to the app. Building the chosen direction is the next sub-ticket, from its own guided questions.
- The "keep the look, cut the weight" option needs no picture: it looks like "as built".

## Numbers
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| 390×844 | the phone size of each picture | the 2026-10-29 Impeccable audit's phone size (HANDOFF.md, M14, "The Impeccable audit") |

## Plan
1. A Fable subagent takes screenshots of what runs (both games as built, the calm village) and draws what doesn't (the calm Afterglow from its design, both plain versions from DESIGN.md) → verify: the page file holds six pictures, each labelled.
2. Publish the page privately → verify: the link opens.
3. The human chooses → verify: the answer is quoted above.

## Removes
Nothing: it adds one ticket and one private page, and changes no code.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence
- Left by the review session (its handover message, 2026-11-10; unverified by this session): screenshots at 390×844 of game 1 as built (to reshoot, the Next dev badge covers the name), game 2 as built and game 2 calm, in that session's scratchpad; the three drawings not started; no page written or published.

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
