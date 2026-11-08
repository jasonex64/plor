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
| Lines | `globals.css:9-41` | `:73-97` | `:103-127` | `:129-153` | `:155-179` |

- Each theme also sets `--soft` (the accent at low strength), `--safe`, `--safe-bg`, `--caught`, `--caught-bg`, four calendar shades `--shade-1` to `--shade-4` and their number colours `--on-shade-1` to `--on-shade-4`, in the same blocks.
- Paper is the default (`:root`, `globals.css:8`); with no theme chosen, a dark device gets Night's values (`globals.css:45-71`). A chosen theme is a `[data-theme]` attribute on `<html>`.
- The game's banner has its own colour in every theme: `--offbeat: #2f3d5c` with `--on-offbeat: #ffffff` (`globals.css:39-40`).
- `src/app/colors.test.ts` checks the pairings' contrast.

## Type
- One font, Baloo 2, from `src/app/fonts/Baloo2-latin.woff2`, declared at 400, 700 and 800 (`src/app/layout.tsx:19-26`) as `--font`, used by `body` (`globals.css:185`).
- Digits are tabular everywhere (`globals.css:187`). `h1`, `h2` and `h3` balance their lines, `p` avoids a lone last word (`globals.css:334-346`). `h1` and `h2` are 800 (`globals.css:329-332`).
- Every font size is in rem, 16px = 1rem, so text follows the player's browser text size; the px sizes in this file are at the browser's default (docs/milestones/M14-14b-17-lines-and-text-size.md). Paddings, gaps, borders, the 44px controls and the breakpoints stay px; the badge and the avatar slots are in rem too, so they grow with their letters (`kit.module.css:175-189`, `src/app/avatar.module.css`).
- A paragraph stops at 55ch, about 70 letters in Baloo 2 (`globals.css:341-346`). On the reading pages (Privacy, About and signed-out Today, marked `.reading`) a list item stops there too and an `h2` has 40px above it and 10px below (`globals.css:348-358`). A word too long for its box breaks (`globals.css:188-190`).
- Inputs and buttons are 16px (`globals.css:401-405`). A card's heading is 24px (`src/app/kit.module.css:30-33`); a chip and a badge are 12px (`kit.module.css:134`, `:187`).
- The numbers in stats are 40px where they fit, else a share of their cell's width (the cell is a size container, `src/app/kit.module.css:170`): Me's totals 24% (`src/app/me.module.css:68`), the game screen's stats 35% (`src/app/offbeat.module.css:95`); so is the number in `/streak`'s heading (`src/app/streak.module.css:18-20`).

## Corners, borders, shadows
- The ink of borders and shadows is the theme's text colour: `--ink: var(--text)` (`globals.css:379`).
- Corners: `--r-card` 5px, `--r-button` 5px, `--r-small` 4px, `--r-cell` 2px (`globals.css:380-383`).
- Only what can be pressed has a shadow: `--shadow-button` `0 4px 0` and `--shadow-button-small` `0 3px 0`, in the ink (`globals.css:384-385`). Cards, rows, chips, stats, the current tab and the streak pill are flat.
- One control height, 44px: fields and selects have a 2px ink border and the small corners (`globals.css:408-415`), at least 44px tall with 0 12px inside (`globals.css:419-424`); a text area keeps 10px 12px (`globals.css:426-428`). Their text is 16px, a text area's and a select's too (`globals.css:392-398`).
- Buttons are at least 44px tall, with a 2px ink border, the button corners and shadow (`globals.css:439-453`), the kit's kinds included (no vertical padding: `kit.module.css:206-247`); pressed, they drop 4px onto the shadow, which goes, in 80 ms (`globals.css:465-469`), and don't move under reduced motion (`globals.css:472-482`). A disabled button, of any kind, is flat: a `--edge` border on `--surface`, `--muted` text (`globals.css:487-493`). A link drawn as a button is 44px too (`src/app/button-link.module.css:10`). The reaction chips are the one exception until they move behind a menu (14b-10, answer 18).
- The focus ring is 3px in the accent, 3px out (`globals.css:365-368`).

