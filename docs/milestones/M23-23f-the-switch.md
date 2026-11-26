# M23, 23f: the switch

**Status:** designed 2026-11-26 from answers 58 to 69 in `M23-offbeat-on-a-clock.md`; **waits on the human's approval**. Nothing is built.

## Goal
Offbeat on plor.app is the game on a clock and nothing else: every page reads a clock day rightly, the old seven-question game and its data are gone, and the boards start from the switch day.

## Who uses it / what breaks without it
- Used by: every player, from the first approved day on a clock.
- Breaks without it: the game on a clock exists and no player can reach it. Approving a clock day today would show wrong or broken things beside it: "Your Offbeat" and Me count questions survived out of 7 (0 for a clock run), the feed says "survived every question" of any finished clock run, "Yesterday's answers" would fail on a clock day, a friend's score for today reads as nothing, and the combined board weighs Offbeat by the old game's par (each a reading of the code by a search agent, *unverified* until the build reads it).

## Source
- `docs/SOURCES.md`: the human's answers are the source for M23. Here: answers 58 to 69; answer 14 and the M23 ticket's 23f line ("Boards from the switch day, Offbeat off the overall board until its par is set, the old game removed, the old drafted days dropped"); the ticket's "Removes".
- The code as mapped 2026-11-26 by a search agent (*unverified*; the build confirms each before relying on it).

## The human's answers (2026-11-26), in short (quoted in the M23 ticket)
58 wipe the old days · 59 boards fresh from the switch day · 60 Offbeat off the combined board until par is set · 61 seven days approved first · 62 with the wipe: comments on those results, the old days themselves, the log of missed texts · 63 no copy · 64 the wipe runs inside the database push · 65 a "back soon" note until the switch · 66 stats: points and answers · 67 the feed: points and answer count · 68 yesterday: top answers per question · 69 the note's line: "Plor is being rebuilt. Back soon."

## Design
Three PRs, in this order, so that plor.app is never showing a half-switched game.

**23f-1, the note.** Wherever plor.app says "There's no puzzle today." it says **"Plor is being rebuilt. Back soon."** (answer 69), with the countdown line removed beside it (a new day starting brings nothing while paused). Offbeat only; Fragments' wording is the human's to decide below. The front page's "Seven questions, such as..." becomes the clock game's own line: **"Three questions, one clock. Name as many as you can."** 23f-3 puts back "There's no puzzle today." for a missed day after the switch.

**23f-2, every page reads a day on a clock.** Nothing is removed yet.
1. **"Your Offbeat" and Me** (answer 66): day streak, best score, average points a day, and a chart of points for the last 7 days. "Full runs" and "N of 7 survived" go.
2. **The feed** (answer 67): a finished clock run reads "scored 340 points with 14 answers".
3. **Yesterday** (answer 68): for each of yesterday's three questions, the answers most players gave and the rarest anyone found, each with how many players. Shown only when enough players played for a count to mean something, by the existing rule for sharing counts (`ANSWER_SHARE_MIN_PLAYERS`); how many of each is shown reuses the existing `RAREST_ANSWERS_SHOWN`. Signed-in players' answers only: a guest's are not kept by player (ROADMAP, For M23).
4. **Today's score** on a friend's row and the boards reads a clock run's points.
5. **Boards from the switch day** (answers 14, 59): Offbeat's weekly and overall boards count clock days only. With the wipe (below) nothing older exists to count, so no date is stored anywhere: the rule is "a day on a clock".
6. **The combined board** leaves Offbeat out (answer 60): `PAR_POINTS.offbeat` is removed, and the board says in a line under it that Offbeat joins once its typical score is known. Setting par later is its own small change, on the human's word and number.

