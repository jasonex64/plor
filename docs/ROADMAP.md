# Roadmap

At the start of each session, agents report the current milestone, its status and what comes next.

## Product
**Plor** (human, 2026-10-18; at `plor.app`) is a small daily word-game site that should feel welcoming but neutral (human, 2026-10-19). It's built to hold more than one game later, and ships with one.

**What the MVP is** (Claude's summary of the docs and the human's answers; confirmed by the human, 2026-10-21: "other than that it looks fine"):
- **Sign in** with an emailed code or Google, and pick a username. Today it can't change; whether it can is an M12 question.
- **Play the day's game.** Everyone gets the same puzzle each day, and the day resets at midnight Pacific.
- **The human writes each day's questions;** a Claude session drafts the answers, and the human approves the day on an admin page (M06). Puzzles, runs and missed answers are kept so they can be analyzed later.
- **Friends:** added by invite link; a live board of friends' runs, showing where each one was caught (M07). Players can set a display name that doesn't have to be unique (M07).
- **Comments and reactions** on the day's game, friends only, after you've played (M08).
- **Points** and an all-time friends leaderboard (M09).
- **Groups:** named circles joined by invite link, each with its own leaderboard and comments (M10).
- **A home screen** that ties these together (M11).
- **An account page,** including deleting your account (M12).
- **Plain screens:** the look (M14) comes after all of it, admin pages included (human, 2026-10-21: "everything should look nice eventually, but for now functionality only").

**Game 1: Don't Match the Host** (named Offbeat, `game_id` `offbeat`):
- **Questions:** each day has 7 fixed, independent questions that mix concrete and abstract ones (e.g. "Name a day of the month", "Name something you'd bring to a potluck").
- **Answering:** the player types an answer within 20 seconds and must avoid the host's secret answers. Niche answers are a fair escape. Text that isn't on the list gets a free retry.
- **The Wind** steals a letter on questions 2, 4, 5 and 7.
- **Ending and points:** a match or a timeout ends the run. Surviving questions 1 to 7 earns 25, 50, 75, 100, 150, 250 and 350 points, so a perfect run is 1000.

DECISIONS.md, Game 1, has the rules and the answer model.

