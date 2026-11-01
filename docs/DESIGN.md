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
| `--danger` | `#b4232f` | `#ff5c5c` | `#b4232f` | `#ff5c5c` | `#ff5c5c` |
| Lines | `globals.css:9-42` | `:74-98` | `:104-128` | `:130-154` | `:156-180` |

- Each theme also sets `--soft` (the accent at low strength), `--safe`, `--safe-bg`, `--caught`, `--caught-bg`, four calendar shades `--shade-1` to `--shade-4` and their number colours `--on-shade-1` to `--on-shade-4`, in the same blocks.
- Paper is the default (`:root`, `globals.css:8`); with no theme chosen, a dark device gets Night's values (`globals.css:46-72`). A chosen theme is a `[data-theme]` attribute on `<html>`.
- The game's banner has its own colour in every theme: `--offbeat: #2f3d5c` with `--on-offbeat: #ffffff` (`globals.css:40-41`).
- `src/app/colors.test.ts` checks the pairings' contrast.

## Type
- One font, Baloo 2, from `src/app/fonts/Baloo2-latin.woff2`, declared at 400, 700 and 800 (`src/app/layout.tsx:19-26`) as `--font`, used by `body` (`globals.css:186`).
- Digits are tabular everywhere (`globals.css:188`). `h1`, `h2` and `h3` balance their lines, `p` avoids a lone last word (`globals.css:317-329`). `h1` and `h2` are 800 (`globals.css:312-315`).
- Every font size is in rem, 16px = 1rem, so text follows the player's browser text size; the px sizes in this file are at the browser's default (docs/milestones/M14-14b-17-lines-and-text-size.md). Paddings, gaps, borders, the 44px controls and the breakpoints stay px; the badge and the avatar slots are in rem too, so they grow with their letters (`kit.module.css:157-171`, `src/app/avatar.module.css`).
- A paragraph stops at 55ch, about 70 letters in Baloo 2 (`globals.css:324-329`). On the reading pages (Privacy, About and signed-out Today, marked `.reading`) a list item stops there too and an `h2` has 40px above it and 10px below (`globals.css:331-341`). A word too long for its box breaks (`globals.css:189-191`).
- Inputs and buttons are 16px (`globals.css:384-388`). A card's heading is 24px (`src/app/kit.module.css:30-33`); a chip and a badge are 12px (`kit.module.css:116`, `:169`).
- The numbers in stats are 40px where they fit, else a share of their cell's width (the cell is a size container, `src/app/kit.module.css:152`): Me's totals 24% (`src/app/me.module.css:68`), the game screen's stats 35% (`src/app/offbeat.module.css:95`); so is the number in `/streak`'s heading (`src/app/streak.module.css:18-20`).

## Corners, borders, shadows
- The ink of borders and shadows is the theme's text colour: `--ink: var(--text)` (`globals.css:362`).
- Corners: `--r-card` 5px, `--r-button` 5px, `--r-small` 4px, `--r-cell` 2px (`globals.css:363-366`).
- Only what can be pressed has a shadow: `--shadow-button` `0 4px 0` and `--shadow-button-small` `0 3px 0`, in the ink (`globals.css:367-368`). Cards, rows, chips, stats, the current tab and the streak pill are flat.
- One control height, 44px: fields and selects have a 2px ink border and the small corners (`globals.css:391-398`), at least 44px tall with 0 12px inside (`globals.css:402-407`); a text area keeps 10px 12px (`globals.css:409-411`). Their text is 16px, a text area's and a select's too (`globals.css:375-381`).
- Buttons are at least 44px tall, with a 2px ink border, the button corners and shadow (`globals.css:422-436`), the kit's kinds included (no vertical padding: `kit.module.css:188-229`); pressed, they drop 4px onto the shadow, which goes, in 80 ms (`globals.css:448-452`), and don't move under reduced motion (`globals.css:455-465`). A disabled button, of any kind, is flat: a `--edge` border on `--surface`, `--muted` text (`globals.css:470-476`). A link drawn as a button is 44px too (`src/app/button-link.module.css:10`). The reaction chips are the one exception until they move behind a menu (14b-10, answer 18).
- The focus ring is 3px in the accent, 3px out (`globals.css:348-351`).

