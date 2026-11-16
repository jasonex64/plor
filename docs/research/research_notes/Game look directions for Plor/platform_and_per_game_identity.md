# Platform brand + per-game identity: how collections do it, and what one person plus AI agents can sustain

Reading note: "Cited Findings" are things a page fetched or a search result in this session said. "Inferences" are my synthesis; where an inference leans on general knowledge that I did not source in this session it is marked *unverified*. Two sources could only be read through search-result summaries, not fetched in full (Creative Review returned HTTP 403; the Puzzmo theme page was cut off part way); they are flagged where used.

## 1. Puzzmo: how each game gets its own look while the shell stays consistent

### Takeaway
Puzzmo's publicly documented mechanism is the opposite of "an art style per game": the platform hands every game the same tiny colour theme (about five colours) and each game's identity comes from its board, pieces, motion and thumbnail, not from its own palette or typeface. I found no public Puzzmo design-system writeup about per-game type, motion or illustration.

### Cited Findings
- Puzzmo's open-source developer guide for making a game "theme-aware" names five theme colours in priority order: `g_key`, `player`, `alt1`, `alt2`, `alt3`. Every colourful element in a game is expected to use them; a game needing more colours hue-shifts one of the five instead of adding its own. — [skills.sh: puzzmo-theme](https://skills.sh/puzzmo-com/oss/puzzmo-theme)
- The same guide says to replace every hard-coded hex colour in a game with a theme colour, with the stated aim of automatic light and dark mode; the theme object is delivered by the platform when the game reports ready (`sdk.gameReady()`), and live changes arrive through a settings event. — [skills.sh: puzzmo-theme](https://skills.sh/puzzmo-com/oss/puzzmo-theme)
- The guide says Puzzmo games avoid giving colour a semantic meaning (for example, colour is not used to signal an error), and an agent should ask before replacing a colour that might carry meaning in the original game. — [skills.sh: puzzmo-theme](https://skills.sh/puzzmo-com/oss/puzzmo-theme). *Conflict:* a search-result summary of the same page lists an error colour and an unsolved-tile colour in the theme object; the fetched page was truncated before its "UI colours" section, so which is right is unresolved.
- Puzzmo's February 2025 redesign toned down game headings on the Today page so that the game thumbnails carry the page; the Crossword's title is the exception and is given more prominence. — [Puzzmo blog (staging mirror): redesign, 2025-02-06](https://blog-puzzmo-com-staging.vercel.app/posts/2025/02/06/redesign)
- In the same redesign everything on a game page was unified into one sidebar (collapsible sections; subscribers can minimise it), and the secondary toolbar was removed because it took room the game could use; the game gets as much room as possible. — [Puzzmo blog (staging mirror): redesign](https://blog-puzzmo-com-staging.vercel.app/posts/2025/02/06/redesign)
- The redesign's stated problems with the old design: game headings competed with content, the toolbar took game space, and real-time social features (chat) had drifted from what players wanted, so the focus moved to leaderboards, daily news and profile stats. — [Puzzmo blog (staging mirror): redesign](https://blog-puzzmo-com-staging.vercel.app/posts/2025/02/06/redesign)
- Puzzmo's platform layer is described as leaderboards, friend groups, scores and achievements and a Discord, with its creators comparing it to Steam and Xbox Live Arcade; it carries older Zach Gage games (SpellTower, Really Bad Chess) alongside new ones. — [Aftermath](https://aftermath.site/new-york-times-wordle-connections-puzzmo-games.md)
- Per-game integration with the platform (what a finished puzzle reports) moved from a server plugin per game to a generic system where a game emits key/value "deeds" on completion. — [Puzzmo blog (staging mirror): augmentations, 2024-07-16](https://blog-puzzmo-com-staging.vercel.app/posts/2024/07/16/augmentations)
- Pile-Up Poker presents its chips as money purely for flavour (nothing is wagered), an example of a game carrying its own fiction inside the shared site. — [Six Colors interview with Zach Gage](https://sixcolors.com/post/2024/08/interview-game-developer-zach-gage-on-pile-up-poker-and-resisting-dark-patterns/)
- Gage's stated goal is to reboot the newspaper games page with games that last; Puzzmo is owned by Hearst. — [Game Developer](https://www.gamedeveloper.com/design/puzzmo-co-creator-zach-gage-on-building-newspaper-games-that-can-last-forever)

### Inferences
- The Puzzmo model in one line: **the platform owns colour; the game owns shape, layout, motion and a small fiction.** A new game costs no new palette, no new typeface and no new illustration style; it costs a thumbnail and the game's own board rendering. That is the cheapest per-game identity model in this survey.
- Because all games draw from the same five colours, switching the theme (light, dark, or any alternative) recolours every game at once. Personality cannot fight the shell because both read the same tokens.
- The Today page is where identity is carried: thumbnails do the work, headings are quiet. For a two-game site the equivalent is two strong "cards" on Today.
- *Unverified (general knowledge, not sourced here):* Puzzmo's overall look borrows from a newspaper games page (ink-like line art, a single site typeface family), and individual games are distinguished by a signature animation or "juice" moment more than by art.

### Gaps
- No public Puzzmo post was found that describes per-game typography, motion or illustration rules, or a full design system. Searches for posts by its designers on this returned nothing relevant.
- Whether players can pick alternative site themes, and how many exist, was not confirmed from a Puzzmo source.
- The live blog.puzzmo.com was not fetched; the two posts were read from a Vercel staging mirror of the blog that the search returned. Content looked genuine but the canonical URLs should be used in a final report.

## 2. NYT Games: per-game colour, icon and illustration inside the NYT brand

### Takeaway
NYT Games gives each game one ownable colour, one emblem-like icon and a signature board shape, and keeps typography, layout, restraint and components shared. Identity work is done by a named brand-identity art director per launch, which is a cost a solo team has to shrink to "one colour plus one glyph".

### Cited Findings
- NYT's games design lead Jonathan Knight is reported to have built shared design systems and reusable interface components so a growing catalogue feels coherent, with each game keeping its own identity inside a shared visual language; inherited inconsistencies are described as "design debt". — [Creative Review](https://www.creativereview.co.uk/new-york-times-games-wordle-crossplay-design-jonathan-knight/) (read through search summaries only; the page returned 403 to a direct fetch)
- At the 2024 app redesign the stated intent was to use a lot of colour so new players see the breadth of the catalogue; the app uses distinct cards and clear per-game branding. — [TechCrunch (via search result)](https://techcrunch.com/?p=2675705)
- Each game has a signature recognisable at a glance: Wordle's coloured tiles, Spelling Bee's honeycomb, Connections' grouped categories. — [WellGames](https://wellgames.com/news/nyt-games-trends-casual-gaming-096009) (secondary source)
- Connections uses a simple colour-based look designed to be shared on social media as Wordle's was; its categories are colour-coded by difficulty (yellow, green, blue, purple). — [Aftermath](https://aftermath.site/new-york-times-wordle-connections-puzzmo-games.md)
- After the acquisition the Wordle icon was reworked into the house style (white letters on green squares), and Spelling Bee's mascot Beeatrice was redrawn to sit in line with the other game icons. — [1000logos](https://1000logos.net/wordle-logo/); [Design Observer](https://designobserver.com/on-bee-ing) (both via search summaries)
- Tiffany Pai, a senior art director on The Times' brand identity team, developed the identities for launches including Wordle, Connections and Pips. — [UnderConsideration speaker page](https://underconsideration.com/inhouseinfocus/inperson/in2026/Speakers_A5_Tiffany_Pai.php)
- Pips: a pink-and-white palette; the familiar 2-by-1 domino was kept after testing other shapes because familiarity grounds the game in the physical world; the look is described as balancing The Times' restraint with something more playful, avoiding fussy graphics. UI/UX designer Tati Moniz led the visuals. — [Creative Boom](https://www.creativeboom.com/news/the-new-york-times-launches-its-first-original-logic-puzzle-pips/)
- Pips' sound effects were not required for launch but "made a significant difference"; a software engineer made them from recordings of physical pieces. — [Creative Boom](https://www.creativeboom.com/news/the-new-york-times-launches-its-first-original-logic-puzzle-pips/)
- Connections has a recognisable human voice through its named editor, Wyna Liu; players relate to her directly. — [Aftermath](https://aftermath.site/new-york-times-wordle-connections-puzzmo-games.md)
- LinkedIn's games (a comparable "plain shell, several daily games" set) are described as simple but refined and as looking like NYT games without being clones; a reviewer noted Tango's small markers are hard to tell apart on small phones in dark mode. — [SmartCompany](https://smartcompany.com.au/opinion/linkedin-games-review-smartcompany-tegan-jones); [Aftermath on LinkedIn games](https://aftermath.site/linkedin-games); [tango-unlimited.com](https://www.tango-unlimited.com/linkedin-tango)

### Inferences
- The NYT recipe per game is roughly: **one hue + one icon built from the game's own piece (tile, hexagon, domino, grid) + one board silhouette + one share pattern.** Typeface, spacing, buttons, modals, stats screens and tone are shared. The icon is not an illustration of a theme; it is the game's mechanic drawn small.
- Sound and a named human author are two cheap identity carriers NYT uses that need no art: Pips' recorded-domino clicks, and Connections' editor voice. Offbeat's "host" is already a voice of that kind.
- The NYT route costs per new game about: a colour, an icon, a card, a how-to-play, optional sounds. It needs taste more than production.

### Gaps
- No NYT Open (engineering/design blog) post on a games design system was found; there appear to be no public NYT Games brand guidelines.
- The Creative Review article is the best single source and could not be fetched directly; its details (Crossplay, typography, motion) are missing here.
- Nothing sourced on NYT Games motion or per-game typography.

## 3. Jackbox Party Packs: own art, host and music per game; shared shell

### Takeaway
Jackbox goes to the far end: each game gets a lead artist who picks a personal style, with matching audio, and the pack is held together by a shared interaction contract (room code, phone as controller, one task at a time, host-led pacing) and a hub "picker" that puts all five games' characters in one room. It works because the shared part is behaviour, not looks, and because a studio pays for it.

### Cited Findings
- Jackbox's creative lead Allard Laban says packs are kept deliberately diverse in style and theme so they are not "a pack of same-y games", and the method is to let each game's lead artist follow a personal style or vision. — [MCV/Develop interview (via search result)](https://mcvuk.com/?p=228822)
- Party Pack 10 examples of style tied to mechanic or theme: Fixytext, a malfunctioning-machine look mixing hand-drawn and rendered technical drawings; Dodo Re Mi, botanical illustration and 1960s jazz record covers; TimeJinx, blocky UPA-style cartoons; Hypnotorious, classic cartoons; Tee K.O. 2 extends its predecessor. — [Jackbox blog: Behind the Scenes of PP10 Art](https://jackboxgames.com/blog/behind-the-scenes-of-pp10-art)
- Coordination: artists meet regularly to show progress and critique, with daily check-ins and weekly art meetings with a studio art lead; they check the other games' themes, e.g. Dodo Re Mi moved "deeper into the jungle" to avoid resembling Tee K.O. 2. — [Jackbox blog: PP10 Art](https://jackboxgames.com/blog/behind-the-scenes-of-pp10-art)
- Constraint stated by the artists: the art must stand out without distracting from play; visual cues guide players; clear focal points and hierarchy matter for accessibility and inexperienced players; scope is cut for the team's wellbeing. — [Jackbox blog: PP10 Art](https://jackboxgames.com/blog/behind-the-scenes-of-pp10-art)
- Shared across the pack: the games share some structure and general UI, and the picker is a hub that gathers the five games' characters into one college-style game room. — [Jackbox blog: PP10 Art](https://jackboxgames.com/blog/behind-the-scenes-of-pp10-art)
- Audio follows the art: Hypnotorious' sound was developed with its art lead to support his direction, and the studio encourages its audio team not to sound like anything else. — [Jackbox blog: Behind the Scenes of PP10 Audio](https://jackboxgames.com/blog/behind-the-scenes-of-pp10-audio)
- The shared contract across all games: a main screen plus each player's phone as controller; join by code on a web page with no app; only a few input types (draw, pick a button, type text); one choice at a time with the game always signalling what to do next; a host whose narration guides and reacts ("The Jack Principles" on pacing and a host that seems to respond). — [Built In Chicago](https://www.builtinchicago.org/articles/jackbox-games-design-party-pack)
- Each game's identity "emerges" from repeated playtesting rather than being fixed up front, per the Party Pack 11 pack lead. — [CGMagazine interview (via search result)](https://www.cgmagonline.com/interviews/the-jackbox-party-pack-11/)

### Inferences
- Jackbox's lesson for Plor is about **where the consistency lives**: in the input vocabulary and the rhythm (join, read prompt, answer, reveal, score), which is identical across games, so the wrapper can change completely without confusing anyone. Plor's two games already share "prompt, typed answer, clock, 7 rounds".
- The picker pattern (all games' characters or emblems in one shared room) is a cheap way to make a bundle feel like a family: the Today screen is Plor's picker.
- Jackbox's full model (lead artist + audio lead per game, weekly art reviews) is the most expensive in this survey and is the closest to the two attempts Plor reverted. The affordable piece to borrow is the **host voice in copy**, which costs words, not art.

### Gaps
- No source gave team size or cost per game.
- The sources are mostly Jackbox's own blog and staff interviews, so they describe intent, not independent assessment.

## 4. Nintendo collections and other portals (WarioWare, Rhythm Heaven, Mario Party, Clubhouse Games, Brain Age; Apple Arcade, Netflix, Google Doodles, Poki, CrazyGames, Coolmath, Neopets)

### Takeaway
Sourced evidence here is thin beyond WarioWare and Poki. What it shows: wild variety per game is affordable only when each piece is tiny and a strong container (frame, host characters, rules of presentation) does the unifying; portals unify third-party games with nothing more than a thumbnail spec and a mask.

### Cited Findings
- Game & Wario (Wii U): the team gave designers freedom over each game's graphics on purpose, inspired by old NES box art whose covers promised more than the game showed; results were "quite distinct". More than five or six designers were involved, including from Intelligent Systems. — [Iwata Asks: Game & Wario](https://iwataasks.nintendo.com/interviews/wiiu/gameandwario/0/2)
- Each of the 16 games got its own title screen, with weak ones sent back as not having gone far enough; each title screen cost more than one in a typical game, and separate menus and stage-select screens were made per game rather than reusing assets. — [Iwata Asks: Game & Wario](https://iwataasks.nintendo.com/interviews/wiiu/gameandwario/0/2)
- Iwata observed that no single thread runs through all 16 games; WarioWare is the container, and each game highlights the character who "made" it. — [Iwata Asks: Game & Wario](https://iwataasks.nintendo.com/interviews/wiiu/gameandwario/0/2)
- Rhythm Heaven Fever mixed styles deliberately (a song with a European feel paired with Chinese-style visuals, per producer Tsunku). — [Iwata Asks: Rhythm Heaven Fever](https://iwataasks.nintendo.com/interviews/wii/rhythmheavenfever/0/3) (via search summary)
- Ko Takeuchi, known for simple designs and bold lines, shaped the look of both WarioWare and Rhythm Heaven. — [Super Mario Wiki: Ko Takeuchi](https://www.mariowiki.com/Ko_Takeuchi)
- Clubhouse Games: 51 Worldwide Classics uses figurine characters as guides who introduce each game and give trivia such as its history. — [Wikipedia](https://en.wikipedia.org/wiki/Clubhouse_Games:_51_Worldwide_Classics)
- Poki unifies third-party games on its home page with a thumbnail spec: a square full-bleed image of at least 628 px, one clear foreground object, Poki applies the rounded-corner mask itself, and thumbnails should avoid colours close to the portal background (#83FFE7). Changes after launch need approval. — [Poki developer guide: thumbnail](https://developers.poki.com/guide/thumbnail)
- Poki also requires an animated thumbnail before global release; CrazyGames allows animated covers of 15–20 seconds that must represent real gameplay. — [Poki SDK: animated thumbnails](https://sdk.poki.com/animated-thumbnails); [CrazyGames docs: game covers](https://docs.crazygames.com/requirements/game-covers/)

### Inferences
- Two container strategies appear: **a fiction container** (WarioWare's cast "made" each game; Clubhouse's figurines introduce each game) and **a format container** (Poki's masked square). Both let contents vary freely because the container is rigid.
- Rhythm Heaven and WarioWare stay coherent across dozens of scenarios largely because one artist's hand (bold line, flat colour, simple shapes) draws all of them. A single "hand" is the cheapest way to make variety read as one family, and for an AI-assisted team the equivalent is a fixed drawing rule set (line weight, corner radius, palette source, no gradients), not a fixed subject matter.
- The Game & Wario account is also a cost warning: per-game title screens and per-game menus were explicitly more expensive than normal.
- A "moving thumbnail that shows real play" (Poki, CrazyGames) is a strong identity carrier for a Today card and costs nothing in art: it is the game itself, looped.
- *Unverified (general knowledge, not sourced here):* WarioWare's microgames share a rigid frame (one-word command, a visible fuse timer, same win/lose sting), which is why any art style is legible within seconds; Brain Age unifies every exercise through one host (Dr. Kawashima's head) and one hand-written line style; Mario Party unifies minigames through an identical rules card and results screen; Google Doodle games are one-offs unified only by the logo motif; Apple Arcade and Netflix unify only at the store-card level; Coolmath and Neopets-era sites were bundles with a mascot or world on the portal and little control over the games.

### Gaps
- No developer interview was found for Clubhouse Games, Mario Party minigames or Brain Age on visual consistency. Nothing was sourced for Apple Arcade, Netflix Games, Google Doodles, Coolmath or Neopets.
- The Rhythm Heaven Iwata Asks pages were not fetched in full; no direct statement from Takeuchi about keeping one identity across games was found.
- GDC Vault and Game UI Database were not searched in this session.

## 5. Design-system mechanics: what is shared and what each game owns

### Takeaway
The standard engineering answer is three token layers (raw values, semantic names, per-theme values) where components never change and a "theme" swaps values. A game is then a sub-brand theme: it inherits almost everything and overrides a short, fixed list. The decision that matters is how long that list is.

### Cited Findings
- Brad Frost lists the cases a themeable system serves: multiple brands, sub-brands that inherit from a parent and add overrides, white-labelling, seasons or campaigns layered on top, generations of a design language, product families, and dark/light modes. Themes act on the token layer (colour, type and type scale, border radius, spacing, animation) while a component's HTML, API, CSS and JS stay the same. — [Brad Frost: The Many Faces of Themeable Design Systems](https://bradfrost.com/blog/post/the-many-faces-of-themeable-design-systems/)
- Wayfair: token names are shared and only the values differ per theme, so the same component code renders differently per brand. — [Wayfair Design on Medium](https://medium.com/wayfair-design/ui-at-scale-how-wayfair-supports-multiple-brands-and-geos-with-a-shared-code-base-4e2bfb1e7067)
- Infinum built four brand experiences from one system: components stayed the same, token values changed. — [Infinum](https://infinum.com/blog/multibrand-design-system-tokens/)
- Common guidance is that the parent brand defines most tokens and sub-brands customise specific areas; core and semantic layers have one owner. — [Supernova](https://www.supernova.io/blog/eight-multi-brand-design-systems-elevating-global-brand-consistency) (search summary of several guides)
- Puzzmo's concrete version: the platform passes each game about five colours; the game maps all of its colour to them. — [skills.sh: puzzmo-theme](https://skills.sh/puzzmo-com/oss/puzzmo-theme)

### Inferences
Models, ordered by cost per new game (my synthesis from sections 1–4; costs are relative, not measured):

| # | Model | Example | Platform owns | Game owns | Cost per new game | Main risk |
|---|---|---|---|---|---|---|
| A | Platform palette, game is shape and motion | Puzzmo | all colour, type, chrome | board, pieces, animation, thumbnail, small fiction | lowest: a thumbnail | games feel samey unless motion is good |
| B | One hue + one emblem per game | NYT Games, LinkedIn | type, layout, components, tone | accent colour, icon made from the game's piece, board silhouette, share pattern | low: colour, icon, card | runs out of distinct hues around 8–10 games |
| C | Sub-brand theme (token overrides) | multi-brand design systems | components, semantic token names | a fixed override list: accent, surface tint, radius, display typeface, motion curve, sounds | medium: one theme file plus a font licence check | override list creeps; themes fight shared UI |
| D | Host or mascot per game | Jackbox hosts, Clubhouse figurines, Brain Age, Connections' editor | shell, input vocabulary | a voice (copy), optionally one character | low if voice only; medium to high if drawn and animated | weak writing reads as generic; drawn characters need many poses |
| E | Container frame with free contents | WarioWare, Poki | rigid frame: card mask, timer, command line, results | everything inside the frame | high per game unless pieces are tiny | random-bundle feel; needs one consistent "hand" |
| F | Lead artist per game | Jackbox | interaction contract, hub | full art, audio, UI skin | highest | needs a studio; what Plor already reverted |

- Suggested split for a one-person + AI team (opinion): **shared and never overridden:** body typeface, spacing scale, buttons, inputs, modals, the clock component's behaviour, results and leaderboard layout, navigation, dark/light. **Owned by a game, as a closed list:** one accent hue (plus derived tints), one emblem built from the game's own object, one display treatment for the game's central object only (the Offbeat question; the Fragments letter chunk), one signature motion on that object, two or three sounds, and the host's voice in copy. Anything not on the list is shared by default.
- "Signature moment" is the most cost-effective identity unit in the evidence: Pips' recorded domino clicks, Wordle's tile flip (*unverified*), Jackbox's host lines. For Plor the candidates are obvious from the rules: the host "taking" letters in Offbeat, and the clock running down on a chunk in Fragments. One well-made moment per game is sustainable; a themed world per game is what went too far.
- Per-game typefaces are the riskiest cheap-looking lever: each adds a download, a licence and a fallback-metrics check, and a second typeface in running UI is where "styles fighting the UI" starts. Restricting a game face to one element (its title and its central object) keeps it a signature rather than a skin.
- Illustration kits are where AI-assisted teams overreach: generation makes volume cheap, but consistency across poses, sizes and dark mode is the real cost, and the Jackbox account shows studios hold weekly art reviews just to manage that.

### Gaps
- No source was found that applies multi-brand token architecture specifically to games on one site; the mapping is my inference.
- No numbers on maintenance cost per theme were found, and none are given here.

## 6. What goes wrong

### Takeaway
The named failure modes are: inherited inconsistency that becomes "design debt"; per-game chrome that takes space and attention from the game; art that distracts from play or hurts legibility; and games in one bundle drifting into each other's look. The reverse failure, everything looking the same, is the one Jackbox explicitly designs against.

### Cited Findings
- NYT's design lead frames the inconsistencies that came with acquired and separately built games as "design debt" that shared components were built to pay down. — [Creative Review](https://www.creativereview.co.uk/new-york-times-games-wordle-crossplay-design-jonathan-knight/) (search summary only)
- Puzzmo found game headings competing with content and a toolbar taking room from the game, and removed both in its redesign. — [Puzzmo blog (staging mirror): redesign](https://blog-puzzmo-com-staging.vercel.app/posts/2025/02/06/redesign)
- Jackbox artists name the tension directly: art must stand out without distracting from gameplay, and look affects accessibility for inexperienced players. — [Jackbox blog: PP10 Art](https://jackboxgames.com/blog/behind-the-scenes-of-pp10-art)
- Two games in one pack converged in theme and one had to be redirected (Dodo Re Mi vs Tee K.O. 2). — [Jackbox blog: PP10 Art](https://jackboxgames.com/blog/behind-the-scenes-of-pp10-art)
- Sameness is the opposite risk: without diverse styles a pack would be "same-y". — [MCV/Develop interview (via search result)](https://mcvuk.com/?p=228822)
- Per-game presentation is expensive: Game & Wario's per-game title screens each cost more than a normal game's, and menus were not reused. — [Iwata Asks: Game & Wario](https://iwataasks.nintendo.com/interviews/wiiu/gameandwario/0/2)
- A game's identity marks can fail in dark mode or on small phones (LinkedIn Tango's markers). — [tango-unlimited.com](https://www.tango-unlimited.com/linkedin-tango) (fan site; weak source)
- A portal's own background colour can swallow a game's thumbnail, so Poki tells developers to avoid colours near it. — [Poki developer guide: thumbnail](https://developers.poki.com/guide/thumbnail)
- Puzzmo's rule against semantic colour means a re-themed game cannot accidentally lose meaning (for example an error state) when colours change. — [skills.sh: puzzmo-theme](https://skills.sh/puzzmo-com/oss/puzzmo-theme)

### Inferences
- Plor's two reverted attempts map onto the expensive rows (E and F in the table): a whole art style per game, and a 3D world for one game. The evidence suggests the fault was the unit of identity (a world) rather than the wish for personality; the surveyed products that sustain many games use a much smaller unit (a hue, an emblem, a moment, a voice).
- Checks that would catch the cited failures before shipping a game's look: it works in both light and dark; it holds at the smallest phone width; no meaning is carried by the game's accent colour alone; the shared results and leaderboard screens are untouched; the game area did not get smaller; the two games' accents are distinguishable for colour-blind players.
- "Random bundle" feel comes from having no container; "styles fight the UI" comes from letting a game override shared components. A closed override list addresses both.

### Gaps
- No post-mortem was found of a platform that failed because of per-game style inconsistency; the failure modes above are taken from teams describing what they guard against.
- No user research on perceived bundle coherence was found.

## 7. How first-time and returning players perceive the switch (Today screen to game)

### Takeaway
I found no direct research on how players perceive the hub-to-game switch. The indirect evidence says: the hub should show all games as a family with each game's emblem doing the identifying, the game page should give the game the room, and the constant elements across the switch should be behaviour (how you join, answer, see the clock, see results), not decoration.

### Cited Findings
- Puzzmo: on Today, thumbnails carry identity and headings are quiet; on the game page the game gets the most room and platform features collapse into one sidebar. — [Puzzmo blog (staging mirror): redesign](https://blog-puzzmo-com-staging.vercel.app/posts/2025/02/06/redesign)
- NYT: the hub uses colour and distinct cards so new players sense the breadth of the catalogue. — [TechCrunch (via search result)](https://techcrunch.com/?p=2675705)
- Jackbox: the picker presents the five games' characters together in one room before any game starts. — [Jackbox blog: PP10 Art](https://jackboxgames.com/blog/behind-the-scenes-of-pp10-art)
- Jackbox: within any game the player always knows what to do next because inputs are few and one task is shown at a time. — [Built In Chicago](https://www.builtinchicago.org/articles/jackbox-games-design-party-pack)
- Clubhouse Games: a guide character introduces each game before play. — [Wikipedia](https://en.wikipedia.org/wiki/Clubhouse_Games:_51_Worldwide_Classics)
- NYT's Pips added an interactive how-to-play after beta to demonstrate rules and controls. — [Creative Boom](https://www.creativeboom.com/news/the-new-york-times-launches-its-first-original-logic-puzzle-pips/)

### Inferences
- First-time players need the card to answer "what is this game?" in a glance (emblem, one line in the host's voice, how long it takes); returning players need "have I done today's, and how did friends do?". Both are hub jobs; neither needs the game's skin to leak into the hub beyond its emblem and accent.
- A good switch keeps one visible thread: the card's accent and emblem become the game page's header accent and emblem, and the same emblem returns on the result and in the feed and leaderboard rows. That is how NYT-style systems make a share or a leaderboard row attributable to a game without a logo lockup.
- The game page can change more than the hub can, because the player has chosen to enter it. The return trip matters as much: results should land back in shared, plain shell styling so comparison across friends and games stays readable.
- For the beta's plain look, the smallest step that already gives a "family of two" is: two accents, two emblems, and each game's signature moment. Everything else can wait without blocking later personality, provided the override list exists as tokens from the start.

### Gaps
- No usability study, talk or post was found on perceived continuity when switching between games in a collection. This whole section is inference from how the products are laid out.
- No evidence on whether a transition animation between hub and game helps or hurts.