## Focus (human, 2026-10-21)
**The MVP is every functional milestone, M00 to M12** (human, 2026-10-21: "After M11", the account milestone, before puzzle entry was inserted ahead of friends). The earlier MVP, the game mechanics alone, is done (M04), and so is Share (M05).
- **Order** (human, 2026-10-21): "all working features first. home screen friends screen groups, account etc. nothing visual comes until after things are functijnal". Answer acceptance waits too: "id rather just have a full working app, even if we have not that many promots for the game ... quality of everything else first".
- **Puzzle entry comes first** (human, 2026-10-21, chosen from Claude's options: an admin page form, "First, before friends"). In the human's words: "lets just make it so i can manually put in puzzle for each day for now. have a way to keep the data and analyze it, work on that in the future after we have the game out and some smaple data".
- **Claude's order within the rest, for the human to change:** comments and points are friends-only, so they follow friends. Groups and the home screen show friends' comments and scores. Account comes last, so deleting an account covers every table. Answer lists (M13) come before the look (M14), because answer checking is function, not visuals.
- **plor.app while building** (human, 2026-10-21): "its fine pretend im the only one lookijg at it until we r done". It stays public and may lag behind `main`. Nothing is published for others until launch (M15).

## Milestones
Status: `planned` → `in progress` → `in review` → `done`. The table is in the order of work, and the numbers follow it.

| # | Milestone | Scope | Status | Ticket |
|---|---|---|---|---|
| M00 | Foundations | Stack and tooling decisions, the hard-to-reverse designs, CI, `scripts/status`, staging deploy | done | `docs/milestones/M00-foundations.md` |
| M01 | Puzzle content and validator | Content file format, a validator that enforces the answer model, 14 real daily puzzles (7 questions per date) | done | `docs/milestones/M01-puzzle-content.md` |
| M02 | Sign-in and playable game | Sign-in by emailed code or Google; profile; runs pinned to the Pacific-midnight day; server-checked answers; sudden death; result screen; privacy page; the cleanup (2f) and the content survey (2g) | done | `docs/milestones/M02-sign-in-and-play.md` |
| M03 | Puzzle insights | An admin report per question: catch rate, share of answers in the host bank, logged misses | done | `docs/milestones/M03-puzzle-insights.md` |
| M04 | Game mechanics: working and smooth | Free typing (the server matches the text); 20 seconds per question; the Wind steals letters (schedule A: Q2, Q4, Q5, Q7); a reveal after each answer, then Next; points during the run; a countdown to the reset | done (PRs #23 to #28) | `docs/milestones/M04-game-mechanics.md` |
| M05 | Share | Spoiler-free share text (rounds survived and the date) whose link opens today's game, by share sheet or clipboard | done (PR #30) | `docs/milestones/M05-share.md` |
| M06 | Puzzle entry | The human writes only the day's 7 questions; a Claude session drafts the answers and suggests the host's answers (human, 2026-10-21: "all i do is type the questions", generation by a Claude session for the MVP, "ai suggests"); the human reviews and approves each day on an admin page ("yes") before it goes live. Approved puzzles live in the database, written only through a guarded database function (human, 2026-10-21: "yes thats fine and admincan write changes thats fine") | done (PR #33; first drafted day PR #34) | `docs/milestones/M06-puzzle-entry.md` |
| M07 | Friends and live board | A display name (human, 2026-10-21: "there should alao be a display name (doesnt have to be unique unlike username)"): optional, shown instead of the username when set, changeable any time (human, chosen from Claude's options: "Optional, change any time", built "With friends, M07"); its length and characters are human numbers for the ticket. Invite link (a random code, not the username, so a rename never breaks it; Claude's draft) and mutual friends; a live board (status for everyone, plus where each friend ended once you've finished); friends-only delivery; reconnects logged and counted. The "where everyone ended" picture follows the rule the human accepted on 2026-10-20 (closed draft D28): you are always shown, then a few named friends per place, then a count; tapping a place shows the list, and a plain list sits underneath. The per-place limit is a human number | in progress (7a display name in review; 7b next) | `docs/milestones/M07-friends-and-live-board.md` |
| M08 | Comments and reactions | On the day's game, friends only, visible after you've played, delete your own, report others | planned | — |
| M09 | Points and friends leaderboard | Ledger written when a run ends (DECISIONS.md, Points ledger; design in `M00-data-design.md` §6), a one-time backfill from earlier runs, an all-time friends leaderboard equal to the ledger sum. A run finished after its day ended doesn't count (human, 2026-10-21). *Decide with the ticket:* how a run left at a reveal scores (it never ends by itself), whether a timed-out run scores like a caught one (Claude's reading, DECISIONS.md Game 1), and, if it does, what writes its ledger row, since a timed-out run has no ending event (§6 writes the row with the ending event; found in the 2026-10-21 docs audit) | planned | — |
| M10 | Groups | Private leaderboards joined by invite link, with their own comments and reactions, and seeing the misses of friends and group members (human, 2026-10-19; kept in the MVP with friends, human, 2026-10-21: "Both, as planned") | planned | — |
| M11 | Home screen | The day's games, friends' scores, and a feed of comments and reactions that stays blurred until you've played (human, 2026-10-19 and 10-20) | planned | — |
| M12 | Account | Claude's draft scope, settled in the ticket: what a player can do with their own account (today: pick a username once, see it, sign out); whether a username can be changed, and how often (the human asked about the tradeoffs, 2026-10-21; "can't be changed" was an M02 scope limit, not a decision; changing it needs an update grant, a security change); self-service account deletion, and the sign-in fixes under "For M12" in Next revision | planned | — |
| — | **MVP line** | | | |
| M13 | Answer lists and content | Free typing and stolen letters push players to quirky answers, and hand lists reject many fair ones ("not in our list"). A large answer source per category (WordNet held 223 of a day's 226 animals, M04; its license and a SOURCES.md entry come first, by the human), typed answers checked against it, an automatic daily letter picker, the 9 parked days (`content-parked/`), which days to play (M04 G6; the 28 drafted days were to be re-dated for the beta, human, 2026-10-20, which M06's form may replace), and difficulty tuned together with the human ("challenging", M04 G3) | planned | — |
| M14 | Look and feel | A finished, phone-first look with code-drawn pixel art: the ridge, the player's character and the Wind as the host (the human's decisions, from the closed draft PR #12) | planned (draft ticket; its questions wait until the functional milestones are done) | `docs/milestones/M14-look-and-feel.md` |
| M15 | Launch readiness and closed beta | Load test of the reset-time spike, including live connections; alerts, backups, a full privacy policy and terms; staging runs and applying pending migrations to the hosted database (human, 2026-10-21); the closed beta, which is also the live playtest (human, 2026-10-20): is it fun, do players finish, and what are the real catch rates; the share's day number ("Offbeat #n"), counted from the beta's first day (human, 2026-10-21, M05 S2), and a check of the share sheet on a real phone over HTTPS (M05) | planned | — |

Tickets get written when their milestone comes up, so they don't go stale.

*Numbering: milestones were renumbered on 2026-10-19 and twice on 2026-10-21, so the numbers follow the order of work (the maps are in the DECISIONS.md Log). Finished tickets (M00–M05), applied migrations, code comments in them, git history and the Log keep the numbers they were written with; for example, the 2026-10-21 migrations cite `M13-game-mechanics.md`, which is now `M04-game-mechanics.md`.*

## Later (after the MVP)
Each item needs its own ticket. Earlier, longer text is in git at commit `4dc43a3`.
- **Analyzing the data and generating puzzles** (human, 2026-10-21: "work on that in the future after we have the game out and some smaple data"). This covers AI puzzle drafting (human, 2026-10-19): fully automatic daily puzzles built from the insights numbers (M03), starting with one-click approval by the human, who can veto once it's automatic. It needs an API key kept only in Vercel. Claude's suggestion, not decided: an automatic gate against repeating a past prompt.
- **"Semantic search" and an AI judge** (human, 2026-10-20). The judge plan was stopped by the human (2026-10-21), and where answers come from is M13.
- **Average score** per game (human, 2026-10-20), shown only after a minimum number of played days (the minimum is a human number).
- **Currency and cosmetics** (human, 2026-10-19 and 10-20):
  - earn-only coins (from logging in, playing, doing well and commenting) that can never be bought with real money or traded;
  - spins with the odds shown and no exact duplicates;
  - profile and comment frames, and emotes.
- **More games** (human, 2026-10-19 and 10-20):
  - game 2, a substring game inspired by JKLM, which must never ask for something impossible or too hard like "iur";
  - game 3, a word-guessing game under its own name and look (not Wordle's name or tiles);
  - game 4, a word chain;
  - game 5, anagrams, and game 6, a word hunt, both with a bonus letter.

  The games share one licensed dictionary. Each game has its own leaderboard, plus an overall one. Pull the platform/game boundary out at game 2.
- **Shorter and custom invite links** (human, 2026-10-21: "eventually want some sort of url shortener 22 is hella long", and players customizing their link in settings, "after mvp"). M07's code is 22 random characters. A shorter code is easier to guess, so its length needs a fresh security look.
- **Installable app (PWA):** DECISIONS.md plans "installable as a PWA", but no manifest exists yet (found in the 2026-10-21 docs audit). It needs icons, so it goes with the look or after.
- **Wait for beta data** (human, 2026-10-19 and 10-20): how many daily games and whether they rotate; fixing an unpopular game; a curated feed; "poke" a friend; one harder day a week; streaks; answer stats ("12% picked lion"); reminders; a global leaderboard; a native app wrapper; public comment moderation.
- **Endgame goal** (human, 2026-10-20: "number one"): puzzles for every game made automatically, with the health of each game and question monitored and stored so the games improve over time.

## Next revision (deferred)
These are non-blocking items found during work or review. Record each one here **before** acting on it. Items get pulled into a milestone on purpose; nobody fixes them on the side. Done items were removed in the roadmap reset (2026-10-20; they are in git at commit `4dc43a3`). Open items are grouped by where they belong.

<!-- - [ ] <item> — found in M## (implementation | review) — <why it can wait> -->
**The survey's main finding (M02 2g, for the human):** 14 of 21 questions caught nobody, and only 10 of 110 entry answers were caught, from 7 people. DECISIONS.md sets no target catch rate. The target catch rate (G3, "challenging") and the tuning are M13's; the details are in `docs/milestones/M02-2g-survey.md`, Findings.

**For M07 (friends):**
- [ ] *Unverified* (M00 stack comparison, R2): whether Broadcast can send to many topics in one call, and whether a database-side `realtime.send()` is part of the surrounding transaction. Check before designing the board. Found in M00; carried here in the 2026-10-21 docs audit.
- [ ] Design the `realtime.messages` RLS policy that limits `board:<viewer_id>` to its owner. Found in M00 (review). This is M07 work, with no game-table changes.

**For M09 (points):**
- [ ] Record the points formula (25 to 350 per survived question, 1000 for a perfect run; DECISIONS.md, Game 1) in the M09 ticket's Numbers table when that ticket is written. Found in M00 (review 2).

**For M11 (home screen):**
- [ ] The home page intro says "daily word games" (plural) and "keep your results", while there is one game and no history view yet. Found in M02 (2c review of the intro). Accurate enough for Google's review; revisit the copy with the home screen (M11) or the look (M14).

**For M12 (account and sign-in):**
- [ ] Sign-out scope (under "For M15") is also about the account; decide in the M12 ticket whether it belongs here. Found in the 2026-10-21 reorder (review). It can wait: placement only.
- [ ] The code form has no way back to fix a mistyped email (only a reload), and a pasted "123 456" keeps its space. Found in M02 (2f review). UX only; the error message says to reload.

**For M14 (look and feel):**
- [ ] M04 G11 says a stolen letter's key does nothing "and the box shakes"; the key does nothing, but nothing shakes or flashes. Found in the 2026-10-21 docs audit. A look detail.
- [ ] The share text uses placeholder symbols (🟩 survived, ⬜ not; human, 2026-10-21: "can use placeholder symbols for now"). Pick the real ones with the look. Found in M05 (implementation).
- [ ] The survived count is worked out twice, in `shareText` (`src/game/share.ts`) and in `Result` (`src/app/game.tsx`), both as `answered.filter((a) => !a.matched).length`. Found in M05 (review). It can wait: the two lines can't disagree today, and M14 reworks the result screen, where one helper can serve both.

**For M15 (launch):**
- [ ] The expected number of players at the reset and the Supabase spend cap (500 or 10,000 live connections) are human numbers the load test needs (M00 foundations, Numbers; M00 stack comparison, Risk 1). Found in the 2026-10-21 docs audit.
- [ ] The 7 people who answered the M02 2g survey have seen the days dated 2026-10-26 to 10-28: those days get new prompts, or the people are told, before the beta (M02 2g, plan step 4). Found in the 2026-10-21 docs audit.
- [ ] Where a browser has `navigator.share` but no share targets, Share rejects with `AbortError`, the same error as a cancel (MDN), so nothing happens. Falling back to copying would also copy after every cancel. Found in M05 (implementation). It can wait: cancelling is the common case, and no player has hit the no-targets case yet.
- [ ] `pg` defaults to `connectionTimeoutMillis: 0` (no timeout), so a hung pooler would hang `/api/health` and every route. Pick a value in the M15 load test (a human number). Found in M00 (implementation). The defaults were human-approved until M15.
- [ ] App-level rate limits on answer requests (off-list text included) (a human number), set with the M15 load test (human, 2026-10-18: deferred from M02). **Also the email-code verify route** (M02 2f): Auth's per-IP limit sees Vercel's IP, so codes can be guessed and the shared limit used up; the human accepted this for the playtest (2026-10-20), not for launch.
- [ ] Sign-out uses Supabase's default scope, which ends the player's sessions on every device. Found in M02 (implementation). Fine for a playtest; revisit if players complain.
- [ ] Hosted Auth settings (SMTP, templates, URLs, providers) are typed by hand into the Supabase dashboard, apart from `supabase/config.toml`, which only drives the local stack. Two hand-typed mistakes reached production in M02 (an SMTP host typo; template bodies left at the defaults). Consider applying them from the repo (Supabase CLI config push or the Management API) with a remote-only config, and checking the hosted template. Found in M02 (staging). Both mistakes were caught by the step 9 sign-in test.
- [ ] The privacy page promises deletion on request, but there is no written procedure or script for the human yet (Supabase dashboard → delete the auth user; the cascade removes profile, runs, answers and misses). Write it at the first request, and make it a script if it happens twice (CLAUDE.md). Found in M02 (2c review). Self-service deletion is M12 (account).
- [ ] The legacy HS256 JWT secret is still trusted as "previously used" since the rotation to ES256 on 2026-10-17. JWT Signing Keys, "Rotate and revoke": revoke the previously used key once all regularly valid JWTs have expired; revoking the legacy secret first requires disabling the legacy `anon` and `service_role` keys. Found in M02 (2f, A1). A dashboard action and a security change, for the human.
- [ ] Measure in the M02 2g survey (then the M15 live test) whether each question's host bank holds the answers players actually give, then decide a host bank size guideline (a human number). Found in M01 (planning, human 2026-10-18: "No fixed size yet"). M01 only checks that the bank covers the host answers.

**Content (for the human, before days go back on the calendar):**
- [ ] Since free typing (M04), aliases decide matching, not just search (M01's premise). A synonym alias without its plural is only reached by the one-typo rule (4+ characters, one nearest entry), and digits count as characters there. Check the lists for this in M13. Found in the 2026-10-21 docs audit.
- [ ] **Parked days** (M04 13c-3, 2026-10-21): no stolen letters from schedule A fit one question of 2026-10-28 (Chinese zodiac), 10-30 (Winter Olympic sport), 10-31 (country in South America), 11-03 (berry), 11-07 and rehearsal 10-19 (common pet), 11-17 (fairy tale) and 11-19 (breakfast cereal). They're in `content-parked/`, changed only from format 1 to 2 (no letters, so the validator refuses them until they get some). (The no-gaps rule went with `content:publish` in M06; a parked day is simply not approved.) The human chose to swap those questions for bigger open categories, then said to build the app first. Found in M04 13c-3. *(M06, 2026-10-21: 2026-11-05 joined them. Once a host answer's name had to avoid the stolen letters, every host-bank answer to its Q7, "something you'd keep in a wallet", used P, U, S or A. It keeps its old letters.)*
- [ ] Late draft questions with one dominant host answer (citrus: orange, pet: dog, room: kitchen, shoe: sneakers) may catch far more than a gentle share. Measure in the M02 2g survey. Found in M01 (review 2).
- [ ] Some draft days may have no concrete question (a closed answer set), e.g. 2026-11-02, 11-03, 11-07 (drafted as 12-18, 12-19, 12-23; re-dated in M02), depending on whether "a kind of nut" or "a coffee drink" counts as concrete. Needs a human reading of "concrete". Found in M01 (review 2).
- [ ] 2026-11-08 (drafted as 12-24) q3 "entirely east of the Mississippi River": Kaskaskia, Illinois lies west of today's channel, so "entirely" is arguable for Illinois. Soften the prompt or accept it. Found in M01 (review 2). Content only, editable before its day.
- [ ] Completeness gaps in near-closed draft sets: whales (no sei, Bryde's, beaked), ocean mammals (no dugong, polar bear), cat family (14 of about 40 felids). Found in M01 (review 2). Lists can grow before each day.
- [ ] The country list mixes United Kingdom with England, Scotland, Wales and Northern Ireland (two levels). Found in M01 (review 2). It doesn't touch the host answer.
- [ ] Content judgment calls from the 2d review, for the human: panther as an entry (2026-11-01 q3) but an alias of cougar (10-26 q1); insect-eaters and omnivores under "mostly eats meat"; bergamot and satsuma under host orange; brownie, Nutella, peanut butter cup and mint near host chocolate and its kinds; Mardi Gras, Losar and Leap Day as winter holidays (dates vary); oasis, geyser, well, aquifer, fountain, delta, ditch, rapids and wetland as bodies of water; Golden Week, Hanami and Lent as holidays; non-board games under "board game"; borderline vegetables, units of time and solar-system items; young forms (calf, bull, rooster) as entries rather than aliases; near-duplicate reasons for being late; ambiguous aliases (thongs, suntan lotion, toad in the hole, captain, macaroni, play games, New Year's, ship's boat). Found in M02 (2d review). The human reviews the lists before merge; these go to them there.
- [ ] Host-rule cases inherited from M01: orca under host dolphin; lime green, teal, olive and mint under host green; gelato, sundae, ice cream sandwich, dondurma and others under host ice cream; frittata under host omelet; reservoir under host lake. Found in M02 (2d review). For the human to decide; the playtest's catch rates will show whether they matter.
- [ ] Possibly dominant host answers in the 2e drafts, for the human (estimates until play shows them): 7 twice (11-12 q7 "a number from 1 to 10", 11-16 q7 primes below 50), Spider-Man (11-11 q1), coins (11-15 q1), salmon (11-10 q2), screwdriver (11-18 q2), necklace (11-13 q5), Lincoln (11-11 q4), tornado (11-11 q7), red (11-14 q6), 12 (11-15 q6), verb (11-16 q6), X (11-20 q6), Yosemite (11-14 q4), coffee and rain (11-15 q7). Found in M02 (2e review). The human can swap a host before merge or before the day starts.
- [ ] 2e judgment calls, for the human: near-repeat prompts (11-22 "a 3D shape" vs 11-05 "a shape"; 11-15 refrigerator vs 11-03 kitchen; 11-21 junk drawer vs 11-01 kitchen drawer; Africa and Australia animals on consecutive days); entries that may read as kinds of a host (amulet and belly chain near host necklace; Palace of Westminster near host Big Ben; cockle near host clam; relish near host pickles; satin, chiffon, organza and taffeta near host silk; cartons near host cardboard); "<kind> <listed>" names kept as aliases or siblings (movie theater and theater; convenience store under store; Thai iced tea and iced tea; pearl milk tea and milk tea; vanilla wafer and wafer; dandelion fluff and fluff; angle brackets and brackets; chicken corn soup and corn soup; "<kind> rock" aliases under punk, indie and alternative); fables and Baba Yaga under fairy tales; sinus and diaphragm as organs; Pluto as the only Roman alias among Greek gods; dinosaur genera marked "no plural"; no general "pie" or "collecting" entry (their kinds are listed). Found in M02 (2e review). The human reviews the lists before merge.
- [ ] Reviewer findings on 2e that Claude kept, for the human to decide: cheddar, Swiss and gorgonzola as entries next to general "cheese" on 11-20 q3 (DECISIONS.md: differently named kinds may sit next to a general answer that isn't a host; only "<kind> cheese" names are folded into it), and nose, tongue, belly, eyebrow and lip piercings as entries next to "ring" on 11-13 q5 (piercings, not finger rings, in the Ferris-wheel sense). Found in M02 (2e review).
- [ ] Name a reference source for each concrete question's answer list (e.g. a public list of dog breeds). The M01 drafts come from Claude's knowledge and the human's review. Found in M01 (planning). Lists can grow from logged misses in the meantime.
- [ ] Normalization doesn't strip format characters (`p{Cf}`, e.g. a zero-width space), so "li​on" doesn't collide with "lion". It's outside the approved spec; ask the human if content gets pasted from the web. Found in M01 (review).

**Later (after the MVP):**
- [ ] *(Narrowed in M02 2f, B21, not closed: migration 20261021044659 makes today() day_of(statement_timestamp()). Measured: in one transaction now() stayed fixed across a 1.2 s sleep while statement_timestamp() moved. Still open (2f review): the guard runs per UPDATE but the change lands at COMMIT, so a publish whose day's UPDATE runs just before midnight and commits just after still changes a started day. A commit-time check would close it; the human kept the narrowing and set the full fix for when AI drafting automates publishing, 2026-10-20.)* `private.today()` uses `now()`, fixed when a transaction starts, so a `content:publish` transaction opened just before midnight could still update a puzzle whose day has just begun. Consider `statement_timestamp()` in `day_of`'s caller. Found in M02 (2b review). Milliseconds wide, and a human runs publish. *(Since M06 the writer is `private.approve_puzzle`, with the same window.)*
- [ ] `scripts/survey-score.ts`: error line numbers are counted after blank rows are dropped, so they can name the wrong line; a duplicate (person, set) row is counted twice instead of refused; a row shorter than q7 is read as unanswered; a bare `"` inside an unquoted cell starts a quoted field; the "ends inside a quoted field" error has no test. Found in M02 (2g review). Google Sheets exports avoid all of these; a hand-edited CSV could hit them.

**Roadmap reset review (2026-10-20), docs only:**
- [ ] Seeing friends' misses (human, 2026-10-19; M03 D4) sits under Groups (M10), though part of it is about friends (M07). Found in the roadmap reset (review). It's out of the MVP either way.

**M04 13c-1 review (2026-10-21):**
- [ ] A miss request whose response is lost and is retried logs the miss twice. Found in M04 13c-1 (review). Only noise in the human's review list.
- [ ] `/api/run/answer` puts no length limit on text before `resolveTyped`; the 40-character limit only applies on the miss path, through the DB check. Found in M04 13c-1 (review). `editDistanceAtMost` exits early on a length difference, so it's cheap.
- [ ] The answer box is cleared after text that names no entry, so a player who made a two-letter typo retypes everything. Found in M04 13c-1 (review). UX; revisit with 13c-2's timer.
- [ ] `send` in `game.tsx` is typed `AnswerResponse` but also used for `/api/run/start`, which has no `notInList`. Found in M04 13c-1 (review). Harmless at runtime.
- [ ] Re-scoring the 2g survey now auto-corrects typos, so its recorded catch rates would change; note that wherever the survey numbers feed G3. Found in M04 13c-1 (review).

**M04 13c-2 review (2026-10-21):**
- [ ] `answer()`'s miss-path catch reads the run state before checking the error, so other errors cost a query, and an error inside `stateOf` would replace the original. Check `not_current_question` first. Found in M04 13c-2 (review).
- [ ] A late answer to the wrong index gets 409 `out_of_order`, not the ending, because OB002 is checked before OB005. Found in M04 13c-2 (review). The next GET shows `timed_out`.
- [ ] `private.question_deadline` is declared `immutable`, but `timestamptz + interval` is stable in Postgres (*unverified* against the catalog). Found in M04 13c-2 (review). Harmless for a fixed 20 seconds.
- [ ] When time runs out while an answer is in flight, `load()` and `send()` race and the last response wins, which could show `timed_out` while the server has the next question, until a refresh. A re-GET with the same `msLeft` keeps the same key, so the countdown stays at 0. Found in M04 13c-2 (review). Milliseconds wide.

**M04 13c-3 (2026-10-21):**
- [ ] `npm run survey:score` reads set 3's day from `content/offbeat/2026-10-28.json`, which is now parked in `content-parked/`, so re-scoring the survey fails with a missing file (loudly). Found in M04 13c-3. The survey is finished; fix it if it's ever re-run.

**M04 13c-3 review (2026-10-21):**
- [ ] Stored `private.puzzle.content` is used as a format-2 `Puzzle` with no format check, so a format-1 row would play with no letters and no error. Found in M04 13c-3 (review). No format-1 day is on any calendar (staging *unverified*); check before anything is published (M15).
- [ ] The answer box's filter normalizes one character at a time, so a ligature ("ﬁ") passes it and the server then refuses it; the blocked message shows the raw character ("É"), not the plain letter; the filter has no unit test. Found in M04 13c-3 (review). Confusing at worst, never a way around the letters.
- [ ] The medium tier's letters (C P H U B D M G) come from the ticket's measured grouping, which the human approved by choosing schedule A; one explicit confirmation of the letters would settle it. Found in M04 13c-3 (review).

**M04 13c-4 review (2026-10-21):**
- [ ] `openNext` doesn't map OB002, so an answer committing between its read of `answered` and its insert (e.g. Next from a second tab while a question is in play) is a 500. Found in M04 13c-4 (review). The UI disables Next while busy; ROADMAP's "never 500" for concurrent requests applies.
- [ ] Next on a run whose question 1 timed out says `no_reveal` rather than `run_over`. Found in M04 13c-4 (review). Wording only.
- [ ] `openNext` and `answer()` pick the latest run by date, not the run `todaysState` shows; it matters only with today's run plus an unfinished earlier one. Found in M04 13c-4 (review).
- [ ] `private.next_reset` names 'America/Los_Angeles' again instead of deriving it from `day_of`. Found in M04 13c-4 (review). One zone string in two SQL functions.

**M04 G1 review (2026-10-21):**
- [ ] `POINTS_PER_QUESTION`'s length isn't tied to `QUESTIONS_PER_DAY`: a different question count would give undefined points. Found in M04 G1 (review). The validator enforces 7 questions today.

**From M06 (puzzle entry):**
- [ ] One invalid file in `content/offbeat` makes the admin puzzle routes fail (500) for every day, because `readDrafts` reads them all. CI's `content:validate` refuses such a file before merge, so it only happens after a red merge. Found in M06 (review).
- [ ] Changing a host answer that has a match group gives a rule error the page can't fix (the group's key must be a host answer); the file has to change. No drafted day has match groups today. Adding a chosen host answer to the host bank also shifts the insights report's "share in the host bank" for that day. Found in M06 (review).
- [ ] The host-name rule weakened some drafted Q7s: 11-14 (boots alone), 11-18 (drop tower, swing ride) and 11-20 (Colosseum dropped) now have uncommon or fewer hosts, so they catch fewer players than "rises gently to Q7" wants. Found in M06 (review). They're unapproved drafts the human reviews on the page, and difficulty is M13.
- [ ] Three drafted hosts sit next to a listed "<kind> <host>" entry, against the one-level rule: 11-01 q2 green (lime green), 11-02 q7 rain (freezing rain), 11-08 q1 tennis (table tennis; arguably a different sport). The validator doesn't check this rule. Found in M06 (a scan after the review), and older than M06.
- [ ] When a draft's questions differ from the saved ones, the page warns but still lets the day be approved. Found in M06 (review). The human reviews the day anyway.
- [ ] *Unverified* until plor.app is updated (M15, or when the human runs `db push`): that the deployed routes read `content/offbeat` (the local build's traces list the files), and that `drop role plor_publisher` succeeds on the hosted database (nothing hand-granted to it there). Found in M06 (review).

**From M07 (friends and live board):**
- [ ] The display name rule (M07 D1) accepts non-ASCII digits (Arabic-Indic ١) and letters such as ª and ǅ, because `[[:alpha:]]` and `[[:digit:]]` follow Unicode. That fits "letters in any script", but D1 didn't say. Found in M07 7a (review).

**Housekeeping (pull in when the area is touched):**
- [ ] `day.db.test.ts` covers the fall time change (2026-11-01) but not the spring one (a 23-hour day). Found in the 2026-10-21 docs audit (M00 data design, §8).
- [ ] Comments that point at the wrong place: `src/app/api/run/answer/route.ts` says the answer response holds the next question (since protocol 3 it comes from Next); `src/game/day.db.test.ts` says the last published puzzle is 2026-11-08; `src/game/runs.ts` says the database enforces "the day boundary" (a run now continues past midnight). Found in the 2026-10-21 docs audit.
- [ ] DECISIONS.md Source cells name sources that aren't in SOURCES.md ("npm", "Supabase testing", "GitHub Advanced Security docs"), and the Error handling row still says to pin the Next.js error-handling docs. Adding a source is the human's call. Found in the 2026-10-21 docs audit.
- [ ] SOURCES.md: two "year unverified" release dates; the Unicode note names Node 24.11.0 while CI runs the latest 24.x. Found in the 2026-10-21 docs audit.
- [ ] `eslint@9` (from the template's `^9` range) prints "no longer supported". Move to a supported ESLint once `eslint-config-next` supports it. Found in M00 (implementation). Lint works today.
- [ ] `scripts/status.ts` has no explicit fetch timeout, so a hung server waits for undici's default. A timeout value is a human number. Found in M00 (implementation). An unreachable server already fails fast.
- [ ] Local `supabase_vector` (the analytics log collector) restart-loops on Windows. The Supabase docs say analytics on Windows needs the Docker daemon socket exposed on `tcp://localhost:2375`. Either do that or disable `[analytics]` in `supabase/config.toml`. Found in M00 (implementation). We don't use local analytics.
- [ ] When `DATABASE_URL` is missing, `next start` logs "Failed to prepare server" but keeps listening and returns 500 on every request instead of exiting. Check how Vercel behaves with a failing instrumentation hook. Found in M00 (verification). It's still loud: a boot error plus DOWN.
- [ ] The Supabase CA exists twice: `supabase/certs/prod-ca-2021.crt` (psql) and the `DATABASE_CA_CERT` env var (app). Consider one source. Found in M00 (review 3).
- [ ] Local Node is v24.11.0 with npm 11.6.1, while CI uses Node 24.2x with npm 11.19.1. Upgrade local Node to the current 24 LTS (a human install). Found in M00 (CI on PR #1). `npm run lockfile` already guards against the drift.
- [ ] Locally the app connects as `postgres` (the stack default), so route tests don't exercise plor_app's grants; `src/lib/profile.db.test.ts` runs the same SQL as plor_app instead, and staging uses plor_app. Found in M02 (implementation). Giving local plor_app a password is a role change for a human.
- [ ] `src/lib/profile.db.test.ts` logs in as the local stack's `supabase_admin` with the default password, which was observed, not found in the docs, so that it can `SET ROLE plor_app`. Found in M02 (implementation). Local only; a docs change would make the test fail loudly.
- [ ] `supabase/roles.sql`: a remote schema-only reset would keep `plor_app` (roles are cluster-level), so `create_profile` would then fail with "role riff_app does not exist". No procedure resets the remote database (DECISIONS.md forbids scripting `db reset --linked`). Found in M02 (rename review). A local reset recreates the cluster and works.
- [ ] plor_app's SELECT on `private.missed_answer` covers `user_id` too; a column-level grant would enforce D4 in the database. Found in M03 (review). plor_app already reads `user_id` from `run` and `run_event`, so nothing new is exposed.
- [ ] SOURCES.md rows pinned at supabase/supabase `7425d49` (SSR auth, email sending, Google sign-in, redirect URLs) name a commit that no longer resolves on GitHub (`gh api .../commits/7425d49`: 422, 2026-10-20). The email sign-in row was re-read at `e854b84` in 2f; the others need re-pinning, which only a human can approve. Found in M02 (2f).
- [ ] Vitest also collects tests under `.claude/worktrees/` (then the OLD-M13 worktree, since removed), so `npm test` and `npm run test:db` run that branch's copies too, and its db tests race this checkout's on the one local stack. 2f ran both with `--exclude ".claude/**"`. Exclude it in `vitest.config.ts`. Found in M02 (2f).
- [ ] `authFailure`'s comment (src/lib/auth.ts) and the 2f ticket say "any 5xx" becomes `AuthRetryableFetchError`, but auth-js 2.118.0 only does that for 500–504, 520–530 and status 0 (`NETWORK_ERROR_CODES`). Any other 5xx still shows "internal". Found in M02 (2f review). It's still loud.
- [ ] The A1 closure above says `getClaims` calls Auth only for HS tokens; it also does for a token with no `kid`, or when WebCrypto is missing (GoTrueClient.ts). Found in M02 (2f review). The conclusion holds.
- [ ] `/api/auth/email/verify`'s `email_invalid` and `code_invalid` 400 branches have no test. Found in M02 (2f review).
- [ ] `/api/admin/insights?date=0000-01-01` is still a logged 500: JavaScript accepts year 0, Postgres doesn't. Found in M02 (2f review). Admin-only.
- [ ] `scripts/check-client-bundle.ts` doesn't scan `.next/server/pages/404.html` and `500.html`. Found in M02 (2f review). Today they are Next's default error pages.
- [ ] The import rule from 2f B16 (a test imports its module the way the module's own imports are written: `.ts` for files Node runs directly, extensionless for the Next.js app) isn't written in DECISIONS.md. Found in M02 (2f review). Docs only.
- [ ] The B3 test in `route.db.test.ts` computes its expected day with the same subquery as the code. Found in M02 (2f review). It still failed on the old code; a fixed expected date would be stronger.
