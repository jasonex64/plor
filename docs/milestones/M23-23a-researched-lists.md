# M23 23a — A researched list's format and its way into the database

**Status:** designed 2026-11-23 from answers 17 to 24 in `M23-offbeat-on-a-clock.md`; **not approved to build**. Nothing is built.

## Goal
An everyday question's answers come from one file in git that a person can read and edit, and the game judges against exactly that file.

## Who uses it / what breaks without it
- Used by: the research agents (23b) that write lists, the human who strikes borderline answers, every Offbeat player whose answer is judged.
- Breaks without it: 23b has nowhere to put a list, and the three pilot lists can't be played. Today "king" is refused as a bed and "tortilla" accepted as a cake.

## Source
- The human's answers 1, 2 and 17 to 24 (the M23 ticket), and the pilot.
- `docs/DECISIONS.md`: "Answer database imports" (line 41), "Answer model", "Accepted answers" (line 68), "Resolving typed text" (line 72). This sub-ticket changes the first two; the third is untouched.
- `docs/SOURCES.md` gains a row, by answer 18 ("Yes; no links kept"): *Web research by Claude's agents (M23)*, authoritative for the members, typed forms and starting tiers of an everyday question's list; pinned by the list file's commit, since no links are kept.
- How answers are stored and judged today: read by an Explore agent, 2026-11-23 (its report is summarised under Design). **Unverified by this session:** the bodies of `private.import_source` and `private.define_category`; step 1 of the plan reads them.

## Assumptions
1. A researched list replaces a category's membership **from the day it is loaded**; days already played keep the answers they were judged on (the base keeps each fact's dates, and judging reads the base "as of the day's start").
2. An answer on a researched list is its own entry in the database, not joined to the WordNet entry of the same name. So "sponge cake" on the cake list and WordNet's "sponge cake" are two entries until cross-question linking is built (out of M23's scope, the human: "later").
3. Big factual sets (animals, countries, video games) do not use this file: their researched nicknames go through `data/names.json`, the way names are already added to existing things. One way to do each thing.
4. Play taking over a tier (answers 21 and 22) is worked out when a day is drafted, so it is built in 23e. 23a only stores the researched tier.

## Design
**The file:** `content/lists/<category key>.json`, one per everyday question's category.

```json
{
  "format": 1,
  "category": "bed",
  "passes": 1,
  "borderline_seen": null,
  "answers": [
    { "name": "king bed", "aliases": ["king", "king size"], "tier": "common" },
    { "name": "Tempur-Pedic", "aliases": ["tempurpedic"], "tier": "rare", "brand": true },
    { "name": "flower bed", "aliases": [], "tier": "rare", "borderline": true }
  ]
}
```

- `tier` is common, uncommon or rare. The pilot's "first10" becomes common, listed first.
- `brand` and `borderline` are for the human's review only; the game treats such an answer like any other (answers 20 and 23). Striking an answer is deleting its line.
- `passes` (0, 1 or 2) and `borderline_seen` (a date or null) are what answer 15's "fully researched" is checked against in 23e.
- No links (answer 18). An old member judged out is simply not in the file.
- A validator (`npm run content:validate`) refuses: two answers in one file sharing a typed form after normalization, an empty name, an unknown tier, a category not in `data/categories.json`.

**Into the database, through the tree that already exists.** Membership today is "every thing under the category's root". A researched category gets a root of its own and each answer becomes a thing directly under it, so judging, typo matching, search, the admin's pool and the miss audit all work unchanged, with no second membership rule.
- `data/categories.json`: the category's entry changes from `"source": "oewn", "root": "<synset>"` to `"source": "research", "root": "<key>"`.
- `npm run base -- load research` reads every file in `content/lists/` and loads it through `private.import_source`, like any other set; `load all` includes it. Aliases are stored with origin `ai`.
- One migration: `'research'` joins the allowed values of `private.thing_source.source`. No grant, role or policy changes, so this is not a security change.
- The hosted database gets it the usual way, by the human's own `npm run base -- hosted load`, and not before the switch (23f).

**Tiers** stay where the game reads them today: in the day's `levels`, written when a day is drafted. The draft takes them from the list file (23e).

## Acceptance criteria
- [ ] The three pilot lists exist as `content/lists/bed.json`, `acid.json` and `cake.json` and pass the validator (`npm run content:validate`).
- [ ] After `npm run base -- load all` on the local stack, each of the three categories has exactly its file's answers as members (db test comparing `private.category_members` with the file).
- [ ] king, twin, citric, nitric, bundt and chocolate are accepted for their questions; tortilla, dog biscuit, lansoprazole and couch are refused (db test through `private.resolve_draft_answer`).
- [ ] A day approved before the load still judges by its old answers (db test: approve a day, load, resolve against that day).
- [ ] The validator refuses each bad file named above (unit tests, one per refusal).
- [ ] `plor_app`'s grants are unchanged (`supabase/tests/plor_app_role.test.sql` passes untouched).

## Out of scope
- Researching more questions, the second pass, the borderline review (23b).
- Tiers from play (23e). The numbers are recorded in the M23 ticket, answers 21 and 22.
- Joining a researched answer to the same thing in another category.

## Numbers
None new.

## Plan
1. Read `private.import_source`, `private.define_category` and `loadSet` → verify: a note in this ticket's Evidence of what each requires of a new source (a manifest, a snapshot, a check on `source`), and the design corrected if one of them rules it out.
2. Write the validator's failing tests, then the validator → verify: `npx vitest run scripts/content-validate.test.ts`.
3. Convert the three pilot files to the format → verify: `npm run content:validate`.
4. Write the failing db tests (criteria 2 to 4) → verify: they fail for the stated reason.
5. The migration, the `research` set in `scripts/base.ts`, the three `categories.json` entries → verify: `npm run base -- load all`, then the db tests and `supabase test db` pass.
6. SOURCES.md row; DECISIONS.md "Answer database imports" and "Accepted answers" rewritten for researched categories → verify: the `reviewer` agent's report.

Hypothesis for step 5: a category whose root is a research thing needs no change to `resolve_in` or `category_members`. Wrong if either reads `thing_source` or assumes a WordNet root; then the design is re-planned, not patched.

## Removes
- The WordNet roots of bed, acid and cake in `data/categories.json`.
- `docs/research/research_notes/m23-pilot-*.json`, replaced by the three list files (their links are not kept, answer 18).

---
## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
