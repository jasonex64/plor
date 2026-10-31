# Design, as built

What Plor's interface is made of today, read from the code. Each value names the file and line that holds it. It records no reasons and no history; a PR that changes what it describes updates it (CLAUDE.md, Docs).

## Colour slots and themes
Components use these slots through CSS Modules, never hex values (`src/app/globals.css:1`).

| Slot | Paper | Night | Sky | Moonlit | Ink |
|---|---|---|---|---|---|
| `--bg` | `#fafaf8` | `#121212` | `#eef3fa` | `#2a273f` | `#000000` |
| `--surface` | `#ffffff` | `#1c1c1c` | `#ffffff` | `#211f32` | `#111111` |
| `--text` | `#1a1a18` | `#ededea` | `#14213d` | `#e0def4` | `#ffffff` |
| `--muted` | `#5f5f5a` | `#a3a39d` | `#4a5a78` | `#c4a7e7` | `#b5b5b5` |
| `--line` | `#e2e2dc` | `#3a3a37` | `#d5deec` | `#3e3c50` | `#2a2a2a` |
| `--edge` | `#8a8a84` | `#6e6e6a` | `#858c9b` | `#737185` | `#606060` |
| `--accent` | `#2457d6` | `#7ea6ff` | `#1f5fbf` | `#9ccfd8` | `#ffd84d` |
| `--on-accent` | `#ffffff` | `#121212` | `#ffffff` | `#2a273f` | `#000000` |
| `--danger` | `#b4232f` | `#ff8a8a` | `#b4232f` | `#ff8a8a` | `#ff8a8a` |
| Lines | `globals.css:9-42` | `:74-98` | `:104-128` | `:130-154` | `:156-180` |

- Each theme also sets `--soft` (the accent at low strength), `--safe`, `--safe-bg`, `--caught`, `--caught-bg`, four calendar shades `--shade-1` to `--shade-4` and their number colours `--on-shade-1` to `--on-shade-4`, in the same blocks.
- Paper is the default (`:root`, `globals.css:8`); with no theme chosen, a dark device gets Night's values (`globals.css:46-72`). A chosen theme is a `[data-theme]` attribute on `<html>`.
- The game's banner has its own colour in every theme: `--offbeat: #2f3d5c` with `--on-offbeat: #ffffff` (`globals.css:40-41`).
- `src/app/colors.test.ts` checks the pairings' contrast.

## Type
- One font, Baloo 2, from `src/app/fonts/Baloo2-latin.woff2`, declared at 400, 700 and 800 (`src/app/layout.tsx:18-25`) as `--font`, used by `body` (`globals.css:186`).
- Digits are tabular everywhere (`globals.css:188`). `h1`, `h2` and `h3` balance their lines, `p` avoids a lone last word (`globals.css:289-297`). `h1` and `h2` are 800 (`globals.css:283-286`).
- Inputs and buttons are 16px (`globals.css:334-338`). A card's heading is 24px (`src/app/kit.module.css:30-33`); a chip and a badge are 12px (`kit.module.css:94`, `:145`).
- The numbers in stat tiles are 40px where they fit, else a share of the tile's width (the tile is a size container, `src/app/kit.module.css:129`): Me's totals 25% (`src/app/me.module.css:58`), the game screen's stats 37% (`src/app/offbeat.module.css:86`); so is the number in `/streak`'s heading (`src/app/streak.module.css:18-20`).

## Corners, borders, shadows
- The ink of borders and shadows is the theme's text colour: `--ink: var(--text)` (`globals.css:318`).
- Corners: `--r-card` 5px, `--r-button` 5px, `--r-small` 4px, `--r-cell` 2px (`globals.css:319-322`).
- Only what can be pressed has a shadow: `--shadow-button` `0 4px 0` and `--shadow-button-small` `0 3px 0`, in the ink (`globals.css:323-324`). Cards, rows, chips, stat tiles, the current tab and the streak pill are flat.
- One control height, 44px: fields and selects have a 2px ink border and the small corners (`globals.css:341-348`), at least 44px tall with 0 12px inside (`globals.css:352-357`); a text area keeps 10px 12px (`globals.css:359-361`).
- Buttons are at least 44px tall, with a 2px ink border, the button corners and shadow (`globals.css:372-385`), the kit's kinds included (no vertical padding: `kit.module.css:164-199`); pressed, they drop 4px onto the shadow in 80 ms (`globals.css:382-390`), and don't move under reduced motion (`globals.css:393-402`). A link drawn as a button is 44px too (`src/app/button-link.module.css:10`). The reaction chips are the one exception until they move behind a menu (14b-10, answer 18).
- The focus ring is 3px in the accent, 3px out (`globals.css:304-307`).