## The kit (`src/app/kit.module.css`)
| Piece | Values | Lines |
|---|---|---|
| Card | 14px padding, 10px gap, 2px ink border, card corners, flat | 7-15 |
| Rows | 8px apart; each 8px 10px, 10px gap, 1.5px ink border, small corners | 48-65 |
| A row that opens (`.row > details`, "Where everyone ended") | its summary is the whole row, 44px tall for one line (`calc((44px - 1lh) / 2)` above and below); 8px under the open list | 69-83 |
| Your own row (`.row.you`) | the soft tint, on boards and in "Where everyone ended" | 68-70 |
| A row's second line (`.below`) | 6px gap, 6px above | 97-103 |
| Chip | 2px 9px, 1.5px ink border, small corners, 12px 700; 8px between chips | 107-125 |
| Stat | A cell on its card, no border, corners or fill: 10px 14px, centred, a size container for its number. The screen draws a 1px `--line` between cells: the game screen's three in a row (`src/app/offbeat.module.css:74-76`), Me's four as a cross (`src/app/me.module.css:51-57`). Me's "All games" card is that screen's one tinted card (`src/app/me.tsx:60`) | 147-155 |
| Badge | 24px round, ink fill, 12px 800; the first in the accent | 157-182 |
| Main button (`.primary`) | 0 18px, accent fill, 17px | 188-194 |
| Small button (`.small`) | 0 12px, small corners, small button shadow, 14px | 198-204 |
| Minor button (`.link`) | 0 10px, 1.5px ink border, no shadow, 14px | 218-229 |
| Danger (`.danger`) | the danger colour for the edge and text, on buttons, links and chips | 238-241 |

Chromium draws the 1.5px borders as 1px (`e2e/look.e2e.ts:109-110`).

## Spacing and layout
- A page's content is one column at most 960px wide with 16px padding (`globals.css:322-327`).
- Nothing pushes the page sideways when text is bigger: a card's head lets its chip drop under the heading (`kit.module.css:35-45`), a chip's text wraps (`:123-136`), a week's head on the leaderboard graph wraps (`src/app/race.module.css:194-201`), a board's row drops its points under the name (`src/app/leaderboard.module.css:77-90`), though at the default text size a long name is cut with an ellipsis and the points stay on its row, from a viewport 20em wide (`leaderboard.module.css:97-114`), and Today's column is as wide as the screen (`src/app/today.module.css:7`).
- **Below 768px:** a 56px top bar (`src/app/shell.module.css:25-32`) and a 64px tab bar at the foot with a 2px ink top rule (`shell.module.css:3-13`); the page leaves that room (`globals.css:210-213`), and what it scrolls to, by focus or a script, stops above the tab bar (and the clock bar), not under it: `--room-bottom` is the root's scroll padding (`globals.css:201-208`).
- **From 768px:** a 280px sidebar with a 2px ink right rule and no top bar (`shell.module.css:180-197`, `globals.css:267-278`).
- **From 1200px:** a 360px right column (`src/app/side-column.tsx:21`, `src/app/side-column.module.css:10`, `globals.css:291-294`).
- The streak pill in the top bar and the sidebar is fully round, in the soft tint, with a 1.5px ink border (`shell.module.css:58-72`); it looks 34px tall and is a 44px-tall target, through a `::after` centred on it (`:74-80`).
- During a run, the clock bar is 48px with a 2px ink rule (`shell.module.css:327-343`), above the tab bar on phones and at the top from 768px (`globals.css:262-264`, `:284-287`).
- Detail pages slide 60px over 200 ms, forward to the left and back to the right, and don't move under reduced motion (`globals.css:499-528`, `:577-584`).

