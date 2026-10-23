# Roadmap

At the start of each session, agents report the current milestone, its status and what comes next.

## Product
**Plor** (human, 2026-10-18; at `plor.app`) is a small daily word-game site that should feel welcoming but neutral (human, 2026-10-19). It's built to hold more than one game later, and ships with one.

**What the MVP is** (Claude's summary of the docs and the human's answers; confirmed by the human, 2026-10-21: "other than that it looks fine"):
- **Sign in** with an emailed code or Google, and pick a username. Today it can't change; whether it can is an M12 question. **Playing first, without an account,** comes with launch, after the MVP line (M15; Design review, 3).
- **Play the day's game.** Everyone gets the same puzzle each day, and the day resets at midnight Pacific.
- **The human writes each day's questions;** a Claude session drafts the answers, and the human approves the day on an admin page (M06). Puzzles, runs and missed answers are kept so they can be analyzed later.
- **Friends:** added by invite link; a live board of friends' runs, showing where each one was caught (M07). Players can set a display name that doesn't have to be unique (M07).
- **Comments and reactions** on the day's game, friends only, after you've played (M08).
- **Points** (M09) and **weekly** leaderboards for friends and for each group (M10), replacing M09's all-time board (Design review, 2).
- **Groups:** named circles joined by invite link, each with its own weekly leaderboard and one shared comment thread per day (M10).
- **A home screen** that ties these together, with a streak of days played and how many players gave each of your answers (M11).
- **An account page,** including deleting your account (M12).
- **Plain screens:** the look (M14) comes after all of it, admin pages included (human, 2026-10-21: "everything should look nice eventually, but for now functionality only").

**Game 1: Don't Match the Host** (named Offbeat, `game_id` `offbeat`):
- **Questions:** each day has 7 fixed, independent questions that mix concrete and abstract ones (e.g. "Name a day of the month", "Name something you'd bring to a potluck").
- **Answering:** the player types an answer within 20 seconds and must avoid the host's secret answers. Niche answers are a fair escape. Text that isn't on the list gets a free retry.
- **The Wind** steals a letter on questions 2, 4, 5 and 7.
- **Ending and points:** a match or a timeout ends the run. Surviving questions 1 to 7 earns 25, 50, 75, 100, 150, 250 and 350 points, plus a rarity bonus for uncommon answers (human, 2026-10-22, M09), so 1000 is no longer the maximum.

DECISIONS.md, Game 1, has the rules and the answer model.

