# Let the letters carry Plor's look

The games people admire in this space look good because they spend almost everything on one object and a handful of moments, and almost nothing on scenery. Wordle's whole motion kit is six short animations. NYT gives each game one colour and one small emblem. Puzzmo hands every game the same five colours. Jackbox changes the "skin" per game but never the skeleton. Plor's own history says the same thing from the other side: every game *world* (the pixel themes, the firework festival, the low-poly village) was removed, while every *structural* piece survived, and the one thing you kept asking for more of was punch on the player's own word. So the route to try first is the cheapest one: keep the calm shell and the plain play frame, and make the letters, the clock and the reveal move with real character, one "signature moment" per game. Stylised looks (a printed-card finish, a host with a voice, one small hero object in pixel art or pre-rendered low-poly) can be layered on later, one piece at a time, each easy to take back out. Nothing here commits the project: the first step is a private mock of two moments, judged on a real phone next to today's plain screen. Many findings below rest on search summaries or on design write-ups by third parties, not on the makers' own words; I say so where it matters.

**How to read this report.** "Notes" means the research notes in `docs/research/research_notes/Game look directions for Plor/`. Where I say *search summary only*, the researcher saw a search engine's summary of a page, not the page. Where I say *the researcher's judgement*, no source says it. Any timing, size or count that appears is copied from a named source. Every value Plor would need is marked **for the owner to decide**. By the repo's rules this report is not a ticket; a new look still needs guided questions and a ticket first.

## Admired light games spend on one object and five moments, not on scenery

**Wordle is the clearest case, and its numbers are public.** The shipped stylesheet holds six short animations: a 100 ms "pop" when a letter is typed, a tile flip made of two 250 ms halves with the colour swapped at the midpoint, a 300 ms delay between each tile's flip, a 600 ms sideways shake for a word that is not accepted, and a 1000 ms bounce on a win ([Wordle shared CSS](https://www.nytimes.com/games-assets/v2/9424.520931dadeb3da6d0828.css), [Wordle JS](https://www.nytimes.com/games-assets/v2/9424.5b0324df3d944c1ae374.js)). A five-letter reveal works out to about 1.7 seconds end to end (computed from those values). Each motion answers one question: did my letter register, was my word refused, what was the result. A design critique credits exactly this for making the game understandable ([Pratt IXD](https://ixd.prattsi.org/2025/09/design-critique-wordle-website/)). The staggered flip is the one deliberate delay in the game, and it creates suspense from an answer the page already knows. Offbeat's "did I match the host?" is the same shape of moment.