**23f-3, the old game goes, and the wipe.**
7. **Code removed:** the seven-question screens, host answers, taken letters, sudden death, the old scoring and its tunables, the old draft with `simulate` and `check-bank` (so `npm run draft -- <date>` drafts a clock day, the word `clock` gone), the bank's old fields and the Bank admin page, the old test run, the old SQL rules, their tests, and the drafted files `content/offbeat/` in the old format. What Fragments or the clock game also use stays. `content/bank.json` keeps each question's wording and list.
8. **The wipe, one migration** (answers 58, 62, 63, 64). On whatever database it is pushed to, for the game Offbeat and days in the old format only, it deletes for good:
   - every run and its answers, signed-in and guest, and the guests' tallies;
   - their points in the ledger;
   - every comment and reaction on those results, and the kept or deleted-comment records that belong to them;
   - the days themselves;
   - every missed text logged, and the review rows made from them.
   It keeps: Fragments entirely; players, friends, groups; the answer lists, including answers players' texts once added; anything of a day on a clock. **No copy is made and it cannot be undone. It runs the moment the human runs `npx supabase db push`, with no count shown first** (answers 63, 64, each against the recommendation). The PR will state the row counts on plor.app, read through the Supabase connector before merging, so the human sees the size before pushing.
9. After the push the database refuses a day in the old format.

**The human's own steps, after 23f-3 is merged:** `npx supabase db push` (the wipe); draft and approve seven days on a clock on plor.app's Admin page (answer 61); the first approved day's date is the switch day. Nothing in these PRs approves a day or pushes anything.

## Security changes proposed (need the human's approval; recorded in DECISIONS.md when built)
- A migration that deletes data, as listed in 8, with the old game's SQL functions dropped and `private.build_puzzle` refusing format 3.
- A read of how many players gave each answer on a past clock day (design 3), for any signed-in player, counts only, under the existing minimum of players. No new table.
- No grant widened.

## Assumptions
- Comment "kept" and "deleted" records can be tied to their game; if they cannot, the build stops and asks rather than deleting Fragments' ones.
- No clock day is approved on plor.app before 23f-3's push; the wipe does not touch one if it is.
- Removing the Bank admin page loses nothing the clock game needs (the Lists page replaced it).

## Still to ask, before 23f-1 is built
- Whether Fragments' "no puzzle today" also becomes the note (both games are paused).

## Acceptance criteria
- [ ] 23f-1: with no day approved, /play, the Today card and the guest front page show the note → `e2e/`, `@visual`.
- [ ] 23f-2: stats, feed line, yesterday, today's score, each on a clock day → unit and db tests, each failing first; `e2e/`, `@visual`; yesterday hidden under the minimum of players.
- [ ] 23f-2: the combined board has no Offbeat part → db test, failing first.
- [ ] 23f-3: on a database seeded with old Offbeat runs, comments, misses, days, a Fragments run and a clock run, the migration leaves only the last two and what belongs to them → `npm run test:sql`, failing first.
- [ ] 23f-3: `npm run draft -- <date>` writes a clock day; a format 3 day is refused by approval → tests.
- [ ] 23f-3: nothing of the old game is left unused → `npx tsc --noEmit`, `npx eslint`, `npm test`, `npm run test:sql`, the whole e2e suite, `npm run verify -- offbeat-run`.

## Out of scope
- Offbeat's par and its place on the combined board. Researching more lists. A Play test for a clock day. Counting guests' answers.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 7 | days approved before the switch | answer 61 (the human's step; no code) |
| existing `ANSWER_SHARE_MIN_PLAYERS` | yesterday's counts shown | existing tunable, reused |
| existing `RAREST_ANSWERS_SHOWN` | how many of each yesterday shows | existing tunable, reused: the human confirms with approval |

## Plan
Written as `<step> → verify: <check>` per PR when the human approves, 23f-1 first.

## Removes
23f-1: the "no puzzle today" line, until 23f-3. 23f-2: the old stats' wording and `PAR_POINTS.offbeat`. 23f-3: the old game, as design 7, and the old data, as design 8.

---
## Source diff
## Evidence
## Review
