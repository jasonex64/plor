# Backlog sort for the closed beta, 2026-11-11

**Approved by the human, 2026-11-11: "Approve the sort".** Its Drop rows were then taken out of ROADMAP's Next revision (408 lines, 49 of them open items, the rest already ticked or their sub-lines), but for lines 805 to 836, the village's, which 14c-9's PR sorts itself. Later and For the human rows stay in ROADMAP. It is the full itemised list the plan to the beta waits for (ROADMAP, Focus: "I sort, you approve"; "Sort, fix only launch-blockers").

## How it was sorted
Seven Sonnet agents, one per part of ROADMAP's "Next revision" and one for the 2026-10-26 audit's 81 findings, read every item in full and opened the cited code on `main` at `3076d81` where they could; a row says *unverified* where they didn't. The main session re-read the must-fix and close-call rows. No test was run.

The test for **must-fix**, Claude's reading of "launch-blockers" for a closed beta, for the human to change: a friend in a small invited group would plausibly hit it in normal play in the first weeks, and it blocks play, loses data, shows a wrong result, leaks something private or breaks the deploy. It is stricter than the first sort's (24 must-fix, from headlines), so the counts differ.

## Counts
| Part | Must-fix | Later | Drop | For the human | Rows |
|---|---|---|---|---|---|
| For the human, the agent rules, M12, the MVP review, M15 | 0 | 46 | 12 | 7 | 65 |
| For M13, first half | 0 | 10 | 37 | 2 | 49 |
| For M13, second half (all under ticked items) | 0 | 0 | 141 | 0 | 141 |
| For M14, first half | 0 | 59 | 59 | 4 | 122 |
| For M14, second half | 0 | 31 | 80 | 1 | 112 |
| For M16 | 1 | 68 | 43 | 6 | 118 |
| The 2026-10-26 audit | 1 | 57 | 17 | 6 | 81 |
| **All** | **2 (one job)** | **271** | **389** | **26** | **688** |

Rows count sub-bullets and already-ticked items one by one, which is why there are more than ROADMAP's 305 open boxes; most of Drop is "already ticked".

## Must fix before friends play (1 job)
1. **plor.app can't be given its answer lists or game 2's dictionary** (M16-L756 and the audit's TOOL-6, the same gap; ROADMAP's hosted-loading item in For M15). The loader refuses any database but this PC's (`scripts/base.ts`, `localClient`), on purpose. Until a hosted way exists, every answer on plor.app is refused and game 2 calls every word "not a word". It writes to the hosted database, so it's a security change that needs the human's design answers first.

## Close calls, sorted Later: the human may want them in
2. **One very long pasted answer can crash the request** (tonight's audit, W1). Refusing over 40 characters before matching closes it with no new number.
3. **A friend who closes the app at a reveal must finish yesterday's run before today's** (by design; DECISIONS.md, Timer). Not a bug, but the first thing a beta friend will ask about.
4. **Tapping Next in a second tab shows a server error** instead of a plain message (M15-L868; `src/game/runs.ts`, `openNext`). Nothing is lost.
5. **After a friend changes their username, an old open page can act on whoever took the old name** (M15-L862): remove a friend, remove a member, react. Needs a rename and a reuse before a reload.
6. **The live board can show a friend as still playing until a reload** after a rare race (M12-L173).
7. **Me counts days played one way and the boards another** (M16-L787): an unfinished run counts on the boards and not on Me.

## Waits on the human before the beta
- **Game 2's dictionary credit** (tonight's audit, W2): the M16 ticket promises UKACD's notice on About before game 2 goes live. Does the beta count as live?
- **Upcoming answers are readable in the public repo** (HUM-L154): `content/bank.json` and the drafted day. Fine for friends, or fix first (M15 15a)?
- **Supabase's dashboard:** the sign-in settings typed by hand, and the old signing secret still trusted (M15-L856, L857).
- **What a second game shares** (the audit's APP-6, DOM-4, FUT-11): comments, the feed, the streak and Me's totals are game 1's only. This is 16f's question round.
- **Guest play's design** (the audit's APP-7, FUT-1, DB-9): its own question round, before 16f and M17.
- **Phone checks only the human can do:** the iPhone keyboard on Undo, and what VoiceOver and TalkBack read for a run's reactions and the play frame's messages (M13-L206, L211, M14a-L589).
- **Small product calls:** the share line's placeholder squares (M14-L603), a long name at high zoom (M14a-L577), the admin warning's red line (M14a-L511), six harmless words the filter keeps out and a few plurals refused in game 2 (M16-L738, L739).

## Every row
The agents' tables follow as written. IDs are the section and ROADMAP's line number on `main` at `3076d81`, or the 2026-10-26 audit's own ID.

### Part: s1-human-process-m12-m15

#### ROADMAP sort, lines 148-186 and 837-879 (checked against RIFF-audit-2026-11-11 at 3076d81)

Counts: MUST-FIX 0 | LATER 46 | DROP 12 | HUMAN 7 | total 65 rows (hosted-load sub-bullets are separate rows). Rows I checked by reading code say so in Evidence; the rest are *unverified*.

