# M05 — Share

**Status:** planned (ticket drafted 2026-10-21, waiting for the human's approval and the decisions below)

## Goal
A player who has finished today's run can share a spoiler-free summary of it, with a link that opens today's game.

## Who uses it / what breaks without it
- Used by: every player who finishes a run and wants to tell friends, and the friends who get the link. It's how the game spreads before Friends (M08) exists.
- Breaks without it:
  - There's no way to share a run. The only thing a player can pass on is a screenshot of the result screen, and that screen lists every prompt, the player's answers and the host's answers (`src/app/game.tsx`, `Result`). That spoils the day for whoever sees it.
  - Nothing links a friend to the game. Sending the bare address leaves them without context.

## Source
No entry in `docs/SOURCES.md` covers sharing yet. **Before any code**, with the human's OK, add:
- MDN, `Navigator.share()` (Web Share API): https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share. It covers the share sheet on phones, the `text` and `url` fields, the secure-context and user-activation requirements, and the `AbortError` raised when the player cancels.
- MDN, `Clipboard.writeText()`: https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText. This is the copy fallback where `navigator.share` doesn't exist (most desktop browsers).

Also followed:
- `docs/SOURCES.md`, Next.js (App Router), for the client component.
- `docs/DECISIONS.md`, Game 1, and M04's "Rules to build": the three ways a run ends (survived, caught, timed out), the 7 questions, and the points (25 to 350 per question, 1000 for a perfect run).

## Decisions needed before any code
| # | Decision | Answer (origin) |
|---|---|---|
| S1 | What the share text shows. **(a)** One symbol per question (safe, caught, timed out, not reached) plus the points. **(b)** Just "survived n of 7" and the points. It never shows prompts or answers either way. | Open. Claude suggests (a), because a row of symbols is what people recognise from daily games and it shows where the run ended. The human picks the symbols |
| S2 | How the share names the day: the date ("Oct 21") or a day number ("Offbeat #12")? | Open. Claude suggests the date: the run already carries it (`RunState.date`). A day number needs a first day, which is a human number |
| S3 | The link: the site's root (`/`), where today's game is. A friend who isn't signed in sees sign-in first, then the game | Open. Claude suggests the root, built from the page's own origin so it's right locally and on any deployment, with no new config |
| S4 | How it's sent: the phone's share sheet where the browser has one, otherwise copy to clipboard with a "Copied" note | Open. Claude suggests both, as the MDN sources describe |
| S5 | Where the button sits: the result screen only. That screen also shows when a player comes back to a finished day, so this covers both | Open. Claude suggests the result screen only |
| S6 | A link preview image (Open Graph) when the link is pasted into a chat | Open. Claude suggests leaving it out of M05: it's a look question and would be redone in M07 (whose ticket already lists "the share card (M05)" as out of its scope, so the two need settling together) |

## Acceptance criteria
- [ ] SOURCES.md has the two MDN entries, added with the human's OK.
- [ ] A pure function builds the share text from a finished run. Its unit tests (Vitest) cover survived, caught on question k, timed out on question k and caught on question 1. They also check that the text holds no prompt, no player answer and no host answer from the run.
- [ ] The result screen has a Share button. Where `navigator.share` exists it opens the share sheet with the text and link. Otherwise it copies the same text and link and says so. A cancelled share sheet is not an error. Any other failure is shown to the player, not swallowed.
- [ ] Local run on the local stack: sign in by email code, play a run to the end, press Share in desktop Chromium (Playwright, which has no share sheet), and read back the clipboard. Evidence is the clipboard text plus a screenshot of the result screen.
- [ ] Opening the shared link signed out lands on sign-in, and after signing in it shows today's game (local stack, evidence as above).
- [ ] The share sheet on a real phone is checked by the human, or recorded as unverified.

## Out of scope
- A link preview image or share card (S6, unless the human pulls it in).
- Links to a specific friend's run, or anything that needs Friends (M08).
- Points on a leaderboard (M10). The share shows the run's own points only.
- Staging and production (the human, 2026-10-21: local first, nothing published).

## Numbers
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| 7 questions per day | Symbols in the row (S1 a) | DECISIONS.md, Game 1 |
| 25, 50, 75, 100, 150, 250, 350 points; 1000 for a perfect run | Points in the text | M04 G1 (human, 2026-10-21) |

No timers or limits: the "Copied" note stays until the screen changes, so it needs no duration.

## Plan
1. The human answers S1 to S6 and approves this ticket; add the two SOURCES.md entries.
2. Write the share-text function in `src/game/` with its unit tests first (it's the part with branches, and the spoiler rule is what must not break).
3. Add the Share button to `Result` in `src/app/game.tsx`.
4. Local run as in the criteria. *Hypothesis:* in Playwright's Chromium `navigator.share` is undefined, so the button copies. If the share sheet path runs instead, the clipboard check is wrong and the evidence has to come from a different browser setup.
5. Reviewer agent, then one PR that also updates this Status line and the ROADMAP row.

## Removes
Nothing, probably. The feature is new and replaces no code path. If the work finds something it duplicates, it's listed here.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