- The shell (the `main`, its "Plor" `h1`, the frame with the top bar, tab bar or sidebar, and the footer) is one component, `Shell` in `src/app/shell-page.tsx` (`:14-29`; not the navigation's `Shell` in `src/app/shell.tsx`), drawn by the player pages' layout (`src/app/(shell)/layout.tsx`) and the 404 page.
- **The page's name:** with the shell, the `h1` holds the page's name under "Plor", at 1.5rem in `--muted` from 768px; its comma has no size, so it's read "Plor, Friends" (`globals.css:241-255`). The name is the tab the page is under, as the tab bar marks it: Today on the game screen and How to play, Me on `/streak`, Admin on the admin pages, none on an invite or the 404 (`src/app/shell.tsx:182-199`). Below 768px the `h1` is read, not shown.
- **Signed in, Today starts with the game:** `<html data-signed-in>` hides Today's introduction (`globals.css:222-224`). A script in `<head>` sets it before the first paint when Supabase's session cookie is there, by its name, and the frame then sets it from the profile it reads (`src/app/signed-in.ts`, `src/app/layout.tsx`).
- **Back buttons** read "‹" before the page they go back to. The clock bar's Back slides back from How to play and forward from anywhere else (`src/app/shell.tsx:367`).
- **Sharing:** the share sheet, or the clipboard where there's none; when either is refused, the text shows in a read-only field, selected, under "Copy it from here", laid out like the comment box (`src/app/share.tsx:11-50`, `src/app/share.module.css`).
- **Invites:** every Invite button on a page shares one code, made as soon as a button shows, so the first tap shares at once and a Reset reaches them all (`src/app/invite-link.tsx:22-49`, held by the frame). On your own invite link the page says "Send it to a friend." and, signed in, shows "A friend invited you…" only once the link is known to be a friend's; signed out it's there from the start (`globals.css:228-236`).
- **The settings sheet** closes on a tap on the dimmed page, not on a press that became a scroll nor a keyboard click (`src/app/settings.tsx:60-72`). A switch shows the newest pick while saves land (`:293`). A name refused after the sheet closed is said in the toast's alert (`:364-375`).
- **The comment box** stops a post it can't send: only spaces says "Write something first", more than 280 characters (counted as the database counts them, an emoji as one) says "280 characters at most", and nothing shows or is held (`src/app/comments.tsx:128-133`, `:280`). From 20 characters left a count shows under the box, "N left", and past the limit "N too many" in `--danger`, in the composer label's muted 13px (`comments.tsx:284-291`, `src/app/comments.module.css:30-45`).
- **Sign out** sends a post or reaction still held for Undo first; if it doesn't go, the sheet says "Your post didn't send. Try again, or sign out without it." with both buttons, and the player stays signed in. It waits for sends already under way, sends again what failed, signs out once however many taps, and keeps a failed post held until the player chooses (`src/app/settings.tsx:380`, `src/lib/hold.ts:97-125`, `:143-146`).
- **Screen readers:**
  - **Loading:** a page says "Loading" once, from the frame's one status, however many parts are loading. The placeholders are silent, their label in `data-loading` (`src/app/skeleton.tsx:13-38`).
  - **Undo and Close** put focus back where the player was before the toast, or on the page's `h1` if that's gone, without scrolling the page (`src/app/undo.tsx:40-55`, `src/app/shell-page.tsx:19`).
  - **The toast:** a failed send is an `alert`, read at once; what's held is a `status`, drawn anew each time so the same words are read again (`undo.tsx:75`, `:87`).
  - **Delete or Report:** focus moves to the next comment's ⋯, the one before if it was last, or the feed's heading (`src/app/comments.tsx:162-171`).
  - **Reactions** under a comment or a run are a group named "Reactions" (`src/app/reactions.tsx:24`); on your own run's line the group is named by its visible label, "Reactions on your run", which is read once (`src/app/board.tsx:126-130`).
  - **The countdown** says "seconds left" in its own text (`src/app/game.tsx:424`).
  - **Crossing 1200px:** the feed column keeps focus where it was (`src/app/side-column.tsx:34-45`).
- **The game screen** keeps the countdown two digits wide, so the prompt keeps its lines from 20 to 1 (`src/app/game.module.css:106`). Opened by Continue, Play with Skip the game screen, Start playing or the clock bar's Back, it starts as a run in play: the question's skeleton until the run loads, the cards and feed hidden (`src/app/to-play.ts`, `src/app/game.tsx:374`); opened otherwise, it starts as before, the feed's column there from the first paint. The cards and feed stay mounted and hidden during the run, so a draft and the feed's day stay (`src/app/offbeat.tsx:74-77`, `src/app/side-column.tsx`).
- **The result** comes into view when a Result link (the banner's, the clock bar's) opens the game screen, once: then `#result` leaves the address, so the page shown again or reloaded stays where the player left it (`src/app/game.tsx:581-585`). With the result already drawn and shown, the game screen's own Result scrolls to it without adding `#result` (`game.tsx:337-342`, `:346`).
- **A tab tapped while a page slides** still opens: the navigation can't be hit-tested during the slide, so a press under a shown link of it is caught and sent to that link; a keyboard's click, a modified click and one in a dialog or popover are left alone (`src/app/shell.tsx:287-309`).
- **Kept current:** the streak pill reads the profile again at the daily reset, from the profile's own `msToReset` (`src/app/home.tsx:148-154`); Me reads its numbers again after a time-up away from the game (`src/app/me.tsx:33`); on the Friends tab a time-up starts the board alone again (`src/app/home.tsx:613-615`).
- **The 404 page:** any address that isn't a page, in the shell, signed in or out, with no tab current: one kit card, "Page not found", "There's nothing at this address." and a main button link "Go to Today"; the browser tab reads "Page not found" (`src/app/not-found.tsx:9-23`). The frame is told it's lost, so no tab nor Admin is marked current even under a tab's path (`/friends/nope`; `src/app/shell.tsx`, `lost`).

## Motion
- One easing and time: `--ease` `cubic-bezier(0.2, 0.8, 0.2, 1)` and `--quick` 200ms (`globals.css:386-389`). Under reduced motion nothing moves; a state still changes, at once.
- **Buttons**, on a device that hovers, lift 2px and their shadow grows to 6px, through `--shadow-button` (`globals.css:455-463`); a small one's to 5px (`kit.module.css:224-228`); a link drawn as a button the same (`button-link.module.css:25-30`). The reactions' ⋯ and its popover's items don't lift (`src/app/reactions.module.css:36-51`, `:82-91`).
- **Rows** take the soft tint under the pointer (`kit.module.css:90-105`).
- **The reactions' popover** pops in from 90%, from its top right corner (`reactions.tsx:107`, `reactions.module.css:66-75`); its emoji and actions take the soft tint under the pointer (`reactions.module.css:120-130`).
- **Tab icons** have two versions, an outline and a solid one that does something (Today's calendar peels a corner, Friends goes ^ ^ with a grin, Groups turns point-down, Me gains a sparkle), in the tab's own colour, muted at rest and the text colour hovered or current, as its label is (`src/app/shell.tsx:39-164`). The current tab shows the solid one; from 768px a hovered tab takes the soft fill and the solid one, which Groups turns 60° into (`shell.module.css:128-163`, `:251-279`).
- **Count-ups:** points and streaks (Me's totals, the game screen's streak and best score, the streak pill) count to their value over 600ms when it differs from what this browser last showed (`src/app/shown.ts:9`, `:50-76`, `src/app/count-up.tsx`).
- **Pops:** a reaction added, a comment that arrives and a new streak rank come in from 90% of their size (`kit.module.css:268-284`).

## Reactions
- A comment or a friend's run shows only the reactions used, in the set's order, as 13px text on the row's second line, each with its count; nothing when there are none (`src/app/reactions.tsx:15-47`, `src/app/reactions.module.css:6-17`). The player's own takes the soft tint and an accent edge, and is read as ", yours" (`reactions.module.css:19-22`, `reactions.tsx:39`).
- Each comment (once sent) and each friend's run has a ⋯ at its row's top right: 44px, three dots on the 24px icon grid at 22px, muted, the text colour while open or hovered (`reactions.tsx:68-139`, `reactions.module.css:30-61`; `src/app/comments.tsx:407-412`, `src/app/board.tsx:152`).
- It opens a popover in the kit's card right under it, right edges lined up: the five emoji, each 44px, the player's own filled with the accent, under the pointer too (`reactions.module.css:101-103`, `:126-129`), then a comment's Delete or Report, 44px, under a 2px ink line (`reactions.module.css:66-118`). A run has only the emoji.
- A pick, Escape, a press outside, focus leaving or another ⋯ opening closes it; a pick or Escape puts focus back on the ⋯ (`reactions.tsx:88-92`, `src/app/dismiss.ts`). The admin phone menu closes the same way (`src/app/admin/admin-area.tsx`, `PhoneMenu`).

## The leaderboard graph
- The Friends and group leaderboards have a Game switch under their heading, Game number 1 / Game number 2, game 1 on every load, then a List / Graph switch, Today's period strip again, List on every load (`src/app/leaderboard.tsx`, `Leaderboard`). Game 2's board adds the note "Each day adds the % of players you beat." and shows each total as a plain number, not points (M16 16e-2). Today's leaderboard card has no graph and stays game 1's.
- In Graph, each week is a race: every player's running total on each day that's over, Monday to Sunday columns, drawn at the width it shows (200px tall, 230px from 768px) so its text isn't scaled: 12px at the default, growing with the browser's text size, with its labels' spacing and the room kept for text (`src/app/race-layout.ts`, `k`) (`src/app/race.tsx:45-105`). This week marks today with a dashed `--edge` line and "Today" in the text colour; a Monday's week says "The first points arrive Tuesday, once Monday is over." (`src/app/race.module.css:26-41`, `:203-213`; `leaderboard.tsx:170`).
- Lines are 2px `--edge`, a found player's 2px `--text`, yours 3px `--accent`, drawn last; the leader's end carries the List's accent "1" badge (`race.module.css:43-84`).
- You, the leader and a found player are named at their line's end with their total in 12px, a name cut at 10 characters, ties sharing one label ("You & Fay 20"), labels at least 14px apart with a tick back to a dot they moved off, haloed in `--surface` (`src/app/race-layout.ts:62-138`, `race.module.css:86-109`). Gridlines step by 1, 2, 2.5 or 5 × 10ⁿ, at most 4 above 0, in `--line` with `--muted` numbers (`race-layout.ts:36-47`, `race.module.css:14-24`).
- A tap or click anywhere on a graph picks the player whose line passes nearest on that day's column, never you; picking them again clears them (`race-layout.ts:127-137`, `race.tsx:58-62`).
- A day the viewer is still playing adds nothing to anyone: its name is struck through, a muted line under the week says "Wednesday's points are hidden until you finish that run.", and the table shows "–" (`race.module.css:32-35`, `race.tsx:142-146`).
- **Find a player** sits under the switch: a 44px field with a 44px ✕, its suggestions in the flow under it in the kit's card, 44px rows with the avatar slot, the selected one in `--soft`, then "No player called “…” here." when nothing matches and the hint "Or choose someone's line on a graph. You'll see them in both weeks." (`src/app/find-player.tsx:69-131`, `race.module.css:111-192`). It's the WAI-ARIA APG combobox with automatic selection: Down and Up move and wrap, Enter or leaving the field takes the selected player, Escape closes the list, then clears (`find-player.tsx:49-67`, `:90`). A name typed in full is picked, and the list still offers every name it starts ("Be", "Bea", "Ben") (`find-player.tsx:28`, `:40-47`).
- **Show table**, a minor button beside each week's date chip, opens the running totals as a table under the graph, players by place, your row in the accent; it scrolls inside its own box with the 96px name column held at its left (`leaderboard.tsx:157-173`, `race.tsx:109-139`, `race.module.css:215-266`).

## Test runs (admin)
- `/admin/test/<date>` is the game screen's run, drawn by the same component as play (`src/app/game.tsx:269`), on the game screen's grid (`src/app/offbeat.tsx:88-113`).
- Above it, in the back link's row: a chip, "Test run: nothing is saved" or "Test run of the draft: nothing is saved", and a plain Restart button (`offbeat.tsx:97-100`), 16px apart and wrapping on a phone (`src/app/offbeat.module.css:25-30`).
- The result has no Share button (`game.tsx:599`); after the run the game screen's cards show and the comments don't (`offbeat.tsx:106-110`).
- On `/admin/puzzles`, each day has a Play test link beside Approve (`src/app/admin/puzzles/puzzles.tsx:190-192`), and above the day a date field, "Test an earlier day", up to today, with its own Play test (`puzzles.tsx:124-138`).
- On `/admin/puzzles`, under game 1's days, a "Game 2" section lists game 2's days, a card a day: the date, its state, Approve, its seven sets of letters as chips and its bonus letter (`src/app/admin/puzzles/substring-days.tsx`), with the section's spacing and chip row in `puzzles.module.css` (`.gameDays`, `.rounds`). A day redrafted after approval shows both, "Approved" above "Redrafted", with a state line saying players get the approved letters. It's absent when game 2 has no days. Word counts aren't shown: they're in the batch's PR. The admin home's days to approve count both games (`src/app/admin/admin-area.tsx`).
- `/play2`, game 2's plain screen (`src/app/substrings.tsx`, `substrings.module.css`): the kit's card, a round's letters at 48px, the clock at 24px, the bonus letter, the letters tracker (a count of the letters used, and the alphabet with those underlined, `.tracker`, `.alphabet`, `.used`), the box and Try, and the reason a try failed. A try that didn't count clears the box. Between rounds, what was played with its points and the tracker, and Next. At the end, the score (words, bonus letter, different letters, total, `.score`), then "Better than X% of players so far today." once 10 have finished and "2nd of 6 with your friends so far today." once a friend has, and a list of the rounds with each word's points, with examples under a missed one. It has no feed column (`feedBeside`, `src/app/home.tsx`). Moonbrew replaces it.
- On `/admin/audit`, a text a test run refused waits under To review with the reason chip "From your test run" (`src/app/admin/audit/audit.tsx:25`). It shows Accept when it names nothing (`audit.tsx:211`), or one "Accept <name> (<what it's a kind of>) as <category>" per thing it names, as a rejected text does (`audit.tsx:217-221`), and Dismiss.

## Answer search
- Once a run is over, each question on its result card has a minor "Search answers" button (`src/app/game.tsx:608`, `src/app/answer-search.tsx:40-44`); so does each question on yesterday's card (`src/app/offbeat.tsx:214`).
- Opened, it is a search field, "Search the answers" (`answer-search.tsx:49`), over at most 10 matches, 6px apart, the box 8px above them and 6px under the question (`src/app/answer-search.module.css:3-23`). Each match shows its name, the name that matched in muted text when that's another one, its tier as a chip, and "· N players" in muted text once enough players answered (`answer-search.tsx:60-64`). An empty field heads its list "The most given" (`answer-search.tsx:54`).
