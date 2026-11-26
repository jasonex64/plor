# M24 — The Groups tab opens your group, and favourites

**Status:** in progress: approved 2026-11-25, security change included (the human: "Approve M24", to "Approve M24, its security change included?"); 24a is built and reviewed, in its PR (merging it changes nothing a player sees; its migration reaches plor.app by the human's own `npx supabase db push`, needed before 24b or 24c merge). Next: 24b.

## Goal
The Groups tab opens the group a player starred, with a dropdown on its name to switch groups, and a player's favourite friends come first in their lists.

## Who uses it / what breaks without it
- Used by: every signed-in player who is in a group or has friends. Inbox #263 and #264 (the human, 2026-11-17).
- Breaks without it: the Groups tab is a list of buttons, so seeing your one group's board takes a tap every visit, and moving to another group means going back to the list. The human: "instead of having to click a group to show it, I think by default it should automatically like show the group, a default group if you have one, as its main kind of page, and then you should be able to switch between groups. So you can also like maybe favorite them as well." And: "Maybe the ability to favorite friends as well."

## The human's answers (2026-11-25, four rounds)
| # | Question | Answer (quoted) |
|---|---|---|
| 1 | Which inbox items now? | "Groups tab (#263)", "Less on the page (#267)", "Post like X (#269)", "Free replays (#254)", and a new one: "make the page more playful but still easy to read" |
| 2 | How does inbox work sit beside M23? | "Beside M23, in slot 3 (Recommended)" |
| 3 | Group invites (#231) and group search (#232) | "Still after beta (Recommended)" |
| 4 | Themes (#261), type your own question (#260) | "Leave them in the inbox (Recommended)" |
| 5 | Where "more playful" lives | "Every page, in M20" (filed as #311; this milestone builds none of it) |
| 6 | Which item first? | "Groups tab (Recommended)" |
| 7 | Replays against M23 | "Both games, after M23 (Recommended)" (not this milestone) |
| 8 | "Less on the page", the long-term picture | "Simple by default, tap for more" (not this milestone) |
| 9 | Which group shows when the Groups tab opens? | "The one I starred": one group marked as the default; until a player sets one, the first group they joined shows |
| 10 | Switching groups | "A dropdown on the group's name" |
| 11 | What a group's star does | "Just one star: the default" |
| 12 | What favouriting a friend does | "They come first in my lists": boards stay in score order |
| 13 | Where stars are remembered | "On my account (Recommended)": they follow the player to every device; a database change the human approves and pushes |
| 14 | Where Create group goes | "Last line of the dropdown (Recommended)": the switcher ends with "New group…" |
| 15 | Where a group is starred | "A star beside the group's name (Recommended)": starring another group moves the star |
| 16 | Where a friend is favourited | "A star on their row (Recommended)": only the player sees their favourites; the friend is not told |

## Design (Claude's, from the answers; for approval)
- **The Groups tab** (`/groups`, `Groups` in `src/app/groups.tsx`): a player in at least one group sees a group's page at once (its leaderboard, comments and members, as `GroupPage` shows them today): the starred group, or with no star the group they joined first (`group_member.joined_at`). A player in no group sees what the tab shows today: "No groups yet…" and the Create box.
- **The group's name is the kit's Dropdown** (`.select`, as the leaderboard's group picker, M20 answer 39): the player's groups by name, the starred one marked, then "New group…" as the last line, which opens the name box and Create group. Choosing a group goes to `/groups/<id>`, which keeps working as a link (invite links, the feed and the place strip point at it).
- **The star** sits beside the dropdown: an outline star on a group that isn't the default, filled on the one that is. Tapping the outline makes this group the default; tapping the filled one clears it. *Whether a filled star can be cleared is Claude's choice, for approval.* Its accessible names: "Make this my default group", "Your default group". *Words are Claude's, for approval.*
- **Leaving or being removed** from the starred group removes the star with the membership (the same row); the tab then falls back to the first group joined.
- **Favourite friends:** every row of Your friends (`src/app/friends-list.tsx`) gets a star, outline or filled, before the ⋯. Favourites come first in Your friends, then the rest, each part in today's order. **Open, asked before 24c is built:** which other lists "my lists" covers. Claude's reading: the "Friends today" card as well; not the feed (it is in time order, and putting favourites first would break "newest first") and not any leaderboard (answer 12).
- **Nobody else learns of a star.** No route returns another player's stars; no broadcast is sent when one changes.
- **Data** (one migration, the final shape confirmed at build):
  - `private.group_member.starred boolean not null default false`, with a unique index on `(user_id) where starred`, so the database keeps "one star". The star goes when the membership row does.
  - `private.friendship.favourite_of_a` and `favourite_of_b`, `boolean not null default false`: the pair has one row (`user_a < user_b`), so each side has its own flag. Unfriending or blocking deletes the row and the flags with it.
- **Routes:** `POST /api/groups/star` (`{ id, starred }`; moving the star is one transaction: clear the old, set the new) and `POST /api/friends/favourite` (`{ userId, favourite }`: the friend by ID, as Remove names them, M19 19e), signed in only, each changing only the signed-in player's own flag. `GET /api/groups` and `GET /api/friends` return the flags for the viewer.

## Security change proposed (needs the human's OK; recorded in DECISIONS.md, Log, before any migration)
`plor_app` gains two column-level grants, and nothing else changes (no new table, policy, function or role):
1. `grant update (starred) on private.group_member to plor_app`, with one `plor_app` update policy on that table (DECISIONS.md, Row-level security in `private`: one policy per granted command). Today `plor_app` has select, insert and delete there.
2. `grant update (favourite_of_a, favourite_of_b) on private.friendship to plor_app`, with one `plor_app` update policy. Today it has select, insert and delete there.

What this exposes: a fault in either new route could flip another player's star or favourite flag. It could not add or remove a member or a friendship (those columns are not granted). The routes take the player from the verified session, and db tests prove a player cannot change another's flag.

## Source
- `docs/milestones/M10-groups.md`: G1 (what a group is), G6 (leaving and removal), G7 (where groups show: this milestone changes G7's "listing your groups"), G9 (data), G10 (plor_app's grants), G11 (10 groups, 50 members).
- `docs/milestones/M17-*.md` (friends, requests and blocks: what deleting a friendship does) and `docs/milestones/M20-design-rules-and-clean-up.md` (answer 39, the kit's Dropdown; answers 79 to 82, Your friends' rows and the ⋯).
- `docs/DECISIONS.md`: Row-level security in `private`; Database migrations; Formal verification; Error handling; Log.
- `docs/DESIGN.md`: the kit (Dropdown, rows, the hover rule), updated by 24b and 24c.
- `docs/SOURCES.md`: Next.js 16.4 (read `node_modules/next/dist/docs/` before changing a route or page), PostgreSQL 17 (partial unique indexes, column grants), Supabase CLI (migrations, pgTAP), WCAG 2.2 (2.5.8 target size, 1.4.1 use of colour: a star is filled or outlined, not only coloured), Playwright, Vitest.

## Sub-tickets (one PR each, from `m24-groups-tab-and-favourites`, slot 3)
- **24a, the stars in the database and the routes.** Changes nothing a player sees. Its migration reaches plor.app by the human's own `npx supabase db push`.
- **24b, the Groups tab.** Needs 24a's migration on plor.app before it merges, or the tab errors there.
- **24c, favourite friends.** Same condition.

## Acceptance criteria
- [x] **24a** The database keeps "one star": a second starred membership for one player is refused (pgTAP). Leaving, removal and account deletion still pass their existing tests.
- [x] **24a** `plor_app` holds exactly the two new grants: `supabase/tests/plor_app_role.test.sql` lists them and `private_schema.test.sql` passes.
- [x] **24a** `POST /api/groups/star` moves the star in one step, refuses a group the player isn't in (404, as the group page) and a signed-out caller (401); a player cannot change another player's star. Route db tests.
- [x] **24a** `POST /api/friends/favourite` sets and clears the caller's own flag for a friend whichever side of the pair they are, refuses a non-friend and a signed-out caller, and leaves the friend's flag alone. Route db tests.
- [x] **24a** `npm run verify -- group-membership` passes (the change touches `private.group_member`; the skill's coverage table is read first and the model changed only if a covered step changed).
- [ ] **24b** `/groups` shows the starred group's page; with no star, the first group joined; with no groups, the Create box. Playwright, `@visual`.
- [ ] **24b** The dropdown lists the player's groups and "New group…"; choosing a group shows it; "New group…" creates one. Playwright, `@visual`.
- [ ] **24b** Tapping the star makes the group the default and it is still the default after a reload and in a second browser signed in as the same player. Playwright.
- [ ] **24c** A favourited friend is first in Your friends after a reload; the friend's own page shows nothing of it. Playwright, `@visual`.
- [ ] Each PR's e2e videos are linked from its CI run and sent to the human.

## Out of scope
- Group invites from inside a group (#231) and group search (#232): "Still after beta".
- Several starred groups, or stars changing any board's order (answers 11 and 12).
- A Favourites filter on a leaderboard.
- "Less on the page" (#267), "Post like X" (#269), replays (#254), playfulness (#311).

## Numbers
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| 1 | Starred groups per player | The human, 2026-11-25: "Just one star: the default" |
| No cap | Favourite friends per player | Bounded by the player's friends; no answer asks for a cap |
| 10 groups, 50 members | Unchanged | M10 G11 |
| 24px at least | The star's target size | WCAG 2.2, 2.5.8 (SOURCES.md); the kit's own button size if larger |

## Plan
24a:
1. Record the security change in DECISIONS.md, Log → verify: `git diff --stat` shows the Log line before any file in `supabase/migrations/`.
2. Write failing pgTAP and route db tests for the criteria above → verify: `npm run test:db -- -t "star"` and `-t "favourite"` fail for the missing column and routes.
3. `npx supabase migration new stars < /dev/null`; the columns, index, grants and policies → verify: `npx supabase test db` passes, the grant list test included.
4. The two routes and the flags on the two list routes → verify: the tests from step 2 pass.
5. Read `verify-group-membership`'s coverage table against the diff → verify: `npm run verify -- group-membership` passes.

24b and 24c: each starts with its failing Playwright test, then the screen, then `npm run lint`, the targeted e2e (one e2e run at a time on this PC) and DESIGN.md.

Hypothesis for step 5: the star adds no step that creates, removes or hands over a membership, so the model needs no change and the check passes as it is. Disproved if a covered function (`group_member_guard`, `group_member_left`, the leave, remove or delete routes) has to change.

## Removes
24b removes the Groups tab's list of group buttons (`Groups`' `kit.rows` list) and the always-shown Create form, replaced by the dropdown. 24a and 24c remove nothing: they add columns, routes and a control.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| M10 G10: `plor_app` may read, insert and delete memberships | 24a: it may also update `starred`, and `favourite_of_a` and `favourite_of_b` on a friendship | The stars are kept on the account (answer 13); approved with the ticket (DECISIONS.md, Log, 2026-11-25) |
| This ticket as drafted: the favourite route names the friend by username | 24a: by user ID | A username can change hands after the page was drawn (M19 19e); Remove already names a friend by ID |
| DECISIONS.md, Network messages: a changed response shape raises the protocol | 24a: `GET /api/groups` and `GET /api/friends` gain one field per row and the protocol stays | An older page ignores a field it does not read; nothing it reads changed |

## Evidence
**24a** (slot 3's local stack, 2026-11-25; CI's run is on the PR):
- Failing first: `npm run test:sql` before the migration: `groups.test.sql (Tests: 27 Failed: 2) Failed tests: 26-27`, `plor_app_role.test.sql (Tests: 15 Failed: 1)`, `Result: FAIL`. The route tests could not load before the routes existed.
- One star, and the exact grants: `npm run test:sql` after: `Files=44, Tests=958 … Result: PASS` (`groups.test.sql` 26 and 27: a player stars one group, a second starred group is refused, 23505; `plor_app_role.test.sql` lists the three column grants; `private_schema.test.sql` passes with the two update policies).
- The routes: `npm run test:db`: `Test Files 1 failed | 72 passed (73)`, `Tests 552 passed | 43 skipped`. Passing among them: `src/app/api/groups/route.db.test.ts` ("stars one group as a player's default, moves the star in one step and clears it": a move, a 404 that leaves the star, a 400, a non-member's 404, each player's own star), `src/app/api/friends/route.db.test.ts` ("favourites a friend for the player who set it only, whichever side of the pair they are"), `src/groups/stars.plor-app.db.test.ts` (as `plor_app`: the flags set, a membership's or friendship's other columns refused with 42501; two moves at once, ten rounds, always one star). The signed-out 401s are in the two `route.test.ts` tables (`npm test`: 78 files, 943 passed).
- **The one failed file is not this change's, unverified:** `scripts/research.db.test.ts` (M23), "Hook timed out in 10000ms" in its `beforeAll`, which loads the 21 researched lists on a stack with no base loaded (13 s here). The diff touches nothing it reads. Not rerun on `main`; CI's `db` job is the check.
- The model: `npm run verify -- group-membership`: `GroupMembership.cfg: every rule holds (97961 distinct states, 12.5 s)`. The hypothesis held: no covered function changed, so the model is unchanged.
- `npm run lint` and `npx tsc --noEmit -p .`: no output.

## Review
- **24a** (the `reviewer` agent, 2026-11-25, read the code, ran nothing): no blocking finding in the code. Blocking, docs: the handoff and the ROADMAP row still said "nothing built", and Evidence was empty: fixed in the same PR.
- Deferred to ROADMAP "Next revision", For M24: a star move meeting the same player's account deletion can be the deadlock's victim (40P01, a 500); the race test rarely reaches the 23505 path, and no test of its own shows a star going with its membership; the protocol stays at its number.