## The kit (`src/app/kit.module.css`)
| Piece | Values | Lines |
|---|---|---|
| Card | 14px padding, 10px gap, 2px ink border, card corners, flat | 7-15 |
| Rows | 8px apart; each 8px 10px, 10px gap, 1.5px ink border, small corners | 48-65 |
| Your own row (`.row.you`) | the soft tint, on boards and in "Where everyone ended" | 68-70 |
| A row's second line (`.below`) | 6px gap, 6px above | 97-103 |
| Chip | 2px 9px, 1.5px ink border, small corners, 12px 700; 8px between chips | 107-125 |
| Stat | A cell on its card, no border, corners or fill: 10px 14px, centred, a size container for its number. The screen draws a 1px `--line` between cells: Updraft's three in a row (`src/app/offbeat.module.css:74-76`), Me's four as a cross (`src/app/me.module.css:51-57`). Me's "All games" card is that screen's one tinted card (`src/app/me.tsx:60`) | 147-155 |
| Badge | 24px round, ink fill, 12px 800; the first in the accent | 157-182 |
| Main button (`.primary`) | 0 18px, accent fill, 17px | 188-194 |
| Small button (`.small`) | 0 12px, small corners, small button shadow, 14px | 198-204 |
| Minor button (`.link`) | 0 10px, 1.5px ink border, no shadow, 14px | 218-229 |
| Danger (`.danger`) | the danger colour for the edge and text, on buttons, links and chips | 238-241 |

Chromium draws the 1.5px borders as 1px (`e2e/look.e2e.ts:109-110`).

## Spacing and layout
- A page's content is one column at most 960px wide with 16px padding (`globals.css:305-310`).
- Nothing pushes the page sideways when text is bigger: a card's head lets its chip drop under the heading (`kit.module.css:35-45`), a chip's text wraps (`:105-118`), a week's head on the leaderboard graph wraps (`src/app/race.module.css:194-201`), a board's row drops its points under the name (`src/app/leaderboard.module.css:77-90`), though at the default text size a long name is cut with an ellipsis and the points stay on its row, from a viewport 20em wide (`leaderboard.module.css:97-114`), and Today's column is as wide as the screen (`src/app/today.module.css:7`).
- **Below 768px:** a 56px top bar (`src/app/shell.module.css:25-32`) and a 64px tab bar at the foot with a 2px ink top rule (`shell.module.css:3-13`); the page leaves that room (`globals.css:200-204`).
- **From 768px:** a 280px sidebar with a 2px ink right rule and no top bar (`shell.module.css:180-197`, `globals.css:253-260`).
- **From 1200px:** a 360px right column (`src/app/side-column.tsx:21`, `src/app/side-column.module.css:10`, `globals.css:274-277`).
- The streak pill in the top bar and the sidebar is fully round, in the soft tint, with a 1.5px ink border (`shell.module.css:58-72`); it looks 34px tall and is a 44px-tall target, through a `::after` centred on it (`:74-80`).
- During a run, the clock bar is 48px with a 2px ink rule (`shell.module.css:327-343`), above the tab bar on phones and at the top from 768px (`globals.css:247-250`, `:266-270`).
- Detail pages slide 60px over 200 ms, forward to the left and back to the right, and don't move under reduced motion (`globals.css:482-511`, `:560-567`).

