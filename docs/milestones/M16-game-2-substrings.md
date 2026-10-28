# M16 — Game 2: the substring game

**Status:** planned, after launch (M15). Draft ticket for the human's approval, 2026-10-22. The human answered S1–S14 the same day; S1, S2's pick and S15–S19 are still open. No code, migration or content comes before those answers and the end of the MVP (human, 2026-10-21: the MVP is M00 to M12, "all working features first").

**Audit proposals (2026-10-26, not approved):** `docs/audits/2026-10-26-codebase-audit.md`, "M16": the boundary inventory below is stale (7 `GAME_ID` importers listed, 15–16 today, none of `src/app`), plus seven open decisions for the human before 16b.

## Goal
Add Plor's second daily game, a substring game inspired by JKLM: the player gets a few letters such as "cks" and types a word that contains them ("rocks", "backspace") before time runs out.

## Who uses it / what breaks without it
- Used by: every player, once the site has more than one game. Plor "is built to hold more than one game later, and ships with one" (ROADMAP, Product).
- Breaks without it: nothing today. That's why it comes after launch. Until game 2 exists, the platform/game boundary has nothing to separate. The ROADMAP pulls that boundary out "at game 2", and the home screen (M11) and the leaderboards (M09, M10) are built for one game.

## Source
No entry in `docs/SOURCES.md` covers a word list, word frequencies or this game's rules, and only a human can add one (SOURCES.md, Rules). S2 asks for the word list. Until it exists, this ticket follows:
- `docs/ROADMAP.md`, Later (after the MVP), "More games": game 2 "must never ask for something impossible or too hard like 'iur'"; "The games share one licensed dictionary. Each game has its own leaderboard, plus an overall one. Pull the platform/game boundary out at game 2."
- The longer note from 2026-10-19/20, in git at commit `4dc43a3` (`docs/ROADMAP.md`, line 31; the roadmap reset of 2026-10-20 shortened it).
- The human's answers to S1–S14 (2026-10-22), below.
- `docs/DECISIONS.md`, Hard to reverse (puzzle content format, run events, points ledger, day boundary) and Game 1 (`game_id` is permanent).

## What the human has said
- A substring game inspired by JKLM: given a few letters such as "cks", type a word containing them within a time limit (human, 2026-10-19; changed 2026-10-20).
- The day's substrings are the same for everyone (human, 2026-10-20).
- It must never ask for something impossible or too hard, like "iur" (human, 2026-10-20).
- The games share one licensed dictionary. Each game has its own leaderboard, plus an overall one that adds up all games (human, 2026-10-19).
- Every game shows progression as the player survives or scores more (human, 2026-10-20; M14).
- **The look** (human, 2026-10-22, for after the functional work, as M14 is for Offbeat): a witch tossing the player's words into a cauldron to brew something, and the brew gets "more and more violent" as the run goes on.

## Decisions
| # | Decision | Answer (origin) |
|---|---|---|
| S1 | The game's name and its `game_id`. The `game_id` is permanent: it's stored with every run, event, ledger row and content path (DECISIONS.md, Game 1) | **Open.** The human asked Claude for ideas that fit the cauldron (2026-10-22). Claude's shortlist: **Toil** (the witches' "double, double toil and trouble", *Macbeth*, public domain), **Simmer** (the brew heats up each round), **Brewhaha** (a pun on "brouhaha"; a spelling game named "BrouHaHa" exists). A web search on 2026-10-22 found no word game named Toil, Simmer or Brewhaha; that is not a trademark check (*unverified*) |
| S2 | The dictionary | "very, very broad", like JKLM's; offensive words and proper nouns removed; look at JKLM's word bank and Merriam-Webster (human, 2026-10-22). **The pick is open:** see "The dictionary" below |
| S3 | "Never impossible or too hard" | Difficulty narrows through the run (human, 2026-10-22): "the first couple rounds only have 2 characters in the substring", a "middle round" uses substrings in more than 500 words, the "last round maybe ~100-200", "never anything too difficult". The rounds in between are S18 |
| S4 | Substring length | 2 letters in the first rounds (human, 2026-10-22, with S3). The length for the later rounds is S18 |
| S5 | Rounds per day | 7, the same as Offbeat, "but open to suggestions. maybe i should just try and switch it up as well" (human, 2026-10-22) |
| S6 | Time limit per substring | 20 seconds "for now" (human, 2026-10-22) |
| S7 | How a run ends | No elimination: a miss or a timeout scores nothing for that round, and the run goes on to the next (human, 2026-10-22: "no elimination or 'run'") |
| S8 | Scoring | Its own system (human, 2026-10-22): more points for longer words, a bonus for using lots of different letters across the run, and a highlighted letter that earns a bonus on each word that uses it. The numbers are S15; one highlighted letter per day or per round is S16 |
| S9 | The perfect-run total | None: the human replaced it (2026-10-22). A player gets a score, plus a rank in the distribution of all players, friends and groups. Every game must still weigh the same in an overall cross-game score: S17 |
| S10 | Can one word answer two substrings in a run? | No (human, 2026-10-22) |
| S11 | Daily content | The human approves each day first, as in M06; a script that makes the days by itself comes later (human, 2026-10-22) |
| S12 | What carries over from Offbeat | All of it, if possible: the friends' live board, comments, reactions, groups and Share (human, 2026-10-22) |
| S13 | When the platform/game split happens | Right before game 2 (human, 2026-10-22) |
| S14 | Solo or multiplayer | A daily solo game, not live rooms (human, 2026-10-22: "yes, that is right") |
| S15 | Scoring numbers: points per letter of word length, the letter-variety bonus (per distinct letter, or at thresholds?), the highlighted-letter bonus | Open (human numbers) |
| S16 | One highlighted letter for the whole day, or a new one each round? | Open |
| S17 | How every game weighs the same in an overall score | Open. Claude's proposal is under "Comparing games" below |
| S18 | Difficulty per round, all 7: which rounds use 2 letters, which 3, and each round's word-count band. Does a 2-letter substring also need a minimum count? Are the 500 and 100–200 counted in the S2 list (a bigger list gives every substring more words)? | Open (human numbers) |
| S19 | Punctuation: "punctuation shoudln't affect anything" and apostrophes and hyphens are accepted (human, 2026-10-22). Claude's reading: they are dropped before matching and don't count toward word length, so "it's" contains "ts" and scores as 3 letters. Confirm | Open |

