# M14 14b-5 — The fonts committed, loaded with next/font/local

**Status:** in review (2026-10-27), in its PR from `m14-look-and-feel`. Built from the human's answers without a separate draft approval, to be merged on green CI (human, 2026-10-25: "Merge on green CI (Recommended)").

## Goal
The shell's two fonts are files in the repo, loaded with `next/font/local`, so a build or dev server never downloads them from Google.

## Who uses it / what breaks without it
- **Used by:** every build (CI's, Vercel's, and each local `npm run dev` and `npm run build`), and so every page.
- **Breaks without it:** `next/font/google` downloads the font files from fonts.gstatic.com when it builds. When that download fails, the build dies with "Can't resolve '@vercel/turbopack-next/internal/font/google/font'". It has happened three times (ROADMAP, For M14):
  - PR #95's build, run 40421607596;
  - PR #102's e2e dev server, run 40478398658;
  - PR #108's push-run build, run 40581533101, job 122461900255.

  Each passed on a rerun, but every one is a red CI run that blocks auto-merge until someone notices.

## What the human decided
The task (human, 2026-10-27, relayed by the M13 session, quoted): "Send the font fix to the M14 session: commit the font files and switch to next/font/local, with its own ticket and guided questions."

This ticket's guided questions (human, 2026-10-27, on the Mac):
1. **The files:** "Latin, as today (Recommended)": Baloo 2 at 800, Latin (18.6 KB), and DM Sans, Latin, the one variable file Google serves for 400 and 700 (37.0 KB). Pages look exactly as now.
2. **The download and the source:** "Yes, download and add (Recommended)": the two files from fonts.gstatic.com, the files the build fetched, and the two OFL.txt licences from github.com/google/fonts (`ofl/baloo2` at `c133902`, `ofl/dmsans` at `5b35b72`); Google Fonts added to SOURCES.md.
3. **The OFL's credit:** "Licence files only": each font's OFL.txt committed beside it, and nothing added to the site.
4. **Where:** "src/app/fonts/ (Recommended)", beside `layout.tsx`, as the Next.js docs' own example.

## Source
- **Next.js 16.4.2 bundled docs** (SOURCES.md, Next.js row, the fonts pages): `01-app/01-getting-started/13-fonts.md`, "Local fonts" (`localFont` from `next/font/local`, `src` resolved relative to the calling file, an array of `{ path, weight, style }` for one family in several files, fonts co-located in `app/`); `03-api-reference/02-components/font.md`, `src`, `weight`, `display` (default `swap`) and `variable`.
- **Google Fonts** (SOURCES.md, new row): the Latin files the CSS API serves for `Baloo 2:wght@800` and `DM Sans:wght@400;700`, and each family's OFL.txt in github.com/google/fonts.
- DECISIONS.md, Styling: the fonts as CSS variables (`--font-heading`, `--font-body`), unchanged.

## Acceptance criteria
1. **The files are in the repo.** `src/app/fonts/` holds `Baloo2-800-latin.woff2` (18,612 bytes, SHA-256 `05dada34…aa6f4`), `DMSans-latin.woff2` (36,980 bytes, `468d56b6…002fb`), `OFL-Baloo2.txt` and `OFL-DMSans.txt`. `.gitattributes` marks `*.woff2` binary.
2. **Loaded locally.** `src/app/layout.tsx` uses `next/font/local` with the same variables, weights and `display` as before: Baloo 2 at 800 as `--font-heading`; DM Sans at 400 and 700 from its one file as `--font-body`. No file in `src` imports `next/font/google`.
3. **No download from Google.** After `npm run build`, nothing in `.next` names fonts.gstatic.com or fonts.googleapis.com, and `e2e/shell.e2e.ts`'s check that no page requests them still passes.
4. **Nothing looks different.** The pages use the same families and weights: `e2e/shell.e2e.ts` checks the heading's computed font-weight (800); that its family's one `@font-face` is the Baloo 2 file at 800, and the body's are the DM Sans file at 400 and 700; and that each of those faces loads.
5. `npm run lint`, `npx tsc --noEmit -p .`, `npm test`, `npm run test:e2e`, `npm run build` and CI pass.

## Out of scope
- Latin Extended and other scripts (the human chose "Latin, as today").
- A credit on the site (the human chose "Licence files only").
- Young Serif and 14c's fonts: added by the ticket that first uses them, the same way.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| Baloo 2 800; DM Sans 400 and 700 | The fonts' weights | L4 (human) and 14a-1's Numbers, unchanged |
| Latin only | The files | The human, 2026-10-27: "Latin, as today (Recommended)" |
| `display: swap` | Both fonts | `next/font`'s default, as before |

## Plan
1. **Tests first:** `e2e/shell.e2e.ts`'s font case gets the computed family and weight checks, seen passing on today's `next/font/google` build. They guard that nothing changes, so they pass before and after. What would show the swap went wrong: either check failing after it.
2. The files are committed, with `.gitattributes`' `*.woff2 binary`.
3. `layout.tsx` moves to `next/font/local`. DM Sans gets two `src` entries on the one file, for 400 and 700, as Google's CSS declares them.
4. DECISIONS.md: the Styling row and a Log entry. SOURCES.md: the Google Fonts row. ROADMAP: the build-failure item ticked.
5. Build; grep `.next`; the e2e; reviewer; PR.

