# M15 15b — The zod security advisory

**Status:** in review (2026-10-24): its PR waits for green CI and the human's OK to merge. Built ahead of the rest of M15 (human, 2026-10-24: "M15, as 15b"). The human asked for it: "yes resolve the zod thing but explain to me what it is, in simpler terms as we fix it".

## Goal
No installed copy of zod has the memory bug in GHSA-mrhx-c7xc-m3w5, and future security fixes for dependencies arrive as pull requests the human approves.

## Who uses it / what breaks without it
- **Used by:** the live app's server, and the human, who gets the security alerts.
- **Breaks without it:**
  - **The advisory.** zod through 4.6.5 can run a process out of memory when it validates a large array against an array schema with no length limit (SOURCES.md, GHSA-mrhx-c7xc-m3w5). GitHub raised Dependabot alert #1 (high) on `package-lock.json`, runtime scope.
  - **Our installed copy.** `npm ls zod` shows `zod@4.1.11` on two paths:
    - `@vercel/functions@3.10.1` → `@vercel/oidc@4.0.1` → `@vercel/cli-config@0.3.1` (runtime; `@vercel/functions` is how `src/lib/db.ts` registers the pool);
    - `eslint-config-next@16.4.2` → `eslint-plugin-react-hooks@7.1.1` (dev only).
  - **No upstream fix.** `@vercel/cli-config`'s latest release, 0.3.3, still pins `zod` to exactly `4.1.11` (`npm view @vercel/cli-config@latest dependencies.zod`, 2026-10-24), so updating Vercel's packages doesn't fix it.
  - **Reachability.** The reviewer checked statically (2026-10-24):
    - `@vercel/functions`' root entry, the only part `src` imports, requires none of `oidc` or `cli-config`;
    - only the `@vercel/functions/oidc` subpath does.

    So the app very likely never loads zod at runtime. And `cli-config` uses zod to parse Vercel CLI config files, not request input. Whether zod is ever loaded at runtime stays *unverified*, since no running app was traced. The human chose to fix it rather than dismiss it.

## Source
- **npm package.json `overrides`** (SOURCES.md, added 2026-10-24): replacing "a dependency with a known security issue", in the root `package.json` only, with a semver range for "a minimum patched release".
- **GitHub advisory GHSA-mrhx-c7xc-m3w5** (SOURCES.md, added 2026-10-24): vulnerable `< 4.6.6`, patched `4.6.6`.
- **DECISIONS.md, Dependency lockfile:** `package-lock.json` changes only through `npm run lockfile -- update`, checked by `npm run lockfile -- check`.

## Decisions (human, 2026-10-24, from Claude's guided questions)
| # | Decision | Answer |
|---|---|---|
| Z1 | How to fix it | **Override to the fixed zod** ("Override to fixed zod (Recommended)"), rather than dismissing the alert or waiting for Vercel |
| Z2 | The two sources | **Added** ("Yes, add both") |
| Z3 | Where the ticket lives | **M15, as 15b** ("M15, as 15b (Recommended)") |
| Z4 | Future alerts | **GitHub's automatic security update PRs, approved by the human** ("Auto PRs, I approve") |

## Acceptance criteria
- [x] `package.json` has `"overrides": { "zod": "^4.6.6" }`, and `npm ls zod` shows no version below 4.6.6.
- [x] `npm run lockfile -- check`, `npm test`, `npm run lint`, `npx tsc --noEmit -p .` and `npm run build` pass (local); CI pending on the PR.
- [ ] Dependabot alert #1 is closed after the merge.
- [x] **Z4:** Dependabot security updates are on for the repo, and DECISIONS.md's lockfile row says how their PRs fit the one-way rule. The source was added with the human's OK (2026-10-24: "Yes to both (Recommended)").

## Out of scope
- Version updates that aren't security fixes (Dependabot version updates).
- Other dependency upgrades.

## Numbers
| Value | Used for | Origin |
|---|---|---|
| `^4.6.6` | The override's minimum zod version | GHSA-mrhx-c7xc-m3w5, first patched version 4.6.6 (SOURCES.md) |

