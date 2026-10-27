# M14 14b-3 — The invite button

**Status:** approved (human, 2026-10-26: "Approve the 14b-3 ticket as drafted, with /g/<code> for group links"), and its security change approved (answer 11). Done (2026-10-27): merged in PR #98 on green CI at 01:08:12 UTC as `356083f`, on the human's word ("PR #98's e2e checks have passed: merge it now and push its migration to plor.app straight after"), and its migration pushed to plor.app at 01:08:40 (answer 12).

## Goal
Friend and group invites are shared from a button, never shown as a raw link, with 10-character codes on short paths, so the Friends tab and a group's page stop showing a long URL.

## Who uses it / what breaks without it
- **Used by:** every player who invites a friend (the Friends tab, under Today's board) or a group's members (a group's page).
- **Breaks without it:** each of those places prints the full link (`/invite/<22 characters>`), which the human finds "really ugly" (2026-10-26). On a 320px phone it pushed the page sideways until 14b-2c-1 made it wrap.

## What the human decided
Guided questions (human, 2026-10-26, on the Mac), after asking: "seeing the entire invite link at all times looks really ugly, it should be accessed via another button/menu and maybe a url shortener/customizer. also how hard would it be to implement just being able to look someone up and adding them that way instead of the invite link?"

**Round 1:**
1. **Where the link lives:** "An 'Invite a friend' button (Recommended)": one button that opens the share sheet, or copies on a computer; the link itself is never shown.
2. **The link's shape:** "Shorter random code".
3. **Looking someone up:** "Yes, with friend requests (Recommended)": search a username, send a request, and the other player accepts or declines.
4. **When:** "Button in M14, lookup later (Recommended)": this sub-ticket now; lookup as its own milestone after M13 and M14 (ROADMAP, Later).

**Round 2:**

5. **The code's length:** "10 characters (Recommended)": 2^60 codes.
6. **Links already sent:** "Replace every link": every player gets a new short code at once, and old links stop working.
7. **The path:** "Shorten to /i/".
8. **Reset link:** "Beside the invite button (Recommended)": on the Friends tab, still not under Today's board.

**Round 3:**

9. **Group links:** "Yes, the same way (Recommended)": a share button instead of the shown link, 10-character codes, old links replaced, and a shorter path. The path is `/g/<code>` (human, 2026-10-26, at approval: "with /g/<code> for group links").
10. **Order:** "After 14b-2c, before 14c (Recommended)".

**Round 4** (the security change, before building; human, 2026-10-26):

11. **The security change below:** "Approve it (Recommended)": 10-character codes, one migration replacing both checks and every code, no grant, policy or RLS change (DECISIONS.md Log).
12. **plor.app:** "Push right after merge (Recommended)": when the PR is ready, Claude asks first; on the human's yes it merges, and the migration is pushed to plor.app straight after from a clean checkout of `main`, then the hosted tests run.

## Source
- Web Share API and Clipboard `writeText` (SOURCES.md, M05): the button shares or copies, as the result's Share does (`src/app/share.ts`).
- Next.js routing (SOURCES.md; the bundled docs in `node_modules/next/dist/docs/`): the new `/i/[code]` and `/g/[code]` routes. *To read before building.*
- M07 7b's invite design (`docs/milestones/M07-friends-and-live-board.md`): one personal, random, reusable link per player, resettable, which makes both players friends at once when opened and added.

## The security change (approved, answer 11)
Read 2026-10-26, before building. Invite codes are the tokens that let someone add a friend or join a group, so changing their length and replacing them all is a security change (CLAUDE.md).

**What exists today:**
- Codes are 22 base64url characters, from 16 random bytes in TypeScript (`newInviteCode`, `src/friends/friends.ts`). The ticket's step-1 hypothesis is disproved: SQL checks the length as well as TypeScript, in `friend_invite_code_format` and `player_group_invite_code_format` (`^[A-Za-z0-9_-]{22}$`; `20261022070948_friends.sql`, `20261023050925_groups.sql`).
- `plor_app` may already update `friend_invite.code` and `player_group.invite_code`.
- Nothing limits guessing on the invite routes.

**Proposed:**
1. **Code size.** A code is 10 base64url characters: 8 random bytes from Node's `randomBytes`, written in base64url and cut to their first 10 characters, which carry 60 random bits (answer 5). One constant, the length, replaces `INVITE_CODE_BYTES`, and `INVITE_CODE` checks it.
2. **One migration**, in one transaction:
   - The two checks are replaced by checks at 10 characters.
   - Every `friend_invite.code` and every `player_group.invite_code` is replaced by a fresh 10-character code made in the database from `gen_random_bytes(8)`, pgcrypto's cryptographically strong bytes (PostgreSQL 17, pgcrypto; installed as `extensions.pgcrypto` 1.3 locally, and on plor.app *unverified*: a missing extension fails the migration and changes nothing).
   - The `unique` constraints stay, so a collision, about 1 in 10^12 for a thousand codes, fails loudly rather than overwriting anything.
   - Every link already sent stops working, and opening one gets the "unknown link" answer any unknown code gets (answer 6).
3. **No change to grants, policies or RLS.** `plor_app` keeps exactly the grants `plor_app_role.test.sql` lists.
4. **No guessing limit.** At 2^60 codes, answer 5 holds without one; a limit comes with friend requests, whose search needs one (ROADMAP, Later).
5. **plor.app's code and database change together.** Once the PR merges to `main`, Vercel deploys code that writes 10-character codes, which plor.app's database refuses under its old 22-character checks until the migration is pushed, so making an invite link would fail there until then. The database is pushed only on the human's word (human, 2026-10-26, relayed in the M13 ticket on `m13-answer-lists-and-content`, "Decided later": "ok we can keep push on my word"). So the PR merges only once the human has agreed to push its migration to plor.app straight after.

## Acceptance criteria
- [x] The Friends tab, Today's board and a group's page show no invite URL. "Invite a friend" (and the group's "Share group link") opens the share sheet, or copies with a "Copied" note where there's none. An e2e test checks that no `/i/` or group URL is in the page's visible text.
- [x] Reset link sits beside the friend invite button on the Friends tab only, and a group's reset stays where the group page has it today. Both stop the old code working (db test).
- [x] New codes are 10 characters of `A-Za-z0-9_-` (60 random bits). The code check, the database and the routes accept only that length (unit and db tests).
- [x] Every existing friend and group code is replaced by a migration, and an old 22-character link gets the same "unknown link" answer as any unknown code (e2e).
- [x] Friend links are `/i/<code>` and group links `/g/<code>` (answers 7 and 9). `/invite/` and `/groups/join/` are removed, not redirected (answer 6: no old link is left to serve).
- [x] Opening your own link still says "This is your invite link" (14b-2c-1, answer 8).
- [x] No sideways scroll at 320px on the Friends tab or a group's page.

## Out of scope
- Looking players up by username, friend requests and blocking (ROADMAP, Later; answer 3).
- A rate limit on guessing codes. Read 2026-10-26: `src/app/api/friends/preview` and `add` have no guessing limit. At 2^60 codes, answer 5 was chosen as safe without one; a limit returns with friend requests, whose search needs one.
- A QR code or a custom (vanity) link.

## Numbers
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| 10 characters, `A-Za-z0-9_-` (60 bits) | Friend and group invite codes | The human, 2026-10-26: "10 characters (Recommended)" (answer 5); the alphabet is today's (`src/friends/invite-code.ts`) |
| `/i/` | The friend link's path | The human, 2026-10-26: "Shorten to /i/" (answer 7) |
| `/g/` | The group link's path | The human, 2026-10-26, at approval: "with /g/<code> for group links" (answer 9) |

## Plan
1. Read the Next.js routing guide and today's code paths: `src/friends/invite-code.ts`, `src/app/invite-link.tsx`, `src/app/invite/[code]`, the group join route and page, and the invite tables in `20261022070948_friends.sql` and `20261023050925_groups.sql`, including any length check in SQL.
2. **Security change** (CLAUDE.md, "Security changes need a human"): invite codes are the tokens that let someone add a friend or join a group. Replacing them all, and their length, is proposed to the human here and recorded in DECISIONS.md before the migration is written. No grant or policy is expected to change. *Unverified until step 1.*
3. One code length for friends and groups: generate 10 characters from fresh random bytes, replacing `INVITE_CODE_BYTES`.
4. Migration: replace every friend and group code; tighten any length check.
5. The routes `/i/[code]` and `/g/[code]`; remove `/invite/[code]` and `/groups/join/[code]`, with their pending-invite handling in `src/app/home.tsx` (`INVITE_PATH`).
6. The buttons: "Invite a friend" and "Share group link", sharing or copying; Reset beside the friend button.
7. Tests as in the criteria. Then the `reviewer` agent, and one PR from `m14-look-and-feel`.

Hypothesis for step 1: the codes' length is checked only in TypeScript (`INVITE_CODE`), not in SQL. It's disproved if a migration constrains it, which then joins step 4.

## Removes
- The shown link (`<code>` in `src/app/invite-link.tsx` and the group page), with "Make my invite link", the friend link's Copy and the group's Copy.
- `INVITE_CODE_BYTES`, for the one length `INVITE_CODE_LENGTH`.
- The routes `/invite/[code]` and `/groups/join/[code]`, and every 22-character code.
- `globals.css`'s `code { overflow-wrap: anywhere }`, which only the shown link needed.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| Criterion 4: an old link gets the same "unknown link" answer as any unknown code | An old code on the new path does; an old link, on `/invite/` or `/groups/join/`, gets Next.js's not-found page | Answer 6 removes the old paths ("not redirected"), so no page is left to answer on them |
| The ticket's step-1 hypothesis: the length is checked only in TypeScript | Also in SQL: both tables' checks, replaced by the migration | Disproved on reading (the security change's section) |
| Answer 1: one button that shares the link | "Invite a friend" also makes the code the first time, so "Make my invite link" and the separate Copy go | One button; the share falls back to copying (`src/app/share.ts`) |
| No wording was given for the group's share text or Reset's note | "Join <group> on Plor"; "New link made. The old one no longer works." | Claude's wording, beside the friend link's existing "Add me as a friend on Plor"; for the human to change |
| The local stack takes migrations with `npx supabase migration up` | Applied by its SQL in one transaction, with its row in `supabase_migrations.schema_migrations` | The shared stack holds M13 13e-5's unmerged `one_walk`, so the CLI refused (the handoff's documented way); CI runs every migration on a fresh database |

## Evidence
On the Mac, 2026-10-27, against the shared local stack:

- **The migration** (`20261027004038_short_invite_codes.sql`). `npx supabase migration up --local` refused (`MigrationMissingLocalError`: the stack holds M13 13e-5's unmerged `20261026212300`, as predicted), so its SQL ran in one transaction with its row added to `supabase_migrations.schema_migrations`. The stack's tables were empty, so the replacement was also run on data, in a rolled-back transaction: 500 friend codes of 22 characters became `500 rows, 500 distinct, 500 match` the new check. pgcrypto is `extensions.pgcrypto` 1.3 here.
- **The checks:** `supabase/tests/friends.test.sql` (10 accepted; 9, `+/` and a shared code refused), `groups.test.sql` (9 and `+/` refused) and the new `invite_codes.test.sql` (the old 22 refused for both; a group code of 10 accepted) pass. `npx supabase test db`: every file but `answer_base.test.sql`, which fails on the shared stack's `one_walk`, as in 14b-2c.
- **The codes in the app:** `src/friends/friends.test.ts` checks 50 new codes are 10 base64url characters and all differ, and refuses 9, 11, `+/` and the old 22-character size.
- `npx tsc --noEmit -p .` and `npx eslint .` clean; `npm test` → `Tests  391 passed (391)`; `npm run test:db` → `Tests  266 passed (266)` (the friends and groups routes issue real 10-character codes through the database's checks); `npx playwright test` → `60 passed (2.1m)` before the review's fixes; after them `59 passed`, `1 failed`: `shell.e2e.ts`'s "from 768px the tabs are a sidebar" on a `toHaveURL` wait, a test this change doesn't touch, which then passed 5 of 5 alone (`--repeat-each=5`), so it's filed in ROADMAP with the other flaky tests.
- **CI on PR #98** (run 40429809769, `3b83551`), on a fresh database: `npm run test:sql` → `Files=25, Tests=410`, `Result: PASS` (the moved fixtures and `invite_codes.test.sql` included); `npm run test:e2e` → `60 passed (5.2m)`.
- **plor.app**, from a clean worktree of `origin/main` at `356083f` (removed after): `npx supabase db push --linked --dry-run` listed `20261027004038_short_invite_codes.sql` alone; `npx supabase db push --linked` applied it at 01:08:40 UTC, 28 seconds after the merge; `npx supabase migration list --linked`: 40 of 40 matching; `npx supabase test db --linked` → `Files=25, Tests=410`, `Result: PASS`. The migration ends by adding the 10-character checks, which would have failed on any code left at 22, so every friend and group code there is a fresh 10-character one.
- **e2e, by criterion:**
  - 1: `account.e2e.ts` presses "Invite a friend", gets an `/i/` link of 10 characters by the clipboard (`e2e/players.ts`, `sharedLink`), and finds no `/i/` in the page's text; `groups.e2e.ts` does the same with "Share group link" and `/g/`.
  - 2: `account.e2e.ts`: Reset shows beside the button once there's a link, and not on Today's board.
  - 4 and 5: `account.e2e.ts`: `/i/<22 characters>` shows "That invite link doesn't work…", and `/invite/<code>` answers 404.
  - 6: `player-screens.e2e.ts`: your own link still says "This is your invite link".
  - 7: `groups.e2e.ts` checks a group's page at 320px. Its first version measured the moment after a resize and saw 360; a probe found nothing sticking out and 320 half a second later, so it now polls. `player-screens.e2e.ts` checks the Friends tab at 320px.

## Review
By the `reviewer` agent in a fresh context, 2026-10-27. It found the migration, the codes, the routes and the buttons right.

- Blocking findings and how each was fixed:
  - **The route moves went into the wrong commit:** `git mv` had staged them, and the docs-only commit `111011f` ("14b-4 done…", pushed) carried them. At that commit `src/app/g/[code]/page.tsx` still imports `../../../home`, so it doesn't build on its own. Not rewritten (pushed; that needs the human): the 14b-3 commit says so and carries the import fix.
  - The Evidence, the criteria, the ROADMAP row (garbled) and the handoff: done in this PR.
  - Criterion 7 had no check of a group's page: added (`groups.e2e.ts`).
  - Also fixed, as this change caused it: a group's Reset link gave no sign it worked once the link was hidden; it now says "New link made. The old one no longer works.", as the friend link's does. And `groups.test.sql`'s comment still said 22.
- Deferred to ROADMAP "Next revision" (For M14, "14b-3 review"): the first share after an awaited request on iPhone Safari (*unverified*); two InviteLinks each holding the code; criteria 1 and 4 checked on friend links only; the hand-applied migration as a script.
