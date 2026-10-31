# M14 14b-14 — The leaderboard's graph view

**Status:** approved (human, 2026-10-31: "Approve, build it", to "Build 14b-14 as drafted?"), done (PR #144, merged on green CI at the human's "Merge when green"). It was drafted from five rounds of guided questions, a mockup page, and an Impeccable critique of that mockup, whose redraw the human approved (2026-10-31: "Approve, write the ticket (Recommended)"). It follows 14b-13 (PR #143, merged) and is the last feature in the human's 14b-10 notes (14b-10, answer 4). The desktop sidebar's corners were asked about in the same rounds and stay as they are (answer 12), so no sub-ticket was made for them.

## Goal
The weekly leaderboards on the Friends tab and each group page get a Graph view beside the List. Each week shows every player's points adding up day by day, so a player can see who's catching up and when someone pulled ahead.

## Who uses it / what breaks without it
- Used by: every player who looks at the Friends leaderboard or a group's leaderboard.
- Breaks without it: the human's note (2026-10-29, 14b-10): "leaderboards should have a graph view as well as a list view". The boards show only each week's totals, so the race through the week (who led on Wednesday, who's closing in) can't be seen.

## What the human decided (2026-10-31, on the Windows PC, quoted)
Round 1:
1. What the graph shows: "The race through the week (Recommended)" ("One line per player climbing day by day, Monday to Sunday, so you see who's catching up and when someone pulled ahead. The server must start sending points per day, not just totals.").
2. Where: "Friends and group boards (Recommended)" ("The full weekly boards on Friends and on each group page. Today's card stays a short list, so the home page stays calm (14b-10). Shows in two places, from one component.").
3. Switching: "A List / Graph switch (Recommended)" ("A two-choice switch at the top of the card, the same control as Today's Yesterday / This week switch. One way to switch views across the site. List is the default.").
4. Colours: "You in accent, others muted (Recommended)" ("Your line or bar in the theme's accent and everyone else in the muted ink, each named at its end.").

Round 2:

5. Two weeks: "Both weeks, each its own graph (Recommended)" ("Graph swaps both This week and Last week for their races, as List shows both now. On Monday, This week says when its first points arrive and Last week's finished race sits under it. The x-axis is always Monday to Sunday, so you can see how much of the week is left.").
6. Names: "You and the leader; tap for the rest (Recommended)" ("Your line and the top line are always named. Tapping or hovering another line names it and lifts it out of the grey.").
7. Text version: "A hidden table of the race (Recommended)". Answer 17 replaces it.
8. Mockup: "mockup page. also for plor tab icons can we extend the box radius on the desktop".

Round 3, the desktop sidebar's corners (answer 8's second half):

9. "Every sidebar box (Recommended)" (the current and hovered tab, Settings and Admin).
10. "Pick in the mockup (Recommended)".
11. "Its own small PR first (Recommended)".
12. On the mockup's corners board: "Keep 4px". Nothing changes and no PR is made, so answer 11 lapses.

On the first mockup:

13. The graph: "i feel like if u have a lot of people tapping lines is a lot harder, maybe u should be able to type in a person and itll automatically show. also im not sure if ia line graph is perfect since there are only 7 days?"
14. How the table should work, given that the WAI Complex Images tutorial says a long description should be "available to everyone": "break it down and tell me". The hint under each graph: "Keep it (Recommended)".

Round 4, after the breakdown:

15. Shape: "Keep the running-total lines (Recommended)" ("Points adding up Monday to Sunday. Shows both who's ahead and by how much. Crowded groups are handled by finding a person.").
16. Finding a player: "Type a name, with suggestions (Recommended)" ("A 'Find a player' field above the graph: type 'fa' and Fay is suggested, then her line lights up and is named. Tapping still works too.").
17. The table: "'Show as table' under each graph (Recommended)" ("A button anyone can open, keyboard included, showing each player's running total by day. Matches WAI."). It's added to SOURCES.md by this answer.

Round 5:

18. "One per card, lights both weeks (Recommended)" ("Finding Fay lights her line in both This week and Last week, so you can compare.").
19. "The site's own, per WAI-ARIA APG Combobox (Recommended)" ("We draw the suggestions in Plor's look and they behave the same in every browser, following the APG Combobox pattern (added to SOURCES.md)."). It's added to SOURCES.md by this answer.
20. "Days so far, scrolls inside its box (Recommended)" ("Rows are players and columns are the days with points so far (4 on a Friday, 7 for last week). If it's wider than the card, it scrolls sideways inside its own box with the name column fixed.").
21. The hint: "\"Tap a line or find a player above.\" (Recommended)". Answer 27 replaces its wording.

The critique: "run impeccable on the graph layout" (answer 22). Impeccable's `critique` ran with two isolated reviewers, a design review and its detector, at 390×844 and 1440×900 in Paper and Night. It scored the mockup **25/40** and named five priority issues:
- the lines' tap areas were about 15px and overlapped (P1);
- the accent meant "you" in Graph but first place in List, and a found player outshone you (P1);
- the suggestion list covered a heading and looked like a second field (P2);
- the card was too tall on a phone and its controls sat far from what they control (P2);
- the axis text rendered at 10.5px, and a tie pushed a name off its line (P3).

After it:

23. Colour: "Accent is you; a found player in ink, thinner (Recommended)" ("Graph keeps your line in the accent. A found or tapped player is drawn in ink at 2px, so you stay the loudest. The leader's end dot gets the List's numbered '1' badge, so first place matches the List in both views. The List itself doesn't change.").
24. Tapping: "The closest line at the tapped day (Recommended)" ("Anywhere on the graph counts. The tap snaps to its day, then picks the line nearest the tapped height.").
25. Layout: "Find under the switch, one hint, table in each week's head (Recommended)" ("Find sits right under List / Graph, so it clearly covers both weeks, with the hint once beneath it. Each week's table toggle becomes a small kit button beside its date chip, and the empty right margin goes when a week ends early.").
26. Scope: "All five issues (Recommended)".
27. The redrawn mockup, with its new hint "Or choose someone's line on a graph. You'll see them in both weeks.": "Approve, write the ticket (Recommended)".

While building, after the Plan's step 1 hypothesis was disproved:

28. A closed day the viewer left mid-run, which can be any earlier day, since a run waiting at a reveal stays in progress until Next (DECISIONS.md, Game 1: Timer; `private.run_status`, `deadline` null): "Flat through it, marked, with a note (Recommended)". The option read: "Every line goes flat across that day (no one gains), the day's name is struck through, and one muted line under the week says 'Wednesday's points are hidden until you finish that run.' The table shows '–' for that day."
29. The mockup's points were samples (weeks of 20 to 38); real weeks reach thousands. Grid steps: "1, 2, 2.5 or 5 × 10ⁿ, at most 4 steps (Recommended)" ("The same family as the mockup's 5, 10, 20, 25, 50, carried on… The smallest that keeps 4 steps or fewer above 0").
30. Long names (usernames run to 20 characters): "Cut at 10 characters with … (Recommended)" ("The right margin grows to fit the widest label, so a short name keeps a short margin.").

Earlier answers this ticket keeps:
- 14b-10's answer 7: every control is 44px.
- Answer 11: your own things take the soft tint.
- Answer 18: menu items are 44px.

## Source
- **WAI Images Tutorial, Complex Images** (https://www.w3.org/WAI/tutorials/images/complex/, "Updated 08 April 2026"):
  - "Overview": a chart needs a short description that names it and a long description that gives its essential information.
  - "Long descriptions": the long description should be available to everyone.
  - "Example 1", Approach 3: the long description as a table beside the chart.

  Each graph's `aria-label` is the short description, and Show table opens the long one (answer 17).
- **WAI-ARIA APG, Combobox pattern** (https://www.w3.org/WAI/ARIA/apg/patterns/combobox/, no date shown, read 2026-10-31):
  - "About This Pattern" item 3, list autocomplete with automatic selection: "the first suggestion is automatically highlighted as selected", and it becomes the value when the field loses focus.
  - "Combobox Keyboard Interaction":
    - Down opens the list or moves into it;
    - Enter accepts the selected suggestion;
    - Escape closes the list, or clears the field if the list was already closed.
  - "Listbox Popup Keyboard Interaction": Down and Up move through the options and wrap, Enter takes the focused one, and Escape closes the list.
  - "WAI-ARIA Roles, States, and Properties":
    - the field has `role="combobox"`, `aria-expanded`, `aria-autocomplete="list"`, `aria-activedescendant`, and `aria-controls` while the list shows;
    - the list is a `listbox` of `option`s, the selected one `aria-selected="true"`.
- **Its example, Editable Combobox With List Autocomplete** (`/examples/combobox-autocomplete-list/`, "Page last updated: 12 August 2025"): the same roles and keys, with suggestions that match the start of the typed text. Its suggestions aren't selected automatically; this ticket follows the pattern's item 3 instead (Source diff).
- **WCAG 2.2**:
  - 1.4.1, use of colour: you are named "You" as well as tinted, and the found player is named;
  - 1.4.11, non-text contrast: lines at least 3:1 against the card;
  - 2.5.8, target size: the whole graph is the tap target, and every control is 44px.
- **M10 10a and 10c, M09 D9 and D5, M12 12d** (`src/friends/leaderboard.ts:1-10`): who's on a board, weeks Monday to Sunday by puzzle day, a day's points only once it's over, a closed day left out of every total while the viewer's own run that day is still going, and a group member's days counted only from the day they joined. Unchanged; the day-by-day points follow the same rules.
- **DESIGN.md** (the kit and colour slots): the card, the switch (`leaderboard.module.css:7-41`), chips, badges, the minor button (`kit.module.css:211-222`), fields (`globals.css:345-361`), `--edge`, `--line`, `--muted`, `--accent`, `--soft`.

## Acceptance criteria
- [x] `/api/leaderboard` and `/api/groups/leaderboard` also send, for each player in each week, their points on each counted day from Monday, so a week's days add up to its total. Same rules as the totals: only days that are over; not a closed day whose own run the viewer is still playing; a group member's days only from the one they joined. Each week also says how many of its days are over and which of them the viewer is still playing. A route db test covers a mid-week day, a member who joined on a Wednesday, and the viewer still playing yesterday.
- [x] A day the viewer is still playing (answer 28): every line is flat across it, its day name is struck through, the table shows "–" for it, and one muted line under the week says "<Day>'s points are hidden until you finish that run." ("<Day> and <Day>'s points … those runs" for two or more).
- [x] The Friends and group leaderboards have a List / Graph switch under their heading: the same radio strip as Today's period switch, List chosen on load. Today's leaderboard card is unchanged.
- [x] In Graph, each week shows its race. For each player:
  - a line through their running total on each counted day, on Monday to Sunday columns;
  - yours 3px in `--accent`, a found player's 2px in `--text`, everyone else's 2px in `--edge`;
  - the leader's end carries the accent "1" badge.
- [x] The labels at the line ends:
  - You, the leader and a found player are named at their line's end with their total.
  - A tie shares one label ("You & Fay 20").
  - A label moved more than 4px from its dot has a tick back to it, and no label leaves the graph.
- [x] The graph is drawn at the width it shows at, so its 12px text measures 12px at 390px and at 1440px. Days read "Mo Tu We…" below 768px and "Mon Tue…" from 768px.
- [x] This week marks today with a dashed `--edge` line and "Today" under it. It keeps room for names past its last day only when the week is over.
- [ ] *(Unverified: the e2e checks it only when run on a Monday; built 2026-10-31, a Saturday)* On a Monday, This week shows "The first points arrive Tuesday, once Monday is over." and Last week shows its finished race.
- [x] A tap or click anywhere on a graph picks the player whose line is nearest to it on that day's column, never yourself. An e2e clicks just off a friend's line and sees them named. Picking the found player again clears them.
- [x] Find a player sits under the switch, with the hint under it. It follows the APG Combobox:
  - typing shows the players whose names start with it (not yourself, any case), the first selected (`aria-activedescendant`);
  - Down and Up move and wrap;
  - Enter, or leaving the field, takes the selected one;
  - Escape closes the list, and a second Escape clears the field;
  - a 44px ✕ clears it;
  - a name that matches nobody says "No player called “…” here."
- [x] Finding a player lights and names their line in both weeks and bolds their table row.
- [x] Each week with a graph has a 44px "Show table" / "Hide table" button beside its date chip, with `aria-expanded`. It opens a table under the graph:
  - a real `<table>` with `<th scope>`, players by place, each counted day's running total;
  - if it's wider than the card, it scrolls inside its own box, with the 96px name column fixed;
  - at 320px and 390px the page never scrolls sideways.
- [x] Each graph is `role="img"`, named "<week>, day by day: <leader> leads with N; you have M." (or "you lead with N").
- [x] `--edge` on `--surface` reaches 3:1 in all five themes, checked by `src/app/colors.test.ts`. If a theme falls short (the critique estimated Ink at about 3.04:1, unverified), stop and ask.
- [x] Nothing in the graph animates (no motion is added).
- [x] DESIGN.md describes the graph, Find and the table, with file and line citations.
- [x] The `reviewer` agent has reviewed the diff.

## Out of scope
- Today's leaderboard card (answer 2).
- Remembering List or Graph between visits: List on every load (answer 3); nothing asked for more.
- Comparing two other players at once, or a day's own points in the table: the table shows running totals (answer 20).
- A rank-by-day chart (answer 15) and bars.
- The desktop sidebar's corners (answer 12).
- The APG pattern's optional Alt+Down and Up-from-closed keys, and matching inside names (the example matches from the start).

## Numbers
Every value below is from the approved mockup unless its row says otherwise. That's the human's private claude.ai page "Plor Leaderboard Graph" (https://claude.ai/artifact/X2izfDnUBedKQQz2GHgheX, version 8, `project/Card.dc.html`), approved 2026-10-31 (answer 27).

| Value | Used for | Origin |
|---|---|---|
| 200px tall below 768px, 230px from 768px; drawn at its own width | The graph | The mockup (326 and 608 wide there: the card's inner width at 390px and in a 640px column) |
| Plot margins: 12 top, 26 bottom; left 26, or the widest axis number plus its 6px gap if wider; right 14, or as much as the end labels need past the last day's line if more (74 in the mockup's finished week) | Room for the axis numbers, day names and end labels | The mockup; answers 25 and 30 ("the right margin grows to fit the widest label") |
| Grid step: the smallest of 1, 2, 2.5 or 5 × 10ⁿ that keeps 4 steps or fewer above 0 | Gridlines in `--line`, numbers in `--muted` | The mockup's 5, 10, 20, 25, 50; answer 29 |
| 10 characters, then … | A name in an end label | Answer 30 |
| 3px `--accent` (you); 2px `--text` (found); 2px `--edge` (others); end dots 3.5 / 3.5 / 2.5 radius | Lines | Answers 4 and 23; the mockup |
| Badge: 8 radius, `--accent` fill, 1.5px `--text` edge, "1" in 11px 800 `--on-accent` | The leader's end | Answer 23 ("the List's numbered '1' badge"); the mockup |
| Labels: 12px, 800 for you or found, else 700; 14 apart at least; tick when more than 4 from the dot; a 4px `--surface` halo; 13 right of the end | End labels | The mockup |
| 12px; "Mo Tu We Th Fr Sa Su" below 768px, "Mon … Sun" from 768px; "Today" 700 in `--text` | Day names | The mockup; the critique's "T and S appear twice" |
| `--edge`, 1.5px, dashes 3 and 4 | The Today line | The mockup |
| 44px field with a 44px ✕; label 14px 700 `--muted`; suggestions 4px below in a 2px ink border with card corners, 44px rows with the 28px initial, 1px `--line` between, the selected one `--soft`; "no match" 14px `--muted`; hint 12px `--muted` | Find a player | The mockup; 14b-10 answer 7 (44px) |
| The minor button (`kit.link`), 44px | Show table / Hide table | Answer 25 ("a small kit button"); the mockup |
| 96px name column, fixed, 1.5px `--edge` right edge; day columns 44px at least; rows 36px; 14px; a 2px ink rule under the header, 1px `--line` between rows | The table | Answer 20; the mockup |
| "Find a player"; "Or choose someone's line on a graph. You'll see them in both weeks."; "No player called “…” here."; "Show table" / "Hide table"; "The first points arrive Tuesday, once Monday is over."; "Today"; "You" | Copy | The mockup (answer 27 approved the hint by name) |
| 3:1 | `--edge` against `--surface` | WCAG 2.2, 1.4.11 |

## Plan
1. **Data, red first.** Write route db tests for the day-by-day points (a mid-week day, a member joining on Wednesday, the viewer still playing yesterday). Expected: they fail (no daily field). Then add each entry's daily points from the same ledger query, one sum per day.
   - *Unverified:* that only yesterday can be left out while the viewer plays (a run is finished after midnight only for the day before). If an earlier day can be left out, stop and ask how the graph shows it.
2. **The theme check.** Add `--edge` on `--surface` at 3:1 to `colors.test.ts` for all five themes. Expected: Paper 3.47 and Night 3.33 pass (the critique measured them); Ink about 3.04 is unverified. Disproved if any theme fails; then stop and ask.
3. **The view, red first.** Write `e2e/leaderboard-graph.e2e.ts` from the criteria: the switch; the lines' colours and badge; labels and ties; 12px text at 390 and 1440; tap nearest; Find's keys and its ✕; the table and its scroll; Monday; no sideways scroll at 320. Expected: it fails at the missing Graph radio.
4. **Build.** A graph component (SVG, drawn at the width a ResizeObserver reports), Find (the APG combobox), and the table, inside `Leaderboard` (`src/app/leaderboard.tsx`). Run the new spec, then the e2e files that open these boards (`live-board`, `groups`, `me`, `calm`, `look`).
5. **Check it.** Screenshots at 320, 390 and 1440 in Paper and Night; Impeccable's `detect` on the built page. Update DESIGN.md.
6. **Review and record.** The `reviewer` agent; fix blocking findings; the Status line, the ROADMAP row and HANDOFF in the PR.

## Removes
- The board query's per-range sums (`totals` in `src/friends/leaderboard.ts`): one query now gives each player's points by day, and each week's and yesterday's totals are summed from it.
- Its in-progress subquery: the viewer's days in play are read once (`playing`) and both leave them out of every total and mark them on the graph.
- Nothing in the view: the graph is a second view of the same board, and the List stays the default (answer 3).

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| APG Combobox example: no suggestion is selected when the list appears | The first suggestion is selected, and Enter or leaving the field takes it | The pattern's item 3, list autocomplete with automatic selection, as the approved mockup draws it |
| Answer 29's option: "the smallest that keeps 4 steps or fewer above 0", with the example "0 / 2500 / 5000 / 7500 for a 6,800-point week" | 2000 for 6,800 (0 / 2000 / 4000 / 6000 / 8000) | The option contradicts itself: by its rule, 2000 is smaller and keeps 4 steps. Claude's example was wrong; the rule is followed, and the human is told |
| The mockup: a 28px initial in each suggestion | The site's avatar slot (`avatar.tsx`), 30px with a 2px ink ring | One way to draw a player's initial |
| The mockup: the table's name column 96px | 96px at least; a longer name widens it | A table column grows to its content; names aren't cut in the table (answer 30 cuts them only on the graph) |
| Plan step 1: only yesterday can be left out while the viewer plays | Any earlier day can be | Disproved by DECISIONS.md, Game 1: Timer and `private.run_status`; the human chose how to show it (answer 28) |

## Evidence
- **The day-by-day data, red first** (2026-10-31): the new assertions in `src/app/api/leaderboard/route.db.test.ts` and `src/app/api/groups/leaderboard/route.db.test.ts` before the query changed → `Tests 7 failed | 7 passed (14)`, each on the missing `daily`, `days` or `hidden` (`expected undefined to deeply equal [ 4 ]` for yesterday as hidden). After: `npx vitest run src/app/api/leaderboard src/app/api/groups/leaderboard --no-file-parallelism` → `Test Files 4 passed (4)`, `Tests 22 passed (22)` (the yesterday board's two files included). After the review's mid-week join test, the group file → `Tests 8 passed (8)`.
- **Plan step 1's hypothesis disproved** by reading, not running: DECISIONS.md, Game 1: Timer ("a run left at a reveal stays in progress until the player taps Next") and `private.run_status` (`deadline` null at a reveal). Stopped and asked (answer 28).
- **Plan step 2:** `colors.test.ts` already checked "the control outline on surface is at least 3:1" in every theme; `npx vitest run src/app/colors.test.ts -t "control outline"` → `Tests 10 passed | 123 skipped (133)` (five themes, two backgrounds), Ink included. A comment now names the graph's lines as its other user.
- **The view, red first:** `npx playwright test e2e/leaderboard-graph.e2e.ts` before building → `2 failed`, at `getByRole('radiogroup', { name: 'View' }).getByRole('radio', { name: 'List' })`: element(s) not found.
- **The layout's unit tests:** `npx vitest run src/app/race-layout.test.ts` → `Tests 16 passed (16)` (two expectations corrected first: Source diff, answer 29).
- **Green:** `npx playwright test e2e/leaderboard-graph.e2e.ts --reporter=line` → `2 passed (14.3s)`, with no `unhandled route error` in the dev server's log. On the way:
  - the tap missed: Last week's graph is below the fold at 390px, so the test scrolls it into view before clicking at its box (hypothesis: off-screen; confirmed by the next run);
  - the 320px check caught the graph one frame before its resize observer redrew it, so that check polls.
- **The e2e files that show the boards:** `npx playwright test e2e/live-board.e2e.ts e2e/groups.e2e.ts e2e/me.e2e.ts e2e/calm.e2e.ts e2e/look.e2e.ts e2e/player-screens.e2e.ts --reporter=line` → `31 passed (6.4m)`.
- **Unit tests:** `npm test` → `Test Files 49 passed (49)`, `Tests 493 passed (493)`. `npx tsc --noEmit -p .` and `npx eslint` on the changed files: no output.
- **Impeccable's detector** on the open Friends page through a DevTools port (a throwaway spec, deleted after): `impeccable detect --cdp 9333 --target friends --json` → `[]` at 390×844 and at 1440×900.
- **Screens** (the same throwaway spec; images in the session's scratchpad, not committed): the Friends leaderboard in Graph with a long-named friend found and Last week's table open, at 390px and 1440px in Paper and Night. The lines, the "1" badge on the leader's end, "You 925" in the accent, "Benedict_l… 500" cut at 10 characters, Today dashed at Saturday and the table's held name column all show as drawn.
- **Nothing animates:** `race.module.css` has no `transition` or `animation`.

## Review
The `reviewer` agent, fresh context, 2026-10-31, on `00a7782`.
- Blocking findings and how each was fixed:
  - The still-playing e2e wrote a made-up answer id, so routes that name answers errored while it passed. It now writes question 1's safe answer (`fixtureId(0, "dog")`); the log shows no route errors.
  - The criterion "a member who joined on Wednesday" had been loosened to "part-way through the week" with no test of a mid-week join. Restored, and a group db test has D join on last Wednesday: last week's days read `[0, 0, 7, 0, 11, 0, 0]`, total 18.
  - The ROADMAP row and HANDOFF still said "waiting to build". Updated in this PR.
  - Evidence and the ticked criteria were missing. Filled in.
  - Answer 29's option contradicted itself (rule and example). Recorded in the Source diff and told to the human.
  - Also from the review: the e2e checks that a found player is named in This week too and that their table row is bold.
- Deferred to ROADMAP "Next revision" (For M14): a tied label wider than the graph at 320px; a full name that's also the start of another; the Find and table spacings' origins; the group board not covered by the graph e2e.