## Focus (human, 2026-10-21)
**The MVP is every functional milestone, M00 to M12** (human, 2026-10-21: "After M11", the account milestone, before puzzle entry was inserted ahead of friends). The earlier MVP, the game mechanics alone, is done (M04), and so is Share (M05).
- **Order** (human, 2026-10-21): "all working features first. home screen friends screen groups, account etc. nothing visual comes until after things are functijnal". Answer acceptance waits too: "id rather just have a full working app, even if we have not that many promots for the game ... quality of everything else first".
- **Puzzle entry comes first** (human, 2026-10-21, chosen from Claude's options: an admin page form, "First, before friends"). In the human's words: "lets just make it so i can manually put in puzzle for each day for now. have a way to keep the data and analyze it, work on that in the future after we have the game out and some smaple data".
- **Claude's order within the rest, for the human to change:** comments and points are friends-only, so they follow friends. Groups and the home screen show friends' comments and scores. Account comes last, so deleting an account covers every table. Answer lists (M13) come before the look (M14), because answer checking is function, not visuals.
- **plor.app while building** (human, 2026-10-21): "its fine pretend im the only one lookijg at it until we r done". It stays public and may lag behind `main`. Nothing is published for others until launch (M15).

## Design review (human, 2026-10-22)
Claude reviewed Plor against other daily games and social apps before M10 (the findings are in the PR that added this section). The human decided:
1. **The host anticipates the dodge** (M13). Obscure answers are always safe today, and the rarity bonus pays extra for them. On the later questions the host may now pick a popular "clever" answer, the kind players reach for to avoid the obvious one. In the human's words: "lets go for host anticipating dodges later. with less letters available it will be harder for them to come up with crazy ideas anyway, since they aslo have to keep in mind the letter requirements." Claude's reading, for the M13 ticket: it needs a popularity tier per entry (M09 D11's option (c): content format 3, Hard to reverse). The provisional bonus changes with it, since today it pays a popular dodge like any uncommon answer.
2. **Weekly leaderboards** (M10). Friends and groups rank the current week, Monday to Sunday by puzzle day, instead of all time (human: "agree, not doing alltime lets do weekly", to Claude's suggestion of a Monday reset). An all-time board rewards whoever joined first. The ledger doesn't change. How Sunday's points show, since they settle after the Monday reset, is an M10 decision. The all-time total moves to the account page (M12).
3. **Anonymous play** (M15). A shared link opens the game without an account (human: "sure we can have plays be anonymous, no problem"); in Claude's suggestion, signing in then keeps the result and unlocks friends. Open for the M15 ticket: which run counts when a player who already played today signs in to an account that has one (`M00-stack-comparison.md`). It changes Player identity (DECISIONS.md, Hard to reverse) and is a security change, designed in the M15 ticket. Whether Supabase's anonymous sign-in keeps the same user ID once an email or Google is linked is *unverified* until that ticket reads its docs.
4. **The rest, as Claude suggested** (human: "can take your suggestion"):
   - each group has one shared comment thread per day, the same for every member; the friends thread stays as it is (M10);
   - the result screen shows how many players gave each answer, from the counts the bonus uses, above a minimum the M11 ticket asks for (M11);
   - share symbols for rare and common answers wait for 1's tiers, then M14;
   - a streak of days **played** (not survived) on the home screen, without freezes until the beta shows a need (M11);
   - how many approved days must be in stock before launch is a human number for M15;
   - seeing friends' and group members' misses leaves M10 for Later;
   - "Next revision" was cut to the items someone will act on (human: "important lets clear all the clutter").

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
| M07 | Friends and live board | A display name (human, 2026-10-21: "there should alao be a display name (doesnt have to be unique unlike username)"): optional, shown instead of the username when set, changeable any time (human, chosen from Claude's options: "Optional, change any time", built "With friends, M07"); its length and characters are human numbers for the ticket. Invite link (a random code, not the username, so a rename never breaks it; Claude's draft) and mutual friends; a live board (status for everyone, plus where each friend ended once you've finished); friends-only delivery; reconnects logged and counted. The "where everyone ended" picture follows the rule the human accepted on 2026-10-20 (closed draft D28): you are always shown, then a few named friends per place, then a count; tapping a place shows the list, and a plain list sits underneath. The per-place limit is a human number | done (PRs #35, #36, #37 and #38) | `docs/milestones/M07-friends-and-live-board.md` |
| M08 | Comments and reactions | On the day's game, friends only, visible after you've played, delete your own, report others | done (PRs #39, #40, #41 and #43) | `docs/milestones/M08-comments-and-reactions.md` |
| M09 | Points and friends leaderboard | An append-only ledger of each finished run's points (DECISIONS.md, Points ledger; design in `M00-data-design.md` §6), including runs from before M09, and an all-time leaderboard of you and your friends equal to the ledger sum. Every finished run counts, even one finished after midnight (human, 2026-10-22, D1); a run that ran out of time scores what it survived (D2). **Rarity bonus** (human, 2026-10-22): each survived answer earns more the fewer players gave it, provisional at once and final once the day closes, capped below the next question's points; answers after midnight earn none, per answer (D8). The ledger row is written once the day closes, at midnight with no scheduler, and the host bank is the common tier for now (D9–D11). The bonus is up to half a question's points, falling to 0 for answers 20% or more of players gave (N1–N5, human). Its all-time board becomes weekly in M10 (Design review, 2) | done (PRs #45 and #46) | `docs/milestones/M09-points-and-leaderboard.md` |
| M10 | Groups | Named groups joined by invite link, each with a weekly leaderboard and one shared comment thread per day with reactions (human, 2026-10-19; kept in the MVP with friends, human, 2026-10-21: "Both, as planned"). The friends leaderboard becomes weekly too (Design review, 2), and friends and groups share one "viewer and their circle" query (M09 9b review). Seeing misses moved to Later (Design review, 4). 10a first: the weekly friends board and the shared queries (human, 2026-10-22: "fix the stuff that has to be changed first") | in progress (10a in review, PR #49; G1–G11 open) | `docs/milestones/M10-groups.md` |
| M11 | Home screen | The day's games, friends' scores, and a feed of comments and reactions that stays blurred until you've played (human, 2026-10-19 and 10-20); a streak of days played; on the result screen, how many players gave each of your answers (Design review, 4) | planned | — |
| M12 | Account | Claude's draft scope, settled in the ticket: what a player can do with their own account (today: pick a username once, see it, sign out); whether a username can be changed, and how often (the human asked about the tradeoffs, 2026-10-21; "can't be changed" was an M02 scope limit, not a decision; changing it needs an update grant, a security change); self-service account deletion, and the sign-in fixes under "For M12" in Next revision; your all-time points total (Design review, 2) | planned | — |
| — | **MVP line** | | | |
| M13 | Answer lists and content | Free typing and stolen letters push players to quirky answers, and hand lists reject many fair ones ("not in our list"). A large answer source per category (WordNet held 223 of a day's 226 animals, M04; its license and a SOURCES.md entry come first, by the human), typed answers checked against it, an automatic daily letter picker, the 9 parked days (`content-parked/`), which days to play (M04 G6; the 28 drafted days were to be re-dated for the beta, human, 2026-10-20, which M06's form may replace), and difficulty tuned together with the human ("challenging", M04 G3); the host anticipating the dodge on later questions, with a popularity tier per entry (content format 3) and the provisional bonus to match (Design review, 1) | planned | — |
| M14 | Look and feel | A finished, phone-first look with code-drawn pixel art: the ridge, the player's character and the Wind as the host (the human's decisions, from the closed draft PR #12) | planned (draft ticket; its questions wait until the functional milestones are done) | `docs/milestones/M14-look-and-feel.md` |
| M15 | Launch readiness and closed beta | Load test of the reset-time spike, including live connections; alerts, backups, a full privacy policy and terms; staging runs and applying pending migrations to the hosted database (human, 2026-10-21); the closed beta, which is also the live playtest (human, 2026-10-20): is it fun, do players finish, and what are the real catch rates; the share's day number ("Offbeat #n"), counted from the beta's first day (human, 2026-10-21, M05 S2), and a check of the share sheet on a real phone over HTTPS (M05); anonymous play first (Design review, 3) and the number of approved days in stock before launch (Design review, 4) | planned | — |
| M16 | Game 2: the substring game | Plor's second daily game, inspired by JKLM: type a word containing the day's few letters ("cks") before time runs out, never an impossible substring like "iur" (human, 2026-10-19 and 10-20); the shared licensed dictionary; the platform/game split ("at game 2"); its own leaderboard and the overall one | planned (draft ticket, 2026-10-22; S1–S14 answered by the human the same day, the name, the word list and S15–S19 still open; code waits until after launch) | `docs/milestones/M16-game-2-substrings.md` |

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
  - game 2, a substring game inspired by JKLM, which must never ask for something impossible or too hard like "iur" (now M16, draft ticket);
  - game 3, a word-guessing game under its own name and look (not Wordle's name or tiles);
  - game 4, a word chain;
  - game 5, anagrams, and game 6, a word hunt, both with a bonus letter.

  The games share one licensed dictionary. Each game has its own leaderboard, plus an overall one. Pull the platform/game boundary out at game 2.
- **Custom or different reactions** (human, 2026-10-22: "add custom/different reactions down the line"). M08 starts with 👍 😂 😮 😢 ❤️.
- **Shorter and custom invite links** (human, 2026-10-21: "eventually want some sort of url shortener 22 is hella long", and players customizing their link in settings, "after mvp"). M07's code is 22 random characters. A shorter code is easier to guess, so its length needs a fresh security look.
- **Installable app (PWA):** DECISIONS.md plans "installable as a PWA", but no manifest exists yet (found in the 2026-10-21 docs audit). It needs icons, so it goes with the look or after.
- **Seeing friends' and group members' misses** (human, 2026-10-19; M03 D4), the text they typed that wasn't on the list. Moved out of M10 (Design review, 4).
- **Wait for beta data** (human, 2026-10-19 and 10-20): how many daily games and whether they rotate; fixing an unpopular game; a curated feed; "poke" a friend; one harder day a week; streak freezes; reminders; a global leaderboard; a native app wrapper; public comment moderation. (Streaks and answer stats moved to M11, Design review, 4.)
- **Endgame goal** (human, 2026-10-20: "number one"): puzzles for every game made automatically, with the health of each game and question monitored and stored so the games improve over time.

## Next revision (deferred)
These are non-blocking items found during work or review. Record each one here **before** acting on it. Items get pulled into a milestone on purpose; nobody fixes them on the side. **Keep only what someone will act on:** a cosmetic detail, a test nit, a race milliseconds wide or a comment that can't mislead is closed, not parked. The 2026-10-22 triage (Design review, 4) closed or merged most of the earlier items; the full earlier list is in git at commit `c9d2733`. Items are grouped by where they belong.

<!-- - [ ] <item> — found in M## (implementation | review) — <why it can wait> -->
**For the human:**
- [ ] Before you finish, the live board shows a friend going from "on question 3" to "finished", which tells you which question caught them, though never the answer. It's in the approved design. Found in M07 7c (review).
- [ ] Nothing records which admin deleted which comment (no log line or audit row). Decide before the beta (M15). Found in M08 8c (review).
- [ ] `.claude/worktrees/m03-puzzle-insights` is a leftover folder, not a registered git worktree. Delete it once you confirm nothing in it is wanted. Found in M08 8b (review).
- [ ] Sources: DECISIONS.md Source cells name sources that aren't in SOURCES.md ("npm", "Supabase testing", "GitHub Advanced Security docs"), the Error handling row still says to pin the Next.js error-handling docs, and the SOURCES.md rows pinned at supabase/supabase `7425d49` (SSR auth, email sending, Google sign-in, redirect URLs) name a commit that no longer resolves on GitHub. Only a human adds or re-pins a source. Found in the 2026-10-21 docs audit and M02 (2f).

**For M11 (home screen):**
- [ ] The home page intro says "daily word games" (plural) and "keep your results", while there is one game and no history view yet. Found in M02 (2c review).
- [ ] The board and comments can show stale or out-of-order data: after the midnight reset an open board keeps the old day until a reload; overlapping loads (board refetches, "Earlier day", nudges) can land out of order and show an older response; a friend whose question time ran out, or your own timeout, stays "on question k" until the next fetch, because nothing is written when time runs out; a friend who starts playing gets reaction buttons only at the next board load. None of these shows anything hidden. Found in M07 7c and M08 8a, 8b and 8d (reviews).
- [ ] Realtime channel errors go only to the browser console: a refused join retries forever, and a failed token fetch falls back to the cached token, so a player can see a stale board with no message (against "fail loudly"). Found in M07 7c (review).

**For M12 (account):**
- [ ] Sign-out uses Supabase's default scope, which ends the player's sessions on every device; decide the scope here. Found in M02 (implementation).
- [ ] The code form has no way back to fix a mistyped email (only a reload), and a pasted "123 456" keeps its space. Found in M02 (2f review).
- [ ] Account deletion: `private.comment` and `private.reaction` have no index on `(user_id, game_id, puzzle_date)`, so deleting a run or an account scans them; friendships may cascade before comments, so friends' open pages get no nudge; `getBoard` (`src/friends/board.ts`) reads run status and run events in two queries, so a friend deleted between them gives a 500 (seen once in an e2e run, cause *unverified*). Until self-service deletion exists, the privacy page promises deletion on request with no written procedure (Supabase dashboard → delete the auth user; the cascade does the rest). Found in M02 (2c review) and M08 8a, 8b, 8c and 8d.

**For M13 (answer lists and content):**
- [ ] **The survey's main finding (M02 2g):** 14 of 21 questions caught nobody, and only 10 of 110 entry answers were caught, from 7 people. DECISIONS.md sets no target catch rate; the target (G3, "challenging") and the tuning are M13's, with the host anticipating the dodge (Design review, 1). Details in `docs/milestones/M02-2g-survey.md`, Findings. Re-scoring would now auto-correct typos and change those rates, and `npm run survey:score` fails since 10-28 was parked (M04 13c-1 review, 13c-3).
- [ ] Review notes on the drafted days, for the human before approving each day on `/admin/puzzles`: possibly dominant host answers, judgment calls on entries and aliases, near-repeat prompts, completeness gaps, and hosts next to a listed "<kind> <host>" entry (11-01 green, 11-02 rain, 11-08 tennis; the validator doesn't check the one-level rule). The full lists from M01 (review 2), M02 (2d and 2e reviews) and M06 are in git at `c9d2733`. M13 rebuilds the lists from a large answer source, with a reference source per concrete question.
- [ ] **Parked days** (M04 13c-3): no stolen letters from schedule A fit one question of 2026-10-28 (Chinese zodiac), 10-30 (Winter Olympic sport), 10-31 (country in South America), 11-03 (berry), 11-07 and rehearsal 10-19 (common pet), 11-17 (fairy tale), 11-19 (breakfast cereal) and 11-05 (something you'd keep in a wallet; the host-name rule, M06). They're in `content-parked/`. The human chose to swap those questions for bigger open categories, then said to build the app first.
- [ ] Since free typing (M04), aliases decide matching: a synonym alias without its plural is reached only by the one-typo rule, and digits count as characters there. Normalization also doesn't strip format characters (a zero-width space). Found in the 2026-10-21 docs audit and M01 (review).
- [ ] The medium tier's stolen letters (C P H U B D M G) come from the M04 ticket's measured grouping, approved when the human chose schedule A; one explicit confirmation of the letters would settle it. Found in M04 13c-3 (review).
- [ ] A host bank size guideline (a human number), from what players actually answer: measured in the survey, then the beta. Found in M01 (planning).
- [ ] Changing a host answer that has a match group gives a rule error the admin page can't fix (the group's key must be a host answer); the file has to change. Found in M06 (review).

**For M14 (look and feel):**
- [ ] The share text uses placeholder symbols (🟩 survived, ⬜ not; human, 2026-10-21). Pick the real ones with the look, including rare and common answers once M13's tiers exist (Design review, 4). Found in M05 (implementation).
- [ ] The survived count is worked out twice, in `shareText` (`src/game/share.ts`) and in `Result` (`src/app/game.tsx`); M14 reworks the result screen, where one helper can serve both. Found in M05 (review).
- [ ] Wording and small UX, to check with the human: a stolen letter's key does nothing but nothing shakes (M04 G11); the answer box is cleared after off-list text, so a typo means retyping everything (M04 13c-1); "where everyone ended" puts every caught row before "ran out of time" and shows only places where someone ended (M07 7d, Source diff); opening your own invite link asks "Add <you> as a friend?" (M07 7b); the result screen says "a rarity bonus of about 0" after a Q1 catch, and "worked out once the day is over" for a late run whose day already closed (M09 9a).

**For M15 (launch):**
- [ ] The expected number of players at the reset and the Supabase spend cap (500 or 10,000 live connections) are human numbers the load test needs. Found in the 2026-10-21 docs audit.
- [ ] App-level rate limits on answer requests (off-list text included; `/api/run/answer` has no length limit before `resolveTyped`, M04 13c-1), and on the email-code verify route: Auth's per-IP limit sees Vercel's IP, so codes can be guessed and the shared limit used up. The human accepted this for the playtest (2026-10-20), not for launch. Human numbers, set with the load test.
- [ ] `pg` defaults to `connectionTimeoutMillis: 0` (no timeout), so a hung pooler would hang `/api/health` and every route. Pick a value in the load test (a human number). Found in M00 (implementation).
- [ ] Hosted Auth settings (SMTP, templates, URLs, providers) are typed by hand into the Supabase dashboard; two hand-typed mistakes reached production in M02. Consider applying them from the repo with a remote-only config. Found in M02 (staging).
- [ ] The legacy HS256 JWT secret is still trusted as "previously used" since the rotation to ES256 on 2026-10-17. Revoking it first needs the legacy `anon` and `service_role` keys disabled. A dashboard action and a security change, for the human. Found in M02 (2f, A1).
- [ ] Before the hosted database gets the pending migrations, check: that no format-1 row is in `private.puzzle` (a stored day is used as format 2 with no format check; M04 13c-3 review); that the deployed routes read `content/offbeat`; and that `drop role plor_publisher` succeeds there (M06 review).
- [ ] The 7 people who answered the M02 2g survey have seen the days dated 2026-10-26 to 10-28: those days get new prompts, or the people are told, before the beta. Found in the 2026-10-21 docs audit.
- [ ] Where a browser has `navigator.share` but no share targets, Share rejects with `AbortError`, the same as a cancel (MDN), so nothing happens. Found in M05 (implementation).

**Correctness (pull in when the area is touched):**
- [ ] Concurrent or malformed requests that get a 500 instead of a 4xx: Next from a second tab while a question is in play (`openNext` doesn't map OB002); two tabs replacing the same reaction (the unique index); a report racing the comment's deletion (23503); a comment holding a NUL character (22021, user input at a boundary). Found in M04 13c-4 and M08 8a, 8b and 8c (reviews).
- [ ] `openNext` and `answer()` pick the latest run by date, not the run `todaysState` shows. It matters with today's run plus an unfinished earlier one, which the Timer rule allows (a run left at a reveal stays in progress, M04 13c-4). Found in M04 13c-4 (review).
- [ ] `private.today()` takes the statement's time, but the change lands at COMMIT, so a puzzle approval whose statement runs just before midnight and commits just after still changes a started day. A commit-time check would close it; the human set the full fix for when AI drafting automates publishing (2026-10-20). Found in M02 (2b review), narrowed in 2f.
- [ ] An answer's `created_at` is its transaction's start (`default now()`), so one begun just before midnight and committed just after an early settle misses that settle's counts. The ledger is append-only, so such a settle is permanent. A window of milliseconds, like the one above. Found in M09 9a (review).

**Housekeeping (pull in when the area is touched):**
- [ ] `day.db.test.ts` covers the fall time change (2026-11-01) but not the spring one (a 23-hour day). Found in the 2026-10-21 docs audit.
- [ ] Comments that point at the wrong place: `src/app/api/run/answer/route.ts` says the answer response holds the next question (since protocol 3 it comes from Next); `src/game/day.db.test.ts` says the last published puzzle is 2026-11-08; `src/game/runs.ts` says the database enforces "the day boundary" (a run now continues past midnight); `authFailure` in `src/lib/auth.ts` says "any 5xx" becomes retryable, while auth-js 2.118.0 does that only for 500–504, 520–530 and status 0. Found in the 2026-10-21 docs audit and M02 (2f review).
- [ ] Vitest also collects tests under `.claude/worktrees/`, so a leftover worktree's db tests would race this checkout's on the one local stack. Exclude it in `vitest.config.ts`. Found in M02 (2f).
- [ ] Locally the app connects as `postgres`, so route tests don't exercise plor_app's grants (`src/lib/profile.db.test.ts` and the settle test do; staging uses plor_app). Giving local plor_app a password is a role change for a human. Found in M02 (implementation) and M09 9b (review).
