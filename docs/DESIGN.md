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
- Inputs and buttons are 16px (`globals.css:336-340`). A card's heading is 20px (`src/app/kit.module.css:30-32`); a chip and a badge are 12px (`kit.module.css:89`, `:139`).

## Corners, borders, shadows
- The ink of borders and shadows is the theme's text colour: `--ink: var(--text)` (`globals.css:318`).
- Corners: `--r-card` 5px, `--r-button` 5px, `--r-small` 4px, `--r-cell` 2px (`globals.css:319-322`).
- Shadows: `--shadow-card` `4px 4px 0`, `--shadow-card-small` `3px 3px 0`, `--shadow-button` `0 4px 0`, `--shadow-button-small` `0 3px 0`, all in the ink (`globals.css:323-326`).
- Fields have a 2px ink border and the small corners (`globals.css:343-350`), 10px 12px inside (`globals.css:355`).
- Buttons are at least 44px tall, with a 2px ink border, the button corners and shadow (`globals.css:367-380`); pressed, they drop 4px onto the shadow in 80 ms (`globals.css:377-385`), and don't move under reduced motion (`globals.css:388-397`).
- The focus ring is 3px in the accent, 3px out (`globals.css:304-307`).

## The kit (`src/app/kit.module.css`)
| Piece | Values | Lines |
|---|---|---|
| Card | 14px padding, 10px gap, 2px ink border, card corners and shadow | 6-15 |
| Rows | 8px apart; each 8px 10px, 10px gap, 1.5px ink border, small corners | 44-61 |
| A row's second line (`.below`) | 6px gap, 6px above | 71-77 |
| Chip | 2px 9px, 1.5px ink border, small corners, 12px 700; 8px between chips | 80-99 |
| Stat tile | 10px 14px, 2px ink border, small corners, small card shadow | 122-127 |
| Badge | 24px round, ink fill, 12px 800; the first in the accent | 130-152 |
| Main button (`.primary`) | 10px 18px, accent fill, 17px | 158-164 |
| Small button (`.small`) | 6px 12px, small corners, small button shadow, 14px | 167-174 |
| Minor button (`.link`) | 4px 10px, 1.5px ink border, no shadow, 14px | 181-193 |
| Danger (`.danger`) | the danger colour for the edge and text, on buttons, links and chips | 202-205 |

Chromium draws the 1.5px borders as 1px (`e2e/look.e2e.ts:109-110`).

## Spacing and layout
- A page's content is one column at most 960px wide with 16px padding (`globals.css:276-281`).
- **Below 768px:** a 56px top bar (`src/app/shell.module.css:25-32`) and a 64px tab bar at the foot with a 2px ink top rule (`shell.module.css:3-13`); the page leaves that room (`globals.css:197-201`).
- **From 768px:** a 280px sidebar with a 2px ink right rule and no top bar (`shell.module.css:135-152`, `globals.css:224-231`).
- **From 1200px:** a 360px right column (`src/app/side-column.tsx:14`, `src/app/side-column.module.css:10`, `globals.css:245-248`).
- During a run, the clock bar is 48px with a 2px ink rule (`shell.module.css:243-257`), above the tab bar on phones and at the top from 768px (`globals.css:218-221`, `:237-241`).
- Detail pages slide 60px over 200 ms, forward to the left and back to the right, and don't move under reduced motion (`globals.css:409-438`, `:487-494`).

## Test runs (admin)
- `/admin/test/<date>` is the game screen's run, drawn by the same component as play (`src/app/game.tsx:267`), on the game screen's grid (`src/app/offbeat.tsx:87-112`).
- Above it, in the back link's row: a chip, "Test run: nothing is saved" or "Test run of the draft: nothing is saved", and a plain Restart button (`offbeat.tsx:96-99`), 16px apart and wrapping on a phone (`src/app/offbeat.module.css:25-30`).
- The result has no Share button (`game.tsx:557`); after the run the game screen's cards show and the comments don't (`offbeat.tsx:105-109`).
- On `/admin/puzzles`, each day has a Play test link beside Approve (`src/app/admin/puzzles/puzzles.tsx:172-174`), and above the day a date field, "Test an earlier day", up to today, with its own Play test (`puzzles.tsx:106-120`).
- On `/admin/audit`, a text a test run refused waits under To review with the reason chip "From your test run" (`src/app/admin/audit/audit.tsx:25`). It shows Accept when it names nothing (`audit.tsx:211`), or one "Accept <name> (<what it's a kind of>) as <category>" per thing it names, as a rejected text does (`audit.tsx:217-221`), and Dismiss.
