# Look research: calm frame, loud moments

Method: pages fetched with WebFetch unless marked *search summary only*. Several sites blocked fetching (Medium 403, gamesbeat 403, Duolingo leaderboard post thin); those gaps are stated. Earlier report on Wordle/NYT/Puzzmo motion is not repeated.

## 1. How game + social products split plain and loud

- **Duolingo (primary, blog).** The core-tabs redesign explored four directions. "Modular" put daily quests, leaderboard rankings and friend activity in soft rounded cards; "Punchy" used solid vivid header bars (pink for a quest, deep blue for Sapphire League, orange for Friends); the final system favours whitespace over containers, with minimal type styles and titles left-aligned in the same place. The team asked whether a big coloured header was worth its space if it served no purpose. Friends tab: streak counts on top, achievements below, a prominent "Celebrate" button, reaction counts, comment previews. https://blog.duolingo.com/core-tabs-redesign . Leagues post: only colour detail is a purple Leaderboards symbol for the Amethyst league; no description of promotion zones or own-row styling. https://blog.duolingo.com/duolingo-leagues-leaderboards/ . Ten leagues, 30 users, 7-day XP, top finishers promoted: third-party, *search summary only* (https://duolingo.deconstructoroffun.com/mechanics/leagues).
- **Duolingo streak milestones.** Treated as a "power-up"; Duo changes form (phoenix). Article gives no durations or easing. https://blog.duolingo.com/streak-milestone-design-animation
- **Strava (third-party analysis, blakecrosley.com, not Strava itself).** Card order: who, where, route map as hero, numbers, then kudos/comment counts. Map is desaturated so the orange route (#FC4C02, also the "kudos given" state) is the one strong colour. Kudos is one tap; comments take effort. Only celebration described: a brief heart pulse with light haptic. https://blakecrosley.com/guides/design/strava . Strava's own design team: kudos given by relationship, to praise a special activity, or both (*search summary only*, https://medium.com/strava-design/understanding-how-athletes-use-the-feed-aae986eaa818, 403 on fetch).
- **NYT Games.** Friends leaderboard (launched April 2025) shows daily results for Wordle, Spelling Bee, Connections, Mini; up to 100 friends; no global boards. *Search summary only* (help centre/gamesbeat, https://gamesbeat.com/new-york-times-games-launches-leaderboard-to-celebrate-daily-wins). Connections is "engineered to shine on social platforms, with a simple color-based visual identity that maximizes shareability" (Aftermath, https://aftermath.site/new-york-times-wordle-connections-puzzmo-games.md). Puzzmo: community visible "on the leaderboards", groups with friends (same page). The article says nothing on results screens or per-game colour.
- **Lichess.** Team says the minimalist, board-centred look is staying in v2; a critique says the minimal palette lacks colour identity (*search summary only*, https://lichess.org/blog/XLBwfRAAACIAAJJE/lichess-v2-is-coming).
- **Not found:** Chess.com, GeoGuessr, Words With Friends, BeReal, Letterboxd design rationale. No page read; do not treat as covered.

## 2. Plain reads as "clean" or "unfinished"

- **Refactoring UI, chapter list** (page gives titles only except borders): "De-emphasize to emphasize", "Labels are a last resort", "Balance weight and contrast", "Don't use grey text on colored backgrounds", "You need more colors than you think", "Greys don't have to be grey", "Don't overlook empty states", "Choose a personality". Borders chapter: "using too many of them can make your design feel busy and cluttered"; alternatives are box shadow, contrasting background, more space. https://refactoringui.com/
- Rule text from the authors' article "7 practical tips" (weights under 400 hard to read; de-emphasise with lighter colour or smaller size): *search summary only*, https://medium.com/refactoring-ui/7-practical-tips-for-cheating-at-design-40c736799886
- **NN/g visual hierarchy:** at most three sizes; keep at most two elements at the top size; hierarchy comes from contrast in value and saturation, not hue; no more than three contrast treatments ("If everything is contrasted, then nothing stands out"); more space around important items; borders or containers only when whitespace is not enough; don't rely on colour alone. https://www.nngroup.com/articles/visual-hierarchy-ux-definition/
- **NN/g empty states:** unfinished = blank space with no message, misleading "no items" while loading, vague guidance, missed teaching moments. Do: say system status, teach, give a direct pathway. https://www.nngroup.com/articles/empty-state-interface-design/
- **NN/g aesthetic-usability:** attractive designs are rated easier to use (Kurosu & Kashimura 1995, 26 ATM variants, 252 people); appeal masks problems and wears thin if density is low. https://www.nngroup.com/articles/aesthetic-usability-effect/
- **Apple HIG (motion):** "Add motion purposefully"; excessive animation can distract; make motion optional; brief and precise feedback "tends to feel lightweight and unobtrusive"; avoid motion on frequent UI interactions; let people cancel motion. https://developer.apple.com/design/human-interface-guidelines/motion.md

## 3. Motion menu (exact published values)

| Source | Value | Page |
|---|---|---|
| Material 3 durations (Flutter source) | short1 50, short2 100, short3 150, short4 200, medium1 250, medium2 300, medium3 350, medium4 400, long1-4 450/500/550/600, extralong1-4 700/800/900/1000 ms | https://raw.githubusercontent.com/flutter/flutter/master/packages/flutter/lib/src/material/motion.dart |
| Material 3 easings (same file) | standard (0.2,0,0,1); standardDecelerate (0,0,0,1); standardAccelerate (0.3,0,1,1); emphasizedDecelerate (0.05,0.7,0.1,1); emphasizedAccelerate (0.3,0,0.8,0.15) | same |
| Carbon durations | fast-01 70, fast-02 110, moderate-01 150, moderate-02 240, slow-01 400, slow-02 700 ms; micro-interactions 90-120 ms | https://carbondesignsystem.com/elements/motion/overview/ |
| Carbon easings | productive standard (0.2,0,0.38,0.9), entrance (0,0,0.38,0.9), exit (0.2,0,1,0.9); expressive standard (0.4,0.14,0.3,1), entrance (0,0,0.3,1), exit (0.4,0.14,1,1). Expressive "reserve for occasional, important moments"; standard easing for sorting table rows | same |
| Atlassian durations | xshort 100, short 150, medium 200, long 250, xlong 400, xxlong 600 ms (onboarding, full-screen overlays); interactions 50-150, transitions 150-400; frequent motion under 150 | https://atlassian.design/foundations/motion/applying-motion , https://atlassian.design/foundations/motion |
| Atlassian easings | ease-out bold (0,0.4,0,1) entering; ease-in-out bold (0.4,0,0,1) repositioning; ease-in practical (0.6,0,0.8,0.6) exits; ease-out practical (0.4,1,0.6,1) popups. Exit 50-100 ms shorter than entrance. Page's own table has swapped columns: verify | same |
| Atlassian scale/fade | modal enter scale 95 to 100%, fade 0 to 100% | applying-motion |
| Wordle (earlier report) | pop 100 ms, flip 2 x 250 ms, 300 ms stagger, shake 600 ms, win bounce 1000 ms | existing report |
| Gram Jam (earlier report) | 25 ms per-letter stagger | existing report |

Gaps: no source page read gives a published count-up duration, a rank-change list reorder duration, or celebration confetti timing. Closest: Carbon "sorting table rows" uses standard easing; Atlassian and Apple give no celebration values. Primer, Apple HIG and M3 site gave no numeric values on the pages I could read. Pick from the above and mark as a Plor choice.

## 4. Leaderboard and result cards

- Duolingo's final system uses flat sections with no borders or backgrounds on the leaderboard in the "Flat" direction; colour lives in a few purposeful headers (core-tabs link above).
- Strava: one strong colour per card (route), everything else desaturated or secondary; counts under the hero. Applies to Plor: the result is the hero, the social counts sit below it.
- Strava: kudos (cheap, a pulse) vs comments (effortful, text): different weight, same feed (Crosley link).
- NYT friends board: per-day results per game, "you" among friends; row styling not documented in anything I could read. Own-row highlight, rank styling, and comment-vs-result differences are therefore NOT sourced here.

## What this suggests for Plor

1. Source-backed pattern: one strong colour per object, everything around it quiet (Strava route, Duolingo purposeful headers). Matches "calm frame, loud moments"; spend game colour on result cards and score rows only.
2. Fix "boring" by hierarchy before decoration: make the result the largest thing in its row, de-emphasise labels and meta with lighter colour or smaller size, not thinner weight (Refactoring UI, NN/g).
3. Prefer spacing and background shifts over borders and boxes on the plain frame (Refactoring UI borders; Duolingo's whitespace-over-containers).
4. Limit to three sizes and two top-size items per screen; with loud moments using bigger type, keep the rest strictly small (NN/g).
5. Empty states (no friends, no results yet) are a named "unfinished" cause: give status, a teaching line and one action (NN/g).
6. Motion menu: micro feedback 100-150 ms, entrances 150-250 ms with a decelerating curve, exits shorter, one 400-700 ms "moment" per result; Reduce motion makes it instant. Choose tokens from the table; values for count-up and rank reorder are an owner choice.
7. Distinguish comment from result by weight: a comment stays plain text with small avatar; a result is a coloured card with large score. Plan this as design, not as a sourced pattern.
8. Beware the Duolingo lesson: colour/illustration blocks that serve no purpose were questioned by their own team; keep every loud element tied to a game event.
