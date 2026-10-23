# M12 — Account

**Status:** planned. Drafted 2026-10-23 for the human to approve: A1–A8 and the numbers wait on the human, and no code is written before they're answered.

## Goal
A player can see and manage their own account in one place: their username (and change it, if A2 allows), display name, friends and invite link, all-time points, sign-out, and deleting the account themselves. The sign-in fixes filed for M12 come with it.

## Who uses it / what breaks without it
- **Used by:** every signed-in player, now and then rather than daily: to change how they're shown, find their invite link, see their total, sign out, or leave.
- **Breaks without it:**
  - **Deleting an account needs an email to the human,** who deletes the user by hand in the Supabase dashboard (the privacy page promises it, with no written procedure: ROADMAP "Next revision", For M12). Before the beta (M15), every player needs a way to leave without asking.
  - **A username can't change.** It was an M02 scope limit, not a decision (ROADMAP, M12 row); the human asked about the tradeoffs (2026-10-21).
  - **The all-time total was taken off the leaderboard** when it went weekly, to come back here (ROADMAP "Design review", 2).
  - **Account settings are mixed into the home page** (display name, friends, invite link, sign-out), which M11 reordered around the day.
  - Four problems are filed for M12 (ROADMAP "Next revision", For M12): sign-out ends every device's session; the code form has no way back from a mistyped email and keeps a pasted space; deleting an account while someone in one of its groups leaves can deadlock; and deletion scans comments and reactions with no index.
- **The human's words:**
  - "An account page, including deleting your account" (ROADMAP, Product);
  - "all working features first. home screen friends screen groups, account etc." (2026-10-21);
  - the all-time total "moves to the account page (M12)" (2026-10-22, Design review, 2).

## Claude's design (for the human to approve)
- **12a, the account page:** `/account`, linked from the home page's Account section, which shrinks to that link and Sign out. On the page: your username, your display name (moved from the home page), your friends and invite link (moved too), your all-time points, Sign out, and (12c) Delete account.
- **12b, sign-in and username:** the sign-out scope (A3), the code form's fixes (A6), and changing a username if A2 allows it.
- **12c, deleting your account:** a button on the account page that, after a confirmation (A4), deletes everything (A5), leaving each group first so a creator's group is handed on and no deadlock can happen.

## Decisions needed before any code
| # | Decision | Claude's suggestion | Answer (origin) |
|---|---|---|---|
| A1 | **Where account settings live.** (a) A page, `/account`, linked from the home page. (b) Stay on the home page, below Groups | (a). The home page is about today (M11 H1); settings are visited rarely, and the delete button shouldn't sit under the day's game | |
| A2 | **Changing your username.** (a) Never. (b) **Once every 30 days**, the old one free for anyone at once. (c) Any time | (b). A wrong pick at sign-up can be fixed, and a limit stops someone cycling names to confuse friends. Little depends on the username: friends and group members see the display name when there is one, invite codes are random (M07), and comments and boards store the user ID, not the name. Changing it needs an update grant on the username column: a security change (DECISIONS.md, Log) | |
| A3 | **Sign-out scope.** Supabase's default ends the player's sessions on every device (`signOut()`'s `global`). (a) **This device only** (`local`). (b) Every device, as now. (c) Both, as two buttons | (a), with (c)'s second button "Sign out everywhere" only if the human wants it now. Signing out of a shared computer shouldn't sign you out of your phone | |
| A4 | **Confirming a deletion.** (a) **Type your username** to enable the button. (b) A plain "Are you sure?" dialog. (c) An emailed code, like sign-in | (a). It can't be clicked by accident, and it needs no email round trip. (c) proves it's you, but the session already does | |
| A5 | **What deletion removes.** Everything tied to the account, by the cascades from `auth.users` (M00 data design §7, verified): profile, runs, answers, misses, ledger rows, comments (both threads) with their reactions and reports, your reactions and reports, friendships, invite codes and group memberships. A group you created passes to its longest-standing member, and a group you were the last member of is deleted (M10 G6). Your answers go with your runs, so the admin's puzzle insights for past days recount without them | As written. Other players' points don't change: a closed day's bonuses are already in their ledger rows (M09 D9) | |
| A6 | **The code form's fixes** (ROADMAP "Next revision", For M12): a "Use a different email" link back from the code form, and spaces stripped from a pasted code ("123 456") | Both | |
| A7 | **How the deletion runs (security change).** Deleting a Supabase user takes either (a) **a database function** run by `plor_app` that deletes the caller's own `auth.users` row, with its owner's rights, after leaving their groups through the same path as `leaveGroup`; or (b) Supabase's Admin API (`auth.admin.deleteUser`), which needs the secret key in Vercel | (a). It adds no secret, and `plor_app` can only ever delete the signed-in player (the function takes no user ID from the caller's input: the route passes the verified one). (b) puts a key that can do anything into the app (CLAUDE.md, Least privilege). Whether Supabase supports deleting from `auth.users` by SQL is *unverified*: the Auth docs on managing users aren't in SOURCES.md, so that page needs adding (only a human adds sources) | |
| A8 | **The privacy page** after 12c | Say that you can delete your account yourself on the account page, and keep the email address for anything else | |

## Source
- Supabase client (supabase-js, SOURCES.md): `auth.signOut({ scope })` for A3.
- Supabase SSR auth (SOURCES.md): sign-out through the route handler's client.
- PostgreSQL 17 (SOURCES.md): `ON DELETE CASCADE`, `SECURITY DEFINER` functions, column grants (A2, A7), indexes for the cascade (For M12).
- **Missing, for the human to add:** Supabase Auth, managing users (deleting a user, and whether deleting from `auth.users` directly is supported). A7 waits on it.
- The human's decisions: ROADMAP "Design review", 2 (the all-time total); M07 (invite links, display names), M09 (the ledger), M10 G6 (handover) for the rules reused.

## Acceptance criteria
Written when each sub-ticket starts, from the answers above.

## Out of scope
- Friend requests by username, blocking (ROADMAP Later).
- An average score on the account page (ROADMAP Later, with a human minimum).
- Exporting your data; changing your email address; anonymous play (M15).
- The look (M14).

## Numbers
Every value this milestone needs, and where it comes from. A blank origin means stop and ask.
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| How often a username can change | A2 | Claude's suggestion: once every 30 days. *The human's number* |
| Username rules: 3 to 20 characters, the existing format | A2 | M02 (`USERNAME_MIN_LENGTH`, the profile's check) |

## Plan
1. The human answers A1–A8 and the username interval, and adds the Supabase Auth "managing users" source for A7.
2. **12a** the account page; **12b** sign-in fixes and the username; **12c** deletion. One PR per sub-ticket from `m12-account`.

## Removes
- **12a:** the display name, friends and invite link sections from the home page (moved, not copied).
- **12b:** the global sign-out; the code form's dead end.
- **12c:** the privacy page's "email us to delete" as the only way; the handoff's hand-run deletion.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
