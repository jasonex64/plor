# M05 — Share

**Status:** in review (approved and decided by the human, 2026-10-21; built and checked on the local stack; the reviewer agent is next)

## Goal
A player who has finished today's run can share a spoiler-free summary of it, with a link that opens today's game.

## Who uses it / what breaks without it
- Used by: every player who finishes a run and wants to tell friends, and the friends who get the link. It's how the game spreads before Friends (M08) exists.
- Breaks without it:
  - There's no way to share a run. The only thing a player can pass on is a screenshot of the result screen, and that screen lists every prompt, the player's answers and the host's answers (`src/app/game.tsx`, `Result`). That spoils the day for whoever sees it.
  - Nothing links a friend to the game. Sending the bare address leaves them without context.

## Source
Added to `docs/SOURCES.md` with the human's OK (2026-10-21: "yes okay to add sources"):
- MDN, `Navigator.share()` (Web Share API): parameters (`text`, `url`), exceptions (`AbortError`: "The user canceled the share operation or there are no share targets available"), and security (secure context, transient activation).
- MDN, `Clipboard.writeText()`: syntax, `NotAllowedError`, secure context. The copy fallback where `navigator.share` doesn't exist.

Also followed:
- `docs/SOURCES.md`, Next.js (App Router), for the client component.
- `docs/DECISIONS.md`, Game 1, and M04's "Rules to build": the three ways a run ends (survived, caught, timed out), the 7 questions, and the points (25 to 350 per question, 1000 for a perfect run).

## Decisions needed before any code
| # | Decision | Answer (origin) |
|---|---|---|
| S1 | What the share text shows | The rounds survived only, whatever ended the run: "since point system is fixed per round win only need to show the number of rounds achieved, regardless of how they lost. can use placeholder symbols for now"; asked again, "Rounds only", no points (human, 2026-10-21). Placeholders: 🟩 per round survived, ⬜ for the rest, then `n/7` |
| S2 | How the share names the day | "both", the date and a day number (human, 2026-10-21). Day #1 is the closed beta's first day (human, 2026-10-21: "Closed-beta start"), which isn't known yet, so the share shows the date only until M11 sets it |
| S3 | The link | The site's root, from the page's own origin (human, 2026-10-21: "yes") |
| S4 | How it's sent | The share sheet where the browser has one, otherwise the clipboard with a "Copied" note (human, 2026-10-21: "both") |
| S5 | Where the button sits | The result screen only (human, 2026-10-21) |
| S6 | A link preview image | Left out (human, 2026-10-21: "leave out") |

## Acceptance criteria
- [x] SOURCES.md has the two MDN entries, added with the human's OK.
- [x] A pure function builds the share text from a finished run. Its unit tests (Vitest) cover survived, caught on question k, timed out on question k and caught on question 1. They also check that the text holds no prompt, no player answer and no host answer from the run.
- [x] The result screen has a Share button. Where `navigator.share` exists it opens the share sheet with the text and link. Otherwise it copies the same text and link and says so. A cancelled share sheet is not an error. Any other failure is shown to the player, not swallowed.
- [x] Local run on the local stack: sign in by email code, play a run to the end, press Share, and read back the clipboard. Evidence is the clipboard text plus a screenshot of the result screen. (Headless Edge on Windows does have `navigator.share`, see the Plan; the clipboard path ran with it removed.)
- [x] Opening the shared link signed out lands on sign-in, and after signing in it shows today's game (local stack, evidence as above).
- [ ] The share sheet on a real phone is checked by the human, or recorded as unverified. **Unverified so far**: a phone on the local network would load the dev server over plain `http://` on a LAN address, which isn't a secure context, so the sheet can only be checked once the app is served over HTTPS (M11, or a deployment the human chooses).

## Out of scope
- A link preview image or share card (S6, unless the human pulls it in).
- Links to a specific friend's run, or anything that needs Friends (M08).
- Points, in the share or on a leaderboard (M10). The share shows rounds only (S1).
- Staging and production (the human, 2026-10-21: local first, nothing published).

## Numbers
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| 7 questions per day | Symbols in the row; the run's own `total` is used, not a constant | DECISIONS.md, Game 1 |
| Day #1 of the day number | Not built: the closed beta's first day, not known yet (S2) | Human, 2026-10-21 |