## Plan
1. Add the override, then run `npm run lockfile -- update`.
   - *Hypothesis:* the lockfile resolves every zod to one 4.x release ≥ 4.6.6 (4.6.7 is the latest, `npm view zod version`).
   - *Disproved* if npm refuses the override for conflicting with `cli-config`'s exact pin. The npm docs say overrides replace it "no matter what version your dependencies rely on".
2. `npm ci`, then the checks above, including a build, which loads `@vercel/functions`.
3. Z4: add GitHub's Dependabot security updates docs to SOURCES.md (human's OK), record the lockfile exception, and enable it with `PUT /repos/jasonex64/plor/automated-security-fixes`.
   - *Hypothesis:* `GET` on that address says `enabled: false` before and `true` after.

## Removes
- `zod@4.1.11` from the lockfile.
- **The override itself, later:** remove it once `@vercel/cli-config` stops pinning `zod@4.1.11` (ROADMAP Next revision). Until then it also holds zod below 5.0.0.
- Nothing else: this adds one override and changes no code. DECISIONS.md's lockfile rule gains one exception and keeps its one way for everything else.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|
| npm `overrides`: a range enforces a minimum patched release | `"zod": "^4.6.6"` at the root, unscoped | One rule covers both paths (Vercel's runtime chain and ESLint's), and no copy of zod below the fix is wanted anywhere |
| DECISIONS.md: the lockfile changes only through `npm run lockfile` | Dependabot security PRs are the one exception | The human chose automatic PRs (Z4). CI's `npm ci` still checks every lockfile, which is the rule's purpose |

## Evidence
- **The override, and the lockfile in Linux.** `npm run lockfile -- update` → `LOCKFILE UPDATE OK (Linux, node:24)`.
  - `git diff --stat package-lock.json` → `3 insertions(+), 3 deletions(-)`: zod's version, resolved URL and integrity, `zod-4.1.11.tgz` → `zod-4.6.7.tgz`.
  - The hypothesis held: one release ≥ 4.6.6, the latest, 4.6.7.
- **Installed.** `npm ci`, then `npm ls zod`: every path shows `zod@4.6.7`.
  ```
  +-- @vercel/functions@3.10.1
  | `-- @vercel/oidc@4.0.1
  |   `-- @vercel/cli-config@0.3.1
  |     `-- zod@4.6.7 deduped
  `-- eslint-config-next@16.4.2
    `-- eslint-plugin-react-hooks@7.1.1
      +-- zod-validation-error@4.0.2
      | `-- zod@4.6.7 deduped
      `-- zod@4.6.7
  ```
- **Checks:**
  - `npm run lockfile -- check` → `LOCKFILE CHECK OK (Linux, node:24)`;
  - `npm test` → `Test Files 37 passed (37)`, `Tests 236 passed (236)`;
  - `npm run lint` clean (ESLint loads `eslint-plugin-react-hooks`, which uses zod);
  - `npx tsc --noEmit -p .` clean;
  - `npm run build` succeeded.
- **Z4.** `gh api repos/jasonex64/plor/automated-security-fixes` → `{"enabled":false,"paused":false}`. Then `gh api -X PUT …` → `HTTP/2.0 204 No Content`. Then `GET` → `{"enabled":true,"paused":false}`. The hypothesis held.
- **Alert #1 closing:** after the merge (pending).

## Review
The `reviewer` agent reviewed the diff in a fresh context, 2026-10-24.
- **Blocking findings and how each was fixed:**
  - *The branch's HANDOFF.md was stale:* rewritten for 15b, the Dependabot setting and the alert check.
  - *The commit prefix `M15 15b:` against `M15: 15b,`:* not changed. The repo uses both forms (`M12 12d:` in 195be55, `M12 12e:` in 6d7b65d and b5c96b3), and renaming would need a force-push of the PR branch.
- **Taken now, though not blocking:**
  - when to remove the override (Removes; ROADMAP Next revision);
  - the static reachability check (Who uses it);
  - a DECISIONS.md Log line for the repo setting.
- **Deferred to ROADMAP "Next revision":** removing the override once `@vercel/cli-config` stops pinning zod.
- **Closed:** if zod is ever added as a direct dependency, the unscoped override makes `npm install` fail with EOVERRIDE until the two specs agree. That failure is loud, and there's no such dependency today.