## The dictionary (S2)
Read on 2026-10-22; none of these is in SOURCES.md yet, and only a human adds one.
- **JKLM's own list is private.** Its FAQ says the BombParty dictionaries are known only to its content editors and asks players not to share word lists ([jklm.fun/faq](https://jklm.fun/faq/)). A community tool says the English list matches a merge of ENABLE, SOWPODS and a Moby crossword list, about 200,000+ words (*unverified*: it's the tool author's inference, from a Reddit thread).
- **Merriam-Webster doesn't fit.** Its API license is for non-commercial use with a limit of 1000 queries a day; commercial use needs a negotiated agreement, and its copyright notice forbids storing its content in a retrieval system without written permission ([dictionaryapi.com terms](https://dictionaryapi.com/info/terms-of-service)). Plor needs the whole list on its server to pick substrings and judge words.
- **SOWPODS** is Collins Scrabble Words, published by HarperCollins (Claude's knowledge, *unverified* here); using it would need a license.
- **Open lists that together come close to JKLM's breadth:** ENABLE (public domain, made for word games), the Moby word lists (public domain) and SCOWL (a permissive license: use, copy, modify, distribute and sell, keeping the notice), read from the Debian copies of their copyright files ([scowl copyright](https://metadata.ftp-master.debian.org/changelogs/main/s/scowl/stable_copyright)). SCOWL keeps proper nouns and some other categories in separate files, which would make removing them easier (*unverified*).
- **Claude's suggestion:** ENABLE + Moby + SCOWL, minus a published offensive-word list (one still to be chosen and licensed) and proper nouns. That's for the human to decide. Size and overlap get measured before S18's counts are fixed.

## Comparing games (S9, S17)
The human's question (2026-10-22): each game scores in its own way, so how can an overall "dominance" score weigh every game the same?

**Claude's proposal, for the human:** compare places, not points. Each day, a player's score in each game becomes a **percentile**: the share of that day's players of that game they beat. Ties share the average place, which matters for Offbeat's eight possible scores. The overall score adds up or averages those percentiles across games.
- Why: whatever a game's raw points look like (1000 at most in Offbeat, open-ended here), a percentile always runs 0–100 and spreads out the same way, so every game weighs the same.
- It fits the human's "distribution rank": the game screen can show "better than 72% of players today". Friends and groups are small, so a plain rank ("2nd of 6") reads better there than a percentile.
- Raw points stay as they are: each game keeps its own scoring and its own leaderboard. Offbeat's 1000 isn't needed for comparison any more; M04 G1 chose it so games would be standardized, and percentiles do that job.
- When it's final: the percentile can only be fixed once the day is over (a run finished after the day ended doesn't count, ROADMAP M09).
- **For the human to decide:** whether the overall score is a sum (playing every game every day counts) or an average of the games played (only how well you play counts); and the minimum number of players in a day before a percentile is shown (a human number), since a small beta day gives noisy percentiles.
- **Nothing changes in the MVP:** runs and events are kept, so percentiles can be computed from them when game 2 comes ("Build for today", CLAUDE.md).

## The platform/game boundary today
What a split would touch, read from the code on 2026-10-22 (`main` at `fd134f7`, plus M08 on its branch). Line counts and file lists are from `grep`. Whether each piece needs to change is a design question for the split's sub-ticket (S13), *unverified* until then.

