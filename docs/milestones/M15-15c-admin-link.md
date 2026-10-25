# M15 15c — An Admin link for admins

**Status:** drafted for approval (2026-10-24), from the human's guided answers. No code yet.

## Goal
An admin finds the admin pages from the account page, without typing `/admin`.

## Who uses it / what breaks without it
- **Used by:** the human, the only admin, to reach puzzle entry, insights, reports, the audit and the answer database (`/admin`, `/admin/puzzles`, `/admin/reports`, `/admin/audit`, `/admin/base`).
- **Breaks without it:** no page outside `/admin` links to them (`git grep 'href="/admin'` finds links only inside `src/app/admin/`), so an admin has to know and type the address. The human: "right now im not evne admin, or if i am i can't really see it" (2026-10-24).
- **The human's answers** (2026-10-24, guided questions): see the admin pages "On plor.app"; the link goes on the "Account page now"; only admins see it.

## Claude's design (for the human to approve)
- `GET /api/account` gains `admin: true | false`, from the existing `isAdmin` (`src/insights/queries.ts`). A new field that older pages ignore, so no protocol bump (M00 data design §2).
- The account page shows an **Admin** link to `/admin` when `admin` is true, and nothing otherwise.
- The admin pages and routes keep their own checks (a non-admin gets 403 whatever the link shows), so this isn't a security change.
- M14 is turning the account page into the Me tab (`m14-look-and-feel`, L44 and L45); the link moves with it. Its handoff gets a line about it.

## Source
- Next.js 16.4.2 (SOURCES.md, bundled docs): `<Link>`, as the account page already uses it.
- `docs/milestones/M00-data-design.md` §2: a new response field isn't a breaking change.
- `docs/milestones/M12-account.md`, 12a: the account page and `GET /api/account`.

## Acceptance criteria
1. `GET /api/account` answers `admin: true` for a player in `private.admin` and `admin: false` for one who isn't (db route test, `src/app/api/account/route.db.test.ts`).
2. On the account page an admin sees an **Admin** link that opens `/admin`, and a player who isn't an admin sees none (e2e, `e2e/account.e2e.ts`).
3. `npm test`, `npm run lint`, `npx tsc --noEmit -p .`, `npm run test:db` and `npm run test:e2e` pass.

## Out of scope
- Making an account an admin: that stays a row in `private.admin`, added by the human in the SQL editor.
- Where the link sits in M14's new shell.

## Numbers
None.

## Plan
1. The human approves this ticket.
2. Tests first (criteria 1 and 2 fail), then the field and the link, then the suites, the reviewer, and the PR from `m15-launch-readiness`.

## Removes
Nothing: no other way to reach the admin pages exists to remove; typing the address still works.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
