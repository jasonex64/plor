# Look, feel and moment-to-moment UI of popular daily web puzzle and word games

Researched 2026-11-16. Reader's note on evidence quality: primary design write-ups for these games are scarce. Creative Review's NYT Games design piece returned HTTP 403 and Webflow's Wordle piece failed to load, so both are cited only as far as the search summaries reported them. Where a detail comes from my own recall of the games and no source fetched this session confirms it, it sits under **Inferences** or **Gaps** and is marked *unverified recall*. Nothing under **Cited Findings** is from memory.

## Wordle (original Josh Wardle version and NYT version): why the minimal look works; flip and shake animations; colour; share grid

### Takeaway
Wordle's look works because every visual element is feedback: three colours, one grid, a keyboard that mirrors the grid, and a reveal animation that confirms the guess. Its share grid was a player's invention that Wardle adopted, and it spread because it shows the shape of a game without the answer.

### Cited Findings
- Wardle described building it as simply as possible: a website plus some JavaScript, nothing else (search summary of the Webflow piece; page itself failed to load). — [Webflow, "How Wordle won the internet"](https://webflow.com/blog/wordle-design)
- The grid is 6 rows by 5 columns; each tile takes one of three states: green (right letter, right place), yellow (in the word, wrong place), grey (absent). The colour feedback is the game's whole constraint system. — [Pratt IXD, "Design Critique: Wordle (Website)", Sept 2025](https://ixd.prattsi.org/2025/09/design-critique-wordle-website/)
- The post-guess tile animation is read by players as immediate confirmation that the guess went in; the same colours then map onto the on-screen keyboard, which the critique credits with making the game understandable. — [Pratt IXD, Sept 2025](https://ixd.prattsi.org/2025/09/design-critique-wordle-website/)
- Sources disagree on how much animation there is: one says none beyond the flip reveal, another calls the interface free of animation, and a hobbyist rebuild lists a pop on typing and a shake on invalid words as the micro-interactions that make it satisfying. None is a primary source on Wardle's intent. — [Buttondown, "30 Days of Vibe Coding, Day 12: Wordle"](https://buttondown.com/nuno/archive/30-days-of-vibe-coding-day-12-wordle/); [Webflow](https://webflow.com/blog/wordle-design)
- The emoji share grid came from a New Zealand player (@irihapeta) who typed the squares by hand on 2021-12-02; Wardle then built it in as a Share button (one source dates that to 2021-12-16). — [The Spinoff, 2022-01-13](https://thespinoff.co.nz/media/13-01-2022/those-coloured-boxes-on-twitter-are-new-zealands-fault); [BuzzFeed News](https://www.buzzfeednews.com/article/stefficao/how-wordle-went-viral-strategy)
- Wardle's stated reason the grid works: it keeps only the colours, so you can show how you did without ruining the puzzle for others. It also uses emoji every platform already renders. — [Smithsonian Magazine](https://www.smithsonianmag.com/smart-news/heres-why-the-word-game-wordle-went-viral-180979439/); [Beast of Traal](https://beastoftraal.com/?p=19327)
- The share grid relies on colour alone; a 2022 comparison noted a rival (Word Game Hero) used different shapes per result, kinder to colour-blind players. — [Troy Press, 2022-01-18 (older)](https://troypress.com/what-other-implementations-of-wordle-can-teach-us)
- Wordle has a dark theme and a High Contrast Mode that replaces green and yellow; most sources say orange and blue, though sources disagree on which colour maps to which state. NYT's help centre confirms the setting exists. — [Wikipedia, Wordle](https://en.wikipedia.org/wiki/Wordle); [NYT Help Center](https://thenewyorktimeshelpcenter.helpjuice.com/24611727334932-Wordle); [Bill Fischer Substack](https://billfischer.substack.com/p/these-2-wordle-colors-undermine-color)
- Streak tracking was called a key to Wordle's habit-forming success; most early rivals lacked it. Invalid-guess messaging matters: "Not on my word list" was preferred over a bare "Not a word". A per-guess time limit (in the Lingo app) was judged wrong for a solo game. — [Troy Press, 2022-01-18 (older)](https://troypress.com/what-other-implementations-of-wordle-can-teach-us)

### Inferences
- The three motions Wordle is known for each answer one question: pop on keypress = "the letter registered"; row shake = "not accepted, nothing lost"; staggered flip = "here is your result, one tile at a time". For Plor's timed typing games the same mapping applies directly: accepted, rejected, revealed.
- *Unverified recall (not confirmed by a fetched source):* tiles flip one after another left to right with a stagger of a few hundred ms, colour changing at the flip's midpoint; a winning row does a small bounce wave; win toasts are single words that vary by guess count ("Genius" down to "Phew"); the stats sheet is four numbers (played, win %, current streak, max streak), a horizontal bar chart of the guess distribution with today's bar highlighted, and a countdown to the next puzzle beside the Share button. Original light-mode colours are commonly given as green #6aaa64, yellow #c9b458, grey #787c7e. NYT kept the board nearly unchanged and restyled the title in its condensed slab display face (NYT Karnak Condensed) with NYT Franklin for UI text.
- The staggered reveal is the one deliberate delay in the game, and it creates suspense from data the client already has. Offbeat's "did I match the host?" reveal is the same shape of moment.

### Gaps
- No primary source (Wardle interview or NYT post) found explaining the flip or shake choices or exact timings. Hex values, timing and font names above are recall only; verify against the live game's CSS before citing them as fact.
- Could not load Webflow's full article (header overflow) or confirm its publication date.

## NYT Games (Connections, Strands, Spelling Bee, Mini, Letter Boxed, Pips, Tiles): design language, per-game colour identity, the 2023+ rebrand, illustration, motion

### Takeaway
NYT's approach is a shared, deliberately quiet system (common components, streamlined type, clear icons) in which each game owns one recognisable shape-and-colour idea. The March 2024 app redesign used colour mainly to tell new players "there are many games here".

### Cited Findings
- The app was renamed from "NYT Crosswords" to "NYT Games" and, about a year later (reported 2024-03-07), redesigned as a hub for all games: every game, archive and pack listed in one place; bottom bar cut from five tabs to three (Games, Stats, Leaderboard). — [TechCrunch, 2024-03-07](https://techcrunch.com/?p=2675705)
- Lian Chang, NYT Games principal product designer, on the redesign: "We want new players to get a sense of the breadth of all the games, so we used a lot of color." Brand icons were made clearer and typography streamlined. Jennifer Scheerer is named as product design director. — [TechCrunch, 2024-03-07](https://techcrunch.com/?p=2675705)
- Game cards show progress once a game is started (how far through the puzzle), which designers said encourages finishing; the home greeting changes with time of day. — [TechCrunch, 2024-03-07](https://techcrunch.com/?p=2675705)
- Under Jonathan Knight, much of the work has been shared design systems and reusable interface components so navigation and interactions stay consistent between puzzles; the app's visual language is understated so the puzzles take centre stage (search summary; article returned 403). — [Creative Review](https://www.creativereview.co.uk/new-york-times-games-wordle-crossplay-design-jonathan-knight/)
- Each game is recognisable by one device: Wordle's coloured tiles, Spelling Bee's honeycomb, Connections' grouped categories. — [GeekChamp](https://geekchamp.com/?p=791907) (secondary, low authority)
- Connections has a simple colour-based identity built to be shared and, like Wordle, designed to look good on social platforms. — [Aftermath, Nathan Grayson, 2024-04-18](https://aftermath.site/new-york-times-wordle-connections-puzzmo-games.md)
- NYT's Zoe Bell: the team asks what a player would want to tell friends after finishing (a near-miss recovery, a perfect score); a small text or graphic element beside the result makes sharing more likely. — [Aftermath, 2024-04-18](https://aftermath.site/new-york-times-wordle-connections-puzzmo-games.md)
- The puzzle editor's voice is part of the identity: Connections' Wyna Liu is recognisable and drives fan conversation. — [Aftermath, 2024-04-18](https://aftermath.site/new-york-times-wordle-connections-puzzmo-games.md)
- NYT Games design job listings ask for work consistent with the broader NYT Games aesthetic and list product iconography, illustration and animation in the art team's remit. — [NYT job listing](https://job-boards.greenhouse.io/thenewyorktimes/jobs/4625678005); [NYT job listing](https://job-boards.greenhouse.io/thenewyorktimes/jobs/4607280005)
- Knight described the Crossword-to-Games move as a multi-year transformation rolled out at the start of 2024. — [GamesBeat](https://gamesbeat.com/?p=310562)

### Inferences
- NYT's pattern is "one system, one signature per game": identical chrome, type and buttons everywhere; the game's identity lives in a single board shape plus a small palette. That is a cheaper route to "each game has its own identity" than a full theme, and it is the opposite of the pixel-art and 3D-village attempts that Plor reverted.
- Bell's "what would the player tell a friend" question is a usable test for Plor's end screens and share text: Offbeat's story is "which host answers I dodged or hit"; Fragments' is "the word I found and how fast".
- *Unverified recall:* Connections ranks its four groups by colour (yellow easiest, then green, blue, purple hardest); wrong guesses make the selected tiles shake and a toast says "One away..." when three of four are right; solved groups collapse into a full-width coloured bar; mistakes are four dots that disappear. Strands colours found theme words pale blue and the spangram yellow, drawing a connecting line through the letters as you drag; its share text is a row of coloured circles with a lightbulb for each hint. Spelling Bee is yellow hexagons around a centre letter with a rank ladder (Beginner to Genius, then Queen Bee) shown as dots on a line; found words bounce up into a list. Each game has a flat single-colour icon tile on the hub (Wordle green-grey, Connections lavender, Spelling Bee yellow, Mini blue, Strands teal-green, Letter Boxed pink-red). Type is NYT Karnak Condensed for game titles and NYT Franklin for UI.

### Gaps
- Found no NYT Open post or design-team talk about the Games visual system, motion or illustration. Tiffany Pai (Senior Art Director, NYT Brand Identity team) is listed as a speaker at an in-house design conference, but nothing ties her talk to Games: [UnderConsideration](https://underconsideration.com/inhouseinfocus/inperson/in2026/Speakers_A5_Tiffany_Pai.php).
- Nothing found specific to Pips, Tiles, Letter Boxed or the Mini's look, or naming the illustrators and motion designers.
- Creative Review's article (the best single source on this) is behind a 403; someone with a browser should read it.

## Puzzmo (Zach Gage and Hearst): per-game identity, typography, motion, design writeups

### Takeaway
Puzzmo's published writing is about principles and layout, not style: "low floor, high ceiling", games as sandboxes, hard daily limits instead of dark patterns, and a page that puts the game at the centre with everything else in one collapsible sidebar. I found no source describing its typefaces, palette or motion.

### Cited Findings
- Puzzmo launched under Hearst ownership; launch games included Really Bad Chess, TypeShift, Flipart and Cross|word; leaderboards, groups and archives were subscriber features. — [Game Developer, Chris Kerr, 2023-11-09](https://www.gamedeveloper.com/design/puzzmo-co-creator-zach-gage-on-building-newspaper-games-that-can-last-forever)
- Gage's stated principles: every game is a sandbox a newcomer can poke at; support beginners in the ways they expect without getting in experts' way; an idea is "interesting" in proportion to how many things the player already knows it connects to; design for longevity, not an imagined audience. — [Game Developer, 2023-11-09](https://www.gamedeveloper.com/design/puzzmo-co-creator-zach-gage-on-building-newspaper-games-that-can-last-forever)
- Gage sums the philosophy up as "low floor, high ceiling" and compares the social layer to Steam and Xbox Live Arcade; Hearst's Andrew Daines says saved scores, achievements and friend groups are what competitors cannot copy. — [Aftermath, 2024-04-18](https://aftermath.site/new-york-times-wordle-connections-puzzmo-games.md)
- Team: Gage and Orta Therox co-founded it; Saman Bemel-Benrud programs games and writes the design posts; Jack Schlesinger co-designs. — [Game Developer, 2023-11-09](https://www.gamedeveloper.com/design/puzzmo-co-creator-zach-gage-on-building-newspaper-games-that-can-last-forever)
- 2025 redesign preview: game headings de-emphasised so thumbnails carry the Today page; the game page is rebuilt to maximise the space the game occupies on any screen; all surrounding content moves into one sidebar whose sections collapse; the game-complete sidebar stays; mobile drops the social tab and secondary toolbar; social shifts toward leaderboards, daily news and profile stats and away from real-time collaboration. — [Puzzmo blog (staging mirror), Saman Bemel Benrud, 2025-02-06](https://blog-puzzmo-com-staging.vercel.app/posts/2025/02/06/redesign)
- The same post reports moving off React Native to plain React (Vite, StyleX, Base UI) for performance, smaller bundle, hover states and real links. — [Puzzmo blog (staging mirror), 2025-02-06](https://blog-puzzmo-com-staging.vercel.app/posts/2025/02/06/redesign)
- Games hook into shared platform systems: the completion screen takes custom per-game events, and leaderboards can be defined per game or club with a one-line score expression. — [Puzzmo blog (staging mirror), 2024-09-19](https://blog-puzzmo-com-staging.vercel.app/posts/2024/09/19/plugins-are-back-in-style); [Puzzmo blog (staging mirror), 2024-07-24](https://blog-puzzmo-com-staging.vercel.app/posts/2024/07/24/groups-to-clubs)
- Anti-dark-pattern stance: Pile-Up Poker is capped at five hands a day (Gage would have preferred three) so it cannot absorb unlimited time or burn players out. — [Six Colors, Jason Snell, 2024-08-14](https://sixcolors.com/post/2024/08/interview-game-developer-zach-gage-on-pile-up-poker-and-resisting-dark-patterns/)

### Inferences
- Puzzmo's structure matches Plor's situation closely (small team, several games, friends and leaderboards): one shared shell and one shared completion panel that each game feeds with its own events and its own leaderboard definition. Identity per game then sits in the board and the thumbnail, not in the shell.
- *Unverified recall:* Puzzmo's look is a warm off-white "newsprint" page, heavy black display type, one saturated flat colour per game used on its thumbnail and accents, hand-drawn-feeling logos, and springy, slightly overshooting motion on pieces; the completion panel lists several small stat lines (time, hints, a game-specific feat) that count in one by one, then the leaderboards.

### Gaps
- No source found on Puzzmo's typefaces, colour system, illustration or motion. The Pile-Up Poker design-process post referenced by the launch post was not located. Blog links above are to a staging mirror surfaced by search; the canonical blog is blog.puzzmo.com.
- The Game Developer, Six Colors and Aftermath pieces contain nothing on visuals, sound or end screens.

## LinkedIn games, Apple News+ puzzles, and the independent dailies (Bandle, Framed, Heardle, Immaculate Grid, Waffle, Squardle, Quordle, Costcodle, GeoGuessr daily, Globle, Worldle, Semantle, Contexto, Redactle, Connections-likes): memorable vs generic

### Takeaway
Written evidence here is thin. What sources do say: LinkedIn's games are judged good but visually indistinguishable from NYT's, and the Wordle descendants that lasted were the ones with a different mechanic, most of which kept Wordle's tile-and-colour look.

### Cited Findings
- LinkedIn's games look as if lifted from the NYT's pages, though each has its own mechanic; they are lighter than Puzzmo's, and come with streaks and network comparison meant to keep people on LinkedIn. — [Aftermath, Riley MacLeod, 2024-10-21, updated 2025-10-27](https://aftermath.site/linkedin-games)
- Another reviewer calls LinkedIn's design and graphics "simple but refined". — [SmartCompany](https://smartcompany.com.au/opinion/linkedin-games-review-smartcompany-tegan-jones)
- Queens was architected by puzzle designer Thomas Snyder; Tango (Oct 2024) is a grid of suns and moons; Zip (Mar 2025) was pitched as learnable in seconds. — [TechCrunch, 2024-05-01](https://techcrunch.com/2024/05/01/linkedin-launches-gaming-three-logic-puzzles-aiming-to-extend-time-spent-on-its-networking-platform); [Social Media Today](https://www.socialmediatoday.com/news/linkedin-adds-zip-puzzle-game/742847/)
- Waffle keeps Wordle's minimalist design and per-tile colour coding, giving it the same easy-on-the-eyes tone. — [Den of Geek](https://www.denofgeek.com/games/best-daily-games-wordle-clones-spin-offs)
- The successful descendants were unique variations on the format, not carbon copies (a game-design professor quoted by Kotaku). — [Kotaku](https://kotaku.com/wordle-clones-twitter-word-game-absurdle-lewdle-dordle-1848414806)
- Early App Store clones changed almost nothing, including the name. — [Wikipedia, Wordle](https://en.wikipedia.org/wiki/Wordle)

### Inferences
- In this genre the memorable thing is usually a single object, not a theme: Waffle's waffle-shaped grid, Queens' coloured regions and crowns, Tango's sun and moon, Globle's globe that fills in hotter reds, Worldle's country silhouette, Framed's film stills, Heardle's audio bar. Games whose object is a plain text list (Semantle, Contexto, Redactle) are remembered for the mechanic and are visually generic. *This list is unverified recall of the games, not sourced.*
- By that test, Plor's two games already have candidate signature objects: Fragments has the letter chunk itself (e.g. "cks") and Offbeat has the host and the taken letters. Giving those one distinctive treatment each would follow the pattern that works, at far lower cost than a scene or theme.
- *Unverified recall:* LinkedIn's end screen leads with your time, then "faster than N% of players" and which connections played, with a flame-style streak counter; the share text is the game number, time and a short emoji row.

### Gaps
- No source found describing the interface of Bandle, Framed, Heardle, Immaculate Grid, Squardle, Quordle, Costcodle, GeoGuessr's daily, Globle, Semantle, Contexto or Redactle; no LinkedIn design or engineering post on the games' visuals; nothing on Apple News+ puzzles at all. These need a hands-on pass with screenshots.

## Timed typing word games (Typeshift, SpellTower, Letterpress, Words With Friends, Wordscapes, Alphabear; BombParty): showing time pressure and typed-word feedback without clutter

### Takeaway
I found almost no written design analysis of how these games present time pressure. The usable evidence is small: players of bomb-typing games say they do not look at a separate timer while typing, and prefer time shown on the thing they are already watching.

### Cited Findings
- BombParty-style loop: type a word containing the given substring before the timer ends or the bomb explodes and costs a life (three lives in the cited clone). — [NEU CS4530 project showcase (student clone)](https://neu-se.github.io/CS4530-Spring-2024/assets/images/project_showcase/414.pdf)
- Player comments on bomb-typing jam games: one focused on the letters and did not see the bomb timer at all; another praised a design where the word itself drops to show how much of its time is left; others suggested marking a wrong letter in red in place. — [itch.io comment](https://itch.io/post/16781457); [itch.io comment](https://itch.io/post/13651538); [itch.io comment](https://itch.io/post/16865048) (anecdotal; individual players on small jam games)
- A per-guess time limit was judged inappropriate in a solo Wordle-like (Lingo). — [Troy Press, 2022-01-18 (older)](https://troypress.com/what-other-implementations-of-wordle-can-teach-us)
- Typeshift: Gage found early versions never got easier as words were solved and fixed it with a "clue puzzle" stage; he wanted an alternative route to the solution but the design was too tight to fit one easily. — [Game Developer](https://gamedeveloper.com/design/how-zach-gage-fine-tuned-the-difficulty-curve-of-i-typeshift-i-); [App Store, Meet the Developer](https://apps.apple.com/us/story/id1258800222)
- Alphabear (Spry Fox, July 2015) is a Scrabble-style game with collectable bear power-ups; it won Standout Indie at the 2016 Google Play Awards. — [Wikipedia, Alphabear](https://en.wikipedia.org/wiki/Alphabear); [Wikipedia, Spry Fox](https://en.wikipedia.org/wiki/Spry_Fox)
- Hardware-keyboard research: audible key-click feedback gave the highest typing speed and lowest error rate among the feedback conditions tested (physical keyboards, only loosely applicable). — [Purdue, Kim and Tan, 2015](https://engineering.purdue.edu/~hongtan/pubs/PDFfiles/C68_JKimTan_WHC2015.pdf)

### Inferences
- Put the clock where the eyes already are. While typing, players look at the input and the prompt; a timer in a corner goes unseen. Options consistent with the comments above: the input's own border or underline draining, the prompt chunk changing colour, or the background shifting, with sound carrying the last seconds.
- Mark errors in place and instantly (the offending letter, or a shake of the input), never in a separate message that pulls the eye away mid-countdown. Offbeat's taken letters fit this: show the rejection on the key or letter itself.
- *Unverified recall:* JKLM's BombParty puts the syllable on a bomb at the centre of a ring of player avatars, with an arrow pointing at whose turn it is; each player's typing appears live under their avatar with the required syllable highlighted once it is present; hearts show lives; the bomb's fuse and tick are the only timer and there is no number. Alphabear's time pressure is on the tiles: each letter shows a turn countdown, goes red at 1 and turns to stone at 0, blocking the bears from growing; its charm comes from round hand-drawn bears in costumes that stretch to fill cleared space, and an end screen where a bear speaks a silly sentence built from words you played, made to be shared. SpellTower and Typeshift use almost nothing but large bold letters on flat colour, with the selected word echoed big at the top and invalid words simply not lighting up. Wordscapes pairs a letter wheel with photographic backdrops and coin showers; Words With Friends is a conventional board with heavy meta-UI.
- Alphabear is the nearest precedent for what the owner wants from "personal and customised": one small family of characters plus one writing voice, layered over an ordinary tile grid, with no scene or world. It suggests charm can come from a mascot and copy, which are cheap to change, and not from the environment.

### Gaps
- No design write-up found for BombParty's UI, SpellTower, Letterpress, Words With Friends, Wordscapes or Alphabear's art direction; the Alphabear search returned only release facts. Every interface description above is recall and should be checked against the games.
- No source found with measured guidance on timer presentation (bar vs ring vs number) for typing games.

## What creates "juice" in an otherwise minimal UI (micro-animations, haptics, sound, confetti, count-ups)

### Takeaway
Sources agree on restraint: few effects, each tied to a meaningful game event, fast to respond, with animation, sound and haptics designed together and spent mostly on the actions repeated most often.

### Cited Findings
- "Juice" is traced to the 2012 talk "Juice it or lose it", where a plain Breakout became fun by adding flash, shake, floating text, sound and particles. — [EastonDev, 2026-05-21](https://eastondev.com/blog/en/posts/dev/20260521-game-feedback-feel/)
- Juice should echo the core gameplay and not be a layer on top; Balatro without its animation and sound is described as a calculator. — [Game Developer, "6 mistakes that'll drain the juice out of your game"](https://gamedeveloper.com/design/6-mistakes-that-ll-drain-the-juice-out-of-your-game); [Blake Crosley, Balatro design guide](https://blakecrosley.com/guides/design/balatro)
- Response speed matters more than spectacle: the faster the reaction to input the juicier it feels; avoid long wind-ups, prefer quick exaggerated motion. — [Game Developer](https://gamedeveloper.com/design/6-mistakes-that-ll-drain-the-juice-out-of-your-game); [itch.io blog, "Making a game feel juicy with simple effects"](https://itch.io/blog/1059831/making-a-game-feel-juicy-with-simple-effects)
- Slightly randomise pitch and volume on repeated sounds so they do not grate. — [itch.io blog](https://itch.io/blog/1059831/making-a-game-feel-juicy-with-simple-effects)
- From a product-design case study (a habit tracker's checkbox): layer animation, sound and haptics so each reinforces the others; spend the effort on routine, often-repeated actions; scale the build-up to the importance of the action; pair a pop-in with a brief larger burst on completion; tint the burst with the user's chosen theme colour so it feels personal; reuse one transition everywhere; build effects one dimension at a time. — [Not Boring, "The World's Most Satisfying Checkbox"](https://notbor.ing/words/the-most-satisfying-checkbox) (no byline or date on the page)
- Haptics still work when the phone is muted, so they cover the case where sound cannot; use stock patterns for ordinary taps and a custom one for the signature moment. — [Not Boring](https://notbor.ing/words/the-most-satisfying-checkbox)
- Design the channels together and not vibration, then sound, then visuals in sequence. — [EastonDev, 2026-05-21](https://eastondev.com/blog/en/posts/dev/20260521-game-feedback-feel/)
- NYT's lever for the end of a run: a small text or graphic beside the result raises the chance it is shared. — [Aftermath, 2024-04-18](https://aftermath.site/new-york-times-wordle-connections-puzzmo-games.md)

### Inferences
- A minimal daily game needs roughly five moments with feedback, and the well-known games use about that many: key registered, submission accepted, submission rejected, result revealed, run finished. Wordle's pop, shake, flip and bounce cover exactly those.
- Personalisation can live in the juice itself: Not Boring's "tint the burst with the user's theme colour" is a small, cheap form of "personal and customised" that leaves the layout plain.
- For Plor, the highest-value places are the per-keystroke response in both games (repeated most), the Offbeat host-answer reveal (the suspense moment) and the end-of-run summary with a count-up, since those are the routine and signature actions the sources say to prioritise.
- On the web, haptics are limited: *unverified recall* that the Vibration API works in Android Chrome but not iOS Safari, so sound and motion have to carry phones on iOS. Check before planning around haptics.

### Gaps
- No source gave timing values (durations, easing) for these effects; none found on confetti or score count-ups specifically, or on sound design in NYT Games or Puzzmo.
- The Apple Human Interface Guidelines advice on subtle haptics was only seen second-hand and not verified.
