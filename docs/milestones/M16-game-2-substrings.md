# M16 — Game 2: the substring game

**Status:** planned, after launch (M15). Draft ticket for the human's approval, 2026-10-22, written so the decisions below can be answered while the MVP is built. No code, migration or content comes before those answers and the end of the MVP (human, 2026-10-21: the MVP is M00 to M12, "all working features first").

## Goal
Add Plor's second daily game, a substring game inspired by JKLM: the player gets a few letters such as "cks" and types a word that contains them ("rocks", "backspace") before time runs out.

## Who uses it / what breaks without it
- Used by: every player, once the site has more than one game. Plor "is built to hold more than one game later, and ships with one" (ROADMAP, Product).
- Breaks without it: nothing today. That's why it comes after launch. Until game 2 exists, the platform/game boundary has nothing to separate. The ROADMAP pulls that boundary out "at game 2", and the home screen (M11) and the leaderboards (M09, M10) are built for one game.

## Source
No entry in `docs/SOURCES.md` covers a word list, word frequencies or this game's rules, and only a human can add one (SOURCES.md, Rules). S2 and S8 ask for those entries. Until they exist, this ticket follows:
- `docs/ROADMAP.md`, Later (after the MVP), "More games": game 2 "must never ask for something impossible or too hard like 'iur'"; "The games share one licensed dictionary. Each game has its own leaderboard, plus an overall one. Pull the platform/game boundary out at game 2."
- The longer note from 2026-10-19/20, in git at commit `4dc43a3` (`docs/ROADMAP.md`, line 31; the roadmap reset of 2026-10-20 shortened it). That note holds the human's rules and Claude's suggestions, kept apart below.
- `docs/DECISIONS.md`, Hard to reverse (puzzle content format, run events, points ledger, day boundary) and Game 1 (`game_id` is permanent).
- `docs/milestones/M04-game-mechanics.md`, G1: every game's perfect run is the same round total (human, 2026-10-21).

## What the human has said
- A substring game inspired by JKLM: given a few letters such as "cks", type a word containing them within a time limit (human, 2026-10-19; changed 2026-10-20).
- The day's substrings are the same for everyone (human, 2026-10-20).
- It must never ask for something impossible or too hard, like "iur" (human, 2026-10-20).
- The games share one licensed dictionary. Each game has its own leaderboard, plus an overall one that adds up all games (human, 2026-10-19).
- Every game's perfect run is the same round total (human, 2026-10-21, M04 G1; Offbeat's is 1000).
- Every game shows progression as the player survives or scores more (human, 2026-10-20; M14).

**Claude's suggestions** (from the 2026-10-20 note, not decided):
- A deterministic script picks the day's substrings from the dictionary, using only substrings that enough dictionary words contain. Then this game needs no AI drafting.
- Use Plor's own name and look, not JKLM's.
- The dictionary is the server's alone to judge, so the full word list never reaches the client (the same rule as Offbeat's answer model). Offensive words and proper nouns are removed from it.

