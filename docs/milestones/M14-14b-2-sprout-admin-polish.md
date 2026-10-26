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
| **14b-2a** | The streak in the top bar and sidebar as ranks of flowers, `/streak`, and the sidebar's avatar slot | Nothing: its own file, `M14-14b-2a-streak-ranks.md` |
| **14b-2b** | The six admin pages (insights, puzzles, bank, base, audit, reports): the shell, and the look the mockups settle | The mockups, drawn on the canvas "Plor shell layout" (https://claude.ai/artifact/9QkZKZZZsEpCJsDVv7VfGZ), and the human's review of them |
| **14b-2c** | Every open For M14 item in ROADMAP at the time it starts (33 on 2026-10-26), each fixed or, where it needs the human, asked | Its ticket lists them; items that need a human answer ("For the human") are asked as guided questions first |

## 14b-2a — The streak ranks
Its own file, `M14-14b-2a-streak-ranks.md`: the build session's guided questions turned the sprout into six streak ranks, each a vector flower (Seed, Daisy, Morning glory, Hibiscus, Lotus, Sakura), shown in the pill and explained on `/streak`.

## Out of scope
- Motion for the streak's symbol (14c).
- Real avatars (L37's own ticket).
- 14c's game world.

---
*Each sub-ticket fills in its own Source diff, Evidence and Review, in this file or its own.*