**Hypothesis for step 3:** `next/font/local` reads the files at build time and requests nothing over the network, so the build's output names no Google host. What would disprove it: either host appearing in `.next` after a clean build.

## Removes
- `next/font/google` and its build-time download from fonts.gstatic.com.
- The Styling row's "fonts through `next/font/google`, self-hosted".

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| The docs' variable-font example gives one `src` and a weight range | DM Sans as two `src` entries on the one file, 400 and 700 | Google's CSS declares exactly those two weights for this file; the same two faces as before, nothing wider |
| The OFL asks for the copyright and licence with redistributed fonts | `OFL-Baloo2.txt` and `OFL-DMSans.txt` beside the files; `.gitattributes`' `* text=auto eol=lf` stores DM Sans's licence with LF line endings, not its upstream CRLF | The text is unchanged; only its line endings, by the repo's rule for text files |
| Google's CSS gave each Latin face a `unicode-range` | `localFont` declares none | The files hold only Latin glyphs, so other characters fall back to the next font as before; noted after the review |
| `next/font/google` picked each font's own fallback metrics | `next/font/local`'s default, `adjustFontFallback: 'Arial'` | Both are metric-adjusted Arial for the moment before the font loads; noted after the review |
| — | Criterion 3's grep finds one hit in `.next`: this ticket's own comment in `layout.tsx`, copied into a source map | Not a request: outside source maps there are none, and no URL to either host anywhere |

## Evidence
Run on the Mac against the shared local stack, with the M13 session holding off (2026-10-27).
- **The check before the change:** `e2e/shell.e2e.ts`'s phone case, with the new font-face checks, passed on today's `next/font/google` build (`1 passed`), so it guards that nothing changes.
- **Criterion 1:** `ls -l src/app/fonts` → `Baloo2-800-latin.woff2` 18612, `DMSans-latin.woff2` 36980, `OFL-Baloo2.txt` 4384, `OFL-DMSans.txt` 4482; `file` names both fonts "Web Open Font Format (Version 2)"; `shasum -a 256` → `05dada341dc76ec6b755324afb74e998c57db06147c4c6d362d51132050aa6f4` and `468d56b6b25b05b70190b6c233d773f6f1770e8579827ce022a57f03fa8002fb`. The sizes match what fonts.gstatic.com reported before the download (`content-length` 18612 and 36980).
- **Criteria 2 and 4:** after the swap, `grep -rn "next/font/google" src` finds nothing; `npx playwright test e2e/shell.e2e.ts` → `9 passed`, the faces `{ heading: ["800 loaded"], regular: ["400 loaded"], bold: ["700 loaded"] }`. As a check, Baloo 2 declared at 400 instead: the case failed (`- "800 loaded"`, `+ "400 loaded"`); restored, it passed.
- **Criterion 3 and the hypothesis:** `rm -rf .next && npm run build` → exit 0, `✓ Compiled successfully`, the two files in `.next/static/media/` (`Baloo2_800_latin-…woff2`, `DMSans_latin-…woff2`). `grep -rlE 'fonts\.(gstatic|googleapis)\.com' .next` → 1 file, a source map holding this ticket's comment (Source diff); with `--exclude='*.map'` → 0, and `https?://fonts…` anywhere → 0. The hypothesis held for requests.
- **Criterion 5:** `npx tsc --noEmit -p .`: no output. `npm run lint`: no problems. `npm test`: `Test Files  43 passed (43)`, `Tests  424 passed (424)`. `npm run test:e2e` → `61 passed (2.1m)`. CI: in the PR.

- **After the review** (the stack free again, the M13 session's word): the check's first run read the heading at weight 500, from Next.js's own 404 page left by the test's `/account` visit, so it now reads on `/`. Then `npx playwright test e2e/shell.e2e.ts -g "a phone gets a bottom tab bar"` → `1 passed`. As a check, Baloo 2's `src` pointed at the DM Sans file: it failed (`- "800 Baloo2_800_latin"`, `+ "800 DMSans_latin"`); restored, it passed.

- **After merging main** (`448db20`): `npm run test:e2e` → `61 passed (2.1m)`; `npm test` → `Tests  430 passed (430)`; `rm -rf .next && npm run build` → exit 0, and no Google host outside source maps.

## Review
The `reviewer` agent, in a fresh context, on `20851df`. It matched the files' sizes and SHA-256, compared the OFL files with upstream byte for byte (LF-normalised), checked `.gitattributes` with `git check-attr`, fetched Google's CSS (two DM Sans faces on one file), read `layout.tsx` against the docs, and checked DECISIONS, SOURCES, ROADMAP and 14c-1's done line against PR #99; it re-ran tsc, lint and `npm test` (424), and, by the brief, no build or e2e.
- Blocking findings and how each was fixed:
  - **Criterion 4 wasn't what the test checked:** it read no computed weight and couldn't tell the two files apart. The check now reads the heading's computed weight and each family's `@font-face` file, and the criterion says exactly that; the swapped-file trial above fails it.
  - **The handoff wasn't in the commit:** committed in the review commit, with 14b-5 and PR #99's merge.
  - **The ROADMAP row:** 14b-5's clause sat inside 14c-1's description; moved after it.
- Deferred to ROADMAP "Next revision": none. The reviewer's two non-blocking notes (no `unicode-range`; `next/font/local`'s Arial fallback) are recorded in the Source diff, as they change nothing players see.