**NYT Games gives each game one colour, one emblem and one board shape, and shares everything else.** The 2022 brand refresh, written up by its designer, sets rules per game: simplify the game's own board into its picture, give each game colours that are unique yet sit together, and "animate gameplay when possible" ([Caro Turcios portfolio](https://www.carolinaturcios.com/nyt-games-brand-refresh)). The emblem is the game's own piece drawn small (a tile, a hexagon, a domino), not an illustration of a theme. For Pips, the team's sound effects, made from recordings of real dominoes, were not required for launch but "made a significant difference" ([Creative Boom](https://www.creativeboom.com/news/the-new-york-times-launches-its-first-original-logic-puzzle-pips/)). NYT's Zoe Bell describes the test for an end screen: ask what the player would want to tell a friend, and put a small text or graphic beside the result ([Aftermath](https://aftermath.site/new-york-times-wordle-connections-puzzmo-games.md)).

**Puzzmo goes further: the platform owns colour, the game owns shape and motion.** Its open developer guide names five theme colours that every game must draw from, so a theme change recolours every game at once ([Puzzmo theme guide](https://skills.sh/puzzmo-com/oss/puzzmo-theme)). Its 2025 redesign made game headings quieter so thumbnails carry the Today page, and removed a toolbar because it took room from the game ([Puzzmo blog, staging mirror](https://blog-puzzmo-com-staging.vercel.app/posts/2025/02/06/redesign)). Its shipped CSS leans on "overshoot" easing (motion that goes slightly past its target and settles), which is where its springy feel comes from ([Puzzmo stylesheet](https://www.puzzmo.com/assets/stylex.45ae50d3.css)). No source describes Puzzmo's typefaces or art direction; that gap is real.

**Jackbox shows the expensive end, and the cheap part worth borrowing.** Its artists say the games share structure and general UI, and the art is what sets them apart ([Jackbox blog, PP10 art](https://www.jackboxgames.com/blog/behind-the-scenes-of-pp10-art)). Each game's look starts from one sentence drawn from the mechanic: a text game became "a malfunctioning machine"; a sound game became "birds on a wire". The artists also name restraint as a skill: keep backgrounds low-detail so they do not compete, and know when to cut. That model needs a lead artist and an audio lead per game. What costs nothing is the host. Jackbox's founding rules, The Jack Principles, treat the game as a conversation: one task at a time, and a host who appears to notice what the player did, did not do, and did before ([Built In](https://builtin.com/articles/jackbox-games-design-party-pack)). Its creative director puts the aim as "We set players up to be the stars of the show" ([Room Escape Artist](https://roomescapeartist.com/2024/10/22/comedy-collaboration-brooke-breit-creative-director-jackbox-games-repod-s8e4/)).

**Small-team browser hits hold one rule with discipline.** Monkeytype is one person's project; its interface is text only with a few colours ([KBD.news interview](https://kbd.news/Interview-3-years-of-Monkeytype-2019.html)). The Chrome Dino team cut a kick and a roar and kept run, duck and jump ([Google blog](https://blog.google/products/chrome/chrome-dino/)). Mini Metro's makers chose a minimal style because they judged it was the only way they would finish ([Giant Bomb interview](https://www.giantbomb.com/dinosaur-polo-club/3010-10760/forums/interview-peter-curry-co-creator-of-mini-metro-1871069/?page=1)). The award-winning 3D sites sit at the other end: the best-known solo practitioner needed just over a year, names performance as his main limit, and turns effects off on phones ([Awwwards case study](https://www.awwwards.com/brunos-portfolio-case-study.html)).

**"Juice" works when it is the feedback itself, kept in proportion.** The trade's word for lively feedback is juice: easing, small bounces, short shakes, sound. The standard article warns that "used in excess, juicing techniques will both waste your time and annoy your users" ([Game Developer](https://gamedeveloper.com/design/squeezing-more-juice-out-of-your-game-design-)). Balatro is the best model for a game that is nearly all interface: a third-party breakdown describes scoring that plays out step by step, numbers that roll to their totals, pitch that rises with each scored card, and shake that grows with the score ([Blake Crosley's guide](https://blakecrosley.com/guides/design/balatro); this is one analyst's reading, not the developer's statement). None of that depends on Balatro's pixel art. A solo developer's word game, Gram Jam, got its feel from springy tile moves and a 25 ms per-letter stagger with no art assets at all, and its author's main lesson was to queue animations so they never overlap ([Cole Chamberlin](https://colechamberlin.substack.com/p/spring-physics-in-my-word-game)).

**For timed typing, put the clock where the eyes already are.** The evidence is thin and anecdotal: players of small bomb-typing games say they never looked at a separate timer, and praised a design where the word itself showed the time left ([itch.io comment](https://itch.io/post/16781457), [itch.io comment](https://itch.io/post/13651538)). No study compares a bar, a ring and a number. BombParty itself draws its board on a canvas and uses one-shot animations of 300 to 600 ms: a correct word swells and tilts, a failed word shakes, and the matched syllable inside the typed word is highlighted in green ([BombParty client script](https://phoenix.jklm.fun/games/bombparty/bombparty.js)). Games that pay for rarer words do it as a bigger version of the normal reward: in Bookworm Adventures a stronger word hits harder and leaves a gem on the board ([Wikipedia](https://en.wikipedia.org/wiki/Bookworm_Adventures)); in SpellTower a long word clears its neighbours too ([Wikipedia](https://en.wikipedia.org/wiki/SpellTower)).

**Two limits apply to every route.** Sound is half of juice in every source, but phones are often muted and web audio only starts after a tap, so sound can double a cue and never carry one alone ([howler docs](https://npmjs.com/package/howler)). Vibration is not available on iPhones: a 2024 W3C report found Safari on iOS failing every Vibration API test ([W3C list](https://lists.w3.org/Archives/Public/public-device-apis-log/2024Jun/0061.html)). And on phones the keyboard covers part of the page without telling the layout, so the round has to be laid out inside the visible area ([Chrome for Developers](https://developer.chrome.com/blog/viewport-resize-behavior), [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Visual_Viewport_API)).

## Plor's own history asks for a calm frame and a harder-hitting word

The note built from the repo's tickets is the most useful source in the folder, because it is your own record. Its reading is the researcher's, not your words, except where quoted.

**No direction was rejected for its theme.** Themes were shelved "for future endeavors" and "inspo for other games" ([14c-4](../../milestones/M14-14c-4-five-themes-rebuilt.md), [14c-3](../../milestones/M14-14c-3-pixel-directions.md)). What failed each time was execution or total weight. The five named failure modes are these.

| Failure mode | What the tickets record | Source |
|---|---|---|
| Heavy assets | The village was 10.8 MB of models in 48 files plus a 3D library of about 779 KB; you said "Stop here" at 1.78 MB compressed | [16g-2](../../milestones/M16-16g-2-midnight-brew-in-play2.md), [14c-9](../../milestones/M14-14c-9-plain-game-2.md) |
| Busy scenes unlike the calm shell | Asked whether the festival and village were still the app you pictured: "It's gone too far", then "go plain for both" | [14c-7](../../milestones/M14-14c-7-simpler-games.md) |
| AI art drift | Pixel flowers "all look pretty bad and not accurate"; PixelLab was good at 32×32 and poor at 16×16; the code-drawn harbour "isn't cohesive enough" | [14b-2a](../../milestones/M14-14b-2a-streak-ranks.md), [14c-5](../../milestones/M14-14c-5-firework-festival.md) |
| Low frame rates | "i dont like the 12 fps type and prefer smoother", then "60 fps everything"; the village ran at 5.3 fps on the test machine's software renderer | [14c-4](../../milestones/M14-14c-4-five-themes-rebuilt.md), [16g-2](../../milestones/M16-16g-2-midnight-brew-in-play2.md) |
| Weak movement | "not enough of a movement dynamic"; "the word shooting up is weak"; "the movement is still a bit lackluster" | [16g-1](../../milestones/M16-16g-1-low-poly-mocks.md), [14c-5](../../milestones/M14-14c-5-firework-festival.md) |

**The loop behind the stop.** You asked for restraint in the frame and more punch in the moment. Each review round then added motion and detail on request. The sum became heavy to load, slow to test and unlike the shell, and you cut everything at once. Nothing in the record shows the whole being checked against "small, welcoming but neutral, phone-first" until the stop itself. There was also a process cost: the festival needed 91 numbered answers and a check suite that ran for hours ([14c-6](../../milestones/M14-14c-6-afterglow-in-play.md)). Neither world ever ran on a real phone before it was built in. One gap matters: the tickets record only the words "It's gone too far" and "Both". They do not say whether it was the busyness, the load, the effort or the mismatch with the shell. That is the first question a new round should ask you.

**What survived every cut is a design brief in itself.** From the worlds you kept: full-screen play with a close button, How to play as a pop-up, the recap, the rarity label, the running score, the timer bar ([14c-8](../../milestones/M14-14c-8-plain-game-1.md), [14c-9](../../milestones/M14-14c-9-plain-game-2.md)). In the shell you kept shadows that mean "press", two-state icons and count-ups ([14b-10](../../milestones/M14-14b-10-calm-and-alive.md)). Your free-typed notes are steady across both worlds: one hue family for backgrounds; text never stretched, and "more contrast is better"; smooth motion; the typed word as the hero, with a reward that grows with rarity; a clear visible moment when a letter is taken; escalation "caused by something visible"; small idle life; a still view while typing; nothing that costs the player clock time; no finale, no result card, no extra button.

**The rules any route must respect.** The shell uses one font (Baloo 2), colour slots per theme, one easing and one 200 ms duration, and under Reduce motion nothing moves ([DESIGN.md](../../DESIGN.md)). The countdown today is a number plus a bar "with no transition and no change at low time", and the number stays the main sign of time. Any route that makes the timer move or change near the end changes that rule, so it needs your word and a DESIGN.md update. Whether a game follows the player's theme (as the plain games do) or sets its own (as the pixel worlds did) is undecided. ROADMAP says no new visual work until the app is live; private mock pages match the past pattern and build nothing into the app, but whether they fall inside the freeze is yours to say.

## "Personal" comes from the player's marks, a voice and their own history

"Personal and customised" reads two ways. It could mean each game has its own identity. It could mean each player can make the game theirs. Earlier tickets point to the first ("the game itself gets its own stylized look"); nothing in the repo settles it. The research covers both, and both turn out cheap if the unit stays small.

**Per-game identity works as a short, closed list.** Design systems that serve several brands keep the components fixed and let a sub-brand override a few values ([Brad Frost](https://bradfrost.com/blog/post/the-many-faces-of-themeable-design-systems/)). Applied to Plor (the researcher's judgement): a game may own one accent colour, one emblem made from its own object, one treatment of its central object (the Offbeat question; the Fragments chunk), one signature motion, two or three sounds, and the host's voice. Everything else stays shared. The reverted worlds sat at the costly end of this scale, where the unit of identity was a whole world. Nintendo's own account of per-game title screens for Game & Wario says each cost more than a normal game's ([Iwata Asks](https://iwataasks.nintendo.com/interviews/wiiu/gameandwario/0/2)).

**A host costs words, not art.** Offbeat already has a host who holds secret answers and takes letters. The Jack Principles turn straight into text triggers: a line when the player matches, when the clock runs low with nothing typed, when a streak continues, when a friend gave the same answer. Duolingo's team spent months on who each character is before drawing or voicing anything ([Duolingo blog](https://blog.duolingo.com/character-voices)). The same post asks openly how deadpan a sarcastic character can be without hurting the experience, and secondary reporting says her sarcasm was toned down (*search summary only*). For a daily game that is the main risk: a sharp host wears thin. Advice on repeat play (many variants, never the same line two days running, silence as a valid outcome) comes from weaker sources. No source says how often daily players tolerate host lines; that needs your judgement or the beta.

**Player-side personalisation is cheapest as one mark and a plain theme.** Monkeytype defines each of its 187 themes as ten colours and nothing else, though 52 of them still needed their own extra stylesheet ([Monkeytype themes file](https://github.com/monkeytypegame/monkeytype/blob/master/frontend/src/ts/constants/themes.ts)). A colour theme is almost never shown to other people. What friends see is one small mark beside the name: Lichess calls its version "an extra bit of personalisation and colour", picked from a fixed list, and each viewer can switch it off ([Lichess review](https://lichess.org/blog/ZZQVPhAAACEAw2ZR/-)). A habit-app case study suggests tinting the celebration burst with the user's own theme colour so it feels personal ([Not Boring](https://notbor.ing/words/the-most-satisfying-checkbox); no byline or date). Plor's five themes already make that free.

**The game reflecting the player back is the best-evidenced "personal" feature.** Spotify's 2025 recap reached about 200 million engaged users in a day ([TechCrunch](https://techcrunch.com/2025/12/04/spotify-says-wrapped-2025-is-its-biggest-yet-with-200m-users-in-its-first-day)), and NYT Games added its own in 2025 ([Engadget](https://www.engadget.com/gaming/nyt-games-has-a-year-in-review-thing-now-too-203000878.html)). Offbeat stores every answer, so a personal history is possible without any art. That is a feature idea, not a look, and no source shows it working for a small friends-only game. On earned cosmetics the evidence is weak: Duolingo credits a 1.7% lift in seven-day retention to a celebration animation, not to owning anything ([Duolingo blog](https://blog.duolingo.com/how-duolingo-streak-builds-habit)), and a beta among friends cannot measure effects that small.

**Wordle's share grid was a player's invention.** A player typed the coloured squares by hand, others copied her, and Wardle then built it in; he left the link out on purpose ([Game Developer](https://www.gamedeveloper.com/marketing/josh-wardle-reflects-on-the-the-unconventional-road-to-wordle-s-success)). During the beta, how testers describe or screenshot their own results is the best brief for Plor's share text.

## Four routes, from motion-only to one hero object

Each route keeps the same things shared: the shell, the themes, the play frame with its close button and How to play, the results as the app's own cards, Baloo 2 for all reading text, and the server deciding everything. Costs are the researcher's relative estimates (low, medium, high), not measured.

### Route 1: The letters do the moving

**The idea.** Keep today's plain screens and give each game a small, fixed set of motions on the things the player already watches: the typed word, the letters, the clock and the reveal.

**Offbeat.** The question sits as a headline. Each typed letter arrives with a small pop. Submitting stamps the word. A letter the host takes gets one distinct, visible moment on the alphabet strip, which stays in the same place all game; Wheel of Fortune has kept a dedicated used-letter board for the same job ([Wheel of Fortune history wiki](https://wheeloffortunehistory.fandom.com/wiki/Used_Letter_Board); URL found, page not read). The reveal shows the host's answers one at a time with the change hidden at a midpoint, the way Wordle's flip does. The rarity result can run and stop like a single counter; Pointless does this with a column that counts down from 100 (*search summary only*; [LEDs Magazine](https://www.ledsmagazine.com/specialty-ssl/automotive-vehicles/article/16677821/xl-video-creates-a-smart-led-display-for-pointless-game-show-scoring-tower)). A rarer answer gets a bigger version of the same motion, not a separate show.

**Fragments.** The chunk is the hero, set large. The moment the typed word contains the chunk, those letters light up inside the word; BombParty highlights the matched syllable in the same way ([BombParty client script](https://phoenix.jklm.fun/games/bombparty/bombparty.js)). An accepted word leaves the input and joins a growing stack of the run's words, sized or marked by score. By the last round the screen is fuller and brighter because of what the player typed. That is your "escalation with a visible cause", made only of text. A refused word shakes the input only. The timer could become a burning line directly above the input, which gives a moving point without moving the scene; whether the timer may move at all is **for the owner to decide**, since DESIGN.md currently says it does not.

**Shared shell.** Everything. This route adds no colour, font or art.

**How it is made.** Agents write CSS and SVG on real page elements. This is the kind of work the shell's own motion already is, so the existing checks apply. If sequences get awkward in plain CSS, one animation library is a DECISIONS entry: Motion's docs give about 34 KB for the full component and under 5 KB with lazy loading ([Motion docs](https://motion.dev/motion/guide-reduce-bundle-size/)); GSAP is free but not open source ([GSAP licence](https://gsap.com/community/standard-license/)). Under Reduce motion every state simply changes at once, as today.

**Cost and risk.** Low cost. The risk is that it reads as too close to the plain beta; you said of the shell kit that it "feels a little too plain". The Baba Is You community asked for a switch to stop wiggling text ([Steam discussion](https://steamcommunity.com/app/736260/discussions/0/2650805212055291931/?l=greek)), so constant motion near text is out.

**How it avoids the past failures.** No assets to download. No scene, so nothing to grow busy. No AI art. Only position, size and opacity change, which browsers animate smoothly. And the "movement dynamic" lives exactly where you asked for it: on the word.

**Borrows from.** Wordle, Connections, Gram Jam, Monkeytype, BombParty, Balatro's sequencing.

### Route 2: A printed card per game

**The idea.** Route 1 plus a light graphic finish drawn in code: each game is a printed card with its own ink colour, shape family and emblem.

**Offbeat.** A warm game-show answer card. The host's answers sit in fixed cells and turn over like the old Family Feud board, which was a real object of 8,400 flip-discs that revealed answers "on demand" with a visible flourish ([The Strong museum](https://www.museumofplay.org/blog/reviving-the-family-feud-sign/)). Rounder shapes. A second ink printed slightly off-register behind the headline.

**Fragments.** A stark, tense card. The chunk in very heavy type, a hotter accent, straight-edged shapes, the fuse as its emblem.

**Shared shell.** The same layout, components and font. The game owns only the closed list from the section above. A day-seeded pattern (the date drives a simple pattern, so everyone sees the same one that day) could sit on the results card and share image only, never behind text.

**How it is made.** Agents write it. Paper grain and halftone dots have published CSS and SVG recipes ([Frontend Masters](https://frontendmasters.com/blog/grainy-gradients/), [riso demo](https://jonathanstephens.us/play/riso/)). Rough.js draws wobbly hand-made lines in under 9 kB ([roughjs.com](https://roughjs.com/)). The emblems are simple geometric SVG, which is the level where AI-written SVG is dependable; it still fails on anatomy and complex objects ([Simon Willison](https://simonwillison.net/tags/pelican-riding-a-bicycle/)).

**Cost and risk.** Low to medium. Texture over text lowers contrast, so text stays on a solid panel. Animated grain is reported as sluggish on iPhones in one forum post ([GreenSock forum](https://greensock.com/forums/topic/33075-gsap-and-feturbulence-mobile-performance/)), so grain must be a still image. A per-game display typeface is the riskiest lever: it breaks "one font" and needs a DECISIONS entry. It also multiplies checks: every theme times every game. Whether the card follows the player's theme or sets its own is **for the owner to decide**.

**How it avoids the past failures.** Assets are a few lines of code. The style is a finish on the frame, not a scene, and the list of what a game may override is closed before work starts, which is the ceiling the past rounds lacked. The "hand" is a set of shared rules, so nothing drifts. All grain is static.

**Borrows from.** NYT Games' per-game rules, Puzzmo's five colours, Jackbox's "one sentence from the mechanic", Mini Metro, Family Feud's board, Only Connect's small odd symbols.

### Route 3: The host and the fuse

**The idea.** Identity comes from a voice and one small living mark per game: Offbeat's host speaks and reacts; Fragments' fuse is its character.

**Offbeat.** The host gets a one-page character sheet first: what it wants, how it talks, what it never says. Lines react to what the player just did. The host can be shown with almost no art: a speech bubble, or a mark with two or three states (waiting, taking a letter, conceding a rare answer), moving from one state to another rather than hopping, as you asked of the tab icons. The reveal features the player's own answer large, with the host's line under it.

**Fragments.** No host. The fuse, or the chunk itself, carries the mood, with short dry text at round ends if wanted.

**Shared shell.** Everything visual. The copy tone inside each game differs.

**How it is made.** Agents draft line variants per event; you pick. The mark is code-drawn. A fully animated character in a tool such as Rive needs a human animator and a runtime of 222 KB or more ([Rive docs](https://rive.app/docs/runtimes/runtime-sizes.md)); that version is out of reach for this team.

**Cost and risk.** Low for voice only; medium with a mark. Weak writing reads as generic, and a mocking host is the version Duolingo backed away from. How often the host speaks is **for the owner to decide**.

**How it avoids the past failures.** Words weigh nothing. Nothing is on screen during typing. One simple mark has nothing to drift against. It adds personality, though not movement, so it pairs with Route 1 rather than replacing it.

**Borrows from.** The Jack Principles, You Don't Know Jack's writing-first host, Duolingo's character work, The Stanley Parable's narrator.

### Route 4 (hybrid): One hero object on the plain screen

**The idea.** Route 1, plus exactly one art object per game that reacts to play: pixel art or pre-rendered low-poly, never a scene.

**Offbeat.** A small host figure or host's desk object beside the question, with a few states. **Fragments.** The fuse or a ticking device beside the chunk. In both, the object sits in the layout like a picture, stays still while typing, and reacts only on events.

**How it is made, cost and risk.** See the next two sections. Medium cost. It is the only route that brings back the earlier art styles, so it carries their risks in small form.

**How it avoids the past failures.** One object has a size limit that can be set before work starts, and a still picture of it is its own fallback. It should be judged on a real phone with the keyboard open before a second element is considered. Both reverted attempts started at the full-scene end.

**Borrows from.** Balatro (the art is the game's objects), Chrome Dino (one sprite, few motions), A Short Hike.

### The routes side by side

| | Route 1: letters move | Route 2: printed card | Route 3: host and fuse | Route 4: one hero object |
|---|---|---|---|---|
| New assets | None | Code only | Words, one mark | One sprite or render per game |
| Relative cost | Low | Low to medium | Low to medium | Medium |
| Rules it touches | Timer rule, if the timer moves | Timer rule; maybe "one font"; theme question | Copy tone | Timer rule; a size limit; art checks |
| Main risk | Too plain | Texture hurting contrast; override list creeping | Host wears thin | Old art problems return in miniature |
| Can be added later to Route 1 | — | Yes | Yes | Yes |

## If we go back to pixel art: fewer, larger, locked, and moving smoothly

The earlier pixel work failed in five specific ways, by the tickets' own account: too small a canvas for the subject, low frame rates, backdrops that lacked cohesion, grid rules loosened round by round, and a wide scene cropped badly on phones. The research offers a fix for each.

**Make the art the game's objects, not a backdrop.** Balatro's pixel art is its cards and chips; its lively feel comes from smooth motion, colour that always means the same thing, and stacked feedback, by one analyst's reading ([Blake Crosley's guide](https://blakecrosley.com/guides/design/balatro)). For Plor that means a host sprite, a pixel fuse or a reward stamp, never a looping scene behind the prompt.

**Stepped frames, smooth movement.** A sprite can change frames in steps while the sprite itself glides, tilts and scales smoothly at the screen's full rate. That answers "I don't like the 12 fps type" without giving up the pixel look (the researcher's proposal, not a tested result).

**Lock one palette and one pixel size before making anything.** Mixed pixel sizes on one screen are a named fault ("mixels"). Browsers blur pixel art unless told otherwise, and uneven pixels at odd zoom levels cannot be fully fixed in CSS ([MDN](https://developer.mozilla.org/en-US/docs/Games/Techniques/Crisp_pixel_art_look)). The palette, the pixel size and the canvas size are **for the owner to decide**; your own 14c-5 note, one hue family, is the natural starting point.

**Treat AI output as a draft that goes through a fixed clean-up.** Generators make pictures *of* pixel art: off-grid squares and hundreds of near-identical colours. A documented pipeline finds the grid, snaps to it, cuts colours to a locked palette and leaves a hand-clean step; its author says some outputs are too painterly to fix and that it "won't replace pixel artists" ([dev.to](https://dev.to/jenissimo/how-to-tame-your-ai-pixel-art-3pk5)). Agents can run the mechanical steps and a check that fails on any off-palette colour. The PixelLab connector lists correction and colour-reduction tools; nobody tested them for these notes.

**Avoid small sizes and keep the set tiny.** Your own result was that 32×32 held up and 16×16 did not. No source claims a generator gets tiny sizes right. Three sprites that match beat twenty that almost match.

**Keep reading text out of pixel fonts.** A pixel font is only crisp at whole multiples of its design size, which fights responsive layouts (the researcher's judgement). Your font round ended with "Too heavy or blocky, Hard to read" for most candidates. Baloo 2 stays for everything the player reads or types.

**Be honest about AI art.** Gartic Phone pulled an AI drawing mode within hours after artists objected ([PC Gamer](https://www.pcgamer.com/games/puzzle/the-game-thats-all-about-drawing-and-creativity-gartic-phone-adds-and-then-swiftly-removes-an-ai-mode-in-a-straight-up-slap-in-the-face-to-any-and-all-artists)). The documented blow-ups all involved art players could see and were not told about. Plor's About page already discloses AI help; any generated sprite belongs under that line.

## If we go back to low-poly: one small object, lit in advance, with a still picture behind it

The record is plain that the low-poly art was accepted ("looks fine") and the delivery failed: the download, the frame rate on a machine without a graphics chip, the shadows, the tests. So the fixes are all about delivery and size.

**Cheapest fix: do not run 3D on the phone at all.** Render the object ahead of time and ship the frames as pictures. This keeps the low-poly look with no 3D library. The catch is transparency: see-through video needs one file format for Chrome and another for Safari, and the Safari encode in the cited guide needs a Mac ([Rotato](https://rotato.app/blog/transparent-videos-for-the-web), [Chrome for Developers](https://developer.chrome.com/blog/alpha-transparency-in-chrome-video/)). A sprite sheet or an animated WebP avoids that split (the researcher's judgement). Pre-rendered frames cannot react freely to play, which suits an idle loop or a few fixed reactions. No source gives a file size for this; the limit is **for the owner to decide**, then measured.

**If it must be live 3D, one hero object, drawn only when something changes.** The three.js React library can render only on change, which saves battery, and its docs describe showing a simple stand-in while the model loads ([react-three-fiber docs](https://r3f.docs.pmnd.rs/advanced/scaling-performance)). A cauldron is a scene on its own; a village is not needed.

**Light it in advance.** Two-thirds of the village's draw time was one shadow map ([16g-3](../../milestones/M16-16g-3-village-e2e-on-ci.md)). Baked lighting stores the light and shadow in the object's colours, so the phone only displays it (*search summary only*; [Three.js Journey](https://www.threejs-journey.com/lessons/creating-a-scene-in-blender)).

**Make kit models look like yours.** Scenes built from free kits look generic because each model keeps its own colours and the engine's default light (the researcher's reasoning; no strong source). The fixes are one shared material and palette, a fixed composed view, and far fewer props. Monument Valley's art director described fixing the camera as removing tools from the artist's toolbox ([Kill Screen](https://killscreen.com/monument-valley-elegance)).

**A low-resolution render hides weak modelling.** A Short Hike's developer rendered small and enlarged the picture, so assets needed little detail and one person could make them (*search summary only*; [PlayStation Blog](https://blog.playstation.com/2021/08/05/crafting-a-tiny-open-world-a-look-behind-the-scenes-at-the-creation-of-a-short-hike/)). This also lets a 3D object sit beside pixel icons without a clash.

**Put a real phone in the loop first, and a still picture behind it.** Chrome's Dino had to be rewritten after it ran badly on older Android phones ([Google blog](https://blog.google/products/chrome/chrome-dino/)). If the picture of the object is the fallback and the Reduce motion version, the game never depends on 3D, and the tests that kept failing have nothing fragile to test.

## Try Route 1 first, as a mock of two moments

Route 1 is the one to try first, for three reasons. Every other route sits on top of it, so no work is wasted whichever you pick later. It is the direct answer to your most repeated note, that the movement on the word was "lackluster". And it is the only route that cannot repeat the past stop, because it adds no scene, no assets and no art to drift.

A cheap first experiment, committing the project to nothing, is one private mock page with two moments. For Offbeat: the host taking a letter, then the reveal of the host's answers against the player's word. For Fragments: the chunk lighting up inside the typed word, then the accepted word joining the stack. Four things would make it a fair test. First, agree the ceiling before any iteration: what the screen may never do. Second, judge it on a real phone with the keyboard open, beside today's plain screen, the way you judged "as built", "calm" and "plain" side by side. Third, include the Reduce motion version in the same mock. Fourth, take every timing either from Plor's existing 200 ms or from your pick among the cited reference values (Wordle's 100 ms pop and 600 ms shake; Connections' 300 ms bounce; BombParty's 500 and 600 ms reactions, all linked above). Those are other games' numbers, offered as a menu, not a recommendation; the choice is **for the owner to decide**.

What would count against Route 1: if the mock still reads as "too plain" on the phone, that is the signal to add Route 2's finish or Route 3's host next, one piece at a time. If instead it is the weight of an art object you miss, Route 4 is the controlled way back to pixel art or low-poly.

## Conclusion

The research and the repo's history point the same way from opposite ends. Outside Plor, the lasting games hold one rule with discipline and let a few moments carry the feeling. Inside Plor, the scenes were removed and the moments were the part you kept wanting more of. The earlier attempts were not wrong about wanting personality; they chose too large a unit for it. A world per game is a studio's unit. A colour, an emblem, a motion and a voice is a unit one person and coding agents can hold steady across two games and five themes, and can verify with the checks the shell already has.

Two things remain unknown and no amount of reading will settle them. One is what "gone too far" meant to you, exactly. The other is how any of this feels to players, since every judgement so far is yours alone and the beta is only starting. Both argue for small, reversible steps that real phones and real friends can react to.

## Links worth opening, by route

**Route 1: the letters do the moving**
- [Wordle](https://www.nytimes.com/games/wordle/index.html): type a wrong word and a right one; watch the pop, shake and flip.
- [Gram Jam](https://gramjam.app/) and its write-up, [Spring Physics in my Word Game?](https://colechamberlin.substack.com/p/spring-physics-in-my-word-game): a solo word game whose feel is all motion.
- [Monkeytype](https://monkeytype.com/): text only; try the smooth caret and sound settings.
- [JKLM.fun](https://jklm.fun) (BombParty): the bomb, the highlighted syllable, the bonus letters.
- [Balatro design guide](https://blakecrosley.com/guides/design/balatro): one analyst on feedback as the product.
- [Squeezing more juice out of your game design](https://gamedeveloper.com/design/squeezing-more-juice-out-of-your-game-design-): the toolkit and its warning.

**Route 2: a printed card per game**
- [NYT Games brand refresh](https://www.carolinaturcios.com/nyt-games-brand-refresh): the per-game system, mostly pictures.
- [Puzzmo](https://www.puzzmo.com/): one house style, many games.
- [Jackbox: behind the scenes of Party Pack 10 art](https://www.jackboxgames.com/blog/behind-the-scenes-of-pp10-art): one idea per game, in the artists' words.
- [Risograph demo](https://jonathanstephens.us/play/riso/) and [Rough.js](https://roughjs.com/): the print and hand-drawn finishes, live.
- [Reviving the Family Feud sign](https://www.museumofplay.org/blog/reviving-the-family-feud-sign/): the flip-disc board.

**Route 3: the host and the fuse**
- [These design principles made Jackbox a party game phenomenon](https://builtin.com/articles/jackbox-games-design-party-pack): The Jack Principles in plain terms.
- [Duolingo: character voices](https://blog.duolingo.com/character-voices): personality before art.
- [Jellyvision Q&A on You Don't Know Jack](https://www.gamedeveloper.com/game-platforms/q-a-jellyvision-insists-i-you-don-t-know-jack-i-again): how a host is written.

**Route 4, and going back to pixel art or low-poly**
- [How to tame your AI pixel art](https://dev.to/jenissimo/how-to-tame-your-ai-pixel-art-3pk5): the clean-up pipeline and its limits.
- [MDN: crisp pixel art look](https://developer.mozilla.org/en-US/docs/Games/Techniques/Crisp_pixel_art_look): why pixel art blurs on the web.
- [Saint11 pixel art tutorials](https://saint11.art/blog/pixel-art-tutorials/): one-image lessons by Celeste's artist.
- [How Townscaper works](https://www.gamedeveloper.com/game-platforms/how-townscaper-works-a-story-four-games-in-the-making): a handmade look from rules.
- [Bruno Simon's portfolio case study](https://www.awwwards.com/brunos-portfolio-case-study.html): what live 3D on the web really costs.
- [Monument Valley's elegance](https://killscreen.com/monument-valley-elegance): constraint as the design.
- [react-three-fiber: scaling performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance): the "draw only on change" pattern.
