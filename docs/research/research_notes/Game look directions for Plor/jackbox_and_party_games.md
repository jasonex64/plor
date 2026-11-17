# Jackbox and light online party games: visual and interaction design

Researcher's note on evidence. Everything under "Cited Findings" was read in a source this session (2026-11-16). Anything I know only from general familiarity with these games, and did not confirm in a source, is under "Gaps" and marked *unverified*; treat it as a prompt for what to look at, not as fact. Several suggested sources returned nothing usable (Fonts In Use for the Party Pack games, Game UI Database pages, a Fall Guys UI talk, an Onrizon interview); that is recorded per section.

## 1. How does Jackbox give each game its own identity while staying recognisably Jackbox?

### Takeaway
It is a deliberate studio policy, not an accident: one lead artist (and one audio lead, one director) owns each game and is told to make it look and sound unlike the others, while structure, the phone controller and the general UI conventions stay shared. The identity of each game usually comes from one small, nameable idea (a machine that malfunctions, birds on a wire, 2000s blocky cartoons) that art, audio and host voice all follow.

### Cited Findings
- Allard Laban (Chief Creative Officer) says a pack of five games is kept diverse in style and theme on purpose, otherwise it would be "a pack of same-y games", and the method is to let each game's Lead Artist run with their own vision. — [MCV/Develop interview, Party Pack 11](https://mcvuk.com/?p=228822)
- Bruno Rodríguez (Lead Artist, FixyText) says the games are consistent in structure and general UI, and that the art is what sets them apart and makes them memorable; he describes the pack's picker menu as a parent hosting five very different games. — [Jackbox blog, Behind the Scenes of PP10: Art](https://www.jackboxgames.com/blog/behind-the-scenes-of-pp10-art)
- The shared "frame" in Party Pack 10 is the picker: a college-style game room where each game's characters appear together. It was designed by Lev Cantoral and Charlie Bickett with help from other artists. — [Jackbox blog, PP10 Art](https://www.jackboxgames.com/blog/behind-the-scenes-of-pp10-art)
- Each game's look starts from one concept tied to the mechanic:
  - FixyText (Bruno Rodríguez): a malfunctioning machine. He tried ASCII art first, disliked it, and settled on a mix of hand-drawn and rendered objects with odd symbols as textures and avatar faces, a "technical drawing" look. He made the visuals, the animation and the phone controller himself.
  - Dodo Re Mi (Kyle Fleischer): birds on a telephone wire, because birds give players a reason to make sounds. Playtest feedback that it was "not tense enough" led to a hungry plant that eats the players who do badly. References were botanical illustration and 1960s jazz album covers.
  - TimeJinx (Stef Egan): the blocky UPA-derived look of 2000s cartoons (Powerpuff Girls, Dexter's Lab); backgrounds were kept low-detail so they would not compete with characters.
  - Hypnotorious (Owen Watson): Billy & Mandy, Rocky & Bullwinkle, Ren & Stimpy.
  - Tee K.O. 2 (Hero Paul See): kept the original's look and added more complex effects animation, more detailed backgrounds and easter eggs.
  — [Jackbox blog, PP10 Art](https://www.jackboxgames.com/blog/behind-the-scenes-of-pp10-art)
- The artists actively police overlap: they meet regularly to show progress, and Dodo Re Mi was moved "deeper into the jungle" and never shows the sky so it would not resemble Tee K.O. 2's setting. Coordination is daily check-ins, a weekly art meeting and a Studio Art Lead. — [Jackbox blog, PP10 Art](https://www.jackboxgames.com/blog/behind-the-scenes-of-pp10-art)
- Constraints the artists name: time (the art lead designs while the game design is still moving); clarity and visual hierarchy over decoration; knowing when to scale an idea back or cut it; and that setting deliberate constraints on the art is useful. — [Jackbox blog, PP10 Art](https://www.jackboxgames.com/blog/behind-the-scenes-of-pp10-art)
- Audio follows the same one-owner, one-idea rule. Per game in Party Pack 10: Hypnotorious (Andy Poland) uses violin, theremin and accordion for a vaudeville feel that matches the 1960s/70s cartoon art; TimeJinx (Elise Wattman) is dark and synth-heavy to match its snarky host, citing Wendy Carlos; FixyText (Kelly Shuda) is built on 1970s organ rhythm units plus a TR-808; Dodo Re Mi (Nate Sandberg) rearranges public-domain songs in unexpected genres. — [Jackbox blog, Behind the Scenes of PP10: Audio](https://www.jackboxgames.com/blog/behind-the-scenes-of-pp10-audio)
- Cheap audio tricks named in the same post: FixyText's menu music is the lobby track slowed far down; Hypnotorious's "brainwasher" sound is a clothes dryer with shoes in it; TimeJinx's alarm contains the composer's cat. Brian Chard's stated rule is that audio reinforces the game's vibe without pulling attention from play. — [Jackbox blog, PP10 Audio](https://www.jackboxgames.com/blog/behind-the-scenes-of-pp10-audio)
- Andy Poland says the audio team is encouraged to have a unique point of view and not sound like other games; he also notes audio is "the last link in the chain" in production. — [Jackbox blog, PP10 Audio](https://www.jackboxgames.com/blog/behind-the-scenes-of-pp10-audio)
- The director owns tone. Tim Sniffen (Tee K.O. 2) says the director has the final word on design and tone; Brooke Breit (Dodo Re Mi) wrote and recorded the host lines herself because the game had little other written content. — [Jackbox blog, Behind the Scenes of PP10: Directing](https://jackboxgames.com/blog/behind-the-scenes-of-pp10-directing)
- Small in-jokes become identity: Fakin' It's "Orange Guy" avatar (Owen Watson) became a fan favourite and went on the pack art; Guesspionage's brutalist building is Boston City Hall. — [Jackbox blog, Making The Jackbox Party Pack 3](https://www.jackboxgames.com/making-the-jackbox-party-pack-3)
- Typography: the only Fonts In Use record found is for the parent franchise You Don't Know Jack, whose logo uses the Franklin Gothic family in several widths. — [Fonts In Use, via Abstract Fonts mirror](https://news.abstractfonts.com/fontsinuse/don-t-know-jack-logo)
- New games are often remixes of older ones (Drawful builds on Fibbage, Joke Boat on Quiplash, Push the Button on Fakin' It); Laban describes the technology as one product continually refined. — [Built In, "These Design Principles Made Jackbox a Party Game Phenomenon"](https://builtin.com/articles/jackbox-games-design-party-pack)

### Inferences
- The transferable recipe is "shared skeleton, different skin": the same layout, input components and flow in every game, with per-game art, palette, type, sound and voice layered on top. For Plor that means Offbeat and Fragments can share one component set and differ only in theme tokens, a display typeface, a mascot/host and a sound set. That is cheap for a one-human-plus-agents team because the skin is data, not new screens.
- Each Jackbox look can be stated in one sentence that comes from the mechanic ("a game about text, so a broken text machine"). The reverted Plor attempts (pixel-art themes, a 3D village) were worlds placed around the game, not concepts drawn from the mechanic. A mechanic-derived concept for Fragments would start from the letter chunk and the clock; for Offbeat, from the host and the hidden answers.
- Jackbox artists explicitly keep backgrounds quiet so the foreground reads, and name "knowing when to scale back" as a core skill. That matches the owner's "went too far" reaction: identity should sit in a few foreground elements, not in a full scene.
- A hub that shows both games' characters together (the picker) is how Jackbox reads as one brand despite five styles. Plor's home screen could do the same job with almost no art.

### Gaps
- I found no sourced, game-by-game description of the looks of Quiplash, Fibbage, Drawful, Trivia Murder Party, Survive the Internet, Job Job, Joke Boat, Quixort or Fakin' It, and no named typefaces for them. *Unverified, from general familiarity, to check against footage:* Quiplash is flat bright shapes with bold hand-lettered-style answers on two facing panels; Fibbage is a 1970s game-show look; Drawful is a sketchbook/doodle look that makes bad drawings feel at home; Trivia Murder Party is a dark horror-hotel look with a grid of player dolls; Survive the Internet imitates fake websites and comment threads; Quixort is falling blocks on a conveyor. The official game pages at [jackboxgames.com](https://www.jackboxgames.com) have trailers for each.
- Fonts In Use has no entries I could find for individual Party Pack games; Game UI Database ([gameuidatabase.com](https://www.gameuidatabase.com)) did not surface Jackbox pages through search. Both need a manual look on the sites themselves.
- No art-director portfolio pages (ArtStation/Behance) for the named artists were found in this session; searching the names above (Owen Watson, Bruno Rodríguez, Kyle Fleischer, Stef Egan, Hero Paul See, Dave Innis, Lev Cantoral) is the next step.

## 2. What does the phone controller look like versus the main screen, and what transfers to a phone-first daily game?

### Takeaway
The phone is kept deliberately poor: one task at a time, three input types (draw, tap a button, type text), private information only, and it must work on old phones. All spectacle lives on the shared screen. Plor has no shared screen, so the lesson is to separate the two roles in time on one device: a plain input moment, then a reveal moment that takes over the screen.

### Cited Findings
- Players join by typing a room code on a web page; no app and no peripherals. — [Built In](https://builtin.com/articles/jackbox-games-design-party-pack)
- The controller uses a small fixed set of inputs: drawing, choosing from buttons, entering text. Because the set is the same in every game, skills carry across games. — [Built In](https://builtin.com/articles/jackbox-games-design-party-pack)
- The games never ask for more than one decision at a time; narration and animation carry the player from one step to the next. — [Built In](https://builtin.com/articles/jackbox-games-design-party-pack)
- Split of roles: the main screen shows what everyone shares (answers, results); the phone handles personal input and private information, such as secret roles in Push the Button. — [Built In](https://builtin.com/articles/jackbox-games-design-party-pack)
- Chase McClure (senior engineer with a UX background) was hired in 2019 as an "advocate for the phone". The studio avoids features (gyroscope, camera) that would shut out people with older phones. — [Built In](https://builtin.com/articles/jackbox-games-design-party-pack)
- Laban's target user is a non-gamer relative; the interface must be simple enough for them. — [Built In](https://builtin.com/articles/jackbox-games-design-party-pack)
- In at least one game the lead artist also built the phone controller (Bruno Rodríguez, FixyText), so the controller carries the game's look. — [Jackbox blog, PP10 Art](https://www.jackboxgames.com/blog/behind-the-scenes-of-pp10-art)
- Laban on the phone: phones normally pull people apart, and here everyone uses them together. — [Game Developer, Allard Laban interview](https://www.gamedeveloper.com/business/allard-laban-dives-into-the-past-present-and-future-of-jackbox-games)
- Accessibility options Jackbox ships: subtitles (from Party Pack 7), a Motion Sensitivity setting and a No Timer option (Party Pack 8), settings reachable mid-game, and a published list of which games work with screen readers. — [Jackbox blog, PP8 streaming/moderation/accessibility](https://jackboxgames.com/streaming-moderation-accessibility-features-jackbox-party-pack-eight); [Jackbox support, accessibility features](https://support.jackboxgames.com/hc/en-us/articles/15794801592855-What-accessibility-features-are-available-in-your-games)

### Inferences
- Jackbox's phone screen is roughly what Plor's beta already is: plain, one input, big targets. The gap is that Plor has no "TV". The equivalent is to give the result of each round a full-screen beat with the game's identity in it, then drop back to the plain input. Identity goes in the reveal, not around the text field.
- "Same input set in every game" argues for Offbeat and Fragments sharing one text-entry component and one timer component, themed per game.
- A reduced-motion setting and a tolerant-timer option are standard in this genre, so any motion Plor adds should be built behind the reduce-motion switch from the start (the project already plans one).
- Private information on the phone maps to Plor's social layer: what a player sees about friends' runs before and after they have played is the same "who knows what, when" design problem.

### Gaps
- No screenshots or written breakdown of the jackbox.tv controller layout (colours, button sizes, type) were found. *Unverified:* the controller generally shows the game's logo/colour as a header, the player's name, one prompt, one input and a submit button, then a "waiting" state with a small joke or doodle. Check by joining any game at [jackbox.tv](https://jackbox.tv) or in playthrough videos.
- No Jackbox post on a controller redesign was found.

## 3. What does a host or narrator character and the copy tone do?

### Takeaway
The host is Jackbox's actual interface. The studio's founding document, The Jack Principles, treats the game as a conversation led by a host who paces the player and appears to notice what they do. The comedy culture behind the writing is improv: the game's job is to make the players look funny, not to be funny at them.

### Cited Findings
- The Jack Principles were written by founder Harry Gottlieb and describe an "Interactive Conversation Interface" that feels like a live host guiding the player. Three groups of rules: keep pacing (one task at a time, make the next step obvious, signal when the game is waiting, keep input efficient); create the illusion of awareness (respond to what the player did with apparent intelligence and emotion); maintain that illusion (dialogue that builds intimacy, behaviour that fits what players do). — [Built In](https://builtin.com/articles/jackbox-games-design-party-pack)
- A summary of the paper lists, among the pacing rules: limit how many choices are shown at once, and pause, quit or move on if the player does not respond soon enough. Among the awareness rules: respond to the player's actions, inactions, past actions and patterns of actions, to the real time and place, and to comparisons between players. The paper is dated 1997 in that summary; another reference dates it 2002, so the date is uncertain. — [Medium, "Please Read The Jack Principles"](https://medium.com/the-charming-device/please-read-the-jack-principles-4a7ee4820875) (page blocked on fetch; taken from the search extract)
- Laban calls the games a hybrid of passive and active media that borrows TV conventions: narrative timing, transitions and dialogue. — [Built In](https://builtin.com/articles/jackbox-games-design-party-pack)
- Jackbox has hired Second City veterans since the 1990s. Creative director Brooke Breit (a Second City alumna) names two improv rules behind the games: "yes, and", and making your scene partner look good. The games are meant as a "diving board" for friends' own inside jokes. Job Job came from an improv exercise. — [WFDD/NPR, Second City and Jackbox](https://www.wfdd.org/2025-10-23/how-chicagos-famous-second-city-comedy-club-fueled-blockbuster-party-game-jackbox)
- Breit: "We set players up to be the stars of the show." — [Room Escape Artist podcast page](https://roomescapeartist.com/2024/10/22/comedy-collaboration-brooke-breit-creative-director-jackbox-games-repod-s8e4/)
- Hosts are staff, not hired stars. Trivia Murder Party's killer host is voiced by Spencer Ham; Andy Poland was due to host and could not for lack of time. Ham says radio noise leaking into his headphones in the booth may have made the character more unhinged. — [Jackbox blog, Making Party Pack 3](https://www.jackboxgames.com/making-the-jackbox-party-pack-3)
- A host can be tiny: Dodo Re Mi's host lines were written and recorded by its director. TimeJinx has a named host, Jerri, whose snarky tone the music was written to match. — [Jackbox blog, PP10 Directing](https://jackboxgames.com/blog/behind-the-scenes-of-pp10-directing); [Jackbox blog, PP10 Audio](https://www.jackboxgames.com/blog/behind-the-scenes-of-pp10-audio)
- Trivia Murder Party 2 gives its host a setting and backstory (the Murder Hotel he grew up in), and the team moved the tone from Saw-style horror toward 1970s horror. — search extract of the [Jackbox blog / game pages](https://www.jackboxgames.com/making-the-jackbox-party-pack-3) (secondary; not read in full)

### Inferences
- Offbeat already has "the host" as a rule of the game, so it has what Jackbox treats as the core of identity for free. A host needs no voice acting or animation to work: a name, a consistent attitude, and lines that react to what the player just did (matched the host, ran out the clock, used a taken letter, a streak, the day of the week) are the "illusion of awareness" in text. This is the cheapest high-impact identity move available to this team, and agents can draft line variants for the human to pick from.
- The awareness rules translate directly into copy triggers for a daily game: react to inaction (timer ran out), to past actions (yesterday's score, a streak), to patterns (always answering in the last seconds), to real time (late-night play, Monday), and to comparisons between players (a friend gave the same answer). Each trigger is a small table of lines.
- "Make the player the star" suggests the reveal should feature the player's own answer in large type, with the host reacting to it, not a score table first.
- Fragments has no host. By Jackbox's logic it needs an equivalent voice or character to have an identity; in BombParty the bomb plays that part.
- Host and music are matched to each other at Jackbox (snarky host, brooding synths). Decide the host's attitude first; palette, type and sound follow from it.

### Gaps
- No primary source on how host scripts are written, how many line variants are recorded, or how lines are triggered. The full Jack Principles PDF was not retrieved.
- Nothing sourced on Quiplash's or Fibbage's hosts specifically (Schmitty, Cookie Masterson); they come from You Don't Know Jack.
- The Brooke Breit podcast episode itself was not transcribed on the page; its detail on testing and tone is in the audio only.

## 4. Motion: transitions, reveals, score tallies and timers

### Takeaway
I found almost no primary material on Jackbox's animation technique. What is sourced is the principle (TV-style pacing with one beat at a time, and the game moving on without the player) and, from Wordle clones and critiques, a concrete and cheap reveal pattern. Specifics of Jackbox's reveals must be studied from footage.

### Cited Findings
- Jackbox borrows TV timing, transitions and dialogue, and uses narration plus animation to pull the player from step to step. — [Built In](https://builtin.com/articles/jackbox-games-design-party-pack)
- The pacing rules include moving on without the player if they are too slow, and always signalling when the game is waiting for input. — [Medium summary of The Jack Principles](https://medium.com/the-charming-device/please-read-the-jack-principles-4a7ee4820875) (search extract)
- Tension can be added with a single visual threat tied to performance: Dodo Re Mi's man-eating plant was added after feedback that the game was not tense enough. — [Jackbox blog, PP10 Art](https://www.jackboxgames.com/blog/behind-the-scenes-of-pp10-art)
- Tee K.O. 2's upgrade over the original was mostly more complex effects animation and background detail on the same design. — [Jackbox blog, PP10 Art](https://www.jackboxgames.com/blog/behind-the-scenes-of-pp10-art)
- Jackbox ships a Motion Sensitivity setting and a No Timer option. — [Jackbox blog, PP8 accessibility](https://jackboxgames.com/streaming-moderation-accessibility-features-jackbox-party-pack-eight)
- Wordle's reveal, as rebuilt in tutorials and clones: each tile flips on its horizontal axis, the colour changes at the midpoint when the tile is edge-on, and the flips cascade left to right; a small pop on typing and a shake on an invalid word complete the set. — [Kodeco SwiftUI Wordle tutorial](https://www.kodeco.com/31881532-how-to-make-a-game-like-wordle-in-swiftui-part-two); [Pratt IXD design critique of Wordle](https://ixd.prattsi.org/2025/09/design-critique-wordle-website/) (third-party analyses, not NYT statements)
- Kahoot's countdown music is picked from a fixed library by the length of the question's timer; a fan wiki says several tracks use a ticking clock to hurry players. Co-founder Alf Inge Wang, who composed the lobby theme, reports that with the audio on the room gets noisier and more energetic. — [Kahoot support forum](https://support.kahoot.com/hc/en-us/community/posts/115001072588-Ability-to-customize-or-disable-the-countdown-music); [TV Tropes, Kahoot](https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/Kahoot) (fan source); [Kahoot blog, Alf Inge Wang](https://kahoot.com/blog/2016/02/17/meet-krew-interview-games-professor-alf-inge-wang/)
- Gartic Phone's "3, 2, 1" countdown animation and its particular purple are cited by fans as the things they remember about its look. — [shapes.inc fan page on Gartic Phone](https://shapes.inc/fandom/gartic-phone) (fan source, low authority)

### Inferences
- The cheap, proven reveal is a staggered one: show results one item at a time with a short delay, and hide the state change behind a midpoint (flip, wipe, cover). It is a few CSS transforms and fits both Plor games: Offbeat's host answers flipping over one by one after the player's answer; Fragments' seven rounds tallying one by one.
- Three micro-interactions do most of the work in Wordle: a pop on input, a shake on rejection, a cascade on reveal. Plor can adopt the same three and vary only their character per game (snappy for Fragments, theatrical for Offbeat).
- Timers carry tension through one escalating signal, not a constant one. Jackbox added a plant; Kahoot uses ticking music; BombParty uses a bomb. For Plor a single escalation in the last few seconds (colour, shake, a sound) would be enough; the threshold itself is a number the owner must supply.
- A daily solo game has no host talking over transitions, so the "one beat at a time" rule has to be done by sequencing: answer locks, pause, reveal, host line, score. The pause before the reveal is where the tension is.

### Gaps
- No GDC talk, blog post or interview on Jackbox's animation, transitions or score-tally design was found. *Unverified, from familiarity:* Jackbox reveals are typically sequenced one answer at a time with a sound sting each, votes "stick" onto answers as player-name tags, the author's name is revealed last, and scores count up on a ranked bar list that reorders. Verify in playthrough videos.
- No NYT statement on Wordle's animation intent; the analysis is third-party.
- Nothing sourced on how Kahoot's music changes near the end of a timer.

## 5. Other references: what works and what is cheap but effective

### Takeaway
The successful browser party games are visually modest. Their identity comes from one or two fixed things (a colour, a countdown, a character shape, a bomb) repeated everywhere. Sourcing for their design intent is thin: most have no published design material.

### Cited Findings
- JKLM.fun (BombParty, PopSauce, Master of the Grid) is written up in the first person by a single developer, is donation-funded, has no accounts (players link Discord or Twitch), and offers private rooms. Its planned successor, Sparks.land, is described as a streamlined Roblox-like 3D world in the browser where each player has a character; no date is given. — [JKLM.fun FAQ](https://jklm.fun/faq)
- The FAQ does not name the creator; it mentions Elisée's Twitch channel. A personal page describing its author as the maker of popular games on JKLM.fun links to a Sparklin Labs itch.io page. The link between the two is inferred, not stated. — [JKLM.fun FAQ](https://jklm.fun/faq)
- Gartic Phone was released in October 2020 by Onrizon, a Brazilian studio in Belo Horizonte. It is built around deliberately rough drawings ("the worse the art, the better the game"). It briefly added and then removed an AI art mode after artists who had promoted the game objected. — [Know Your Meme, Gartic Phone](https://knowyourmeme.com/memes/subcultures/gartic-phone); [PC Gamer on the AI mode](https://pcgamer.com/games/puzzle/the-game-thats-all-about-drawing-and-creativity-gartic-phone-adds-and-then-swiftly-removes-an-ai-mode-in-a-straight-up-slap-in-the-face-to-any-and-all-artists)
- Among Us: Marcus Bromander did the art and animation. He has said the handful of crewmate sketches were the only concept art and that the team settled on the design quickly; a 2017 prototype used coloured circles and squares. Players praise the simplicity. — [Game Developer, early Among Us character concepts](https://gamedeveloper.com/art/early-i-among-us-i-character-concepts-depict-the-birth-of-the-bean); [ComicBook.com on the concept art](https://comicbook.com/gaming/news/among-us-concept-art-early-look-crewmate-design)
- Fall Guys: a colour-and-pattern system was set up so players can tell at a glance which elements are interactive; the bean character was inspired by a vinyl toy designed by the studio's lead UI artist; principal concept artist Ash Kerins published a thread on how the visual language developed. — [GameSpot, how Fall Guys levels are made](https://gamespot.com/articles/fall-guys-heres-how-the-developers-make-its-levels/1100-6481433/); [Thread Reader copy of the Ash Kerins thread](https://threadreaderapp.com/thread/1296917830244405254.html)
- Kahoot: the lobby theme and its ticking countdown tracks are a recognised part of the product, enough to have spawned sheet music and memes. — [Kahoot blog, Alf Inge Wang](https://kahoot.com/blog/2016/02/17/meet-krew-interview-games-professor-alf-inge-wang/); [Know Your Meme, Kahoot](https://knowyourmeme.com/memes/subcultures/kahoot)
- Game UI Database (by Edd Coates) holds more than 12,000 interface screenshots from over 340 games and is searchable by game and screen type. — [Digital Production on Game UI Database](https://digitalproduction.com/2021/02/22/spielemenue-bibliothek-gaming/); [80.lv on version 2.0](https://80.lv/articles/game-ui-database-2-0-has-been-released)

### Inferences
- The pattern across Among Us, Fall Guys and Gartic Phone is one simple, recolourable character shape that stands for the player. It is cheap (one silhouette, many colours and hats), it carries into the lobby, the board and the results, and it gives friends a face on a social board. For Plor's live board of friends' runs this is probably worth more than any background art, and it is well within what agents can draw as SVG.
- Gartic Phone and Kahoot show that a single brand colour plus a signature countdown is enough to be recognised. Plor could give each game one colour and one signature moment (Offbeat's reveal, Fragments' clock) and leave the rest plain.
- The Gartic Phone AI episode is a caution for a team that makes art with AI: the audience for social drawing and word games includes people who react badly to visibly AI-made art. Simple vector shapes and type avoid the question.
- JKLM itself is heading toward a 3D world. The owner has already tried and reverted that direction for Fragments; BombParty's own appeal has been the bare ring of players, the bomb and the syllable.
- Fall Guys' rule (a fixed colour/pattern meaning "you can interact with this") is a small-scale design-system idea: one colour reserved for the active input in each game.

### Gaps
- No design interviews or art notes found for skribbl.io, Codenames online, Wavelength or Just One web versions, or Onrizon. No sourced description of JKLM/BombParty's interface. *Unverified, from familiarity:* BombParty shows players in a ring around a bomb with the syllable on it, an arrow pointing to the current player, hearts for lives, and each player's typing visible live under their avatar; it is a dark, flat page with almost no art. skribbl.io uses hand-drawn-looking outlined avatars and a marker-style logo on a plain blue page. Codenames online is a flat grid of coloured cards. These should be looked at directly: [jklm.fun](https://jklm.fun), [skribbl.io](https://skribbl.io), [garticphone.com](https://garticphone.com), [codenames.game](https://codenames.game).
- No dedicated Fall Guys UI talk was found. Anna Hollinrake (Fall Guys art lead) is listed as a Develop conference speaker without a talk title. — [Develop conference speaker page](https://developconference.com/speakers/anna-hollinrake)
- Game UI Database and Interface In Game pages for these specific titles were not confirmed to exist; search the sites by title.

## 6. Published talks and interviews by Jackbox staff on process

### Takeaway
There is one GDC talk on how a pack is made, a set of first-party "Behind the Scenes" blog posts by discipline (the richest source on art and audio), and a steady run of interviews with Allard Laban and Brooke Breit. Process in short: a backlog of ideas, paper tests first, playtests twice a week, the look found by iteration alongside the design.

### Cited Findings
- GDC talk: "The Jackbox Party Pack Unboxed: How and Why We Make a Pack of 5 Games Every Year", by Evan Jacover (CTO), covering where ideas come from and how games are chosen for a pack. — [GDC Vault session 1027202](https://gdcvault.com/play/1027202/)
- GDC Summer 2020 talk by Mike Bilder and Brooke Hofer on the lockdown audience surge. — [Thumbsticks write-up](https://www.thumbsticks.com/how-lockdown-opened-up-jackbox-party-to-a-massive-new-audience/)
- The studio keeps a backlog of about 50 concepts and picks about five per pack. Ideas are paper-tested first, sometimes as fill-in-the-blank cards; staff playtest at lunch in groups of about three to eight; outside testers fill in surveys; designers watch Twitch streams for laughter and frustration; feature requests are read for the underlying problem, not taken literally. — [Built In](https://builtin.com/articles/jackbox-games-design-party-pack)
- Party Pack 11: development began right after the Naughty Pack shipped in September 2024; all games were greenlit and in pre-production by the end of that year; company playtests run about twice a week through production, plus outside players. — [MCV/Develop](https://mcvuk.com/?p=228822)
- A Jackbox statement: with constant playtesting and iteration, each game finds its own gameplay and presentation style over time. — search extract attributed to the [God is a Geek Quintpack interview](https://www.godisageek.com/2024/04/the-jackbox-party-quintpack-interview-there-are-a-ton-of-jokes-that-havent-been-found-yet/) (not read in full; attribution to this page is unconfirmed)
- FixyText's concept was tested with a shared document and prompts read aloud before any art existed. Tee K.O. began as paper tests. — [Jackbox blog, PP10 Directing](https://jackboxgames.com/blog/behind-the-scenes-of-pp10-directing); [Jackbox blog, Making Party Pack 3](https://www.jackboxgames.com/making-the-jackbox-party-pack-3)
- Early art is rough sketches, mock-ups and concept pieces that change with feedback and technical limits; artists critique each other's concepts and stay open to "happy accidents". Bruno Rodríguez advises artists on small teams to learn animation and programming. — [Jackbox blog, PP10 Art](https://www.jackboxgames.com/blog/behind-the-scenes-of-pp10-art)
- Further first-party posts in the same series: engineering. — [Jackbox blog, Behind the Scenes of PP10: Engineering](https://jackboxgames.com/blog/behind-the-scenes-of-pp10-engineering)
- Other interviews found but not read in full: Laban at PAX Aus 2025; Laban with Pocket Gamer on Party Pack 12; Nintendo Life with the CEO on ten years of Party Packs; Andy Poland on the Composer Talk podcast (episode 41); the Xbox Wire piece on remaking a game for remote play. — [Player2](https://www.player2.net.au/2025/10/jackbox-is-back-pax-aus-2025-interview-mike-bilder-and-allard-laban/); [Pocket Gamer](https://www.pocketgamer.com/the-jackbox-party-pack-12/interview-with-allard-laban-cco/); [Nintendo Life](https://www.nintendolife.com/features/time-to-laughter-is-like-zero-jackbox-games-ceo-on-quiplash-t-shirts-and-10-years-of-party-packs); [Composer Talk ep. 41](https://chartable.com/podcasts/composer-talk/episodes/76008516-ep-41-andy-poland-jackbox-games); [Xbox Wire](https://news.xbox.com/en-us/2024/09/13/how-jackbox-games-took-a-beloved-party-game-and-made-a-new-remote-play-version/)

### Inferences
- Jackbox does not design the look up front and then build; the look is found while the game is being played, by one owner, with frequent critique. For Plor that argues for small, reversible identity experiments on the live game (a host voice, one reveal animation, one colour) judged by the beta friends' reactions, in place of another large themed build.
- The earlier Plor attempts jumped to a finished world. Jackbox's order is the reverse: concept sentence, rough sketch or mock, critique, then production.
- "Watch for laughter and frustration" is a usable test for a closed beta with friends: the comments and the board are where reactions to a new host line or reveal will show up.

### Gaps
- The GDC Vault talk was not watched and no transcript or slides were found, so its content beyond the session description is unknown; it may be behind the Vault paywall.
- No talk or post specifically by a Jackbox art director on art direction beyond the PP10 art blog; no numbers on team size per game or art hours per game.
- Whether equivalent "Behind the Scenes" art posts exist for other packs was not checked.