No timers or limits: the "Copied" note stays until the screen changes, so it needs no duration.

## Plan
1. The human answers S1 to S6 and approves this ticket; add the two SOURCES.md entries.
2. Write the share-text function in `src/game/` with its unit tests first (it's the part with branches, and the spoiler rule is what must not break).
3. Add the Share button to `Result` in `src/app/game.tsx`.
4. Local run as in the criteria. *Hypothesis:* in Playwright's Chromium `navigator.share` is undefined, so the button copies. If the share sheet path runs instead, the clipboard check is wrong and the evidence has to come from a different browser setup.
   - **Disproved (2026-10-21):** headless Edge on Windows has `navigator.share` (`typeof` gave `function`). Re-planned: the clipboard path ran in a browser context with `navigator.share` deleted before the page loaded (standing in for a browser without it, e.g. desktop Firefox), and the share-sheet path ran with the real `navigator.share` wrapped to record its argument and then called. The app's own code was not stubbed.
5. Reviewer agent, then one PR that also updates this Status line and the ROADMAP row.

## Removes
Nothing. The feature is new: no code built share text or links before, and the result screen keeps every line it had.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| `share()` takes `text` and `url` (MDN) | Both are passed; the clipboard gets `text`, a newline, then `url` | Same data both ways, so a copied share reads like a shared one |
| `AbortError`: the user cancelled **or** no share targets are available (MDN) | Both cases are treated as "nothing to report": no note, no error | MDN gives one error for both, so cancelling (the common case) can't be told apart from having no targets. A device with the API but no targets would see nothing happen; recorded in ROADMAP "Next revision" |
| Secure context only (both pages) | No change; localhost counts as secure (`isSecureContext` was `true` in Edge) | — |

## Evidence
All on 2026-10-21, Windows, branch `m05-share`, the local stack (`supabase start`) and `next dev`, with today's local puzzle (2026-10-21, "Name a sport" first).

- **Unit tests**: `npx vitest run src/game/share.test.ts`: 1 file, 5 tests passed. `npm test`: 20 files, 152 tests passed.
- **Lint, build, bundle, types**: `npm run lint`: no output. `npm run build`: compiled, every route listed. `npm run check:client-bundle`: `CLIENT BUNDLE OK: 47 files, 5 patterns, 3 env values`. `npx tsc --noEmit`: exit 0.
- **In the browser** (headless Edge through `playwright-core` from a temp folder outside the repo, deleted afterwards). A new local test user signed in by email code (read from Mailpit), started the run, typed "soccer" (safe; the host said tennis), pressed Next, and let question 2 run out:
  - The result screen read "Time's up on question 2 / You survived 1 of 7 questions and scored 25 points", with Share under it, and "Copied" after pressing it (seen in a screenshot by Claude; the screenshot wasn't kept).
  - Clipboard path (`navigator.share` removed, `typeof` `undefined`): the clipboard held `"Offbeat · Oct 21\r\n🟩⬜⬜⬜⬜⬜⬜ 1/7\r\nhttp://localhost:3000/"`. The `\r\n` is Windows' clipboard turning `\n` into its own line ending on the way out.
  - Share-sheet path (same player, finished day reloaded): `navigator.share` got `{"text":"Offbeat · Oct 21\n🟩⬜⬜⬜⬜⬜⬜ 1/7","url":"http://localhost:3000/"}`, and no error note was shown.
  - The shared link in a fresh signed-out browser: `http://localhost:3000/` showed "Sign in to play"; after a second test user signed in it showed "Start today's puzzle".
  - The test users were deleted from the local database afterwards.

## Review
**M05** (reviewer agent, 2026-10-21):
- Blocking findings and how each was fixed: none.
- Errors in this PR's own text, corrected in it: Out of scope said the share shows "the run's own points", against S1 (rounds only); the `AbortError` item sat under "For M07 (look and feel)" though it's share behaviour, and moved to "For M11 (launch)", next to the real-phone check.
- Deferred to ROADMAP "Next revision": the survived count is worked out twice (`src/game/share.ts` and `Result` in `src/app/game.tsx`), under "For M07".
- Unverified by the reviewer: the browser evidence, `npm test`, the build and the bundle check (it re-ran the share tests, lint and `tsc` only).
