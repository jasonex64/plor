# M14 14b-9 — The Insights chart's axis fits its chart

**Status:** approved (human, 2026-10-29: "Draft a ticket for the Insights chart axis bug (P1) and fix it now; put the rest in ROADMAP For M14"); done (PR #136, merged 2026-10-29 on green CI).

## Goal
The Insights chart's axis shows at most six labels, each at the height of the rate it names, so the bars can be read against it on any day.

## Who uses it / what breaks without it
- Used by: the admins, reading how each question's catch rate compares with the Gentle target before approving more days.
- Breaks without it: the axis prints a label every 5% up to the day's highest rate (`src/app/admin/insights.tsx:115-117`) and spreads them through a 220px row (`insights.module.css:24-38`). Past about 55%, the labels need more height than the row: they spill under the chart, over its legend and the table, and the scale no longer matches the bars. In the Impeccable audit (2026-10-29), a 50% bar read as about 75% at 390px and at 1440px.

## What the human decided (2026-10-29, on the Windows PC, quoted)
1. **How the axis labels its scale:** "Step grows, ≤6 labels (Recommended)", whose option said: "The scale still reaches the highest rate or target. The step is 5%, 10% or 25%, whichever keeps the labels at round 10's 6 or fewer (a 20% day: 0–20 by 5; a 100% day: 0–100 by 25). Low days keep their detail; the label count changes with the day."

## Source
No entry in SOURCES.md covers the chart. Its sources are round 10's drawing, as 14b-2b-2 recorded it (`docs/milestones/M14-14b-2b-2-admin-build.md`, Numbers and Source diff: the chart 220px tall, the axis to 25% by 5%), and answer 1 above. Round 10's page was deleted in 14b-7.

## Acceptance criteria
- [x] The step is the smallest of 5%, 10% and 25% that keeps the axis to six labels or fewer, and the scale's top is the highest rate or target rounded up to that step: a unit test covers a quiet day (5%), a middling one (10%), a full catch (25%) and a step's edges.
- [x] On a day a question catches 100%, the axis reads 100%, 75%, 50%, 25%, 0%; each label's middle is level with its rate's height in the plot (within 1px), and every label is inside the chart's card and no lower than the chart's foot (its question labels' row), so none reaches the legend or the table: an e2e at 390×844 and 1440×900.
- [x] `npm test`, the e2e files that open Insights (`admin-area`, `look`) and `npx tsc --noEmit -p .` pass.
- [x] `docs/DESIGN.md` is checked: it doesn't describe the chart, so it doesn't change (CLAUDE.md, Docs).
- [x] The `reviewer` agent has reviewed the diff.

## Out of scope
- The other findings of the Impeccable audit (2026-10-29): in ROADMAP's For M14 (human, 2026-10-29: "put the rest in ROADMAP For M14").
- The chart's look (height, bars, target line, legend), grid lines, and the For M14 item on explaining "Gentle target" and the empty chart.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 5% | The finest step | Round 10's axis (14b-2b-2, Source diff: "rounded up to the next 5% (round 10's step)") |
| 10%, 25% | The coarser steps | Human, 2026-10-29, answer 1 |
| 6 labels at most | When to take a coarser step | Round 10's axis, 0–25% by 5% (14b-2b-2, Source diff); human, 2026-10-29, answer 1 |
| 220px | The plot's height, unchanged | Round 10 (14b-2b-2, Numbers) |

## Plan
1. Move the scale into a pure function, `src/app/admin/axis.ts`, with a unit test (`axis.test.ts`).
2. Place each label at its rate's height in the axis column (absolutely, centred on the value) instead of spreading them with `space-between` and the 6px nudge.
3. An e2e in `e2e/admin-area.e2e.ts`: an admin caught at question 1 today (1 of 1, 100%) opens Insights at both sizes and measures the labels against the plot. Expected: five labels, each level with its height; it would be disproved by any label more than 1px off, outside the card, or below the chart.

## Removes
- The axis's flex column, `justify-content: space-between`, `text-align: right` and `transform: translateY(6px)` (`insights.module.css`), and the scale's `STEP` and two lines in `Chart` (`insights.tsx:113-117`), which move to `axis.ts`.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| Round 10's axis: 0–25% by 5% (14b-2b-2 kept 5% steps to any height) | Steps of 5%, 10% or 25%, the smallest that keeps six labels or fewer | Answer 1: a day can catch up to 100%, and 21 labels don't fit 220px |
| Round 10's labels spread down the axis | Each label placed at its rate's height | So the scale matches the bars on every step |

## Evidence
### 2026-10-29, the Windows PC (`C:/Users/jason/RIFF-m14`, local stack)
- **Found by** the Impeccable audit of every screen (2026-10-29, its one P1): at 390×844 and 1440×900, an admin's 100% day drew 21 labels from 100% down past the 220px plot, over the legend and the table; the 50% bar read as about 75%.
- **Criterion 1:** `npx vitest run src/app/admin/axis.test.ts` → 1 file, 3 tests passed (20 and 25 by 5%; 26 → 0–30 by 10%, 50 by 10%; 51 → 0–75 by 25%, 100 by 25%).
- **Criterion 2, red first:** the new test on the old chart code (`git stash` of `insights.tsx` and `insights.module.css`) failed at the label list: received 100%, 95%, 90%, … 0% (16 more than expected). On the fix, `npx playwright test e2e/admin-area.e2e.ts` → **4 passed** (36.6s). The test's first version also failed with the fix, on "inside": it wanted every label above the question labels' row, but that row is in the other columns, and the 0% label's lower half (6px, half its 12px line) reaches into it beside them. The check was wrong, not the chart, so it now asks for every label inside the card and no lower than the chart's foot, which the old bug broke. The card, seen at both sizes (a screenshot line added for one run and removed): 100%, 75%, 50%, 25%, 0%, with the 100% bar's top level with "100%" and each target dash at its height.
- **Criterion 3:** `npm test` → 47 files, **473 passed**. `npx tsc --noEmit -p .` and `npx eslint src/app/admin e2e/admin-area.e2e.ts` → clean. `npx playwright test e2e/admin-area.e2e.ts e2e/look.e2e.ts` → `look.e2e.ts`'s 7 passed (the admin area's card and sub-tab in the kit among them).
- **Criterion 4:** `rg -n -i "insights|chart" docs/DESIGN.md` → nothing; `DESIGN.md` doesn't describe the chart, so it doesn't change.

## Review
### The `reviewer` agent, fresh context, on the uncommitted diff over `0c8743f`
- Blocking findings and how each was fixed:
  1. `docs/HANDOFF.md` still said 14b-7 was in review and named neither the audit nor 14b-9: rewritten in this PR.
- Fixed with it: the new controls-under-44px item in ROADMAP pointed at "the item above" for the friends list's minor buttons, which is the 404 item; it now names the item it means.
- Checked and found right: `axisScale` for every reachable highest value (20 to 100), the label and bar heights measured against the same 218.5px padding box, and the e2e catching the old bug.
- Deferred to ROADMAP "Next revision": a bar can draw about 1.7px above the plot when its raw rate is just over the rounded scale's top (predates 14b-9).