- The shell (the `main`, its "Plor" `h1`, the frame with the top bar, tab bar or sidebar, and the footer) is one component, `Shell` in `src/app/shell-page.tsx` (`:14-27`; not the navigation's `Shell` in `src/app/shell.tsx`), drawn by the player pages' layout (`src/app/(shell)/layout.tsx`) and the 404 page.
- **The page's name:** with the shell, the `h1` holds the page's name under "Plor", at 1.5rem in `--muted` from 768px; its comma has no size, so it's read "Plor, Friends" (`globals.css:226-240`). The name is the tab the page is under, as the tab bar marks it: Today on the game screen and How to play, Me on `/streak`, Admin on the admin pages, none on an invite or the 404 (`src/app/shell.tsx:183-200`). Below 768px the `h1` is read, not shown.
- **Signed in, Today starts with the game:** `<html data-signed-in>` hides Today's introduction (`globals.css:213-215`). A script in `<head>` sets it before the first paint when Supabase's session cookie is there, by its name, and the frame then sets it from the profile it reads (`src/app/signed-in.ts`, `src/app/layout.tsx`).
- **Back buttons** read "‹" before the page they go back to. The clock bar's Back slides back from How to play and forward from anywhere else (`src/app/shell.tsx:368`).
- **Sharing:** the share sheet, or the clipboard where there's none; when the clipboard is refused, the text shows in a read-only field, selected, under "Copy it from here", laid out like the comment box (`src/app/share.tsx:11-46`, `src/app/share.module.css`). On your own invite link the page drops "A friend invited you…" and says "Send it to a friend." (`globals.css:219-221`).
- **The game screen** keeps the countdown two digits wide, so the prompt keeps its lines from 20 to 1 (`src/app/game.module.css:106`). Opened by Continue, Play with Skip the game screen, Start climbing or the clock bar's Back, it starts as a run in play: the question's skeleton until the run loads, the cards and feed hidden (`src/app/to-play.ts`, `src/app/game.tsx:366`); opened otherwise, it starts as before, the feed's column there from the first paint. The cards and feed stay mounted and hidden during the run, so a draft and the feed's day stay (`src/app/offbeat.tsx:75-78`, `src/app/side-column.tsx`).
- **A tab tapped while a page slides** still opens: the navigation can't be hit-tested during the slide, so a press under a shown link of it is caught and sent to that link; a keyboard's click, a modified click and one in a dialog or popover are left alone (`src/app/shell.tsx:288-310`).
- **Kept current:** the streak pill reads the profile again at the daily reset, from the profile's own `msToReset` (`src/app/home.tsx:148-154`); Me reads its numbers again after a time-up away from the game (`src/app/me.tsx:33`).
- **The 404 page:** any address that isn't a page, in the shell, signed in or out, with no tab current: one kit card, "Page not found", "There's nothing at this address." and a main button link "Go to Today"; the browser tab reads "Page not found" (`src/app/not-found.tsx:9-23`). The frame is told it's lost, so no tab nor Admin is marked current even under a tab's path (`/friends/nope`; `src/app/shell.tsx`, `lost`).

## Motion
- One easing and time: `--ease` `cubic-bezier(0.2, 0.8, 0.2, 1)` and `--quick` 200ms (`globals.css:369-372`). Under reduced motion nothing moves; a state still changes, at once.
- **Buttons**, on a device that hovers, lift 2px and their shadow grows to 6px, through `--shadow-button` (`globals.css:438-446`); a small one's to 5px (`kit.module.css:206-210`); a link drawn as a button the same (`button-link.module.css:25-30`). The reactions' ⋯ and its popover's items don't lift (`src/app/reactions.module.css:36-51`, `:82-91`).
- **Rows** take the soft tint under the pointer (`kit.module.css:72-87`).
- **The reactions' popover** pops in from 90%, from its top right corner (`reactions.tsx:105`, `reactions.module.css:66-75`); its emoji and actions take the soft tint under the pointer (`reactions.module.css:120-130`).
- **Tab icons** have two versions, an outline and a solid one that does something (Today's calendar peels a corner, Friends goes ^ ^ with a grin, Groups turns point-down, Me gains a sparkle), in the tab's own colour, muted at rest and the text colour hovered or current, as its label is (`src/app/shell.tsx:40-165`). The current tab shows the solid one; from 768px a hovered tab takes the soft fill and the solid one, which Groups turns 60° into (`shell.module.css:128-163`, `:251-279`).
- **Count-ups:** points and streaks (Me's totals, the game screen's streak and best score, the streak pill) count to their value over 600ms when it differs from what this browser last showed (`src/app/shown.ts:9`, `:50-76`, `src/app/count-up.tsx`).
- **Pops:** a reaction added, a comment that arrives and a new streak rank come in from 90% of their size (`kit.module.css:250-266`).

## Reactions
- A comment or a friend's run shows only the reactions used, in the set's order, as 13px text on the row's second line, each with its count; nothing when there are none (`src/app/reactions.tsx:15-45`, `src/app/reactions.module.css:6-17`). The player's own takes the soft tint and an accent edge, and is read as ", yours" (`reactions.module.css:19-22`, `reactions.tsx:37`).
- Each comment (once sent) and each friend's run has a ⋯ at its row's top right: 44px, three dots on the 24px icon grid at 22px, muted, the text colour while open or hovered (`reactions.tsx:66-137`, `reactions.module.css:30-61`; `src/app/comments.tsx:349-354`, `src/app/board.tsx:151`).
- It opens a popover in the kit's card right under it, right edges lined up: the five emoji, each 44px, the player's own filled with the accent, under the pointer too (`reactions.module.css:101-103`, `:126-129`), then a comment's Delete or Report, 44px, under a 2px ink line (`reactions.module.css:66-118`). A run has only the emoji.
- A pick, Escape, a press outside, focus leaving or another ⋯ opening closes it; a pick or Escape puts focus back on the ⋯ (`reactions.tsx:86-90`, `src/app/dismiss.ts`). The admin phone menu closes the same way (`src/app/admin/admin-area.tsx`, `PhoneMenu`).

## The leaderboard graph
- The Friends and group leaderboards have a List / Graph switch under their heading, Today's period strip again, List on every load (`src/app/leaderboard.tsx:40-47`). Today's leaderboard card has no graph.
- In Graph, each week is a race: every player's running total on each day that's over, Monday to Sunday columns, drawn at the width it shows (200px tall, 230px from 768px) so its text isn't scaled: 12px at the default, growing with the browser's text size, with its labels' spacing and the room kept for text (`src/app/race-layout.ts`, `k`) (`src/app/race.tsx:45-105`). This week marks today with a dashed `--edge` line and "Today" in the text colour; a Monday's week says "The first points arrive Tuesday, once Monday is over." (`src/app/race.module.css:26-41`, `:203-213`; `leaderboard.tsx:170`).
- Lines are 2px `--edge`, a found player's 2px `--text`, yours 3px `--accent`, drawn last; the leader's end carries the List's accent "1" badge (`race.module.css:43-84`).
- You, the leader and a found player are named at their line's end with their total in 12px, a name cut at 10 characters, ties sharing one label ("You & Fay 20"), labels at least 14px apart with a tick back to a dot they moved off, haloed in `--surface` (`src/app/race-layout.ts:62-138`, `race.module.css:86-109`). Gridlines step by 1, 2, 2.5 or 5 × 10ⁿ, at most 4 above 0, in `--line` with `--muted` numbers (`race-layout.ts:36-47`, `race.module.css:14-24`).
- A tap or click anywhere on a graph picks the player whose line passes nearest on that day's column, never you; picking them again clears them (`race-layout.ts:127-137`, `race.tsx:58-62`).
- A day the viewer is still playing adds nothing to anyone: its name is struck through, a muted line under the week says "Wednesday's points are hidden until you finish that run.", and the table shows "–" (`race.module.css:32-35`, `race.tsx:142-146`).
- **Find a player** sits under the switch: a 44px field with a 44px ✕, its suggestions in the flow under it in the kit's card, 44px rows with the avatar slot, the selected one in `--soft`, then "No player called “…” here." when nothing matches and the hint "Or choose someone's line on a graph. You'll see them in both weeks." (`src/app/find-player.tsx:68-130`, `race.module.css:111-192`). It's the WAI-ARIA APG combobox with automatic selection: Down and Up move and wrap, Enter or leaving the field takes the selected player, Escape closes the list, then clears (`find-player.tsx:48-66`, `:89`).
- **Show table**, a minor button beside each week's date chip, opens the running totals as a table under the graph, players by place, your row in the accent; it scrolls inside its own box with the 96px name column held at its left (`leaderboard.tsx:157-173`, `race.tsx:109-139`, `race.module.css:215-266`).

## Test runs (admin)
- `/admin/test/<date>` is the game screen's run, drawn by the same component as play (`src/app/game.tsx:270`), on the game screen's grid (`src/app/offbeat.tsx:89-114`).
- Above it, in the back link's row: a chip, "Test run: nothing is saved" or "Test run of the draft: nothing is saved", and a plain Restart button (`offbeat.tsx:98-101`), 16px apart and wrapping on a phone (`src/app/offbeat.module.css:25-30`).
- The result has no Share button (`game.tsx:579`); after the run the game screen's cards show and the comments don't (`offbeat.tsx:107-111`).
- On `/admin/puzzles`, each day has a Play test link beside Approve (`src/app/admin/puzzles/puzzles.tsx:172-174`), and above the day a date field, "Test an earlier day", up to today, with its own Play test (`puzzles.tsx:106-120`).
- On `/admin/audit`, a text a test run refused waits under To review with the reason chip "From your test run" (`src/app/admin/audit/audit.tsx:25`). It shows Accept when it names nothing (`audit.tsx:211`), or one "Accept <name> (<what it's a kind of>) as <category>" per thing it names, as a rejected text does (`audit.tsx:217-221`), and Dismiss.

## Answer search
- Once a run is over, each question on its result card has a minor "Search answers" button (`src/app/game.tsx:588`, `src/app/answer-search.tsx:40-44`); so does each question on yesterday's card (`src/app/offbeat.tsx:216`).
- Opened, it is a search field, "Search the answers" (`answer-search.tsx:49`), over at most 10 matches, 6px apart, the box 8px above them and 6px under the question (`src/app/answer-search.module.css:3-23`). Each match shows its name, the name that matched in muted text when that's another one, its tier as a chip, and "· N players" in muted text once enough players answered (`answer-search.tsx:60-64`). An empty field heads its list "The most given" (`answer-search.tsx:54`).
