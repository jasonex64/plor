# M14 14c-1 — The game's name and words

**Status:** draft, for the human's approval. Guided questions answered 2026-10-25 (five rounds, below); the name (N1), the `game_id` (N2), the share line (N3) and timeouts (N4) are still open. No code before those answers.

## Goal
Give game 1 a name and a set of words that speak its world (the ridge, the Wind, the signs) instead of "Offbeat", "safe", "caught", "answer" and "host".

## Who uses it / what breaks without it
- Used by: every player, on the game screen, the reveal, the result, the share, the friends' board, Me and the game's own leaderboard.
- Breaks without it: the game plays, but its words don't match the world 14c draws. The human (2026-10-25): "we also should rename things in the game too like instead of just 'safe and 'caught' and perhaps 'answer' and 'host' all need renaming". "Offbeat" gives "no hint of the theme" (round 1, below). The share's day number ("Offbeat #n") starts at the closed beta (M15), so a rename costs least before then.

## Source
No entry in `docs/SOURCES.md` covers naming. This ticket follows:
- the human's answers below (2026-10-25), quoted;
- `docs/milestones/M14-look-and-feel.md`, "Carried over from the closed M12 draft": D16 (the trail along a cliff edge, falling off at the stop), D19 (the host is the Wind), progression (the wind cloud gets angrier each round and the weather changes) and the Round 7 draft (7 stops, the player's word on a sign planted at each stop, the Wind whispers its answers, a gust blows the character off);
- `docs/DECISIONS.md`, Game 1: `game_id` is permanent.

## What the human said (2026-10-25, guided questions)
**Round 1, the name:**
- Why rename: "want to compare, and not hinting of the theme".
- The hook: "The Wind character".
- The tone: "try multple".
- Next to Plor: "Stands on its own" (each game its own personality; Plor stays the neutral host).

**Round 2, the name:**
- The game's name and the Wind's name the same word? "Show me both kinds".
- Should the name hint at the dodge? "Either is fine".

**Shortlist:** Claude offered ten names (Whiffle, Gusty, Windbag, Bluster, Zephyr, Updraft, Gust, Crosswind, Headwind, Whirlword). The human picked three to check: "updraft zephyr and crossswind". Then: "not quite yet" on picking one.

**Round 3, the words:**
- How far the themed words reach: "Everywhere".
- The safe/caught picture: "Show me all three" (the climb, the Wind's attention, the gust).
- The player's answer in the world: "A sign you plant".
- The Wind's voice: "Narrated about it" (a narrator describes the Wind; it never speaks for itself).

**Round 4, the words:**
- The pair: "A. The climb (Recommended)".
- A question is called: "Stop".
- Points: "Keep \"points\"".
- Screens shared across games (the Today tab, the overall leaderboard, the shared feed): "Plain on shared screens". The game's own screens, its card and its own leaderboard use the words.

**Round 5, the get-past and caught lines** (the human asked to "redo steady and blown off"):
- The get-past line: "should escalate with difficulty"; the caught line: "samne as last answer".
- How finely: "Three tiers" (stops 1–2, 3–5, 6–7).
- How rough the top gets: "Cartoon rough".

## The name (N1, open)
Checked on 2026-10-25 by web search. That's not a trademark search (*unverified*), and the domain lookups returned nothing from the Mac (*unverified*).

| Name | Existing games with the name | Other clashes | Claude's reading |
|---|---|---|---|
| **Updraft** | Two small itch.io projects: a jam prototype platformer ([lrxs](https://lrxs.itch.io/updraftv1)) and an HTML5 game in development ([rayen_rb01](https://rayen-rb01.itch.io/updraft)). No Steam or app store listing, no word game | UpdraftPlus, a WordPress backup plugin (Claude's memory, *unverified*); a different field | **Leads.** Wind and the climb: the updraft lifts you up the ridge, a gust knocks you off |
| **Zephyr** | No game named exactly that. Nearby: *Zephyrus Prelude* (VR puzzle adventure, [Meta Quest](https://www.meta.com/experiences/pcvr/zephyrus-prelude/4578910218853415/)), *Robot Zephyr* (iOS action) | Crowded outside games (Zephyr RTOS, Zephyrus laptops; Claude's memory, *unverified*) | Hard to search or own; unsure how to say it |
| **Crosswind** | **A Steam game named *Crosswind*** ([store page](https://store.steampowered.com/app/3041230/Crosswind/)), a co-op pirate survival game by Crosswind Crew / Forward Gateway, in Early Access in 2026 ([Gematsu](https://www.gematsu.com/2025/08/crosswind-launches-in-early-access-in-2026)) | Same goods as ours: video games | Out, unless the human's trademark check says otherwise |

## The words (decided, rounds 3–5)
| Today (M14 branch, 2026-10-25) | New | Where |
|---|---|---|
| question 3 | **stop 3** | everywhere a question is numbered |
| Safe! | by tier: stops 1–2 **Shrugged it off!**, 3–5 **Dug in!**, 6–7 **Braved the storm!** | the reveal |
| Caught on question 3 / (caught) / caught on question 3 by "cat" | by tier: stops 1–2 **tipped over**, 3–5 **tumbled**, 6–7 **sent flying**, always "*<word> at stop N*" ("sent flying at stop 6 by 'cat'") | the reveal, the result, the friends' board, yesterday's card |
| survived / avg. survived / Questions survived, last 7 days / More survived | **climbed** / **avg. stops climbed** / **Stops climbed, last 7 days** / **More climbed** | Me, the game's card, the calendar |
| You survived all 7! / survived every question | **You reached the top!** / **reached the top** | the result, the board |
| Your answer / Answer (button) | **Paint your sign** / **Plant it** | the input |
| the host said cat, dog | **the Wind whispered** cat, dog | the reveal, the result |
| Yesterday's answers | **Yesterday on the ridge** | the game screen |
| Your rarest answers | **Your rarest signs** | Me |
| "x" isn't in our list. Try another answer. | **The paint won't take "x". Try another.** | the retry |
| The Wind has taken: E | **Blown away: E** ("The Wind took E. Try a word without it." stays) | stolen letters |
| Time's up on question 4 | **Frozen at stop 4** (N4: one word, or tiers too?) | timeouts |
| points | **points** | unchanged |

Claude's draft wording; the human chose the pictures, the tiers and the tone, and can change any single word. The words above are Claude's picks from its own drafts, shown to the human on 2026-10-25 without objection, but not each approved one by one (*unverified*).

## Open questions
| # | Question | Answer (origin) |
|---|---|---|
| N1 | The name: Updraft, Zephyr, or keep looking | Open ("not quite yet", human, 2026-10-25). A trademark search (USPTO) is the human's to run or commission before launch |
| N2 | `game_id`: keep `offbeat` as the internal ID and change only what players see, or migrate it | Open. Claude's recommendation: keep it. It's stored on every run, run event, ledger row, comment and reaction and in `content/offbeat/` paths (DECISIONS.md, Game 1); the route `/offbeat` would move to the new name either way |
| N3 | The share line: the name and the symbols (e.g. a 💨 at the stop where the player was blown off), including rare and common answers now M13's tiers exist | Open. Also ROADMAP's placeholder-symbols item (M05), moved here (human, 2026-10-26: "Move to 14c (Recommended)"; `M14-14b-2c-review-items.md`, answer 3) |
| N4 | Timeouts: one word ("Frozen") at every stop, or tiers like the caught line | Open |
| N5 | Admin pages: plain words, since only the human sees them | Claude's reading of "Everywhere" (players' screens), *unverified*: confirm |
| N6 | The How to play text (L29) rewritten in the new words in the same PR | Claude's proposal, for the human |
| N7 | A stolen letter's key: what the player feels when they press it (it does nothing today, and only a status line says why) | Open, with 14c's motion and L8's timings (human, 2026-10-26: "Wait for 14c (Recommended)"; `M14-14b-2c-review-items.md`, answer 5; M04 G11) |

## Acceptance criteria
Draft shape, filled in once N1–N6 are answered:
- [ ] No player-facing string on the game's own screens says "Offbeat", "safe", "caught", "survived", "host" or "question"; checked by grep over `src/app` and `src/game/share.ts`, with every remaining hit listed and justified.
- [ ] The reveal and caught lines follow the three tiers: a unit test on the stop → word lookup at stops 2, 3, 5 and 6 (each tier's edges).
- [ ] Screens that mix games keep plain words (round 4).
- [ ] The existing e2e tests that read these strings are updated to the new words, not deleted or loosened (CLAUDE.md, "Never cheat a check").

## Out of scope
- The pixel art and the motion (the rest of 14c).
- The cauldron game's name (M16 S1).
- Changing `game_id` or any stored value, unless N2 says so.

## Numbers
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| Tier bands: stops 1–2, 3–5, 6–7 | Which get-past and caught word shows | Human, 2026-10-25: "Three tiers", from the option that named those bands |

## Plan
1. The human answers N1–N6.
2. One PR from `m14-look-and-feel`: the strings, the share line, the tier lookup and its test, the e2e updates.

## Removes
Nothing yet: a draft ticket with no code. The PR removes the old strings ("Offbeat" as the shown name, "Safe!", "Caught", "survived", "the host said", "isn't in our list") with no fallback to them.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
