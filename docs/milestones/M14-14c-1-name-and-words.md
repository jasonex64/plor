# M14 14c-1 — The game's name and words

**Status:** approved (human, 2026-10-27: "Approve the 14c-1 ticket as recorded and build it now"); built and reviewed, in PR PR_PENDING, waiting for the human's word to merge. Guided questions answered 2026-10-25 (rounds 1–5) and 2026-10-27 (rounds 6–10, below).

## Goal
Give game 1 a name and a set of words that speak its world (the ridge, the Wind, the signs) instead of "Offbeat", "safe", "caught", "answer" and "host".

## Who uses it / what breaks without it
- Used by: every player, on the game screen, the reveal, the result, the share, the friends' board, Me and the game's own leaderboard.
- Breaks without it: the game plays, but its words don't match the world 14c draws. The human (2026-10-25): "we also should rename things in the game too like instead of just 'safe and 'caught' and perhaps 'answer' and 'host' all need renaming". "Offbeat" gives "no hint of the theme" (round 1, below). The share's day number ("Offbeat #n") starts at the closed beta (M15), so a rename costs least before then.

## Source
No entry in `docs/SOURCES.md` covers naming. This ticket follows:
- the human's answers below (2026-10-25), quoted;
- `docs/milestones/M14-look-and-feel.md`, "Carried over from the closed M12 draft": D16 (the trail along a cliff edge, falling off at the stop), D19 (the host is the Wind), progression (the wind cloud gets angrier each round and the weather changes) and the Round 7 draft (7 stops, the player's word on a sign planted at each stop, the Wind whispers its answers, a gust blows the character off);
- `docs/DECISIONS.md`, Game 1: `game_id` is permanent.

## What the human said (2026-10-25, guided questions)
**Round 1, the name:**
- Why rename: "want to compare, and not hinting of the theme".
- The hook: "The Wind character".
- The tone: "try multple".
- Next to Plor: "Stands on its own" (each game its own personality; Plor stays the neutral host).

**Round 2, the name:**
- The game's name and the Wind's name the same word? "Show me both kinds".
- Should the name hint at the dodge? "Either is fine".

**Shortlist:** Claude offered ten names (Whiffle, Gusty, Windbag, Bluster, Zephyr, Updraft, Gust, Crosswind, Headwind, Whirlword). The human picked three to check: "updraft zephyr and crossswind". Then: "not quite yet" on picking one.

**Round 3, the words:**
- How far the themed words reach: "Everywhere".
- The safe/caught picture: "Show me all three" (the climb, the Wind's attention, the gust).
- The player's answer in the world: "A sign you plant".
- The Wind's voice: "Narrated about it" (a narrator describes the Wind; it never speaks for itself).

**Round 4, the words:**
- The pair: "A. The climb (Recommended)".
- A question is called: "Stop".
- Points: "Keep \"points\"".
- Screens shared across games (the Today tab, the overall leaderboard, the shared feed): "Plain on shared screens". The game's own screens, its card and its own leaderboard use the words.

**Round 5, the get-past and caught lines** (the human asked to "redo steady and blown off"):
- The get-past line: "should escalate with difficulty"; the caught line: "samne as last answer".
- How finely: "Three tiers" (stops 1–2, 3–5, 6–7).
- How rough the top gets: "Cartoon rough".

**Round 6, the name and the reach** (human, 2026-10-27, on the Mac):
- N1, the name: "Updraft (Recommended)". The address becomes plor.app/updraft (14b-4: "The new name", no redirect). A trademark search is still the human's to run before launch.
- N3, the share line: "Rare and common", as its preview showed: `Updraft · Oct 27` then 🟪🟩🟪💨⬜⬜⬜ `3/7` (🟪 rare · 🟩 common).
- N4, timeouts: "Three tiers".
- N5, the admin pages: "Plain words (Recommended)".

**Round 7:**
- What "rare" means in the share: "It earned a rarity bonus (Recommended)": the answer's provisional bonus is above 0, the estimate the reveal shows; the bonus's own rule decides it (M09: 0 for an answer 20% or more gave), so no new number.
- The timeout words: "Dozed off / stalled / frozen solid (Recommended)".
- N6, How to play: "Yes, same PR (Recommended)".
- The words table: "Go through them first" (rounds 8–10).

**Round 8:**
- Getting past a stop: "Steady! / Holding on! / Still standing!".
- Caught: "Tipped over / tumbled / sent flying (Recommended)".
- The answer box: asked again, as its words only (the human: "is this talking about the visuals or the words").
- The retry and stolen-letter lines: "Keep these two plain".

**Round 9:**
- The answer box's words: "Keep \"Your answer\" / \"Answer\"".
- The Wind's answers: "The Wind whispered cat, dog (Recommended)".
- How far you got: "Climbed / reached the top (Recommended)".
- The titles: "Yesterday on the ridge / Your rarest signs (Recommended)", then round 10 changed the second.

**Round 10:**
- Me's section title: "Your rarest answers (Recommended)", matching the plain answer box.
- The share line where time ran out: "❄️, frozen (Recommended)", as previewed: `Updraft · Oct 27` then 🟪🟩❄️⬜⬜⬜⬜ `2/7`.
- N7, a stolen key's feel: "With 14c's art (Recommended)": decided with the game's motion and L8's timings, in the next 14c sub-ticket.

## The name (N1: Updraft, round 6)
Checked on 2026-10-25 by web search. That's not a trademark search (*unverified*), and the domain lookups returned nothing from the Mac (*unverified*).

| Name | Existing games with the name | Other clashes | Claude's reading |
|---|---|---|---|
| **Updraft** | Two small itch.io projects: a jam prototype platformer ([lrxs](https://lrxs.itch.io/updraftv1)) and an HTML5 game in development ([rayen_rb01](https://rayen-rb01.itch.io/updraft)). No Steam or app store listing, no word game | UpdraftPlus, a WordPress backup plugin (Claude's memory, *unverified*); a different field | **Leads.** Wind and the climb: the updraft lifts you up the ridge, a gust knocks you off |
| **Zephyr** | No game named exactly that. Nearby: *Zephyrus Prelude* (VR puzzle adventure, [Meta Quest](https://www.meta.com/experiences/pcvr/zephyrus-prelude/4578910218853415/)), *Robot Zephyr* (iOS action) | Crowded outside games (Zephyr RTOS, Zephyrus laptops; Claude's memory, *unverified*) | Hard to search or own; unsure how to say it |
| **Crosswind** | **A Steam game named *Crosswind*** ([store page](https://store.steampowered.com/app/3041230/Crosswind/)), a co-op pirate survival game by Crosswind Crew / Forward Gateway, in Early Access in 2026 ([Gematsu](https://www.gematsu.com/2025/08/crosswind-launches-in-early-access-in-2026)) | Same goods as ours: video games | Out, unless the human's trademark check says otherwise |

## The words (decided, rounds 3–10)
| Today | New | Where |
|---|---|---|
| Offbeat | **Updraft** (the record's `name`; the address `/updraft`, the folder `src/app/offbeat/` renamed with it) | everywhere the game is named |
| question 3 | **stop 3** | everywhere a question is numbered (round 4) |
| Safe! | by tier: stops 1–2 **Steady!**, 3–5 **Holding on!**, 6–7 **Still standing!** | the reveal (round 8) |
| Caught on question 3 / (caught) / caught on question 3 by "cat" | by tier: stops 1–2 **tipped over**, 3–5 **tumbled**, 6–7 **sent flying**, always "*<word> at stop N*" ("sent flying at stop 6 by 'cat'") | the reveal, the result, the friends' board, yesterday's card (round 8) |
| Time's up on question 4 | by tier: stops 1–2 **dozed off**, 3–5 **stalled**, 6–7 **frozen solid**, as "*<word> at stop N*" | timeouts (rounds 6, 7) |
| survived / avg. survived / Questions survived, last 7 days / More survived | **climbed** / **avg. stops climbed** / **Stops climbed, last 7 days** / **More climbed** | Me, the game's card, the calendar (round 9) |
| You survived all 7! / survived every question | **You reached the top!** / **reached the top** | the result, the board (round 9) |
| the host said cat, dog | **the Wind whispered** cat, dog | the reveal, the result (round 9) |
| Yesterday's answers | **Yesterday on the ridge** | the game screen (round 9) |
| Your answer / Answer (button) | unchanged | the input (round 9) |
| Your rarest answers | unchanged | Me (round 10) |
| "x" isn't in our list. Try another answer. / The Wind has taken: E | unchanged | the retry, stolen letters (round 8) |
| points | unchanged | (round 4) |
| How to play | rewritten in these words | the game's How to play (N6, round 7) |

**The share line** (N3, rounds 6, 7 and 10): `Updraft · <date>`, then one symbol per stop: 🟪 a stop climbed with an answer that earned a rarity bonus (provisional bonus above 0), 🟩 one climbed with no bonus, 💨 where the Wind caught the player, ❄️ where time ran out, ⬜ the stops not reached; then `<climbed>/7`. Spoiler-free: no prompt, no answer.

Screens shared by every game keep plain words and name no game (round 4; 14b-4). The admin pages keep plain words (N5, round 6).

## Open questions
| # | Question | Answer (origin) |
|---|---|---|
| N1 | The name: Updraft, Zephyr, or keep looking | **Updraft** (human, 2026-10-27: "Updraft (Recommended)"). A trademark search (USPTO) is the human's to run or commission before launch |
| N2 | `game_id`: keep `offbeat` as the internal ID and change only what players see, or migrate it | **Closed:** keep it (human, 2026-10-26, in the audit session: "Keep it (Recommended)"); the address becomes the new name with no redirect ("The new name"). 14b-4 built the game's record (`src/platform/game.ts`, `docs/milestones/M14-14b-4-game-name-record.md`), so the rename changes the record's `name` and `path` and renames `src/app/offbeat/` by hand ("Rename by hand at N1") |
| N3 | The share line: the name and the symbols (e.g. a 💨 at the stop where the player was blown off), including rare and common answers now M13's tiers exist | **Rare and common, 💨 and ❄️** (rounds 6, 7, 10; above). Also ROADMAP's placeholder-symbols item (M05), moved here (human, 2026-10-26: "Move to 14c (Recommended)"; `M14-14b-2c-review-items.md`, answer 3) |
| N4 | Timeouts: one word ("Frozen") at every stop, or tiers like the caught line | **Three tiers**: dozed off / stalled / frozen solid (rounds 6, 7) |
| N5 | Admin pages: plain words, since only the human sees them | **Plain words** (human, 2026-10-27: "Plain words (Recommended)") |
| N6 | The How to play text (L29) rewritten in the new words in the same PR | **Yes, same PR** (human, 2026-10-27: "Yes, same PR (Recommended)") |
| N7 | A stolen letter's key: what the player feels when they press it (it does nothing today, and only a status line says why) | **With 14c's art**, not 14c-1 (human, 2026-10-27: "With 14c's art (Recommended)"; earlier "Wait for 14c (Recommended)") |

## Acceptance criteria
- [x] The game's record reads `name: "Updraft"` and `path: "/updraft"`, and the route folder is `src/app/updraft/` (renamed by hand, 14b-4 answer 3); `/offbeat` answers 404 (no redirect).
- [x] No player-facing string on the game's own screens says "Offbeat", "safe", "caught", "survived", "host" or "question": checked by grep over `src/app` and `src/game/share.ts`, with every remaining hit listed and justified (the plain ones this ticket keeps: "Your answer", "Answer", the retry and stolen-letter lines, "Your rarest answers", the admin pages).
- [x] The get-past, caught and timeout lines follow the three tiers: a unit test on the stop → word lookup at stops 2, 3, 5 and 6 (each tier's edges), for all three.
- [x] The share line: a unit test per symbol (🟪 a bonus above 0, 🟩 none, 💨 a catch, ❄️ a timeout, ⬜ unreached), the name from the record, and no prompt or answer in it.
- [x] How to play reads in the new words.
- [x] Shared screens and the admin pages keep plain words (round 4; N5).
- [x] The existing e2e tests that read these strings are updated to the new words, not deleted or loosened (CLAUDE.md, "Never cheat a check").

## Out of scope
- The pixel art and the motion (the rest of 14c).
- The cauldron game's name (M16 S1).
- Changing `game_id` or any stored value, unless N2 says so.

## Numbers
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| Tier bands: stops 1–2, 3–5, 6–7 | Which get-past, caught and timeout word shows | Human, 2026-10-25: "Three tiers", from the option that named those bands; timeouts too, 2026-10-27 (round 6) |
| Rare in the share: a provisional rarity bonus above 0 | 🟪 or 🟩 | Human, 2026-10-27 (round 7); the bonus's 20% rule is M09's, already decided |

## Plan
1. The human approves this ticket.
2. One PR from `m14-look-and-feel`: the record's name and address with the folder's rename, the strings, the tier lookups and their tests, the share line and its tests, How to play, the e2e updates. plor.app's code changes on merge; no migration.

## Removes
The old player-facing strings, with no fallback to them: "Offbeat" as the shown name and `/offbeat` as the address (the route folder renamed to `src/app/updraft/`, no redirect), "Safe!", "Caught" and "caught on question N", "Time's up on question N", "survived" and its stat labels, "the host said", "Yesterday's answers", "Question N of 7" and "Question in play"; the share line's placeholder symbols (🟩 survived, ⬜ not; M05) and ROADMAP's item for them. ("isn't in our list" stays: round 8 kept the retry line plain.)

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| M05 S1: the share line shows how far the player got, not how the run ended | 💨 at the stop where the Wind caught the player, ❄️ where time ran out | Superseded by the human's answers (rounds 6 and 10, N3): the ending is part of the line, still with no prompt or answer |
| The words table: "climbed" for how far you got | The result's list says "(climbed, +N points, bonus +B)" for a stop got past, beside "(tipped over at stop N)" for the catch | The old line said "(safe, …)"; "climbed" is the table's word for a stop got past (round 9) |
| The words table covers the game's own screens | The home page's introduction is rewritten in the same words ("Seven stops up the ridge… match the Wind and it sends you flying") | It introduces the game, so it's the game's own text, like its banner (14b-4, answer 2) |
| The table renames "question 3" to "stop 3" everywhere a question is numbered | The board's clock region is "Stop in play" (was "Question in play") | Its accessible name numbers no question but names one; the same word keeps it consistent (round 4) |
| The words table: the caught line is always "*<word> at stop N*", yesterday's card included | Yesterday's card shows the word alone in its pill ("Tipped over", "Tumbled", "Sent flying"), and "Climbed" for a stop got past | Each row of the card already starts with its stop's number ("3 · Name a fruit"), so "at stop 3" would say it twice; the table gives no word for a stop got past there, and "Climbed" is round 9's |
| Plain words outside the game's own screens (round 4; N5) | The privacy page keeps "for each question, whether it matched the host" | A legal page describing what's stored, in the plain words the data has; not the game's own screen |

## Evidence
On the Mac, 2026-10-27, against the shared local stack (M13's work was on the Windows PC today):

- Criterion 1: `src/platform/game.ts` reads `name: "Updraft"`, `path: "/updraft"`; `git mv src/app/offbeat src/app/updraft`. The new e2e test "the old address /offbeat answers 404" passes (`e2e/offbeat.e2e.ts`).
- Criterion 2: `grep -rniE "offbeat|\bsafe\b|caught|survived|\bhost\b|question" src/app src/game/share.ts --include='*.tsx' --include='share.ts'`, comment lines and `/admin/`, `/api/` left out. Every hit left is a code identifier (`run.question`, `d.survived`, `run.status === "survived"`, `OffbeatScreen`, `POINTS_PER_QUESTION`, the view kind `"offbeat"`, ButtonLink's `tone`, `id="offbeat"`, `styles.caught`/`styles.safe`, `CAUGHT = "💨"`), or one of these kept plain: `privacy/page.tsx` ("Questions:" by the email address; "for each question, whether it matched the host", Source diff) and `about/page.tsx` ("Questions, ideas or problems"). The plain ones the ticket keeps ("Your answer", "Answer", the retry and stolen-letter lines, "Your rarest answers", the admin pages) are unchanged. After the review, `src/app/messages.ts`'s run errors say "stop" too.
- Criterion 3: `src/game/words.test.ts`, each tier's edges at stops 1, 2, 3, 5, 6 and 7 and the three texts at 2, 3, 5 and 6.
- Criterion 4: `src/game/share.test.ts`, one test per symbol, the name from `GAME.name`, no prompt or answer.
- Criterion 5: `e2e/offbeat.e2e.ts` reads How to play's new lines ("7 stops, one climb.", "At stops 2, 4, 5, and 7 the Wind snatches one", the points at the bottom and top).
- Criterion 6: the leaderboard, the feed and the admin pages are untouched; `today.e2e.ts` still checks the card names no game.
- Criterion 7: every e2e assertion on a changed string now expects the new one; none was removed. The e2e files read the name from `GAME.name` and the get-past words from `gotPastText`; the caught and timeout lines are written out ("tipped over at stop 1"), and the URLs stay literal (`/updraft`) so they check the real address, not the record against itself.
- `npx tsc --noEmit -p .` and `npx eslint .` clean; `npm test` → `Tests  395 passed (395)`; `npm run test:db` → `Tests  266 passed (266)`; `npx playwright test` → `61 passed (2.1m)` (after the review's fixes; the run before them failed 4, the strings the review also found, plus the shell clock test, which then passed 5 of 5 alone).

## Review
By the `reviewer` agent in a fresh context, 2026-10-27.

- Blocking findings and how each was fixed:
  - How to play's two e2e assertions still read the old lines: updated to "7 stops, one climb." and "At stops … the Wind snatches one" (the first full e2e run had also caught them, with today's and Me's stakes and calendar lines).
  - `offbeat.e2e.ts`'s check that yesterday's card shows no pill before the player plays read `/^(Safe|Caught)$/`, which could no longer fail: it reads the new pills, `/^(Climbed|Tipped over|Tumbled|Sent flying)$/`.
  - Three run errors in `src/app/messages.ts` still said "question" (`already_answered`, `not_open`, `not_current_question`): they say "stop".
  - ROADMAP's row and the handoff still said "waiting for approval": updated.
- Fixed as well, small defects of this change's own: the yesterday card's word-only pill, now a Source diff row; "Offbeat" left in the two route pages' comments; old words in `settings.e2e.ts`'s test titles and `live-board.e2e.ts`'s comments.
- Not changed: two comment lines a little past the usual width (`src/app/game.tsx`, `src/platform/game.ts`), style only. The reviewer noted the literal caught and timeout lines in e2e are a stronger check than words.ts, so they stay.
- Deferred to ROADMAP "Next revision": none.