## Decisions needed before any code
| # | Decision | Answer (origin) |
|---|---|---|
| S1 | The game's name and its `game_id`. The `game_id` is permanent: it's stored with every run, event, ledger row and content path (DECISIONS.md, Game 1) | |
| S2 | The dictionary: which word list, its license, and its SOURCES.md entry (only a human adds a source). Is it the same source as M13's answer lists for Offbeat (M13 names WordNet, license not yet checked)? What gets removed (offensive words, proper nouns), and from which list? | |
| S3 | "Never impossible or too hard": the minimum number of dictionary words that must contain a substring (a human number). Is a count enough, or must enough of those words also be common (that needs S8's frequency list)? | |
| S4 | Substring length: always the same (e.g. 3 letters, as in "cks"), or does it vary within a run? | |
| S5 | The day: how many substrings per run, and do they get harder through the run, as Offbeat's do? | |
| S6 | Time limit per substring (a human number). Offbeat's 20 seconds is Offbeat's | |
| S7 | How a run ends: sudden death on the first miss or timeout, as in Offbeat, or lives (how many)? | |
| S8 | Scoring: per substring as in Offbeat, by word length, or by word rarity (needs a licensed word-frequency list pinned in SOURCES.md, so the score is known when the player answers); a bonus for using more different letters across the run. The point values add up to S9's total | |
| S9 | The perfect-run total: 1000 like Offbeat (M04 G1: "a round total so every game's perfect run is standardized"), or another. Because the overall leaderboard adds up all games, this also decides how much game 2 weighs there | |
| S10 | Words within a run: can one word answer two substrings? | |
| S11 | Daily content: does the script publish each day by itself, or does the human approve each day on the admin page, as in M06? | |
| S12 | What carries over from Offbeat: the friends' live board (M07), comments and reactions (M08), groups (M10), Share (M05). Each one is already keyed by `game_id` in the database; which ones game 2 shows is a product call | |
| S13 | When the platform/game split happens: as its own sub-ticket right before game 2 (Claude's suggestion), or earlier | |
| S14 | Live multiplayer rooms like JKLM's are not part of this ticket (Claude's reading of "the day's substrings are the same for everyone": a daily solo game, like Offbeat). Confirm | |

## The platform/game boundary today
What a split would touch, read from the code on 2026-10-22 (`main` at `fd134f7`, plus M08 on its branch). Line counts and file lists are from `grep`. Whether each piece needs to change is a design question for S13's sub-ticket, *unverified* until then.

**Already per game (the schema was designed for it):** every game table is keyed by `game_id`: `private.puzzle`, `run`, `run_event`, `puzzle_questions`, `comment` and `reaction`, and the live-board broadcast carries `gameId`. The points ledger is designed as unique per (user, `game_id`, date) (DECISIONS.md, Points ledger).

**Offbeat-only today:**
- `run_event` holds Offbeat's answer: `question_idx`, `entry_id`, `matched` (DECISIONS.md, Run events). A game-2 answer is a typed word that contains the substring, so it needs its own event shape or table. Run events are "Hard to reverse", so that design is decided and reviewed before its first code.
- The database functions that run a day read Offbeat's content JSON and rules: `check_run_event`, the question timer (`question_deadline`, `question_started_at`), the reveal-and-Next table, and the run status view (migrations `20261019074108`, `20261021081057`, `20261021084917`).
- Puzzle content: format 2 is Offbeat's (DECISIONS.md, Puzzle content format), stored at `content/offbeat/` and in `private.puzzle`. Game 2 needs its own format, which is also "Hard to reverse".
- App code: `GAME_ID = "offbeat"` in `src/content/puzzle.ts` is the only game ID. It is imported by `src/game/runs.ts`, `src/friends/board.ts`, `src/comments/comments.ts`, `src/reactions/reactions.ts`, `src/insights/queries.ts`, `src/admin/puzzles.ts` and `src/test/puzzles.ts`. `src/admin/puzzles.ts` reads the `content/offbeat` folder by name.

**Still to be built, and so best built with more than one game in mind** (Claude's reading; for the human, with each ticket): M09 points (an overall leaderboard adds up games), M10 groups (their leaderboards), M11 home screen ("the day's games"). None of them should add a game-2 option before game 2 exists ("Build for today", CLAUDE.md). The cheap part is not hard-coding a single game in new code where a `game_id` is already at hand.

## Acceptance criteria
Filled in once S1–S14 are answered. Draft shape, for the human to change:
- [ ] The daily substring picker refuses any substring with fewer dictionary words than S3's minimum, checked by a test with a substring just under the minimum.
- [ ] A typed word is accepted only if it is in the dictionary and contains the day's substring, judged by the server; the client never receives the word list.
- [ ] Two players get the same substrings on the same day (DECISIONS.md, Day boundary).
- [ ] A run ends as S7 says, and scores as S8 and S9 say, with the ledger row written as for Offbeat (M09).
- [ ] Offbeat plays exactly as before the split: its existing unit, database and e2e tests pass unchanged.

## Out of scope
- Games 3 to 6 (ROADMAP, Later). The word chain needs a different list of two-word phrases.
- The look (as M14 is for Offbeat): game 2 gets its own name and look, decided with the human like M14's L-questions.
- Live multiplayer rooms (S14).

## Numbers
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| Minimum words per substring | "Never impossible" | S3, open |
| Substring length | Picking substrings | S4, open |
| Substrings per run | The day | S5, open |
| Seconds per substring | Timer | S6, open |
| Lives | Ending | S7, open |
| Points per substring or word | Scoring | S8, open |
| Perfect-run total | Scoring, overall leaderboard weight | S9, open (Offbeat's is 1000, M04 G1) |

## Plan
Draft sub-tickets, for the human to reorder once S1–S14 are answered:
1. **16a, sources:** the dictionary (and, if S8 needs it, the frequency list) added to SOURCES.md by the human; a script that builds the filtered list, run through the task runner (DECISIONS.md).
2. **16b, platform/game split** (S13): game-2 content format and run-event design written and reviewed first (Hard to reverse), then the split with no change to how Offbeat plays.
3. **16c, the daily picker:** the deterministic script and its validator.
4. **16d, play:** the routes, the server-side word check, the timer and ending.
5. **16e, points and leaderboards:** game 2's ledger rows, its own leaderboard and the overall one.
6. **16f, the social pieces S12 keeps.**

## Removes
Nothing yet: this is a draft ticket with no code. The split (16b) is where something gets removed, such as the single `GAME_ID` constant as the only game.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
