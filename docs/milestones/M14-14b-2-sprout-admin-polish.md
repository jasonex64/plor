# M14 14b-2 — The sprout, the admin pages and the review items

**Status:** planned (2026-10-26). The guided questions are answered (below); built in three sub-tickets, each its own PR from `m14-look-and-feel`, merged on green CI (human, 2026-10-25: "Merge on green CI (Recommended)"). 14b-2a is drafted here in full; 14b-2b waits on its mockups; 14b-2c's list is ROADMAP's For M14 items.

## Goal
The streak shows as Plor's sprout in the top bar and sidebar; the admin pages get the shell and a designed look; and every review item filed For M14 is closed, so M14's look work ends with an empty list before 14c.

## Who uses it / what breaks without it
- **Used by:** every player (the streak on every page, and the review items they see); the admins, on the six admin pages.
- **Breaks without it:**
  - The streak is one plain text line on Today ("Streak: 4 days played in a row"), while L26 chose "Plor's own symbol", the sprout, growing in stages.
  - The admin pages have no shell and M02's plain styles, while L19 put them in "same pass".
  - 33 review findings filed For M14 stay open.

## What the human decided
Before (M14 ticket):
- **L26:** the streak "should have a little animation or emoji, perhaps increasing with numbers": "Plor's own symbol"; "Streak symbol: sprout."; stages "1–4 sprout, 5–14, 15–29, 30+" (2026-10-24).
- **L19:** the admin pages: "Yes, same pass" (2026-10-24).
- **L37:** a round slot by every name, "Account and sidebar" among the places.

This ticket's guided questions (human, 2026-10-26, on the Mac):
1. **The split:** "Three PRs (Recommended)": 14b-2a the sprout, 14b-2b the admin pages, 14b-2c the review items.
2. **Where the streak shows:** "Top bar and sidebar (Recommended)": the pill as round 7 draws it, on every page; Today's text line goes.
3. **Motion:** "No motion yet": a static sprout; motion comes with 14c (L8's timings).
4. **The admin pages:** "Full redesign, mockups first": each of the six drawn on the canvas for the human's review, then built.
5. **No streak:** "An empty pot, '0' (Recommended)".
6. **The sidebar's slot:** "Yes, in 14b-2a (Recommended)": the avatar slot beside the streak, as round 7 draws it.
7. **The review items:** "All 33": every For M14 item in ROADMAP, so M14 closes with an empty list.
8. **When to draw the admin mockups:** "At home": the next session draws them, after 14b-2a.

## The sub-tickets
| Sub-ticket | What | Needs first |
|---|---|---|
| **14b-2a** | The sprout streak in the top bar and sidebar, and the sidebar's avatar slot | Nothing: drafted below |
| **14b-2b** | The six admin pages (insights, puzzles, bank, base, audit, reports): the shell, and the look the mockups settle | The mockups, drawn on the canvas "Plor shell layout" (https://claude.ai/artifact/9QkZKZZZsEpCJsDVv7VfGZ), and the human's review of them |
| **14b-2c** | Every open For M14 item in ROADMAP at the time it starts (33 on 2026-10-26), each fixed or, where it needs the human, asked | Its ticket lists them; items that need a human answer ("For the human") are asked as guided questions first |

## 14b-2a — The sprout streak

### Source
- **Round 3's board 6**, "Streak symbol candidates", the sprout's four stages (its SVG paths and colours), and **round 7's** pill (`.streak`: the sprout and the number on the soft pill) in the phone top bar beside the gear and in the sidebar under the wordmark, with the avatar slot (`.av`). On the canvas the human approved ("Round 7 looks good", 2026-10-24).
- **WCAG 2.2** (SOURCES.md): 1.1.1 (the sprout is decoration; the pill's text says "N day streak"), 1.4.3 (the number on the soft pill, 4.5:1 in every theme), 1.4.10 (the top bar at 320px).
- The streak's count: `getStreak` (`src/game/streak.ts`, M11 H4), as Today shows it now.

### Acceptance criteria (draft)
1. **The pill.** Below 768px, the top bar shows the streak pill between the wordmark and the gear; from 768px, the sidebar shows the avatar slot and the pill under the wordmark. Its text for screen readers is "N day streak". Checked in an e2e at 360px and 1440px.
2. **The stages.** The sprout is drawn at stage 1 for 1–4 days, 2 for 5–14, 3 for 15–29 and 4 for 30 and up (L26); at 0, the empty pot. Checked by a unit test of the stage choice and an e2e of the pot at 0 and stage 1 after a run.
3. **Today's line goes.** "Streak: N days played in a row" is no longer on Today or the no-puzzle banner.
4. **Every theme.** The number on the soft pill passes 4.5:1 in all six themes (`colors.test.ts` already checks text on the soft pill; it covers the new place).
5. **Static.** Nothing moves (human: "No motion yet").
6. The usual checks and CI pass.

### Open for the build session
- **Where the shell reads the streak.** Today's run state carries it (`/api/run`, which the clock bar already reads); the shell needs it on every page. Choose the one read and say why in the ticket.
- **The sprout's colours.** Round 3 draws them as fixed greens and browns (#8A6A4A, #2E7D4F, #43A866, #5CC27E; at 30+, #6B4F35, #3E9A5E, #E8A0B4). DECISIONS.md, Styling, allows hex values only for a game's own art; the sprout is Plor's. Either slots for them (the same in every theme, like `--offbeat`) or a Styling row change; ask the human if the choice isn't clear from the rule.

### Numbers (from the mockups)
| Value | Used for | Origin |
|---|---|---|
| Stages 1–4, 5–14, 15–29, 30+ days | The sprout | L26, human, 2026-10-24 |
| The pill: Baloo 2 800 at 18px; padding 2px 10px 2px 6px; fully round; the soft colour; a 22px sprout, 4px from the number | The pill | Round 7 (`.streak`) |
| The top bar's right side: the pill and the 44px gear, 6px apart | The phone's top bar | Round 7 (`.me`) |
| The sidebar: the 30px slot and the pill, 10px apart, padding 16px 12px 20px | The sidebar | Round 7, board 3 |

## Out of scope
- Motion for the sprout (14c).
- Real avatars (L37's own ticket).
- 14c's game world.

---
*Each sub-ticket fills in its own Source diff, Evidence and Review, in this file or its own.*
