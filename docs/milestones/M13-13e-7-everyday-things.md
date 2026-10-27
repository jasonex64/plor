# M13 13e-7 — Everyday things

**Status:** in progress (2026-10-27, overnight): built under the human's overnight rules (HANDOFF, "Overnight rules"); no PR yet.

## Goal
27 more categories of everyday things from WordNet, each with a bank question, toward 13e's 210 (101 before this batch).

## Who uses it / what breaks without it
- **Used by:** the drafting session and every player: more categories let the draft fill a day without repeating one within 30 days (13d).
- **Breaks without it:** the bank stays at 101 categories, half of 13e's 210, so days repeat categories inside the 30-day gap once drafting runs daily.

## What the human decided
Before sleeping, 2026-10-27 (HANDOFF, "Overnight rules"), asked by Claude:
| Question | The human's answer |
|---|---|
| Which kinds for tonight's batches | "Everyday things (Recommended), Knowledge" |
| Merging while the human sleeps | "Merge each on green, keep going" |
| The review's flags | "Today's rules, unclear ones wait (Recommended)" |
| A new category inside an old one (berry in fruit) | "Allow, never the same day (Recommended)" |
| Alcohol categories | "Include them" |
| How far | "Keep going toward 210" |
| A category without 6 familiar host answers, or one blocking the simulator | "Drop it from the batch (Recommended)" |

## Source
- **SOURCES.md, Open English WordNet (M13, D2):** each category is a WordNet branch already loaded by `oewn-nouns`, defined in `data/categories.json` (13e-1).

## Design
1. **27 WordNet categories**, each with 10+ members and a bank question (6 host answers, 6 uncommon, each naming one member; a name fitting two senses given by ID):
   - room, building, meat, herb, berry, nut, breakfast food (cereals and porridges), salad, bag, sports equipment, sandwich, hairstyle, stew, shop, restaurant, lamp;
   - within an old category: aircraft and kind of car (vehicle), knife (tool), beer, wine, cocktail and liquor (beverage), chair (furniture), coat or jacket and dress (clothing);
   - within a new one: sausage (meat).
2. **`within`** in `data/categories.json` (the human's "Allow, never the same day"): a base category inside an older one names it; `familyOf` gives both one family, so a day never asks both, and `load all` checks the root sits under the other's (fails loudly if not).
3. **Left out** (the human's rules): toy and cosmetic (WordNet's toys include sex toys and a racist caricature, its cosmetics blackface: unclear for an all-ages game, so left for the human); cookie and ship (each inside two old categories, which one `within` can't keep apart); condiment (it holds the old sauce category); pastry (19 members shared with dessert without being inside it).

## Acceptance criteria
- [x] 27 categories defined, each with 10+ members and a bank question; `npm run content:validate` OK.
- [x] Each `within` checked by `load all`; `familyOf` keeps a category and its `within` off one day (unit test).
- [x] The review's flags handled by the overnight rules; unclear ones listed in the PR.
- [x] Each new question drafts in a trial day; the simulator drafts 39 of 40 or better (40 of 40).
- [ ] `npm test`, `npm run test:db`, `npx supabase test db`, `npm run test:e2e` pass.

## Out of scope
- Knowledge categories (13e-8); toy and cosmetic (for the human).

## Numbers
| Value | Used for | Origin |
|---|---|---|
| 10 members | The smallest category | 13e: the human, "10 members" |
| 20–30 a batch | Batch size | 13e: "Batches with flags (Recommended)" |
| 6 host answers | A question's host bank | The human, 2026-10-27: "Drop it from the batch" if a category can't get 6 |

## Removes
- Nothing: it adds categories. The review's two room senses are marked reviewed.

---

## Source diff
| Source says | We built | Why different |
|---|---|---|
| — | `within` on base categories | The human's overlap answer; subsets already shared a family through `of` |

## Evidence (2026-10-27, overnight, the Windows PC)
- **Categories:** `npm run base -- load all` → "DEFINED 128 categories"; every `within` passed the root check. Members: room 194, building 269, meat 200, herb 42, berry 22, nut 30, breakfast food 19, salad 19, bag 60, sports equipment 110, sandwich 18, hairstyle 23, stew 29, shop 51, restaurant 23, lamp 35, aircraft 60, car 41, knife 34, beer 21, wine 69, cocktail 27, liquor 46, chair 37, coat 55, dress 22, sausage 18.
- **Bank:** 27 questions; every answer checked to name one member (a check query); "bathroom" and "closet" by ID (each also names a toilet room); `npm run content:validate` → "CONTENT OK".
- **Review:** shared bank answers: room's "bathroom" and "closet" (WordNet senses), marked reviewed; LDNOOBW: "butt pack" (fanny pack) and "butt" (an archery target), real names, kept.
- **Trial drafts:** all 27 draft (each with tree, color, fruit, weather, candy and boat), files deleted after.
- **The simulator:** `npm run draft -- simulate` → **`DRAFTED 40 of 40; subset questions 106 of 280`** (39 before; the V flower's day now drafts too).
- **Suites:** `npm test` 416; `npm run test:db` 266; `npx supabase test db` 28 files, 435, PASS.

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