## The kit (`src/app/kit.module.css`)
| Piece | Values | Lines |
|---|---|---|
| Card | 14px padding, 10px gap, 2px ink border, card corners, flat | 7-15 |
| Rows | 8px apart; each 8px 10px, 10px gap, 1.5px ink border, small corners | 44-61 |
| Your own row (`.row.you`) | the soft tint, on boards and in "Where everyone ended" | 64-66 |
| A row's second line (`.below`) | 6px gap, 6px above | 76-82 |
| Chip | 2px 9px, 1.5px ink border, small corners, 12px 700; 8px between chips | 85-104 |
| Stat tile | 10px 14px, 2px ink border, small corners, flat, a size container for its number; Me's four take the soft tint (`src/app/me.tsx`, Total) | 128-133 |
| Badge | 24px round, ink fill, 12px 800; the first in the accent | 136-158 |
| Main button (`.primary`) | 0 18px, accent fill, 17px | 164-170 |
| Small button (`.small`) | 0 12px, small corners, small button shadow, 14px | 174-180 |
| Minor button (`.link`) | 0 10px, 1.5px ink border, no shadow, 14px | 188-199 |
| Danger (`.danger`) | the danger colour for the edge and text, on buttons, links and chips | 208-211 |

Chromium draws the 1.5px borders as 1px (`e2e/look.e2e.ts:109-110`).

## Spacing and layout
- A page's content is one column at most 960px wide with 16px padding (`globals.css:276-281`).
- **Below 768px:** a 56px top bar (`src/app/shell.module.css:25-32`) and a 64px tab bar at the foot with a 2px ink top rule (`shell.module.css:3-13`); the page leaves that room (`globals.css:197-201`).
- **From 768px:** a 280px sidebar with a 2px ink right rule and no top bar (`shell.module.css:136-153`, `globals.css:224-231`).
- **From 1200px:** a 360px right column (`src/app/side-column.tsx:14`, `src/app/side-column.module.css:10`, `globals.css:245-248`).
- The streak pill in the top bar and the sidebar is fully round, in the soft tint, with a 1.5px ink border (`shell.module.css:58-71`).
- During a run, the clock bar is 48px with a 2px ink rule (`shell.module.css:242-258`), above the tab bar on phones and at the top from 768px (`globals.css:218-221`, `:237-241`).
- Detail pages slide 60px over 200 ms, forward to the left and back to the right, and don't move under reduced motion (`globals.css:414-443`, `:492-499`).

## Test runs (admin)
- `/admin/test/<date>` is the game screen's run, drawn by the same component as play (`src/app/game.tsx:268`), on the game screen's grid (`src/app/offbeat.tsx:88-113`).
- Above it, in the back link's row: a chip, "Test run: nothing is saved" or "Test run of the draft: nothing is saved", and a plain Restart button (`offbeat.tsx:97-100`), 16px apart and wrapping on a phone (`src/app/offbeat.module.css:25-30`).
- The result has no Share button (`game.tsx:558`); after the run the game screen's cards show and the comments don't (`offbeat.tsx:106-110`).
- On `/admin/puzzles`, each day has a Play test link beside Approve (`src/app/admin/puzzles/puzzles.tsx:172-174`), and above the day a date field, "Test an earlier day", up to today, with its own Play test (`puzzles.tsx:106-120`).
- On `/admin/audit`, a text a test run refused waits under To review with the reason chip "From your test run" (`src/app/admin/audit/audit.tsx:25`). It shows Accept when it names nothing (`audit.tsx:211`), or one "Accept <name> (<what it's a kind of>) as <category>" per thing it names, as a rejected text does (`audit.tsx:217-221`), and Dismiss.

## Answer search
- Once a run is over, each question on its result card has a minor "Search answers" button (`src/app/game.tsx:567`, `src/app/answer-search.tsx:40-44`); so does each question on yesterday's card (`src/app/offbeat.tsx:215`).
- Opened, it is a search field, "Search the answers" (`answer-search.tsx:49`), over at most 10 matches, 6px apart, the box 8px above them and 6px under the question (`src/app/answer-search.module.css:3-23`). Each match shows its name, the name that matched in muted text when that's another one, its tier as a chip, and "· N players" in muted text once enough players answered (`answer-search.tsx:60-64`). An empty field heads its list "The most given" (`answer-search.tsx:54`).
