# M14 14b-7 — Design clear-out: an audit after 14b-6, then a fresh start

**Status:** approved (human, 2026-10-28: "Approve 14b-7 as drafted"); drafted from guided questions answered the same day. Built after 14b-6f, once all of 14b-6 is merged. Since drafting, 14b-6d made Baloo 2 the one font (human, 2026-10-28: "baloo 2"); `DESIGN.md` describes it like the rest of the code.

## Goal
Once all of 14b-6 is merged to `main` (and so deployed to plor.app), remove every mockup, stored critique and record of past or planned look directions from claude.ai and the live docs, and leave one short as-built note, so the next look is designed from what shipped.

## Who uses it / what breaks without it
- Used by: the human, and every later design session (the Impeccable skill included, which reads `DESIGN.md`).
- Breaks without it: HANDOFF and ROADMAP send the next session to build mockup 3's square look and 14c's pixel world, and the old mockups and critique anchor every new round on directions the human has dropped.

## What the human decided (2026-10-28, on the Windows PC, quoted)
1. **Which ticket comes first:** "Yes, 14b-6d (Recommended)". The human wrote "16-d"; 14b-6d is what was meant.
2. **When:** "After all of 14b-6 (Recommended)". 14b-6b to f are built first. The decided but unbuilt square look (handoff item 000: 5px corners, 2px border, 4px ink shadow) is cleared with the rest and not built.
3. **What goes:** "only remove impeccable stuff if it stored information, i like to keep the skill itself to use it again", "claude.ai mockup pages", "Design history in live docs". Rewriting git history was offered and not chosen.
4. **What describes the design afterwards:** "A short as-built note (Recommended)".
5. **Done tickets:** "Leave done tickets alone (Recommended)". Finished tickets are closed records and stay as they are.
6. **ROADMAP's critique items:** "Drop style, keep bugs (Recommended)". The split is shown to the human before anything is deleted.
7. **Which claude.ai pages:** all four, "Plor hard-shadow mockup", "Plor + Offbeat look directions", "Plor shell layout" and "Plor M14 Catch-up".
8. **Where the note lives:** "docs/DESIGN.md (Recommended)".
9. **14c's world:** "Clear it too". The approved direction for the game's world (code-drawn pixel art, the ridge, the Wind, a game look apart from Plor's tabs) is cleared, and 14c starts its guided questions from zero.

## Source
No entry in SOURCES.md covers clearing docs. The sources are the human's answers above and the shipped code, which `DESIGN.md` describes (`src/app/globals.css`, the CSS modules, `src/app/fonts/`, the themes). Nothing in the note may come from a mockup or a ticket's plan, only from the code.

## Scope
1. **claude.ai pages** (permanent; the human confirms each delete):
   - Plor hard-shadow mockup: https://claude.ai/artifact/PuxmXXNxypRTz8uYGQLUK8
   - Plor + Offbeat look directions: https://claude.ai/artifact/NQmsChneJ1uew7mBzHuLvc
   - Plor shell layout: https://claude.ai/artifact/9QkZKZZZsEpCJsDVv7VfGZ
   - Plor M14 Catch-up: https://claude.ai/artifact/4MUzRGRpjJGdJpvXgbjNQW
2. **What Impeccable stored** (untracked, excluded in `.git/info/exclude`):
   - Goes: `.impeccable/hook.cache.json` in `C:/Users/jason/RIFF` (per-file findings by session).
   - Stays: `.impeccable/config.local.json`, which only records the hook's consent, not design information. The audit asks the human whether that counts as stored information.
   - Stays: the skill, `.claude/skills/impeccable/`, and its engine in `~/.impeccable/`.
   - The Mac's critique snapshots (`.impeccable/critique/`) sat in its M14 worktree, which was removed on 2026-10-28, so they are probably gone (*unverified*; the Mac is idle). They are checked when the Mac is next used.
3. **Earlier sessions' temp folders:** the canvas mockups, renders, critique snapshots and screenshots that HANDOFF's Local state (Windows) places in session temp folders outside the repo. They are listed, then removed with the human's OK.
4. **Live docs:**
   - `docs/HANDOFF.md` on `main` and on this branch: the mockup and critique history, and the look notes.
   - `docs/ROADMAP.md`: the M14 row's look-direction clauses, and the style-only items in "For M14" (bugs and accessibility stay; the split is shown first).
   - `docs/milestones/M14-look-and-feel.md`, the parent ticket, still open: its look direction for anything not yet built, 14c's world included (the carried-over D-decisions, the L-rows that set a style rather than record built structure, the reference mockups at `cd03d0f`, and the Status line's mockup links). The audit lists which rows go, and the human approves the list.
   - Closed tickets (14a-1 to 14b-6, 14c-1) are left alone (answer 5).
5. **`docs/DESIGN.md`:** a short as-built note covering the colour slots and the five themes, the fonts and type sizes, corners, borders, shadows, spacing, the breakpoints and the shell's layout. Each value cites its file and line. It gives no rationale and no history. A PR that changes what it describes updates it, which goes in the CLAUDE.md Docs table row.

## Acceptance criteria
- [ ] 14b-6b to 14b-6f are merged (`gh pr list --state merged --search "14b-6"`), and `main`'s head has a successful Vercel deployment (`gh api repos/jasonex64/plor/commits/<sha>/status`; the check's name is *unverified*).
- [ ] `Artifact list` shows none of the four URLs in Scope 1.
- [ ] `.impeccable/hook.cache.json` is gone, and `.claude/skills/impeccable/SKILL.md` is still there.
- [ ] `rg -n -i "mockup|askmoonlit|ink shadow|hard.shadow|critique|nearly square"` over `docs/HANDOFF.md` (both branches), `docs/ROADMAP.md` and `docs/milestones/M14-look-and-feel.md` finds only what the human kept. Each hit that's left is explained in Evidence.
- [ ] Every ROADMAP item removed was on the split the human approved; every bug or accessibility item is still there.
- [ ] `docs/DESIGN.md` exists, each value cites a file and line that holds it, and it is listed in CLAUDE.md's Docs table.
- [ ] The `reviewer` agent has reviewed the diff.

## Out of scope
- Rewriting git history (offered, not chosen). Old ticket text stays reachable in git.
- Closed tickets (answer 5).
- The Impeccable skill and its engine (answer 3).
- Any new look. The next design round starts with guided questions after this ticket.
- Changing the shipped code. `DESIGN.md` describes it and doesn't change it.

## Numbers
None. Every value in `DESIGN.md` is read from the code and cited.

## Plan
1. Inventory (no deletes): the four pages, the Impeccable files, the temp folders, every passage in the live docs, and the ROADMAP style/bug split. Show it to the human and get the go-ahead.
2. Delete the four claude.ai pages, one confirmation each.
3. Remove the Impeccable cache and the listed temp files.
4. Edit HANDOFF, ROADMAP and the parent ticket as approved.
5. Write `docs/DESIGN.md` from the code and add it to CLAUDE.md's Docs table.
6. `reviewer`, then the PR (this ticket's Status and the ROADMAP row in the same PR).

## Removes
- Now (this ticket's drafting commit): HANDOFF item 000's instruction to build mockup 3's look after 14b-6f, its mockup 2 and 3 notes, and item 1's pointer to the parent ticket's 14c direction. They become one pointer to this ticket.
- When built: the four claude.ai pages; `.impeccable/hook.cache.json`; the temp folders' design files; the approved passages in HANDOFF, ROADMAP and the parent ticket.
- `DESIGN.md` is the one addition. It replaces the scattered look notes it is drawn in place of.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