MUST-FIX rows: none. Nothing in this part blocks play, corrupts data, shows a wrong result in normal play, or breaks a deploy. Closest calls, kept at LATER: M12-L173 (live board stale after a race), M15-L868 (second tab's Next shows an error), M15-L862 (wrong friend hit after a rename). HUMAN rows that gate the beta: M15-L849 (hosted answer base must be loaded), M15-L856 and M15-L857 (Supabase dashboard), M12-L154 (puzzle drafts public).

| ID | Bucket | What it is, in plain words | Evidence | Reason |
|---|---|---|---|---|
| HUM-L153 | HUMAN | GitHub setting: should a stranger's proposed change wait for the owner's OK before automatic checks run? | *unverified* (a GitHub setting, not in code) | Account setting, only the human can change it. |
| HUM-L154 | HUMAN | Upcoming puzzle answers sit in the public code repository, so a curious friend could read them early. | content/offbeat/2026-10-24.json and content/bank.json are still tracked (git ls-files); docs/milestones/M15-15a-private-drafts.md Status is "deferred" | Human chose to keep the bank public and decide the drafts fix in M15; for a friends-only beta the human must say if that is still fine. |
| PROC-L157 | LATER | The "goodnight" agent routine should list more of the cases where it must stop and ask. | *unverified* (skill file not opened) | Tooling wording, no player effect. |
| PROC-L158 | LATER | The "audit" agent routine should say where to run it and what to do if its branch already exists. | *unverified* | Tooling wording only. |
| M12-L161 | DROP | Signing in with Google from the old account page returns to the home page instead. | No "/account" page exists now: src/app/(shell) has me, friends, g, groups, i, play, play2; only src/app/api/account/delete remains; src/app/home.tsx:82-86 remembers only invite paths | The page described is gone; landing on home is harmless. |
| M12-L162 | LATER | Deleting an account may leave a friend's open page stale, and a friend deleted at the wrong instant can give the board a one-off error. | *unverified* (src/friends/board.ts not opened) | Rare two-step race; an error, not a wrong result. |
| M12-L163 | LATER | If sign-out fails right after deleting an account, the player sees an error although the deletion worked. | src/app/api/account/delete/route.ts:19-20 `if (error) throw error` after deleteAccount | Rare (Auth unreachable), loud, account is gone anyway. |
| M12-L164 | LATER | A group joined in another tab at the exact moment of deleting an account is handled in an older order. | *unverified* | Needs a millisecond race plus a third player. |
| M12-L165 | LATER | A test for account deletion waits a fixed half second and could pass without testing the race. | src/lib/account.plor-app.db.test.ts:85 `setTimeout(resolve, 500)` | Test nit, no player effect. |
| M12-L166 | DROP | A code comment in the groups database file wrongly says deletion can deadlock. | The cited file 20261023050925_groups.sql no longer exists (squashed into 20261028140000_baseline.sql; lines 2565-2567 hold similar wording) | Comment nit nobody will act on. |
| M12-L167 | DROP | A harmless browser console warning about two list items sharing a key in a test run. | `key={i}` exists, e.g. src/app/admin/puzzles/puzzles.tsx:226; cause not traced | Duplicate of M12-L176; console warning only. |
| M12-L168 | DROP | An automated live-board reconnect test once timed out on the build server. | *unverified*; same test is item M12-L178 | Duplicate of M12-L178; no trace to act on. |
| M12-L169 | LATER | Test runs leave about 90 leftover sign-in count rows in the local database. | *unverified* | Local test hygiene only. |
| M12-L170 | DROP | The "25 guesses an hour" sign-in limit can really be 30. | *unverified*; the item itself says about 1 in 33,000 an hour | A 5-guess difference against a 6-digit code; nobody will act. |
| M12-L171 | LATER | People on one shared connection (office, phone carrier) share the limit of 5 sign-in code emails an hour. | src/lib/auth-limits.ts:18-19 keys on the first x-forwarded-for address | A friends group in one office could notice, but retrying later works; revisit at load test. |
| M12-L172 | LATER | A test for the missing-address error does not check it was logged. | src/lib/auth-limits.ts:19 throws; logging is src/lib/http.ts:35 | Test nit. |
| M12-L173 | LATER | After a rare race the live friends board can show a friend as still playing until reload. | *unverified* (board trigger SQL not opened) | Nothing private leaks and a reload fixes it; strict rule says later. |
| M12-L174 | LATER | A live-board test might miss a late status message after a page reload. | e2e/live-board.e2e.ts:94 filters frames as described | Test nit. |
| M12-L175 | LATER | The app's database role can delete any comment without leaving a record. | *unverified* (grants in baseline not opened) | Players cannot reach it without a server bug. |
| M12-L176 | DROP | Another note about the same "two children with the same key" console warning. | `key={i}` at src/app/admin/puzzles/puzzles.tsx:226 and src/app/comments.tsx:317 | Duplicate of M12-L167; console warning only. |
| M12-L177 | DROP | The privacy page's wording about when sign-in counts are deleted is slightly off. | src/app/privacy/page.tsx:58 says "deleted the next time anyone signs in after that" | Item itself says approximately right; nobody will act. |
| M12-L178 | LATER | A live-board reconnect test failed once in a slow full test run. | *unverified* | Test flake; fix when e2e is made reliable. |
| M12-L179 | LATER | The test sign-in helper waits only 5 seconds for the code email, so slow build servers fail it. | e2e/players.ts:12 `.poll(` with default timeout | Test flake on CI only. |
| MVP-L182 | LATER | Yesterday's board lists a player who joined today with 0 points for a day they could not play. | src/friends/leaderboard.ts:215-224 handles groups by join day; the plain friends board not traced (*unverified*) | Cosmetic wrong-looking row, no data loss. |
| MVP-L183 | LATER | "Earlier day" in the comments feed can be clicked back forever into empty days. | src/app/comments.tsx:183-186 button always shown, `shiftDay(shown, -1)`, no lower bound | Harmless empty pages; polish. |
| MVP-L184 | LATER | A group member who opens the group's invite link sees "You're already in this group" with no link to the group. | src/app/groups.tsx:290-324 JoinGroup shows only the error and a link to today's puzzle; src/app/messages.ts:47 | Confusing but a friend can use the Groups tab. |
| MVP-L185 | DROP | On a day with no puzzle the feed still says to finish today's puzzle. | src/app/comments.tsx:299-304 now reads "No comments yet. Finish today's game to join in."; wording changed | Largely changed already; not a beta case. |
| M15-L838 | LATER | A name or fact removed at midnight may be missing for up to a day on hosted loads. | *unverified* (loader not opened) | Human already chose to leave the gap. |
| M15-L839 | LATER | Two database scans per wrong answer and per run read could be slow at large scale. | *unverified*; item says measure at the beta's "tens a day" | Scale item. |
| M15-L840 | LATER | Late questions' hosts lean toward answers with few stolen letters. | *unverified* | Puzzle tuning; wait for real catch rates. |
| M15-L841 | LATER | Merging loaded answer things on the hosted database needs its own method. | *unverified* | Needed only when merging on a live base. |
| M15-L842 | DROP | Old player-added answers written before the letter fix keep odd letters. | Item itself says no hosted player data exists yet (*unverified*) | Nothing to fix until such rows exist. |
| M15-L843 | LATER | Header row for the four hosted-load gaps listed next. | Parent row of L844-847 | Kept so nothing is skipped; admin-only loading. |
| M15-L844 | LATER | A refused circle load leaves the base half-loaded, so later loads are refused until files change. | *unverified*; item says loud | Loud and admin-only. |
| M15-L845 | LATER | A single load can run while "load all" holds the lock. | *unverified*; item says it marks nothing | Harmless. |
| M15-L846 | LATER | The load lock needs a different database connection type on the hosted pooler. | *unverified* | Matters only for hosted loads; admin-only. |
| M15-L847 | LATER | Dropping a category reads every run per category. | *unverified* | Cheap now; grows with scale. |
| M15-L848 | LATER | A newly added answer can score 0 if it joins between a day's approval and start; an acceptance just after midnight is dated a day early. | *unverified*; item says it needs a member to join a category between two of its family's days | Rare, small score effect; human already deferred to the beta. |
| M15-L849 | HUMAN | Loading the answer base onto the live plor.app database, and how its address reaches the script safely. | *unverified*; the item says the way is still open | Needs the human's secret and a decision; the beta cannot run without answers on plor.app. |
| M15-L850 | HUMAN | Warn the human when the hosted database nears its plan's size limit. | *unverified*; item says limit and warning level are human numbers | Human number and purchase decision. |
| M15-L851 | LATER | Decide a CAPTCHA on sending sign-in codes, since a few addresses could use up the shared email allowance. | *unverified*; human accepted it for the closed beta only (2026-10-24) | Public-launch item by the human's own note. |
| M15-L852 | LATER | Finished players' run reads count the day's answers with no index. | *unverified* (no EXPLAIN run) | Scale item for the load test. |
| M15-L853 | HUMAN | The expected player count and the Supabase spend cap are human numbers for the load test. | Item says human numbers | Only the human can pick them; load test is after the beta. |
| M15-L854 | LATER | No limit on how many or how long answer requests may be. | *unverified* (src/app/api/run/answer/route.ts not fully read) | Load-test item; signed-in friends only. |
| M15-L855 | LATER | The database connection has no timeout, so a hung provider would hang every page. | src/lib/db.ts:28-30 poolConfig sets only ssl; no connectionTimeoutMillis | Provider hangs are rare; the value is a human number. |
| M15-L856 | HUMAN | Live sign-in settings are typed by hand into the Supabase dashboard; mistakes reached production before. | *unverified* (dashboard) | Dashboard task for the human; worth a checklist before plor.app is updated. |
| M15-L857 | HUMAN | An old signing secret for logins is still trusted until the human turns it off in the dashboard. | *unverified* (dashboard) | Security dashboard action only the human can do. |
| M15-L858 | DROP | Survey people had seen some early puzzle days. | Already ticked [x], closed by the human 2026-11-05 | Already done. |
| M15-L859 | LATER | Where a browser has a share function but no places to share to, Share silently does nothing. | src/app/share.tsx:28 ignores AbortError | Cosmetic, rare device case. |
| M15-L862 | LATER | After a friend renames themselves, removing a friend or member or reacting from an old page could hit another player with that name. | src/friends/friends.ts:81 and src/reactions/reactions.ts:70 match `p.username`; src/groups/groups.ts:142 removeMember takes a username | Needs a rename plus someone taking the old name before reload; closed group. |
| M15-L863 | LATER | The live board can say a friend is still on a question after their time ran out. | *unverified* | Display lag, nothing hidden. |
| M15-L864 | LATER | A few page loads can briefly show older data after a live update. | *unverified* | Corrects itself on the next message. |
| M15-L865 | LATER | While the live connection's token cannot refresh, its error repeats and stays after recovery. | *unverified* | Only while the live service is failing. |
| M15-L866 | LATER | A run finished after midnight shows "under 1% gave this" beside late answers the day's counts leave out. | *unverified* | Cosmetic label for a late finisher. |
| M15-L867 | LATER | The feed's names-and-counts preview wording has no test. | src/comments/preview.test.ts exists but the named strings were not checked (*unverified*) | Test gap only. |
| M15-L868 | LATER | Odd cases (Next from a second tab, two tabs reacting, a report racing a delete) give a server error instead of a friendly message. | src/game/runs.ts:297-310 openNext maps RUN_OVER and 23514 but not OB002; game 2's src/game/substring-runs.ts:119 does | Needs two tabs or a race; nothing is lost. |
| M15-L869 | LATER | Next and answer pick the latest run by date, not the one the screen shows, if an old unfinished run sits beside today's. | src/game/runs.ts:184 todaysState prefers in_progress; :226 and :292 order by date only | Needs an unfinished earlier day plus today's run; verify before public launch. |
| M15-L870 | LATER | A puzzle approved seconds before midnight but committed after could change a day already started. | *unverified*; item says milliseconds wide | Millisecond race, admin action. |
| M15-L871 | LATER | An answer begun just before midnight and saved just after can miss an early settle's counts. | *unverified*; item says milliseconds wide | Millisecond race. |
| HK-L874 | LATER | The code checker also scans untracked folders added by one machine, giving 188 warnings. | eslint.config.* ignores only .claude/worktrees/** (line 16), not .claude/ | Local tooling noise. |
| HK-L875 | LATER | A pinned "zod" version override in package.json can go once a dependency is updated. | package.json:52-54 override present; package-lock has @vercel/cli-config 0.3.1 | Build works today; tidy-up. |
| HK-L876 | LATER | A test covers the autumn clock change but not the spring one. | no spring date found in src/game/day.db.test.ts (*unverified* beyond grep) | Next spring change is March 2027. |
| HK-L877 | DROP | Four code comments point at the wrong place or are out of date. | src/game/runs.ts:2, src/game/day.db.test.ts:9, src/lib/auth.ts:43 hold the stale wording | Comment nits nobody will act on. |
| HK-L878 | DROP | Vitest also collected tests under leftover worktrees. | Already ticked [x]; vitest.config.ts:11 excludes .claude/worktrees/** | Already done. |
| HK-L879 | LATER | Locally the app connects as a powerful database user, so route tests do not exercise the app role's limits. | *unverified*; staging uses plor_app per the item | Test-coverage gap; a role change needs a human. |

### Part: s2-m13-a

#### ROADMAP lines 187-330 (first half of For M13), checked against RIFF-audit-2026-11-11 @3076d81

Counts: MUST-FIX 0, LATER 10, HUMAN 2, DROP 37 (total 49; line 187 is the section header, not an item).

#### MUST-FIX rows
None. No item here would block play, corrupt data, show a wrong result, leak data or break a deploy for beta friends; all are test nits, wording, cosmetics or phone checks.

#### All rows

| ID | Bucket | What it is | Evidence | Reason |
|---|---|---|---|---|
| M13-L195 | LATER | Signing out with an unsent reaction says "Your post didn't send" though it was a reaction. | src/app/settings.tsx:~410 shows that exact text; true | Wrong wording only, sign-out still works |
| M13-L196 | LATER | A test waits half a second before checking nothing was posted. | e2e/comments-and-undo.e2e.ts:54 waitForTimeout(500); true | Test nit, no player impact |
| M13-L197 | LATER | The Undo button's focus return checks the page before the page updates; fragile but not wrong. | src/app/undo.tsx:49-54 back() runs action() then checks isConnected; true | Not wrong today, no player impact |
| M13-L200 | LATER | A screen-reader test checks loosely (at least 2 placeholders; only no sideways scroll at 320px). | e2e/screen-readers.e2e.ts:56 toBeGreaterThanOrEqual(2); true | Test strictness nit |
| M13-L202 | LATER | A new player opening a friend's invite link may see the "A friend invited you" line flicker on, off, on. | src/app/globals.css:226-234 rules for [data-invite-line] exist; flicker itself not observed (*unverified*) | Cosmetic flicker, not wrong data |
| M13-L203 | LATER | A settings test waits a fixed 300 ms after each save instead of the server's answer. | e2e/settings-and-invites.e2e.ts:122 waitForTimeout(300); true | Test flake risk only |
| M13-L204 | LATER | If the invite link fails to load, the Invite button stays greyed out until the page is reloaded. | src/app/invite-link.tsx:19-38,110-117: error shown as alert, button disabled while code===null, no retry; true | Needs a network failure; reload fixes it; message is shown |
| M13-L207 | LATER | In slow test runs, a tab or Play click right after sign-in sometimes did not move to the new page. | Test files named (e2e/shell.e2e.ts, account.e2e.ts, me.e2e.ts) exist; cause not traced and passed alone; real-world effect *unverified* | Seen only under 2x slow CI; tolerable unless a friend reports it |
| M13-L208 | LATER | On browsers older than about 2023 (before Chrome 109/Safari 16.4), open board rows get a squashed header. | src/app/kit.module.css:78 uses calc((44px - 1lh)/2) with padding zeroed at :70-72, no @supports; true | Cosmetic, only very old phones; beta friends have recent phones |
| M13-L209 | LATER | A layout test measures right after resizing without waiting, and says 1440px while checking 1280px. | e2e/live-board.e2e.ts:144 setViewportSize 1280 (1440 appears only at :299); true | Test nit |
| M13-L206 | HUMAN | Undo may bring up the iPhone keyboard on the comment box; nobody has seen it. | src/app/undo.tsx:53 focus({preventScroll:true}); iPhone behaviour *unverified* (needs a real phone) | Only a phone check can answer it |
| M13-L211 | HUMAN | Whether VoiceOver/TalkBack read the reactions group name on a phone is unchecked. | src/app/reactions.tsx:24 role=group aria-label; board.tsx:128 aria-hidden label; phone behaviour *unverified* | Needs the human's phone screen-reader check |
| M13-L188 | DROP | A time-zone clock-change failure in a database test file (an old content-pipeline or test issue, already closed). | docs/ROADMAP.md:188 is ticked [x] and says closed/fixed; fix itself not re-checked in code (*unverified*) | Already done |
| M13-L189 | DROP | A test describes "two days ago" in two slightly different ways. | Opened supabase/tests/load_sync.test.sql:272 (now() - interval '2 days') beside :268-271 (days_back); still there, as described | Item itself says harmless; nobody will act on it |
| M13-L190 | DROP | A flaky live-board layout test (an old content-pipeline or test issue, already closed). | docs/ROADMAP.md:190 is ticked [x] and says closed/fixed; fix itself not re-checked in code (*unverified*) | Already done |
| M13-L191 | DROP | A flaky time's-up test (an old content-pipeline or test issue, already closed). | docs/ROADMAP.md:191 is ticked [x] and says closed/fixed; fix itself not re-checked in code (*unverified*) | Already done |
| M13-L192 | DROP | A page-leaving send that waited behind an earlier one (an old content-pipeline or test issue, already closed). | docs/ROADMAP.md:192 is ticked [x] and says closed/fixed; fix itself not re-checked in code (*unverified*) | Already done |
| M13-L193 | DROP | The page keeps a tiny leftover note for each reaction you tap, never cleaned up. | src/lib/hold.ts:47 rows Map, set at :68, never deleted; true | Tiny memory, gone on page reload |
| M13-L194 | DROP | A hypothetical clash between sending a held post and holding a new one that cannot happen today. | src/lib/hold.ts:128 hold(), :143 sendNow() exist; item says the settings dialog makes it unreachable; not re-traced (*unverified*) | Describes a state that cannot occur |
| M13-L198 | DROP | Undo's focus jumped the page (an old content-pipeline or test issue, already closed). | docs/ROADMAP.md:198 is ticked [x] and says closed/fixed; fix itself not re-checked in code (*unverified*) | Already done |
| M13-L199 | DROP | A screen reader read a reactions label oddly (an old content-pipeline or test issue, already closed). | docs/ROADMAP.md:199 is ticked [x] and says closed/fixed; fix itself not re-checked in code (*unverified*) | Already done |
| M13-L201 | DROP | The side column remembers which control had focus when it goes away, and never uses it. | src/app/side-column.tsx:40-44 cleanup stores activeElement, read only on next mount; true but harmless | Harmless nit nobody will act on |
| M13-L205 | DROP | The invite code is tied to the username rather than the account id. | src/app/invite-link.tsx:22-48 owner = username; works as item says | Item says it works; style nit |
| M13-L210 | DROP | Find a player picks the typed exact name only because the list is sorted by name. | src/app/leaderboard.tsx:94 sorts with localeCompare; as described | Records an invariant, no defect |
| M13-L212 | DROP | A design-doc sentence about a test run's result having no Share button is worded confusingly. | docs/DESIGN.md:146 cites offbeat.tsx:127-131, which now shows OffbeatInfo; src/app/game.tsx:744 renders Share only when saved | Doc wording nit, and cited lines have moved |
| M13-L213 | DROP | The import's paging edge cases (closed as obsolete) (an old content-pipeline or test issue, already closed). | docs/ROADMAP.md:213 is ticked [x] and says closed/fixed; fix itself not re-checked in code (*unverified*) | Already done |
| M13-L218 | DROP | The import ignoring a same-as clash (an old content-pipeline or test issue, already closed). | docs/ROADMAP.md:218 is ticked [x] and says closed/fixed; fix itself not re-checked in code (*unverified*) | Already done |
| M13-L219 | DROP | The review not counting parentless fruit (an old content-pipeline or test issue, already closed). | docs/ROADMAP.md:219 is ticked [x] and says closed/fixed; fix itself not re-checked in code (*unverified*) | Already done |
| M13-L220 | DROP | The category walk written three times (an old content-pipeline or test issue, already closed). | docs/ROADMAP.md:220 is ticked [x] and says closed/fixed; fix itself not re-checked in code (*unverified*) | Already done |
| M13-L221 | DROP | "dog" naming two animals (an old content-pipeline or test issue, already closed). | docs/ROADMAP.md:221 is ticked [x] and says closed/fixed; fix itself not re-checked in code (*unverified*) | Already done |
| M13-L222 | DROP | "china" and alias noise (an old content-pipeline or test issue, already closed). | docs/ROADMAP.md:222 is ticked [x] and says closed/fixed; fix itself not re-checked in code (*unverified*) | Already done |
| M13-L223 | DROP | Provisional bonus in huge categories (an old content-pipeline or test issue, already closed). | docs/ROADMAP.md:223 is ticked [x] and says closed/fixed; fix itself not re-checked in code (*unverified*) | Already done |
| M13-L224 | DROP | Matching edge cases (an old content-pipeline or test issue, already closed). | docs/ROADMAP.md:224 is ticked [x] and says closed/fixed; fix itself not re-checked in code (*unverified*) | Already done |
| M13-L230 | DROP | Approval against a moving base (an old content-pipeline or test issue, already closed). | docs/ROADMAP.md:230 is ticked [x] and says closed/fixed; fix itself not re-checked in code (*unverified*) | Already done |
| M13-L231 | DROP | The kind-of walks written many times (an old content-pipeline or test issue, already closed). | docs/ROADMAP.md:231 is ticked [x] and says closed/fixed; fix itself not re-checked in code (*unverified*) | Already done |
| M13-L232 | DROP | Smaller gaps from the 13a-2 review (an old content-pipeline or test issue, already closed). | docs/ROADMAP.md:232 is ticked [x] and says closed/fixed; fix itself not re-checked in code (*unverified*) | Already done |
| M13-L239 | DROP | Readers skipping removed rows (an old content-pipeline or test issue, already closed). | docs/ROADMAP.md:239 is ticked [x] and says closed/fixed; fix itself not re-checked in code (*unverified*) | Already done |
| M13-L240 | DROP | Smaller gaps from the 13b review (an old content-pipeline or test issue, already closed). | docs/ROADMAP.md:240 is ticked [x] and says closed/fixed; fix itself not re-checked in code (*unverified*) | Already done |
| M13-L248 | DROP | Rare tier counting members at approval (moved to M15) (an old content-pipeline or test issue, already closed). | docs/ROADMAP.md:248 is ticked [x] and says closed/fixed; fix itself not re-checked in code (*unverified*) | Already done |
| M13-L249 | DROP | Smaller gaps from the 13c review (an old content-pipeline or test issue, already closed). | docs/ROADMAP.md:249 is ticked [x] and says closed/fixed; fix itself not re-checked in code (*unverified*) | Already done |
| M13-L259 | DROP | Question bank identity and themes (an old content-pipeline or test issue, already closed). | docs/ROADMAP.md:259 is ticked [x] and says closed/fixed; fix itself not re-checked in code (*unverified*) | Already done |
| M13-L265 | DROP | Smaller gaps from the 13d review (an old content-pipeline or test issue, already closed). | docs/ROADMAP.md:265 is ticked [x] and says closed/fixed; fix itself not re-checked in code (*unverified*) | Already done |
| M13-L266 | DROP | Smaller gaps from the 13e-1 review (an old content-pipeline or test issue, already closed). | docs/ROADMAP.md:266 is ticked [x] and says closed/fixed; fix itself not re-checked in code (*unverified*) | Already done |
| M13-L273 | DROP | 13e-2 batch gaps (an old content-pipeline or test issue, already closed). | docs/ROADMAP.md:273 is ticked [x] and says closed/fixed; fix itself not re-checked in code (*unverified*) | Already done |
| M13-L285 | DROP | 13e-4b gaps (an old content-pipeline or test issue, already closed). | docs/ROADMAP.md:285 is ticked [x] and says closed/fixed; fix itself not re-checked in code (*unverified*) | Already done |
| M13-L299 | DROP | 13e-4a gaps (an old content-pipeline or test issue, already closed). | docs/ROADMAP.md:299 is ticked [x] and says closed/fixed; fix itself not re-checked in code (*unverified*) | Already done |
| M13-L311 | DROP | 13e-3 gaps (an old content-pipeline or test issue, already closed). | docs/ROADMAP.md:311 is ticked [x] and says closed/fixed; fix itself not re-checked in code (*unverified*) | Already done |
| M13-L323 | DROP | 13e-5 review gaps (an old content-pipeline or test issue, already closed). | docs/ROADMAP.md:323 is ticked [x] and says closed/fixed; fix itself not re-checked in code (*unverified*) | Already done |
| M13-L330 | DROP | 13e-5 second review gaps (an old content-pipeline or test issue, already closed). | docs/ROADMAP.md:330 is ticked [x] and says closed/fixed; fix itself not re-checked in code (*unverified*) | Already done |

### Part: s3-m13-b

#### S3 M13-b audit: ROADMAP lines 331-479

Counts: MUST-FIX 0, LATER 0, DROP 141, HUMAN 0. No MUST-FIX rows.

Method: read lines 331-479 in full. Every item sits under a parent bullet ticked [x] (closed, fixed, accepted by the human, or moved to Later or For M15). Per the rules these go in DROP as already done. Items the ticks say moved to Later or For M15 are tracked on their own ROADMAP lines, covered by other auditors. Code spot-checks done in the audit worktree are named in the Evidence column; all other rows rely on the ticked line's own text and are *unverified* against code. Row IDs: M13b-L<line>.

| ID | Bucket | Plain description | Evidence | Reason |
|---|---|---|---|---|
| M13b-L331 | DROP | Review lists joins from saved files rather than the database | ROADMAP line 331 is closed (code *unverified*) | Already done: Moved to Later (13f-4c); content tooling, not player-facing |
| M13b-L332 | DROP | Every review reads three big animal files and crashes on a machine without them | ROADMAP line 332 is closed (code *unverified*) | Already done: Struck through, fixed in 13f-4c |
| M13b-L333 | DROP | Review could crash with an unclear error if a re-download drops an ID | ROADMAP line 333 is closed (code *unverified*) | Already done: Struck through, fixed in 13f-3b-2 |
| M13b-L334 | DROP | Draft simulator's pass/fail count can't say which day failed | Opened scripts/draft.ts:466 isDayFailure exists | Already done: Struck through, fixed in 13f-4c |
| M13b-L335 | DROP | An exported simulator helper has no user or test | ROADMAP line 335 is closed (code *unverified*) | Already done: Moved to Later; dead-code nit |
| M13b-L336 | DROP | Table-analyze step lists tables by hand and misses one | ROADMAP line 336 is closed (code *unverified*) | Already done: Moved to Later; admin tooling |
| M13b-L337 | DROP | Root's same-as rule had no test | ROADMAP line 337 is closed (code *unverified*) | Already done: Struck through, tested in 13f-3b-2 |
| M13b-L338 | DROP | A data query and its row parsing have no unit test | ROADMAP line 338 is closed (code *unverified*) | Already done: Moved to Later; test nit |
| M13b-L339 | DROP | A word-list hand rule silently ignores a conflicting entry; a pick may apply after a third meaning appears | ROADMAP line 339 is closed (code *unverified*) | Already done: First part struck and fixed; second part moved to Later |
| M13b-L340 | DROP | A joined word can change its internal ID so old files break | Opened supabase/migrations/20261028140000_baseline.sql:370 private.thing_retired exists | Already done: Done in 13e-5b |
| M13b-L342 | DROP | Note: where the second-review items were found | ROADMAP line 342 is closed (code *unverified*) | Already done: Note line, closed item |
| M13b-L343 | DROP | Header: items from the 13e-5b review | ROADMAP line 343 is closed (code *unverified*) | Already done: Closed in 13f-4 |
| M13b-L344 | DROP | Draft review can list the same loop twice | ROADMAP line 344 is closed (code *unverified*) | Already done: Struck through, fixed 13f-4c |
| M13b-L345 | DROP | A merged pair stays in the tied-pairs list | ROADMAP line 345 is closed (code *unverified*) | Already done: Struck through, fixed 13f-4c |
| M13b-L346 | DROP | A retired ID could keep an old pointer | ROADMAP line 346 is closed (code *unverified*) | Already done: Struck through, fixed 13f-4b |
| M13b-L347 | DROP | When several words join one thing, the shown name is arbitrary | ROADMAP line 347 is closed (code *unverified*) | Already done: Struck through, fixed 13f-3b-1 |
| M13b-L348 | DROP | A name lookup returns repeated rows | ROADMAP line 348 is closed (code *unverified*) | Already done: Moved to Later; the caller dedupes |
| M13b-L349 | DROP | Merging things on a live database needs its own method | ROADMAP line 349 is closed (code *unverified*) | Already done: Moved to For M15 (hosted load); not a beta play issue |
| M13b-L351 | DROP | Note: where the 13e-5b items were found | ROADMAP line 351 is closed (code *unverified*) | Already done: Note line |
| M13b-L352 | DROP | Header: items from the 13e-6 review (pop culture) | ROADMAP line 352 is closed (code *unverified*) | Already done: Closed in 13f-4 |
| M13b-L353 | DROP | Shared title forms can clash between two film sets | ROADMAP line 353 is closed (code *unverified*) | Already done: Struck through, accepted |
| M13b-L354 | DROP | Two titles tied on popularity both lose a shared form | ROADMAP line 354 is closed (code *unverified*) | Already done: Struck through, accepted |
| M13b-L355 | DROP | Title forms read years and ordinals oddly | ROADMAP line 355 is closed (code *unverified*) | Already done: Moved to Later; wording nit |
| M13b-L356 | DROP | A constant repeats a type's list in the code | ROADMAP line 356 is closed (code *unverified*) | Already done: Moved to Later; code tidy |
| M13b-L357 | DROP | A drop list doesn't fail when an ID is missing | ROADMAP line 357 is closed (code *unverified*) | Already done: Struck through; strict since 13e-9b |
| M13b-L358 | DROP | A group's method text names items instead of IDs | ROADMAP line 358 is closed (code *unverified*) | Already done: Moved to Later; documentation nit |
| M13b-L359 | DROP | A flower-V question blocks one simulated day | ROADMAP line 359 is closed (code *unverified*) | Already done: Struck through, left to the swaps |
| M13b-L361 | DROP | Note: where the 13e-6 items were found | ROADMAP line 361 is closed (code *unverified*) | Already done: Note line |
| M13b-L362 | DROP | Header: items from the 13e-7 review (everyday things) | ROADMAP line 362 is closed (code *unverified*) | Already done: Closed in 13f-3b-2 |
| M13b-L363 | DROP | No test for refusing a wrong within-rule | ROADMAP line 363 is closed (code *unverified*) | Already done: Struck through, tested 13f-3b-2 |
| M13b-L364 | DROP | A within unit test modelled a case the load refuses | ROADMAP line 364 is closed (code *unverified*) | Already done: Struck through, fixed |
| M13b-L365 | DROP | The within rule can't link across data sources; berry and nut wait | ROADMAP line 365 is closed (code *unverified*) | Already done: Parent closed; berry and nut came back in 13f-2 per line 362 |
| M13b-L366 | DROP | Toy and cosmetic left out; unsavoury synonyms kept | ROADMAP line 366 is closed (code *unverified*) | Already done: Toy and cosmetic back in 13f-2; synonyms handled in 13f-1 |
| M13b-L368 | DROP | Note: where the 13e-7 items were found | ROADMAP line 368 is closed (code *unverified*) | Already done: Note line |
| M13b-L369 | DROP | Header: items from the 13f-3a review (removal on load) | ROADMAP line 369 is closed (code *unverified*) | Already done: Closed in 13f-3b-1 |
| M13b-L370 | DROP | Loop checks see facts the files dropped until the load finishes | ROADMAP line 370 is closed (code *unverified*) | Already done: Loud on reload; content-load tooling; closed |
| M13b-L371 | DROP | A lookup still finds an item that left its snapshot | ROADMAP line 371 is closed (code *unverified*) | Already done: Content-load edge; closed |
| M13b-L372 | DROP | A category named only by an older day is erased while that day could be resumed | ROADMAP line 372 is closed (code *unverified*) | Already done: Rare content-load edge; closed |
| M13b-L373 | DROP | A rename by a joining item isn't mirrored in the seen-names table | ROADMAP line 373 is closed (code *unverified*) | Already done: Line says nothing diverges today; closed |
| M13b-L374 | DROP | A load can end a host answer on an approved future day without saying | ROADMAP line 374 is closed (code *unverified*) | Already done: Admin-load edge; closed |
| M13b-L375 | DROP | Two loads at once could clash | ROADMAP line 375 is closed (code *unverified*) | Already done: Admin-only; closed |
| M13b-L376 | DROP | Database test misses one end-to-end case and locks tables | ROADMAP line 376 is closed (code *unverified*) | Already done: Test nit; closed |
| M13b-L377 | DROP | Single loads leave rows in temp tables | ROADMAP line 377 is closed (code *unverified*) | Already done: Harmless leftovers; closed |
| M13b-L378 | DROP | Note: where the 13f-3a items were found | ROADMAP line 378 is closed (code *unverified*) | Already done: Note line |
| M13b-L379 | DROP | Header: items from the 13f-3b-1 review | ROADMAP line 379 is closed (code *unverified*) | Already done: Closed in 13f-4 |
| M13b-L380 | DROP | A link and a source fact for the same edge can leave the base missing an edge | ROADMAP line 380 is closed (code *unverified*) | Already done: Struck through, fixed 13f-4b |
| M13b-L381 | DROP | A fact given again after its midnight isn't brought back for up to a day | ROADMAP line 381 is closed (code *unverified*) | Already done: Moved to For M15; human chose to leave the gap |
| M13b-L382 | DROP | A refused loop stays in the base so later loads are refused | ROADMAP line 382 is closed (code *unverified*) | Already done: Moved to For M15; loud, admin only |
| M13b-L383 | DROP | The touched list misses ancestor changes | ROADMAP line 383 is closed (code *unverified*) | Already done: Struck through, fixed 13f-4b |
| M13b-L384 | DROP | The shown-name mirror miscounts a merge as a rename | ROADMAP line 384 is closed (code *unverified*) | Already done: Moved to Later |
| M13b-L385 | DROP | A single load isn't refused while a full load holds the lock | ROADMAP line 385 is closed (code *unverified*) | Already done: Moved to For M15; breaks nothing |
| M13b-L386 | DROP | A load releases its lock before its last insert | ROADMAP line 386 is closed (code *unverified*) | Already done: Struck through, fixed 13f-4b |
| M13b-L387 | DROP | Session lock needs a session-mode connection for the hosted database | ROADMAP line 387 is closed (code *unverified*) | Already done: Moved to For M15 |
| M13b-L388 | DROP | A db test takes a connection end as the lock release; run-status read scales | ROADMAP line 388 is closed (code *unverified*) | Already done: Moved to Later and For M15 |
| M13b-L389 | DROP | A shown-name step scans the whole batch per joined item (slow reload) | ROADMAP line 389 is closed (code *unverified*) | Already done: Moved to Later; speed of admin loads |
| M13b-L390 | DROP | Note: where the 13f-3b-1 items were found | ROADMAP line 390 is closed (code *unverified*) | Already done: Note line |
| M13b-L391 | DROP | Header: items from the 13f-3b-2 review | ROADMAP line 391 is closed (code *unverified*) | Already done: Closed in 13f-4 |
| M13b-L392 | DROP | A test's cleanup pattern could delete a real key | ROADMAP line 392 is closed (code *unverified*) | Already done: Struck through, fixed 13f-4c |
| M13b-L393 | DROP | A test helper's delete relies on key order | ROADMAP line 393 is closed (code *unverified*) | Already done: Struck through, fixed |
| M13b-L394 | DROP | A comment sits above the wrong function | ROADMAP line 394 is closed (code *unverified*) | Already done: Struck through, fixed |
| M13b-L395 | DROP | Review dies for a category the database holds but the file does not | ROADMAP line 395 is closed (code *unverified*) | Already done: Struck through, fixed |
| M13b-L396 | DROP | A count covers the whole set rather than the root's tree | ROADMAP line 396 is closed (code *unverified*) | Already done: Moved to Later; 0 today |
| M13b-L397 | DROP | The data-source client mistakes some replies for a timeout | ROADMAP line 397 is closed (code *unverified*) | Already done: Struck through, fixed |
| M13b-L398 | DROP | A mistyped-names refusal and the loop order lacked tests | ROADMAP line 398 is closed (code *unverified*) | Already done: Struck through, tested or run |
| M13b-L399 | DROP | Running db tests beside e2e on one local stack breaks e2e | ROADMAP line 399 is closed (code *unverified*) | Already done: Closed; note kept in HANDOFF; CI runs them apart |
| M13b-L400 | DROP | Note: where the 13f-3b-2 items were found | ROADMAP line 400 is closed (code *unverified*) | Already done: Note line |
| M13b-L401 | DROP | Header: items from the 13f-4b review | ROADMAP line 401 is closed (code *unverified*) | Already done: Closed in 13f-4c |
| M13b-L402 | DROP | The touched list is noisy when a high ancestor ends | ROADMAP line 402 is closed (code *unverified*) | Already done: Moved to Later; wording of an admin notice |
| M13b-L403 | DROP | A link bringing back a row leaves the first origin, unread today | ROADMAP line 403 is closed (code *unverified*) | Already done: Moved to Later; nothing reads it |
| M13b-L404 | DROP | Two filters match bare IDs for every source | ROADMAP line 404 is closed (code *unverified*) | Already done: Moved to Later; no clash today |
| M13b-L405 | DROP | A test's import line lost a semicolon | ROADMAP line 405 is closed (code *unverified*) | Already done: Struck through, mistaken |
| M13b-L406 | DROP | The unlock's new place has no fault-injection test | ROADMAP line 406 is closed (code *unverified*) | Already done: Moved to Later; test nit |
| M13b-L407 | DROP | Note: where the 13f-4b items were found | ROADMAP line 407 is closed (code *unverified*) | Already done: Note line |
| M13b-L408 | DROP | Header: items from the 13f-2 review (category polish) | ROADMAP line 408 is closed (code *unverified*) | Already done: Closed in 13f-4 |
| M13b-L409 | DROP | A drop-from-set typo drops nothing silently | ROADMAP line 409 is closed (code *unverified*) | Already done: Struck through, refused in 13f-3b-2 |
| M13b-L410 | DROP | A single set load can't judge hand-name rows | ROADMAP line 410 is closed (code *unverified*) | Already done: Struck through, fixed |
| M13b-L411 | DROP | Removals take effect only after a database reset | ROADMAP line 411 is closed (code *unverified*) | Already done: Struck through, fixed 13f-3a |
| M13b-L412 | DROP | A few members fit their prompts poorly | ROADMAP line 412 is closed (code *unverified*) | Already done: Struck through, accepted by the human |
| M13b-L413 | DROP | Australia loses the informal 'oz' | ROADMAP line 413 is closed (code *unverified*) | Already done: Struck through, accepted |
| M13b-L414 | DROP | The countries file is re-read for every set | ROADMAP line 414 is closed (code *unverified*) | Already done: Struck through, fixed |
| M13b-L415 | DROP | Note: where the 13f-2 items were found | ROADMAP line 415 is closed (code *unverified*) | Already done: Note line |
| M13b-L416 | DROP | Header: items from the 13f-1 review (player scoring) | ROADMAP line 416 is closed (code *unverified*) | Already done: Closed in 13f-4 |
| M13b-L417 | DROP | A load without reset keeps old aliases | ROADMAP line 417 is closed (code *unverified*) | Already done: Struck through, fixed 13f-3a |
| M13b-L418 | DROP | Player-added aliases written before the accent fold keep old characters | ROADMAP line 418 is closed (code *unverified*) | Already done: Moved to For M15; no hosted player data yet |
| M13b-L419 | DROP | A code comment still names an unreachable letter | ROADMAP line 419 is closed (code *unverified*) | Already done: Moved to Later; comment nit |
| M13b-L420 | DROP | About 1,000 live names hold odd characters; 31 things have no plain name | ROADMAP line 420 is closed (code *unverified*) | Already done: Struck through, accepted |
| M13b-L421 | DROP | Player-added names keep punctuation | ROADMAP line 421 is closed (code *unverified*) | Already done: Struck through, done 13f-4b |
| M13b-L422 | DROP | Note: where the 13f-1 items were found | ROADMAP line 422 is closed (code *unverified*) | Already done: Note line |
| M13b-L423 | DROP | Header: items from the 13e-11 review (revived categories) | ROADMAP line 423 is closed (code *unverified*) | Already done: Closed in 13f-2 |
| M13b-L424 | DROP | One-member overlaps between categories unmarked | ROADMAP line 424 is closed (code *unverified*) | Already done: Accepted by the human in 13f-2 |
| M13b-L425 | DROP | Hat and clothing share 34 members | ROADMAP line 425 is closed (code *unverified*) | Already done: Accepted by the human |
| M13b-L426 | DROP | Weaker host answers for 'familiar' in a few categories | ROADMAP line 426 is closed (code *unverified*) | Already done: Left to the swaps (accepted) |
| M13b-L427 | DROP | A question reads awkwardly and one ID mismatches its name | ROADMAP line 427 is closed (code *unverified*) | Already done: Kept as cosmetic |
| M13b-L428 | DROP | Two borderline words listed for the human | ROADMAP line 428 is closed (code *unverified*) | Already done: Decided in 13f-2 |
| M13b-L429 | DROP | Some lists swap out most late in the month | ROADMAP line 429 is closed (code *unverified*) | Already done: Simulator observation; closed |
| M13b-L430 | DROP | Note: where the 13e-11 items were found | ROADMAP line 430 is closed (code *unverified*) | Already done: Note line |
| M13b-L431 | DROP | Header: items from the 13e-10b review (swaps) | ROADMAP line 431 is closed (code *unverified*) | Already done: Closed in 13f-4 |
| M13b-L432 | DROP | Each swap round re-measures all questions (speed) | ROADMAP line 432 is closed (code *unverified*) | Already done: Struck through, fixed 13f-4a |
| M13b-L433 | DROP | A swap error doesn't say which swaps came before | ROADMAP line 433 is closed (code *unverified*) | Already done: Struck through, fixed 13f-3b-2 |
| M13b-L434 | DROP | A few thin lists (alloy, lawyer, beer, liquor) block question 7 | ROADMAP line 434 is closed (code *unverified*) | Already done: Moved to Later, a content batch |
| M13b-L435 | DROP | Note: where the 13e-10b items were found | ROADMAP line 435 is closed (code *unverified*) | Already done: Note line |
| M13b-L436 | DROP | Header: items from the 13e-10 review | ROADMAP line 436 is closed (code *unverified*) | Already done: Closed in 13f-4 |
| M13b-L437 | DROP | Slang aliases of kept members; one bare 'mistress' | ROADMAP line 437 is closed (code *unverified*) | Already done: Struck through, done |
| M13b-L438 | DROP | A greeting-card host answer doesn't clearly answer its prompt | ROADMAP line 438 is closed (code *unverified*) | Already done: Struck through, accepted |
| M13b-L439 | DROP | Several members wider than their prompts | ROADMAP line 439 is closed (code *unverified*) | Already done: Struck through, accepted |
| M13b-L440 | DROP | Mardi Gras counted as two things; shared herpes names | ROADMAP line 440 is closed (code *unverified*) | Already done: Struck through, accepted |
| M13b-L441 | DROP | 'Wolf' missing from a host bank | ROADMAP line 441 is closed (code *unverified*) | Already done: Struck through, left to the swaps |
| M13b-L442 | DROP | Check-bank and draft repeat a rule; a comment too wide | Opened scripts/draft.ts:245 shownOffLetter | Already done: Struck through; one helper at scripts/draft.ts:245 |
| M13b-L443 | DROP | Note: where the 13e-10 items were found | ROADMAP line 443 is closed (code *unverified*) | Already done: Note line |
| M13b-L444 | DROP | Header: items from the 13e-9b review (word list) | ROADMAP line 444 is closed (code *unverified*) | Already done: Closed in 13f-4 |
| M13b-L445 | DROP | A rename or drop row that matches nothing says nothing | ROADMAP line 445 is closed (code *unverified*) | Already done: Struck through, fixed 13f-4c |
| M13b-L446 | DROP | Rows keyed by item ID after merges can miss merged doubles | ROADMAP line 446 is closed (code *unverified*) | Already done: Moved to Later; not reachable today |
| M13b-L447 | DROP | A WordNet item's shown name comes from raw data | ROADMAP line 447 is closed (code *unverified*) | Already done: Moved to Later; none today |
| M13b-L448 | DROP | The rename error prints the hand file's new name | ROADMAP line 448 is closed (code *unverified*) | Already done: Moved to Later; admin text |
| M13b-L449 | DROP | A ref check repeats a type's prefix list | ROADMAP line 449 is closed (code *unverified*) | Already done: Struck through, fixed 13f-4c |
| M13b-L450 | DROP | Note: where the 13e-9b items were found | ROADMAP line 450 is closed (code *unverified*) | Already done: Note line |
| M13b-L451 | DROP | Header: items from the 13e-9 review | ROADMAP line 451 is closed (code *unverified*) | Already done: Closed in 13f-3b-2 |
| M13b-L452 | DROP | No test for check-bank on a retired ID | ROADMAP line 452 is closed (code *unverified*) | Already done: Struck through, tested |
| M13b-L453 | DROP | Members that don't fit their prompts (road, coffee, garden, bed) | ROADMAP line 453 is closed (code *unverified*) | Already done: Accepted in 13f-2 |
| M13b-L454 | DROP | The M13 row's category count is stale | ROADMAP line 454 is closed (code *unverified*) | Already done: Struck through, fixed |
| M13b-L455 | DROP | Note: where the 13e-9 items were found | ROADMAP line 455 is closed (code *unverified*) | Already done: Note line |
| M13b-L456 | DROP | Header: items from the 13e-8 review | ROADMAP line 456 is closed (code *unverified*) | Already done: Closed in 13f-2 |
| M13b-L457 | DROP | Disease category accepted a slur | ROADMAP line 457 is closed (code *unverified*) | Already done: Struck through, done 13e-9b |
| M13b-L458 | DROP | Two answers of one question can name the same thing | ROADMAP line 458 is closed (code *unverified*) | Already done: Check-bank refuses it since 13e-9 per the header |
| M13b-L459 | DROP | Some answers show WordNet's first word | ROADMAP line 459 is closed (code *unverified*) | Already done: Struck through, renamed 13f-1 |
| M13b-L460 | DROP | 'Name a bone' accepts 'molar' | ROADMAP line 460 is closed (code *unverified*) | Already done: Accepted by the human in 13f-2 |
| M13b-L461 | DROP | Some categories left out for the human | ROADMAP line 461 is closed (code *unverified*) | Already done: Decided in 13e-11 and 13f-2; one moved to Later |
| M13b-L463 | DROP | Note: where the 13e-8 items were found | ROADMAP line 463 is closed (code *unverified*) | Already done: Note line |
| M13b-L464 | DROP | env.ts has two spellings of one local-host check | Opened src/config/env.ts:61 and :98 both use LOCAL_HOSTS (confirmed, harmless) | Already done: Moved to Later; same behaviour |
| M13b-L465 | DROP | Counting a miss scans every answer of the category's days | ROADMAP line 465 is closed (code *unverified*) | Already done: Moved to For M15 load test; fine for a small beta |
| M13b-L466 | DROP | Error code OB009 reused for two meanings | Opened baseline.sql:2544 (puzzle_invalid) and :2577 (group_full) both OB009 (confirmed) | Already done: Moved to Later; each call site maps its own |
| M13b-L467 | DROP | Header: human curation of fruit, country codes, ununnilium | ROADMAP line 467 is closed (code *unverified*) | Already done: Closed in 13f-2 |
| M13b-L468 | DROP | Protected-origin products appear in fruit | ROADMAP line 468 is closed (code *unverified*) | Already done: Kept by the human in 13f-2 |
| M13b-L469 | DROP | Country codes appear as aliases | ROADMAP line 469 is closed (code *unverified*) | Already done: Done in 13f-2 |
| M13b-L470 | DROP | 'Ununnilium' alias on two elements | ROADMAP line 470 is closed (code *unverified*) | Already done: Done in 13f-2 |
| M13b-L472 | DROP | Note: where the import items were found | ROADMAP line 472 is closed (code *unverified*) | Already done: Note line |
| M13b-L473 | DROP | Survey found 14 of 21 questions caught nobody | ROADMAP line 473 is closed (code *unverified*) | Already done: Set aside by the human; survey scoring retired |
| M13b-L474 | DROP | Confirm the medium tier's stolen letters | ROADMAP line 474 is closed (code *unverified*) | Already done: Confirmed by the human 2026-10-27 |
| M13b-L475 | DROP | A host bank size guideline needs a human number | ROADMAP line 475 is closed (code *unverified*) | Already done: Answered: 6 |
| M13b-L476 | DROP | Changing a host answer with a match group gives an unfixable rule error | ROADMAP line 476 is closed (code *unverified*) | Already done: Closed not built; match groups retired in format 3 |
| M13b-L478 | DROP | Admin puzzles page shows a raw ID when a name is missing | Opened src/app/admin/puzzles/puzzles.tsx:292,373 shows 'not loaded: id' (confirmed) | Already done: Closed in 13f-3b-2 |

### Part: s4-m14-a

#### S4 ROADMAP lines 481-602 (first half of For M14) - sort for closed beta

Counts: MUST-FIX 0, LATER 59, DROP 59, HUMAN 4 (total 122). Checked against RIFF-audit-2026-11-11 by grep and spot reads; no code executed.

MUST-FIX rows: none. Nothing in this section blocks play, loses data, shows a wrong score, leaks data or breaks a deploy; open items are tests, polish, admin-only edges or accessibility refinements.

| ID | Bucket | What it means | Evidence | Reason |
|---|---|---|---|---|
| M14a-L481 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:481 is a ticked box | already done (ticked) |
| M14a-L482 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:482 is a ticked box | already done (ticked) |
| M14a-L483 | LATER | If refreshing a streak fails after Start, the error message stays showing as you move between pages. | src/app/home.tsx:130,239 streakError state and its alert still there | Cosmetic, only after a failed reload |
| M14a-L484 | LATER | No automated check that the friends column stays hidden on admin, play and invite pages. | src/app/home.tsx:78,240 feedBeside still present; e2e not searched (*unverified*) | Test gap only |
| M14a-L485 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:485 is a ticked box | already done (ticked) |
| M14a-L486 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:486 is a ticked box | already done (ticked) |
| M14a-L487 | LATER | On the admin audit page, Dismiss acts on one click with only a note saying it is final. | src/app/admin/audit/audit.tsx:93 note, :231 Dismiss button still one click | Admin-only rough edge |
| M14a-L488 | LATER | Admin audit buttons show no working state and a handled row just disappears. | audit.tsx:32,45-55 page-wide busy flag, disabled={busy} on every button | Admin-only rough edge |
| M14a-L489 | LATER | Admin question bank shows category names like dog_breed with an underscore. | src/app/admin/bank/bank.tsx:61 prints q.category raw | Admin-only wording |
| M14a-L490 | LATER | Admin pages do not explain some terms, and an empty insights chart repeats 'Too few players' seven times. | src/app/admin/insights.tsx:175 message still there; term explanations not checked (*unverified*) | Admin-only wording |
| M14a-L491 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:491 is a ticked box | already done (ticked) |
| M14a-L492 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:492 is a ticked box | already done (ticked) |
| M14a-L493 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:493 is a ticked box | already done (ticked) |
| M14a-L494 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:494 is a ticked box | already done (ticked) |
| M14a-L495 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:495 is a ticked box | already done (ticked) |
| M14a-L496 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:496 is a ticked box | already done (ticked) |
| M14a-L497 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:497 is a ticked box | already done (ticked) |
| M14a-L498 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:498 is a ticked box | already done (ticked) |
| M14a-L499 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:499 is a ticked box | already done (ticked) |
| M14a-L500 | LATER | A test does not prove the comment waits the full 5 seconds before sending. | src/lib/hold.test.ts not opened (*unverified*) | Test nit; timer has a unit test |
| M14a-L501 | LATER | A live-board test no longer proves the daily reset happens during play. | e2e/live-board.e2e.ts:345 test exists | Test strength only |
| M14a-L502 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:502 is a ticked box | already done (ticked) |
| M14a-L503 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:503 is a ticked box | already done (ticked) |
| M14a-L504 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:504 is a ticked box | already done (ticked) |
| M14a-L505 | LATER | A test compares the countdown size with whichever heading comes first rather than the question itself. | e2e/feel.e2e.ts not matched to the exact line (*unverified*) | Test nit |
| M14a-L506 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:506 is a ticked box | already done (ticked) |
| M14a-L507 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:507 is a ticked box | already done (ticked) |
| M14a-L508 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:508 is a ticked box | already done (ticked) |
| M14a-L509 | LATER | A test may read page transitions slightly too early. | e2e/feel.e2e.ts not re-read (*unverified*) | Test timing nit; main check still covers it |
| M14a-L510 | LATER | An admin test assumes tomorrow has no puzzle approved, without checking. | e2e/admin-area.e2e.ts exists; assumption not re-read (*unverified*) | Test fragility only |
| M14a-L511 | HUMAN | The admin warning row for an empty tomorrow has a red top line as well as red text; keep it or not is the human's call. | src/app/admin/admin.module.css not opened (*unverified*); item says human's call | Product choice, admin-only |
| M14a-L512 | LATER | The admin tomorrow-warning code has no test for an empty list of days. | src/admin/tomorrow.ts and tomorrow.test.ts exist; case not read (*unverified*) | Test gap, admin-only |
| M14a-L513 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:513 is a ticked box | already done (ticked) |
| M14a-L514 | LATER | A look-and-feel test leaves browser windows open and skips some checks. | e2e/look.e2e.ts exists; contents not re-read (*unverified*) | Test nit |
| M14a-L515 | LATER | The phone Today invite card asks the server for the friends list twice. | src/app/invite-link.tsx:31 fetches itself; board.tsx fetch not confirmed (*unverified*) | Wasted request, no wrong result |
| M14a-L516 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:516 is a ticked box | already done (ticked) |
| M14a-L517 | LATER | The Play button's edge against the navy banner is low contrast in the Paper theme (label is readable). | src/app/game.module.css not opened (*unverified*) | Likely meets the standard; polish |
| M14a-L518 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:518 is a ticked box | already done (ticked) |
| M14a-L519 | LATER | A look test does not cover the settings sheet's special styling. | e2e/look.e2e.ts not re-read (*unverified*) | Test gap |
| M14a-L520 | LATER | If an e2e run is cut short, a leftover test puzzle blocks the database tests until deleted by hand. | e2e/puzzle.ts exists, behaviour not run (*unverified*) | Developer tooling only |
| M14a-L521 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:521 is a ticked box | already done (ticked) |
| M14a-L522 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:522 is a ticked box | already done (ticked) |
| M14a-L523 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:523 is a ticked box | already done (ticked) |
| M14a-L524 | LATER | No test covers the admin Reports rows beyond one flow. | e2e/live-board.e2e.ts exists; no reports e2e file in the e2e listing | Admin test gap |
| M14a-L525 | LATER | One look test failed once in a full run and passed alone. | e2e/look.e2e.ts exists; flake not reproduced (*unverified*) | Flaky test, not a product bug |
| M14a-L526 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:526 is a ticked box | already done (ticked) |
| M14a-L527 | LATER | On the Windows PC one settings test fails because the Me page takes about 6.5 seconds to open locally. | Not run (another session uses the stack); item says CI passes (*unverified*) | Local Windows only; CI passes; a slow Me page is worth a glance after beta start |
| M14a-L528 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:528 is a ticked box | already done (ticked) |
| M14a-L529 | LATER | Some small controls (reaction chips, admin sub-tabs) are still shorter than the 44px tap size. | Item says buttons were fixed; remainder not measured (*unverified*) | Above the 24px minimum; polish |
| M14a-L530 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:530 is a ticked box | already done (ticked) |
| M14a-L531 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:531 is a ticked box | already done (ticked) |
| M14a-L532 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:532 is a ticked box | already done (ticked) |
| M14a-L533 | LATER | A new streak rank pop-up shows only once per page and no test covers it. | src/app/shown.ts:82 useNew exists | Cosmetic |
| M14a-L534 | DROP | The reduced-motion block repeats one button shadow value that could drift. | src/app/globals.css:492 repeats 0 4px 0, same as :397 | Nit nobody will act on |
| M14a-L535 | DROP | Style file has three small blocks with a stray blank line. | src/app/shell.module.css not opened | Formatting nit |
| M14a-L536 | LATER | A test does not check hover on phones, reduced-motion rows or icon masks. | e2e/alive.e2e.ts exists; not re-read (*unverified*) | Test gap |
| M14a-L537 | LATER | The streak pill is shown twice and both share the same storage keys. | not opened (*unverified*); item says they agree today | Works today |
| M14a-L538 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:538 is a ticked box | already done (ticked) |
| M14a-L539 | LATER | An admin text box height could grow from 40 to 48px if style loading order changed. | src/app/admin/admin.module.css not opened (*unverified*) | Hypothetical; fine today |
| M14a-L540 | LATER | In the admin insights chart a bar can poke about 1.7px above the plot in rare cases. | src/app/admin/insights.tsx:115 uses rounded highest, bars raw | Admin-only, tiny |
| M14a-L541 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:541 is a ticked box | already done (ticked) |
| M14a-L542 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:542 is a ticked box | already done (ticked) |
| M14a-L543 | LATER | A test for the admin phone menu closing when focus leaves is missing. | e2e/admin-area.e2e.ts exists; not re-read (*unverified*) | Test gap |
| M14a-L544 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:544 is a ticked box | already done (ticked) |
| M14a-L545 | LATER | The 44px size sweep test does not reach Delete and Report behind the three-dot menu. | e2e/calm.e2e.ts, reactions-menu.e2e.ts exist; not re-read (*unverified*) | Test gap |
| M14a-L546 | DROP | A ticket names a helper file differently from what was built. | src/app/dismiss.ts exists (the built name) | Doc nit |
| M14a-L547 | DROP | Some small spacing numbers have no recorded origin. | src/app/reactions.tsx:132 Dots exists; values not traced | Nit about records, not behaviour |
| M14a-L548 | LATER | Unchecked: whether an open reactions popover sits over the next row while it animates in. | *unverified* | Brief cosmetic |
| M14a-L549 | HUMAN | On the leaderboard graph, very long tied names at phone width could make the plot columns run backwards; a minimum width needs a number from the human. | src/app/race-layout.ts:84-85 room = width - gap - widest label, no floor | Needs a decision; theoretical (two 10-character tied names on a 320px phone) |
| M14a-L550 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:550 is a ticked box | already done (ticked) |
| M14a-L551 | DROP | Some spacing values in the leaderboard graph styling are not in the ticket's number table. | src/app/race.module.css not opened | Records nit |
| M14a-L552 | LATER | The graph's test covers only the friends board, not the group board. | e2e/leaderboard-graph.e2e.ts exists; not re-read (*unverified*) | Test gap; same component |
| M14a-L553 | LATER | The Monday note on the leaderboard is tested only when the suite runs on a Monday. | not opened (*unverified*) | Test timing nit |
| M14a-L554 | DROP | Old comments still say 'tile' after the stats cells were renamed. | not opened (*unverified*) | Comment wording nit |
| M14a-L555 | LATER | A look test hard-codes the Paper theme's text colour and repeats a helper. | e2e/look.e2e.ts not re-read (*unverified*) | Test nit |
| M14a-L556 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:556 is a ticked box | already done (ticked) |
| M14a-L557 | DROP | Two components are both named Shell. | src/app/shell.tsx exists; shell-page.tsx not opened | Naming nit |
| M14a-L558 | LATER | The 404 test does not check there is exactly one card, and the 404 code is checked only on the dev server. | src/app/not-found.tsx exists; e2e/not-found.e2e.ts not re-read (*unverified*) | Test gap; check the production 404 once with the deploy |
| M14a-L559 | LATER | A global word-breaking rule may split words mid-word in squeezed spots. | src/app/globals.css not re-grepped for overflow-wrap (*unverified*) | Cosmetic |
| M14a-L560 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:560 is a ticked box | already done (ticked) |
| M14a-L561 | LATER | The leaderboard graph reads its text size as root size times 0.75, a copy of a style value. | src/app/race.tsx not opened (*unverified*) | Could drift; no effect today |
| M14a-L562 | LATER | Nothing stops a pixel-sized font from coming back into the styles. | e2e/text-size.e2e.ts exists; no static check found | Guard-rail wish |
| M14a-L563 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:563 is a ticked box | already done (ticked) |
| M14a-L564 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:564 is a ticked box | already done (ticked) |
| M14a-L565 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:565 is a ticked box | already done (ticked) |
| M14a-L566 | LATER | One keyboard-focus e2e timed out once in a local run and passed alone. | e2e/shell.e2e.ts exists; flake not reproduced (*unverified*) | Flaky test |
| M14a-L567 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:567 is a ticked box | already done (ticked) |
| M14a-L568 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:568 is a ticked box | already done (ticked) |
| M14a-L569 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:569 is a ticked box | already done (ticked) |
| M14a-L570 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:570 is a ticked box | already done (ticked) |
| M14a-L571 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:571 is a ticked box | already done (ticked) |
| M14a-L572 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:572 is a ticked box | already done (ticked) |
| M14a-L573 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:573 is a ticked box | already done (ticked) |
| M14a-L574 | LATER | A test checks the earlier day the feed shows but not a typed comment draft surviving Start. | e2e/controls-and-state.e2e.ts exists (*unverified*) | Test gap; behaviour built |
| M14a-L575 | LATER | A board-row test passes even if the points line wraps beside the name. | e2e/controls-and-state.e2e.ts (*unverified*) | Test weakness |
| M14a-L576 | LATER | A Me page test counts reads, not that totals changed after a time-up. | e2e/me.e2e.ts not re-read (*unverified*) | Test gap; the settle question is unchecked |
| M14a-L577 | HUMAN | At large browser zoom a long name on a board row is still cut, and ' (you)' goes first; the human decides if that is acceptable. | src/app/leaderboard.module.css not opened; item says human's call | Product choice |
| M14a-L578 | LATER | A 'going to play' flag can stay set after an odd navigation, so the next game screen first shows a loading skeleton. | src/app/to-play.ts:6-15 module-level toPlay flag | Cosmetic, item says so |
| M14a-L579 | LATER | A computer asleep through midnight reads the streak late by about the sleep length. | src/app/home.tsx:152 setTimeout(reloadStreak, resetAt - Date.now()) | Rare; fixes on next reload |
| M14a-L580 | LATER | A look test missed a date chip in a run that crossed midnight. | e2e/look.e2e.ts (*unverified*) | Flaky test |
| M14a-L581 | LATER | Several screen-reader tests read focus once and could flake. | e2e/screen-readers.e2e.ts exists; lines not re-read (*unverified*) | Test flake risk |
| M14a-L582 | LATER | One screen-reader test (failed send alert) fails on CI in some runs, passes locally. | e2e/screen-readers.e2e.ts:96 per item; not run (*unverified*) | CI flake; cause unknown |
| M14a-L583 | DROP | Item is ticked and marked fixed or answered in the roadmap. | ROADMAP.md:583 is a ticked box | already done (ticked) |
| M14a-L584 | LATER | A control reached by Shift+Tab can end up hidden under the top bar on phones. | src/app/globals.css:259 only main [id] has scroll-margin-top; :203 is bottom padding only | Keyboard accessibility polish |
| M14a-L585 | DROP | The M14 parent ticket does not mention sub-tickets 14c-5 and 14c-6. | docs/milestones/M14-look-and-feel.md not opened (*unverified*) | Doc nit |
| M14a-L586 | LATER | A screen reader may announce how a run ended twice. | src/app/recap.tsx not opened (*unverified*) | Minor accessibility; item itself unverified |
| M14a-L587 | LATER | If pressing Next fails, keyboard focus is lost to the page. | src/app/game.tsx:594 Reveal with busy prop (blur not traced) | Accessibility polish after a rare error |
| M14a-L588 | LATER | If the run fails to load on entering play, the screen shows a bare error and focus is lost. | src/app/game.tsx Run not traced (*unverified*) | Rare error path; a refresh recovers |
| M14a-L589 | HUMAN | Whether real screen readers (NVDA, VoiceOver) announce the play frame's status messages correctly can only be checked by a person. | src/app/play-frame.tsx:47 empty role=status region exists | Needs a real device |
| M14a-L590 | LATER | Two game-code functions return values nobody reads and one throws where it once reloaded. | src/app/game.tsx:160-162,195 still present | Code tidiness; check the throw path once |
| M14a-L591 | LATER | How to play can be opened mid-question while the 20 seconds keep running. | src/app/play-frame.tsx not opened (*unverified*) | Design choice; low harm |
| M14a-L592 | LATER | The recap shows no points for a caught answer, and a safe seventh answer never shows its rarity word. | src/app/game.tsx recap rows not opened (*unverified*) | Matches earlier behaviour; not a wrong score |
| M14a-L593 | LATER | The local full e2e run on the Windows PC fails a different handful of tests each time; part is game 2's village steps, which go with 14c-9. | e2e/brew.e2e.ts still exists in the checkout; flake not run | Tooling; village share vanishes with 14c-9; CI is the gate |
| M14a-L594 | LATER | A test run left via browser Back and reopened can resume its old moves. | src/app/game.tsx:243 moves state kept (:302 comment about this) | Edge case, test mode only |
| M14a-L595 | LATER | Screen readers are not told when Next fills in a new prompt. | not traced (*unverified*) | Accessibility polish |
| M14a-L596 | LATER | A how-to-play test passes even if focus never moves. | e2e/how-to-play.e2e.ts exists (*unverified*) | Test weakness |
| M14a-L597 | DROP | A shell test loops over a single path. | e2e/shell.e2e.ts:376 loops over only /streak | Style-only nit |
| M14a-L598 | DROP | A past process slip: 14c-6d was built while another PR was open. | process note, nothing in code | Nothing to act on |
| M14a-L599 | LATER | Local e2e can silently test another checkout's server running on port 3000. | playwright.config.ts:25 reuseExistingServer: !process.env.CI | Developer tooling; CI unaffected |
| M14a-L600 | LATER | Two local tests that play full runs can pass the 30 second limit on the Windows PC. | e2e/reactions-menu.e2e.ts:52 has test.slow(); e2e/today.e2e.ts had no test.slow() in a grep | Local-only timing; CI passes |
| M14a-L601 | DROP | A dev-server-only warning about an unused stylesheet; the festival check that tripped on it is gone. | not run; item says festival check removed | Dev only, no player effect |
| M14a-L602 | LATER | Two tests can fail under full local load (play2 lockout timing and a group-page compile). | e2e/play2.e2e.ts:45-60 whole-day test with village comment; e2e/shell.e2e.ts:379-385 Create group | Test timing; the play2 test is being rewritten by 14c-9 |

### Part: s5-m14-b

#### S5 M14-b backlog sort (ROADMAP.md lines 601-713)

Counts: MUST-FIX 0, LATER 31, DROP 80, HUMAN 1 (total 112)

MUST-FIX rows: none. Checked against the clean origin/main worktree; nothing in this half would block play, lose data, show a wrong result or leak privately for a friend in a closed beta.

| ID | Bucket | What it is | Evidence | Reason |
|---|---|---|---|---|
| M14-L603 | HUMAN | The 'share your result' text still uses placeholder green and white squares. | src/game/share.ts:8-9 SURVIVED=green square, NOT_SURVIVED=white square with 'Placeholders until the look is settled'. | Choosing the real symbols is a design choice; works fine for friends meanwhile. |
| M14-L602 | LATER | Two automated checks fail only when the computer is busy; one of them now fakes the 'too quick' reply. | e2e/play2.e2e.ts:74-82 stubs the lockout reply (first half fixed); e2e/shell.e2e.ts:386-387 Create group still waits on the default 5 s wait (no timeout set). | Test-reliability only; CI's fresh stack is the check. |
| M14-L631 | LATER | One automated check (the clock bar's time-up) failed a few times out of many runs and nobody found why. | e2e/shell.e2e.ts:247 still uses clock.fastForward('00:21'); flake not rerun (not allowed). | Intermittent test flake; no player-visible harm shown. |
| M14-L632 | LATER | One automated account-settings check timed out once on CI and never again. | *unverified* (not rerun); ROADMAP records 20 of 20 passes since. | Single unreproduced flake. |
| M14-L663 | LATER | If the live-update connection fails after it was half set up, the dead connection is never closed. | src/app/board-channel.ts:123-128 catch calls failed() and clears shared, no client.disconnect(); close() at :130 only runs from the last listener leaving. | Small leak after a rare failure; the page still shows an error and Try again. |
| M14-L664 | LATER | A 'could not refresh login' warning on the live board can stay until the next reconnect. | src/app/board-channel.ts:75-80 token() sets failed(err,false); only the SUBSCRIBED branch (:111) calls setFailure(null). | Cosmetic stale alert on a rare token-fetch failure. |
| M14-L665 | LATER | On wide screens the 'live updates paused' message and Try again can appear twice. | LiveStatus rendered in src/app/board.tsx:123, offbeat.tsx:78, home.tsx:534 and :580; two can mount at once from 1200px. | Duplicated message only when the channel fails. |
| M14-L669 | LATER | A reset-timer fix has no test of its own and the page-room check skips tablet width. | src/app/home.tsx and groups.tsx still use the {ms} form (grep); no dedicated test found. | Test gap on an already-fixed bug. |
| M14-L675 | LATER | Two helper functions can be given the day or work it out themselves. | src/game/streak.ts:10 and ledger.ts:20 take day=null and fall back to private.today(). | Tidiness only; the main caller (me.ts:29-32) already passes the day. |
| M14-L676 | LATER | Two profile numbers read in separate steps could disagree by one if a question times out between them. | src/game/me.ts:29-32 reads the day once, but readStats still runs separate statements. | Needs millisecond timing and is off by one at worst. |
| M14-L678 | LATER | On the admin Puzzles page a ticked chip can hide again on 'Show fewer', and '+N more' does not mention it. | src/app/admin/puzzles/puzzles.tsx:278-337 chips keep drawn order; 'Show fewer' toggles all. | Admin-only rough edge; choice still saves. |
| M14-L680 | LATER | On very old browsers the admin phone tables may lose their column labels. | src/app/admin/admin.module.css:290 content: attr(data-label) with an alt-text slash; which engines lack it *unverified*. | Admin-only, hypothetical. |
| M14-L681 | LATER | The admin bank's three status labels have no page-level test. | *unverified* (no test run); src/app/admin/bank exists. | Test gap on admin text. |
| M14-L682 | LATER | The bank's themes table has no header, so its stacked phone cells have no labels. | src/app/admin/bank/*.tsx maps q.themes (:63-65); header presence not confirmed. | Admin-only accessibility rough edge. |
| M14-L683 | LATER | The phone admin menu closes on any Escape press, even one meant for a dialog. | src/app/dismiss.ts:14 document-level Escape handler. | Admin-only, trivial. |
| M14-L685 | LATER | The check that stops two test files sharing a player name misses names built at run time. | e2e/players.test.ts:10 NAME regex matches literals only; its own comment says run-time names are left out. | Test-suite gap; no player impact. |
| M14-L690 | LATER | Some old and new invite-link forms are not exercised by the end-to-end tests. | *unverified* (did not search every e2e file for /g/ and /groups/join). | Test coverage gap. |
| M14-L691 | LATER | Applying a database change to the shared local database is done by hand each time. | scripts/ has no migration-apply script (ls scripts). | Developer tooling; does not affect plor.app players. |
| M14-L692 | LATER | The sidebar tabs check failed once in a full run and passed 5 of 5 alone. | e2e/shell.e2e.ts:137 test still present; flake not rerun. | Single unreproduced test flake. |
| M14-L693 | LATER | In an admin test run, an answer and the time-up can cross and show the wrong screen. | src/app/game.tsx:192, :288, :405 TestGame sends timeUp and answer as separate requests. | Admin test runs only; nothing is saved. |
| M14-L696 | LATER | An admin test run of a draft for an already-played day can show that day's real shares. | src/game/runs.ts:406 dayCounts used for a finished status; whether the page offers it *unverified*. | Admin-only; no player sees it. |
| M14-L697 | LATER | A database function that only reads is not marked read-only, so a future write there would be refused. | supabase/migrations/20261030054018_test_runs.sql:68-69 no 'stable'. | Nothing breaks today. |
| M14-L703 | LATER | Accepting a reported answer shows in some admin test runs but not a started day's, and nothing says so. | *unverified* beyond the migration; ticket and Audit page wording not rechecked. | Admin-only documentation gap. |
| M14-L704 | LATER | A direct admin call could add a duplicate-named item from a report; only the page hides the button. | supabase/migrations/20261030074353_test_misses.sql:40-49 audit_decide checks admin; page-only guard not verified. | Admin-only, no non-admin path; needs a deliberate direct call. |
| M14-L705 | LATER | An accepted report from a day frozen before a category change uses the current category. | src/game/runs.ts and baseline.sql:2238-2242 held_subset logic; edge not reproduced. | Rare admin edge case. |
| M14-L706 | LATER | The admin Audit page note says '1 of 1' under it for a test run's report. | src/app/admin/audit/audit.tsx:74 note and :196 players of answered. | Admin-only wording. |
| M14-L707 | LATER | No test shows the 'report a test miss' database function working as the app's own role. | grep of src/game/*.db.test.ts finds no report_test_miss call. | Test gap on admin-only function. |
| M14-L708 | LATER | One admin test only passes when the test before it has run. | src/app/api/admin/test/route.db.test.ts:225-240 draft test reads reported('apple') made earlier. | Test-order dependence, not a product fault. |
| M14-L709 | LATER | The answer-search database function does not itself refuse a negative question number. | supabase/migrations/20261030080933_answer_search.sql:26-50; src/app/api/answers/route.ts:20 digits-only check keeps negatives out. | Not reachable through the app route. |
| M14-L710 | LATER | Searching answers with an absurdly large question number gives a server error instead of 'bad request'. | src/app/api/answers/route.ts:20 only checks digits, no range. | Needs a hand-made URL; harmless error. |
| M14-L711 | LATER | Answer search asks the server on every keystroke, slowly on the biggest categories. | src/app/answer-search.tsx:24-38 fetches in useEffect on every text change, no debounce; :60 key a.name+matched. | Slow, not wrong; only a post-run bonus feature. |
| M14-L712 | LATER | A database test of answer search misses questions beyond the first. | *unverified* (did not open the test). | Test gap. |
| M14-L601 | DROP | In development mode every page prints a harmless warning about an unused stylesheet. | *unverified* today (dev-server only; no run allowed). ROADMAP text itself says cause unknown and a production build was never checked. | Dev-only console warning; no player sees it. |
| M14-L604 | DROP | A design note points at the wrong line of a source file. | docs/DESIGN.md:153 cites src/app/offbeat.tsx:214; AnswerSearch is now at offbeat.tsx:236. Cited lines drift every edit. | Doc line-number nit nobody will act on. |
| M14-L605 | DROP | The share text used placeholder symbols; moved to the later design ticket. (already done) | ROADMAP.md:605 is ticked [x] | Already done. |
| M14-L606 | DROP | The 'rounds survived' count was worked out in two places. (already done) | ROADMAP.md:606 is ticked [x] | Already done. |
| M14-L607 | DROP | A bundle of small wording and feel fixes (answer box keeps text, bonus line, own invite link, board order). (already done) | ROADMAP.md:607 is ticked [x] | Already done. |
| M14-L608 | DROP | Friends tab's midnight reset could fail to fire a second time. (already done) | ROADMAP.md:608 is ticked [x] | Already done. |
| M14-L609 | DROP | A timeout on a question left in play was not noticed outside Today. (already done) | ROADMAP.md:609 is ticked [x] | Already done. |
| M14-L610 | DROP | No test covered Today's live-update connection pausing and reconnecting. (already done) | ROADMAP.md:610 is ticked [x] | Already done. |
| M14-L611 | DROP | Page-room styling for the tab bar lived in the wrong stylesheet. (already done) | ROADMAP.md:611 is ticked [x] | Already done. |
| M14-L612 | DROP | Old 'home page' / 'account page' wording in comments and copy. (already done) | ROADMAP.md:612 is ticked [x] | Already done. |
| M14-L613 | DROP | Reaction buttons were too big at 320px wide. (already done) | ROADMAP.md:613 is ticked [x] | Already done. |
| M14-L614 | DROP | Admin pages had no shell/look yet. (already done) | ROADMAP.md:614 is ticked [x] | Already done. |
| M14-L615 | DROP | After Back from the clock bar, Today kept an empty gap. (already done) | ROADMAP.md:615 is ticked [x] | Already done. |
| M14-L616 | DROP | Leaderboard showed old rows under a new label while loading. (already done) | ROADMAP.md:616 is ticked [x] | Already done. |
| M14-L617 | DROP | The clock bar's Result link could miss its target. (already done) | ROADMAP.md:617 is ticked [x] | Already done. |
| M14-L618 | DROP | Yesterday and This week dates were formatted two ways. (already done) | ROADMAP.md:618 is ticked [x] | Already done. |
| M14-L619 | DROP | A do-nothing countdown helper was defined twice. (already done) | ROADMAP.md:619 is ticked [x] | Already done. |
| M14-L620 | DROP | Leaderboard period tabs differed only by colour. (already done) | ROADMAP.md:620 is ticked [x] | Already done. |
| M14-L621 | DROP | Live board's full lists had no avatar slots. (already done) | ROADMAP.md:621 is ticked [x] | Already done. |
| M14-L622 | DROP | Friends list had no avatar slots on Me. (already done) | ROADMAP.md:622 is ticked [x] | Already done. |
| M14-L623 | DROP | Profile page read stats twice and could mix two days at midnight. (already done) | ROADMAP.md:623 is ticked [x] | Already done. |
| M14-L624 | DROP | Calendar shades were too faint and its text alternative gave only a count. (already done) | ROADMAP.md:624 is ticked [x] | Already done. |
| M14-L625 | DROP | Screen readers ran a rarest answer's name and line together. (already done) | ROADMAP.md:625 is ticked [x] | Already done. |
| M14-L626 | DROP | Tie-break for rarest answers needed human confirmation; confirmed. (already done) | ROADMAP.md:626 is ticked [x] | Already done. |
| M14-L627 | DROP | Whether caught answers can be 'rarest answers'; decided to leave them out. (already done) | ROADMAP.md:627 is ticked [x] | Already done. |
| M14-L628 | DROP | A comment about when the run-over flag updates was missing. (already done) | ROADMAP.md:628 is ticked [x] | Already done. |
| M14-L629 | DROP | An e2e check did not assert its own precondition. (already done) | ROADMAP.md:629 is ticked [x] | Already done. |
| M14-L630 | DROP | One comment line ran past the wrapping width. (already done) | ROADMAP.md:630 is ticked [x] | Already done. |
| M14-L633 | DROP | Settings sheet could close when a text-selection drag ended outside it. (already done) | ROADMAP.md:633 is ticked [x] | Already done. |
| M14-L634 | DROP | Settings forms kept half-typed drafts after the sheet closed. (already done) | ROADMAP.md:634 is ticked [x] | Already done. |
| M14-L635 | DROP | Colour variables repeated hex values by hand. (already done) | ROADMAP.md:635 is ticked [x] | Already done. |
| M14-L636 | DROP | A profile reload could be overwritten by an older copy after a setting switch. (already done) | ROADMAP.md:636 is ticked [x] | Already done. |
| M14-L637 | DROP | Focus-ring check did not cover the phone's gear button. (already done) | ROADMAP.md:637 is ticked [x] | Already done. |
| M14-L638 | DROP | An e2e context was never closed, plus long comment lines. (already done) | ROADMAP.md:638 is ticked [x] | Already done. |
| M14-L639 | DROP | Two e2e files could pick the same player name. (already done) | ROADMAP.md:639 is ticked [x] | Already done. |
| M14-L640 | DROP | Theme picker only restyled after the save returned and disabled the radios. (already done) | ROADMAP.md:640 is ticked [x] | Already done. |
| M14-L641 | DROP | About page's contact address and wording needed human confirmation; confirmed. (already done) | ROADMAP.md:641 is ticked [x] | Already done. |
| M14-L642 | DROP | An e2e helper might catch the wrong live socket. (already done) | ROADMAP.md:642 is ticked [x] | Already done. |
| M14-L643 | DROP | Admin Puzzles chips reordered when ticked. (already done) | ROADMAP.md:643 is ticked [x] | Already done. |
| M14-L644 | DROP | An unused admin helper function remained. (already done) | ROADMAP.md:644 is ticked [x] | Already done. |
| M14-L645 | DROP | Admin tables on phones had unlabeled cells. (already done) | ROADMAP.md:645 is ticked [x] | Already done. |
| M14-L646 | DROP | Bank showed 'Scheduled' for a day already started. (already done) | ROADMAP.md:646 is ticked [x] | Already done. |
| M14-L647 | DROP | Repeated date formatting and visually-hidden CSS in admin. (already done) | ROADMAP.md:647 is ticked [x] | Already done. |
| M14-L648 | DROP | Admin keyboard focus lost on Delete/Cancel; phone menu had no Escape close. (already done) | ROADMAP.md:648 is ticked [x] | Already done. |
| M14-L649 | DROP | No test for approving the default-shown day; closed with no test by human. (already done) | ROADMAP.md:649 is ticked [x] | Already done. |
| M14-L650 | DROP | Hidden pages kept the 360px right margin after navigating. (already done) | ROADMAP.md:650 is ticked [x] | Already done. |
| M14-L651 | DROP | Live board missed a paused change; a failed channel could not be retried. (already done) | ROADMAP.md:651 is ticked [x] | Already done. |
| M14-L652 | DROP | Resizing past 1200px lost a comment draft. (already done) | ROADMAP.md:652 is ticked [x] | Already done. |
| M14-L653 | DROP | Friends feed stayed locked after a run ended while on another tab. (already done) | ROADMAP.md:653 is ticked [x] | Already done. |
| M14-L654 | DROP | Friends feed showed on invite pages; some sizes had no recorded origin. (already done) | ROADMAP.md:654 is ticked [x] | Already done. |
| M14-L655 | DROP | Game banner Result button copied a style by hand; underline check too narrow. (already done) | ROADMAP.md:655 is ticked [x] | Already done. |
| M14-L656 | DROP | Four copies of the visually-hidden CSS rule. (already done) | ROADMAP.md:656 is ticked [x] | Already done. |
| M14-L657 | DROP | Streak e2e did not check each rank's flower. (already done) | ROADMAP.md:657 is ticked [x] | Already done. |
| M14-L658 | DROP | Two code comments described the code wrongly. (already done) | ROADMAP.md:658 is ticked [x] | Already done. |
| M14-L659 | DROP | Rare timing edge between a Keep and a new report; closed as accepted. (already done) | ROADMAP.md:659 is ticked [x] | Already done. |
| M14-L660 | DROP | Unticking a blocked host answer lost keyboard focus; sizes unrecorded. (already done) | ROADMAP.md:660 is ticked [x] | Already done. |
| M14-L661 | DROP | A time-up re-keyed the whole Friends tab. (already done) | ROADMAP.md:661 is ticked [x] | Already done. |
| M14-L662 | DROP | After a time-up on Me, calendar and totals were not reloaded. (already done) | ROADMAP.md:662 is ticked [x] | Already done. |
| M14-L666 | DROP | A test of the Try again button did not check the board reloaded. | e2e/player-screens.e2e.ts:221-236 now waits for a new websocket and for the alert to disappear; remaining gap is only the refetch. | Mostly covered since; the remaining gap is a test nit. |
| M14-L667 | DROP | A focused comment box lost focus when the layout crossed 1200px. (already done) | ROADMAP.md:667 is ticked [x] | Already done. |
| M14-L668 | DROP | The result view jumped back into view unasked. (already done) | ROADMAP.md:668 is ticked [x] | Already done. |
| M14-L670 | DROP | Stray double blank lines in two files. (already done) | ROADMAP.md:670 is ticked [x] | Already done. |
| M14-L671 | DROP | A comment in the settings stylesheet describes the old way of closing the sheet. | src/app/settings.module.css:22 still says 'a click whose target is the dialog itself'. | Stale comment, nit. |
| M14-L672 | DROP | Settings sheet could close wrongly after a cancelled touch press. (already done) | ROADMAP.md:672 is ticked [x] | Already done. |
| M14-L673 | DROP | A setting switch could flicker back when toggled quickly. (already done) | ROADMAP.md:673 is ticked [x] | Already done. |
| M14-L674 | DROP | A refusal (taken name) after the sheet closed was never shown. (already done) | ROADMAP.md:674 is ticked [x] | Already done. |
| M14-L677 | DROP | A settings e2e file never closes its browser windows. | e2e/settings-sheet.e2e.ts:16 newContext with no close. | Test hygiene nit. |
| M14-L679 | DROP | A stylesheet comment says a blocked chip is not a control, but it is now a checkbox. | src/app/admin/puzzles/puzzles.module.css:82-83 still 'not a control'. | Stale comment, nit. |
| M14-L684 | DROP | The build failed three times because Google Fonts were unreachable; fonts now committed locally. (already done) | ROADMAP.md:684 is ticked [x] | Already done. |
| M14-L686 | DROP | A comment in the live-board test sits above the wrong test. | e2e/live-board.e2e.ts:275 comment sits above the tests at :282 and :298 before the reset test at :310. | Comment placement nit. |
| M14-L687 | DROP | The one-socket test could wrongly fail if an earlier page opened a socket. | e2e/live-board.e2e.ts:298-307; the ROADMAP item itself says never a false pass. | Only a false failure, nobody will act. |
| M14-L688 | DROP | Invite share button could fail on first use on iPhone Safari (still unverified on an iPhone). (already done) | ROADMAP.md:688 is ticked [x] | Already done. |
| M14-L689 | DROP | Two invite links on one page could share a dead code after Reset. (already done) | ROADMAP.md:689 is ticked [x] | Already done. |
| M14-L694 | DROP | Two places both check how many answers a test run sends. | src/app/api/admin/test/route.ts:33,39 and src/game/runs.ts:371-372 both refuse. | Harmless duplicate check, nit. |
| M14-L695 | DROP | A small admin-page helper copies a check the browser cannot import. | src/app/home.tsx:321 hostLists vs src/admin/puzzles.ts:135. | Tidiness nit. |
| M14-L698 | DROP | The admin 'Test an earlier day' date box also offers today. | src/app/admin/puzzles/puzzles.tsx:129 max={today}. | Trivial admin nit. |
| M14-L699 | DROP | A code comment on the run loader no longer gives the real reason. | src/app/game.tsx:63 'Stable, so the run loads once...' still present. | Stale comment, nit. |
| M14-L700 | DROP | An admin test reads the timer once instead of retrying. | e2e/test-run.e2e.ts:119-126 uses toHaveText then a single textContent read. | Test nit. |
| M14-L701 | DROP | A roadmap row wrongly said code was in a stash. | grep -n stash docs/ROADMAP.md finds only this item; the M14 row no longer says it. | No longer true. |
| M14-L702 | DROP | An admin undo now also requires a chosen item, which is harmless. | supabase/migrations/20261030074353_test_misses.sql:58 'and r.chosen is not null'. | Reviewer says harmless. |

### Part: s6-m16

#### Backlog sort: ROADMAP.md lines 714-836 (For M16, game 2)

Checked against the audit worktree (origin/main at 3076d81). Time-boxed: I opened the files named in the evidence column; "*unverified*" means I read the item but did not open the code, so its bucket rests on the item's own text.

Counts: MUST-FIX 1, LATER 68, DROP 43, HUMAN 6 (118 items; one per ROADMAP line 715-835 that holds an item).

#### MUST-FIX

| ID | Bucket | What it means | Evidence | Reason |
|---|---|---|---|---|
| M16-L756 | MUST-FIX | The hosted site (plor.app) has no way yet to load game 2's word list, so every word a friend types in game 2 would be called "not a word". | scripts/base.ts:10-11 says load refuses any database but the local one, and "nothing loads" the dictionary; ROADMAP:849 (hosted loading) still open. | Without it game 2 is unplayable on plor.app. The code work is a loader that may write to the hosted database; the hosted database address and approval are the human's (see HUMAN items), so treat as a launch task, not a defect hunt. |

#### All rows

| ID | Bucket | What it means | Evidence | Reason |
|---|---|---|---|---|
| M16-L715 | DROP | Three odd words were let into game 2's word list. | Ticked [x], closed in 16a-2. | Already done. |
| M16-L716 | LATER | A word note containing a colon is cut at the wrong colon when the word list is built. | *unverified*; item says the list isn't affected and the file is pinned. | Build-tool nit, no player effect. |
| M16-L717 | LATER | The word-list builder silently skips a line shape it doesn't recognise. | *unverified*; item says none today. | Only matters when re-pinning a new file. |
| M16-L718 | LATER | A rare misspelt-line check fails on one odd token. | *unverified*; item says none today. | No current case. |
| M16-L719 | HUMAN | A source document the word list is built from isn't listed in the project's sources file. | *unverified*; item says only a human adds a source. | Human's decision. |
| M16-L720 | DROP | Security log didn't cover some database permissions. | Ticked [x], closed in 16d. | Already done. |
| M16-L721 | LATER | A design note is incomplete, and loading the word list in several steps could briefly show a partial list. | *unverified* | Matters only during a hosted load, done once before friends arrive. |
| M16-L722 | DROP | The word list's size in the database had no target. | Ticked [x], closed in 16d (26 MB). | Already done. |
| M16-L723 | DROP | It was unclear whether empty or duplicate tries count toward the lockout. | Ticked [x], closed in 16d. | Already done. |
| M16-L724 | LATER | A design note says "Claude's reading" where the human actually approved. | *unverified* | Document wording. |
| M16-L725 | DROP | Odd punctuation like an acute accent was treated inconsistently. | Ticked [x], settled in 16a-2. | Already done. |
| M16-L726 | LATER | The note doesn't say how letters like æ and ß are handled when showing a word's spelling. | *unverified* | Rare words; display only. |
| M16-L727 | LATER | One word-list test doesn't cover spelling order. | *unverified* | Test gap; the item says the order is fixed. |
| M16-L728 | DROP | Possible stray punctuation in one source's words. | Ticked [x], measured: none. | Already done. |
| M16-L729 | LATER | A design ticket still calls the punctuation of sources unchecked. | *unverified* | Document staleness. |
| M16-L730 | LATER | A code comment about characters beyond the basic range rests on one measurement. | *unverified* | Comment only. |
| M16-L731 | DROP | The handoff note had two "Now" sections. | Item says fixed in the closing rewrite. | Already fixed; handoff is rewritten every session. |
| M16-L732 | DROP | A curly apostrophe might be cleaned out of a typed word. | Ticked [x], closed in 16d-1. | Already done. |
| M16-L733 | LATER | A ticket still gives an old spelling rule; the decisions file wins. | *unverified* | Document staleness. |
| M16-L734 | LATER | A ticket sentence stopped being true. | *unverified* | Document staleness. |
| M16-L735 | LATER | A ticket row can be read as keeping digits. | *unverified* | Document wording. |
| M16-L736 | DROP | Non-Latin letters are dropped from a try as well as non-letters. | *unverified*; item calls it harmless and explicit. | Nobody will act on it. |
| M16-L737 | LATER | A word typed with some accents shows a slightly different spelling than the plain word. | *unverified* | Rare; display only, judging unaffected. |
| M16-L738 | HUMAN | Six harmless words are still kept out by the offensive-word filter. | *unverified* | The human picks which to bring back. |
| M16-L739 | HUMAN | A handful of real plurals (like "pjs") are rejected as not words. | *unverified*; item says real count small, unmeasured. | The human decides if worth fixing; a friend could hit one but it's a rejected try, not lost data. |
| M16-L740 | LATER | A ticket sentence about banned words sits beside approved lists containing a few mild words. | *unverified* | Document wording. |
| M16-L741 | DROP | A tag in the word table isn't only for contractions. | *unverified*; item says harmless. | Nothing to do. |
| M16-L742 | LATER | A ticket statement is only true for unaccented tries. | *unverified* | Document wording. |
| M16-L743 | LATER | No unit test for a word that is both listed and allowed. | *unverified*; item says real build proves it. | Test gap. |
| M16-L744 | LATER | The puzzle-drafting tool forgets an earlier veto and silently ignores typos. | *unverified* | Admin tooling. |
| M16-L745 | LATER | A mistyped folder option in the drafting tool skips the repeat check. | *unverified* | Admin tooling. |
| M16-L746 | LATER | Redrafting a day can overwrite its file with no approval check. | *unverified* | Admin-only; the human sees each day before approving. |
| M16-L747 | LATER | A filter in the drafting code has no test that would fail without it. | *unverified* | Test gap. |
| M16-L748 | LATER | Some drafting-tool parts lack tests. | *unverified* | Test gap. |
| M16-L749 | LATER | A main-spelling test misses a few mark cases. | *unverified* | Test gap, no effect on today's table. |
| M16-L750 | LATER | A ticket's counts are stale, and some British spellings weren't covered by the human's answer. | *unverified* | Drafting-time choice, the human reviews each day. |
| M16-L751 | LATER | A missing game 2 day warns nobody. | *unverified*; src/app/messages.ts etc. not traced. | Operator concern, not a player bug; check game 2 days are approved ahead as a launch routine. |
| M16-L752 | LATER | An admin card says "Live: players have started it" for game 2 before that was true. | *unverified*; 16d is merged so likely now true. | Admin wording. |
| M16-L753 | LATER | The 30-day repeat check reads files only, so an edited approved day can slip out of view. | *unverified* | Admin drafting edge. |
| M16-L754 | LATER | The approve step for a game 2 day checks the format only, and one comment is stale. | *unverified* | Only the admin route calls it. |
| M16-L755 | LATER | A test cleanup could delete a file its setup refused to overwrite. | *unverified*; item says unlikely. | Test nit. |
| M16-L756 | MUST-FIX | (see top) plor.app has no way to load game 2's word list. | scripts/base.ts:10-11. | Game 2 dead on plor.app without it. |
| M16-L757 | LATER | A game 2 day with a missing round would let any word through. | *unverified*; item says the route's validator stops it first. | Cannot happen through the normal route. |
| M16-L758 | LATER | A late retry of one round's word could be judged as a try in the next round. | *unverified*; item says neither can reopen a past round. | Millisecond window. |
| M16-L759 | LATER | Example words for 5 keys show without an accent; a reload test isn't one step. | supabase/migrations/20261107105151_game_2_rounds.sql:164-168, 247 show the "C" collate ordering the item describes. | Display only. |
| M16-L760 | LATER | A word-spelling function lacks tests and isn't tightened in security. | Same migration: collate clauses seen; test status *unverified*. | Runs as postgres only; no player reach. |
| M16-L761 | DROP | A refused word clears the box. | Ticked [x], closed in 16d-2. | Already done. |
| M16-L762 | LATER | Pressing Enter twice or Space on the Next button can start the next round clock while someone is typing. | *unverified* | Annoying but rare, no data loss. |
| M16-L763 | LATER | Some on-screen messages for game 2 errors aren't covered by the browser test. | src/app/messages.ts:60 has `no_run`; other codes *unverified*. | Test gap. |
| M16-L764 | LATER | A tab left open past midnight shows "Start today's puzzle first" with no Start button for up to 20 seconds. | src/app/messages.ts:60 holds the text; button behaviour *unverified*. | Only for tabs open across midnight, clears itself. |
| M16-L765 | LATER | Two docs say the box clears but it keeps text typed since. | *unverified* | Document wording. |
| M16-L766 | DROP | A box of spaces sent during another try doesn't clear. | *unverified*; item says harmless. | Nobody will act on it. |
| M16-L767 | LATER | After "123" the old "Not in the dictionary" message stays on screen. | *unverified* | Only if it looks wrong in play. |
| M16-L768 | LATER | Words with 1 or 2 different letters both score 35. | *unverified*; item says likely unreachable. | Unreachable in practice. |
| M16-L769 | LATER | An old header comment says there are no points yet. | *unverified* | Stale comment. |
| M16-L770 | LATER | A screen reader is told how many letters are used, not which. | *unverified* | Accessibility polish. |
| M16-L771 | LATER | Mid-run, internal totals already hold final numbers. | *unverified*; item says no leak. | Design wording. |
| M16-L772 | LATER | Reading game 2's board gets slow at about 1,000 players a day. | *unverified*; item says "not the beta". | Scale, public launch. |
| M16-L773 | LATER | A word sent in the millisecond before midnight can leave one run a word short. | *unverified* | Millisecond window. |
| M16-L774 | LATER | The design notes understate how much of every player's data the game 2 board reads (only a circle and a percent are returned). | *unverified*; item says responses hold only the circle and a percent. | No leak per the item; document correction. |
| M16-L775 | LATER | Ties on game 2 boards aren't tested. | *unverified* | Test gap. |
| M16-L776 | LATER | Game 2's board screen speaks of points, and an old error may linger when switching games. | *unverified* | Wording/polish. |
| M16-L777 | DROP | A design doc cites a component by name only. | *unverified* | Nit. |
| M16-L778 | LATER | One database test fails if a game 2 day for yesterday exists locally. | *unverified* | Test nit, loud by design. |
| M16-L779 | HUMAN | The human should confirm the board protocol version stays at 7. | *unverified* | Human's call. |
| M16-L780 | LATER | Reading game 1's boards is costly right after midnight at large size. | *unverified*; item says "not the beta". | Scale. |
| M16-L781 | LATER | An average landing exactly on a half may round either way. | *unverified*; item says no source gives a rule. | Tiny edge. |
| M16-L782 | LATER | Ties on the overall board aren't tested. | *unverified* | Test gap. |
| M16-L783 | DROP | A design doc cites a component by name only. | *unverified* | Nit; same as L777. |
| M16-L784 | LATER | A game 1 run resumed after midnight may show the "Past midnight" line while played but not on its result. | src/app/bonus.ts:13-14 shows `pastMidnight` as the item describes. | Rare edge; scores agree. |
| M16-L785 | LATER | The "Past midnight" line appears only after the player taps Next. | *unverified* | Rare edge. |
| M16-L786 | LATER | A code comment about when points settle is stale. | src/game/ledger.ts:113 comment still says "once ... closed days are settled". | Stale comment. |
| M16-L787 | HUMAN | Me's "days played" counts only finished runs, while boards count unfinished ones as played at 0. | src/game/me.ts:42 uses FINISHED_RUNS (src/game/offbeat.ts:35). | The item says it needs the human's settling; a friend could see two different counts. |
| M16-L788 | LATER | An unfinished run on a past day always reads "in progress". | src/game/runs.ts:130,183 use in_progress; past-day handling *unverified*. | Not shown wrong in the checked places; later. |
| M16-L789 | LATER | A code comment about the Next rule is wrong and two error mappings are unreachable. | *unverified* | Comment/dead code. |
| M16-L790 | LATER | Two local tests would fail and could erase today's game 2 day if one is approved locally. | *unverified* | Developer-machine only. |
| M16-L791 | LATER | Several small page-label and screen-reader nits on game 2. | *unverified* | Polish. |
| M16-L792 | LATER | The run-event check wouldn't refuse an event on a game 2 run. | *unverified*; item says no route sends one. | Unreachable. |
| M16-L793 | LATER | Some ordinary words like "die" and "war" appear in puzzle pools. | *unverified* | The human reviews each day before approving. |
| M16-L794 | HUMAN | A table's README source isn't in the sources file. | *unverified* | Only a human adds a source; duplicate of L719. |
| M16-L795 | LATER | After the beta, real results should correct what counts as a hard substring. | *unverified*; the human said "after the beta". | Human already scheduled it. |
| M16-L796 | DROP | A ticket criterion says "3 drops" (wording only). | *unverified* | Nit nobody will act on. |
| M16-L798 | DROP | A test click was slow once in CI. | Ticked [x]. | Already done. |
| M16-L799 | LATER | A test can fail if Pacific midnight passes during a run. | *unverified* | Rare, a rerun clears it. |
| M16-L801 | LATER | A streak-pill test failed once in CI. | *unverified* | Flaky test; CI retries once (playwright.config.ts:14). |
| M16-L802 | LATER | A screen-reader test lost focus on Close in CI. | *unverified*; reopen only if it fails again. | Flaky test. |
| M16-L803 | LATER | An automatic dependency update (minimatch) failed once on main. | package-lock.json:388,2232 show minimatch ^3.1.5 and ^10.2.2 currently resolved; cause *unverified*. | Tooling; main's recent e2e/CI runs pass. |
| M16-L805 | LATER | The end-to-end tests run on the development server and are flaky; a production build would help. | gh run list: last 8 e2e runs mostly success, 1 failure on main (42907063874); retries:1 at playwright.config.ts:14. | Tooling; green on main now. |
| M16-L806 | LATER | A Reset link click timed out once in a browser test. | *unverified* | Flaky test. |
| M16-L807 | DROP | A mock page for the garden scene lets two ants share a letter. | Mock pages for the village; src/brew and public/brew exist today but 14c-9 deletes them. | Village/mock, going away. |
| M16-L808 | DROP | A mock page hid a font-load failure. | Same: mock pages. | Village/mock, going away. |
| M16-L809 | DROP | Some scene numbers aren't named in a mock ticket. | Same. | Village ticket, going away. |
| M16-L810 | DROP | A mock ticket's wording about loading scripts is misleading. | Same. | Village ticket. |
| M16-L811 | DROP | The credit line for 3D models is one line for all models. | public/brew holds the .glb models; going away in 14c-9. | Models deleted. |
| M16-L812 | DROP | On Android the keyboard could move the village camera. | src/brew exists; being deleted. | Village. |
| M16-L813 | DROP | The licence of the village's animation clips was unverified. | public/brew; being deleted. | Village assets removed. |
| M16-L814 | DROP | Midnight Brew double-speed kid bug. | Ticked [x]. | Already done, and village. |
| M16-L815 | DROP | Garden camera step and score tracker. | Village. | Going away. |
| M16-L816 | DROP | Midnight Brew round 4 changes more than others. | Village. | Going away. |
| M16-L817 | DROP | The village is heavy for phones (lights, shadows, download size). | src/brew, public/brew exist; being deleted. | Removing the village removes the cost. |
| M16-L818 | DROP | Small mock-page nits. | Mock pages. | Village. |
| M16-L819 | DROP | Midnight Brew finale and particle nits. | Village. | Going away. |
| M16-L820 | DROP | A model-trimming script has unchecked assumptions. | Village tool. | Going away. |
| M16-L821 | DROP | A mock ticket's numbers list is incomplete. | Village ticket. | Going away. |
| M16-L822 | DROP | Mock harness double-press and phase guard. | Village mock. | Going away. |
| M16-L823 | DROP | Midnight Brew finale lighting choices. | Village. | Going away. |
| M16-L824 | DROP | The mock check script has gaps. | Village mock. | Going away. |
| M16-L825 | DROP | A village animal or hearse failing to load stops the village. | src/brew exists; deleted by 14c-9. | Village. |
| M16-L826 | DROP | A village round can end twice (time-up and a late try). | Village scene code (src/brew); deleted. | Village. |
| M16-L827 | DROP | Leaving the village while loading leaks graphics contexts. | src/brew; deleted. | Village. |
| M16-L828 | DROP | The village's model-joining step could join wrongly for new materials. | src/brew; deleted. | Village. |
| M16-L829 | DROP | Village duplicate load code and missing test. | src/brew; deleted. | Village. |
| M16-L830 | DROP | No check proves a real graphics card stays out of the village's slow mode. | src/brew; deleted. | Village. |
| M16-L831 | DROP | The village's browser tests fail on CI most runs. | brew.e2e.ts exists but is being deleted; latest main e2e run 43020681368 is success. | Village tests going away. |
| M16-L832 | LATER | Local end-to-end runs on the human's Windows PC reload the page repeatedly, so tests fail at random steps. | *unverified*; cause unknown. | Developer-machine tooling; does not affect plor.app. |
| M16-L833 | DROP | The village's calm (reduced-motion) look has small flaws. | src/brew; deleted with its Reduce motion branch. | Village. |
| M16-L834 | LATER | CI videos upload only when the e2e job fails; the other two sub-points are village code and a ticket note. | .github/workflows/e2e.yml exists; the rest *unverified*. | Tooling; only point (1) survives 14c-9. |
| M16-L835 | DROP | Village wording and comments (frames, rejects on stop, double fault). | src/brew/scene.ts; deleted. | Village. |

Note on counts: the counts line at the top is the final tally; L756 appears in both tables (listed once in the count).

### Part: s7-audit-1026

#### Audit 2026-10-26 findings, sorted against today's code (origin/main at 3076d81, checkout RIFF-audit-2026-11-11)

Checked 2026-11-11, read-only. Anything marked *unverified* was not read or run by me.

**Counts:** MUST-FIX 1, LATER 57, DROP 17, HUMAN 6; total 81 of 81.

| ID | Bucket | What it means | Evidence checked | Why this bucket |
|---|---|---|---|---|
| TOOL-6 | MUST-FIX | The tool that loads the answer lists (and game 2's word list) refuses to write to plor.app, so a plor.app update would have no answers to check against and nobody could play. | scripts/base.ts:1072-1078 `localClient` throws "refusing <host>: 13a loads the local stack only" for any non-local host; ROADMAP.md:756 and :849 say plor.app has no way to load the dictionary or the base yet, and every try there would be `not_a_word`. Migrations after the baseline (game 2's tables) are also not on plor.app (HANDOFF "app first, no publishing"; hosted side *unverified*). | Blocks play for every friend on the day plor.app is updated; the guard is deliberate (DECISIONS.md:193) but the hosted path M15 promised was never built. Needs a human-approved design (security change). |
| DB-9 | HUMAN | Deleting guest accounts later would shrink past days' counts and change some bonuses. | Applies only once anonymous play exists: supabase/config.toml:176 `enable_anonymous_sign_ins = false`; no is_anonymous use in src (grep). | A design question for the guest-play ticket (does the beta purge guests), which only the human decides. |
| APP-6 | HUMAN | Comments, the feed, the streak and Me's totals all mean game 1 only, so a player who only plays game 2 has none of them. | src/comments/comments.ts:7,47,94; src/comments/feed.ts:7,39; src/game/streak.ts:5; src/game/me.ts:5,64 all use GAME_ID only. | Needs the human's rule for what a second game unlocks (16f, listed before the beta in ROADMAP.md:44). |
| APP-7 | HUMAN | The sign-in gate and several routes assume a named, signed-in player, which guest play must change. | src/lib/auth.ts:30-40 requireUserId accepts any verified user; src/lib/auth-limits.ts:1-4 (per-player limits exist). No anonymous code yet (grep). | Part of the guest-play ticket's questions, the human's design call. |
| DOM-4 | HUMAN | Me's "All games" totals count game 1 only, and "average" means two different things. | src/game/me.ts:1-5, :64 GAME_ID only. | Needs the human's definition of "All games" with two games (16f). |
| FUT-1 | HUMAN | Guest play would give guests access to friends, comments and groups unless gated, and a guest's run can't merge into an existing account. | src/lib/auth.ts:30-40; baseline.sql run primary key (user_id, game_id, puzzle_date) and FKs without on update cascade; Supabase is_anonymous behaviour *unverified*. | The guest-play ticket's guided questions come first (ROADMAP.md:44); the human chooses link-only vs merge. |
| FUT-11 | HUMAN | Comments, reactions and the shared feed belong to game 1's run only, with no rule for game 2. | src/comments/comments.ts:47,66,94 and src/reactions/reactions.ts:80 use GAME_ID only. | The human's decision (16f) before the beta, same as APP-6. |
| DB-2 | LATER | The rule "who belongs to a category" is written out three times in the database, so a missed edit could make approval, audit and play disagree. | supabase/migrations/20261028140000_baseline.sql:1392 (category_members), :1413 (in_category_now), :2080 (resolve_answer) all still spell membership out. | Duplication, not a live bug; nothing is changing these rules before the beta. |
| DB-3 | LATER | How far a run has got is worked out in three separate database functions. | baseline.sql:962 check_run_event, :997 check_question_open, run_status view; game_2_rounds.sql:51-103 adds game 2 branches to the same functions. | Works today for both games; cleanup only. |
| DB-4 | LATER | The "midnight in Los Angeles" rule and "counts if given on its day" are retyped in several places. | baseline.sql:888-950 (day_of, next_reset, answers_as_of); src/game/ledger.ts:76 still has `private.day_of(e.created_at) = e.puzzle_date`. | Copies agree today; tidy-up. |
| DB-5 | LATER | The admin check is done in three different ways (route, database error, quiet false). | baseline.sql:2748-2799 delete/keep_reported_comment still return false for non-admins; every route under src/app/api/admin/ (11 files) calls isAdmin. | All checks present and agree; inconsistency only. |
| DB-7 | LATER | A private audit log of changes to the answer lists is written by 12 functions but only tests read it. | baseline.sql:385 base_log table, written at :1327, :1370, :1809 and others; read only by supabase/tests and *.db.test.ts files (grep). | Harmless storage; the human never said whether they read it. |
| DB-8 | LATER | If an admin deleted their account, a few admin records would keep their ID. | baseline.sql:462 `added_by uuid not null` and :511 `decided_by uuid` have no foreign key to auth.users; comment_deletion (:748) cascades. | Only one admin exists and no friend can reach this. |
| DB-10 | LATER | Every answer sends a live update to each friend inside the answer's own database step, which gets slower with many friends. | baseline.sql:2629 broadcast_board and game_2_rounds.sql:265 redefine it; per-friend realtime.send inside the answer transaction. Cost *unverified*. | A small invited group has few friends each; this is a scale item for the public launch. |
| DB-11 | LATER | There is no master list of game IDs in the database, so a mistyped ID for a new game would be accepted. | No game registry table in supabase/migrations (grep); src/platform/game.ts:10-21 holds GAME, SUBSTRINGS, OVERALL in code only. | Two game IDs are fixed and working; matters when game 3 arrives. |
| DB-13 | LATER | Database tests repeat the same permission checks in several files, and the "safe search path" test covers only some functions. | supabase/tests: search_path/proconfig appears only in account_deletion.test.sql and auth_attempt.test.sql, not as a generic check. | Test tidy-up; a new function missing the setting would pass. |
| DB-14 | LATER | "Who counts as my friend" and "which report is open" are computed in more than one place. | src/friends/circle.ts:8-12 friendsSql; both broadcast functions in the baseline repeat it. | Matters when blocking is added (M17), not for the beta. |
| APP-2 | LATER | At midnight every phone reconnects its live board at once. | src/app/board-channel.ts:175-199 closes the shared socket when the last listener leaves and reopens later; behaviour in a browser *unverified*. | Only bites at scale (Realtime connection cap). |
| APP-3 | LATER | Several screens each ask the server for the same run state, so a page makes extra calls. | api("/api/run") at src/app/game.tsx:65 and :194, home.tsx:555 and :598, shell.tsx:344. | Slower, not wrong; fine for a small group. |
| APP-4 | LATER | At midnight every open page asks the server for a fresh day at the same moment, including the heavy "settle yesterday" step. | msToReset timers in src/app/game.tsx:74-76, home.tsx, groups.tsx; settleRuns on every leaderboard read (src/friends/leaderboard.ts:106 and :165). | Load-test item for the public launch. |
| APP-8 | LATER | The "display name or username" rule and several name types are repeated, which will get harder when avatars arrive. | 12 `coalesce(...display_name...)` lines in 7 files (grep of src). | Tidy-up before profiles (M17). |
| APP-9 | LATER | Admin pages rely on every route remembering the admin check. | Opened all 11 routes under src/app/api/admin/: each calls isAdmin (2 to 3 hits each). No gap today. | Future-route risk only; nothing exploitable now. |
| APP-10 | LATER | A "busy and error" helper exists in one file while 18 places hand-roll it. | useAction only at src/app/groups.tsx:27 (grep). | Code tidiness. |
| APP-11 | LATER | Dates are formatted in several places, in two English styles. | toLocale*String in day-text.ts:5,15; game.tsx:486; me.tsx:23; offbeat.tsx:165 (en-GB); settings.tsx:198, share.ts:19 (en-US). | Cosmetic inconsistency; no wrong date. |
| APP-12 | LATER | The log line for an unknown live-update version is copied five times. | board.tsx:75,85; groups.tsx:116; home.tsx:512,573; offbeat.tsx:50 all log "board message with unknown version". | Duplicate code only. |
| APP-13 | LATER | Two Next.js switches (cacheComponents, partialPrefetching) have no recorded decision. | next.config.ts:5 and :11 set them; grep of docs/DECISIONS.md finds neither. | Documentation gap. |
| APP-14 | LATER | If the server fails with a non-JSON page, a player sees the word "SyntaxError". | src/lib/api-client.ts:22 `await response.json()` runs before the ok check; platform error body *unverified*. | Rare (a platform timeout); cosmetic message. |
| APP-15 | LATER | One admin route builds its own error reply instead of the shared one. | src/app/api/admin/puzzles/approve/route.ts:29 returns Response.json(... 422). | Admin-only style nit. |
| DOM-3 | LATER | The "days the player played" query is written twice (streak and Me). | src/game/streak.ts:12-17 and src/game/me.ts:43-49 repeat the same CTE. | Duplicate code; both agree. |
| DOM-5 | LATER | If a new puzzle format appears, some bonus counts would silently skip it. | src/game/ledger.ts:76 `p.content ->> 'format' = '3'`; baseline.sql:1431 category_questions same filter. | Only matters for a new game-1 format; none planned. |
| DOM-7 | LATER | The question bank (every question's host answers) sits in the public repo. | `gh repo view` says PUBLIC; git ls-files lists content/bank.json and content/offbeat/2026-10-24.json; DECISIONS.md:194 records the human's "Stay public" and "Accept for the beta". | The human accepted it for the beta; only a cheating risk, no private data; moving it private is public-launch work (M15 15a). |
| DOM-8 | LATER | "20 seconds" is typed into screen text while the real limit lives in the database. | src/app/game.tsx:127,435 and how-to-play.tsx:24 say 20 seconds; baseline.sql private.question_deadline holds the value. | Both agree today. |
| DOM-9 | LATER | A small "show 3 friends' names" number sits outside the settings file. | src/comments/preview.ts:6 `NAMED = 3`; the game's display name now has a home (GAME.name). | Nit. |
| DOM-10 | LATER | A few small calculations are repeated (ladder points, "finished" list, "survived" count). | Not re-opened in detail (*unverified*); ledger.ts:56 uses scoreRun. | Tidy-up. |
| DOM-11 | LATER | The admin check helper lives in the insights folder and the profile route imports it from there. | src/insights/queries.ts:10 isAdmin; src/app/api/profile/route.ts:3 imports it. | Naming/placement nit. |
| TOOL-1 | LATER | The automatic checks run twice for each pull request commit (on push and on pull request). | .github/workflows/ci.yml:5-7 `on: push:` and `pull_request:` unfiltered; e2e alone was fixed in .github/workflows/e2e.yml:5-8. | Wastes minutes, nothing breaks. |
| TOOL-2 | LATER | There is no single "type check" command. | package.json scripts (lines 6-22) have no typecheck; `next build` runs in CI. | Convenience. |
| TOOL-3 | LATER | Two commands for the same database tests are both mentioned in the docs. | package.json:15 test:sql; docs/DECISIONS.md and HANDOFF.md still mention supabase test db. | Docs nit. |
| TOOL-4 | LATER | Several chores (stack catch-up, making an admin, clearing sign-in limits) are done by hand. | docs/HANDOFF.md steps; e2e files each inline admin creation (count *unverified*). | Workflow cost for the developer, not players. |
| TOOL-7 | LATER | The reviewed answer-list snapshots exist only on one Windows PC. | data/snapshots/ gitignored (*unverified* locally); ROADMAP.md:849 keeps it open. | Backup concern; the human copies by hand. |
| TOOL-8 | LATER | Each end-to-end test file builds its own database connection and player helper. | 39 e2e files contain `new Pool`, 9 define `player()` (grep of e2e/). | Test tidiness only. |
| TOOL-9 | LATER | All end-to-end sign-ins go through the email form, which is slow. | No storageState use (grep of e2e/ and playwright.config.ts). | CI cost. |
| TOOL-10 | LATER | End-to-end tests run against the development server, not the real build. | playwright.config.ts:27 `command: "npm run dev"`. | Raises flakiness; already tracked (HANDOFF, "no e2e on a production build"). |
| TOOL-12 | LATER | The private-drafts plan still names two retired scripts. | docs/milestones/M15-15a-private-drafts.md:23 mentions content:plurals and content:letters; neither is in package.json. | 15a is public-launch work, deferred by the human (DECISIONS.md:194). |
| DOC-1 | LATER | Two handoff files overlapped heavily. | docs/HANDOFF.md is now 7,906 words, still holding older sections "From main, M16's session" and "Before that". | Process cost; the human decides on process rules. |
| DOC-2 | LATER | The handoff contradicted itself and the repo. | HANDOFF.md still carries stale lines (e.g. "Ignore every Next: build 6c"); not re-checked line by line. | Process; no player effect. |
| DOC-3 | LATER | The handoff repeats history that git and the roadmap already hold. | HANDOFF.md 7,906 words. | Process. |
| DOC-4 | LATER | Roadmap status cells for M13 and M14 are huge walls of text. | docs/ROADMAP.md:80-81 hold cells of many thousands of characters. | Process. |
| DOC-5 | LATER | Some parent tickets say "planned" or "designing" though the work is done. | docs/milestones/M14-14b-2-sprout-admin-polish.md:3 "planned"; M14-14b-2b-admin-pages.md:3 "designing" (both still). | Docs drift. |
| DOC-6 | LATER | The rule to update status "before merge" can't record the merge itself, costing extra docs-only commits. | CLAUDE.md:66 rule unchanged; recent git log shows many docs-only commits. | Process. |
| DOC-7 | LATER | The deferred-items list is very long, with many finished entries left in. | docs/ROADMAP.md has 179 ticked and 305 open "- [ ]" lines (grep). | Process; this sort is the cleanup. |
| DOC-8 | LATER | A few roadmap items are duplicates or stale. | Not re-verified item by item (*unverified*). | Being handled by the current sort. |
| DOC-10 | LATER | The steps to push database changes to plor.app are hand-run each time. | No hosted-push script in scripts/ (ls); sequence still in docs. | Needed at the plor.app update, but a checklist works for a one-time update. |
| DOC-11 | LATER | Nothing in CLAUDE.md says how parallel sessions share the database and port 3000. | CLAUDE.md:79 covers subagents only; port-3000 warnings live in HANDOFF.md. | Process. |
| DOC-12 | LATER | Merged branches still linger. | `git branch -a --merged origin/main` lists origin/m15-launch-readiness and origin/m16-game-2; m12-account is gone. | Housekeeping. |
| DOC-13 | LATER | Decision rows carry long provenance, burying the rule. | docs/DECISIONS.md is 17,854 words; rows 16 and 17 are very long. | Docs. |
| DOC-14 | LATER | The old survey data and its doc still sit in the repo. | docs/survey/ holds responses.csv and responses-template.csv; DECISIONS.md:198 sets the results aside. | Cheap deletion; low value. |
| DOC-15 | LATER | Every small step touches many docs, which will multiply with more games. | M14 has dozens of ticket files in docs/milestones (git ls-files). | Process. |
| FUT-2 | LATER | At midnight every client triggers the heavy "settle the day" work at once. | src/friends/leaderboard.ts:106 and :165 call settleRuns on reads; ledger.ts:70-81 pooledCounts scan. | Load-test item (public launch); small group is fine. |
| FUT-3 | LATER | Each answer's cost grows with the number of friends. | baseline.sql:2629 broadcast_board per friend. | Same as DB-10. |
| FUT-9 | LATER | Games 3 to 6 would need run shapes the current model doesn't support (several guesses, one shared timer). | Future games only; src/friends/leaderboard.ts:204 'playing' logic. | Not in the beta's scope. |
| FUT-12 | LATER | Friend requests and blocking need one "who sees whom" function. | circle.ts plus both broadcast functions (see DB-14). | M17, after the beta. |
| FUT-13 | LATER | Automatic puzzles would need a scheduler and a non-human approver. | vercel.json has no crons; approve_puzzle needs a human admin (substring_days.sql:7). | Explicitly Later. |
| FUT-14 | LATER | A handful of small future items (avatars, coins, a manifest, friends' misses). | src/proxy.ts:41 matcher unchanged; board shows only matched entry names (src/friends/board.ts:57-71), so friends' typed misses aren't shown. | Later features; no beta effect. |
| DB-1 | DROP | Old copies of database functions piled up across 48 migration files. | Squashed in 13g: supabase/migrations/ now holds 6 files (baseline 3,093 lines plus 5 small ones); roles.sql:7-17 creates only plor_app; git log "M13: 13g, the migration squash". Two to three definitions of 4 functions remain (approve_puzzle x3), normal for later migrations. | Already fixed by the squash. |
| DB-6 | DROP | A day's missed-answer recorder used to return silently when a question had no category. | supabase/migrations/20261030074353_test_misses.sql:145-175 record_miss now raises "names a category the base doesn't have"; the nullable `normalized` column stays by design (baseline.sql:493 comment). | First half fixed in 13f-3b-1; second half intended. |
| DB-12 | DROP | The game 2 plan's list of shared database parts was out of date. | Game 2 is built: game_2_rounds.sql:60 `new.game_id = 'substrings'` branches, run_status :103, approve_puzzle by game (substring_days.sql:15). A per-day ledger index is still absent (grep create index) and its need is *unverified*. | The inventory was used and superseded by 16d to 16e. |
| APP-1 | DROP | Sixteen pages rendered the same big Home component. | src/app/(shell)/layout.tsx wraps every player page in Shell; src/app/(shell)/play/page.tsx renders GameTab/Signed; home.tsx is 682 lines with no 10-way View union (grep). Refetch on tab return *unverified*. | Restructured since the audit. |
| APP-5 | DROP | Game 1's name was hard-coded in many places, including shared screens. | src/platform/game.ts holds GAME {name:"Game 1"}; src/app/leaderboard.tsx, comments.tsx (only a comment at :61), src/comments/preview.ts and src/game/share.ts no longer say "Offbeat" (grep); next.config.ts:12-20 still names content/offbeat paths on purpose. | Fixed by 14b-4 and 14c-1/2. |
| DOM-1 | DROP | Game 1's ID and format code was imported all over, which would make game 2 hard to add. | Game 2 shipped: src/platform/game.ts, src/content/substrings.ts, game 2 routes /api/substrings and /play2; 17 non-test GAME_ID importers remain by design. | Risk realised and handled in M16. |
| DOM-2 | DROP | The game 2 plan still said "format 2" and an offensive-word list "still to be chosen". | Game 2 built with LDNOOBW (src/game/ldnoobw-en.ts exists); the ticket's wording itself *unverified* but irrelevant. | Planning text, superseded by the built game. |
| DOM-6 | DROP | Game 2 might grow a second word-normalizer and offensive list. | Decision taken: game 2 has its own dictionary_word table (game_2_rounds.sql:9) and src/game/ldnoobw-en.ts; whether a second normalize exists *unverified*. | Settled in 16a to 16d; nothing left to decide. |
| TOOL-5 | DROP | The scripts' "local database only" guard checked a different host than the connection used. | scripts/base.ts:1072-1078 now parses via readDatabaseUrl and passes pg fields, not a URL; DECISIONS.md:193 records the fix. | Fixed (13e-5 item 7). |
| TOOL-11 | DROP | The content checker assumed every file was game 1's. | scripts/content-validate.ts: "Each game's folder holds it to that game's rules" (M16 16c); substrings folder handled. | Fixed in M16. |
| DOC-9 | DROP | Drafting's pause was missing from the decisions file. | docs/DECISIONS.md:194 records the human lifting the pause ("Lift the pause"). | Fixed by the human's decision. |
| FUT-4 | DROP | Moving a game's ID or naming it in one place was an open question. | src/platform/game.ts:10-21 is the single record (id, name, path); human chose to keep the ID (DECISIONS.md log). | Done in 14b-4. |
| FUT-5 | DROP | The shared run rules applied game 1's sudden death and 20-second rule to every game. | game_2_rounds.sql:60-100 check_question_open branches on 'substrings'; run_status view redefined :103-154. | Fixed in 16d-1. |
| FUT-6 | DROP | Approval accepted only game 1's format for every game. | supabase/migrations/20261107094310_substring_days.sql:15 approve_puzzle dispatches on game_id. | Fixed in 16c-2. |
| FUT-7 | DROP | Game 2 had no way to settle points, and runs left unfinished were never settled. | M16 16e-1 to 16e-3b: git log shows ledger rows for game 2 and "a game 1 run counts ... finished or not". A run left at a reveal still stays in progress until its player presses Next (separate item, HANDOFF.md:10). | Fixed for scoring; the reveal case is tracked elsewhere. |
| FUT-8 | DROP | The game 2 inventory of touch points was out of date. | Game 2 built and merged (PRs #160 to #176). | Superseded. |
| FUT-10 | DROP | Game 2's word list might have needed a second import path and a second big dataset. | Decision implemented: private.dictionary_word (game_2_rounds.sql:9) loaded by `npm run base -- load dictionary` (scripts/base.ts:1082); its hosted loading is TOOL-6. | Settled; the hosted part is TOOL-6. |

