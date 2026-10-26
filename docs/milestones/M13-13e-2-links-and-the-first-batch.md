# M13 13e-2 — Links and the first batch

**Status:** done (PR #80, merged 2026-10-25 on green CI with the human's OK: "Keep all 27 categories as they are, flagged names included. Merge PR #80 once every CI check is green.").

## Goal
The first batch of 13e (`M13-13e-growing-the-categories.md`): 27 everyday categories from WordNet, each with a bank question, with the links and drafting change they turned out to need.

## Who uses it / what breaks without it
- **Used by:** the drafting session (13d), and every player who meets the questions.
- **Breaks without it:**
  - with the 7 categories of 13e-1, a day can be drafted only once every 30 days;
  - without links, "Name a flower" refuses "tulip", and 13b's facts check rejects it, because WordNet files it under liliaceous plant;
  - with the host answers drawn before the letters, the trial drafts of the 34 bank questions mostly fail (simulated: 4 of 40 days).

## What the human decided (guided questions, 2026-10-25)
| Question | The human's answer |
|---|---|
| What the first batch covers | "Everyday, WordNet only (Recommended)" |
| Related categories (bird under animal) on the same day | "Allow it (Recommended)" |
| Members with a name on the LDNOOBW list | "Flag; you decide each"; on the batch's flags: "Keep all 27 categories as they are, flagged names included" (human, 2026-10-25) |
| How questions are worded | "Friendlier where it fits" |
| Friendly wording wider than the category | "Wording fits category (Recommended)" |
| Answers per bank question | "Like T1: 5–6 and 4–6 (Recommended)" |
| Theme tags | "No tags yet (Recommended)" |
| WordNet leaving common answers out | "Extra roots per category (Recommended)", then, offered the same result without a migration of the category shape, "Links as facts (Recommended)" |
| A link whose word sits above wrong members (pie above shepherd's pie and quiche; juice above gravy) | "Precise, drop the word (Recommended)": link only the right kinds; "pie" and "juice" themselves stay out of the category and the host banks, and wait in the audit when typed |
| Most days can't be drafted | First "Q7 host names 2" (over retrying draws, no vowel at Q7, or a combination); it drafted 8 of 40 simulated days. Then, asked whether the host's range of answers could change: "letters first" (the host draws among its bank answers it can still say), with "Back to 3 (Recommended)" host answers at Q7 |

## Source
- **Open English WordNet** (SOURCES.md, M13 D2): "its tree is linguistic, not scientific". The gaps below come from that.
- **LDNOOBW** (SOURCES.md, M13 13b), through `isListed` (`src/game/misses.ts`).
- **13a** (categories as recipes, the review), **13b** (the facts check, `removed_at`), **13c** (host answers per question, the 3 familiar answers), **13d** (the bank, the draft), **13e-1** (`data/categories.json`).

## Design
1. **Links** (`data/links.json`; migration `20261025074000_links.sql`): reviewed "kind of" facts that fill WordNet's gaps, e.g. tulip → flower, pie → dessert, water → beverage. Each names both things as the base names them; `private.load_links` refuses a wrong name or a cycle and loads nothing then. Links are facts like any other, with origin `ai` (Claude writes them; the human approves by merging) and source_ref `links`, so every walk, the facts check and a day's fixed answers see them from when they were added. `npm run base -- load all` loads them after the sets and before the categories. 88 links in this batch, after the review narrowed seven too-broad ones to their right kinds.
2. **The review** flags members with an alias on the LDNOOBW list, for the human to decide per category.
3. **27 categories** in `data/categories.json` and **27 bank questions** in `content/bank.json` (5–6 common and 5 uncommon answers each, by name or `#<thing id>` where a name has several meanings). Card and board games were left out: their top answers (Clue, Risk, War, Snap; "uno" even names hassium) have other senses in the base, so the facts check would reject them. They fit the later Wikidata pop-culture imports better. Three roots were changed after the review samples: color (the full "color" sense, not chromatic color, which leaves out black and white), headwear (headdress, since WordNet's hat leaves out caps) and footwear (shoe leaves out boots and sandals).
4. **Letters first** (`scripts/draft.ts`, `withHosts`): the draft picks the letters, and for each choice draws each question's host answers among its bank answers whose main names avoid the letters stolen so far, still at random and the same for a date every time. Before, the hosts were drawn first and the letters had to fit around them. The host count stays 1, 1, 1, 1, 2, 2, 3 (13c). T1 stays as drafted: it passes the same rules.
5. **Lists written so no host answer sits above another familiar answer:** the host catches everything under what it names, so "shoe" as a host caught six of footwear's familiar answers. The scratch check that found these (13 questions) isn't in the repo; a check in the draft is a Next revision item.

## Acceptance criteria
- [x] `npm run base -- load all` loads the links and defines 34 categories; `npm run base -- review` on the 27 shows each count (all at least 10) and its flags.
- [x] `private.load_links` refuses a wrong name and a cycle, and loads a link once (`supabase/tests/links.test.sql`).
- [x] Every bank answer resolves to one member (the draft resolves them all in the trial drafts).
- [x] Trial drafts: 2026-10-26, 10-27 and 10-28 draft from the new questions, 10-29 stops on the 30-day gap ("1 more needed"), 11-24 drafts; the files are deleted after.
- [x] The full-day simulator drafts most days with letters first, against 4 of 40 before.
- [x] `npm test`, `npm run lint`, `npx tsc --noEmit -p .`, `npm run test:db`, `npm run test:sql`, `npm run test:e2e`, `npm run content:validate` and CI pass.

## Out of scope
- Removing a link once loaded (none needed yet; a wrong link is a Next revision item).
- Aliases WordNet lacks ("sourdough" names only the leaven), and answers absent from the base (13b's misses add those).
- Card and board games, places and pop culture (later batches).

## Numbers
| Value | Used for | Origin |
|---|---|---|
| **5–6** common, **4–6** uncommon answers | Bank questions | Human, 2026-10-25: "Like T1: 5–6 and 4–6 (Recommended)" |
| **10** members at least | Every category | 13e (human, 2026-10-24) |
| **27** categories | This batch | Within 13e's 20–30 (human, 2026-10-24) |

## Removes
- Drawing the host answers before the letters (`draft()` now draws them per letter choice, through `withHosts`), and the host names in the draft's "no letters fit" message, which no longer has one draw to name.
- `src/game/misses.ts`'s `@/` imports (relative now, so the review script can use `isListed`: one held-word check).

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| WordNet's tree (SOURCES.md: "linguistic, not scientific") | 88 links add kind_of facts WordNet lacks (tulip → flower) | WordNet files common answers outside the everyday category (tulip under liliaceous plant); the human chose links (human, 2026-10-25) |
| 13c: host answers drawn at random from the host bank, then letters | Letters first: hosts drawn at random among the bank answers the letters leave sayable | Hosts drawn first left 4 of 40 simulated days draftable; the human chose the host's range (2026-10-25) |
| 13e: 20–30 categories a batch, mostly WordNet | 27 WordNet categories; card and board games left out | Their top answers have other senses in the base, which the facts check would reject |

## Evidence
**Local stack, 2026-10-25.**
- `npm run base -- load all`: `LINKED data/links.json: {"added":18,"links":88}` (the 70 kept links were already loaded; the first load gave `{"added":77,"links":77}`), `DEFINED 34 categories from data/categories.json`.
- `npm run base -- review` on the 27: vegetable 186, dessert 137, beverage 392, bread 114, sauce 83, candy 81, cake 104, soup 49, pasta 28, bird 1,284, fish 863, insect 552, snake 216, rodent 177, tree 1,018, flower 605, musical_instrument 170, furniture 215, tool 400, kitchen_utensil 98, home_appliance 96, clothing 587, headwear 99, footwear 57, jewelry 47, vehicle 552, color 147 members (before the review's narrowing of seven links; all well over 10). **LDNOOBW flags, for the human to decide per category:** dessert 1 (spotted dick), cake 1 (Twinkie), bird 11 (cock, turkey cock, blackcock, cock of the rock, gamecock, titmouse "tit", blue tit, bushtit, …), fish 3 (fluke "butt", slippery dick, tuna "bastard albacore"), insect 1 (a racial slur in an ant's old name), rodent 1 (nude mouse), tree 7 (pussy willow, golden shower tree, a racial slur in a pepper's old name, bastard lignum vitae, poon, …), clothing 2 (panties, panty girdle), vehicle 1 (destroyer escort).
- `supabase/tests/links.test.sql` (8 tests) in `npm run test:sql`: `Result: PASS`, 345 tests in 21 files.
- Trial drafts (files deleted after): 2026-10-26 `letters Q2 M, Q4 G, Q5 T, Q7 I`; 10-27 `Q2 G, Q4 B, Q5 N, Q7 O`; 10-28 `Q2 C, Q4 M, Q5 S, Q7 O`; 10-29 `only 6 bank questions ask a category not used within 30 days; 1 more needed`; 11-24 `Q2 U, Q4 D, Q5 T, Q7 I`. Before letters first, all five failed on letters (`no letters fit schedule A`).
- The full-day simulator (a scratch script calling `draft()` for 40 dates three days apart in 2027, no files, no gap between them): hosts drawn first, **4 of 40**; with 2 hosts at Q7 instead, 8 of 40; **letters first with the final lists, 31 of 40**. The 9 failures all block at Q7: soup 4, jewelry 2, footwear 2, cake 1.
- `npm test` 223 passed, `npm run lint` 0 errors, `npx tsc --noEmit -p .` clean, `npm run test:db` 234 passed, `npm run test:sql` PASS (345), `npm run test:e2e` 15 passed (after `e2e/bank.e2e.ts` counted the bank's questions instead of a fixed 7), `npm run content:validate` OK. CI: PR #80's runs 40180028078 (pull_request) and 40180025398 (push) on `4730464` passed every check (check, db, e2e, secrets, Vercel); merged as `c91f9d8`.

## Review
**Reviewer agent, fresh context, 2026-10-25.**
- Blocking findings and how each was fixed:
  - the pie, chocolate and juice links pulled in wrong members (quiche as a dessert, cocoa butter as a candy, gravy as a drink): narrowed by the human's "Precise, drop the word (Recommended)", along with corn, dryer, heater and cupboard. The old links were deleted from the local database by hand, and "pie", "juice", "corn" and "dryer" left the lists;
  - HANDOFF's contradicting migration lines: fixed;
  - this Evidence: filled.
- Fixed too: the `withHosts` test now compares the draws with `pickHosts`; `parseLinks` requires refs as "source:id".
- Deferred to ROADMAP "Next revision" (For M13, "From 13e-2's batch"): the borderline shelf and water links; the four weak Q7 lists; the soft guide's order measure over the whole host bank; no test of a refused batch leaving earlier links unloaded (statement atomicity covers it).
- The reviewer ran `npx vitest run src/game` by mistake, which includes db tests, against the shared stack during the M14 session's run; that session's run passed (27 of 27).