**Already per game (the schema was designed for it):** every game table is keyed by `game_id`: `private.puzzle`, `run`, `run_event` (`puzzle_questions` went in M13 13d), `comment` and `reaction`, and the live-board broadcast carries `gameId`. The points ledger is designed as unique per (user, `game_id`, date) (DECISIONS.md, Points ledger).

**Offbeat-only today:**
- `run_event` holds Offbeat's answer: `question_idx`, `entry_id`, `matched` (DECISIONS.md, Run events). A game-2 answer is a typed word for every round, or a miss (S7), so it needs its own event shape or table. Run events are "Hard to reverse", so that design is decided and reviewed before its first code.
- The database functions that run a day read Offbeat's content JSON and rules, including sudden death: `check_run_event`, the question timer (`question_deadline`, `question_started_at`), the reveal-and-Next table, and the run status view (migrations `20261019074108`, `20261021081057`, `20261021084917`).
- Puzzle content: format 2 is Offbeat's (DECISIONS.md, Puzzle content format), stored at `content/offbeat/` and in `private.puzzle`. Game 2 needs its own format (the 7 substrings and the highlighted letter), which is also "Hard to reverse".
- App code: `GAME_ID = "offbeat"` in `src/content/puzzle.ts` is the only game ID. It is imported by `src/game/runs.ts`, `src/friends/board.ts`, `src/comments/comments.ts`, `src/reactions/reactions.ts`, `src/insights/queries.ts`, `src/admin/puzzles.ts` and `src/test/puzzles.ts`. `src/admin/puzzles.ts` reads the `content/offbeat` folder by name.
- The live board (M07) shows where a friend was caught. With no elimination (S7), game 2's board needs its own meaning, such as rounds scored so far.

**Still to be built, and so best built with more than one game in mind** (Claude's reading; for the human, with each ticket): M09 points (an overall leaderboard adds up games), M10 groups (their leaderboards), M11 home screen ("the day's games"). None of them should add a game-2 option before game 2 exists ("Build for today", CLAUDE.md). The cheap part is not hard-coding a single game in new code where a `game_id` is already at hand.

## Acceptance criteria
Filled in once the open decisions are answered. Draft shape, for the human to change:
- [ ] The daily substring picker refuses any substring outside its round's S18 word-count band, checked by a test with a substring just outside the band.
- [ ] A typed word is accepted only if it is in the dictionary, contains the round's substring once punctuation is dropped (S19) and hasn't been used earlier in the run (S10), judged by the server; the client never receives the word list.
- [ ] A miss or a timeout scores nothing for that round and the run goes on to the next (S7).
- [ ] Two players get the same substrings and highlighted letter on the same day (DECISIONS.md, Day boundary).
- [ ] The score follows S15 and S16, checked by tests on hand-worked runs.
- [ ] The human approves each day before it goes live (S11).
- [ ] Offbeat plays exactly as before the split: its existing unit, database and e2e tests pass unchanged.

## Out of scope
- Games 3 to 6 (ROADMAP, Later). The word chain needs a different list of two-word phrases.
- The look (the witch and the cauldron): it comes after the functional work, as M14 does for Offbeat.
- Live multiplayer rooms (S14).
- The script that makes days by itself (S11, later).

## Numbers
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| Rounds per day | The day | 7 (human, 2026-10-22, S5; may change) |
| Seconds per substring | Timer | 20 (human, 2026-10-22, S6: "for now") |
| Substring length, first rounds | Picking substrings | 2 letters, "the first couple rounds" (human, 2026-10-22, S3); which rounds exactly is S18 |
| Words containing a middle round's substring | Difficulty | more than 500 (human, 2026-10-22, S3); which round is S18 |
| Words containing the last round's substring | Difficulty | "~100-200" (human, 2026-10-22, S3) |
| The other rounds' lengths and bands | Difficulty | S18, open |
| Points per letter, letter-variety bonus, highlighted-letter bonus | Scoring | S15, open |
| Minimum players before a percentile is shown | Comparing games | S17, open |

## Plan
Draft sub-tickets, for the human to reorder once the open decisions are answered:
1. **16a, sources:** the word lists and an offensive-word list added to SOURCES.md by the human; a script that builds the filtered dictionary, run through the task runner (DECISIONS.md). Measure its size, then settle S18's bands.
2. **16b, platform/game split** (S13): game-2 content format and run-event design written and reviewed first (Hard to reverse), then the split with no change to how Offbeat plays.
3. **16c, the daily picker:** a script that proposes the day's substrings and highlighted letter within S18's bands, and the admin page approval (S11).
4. **16d, play:** the routes, the server-side word check, the timer and the no-elimination rounds.
5. **16e, points, ranks and leaderboards:** game 2's ledger rows, its own leaderboard, the percentile and friends' rank (S9), and the overall score (S17).
6. **16f, the social pieces** (S12: all of them).

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
