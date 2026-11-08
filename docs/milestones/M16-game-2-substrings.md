# M16 — Game 2: the substring game

**Status:** in progress (16a done in PR #155; 16b, `docs/milestones/M16-16b-run-model-and-format.md`, done in PR #157, 2026-11-06; 16a-2, proper spellings, done in PR #158, merged on green CI 2026-11-06, 256,433 words; the split's questions answered and the order approved, "Approve, ask S18"; S18, S20 and S21 settled; 16a-3, possessives out and 160 words back, 254,477 words, done in PR #159; 16c, a day of game 2, done in PRs #160 and #161; 16d, playing it, done in PRs #162 and #163; 16e, points and boards, approved, the score done in PR #164, places and game 2's boards done in PR #165, the overall board approved, game 1's midnight rule done in PR #166, the overall board in review), before the closed beta (human, 2026-11-05: "Both in the beta (Recommended)"). Draft ticket for the human's approval. The human answered S1–S14 on 2026-10-22 and S2's pick on 2026-11-05; S1's ID, S5's fixed 7 and S16 were settled in 16b (2026-11-06) and S19 on 2026-11-05; S1's shown name is still open, and S15 and S17 are settled in 16e, with the audit's seven below. Its non-visual parts can run alongside M14's game design; its shared screens wait for the `/play` build (Answers, below).

**Audit proposals (2026-10-26, not approved):** `docs/audits/2026-10-26-codebase-audit.md`, "M16": the boundary inventory below is stale (7 `GAME_ID` importers listed, 15–16 today, none of `src/app`), plus seven open decisions for the human before 16b.

## Goal
Add Plor's second daily game, a substring game inspired by JKLM: the player gets a few letters such as "cks" and types a word that contains them ("rocks", "backspace") before time runs out.

## Who uses it / what breaks without it
- Used by: every player, once the site has more than one game. Plor "is built to hold more than one game later, and ships with one" (ROADMAP, Product).
- Breaks without it: the human wants two games at launch (2026-11-05: "ideally i want to have 2 games on launch"), and the beta is the first time players try them. Until game 2 exists, the platform/game boundary has nothing to separate. The ROADMAP pulls that boundary out "at game 2", and the home screen (M11) and the leaderboards (M09, M10) are built for one game.

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

## Answers (human, 2026-11-05)
The human's question: "if theres no actual risk or bottleneck we should start on the second game since ideally i want to have 2 games on launch". Claude's reply named no blocker and these costs: the split shares files with the `/play` build, the run model is hard to reverse, the open decisions and a second design need the human's time, and the dictionary's size isn't measured.
1. When: "Both in the beta (Recommended)". The beta tests both games, and the split happens before any real player data exists. This replaces "after launch".
2. The look: "Moonbrew (Recommended)". The cauldron theme kept from M14 14c-3, on its private mocks page; it still needs rebuilding to Afterglow's standard.
3. The dictionary: "ENABLE + Moby + SCOWL (Recommended)".
4. Order against the `/play` build, asked twice: first "wait why is game 2 two separate games??" (Claude's "split" meant separating Plor's shared parts from game 1's rules; game 2 is one game), then "im not very technically versed but can't we build like the stuff besides the visuals first for game 2 simultaneous.ly". **Claude's reading, for approval:** yes. The dictionary, the database, the server's word check and a plain play screen go on alongside M14; the screens shared with game 1 wait for the `/play` build. Whether the server work avoids that build's files is *unverified*: it has no ticket yet.
5. Profiles, search and friend requests come after this milestone, before the beta (M17).

## Answers on the split (human, 2026-11-06)
Asked from a fresh grep at `98609f5`: `GAME_ID` is imported by 18 non-test files, game 1's name appears on 64 lines in 25 files of `src`, `scripts` and `next.config.ts` and in 13 e2e files, and the shared run rules, `approve_puzzle` and the feed, streak and Me all mean game 1 (audit, DB-3, FUT-5, FUT-6, FUT-11, APP-6).
1. What Plor is: "Two games, one account". Each game stands alone, with the streak, the feed and the overall board below as what's shared.
2. The streak: "One shared streak (Recommended)". The word "Finish any one game (Recommended)" came from Claude's question, which misdescribed today's rule (M11 H4 counts a day on starting a run). Asked again: "Started counts (Recommended)". Starting either game counts the day, and game 1's rule doesn't change.
3. Comments: "Each game its own (Recommended)", opened by finishing that game.
4. The friends feed: "One mixed feed, labelled". All friends' activity in one list, each item tagged with its game, and items for a game the viewer hasn't played blurred.
5. The overall leaderboard: "Yes, keep the overall one (Recommended)", as S17 still has to weigh, after each game's own board works.
6. How: "Piece by piece (Recommended)". Each part is separated when game 2 first needs it, clear of the `/play` build's screens; some of game 1's names stay for a while.

**Claude's reading:** Me keeps L45's "Totals across games, A card per game" (M14), which answer 1 doesn't change. How a day with no approved day in one game counts for the shared streak is for 16f.

## Decisions
| # | Decision | Answer (origin) |
|---|---|---|
| S1 | The game's name and its `game_id`. The `game_id` is permanent: it's stored with every run, event, ledger row and content path (DECISIONS.md, Game 1) | **ID chosen:** `substrings` (human, 2026-11-06, 16b: "substrings (Recommended)"). **The shown name is open.** The human asked Claude for ideas that fit the cauldron (2026-10-22). Claude's shortlist: **Toil** (the witches' "double, double toil and trouble", *Macbeth*, public domain), **Simmer** (the brew heats up each round), **Brewhaha** (a pun on "brouhaha"; a spelling game named "BrouHaHa" exists). A web search on 2026-10-22 found no word game named Toil, Simmer or Brewhaha; that is not a trademark check (*unverified*) |
| S2 | The dictionary | "very, very broad", like JKLM's; offensive words and proper nouns removed; look at JKLM's word bank and Merriam-Webster (human, 2026-10-22). **Picked** (human, 2026-11-05): "ENABLE + Moby + SCOWL (Recommended)": see "The dictionary" below |
| S3 | "Never impossible or too hard" | Difficulty narrows through the run (human, 2026-10-22): "the first couple rounds only have 2 characters in the substring", a "middle round" uses substrings in more than 500 words, the "last round maybe ~100-200", "never anything too difficult". The rounds in between are S18 |
| S4 | Substring length | 2 letters in the first rounds (human, 2026-10-22, with S3). The length for the later rounds is S18 |
| S5 | Rounds per day | 7, the same as Offbeat, "but open to suggestions. maybe i should just try and switch it up as well" (human, 2026-10-22). Fixed in the format: "Always 7" (human, 2026-11-06, 16b) |
| S6 | Time limit per substring | 20 seconds "for now" (human, 2026-10-22) |
| S7 | How a run ends | No elimination: a miss or a timeout scores nothing for that round, and the run goes on to the next (human, 2026-10-22: "no elimination or 'run'") |
| S8 | Scoring | Its own system (human, 2026-10-22): more points for longer words, a bonus for using lots of different letters across the run, and a highlighted letter that earns a bonus on each word that uses it. The numbers are S15; one highlighted letter per day or per round is S16 |
| S9 | The perfect-run total | None: the human replaced it (2026-10-22). A player gets a score, plus a rank in the distribution of all players, friends and groups. Every game must still weigh the same in an overall cross-game score: S17 |
| S10 | Can one word answer two substrings in a run? | No (human, 2026-10-22) |
| S11 | Daily content | The human approves each day first, as in M06; a script that makes the days by itself comes later (human, 2026-10-22) |
| S12 | What carries over from Offbeat | All of it, if possible: the friends' live board, comments, reactions, groups and Share (human, 2026-10-22) |
| S13 | When the platform/game split happens | Right before game 2 (human, 2026-10-22) |
| S14 | Solo or multiplayer | A daily solo game, not live rooms (human, 2026-10-22: "yes, that is right") |
| S15 | Scoring numbers: points per letter of word length, the letter-variety bonus (per distinct letter, or at thresholds?), the highlighted-letter bonus | **Settled** (human, 2026-11-07): word points grow about 25% a letter, different letters about 15% a letter, cashed in at the end, 120 a word for the bonus letter, rounded to nice numbers, sizes Claude's and approved (`docs/milestones/M16-16e-points-and-boards.md`, answers 5 to 13) |
| S16 | One highlighted letter for the whole day, or a new one each round? | "One per day" (human, 2026-11-06, 16b) |
| S17 | How every game weighs the same in an overall score | **Settled** (human, 2026-11-07): daily percentiles, an overall board showing both the sum and the average, 10 players before a percentile shows (`docs/milestones/M16-16e-points-and-boards.md`, answers 2, 15 to 19) |
| S18 | Difficulty per round | **Partly settled (human, 2026-11-06).** Letters: "2, 2, then five of 3 (Recommended)". Words fitting rounds 1 to 7, counted in the S2 list: 5,000+ / 2,000-5,000 / 1,000-2,000 / 500-1,000 / 300-500 / 200-300 / 100-200: "steady climb, but this one doesnt have a penalty as in "end run" it just doesnt count for points yfm". A substring comes back after: "30 days (Recommended)". The last round stays at 100-200 ("Keep 100-200 (Recommended)", after the human played 30 of its sets, solving 29, and asked for 200+ words: none has more than 193). The floor is S21 |
| S19 | Punctuation: "punctuation shoudln't affect anything" and apostrophes and hyphens are accepted (human, 2026-10-22). Dropped before matching and not counted toward word length, so "it's" contains "ts" and scores as 3 letters: "Yes, ignore it (Recommended)" (human, 2026-11-05). Widened to everything but letters, digits, symbols and spaces too: "app3le" is apple (human, 2026-11-06; DECISIONS.md, Game 2) |
| S20 | Possessives | "Not accepted at all" (human, 2026-11-06), to a question about `boss's` making "sss" look like a round. Contractions stay: "also we can keep contractions", with pronoun forms like `something's`: "Keep all 13 (Recommended)". The table tells them apart (`he's <s>`). In `M16-16a-3-possessives-and-mild-words.md` |
| S21 | What "common" means here, and the floor | Settled (human, 2026-11-06). It only keeps rounds fair: players never see it, and a rare word scores the same (Claude's reading of the human's questions, which set scoring aside; the human hasn't said so in terms). A word is common if it's on the everyday list, SCOWL size 35 or less, about 40,000 words: "Yes, use that". A substring needs "At least 5 (Recommended)" everyday words. Real results correct it after the beta ("Yes, after the beta (Recommended)"). Offered "length/# of unique letters", the human chose the list once they'd seen the measurement below |
| S22 | The offensive filter on game 2 | `smut`: "Allow mild words back" (human, 2026-11-06). Reading the filter's work showed `finger`, `throat`, `came` and `shrimp` blocked too. Two lists, 160 words, approved ("Approve, build it") in `M16-16a-3-possessives-and-mild-words.md` |

## Measuring common words (S21)
Measured 2026-11-06 on the 256,433-word snapshot, with throwaway scripts, on the steady climb's bands. "Everyday" means SCOWL size 35 or less, about 40,000 words, which the table's README calls "small" (read in 16c). 16c narrowed it to main spellings, so the counts here are a little high: `rhi` is 4, not 3 or 5, which keeps it under the floor.
- **The band alone isn't enough.** `cya` has 106 words and 1 everyday, `myc` 141 and 0, `oec` 118 and 0, so all three pass the 100-200 band. "iur" has 48 words and is outside it.
- **Length and unique letters are weak stand-ins.** *Hypothesis:* they rank fragments differently from a known-word list. *Disproved by:* a length rule picking out the hard fragments as well as the list. *Result:* across the 732 fragments of the 100-200 band, rank agreement with the everyday count is 0.35 for words of 7 letters or fewer and 0.31 for 6 or fewer unique letters (1.0 would be the same order). Held. Short words are only somewhat more often everyday: 39% at 3 letters, 31% at 5, 18% at 8. Length does catch the extremes (`cya` 15 short words, `izz` 86), but it ranks `fly` with `izz` at 12 everyday words against 47, and `cyanate` and `cyanite` count as short.
- **Possessives inflated counts.** *Hypothesis:* `sss` and `tys` stand high through possessives. *Result:* `sss` 158 to 7 words, `tys` 137 to 23, `shs` 126 to 13. Held. The other pools barely move.
- **The human played the last round's sets (2026-11-06):** 30 blind sets, solved 29, with `rhi`, 3 everyday words (`rhino`), the one missed. `cya` (1 everyday) fell to cyanide, so the floor is for players who aren't the human, who said "i like to think im pretty good at this". Two answers would have been misses: `smut`, blocked, and a misspelling of `corduroys`.
- **What each floor leaves,** with possessive-only words out, for the last round (100-200): any 732, 5 everyday words 663, 10 547, 15 412, 20 287, 30 96; for round 6 (200-300): 427, 418, 392, 349, 305, 217. Rounds 3 to 5 lose little at 20 or under. Samples, last round: 1-4 everyday `dys`, `myo`, `viz`; 5-9 `cht`, `gad`, `nep`; 10-14 `dup`, `lew`, `nil`; 15-19 `dry`, `sip`, `uds`; 20-29 `fee`, `pay`, `twe`.

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
- [ ] A typed word is accepted only if it is in the dictionary, contains the round's substring once everything but letters is dropped (S19) and hasn't been used earlier in the run (S10), judged by the server; the client never receives the word list.
- [ ] A miss or a timeout scores nothing for that round and the run goes on to the next (S7).
- [ ] Two players get the same substrings and highlighted letter on the same day (DECISIONS.md, Day boundary).
- [ ] The score follows S15 and S16, checked by tests on hand-worked runs.
- [ ] The human approves each day before it goes live (S11).
- [ ] Before game 2 goes live, the About page shows UKACD's notice prominently with its text verbatim, and ESDB's notice (SOURCES.md, 16a).
- [ ] Offbeat plays exactly as before the split: its existing unit, database and e2e tests pass unchanged.

## Out of scope
- Games 3 to 6 (ROADMAP, Later). The word chain needs a different list of two-word phrases.
- Live multiplayer rooms (S14).
- The script that makes days by itself (S11, later).

## Numbers
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| Rounds per day | The day | 7 (human, 2026-10-22, S5; may change) |
| Seconds per substring | Timer | 20 (human, 2026-10-22, S6: "for now") |
| Letters per round | Picking substrings | 2, 2, 3, 3, 3, 3, 3 (human, 2026-11-06, S18: "2, 2, then five of 3 (Recommended)") |
| Words fitting rounds 1 to 7 | Difficulty | 5,000+ / 2,000-5,000 / 1,000-2,000 / 500-1,000 / 300-500 / 200-300 / 100-200 (human, 2026-11-06, S18: "steady climb") |
| Days before a substring returns | Picking substrings | 30 (human, 2026-11-06, S18: "30 days (Recommended)") |
| Everyday words a substring must have | Difficulty | 5 (human, 2026-11-06, S21: "At least 5 (Recommended)") |
| A common word's SCOWL size | Difficulty | 35 or less (human, 2026-11-06, S21: "Everyday, 40,000 words" as the option, "Yes, use that") |
| Points per letter, letter-variety bonus, highlighted-letter bonus | Scoring | S15, open |
| Minimum players before a percentile is shown | Comparing games | S17, open |

## Plan
Draft sub-tickets, for the human to reorder once the open decisions are answered.

**Claude's proposal, approved by the human (2026-11-06: "Approve, ask S18"), piece by piece (answer 6):** each piece has its first caller in the piece, as a format or table with no caller breaks "Build for today". The first draft's 16b-to-16g order put the split before anything that uses it.

Non-visual, alongside M14:
1. **16a, the dictionary,** done. **16b, the run model and format,** done. **16a-2, proper spellings,** done.
2. **16a-3, possessives out, ordinary and mild words back,** then **16c, a day of game 2.** S18 is settled. The everyday mark on each word, the substring picker with its bands, floor and 30-day repeat, refusing a substring that is itself on an offensive list, the format 1 validator it writes for, `content:validate` reading each game's folder (the first game-2 file fails CI today, audit TOOL-11), `approve_puzzle` choosing its checks by game (it refuses all but format 3, FUT-6), and the admin page's approval (S11).
3. **16d, playing it.** `dictionary_word` and its load, with H4 (Docker running); `round_word`, `round_reject` and the judge; `check_question_open` and `run_status` choosing by game (DB-3, FUT-5), game 1's branch unchanged; a plain play screen with the letters-only word check. Before the migration, the extra grants go to the human (ROADMAP, For M16). Needs the game's working name and address.
4. **16e, points and boards.** Needs S15 and S17. Game 2's ledger rows, its own leaderboard, the percentile and friends' rank (S9), then the overall board (answer 5).

After M14's `/play` build merges (shared screens):
5. **16f, the shared pieces.** Today with two games, the shared streak (answer 2), each game's comments and reactions (answer 3), the labelled mixed feed (answer 4), Me, the live board, groups and Share (S12).
6. **16g, Moonbrew:** the game's look, as M14 14c did for game 1.

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
