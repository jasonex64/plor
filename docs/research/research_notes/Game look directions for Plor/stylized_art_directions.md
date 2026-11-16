# Stylized 2D / 2.5D art directions (not pixel art) for Plor, and their feasibility for one human plus AI coding agents

How to read these notes:

- **Cited Findings** are things a source returned in this session says. All came from web search result summaries; none of the pages was opened in full, so wording and details are *search-summary level*, not page-verified.
- **Inferences** are the researcher's own judgement, including everything about how a direction would look on a Plor screen, its relative cost, and its phone performance. No cost or performance figure here is measured. Relative cost is given as low / medium / high and is an estimate, not a number from a source.
- **Reference links** to games in the catalogue are the games' own or Wikipedia pages given from memory as pointers for the reader. They were *not fetched this session* unless the same line carries a cited finding.

## Catalogue: which stylized directions exist, and what does each one take?

### Takeaway
Eleven directions are catalogued below. Four of them (typographic/neo-brutalist, bold flat geometric, print/riso/halftone, and generative per-day art) can be made almost entirely in code, which is where this team is strong. The ones that depend on drawn characters or painted surfaces (mascot/sticker, watercolour, clay) depend on consistent illustration, which is where the sources say AI generation is weakest.

### Cited Findings

Flat / geometric / minimal
- Mini Metro's makers chose a minimalist style because they judged it was the only way they would finish the game, and settled quickly on the London Underground map as the model. — [Giant Bomb interview with Peter Curry](https://www.giantbomb.com/dinosaur-polo-club/3010-10760/forums/interview-peter-curry-co-creator-of-mini-metro-1871069/?page=1)
- One original design goal of Mini Metro was that the player can judge the state of the network at a glance, with no submenus, hidden statistics or scrolling. — [Game Developer, video on Mini Metro's visual design](https://gamedeveloper.com/design/video-behind-the-minimalistic-visual-design-of-i-mini-metro-i-)
- Mini Metro's visual design was led by Jamie Churchman, who had no art background; the developers said graphic design and game design could not be separated in so minimal a game. — [Giant Bomb interview](https://www.giantbomb.com/dinosaur-polo-club/3010-10760/forums/interview-peter-curry-co-creator-of-mini-metro-1871069/?page=1)
- The Mini Metro prototype came out of Ludum Dare 26, whose theme was minimalism. — [Kill Screen](https://www.killscreen.com/mini-metro-turns-headache-mass-transportation-fun/)
- For the sister game Mini Motorways the team prototyped a range from fully abstract shapes to miniature theme-park-style maps before settling how abstract to go. — [Miketendo64 interview](https://miketendo64.com/2022/08/14/interview-mini-motorways/)

Paper / cut-out
- Wandersong's "paper cutout" look was inspired mainly by Kirby's Epic Yarn and its physical feel; the simple style was also easier for Greg Lobanov to manage as the game's only programmer and artist. Characters flip over like paper when they change direction. — [Wikipedia: Wandersong](https://en.wikipedia.org/wiki/Wandersong)
- Codrops' SVG filter series shows `feTurbulence` noise combined with SVG lighting producing a rough paper texture, with `baseFrequency` controlling the grain's scale. — [Codrops: Creating Texture with feTurbulence](https://tympanus.net/codrops/2019/02/19/svg-filter-effects-creating-texture-with-feturbulence/)

Print / riso / halftone
- Puzzmo is pitched by co-creator Zach Gage as a virtual newspaper puzzle page, meant to evoke finding several puzzles printed side by side. — [Game Developer: Zach Gage on Puzzmo](https://www.gamedeveloper.com/design/puzzmo-co-creator-zach-gage-on-building-newspaper-games-that-can-last-forever)
- A halftone look can be made in pure CSS in a few declarations (a dot pattern, blended with the image, then a high-contrast filter to threshold it); the simple version is not robust across images, and the author notes a custom SVG filter would be a better fix. — [Frontend Masters: Pure CSS Halftone Effect in 3 Declarations](https://frontendmasters.com/blog/pure-css-halftone-effect-in-3-declarations/); see also [Lean Rada: Creating a halftone effect with CSS](https://leanrada.com/notes/pure-css-halftone/)
- A working web demo combines a halftone dot grid, duotone colour and an SVG filter to get a risograph look, treating grain, registration shifts and colour overlaps as intended features. — [Jonathan Stephens: Advanced Risograph Techniques](https://jonathanstephens.us/play/riso/)
- Grain can be made by placing SVG-filter noise as a background image and combining it with a CSS gradient. — [CSS-Tricks: Grainy Gradients](https://css-tricks.com/?p=351302)

Hand-drawn / doodle
- Rough.js draws lines, curves, arcs, polygons, circles, ellipses and SVG paths with a sketchy hand-drawn look, to Canvas or SVG, in under 9 kB gzipped, MIT-licensed; `roughness` and `bowing` options control the wobble, and fills include hachure, solid, zigzag, cross-hatch and dots. — [roughjs.com](https://roughjs.com/); [GitHub: rough-stuff/rough](https://github.com/rough-stuff/rough)
- Baba Is You is described as deliberately lo-fi, with wobbly character animations and a muted palette; the wobble is seen as its signature. — [games.gg: Baba Is You](https://games.gg/baba-is-you/)
- Players have asked for a way to turn the wiggling off, saying the wiggling text bothers some people who see it. — [Steam discussion, Baba Is You](https://steamcommunity.com/app/736260/discussions/0/2650805212055291931/?l=greek)
- The wobble can be imitated procedurally with random displacement in a shader, rather than by drawing frames. — [Godot Shaders: Random displacement animation](https://godotshaders.com/?p=11417)

Neo-brutalist / typographic
- Nielsen Norman Group describes neobrutalism as a visual-design trend defined by high contrast, blocky layouts, bold colours, thick borders and "unpolished" elements. — [NN/g: Neobrutalism](https://www.nngroup.com/articles/neobrutalism/)
- Its signature is the hard shadow: an X and Y offset with zero blur in full-opacity black; guides give borders of roughly 2 to 5 px and offsets around 8 px, and buttons that shift toward their shadow when pressed. — [SVGator: What is neubrutalism](https://www.svgator.com/blog/what-is-neubrutalism/); [daisyUI trends: neubrutalism](https://trends.daisyui.com/trend/neubrutalism/)
- Gumroad is the most cited example, but one source notes its current homepage serves no box shadows, so it may not be a live example. — [daisyUI trends: neubrutalism](https://trends.daisyui.com/trend/neubrutalism/)
- Jackbox's Hypnotorious used ASCII art because, in the artist's words, it was "a game about text". — [Jackbox blog: Behind the scenes of Party Pack 10 art](https://www-origin.jackboxgames.com/blog/behind-the-scenes-of-pp10-art)

Game-show / party-game
- Jackbox artists say the games share structure and general UI while the art sets each game apart, which creates contrast and makes them more memorable; at the start of a pack they check which themes the other games are using. — [Jackbox blog: Behind the scenes of Party Pack 10 art](https://www-origin.jackboxgames.com/blog/behind-the-scenes-of-pp10-art)
- Once a player has played a few Jackbox games they have in effect learned how to play all of them, even though each game's plot, animation and tone feel different. — [Built In Chicago: Jackbox design principles](https://www.builtinchicago.org/articles/jackbox-games-design-party-pack)
- Individual Jackbox games have used a thick-lined cartoon office (Job Job, Party Pack 8) and a claymation look (Party Pack 7). — [Screen Rant: Party Pack 8 review](https://screenrant.com/jackbox-party-pack-8-review/); [TheSixthAxis: Party Pack 7 review](https://www.thesixthaxis.com/?p=366973)

Retro screen / shader
- Balatro's CRT look (scanlines, curvature) is applied to everything including menus, as GLSL shaders over the whole canvas; one design analysis argues it is the foundational decision other choices follow from, born from limitation and not from a big art pipeline. — [Blake Crosley: Balatro design guide](https://blakecrosley.com/guides/design/balatro) (the author's interpretation, not the developer's statement); [Foro3D: Balatro and LÖVE](https://foro3d.com/en/2026/mayo/el-arte-del-crt-digital-balatro-y-la-magia-de-love.html)
- Balatro's swirling background is a shader that the community has ported to other engines. — [Godot Shaders: Balatro Background Shader](https://godotshaders.com/?p=9763)
- The publisher describes Balatro as a "psychedelic" world with hand-crafted pixel art. — [Playstack: Balatro](https://www.playstack.com/games/balatro)

Generative / procedural
- A common way to make a daily generative piece is to turn the date into a seed, so everyone sees the same piece that day. — [DEV: Generative algorithm using human interpretation](https://dev.to/knownquantity/generative-algorithm-using-human-interpretation-34dc)
- Please, Touch the Artwork, by a solo developer, used procedural generation for most levels of an art-themed puzzle game; Unity's case study credits this with saving over 300 hours of art creation. — [Unity: Please, Touch the Artwork](https://unity.com/resources/please-touch-the-artwork) (a vendor case study)

Mascot / sticker
- Duolingo drives its characters with Rive state machines that mix reusable pieces (eyes, brows, mouth shapes, body movement, idles) instead of long pre-animated sequences; Rive reports the Lily video-call file is under a megabyte. — [Rive: Duolingo's AI-powered video call brings Lily to life](https://rive.app/blog/duolingo-s-ai-powered-video-call-brings-lily-to-life) (the vendor's own account)

### Inferences

Everything in this sub-section is the researcher's judgement. "On a Plor screen" descriptions are proposals, not findings. Costs are relative estimates.

**1. Type as the art (neo-brutalist / editorial / kinetic typography)**
- Defines it: letters, numerals and rules are the only imagery. Very large display type, thick borders, hard zero-blur shadows, two or three flat colours, motion applied to the letters themselves.
- References: [NN/g on neobrutalism](https://www.nngroup.com/articles/neobrutalism/); Jackbox's Hypnotorious (ASCII art for "a game about text", cited above); [Gumroad](https://gumroad.com) (historic example, see caveat above); Wordle and NYT Games as the plain end of the same idea (not fetched).
- Why it works: a word game's content already is type, so the art and the play are the same object and nothing competes with the input field.
- On a Plor screen: Fragments' chunk ("cks") set huge and heavy in the middle, swelling or shaking as the clock runs down, the typed word slotting around it. Offbeat's question as a headline; letters the host takes get struck through, knocked out or flipped to the host's colour one by one.
- Production: fully code-authored (CSS, variable fonts, SVG). Cost: low. Needs one good licensed display typeface per game, which is a human choice.
- Risks: can read as "another neo-brutalist SaaS page" if only the borders and shadows are copied; the owner may find it too close to the plain beta. The personality has to come from the type choice and motion.
- Phone performance: best of all eleven. Transforms and opacity only.

**2. Bold flat vector / geometric**
- Defines it: flat colour fields, simple geometric silhouettes, no outlines or very few, strong limited palette, smooth easing.
- References: Mini Metro ([Dinosaur Polo Club](https://dinopoloclub.com/games/mini-metro/), not fetched; interviews cited above); [Monument Valley](https://www.monumentvalleygame.com) (not fetched); [Alto's Adventure](http://altosadventure.com) (not fetched); [Untitled Goose Game](https://goose.game) (not fetched).
- Why it works: Mini Metro's makers picked it because they could finish it and because state is readable at a glance (cited above). Both reasons apply to a one-person team and a 20-second typing round.
- On a Plor screen: a coloured stage of two or three shapes behind the input; the timer as a shape that drains; each game owning one shape family (circles for Offbeat, wedges or a fuse line for Fragments).
- Production: code-authored SVG. Cost: low to medium. Abstract shapes are reliable from an agent; flat *scenes* (Alto's mountains, Monument Valley's buildings) need composition skill and are less reliable.
- Risks: generic "app illustration" look if it has no organising idea, the way Mini Metro has the transit map.
- Phone performance: very good.

**3. Print: risograph, halftone, misregistration, newsprint**
- Defines it: two or three spot inks that overprint, visible grain, halftone dots, slightly off-register layers, paper-coloured background.
- References: [Jonathan Stephens' riso demo](https://jonathanstephens.us/play/riso/); [Puzzmo](https://www.puzzmo.com) (newspaper-page concept cited above; its actual typography and palette were not found in sources); [Kentucky Route Zero](http://kentuckyroutezero.com) (not fetched); [Frontend Masters halftone](https://frontendmasters.com/blog/pure-css-halftone-effect-in-3-declarations/).
- Why it works: gives warmth and a hand-made feel to otherwise flat code-drawn shapes, and "daily puzzle" already has a newspaper association.
- On a Plor screen: off-white paper ground with static grain; the chunk or question printed in one ink with a second ink offset a couple of pixels; halftone fills in the timer; results as a torn-off ticket or a front page.
- Production: code-authored. Grain and halftone as static CSS/SVG backgrounds, `mix-blend-mode: multiply` for overprint. Cost: low to medium. This is a *finish* that sits well on top of directions 1 and 2.
- Risks: texture over text lowers contrast; halftone moiré at small sizes; the simple CSS halftone is "not very robust" (cited above).
- Phone performance: good if textures are static images or pre-rendered. Animated SVG turbulence is a known problem on iOS (see the performance section).

**4. Paper cut-out / collage / scrapbook**
- Defines it: layered flat shapes with slightly irregular edges, small drop shadows that suggest thickness, paper grain, parallax between layers, things that flip or fold.
- References: Wandersong ([Wikipedia](https://en.wikipedia.org/wiki/Wandersong)); [Tearaway](https://en.wikipedia.org/wiki/Tearaway_(video_game)) (not fetched); [Lumino City](https://en.wikipedia.org/wiki/Lumino_City) (not fetched); Paper Mario (not fetched).
- Why it works: Wandersong's maker chose it partly because one person could manage it (cited above); flipping and folding give natural, cheap motion.
- On a Plor screen: answers as paper slips that drop onto a board; the host as a cut-out silhouette behind a paper podium; taken letters torn off a strip; Fragments' chunk as a tile cut from a magazine (ransom-note letters).
- Production: shapes in code SVG, edges roughened with a displacement filter applied once, shadows in CSS. Cost: medium. Collage with *photographic* scraps needs sourced or generated imagery and rights checks.
- Risks: reads as children's craft if the palette is primary colours; many shadowed layers cost more to paint.
- Phone performance: fair to good. Keep filtered layers static and animate only transforms.

**5. Hand-drawn doodle / notebook**
- Defines it: wobbly strokes, hatched fills, ruled or squared paper, handwriting fonts, a "boil" where lines jitter between two or three variants.
- References: [Rough.js](https://roughjs.com/); Baba Is You (cited above; [official site](https://hempuli.com/baba/) not fetched); [Chicory](https://chicorygame.com) (not fetched); [Excalidraw](https://excalidraw.com), a widely used tool built on a rough-style renderer (not fetched).
- Why it works: the wobble is produced by a library, so an agent gets a consistent "hand" without drawing anything.
- On a Plor screen: the question written on a lined page, answers circled or scribbled out by the host, a hand-drawn fuse or bomb for Fragments, tally marks for score.
- Production: code-authored with Rough.js. Cost: low to medium.
- Risks: a constant wiggle near text annoys some players (Baba Is You request cited above), so the boil belongs on decoration only and must stop under Reduce motion. Handwriting fonts are harder to read at speed; keep the input and the chunk in a clean face.
- Phone performance: good if shapes are generated once and the boil swaps pre-built variants; regenerating rough paths every frame is wasteful.

**6. Game-show set**
- Defines it: a stage. Podium, marquee bulbs, spotlight cones, curtain, big scoreboard digits, buzzers, a host presence.
- References: Jackbox Party Packs (cited above; [jackboxgames.com](https://www.jackboxgames.com)); Family Feud-style boards, which Offbeat's "name something…" questions already echo (not fetched); [Fall Guys](https://www.fallguys.com) for the candy game-show tone (not fetched).
- Why it works: Offbeat already has a host and survey-style questions, so the framing explains the rules without words.
- On a Plor screen: top third is the host's podium and a board of hidden answers that flip open at the reveal; chase lights run round the question card as time shortens; the player types at a contestant's desk at the bottom.
- Production: buildable in code (CSS gradients for spotlights, SVG bulbs, 3D-transform flips). Cost: medium. A *character* host raises it to high; a host shown as a podium, a spotlight, a pair of eyes or a voice in type keeps it in code.
- Risks: slides into casino or slot-machine kitsch; glows and gradients are where "went too far" can recur; fits Offbeat far better than Fragments.
- Phone performance: fair to good. Many blurred glows are the cost; draw bulbs as flat discs with opacity changes.

**7. Retro hardware / toy device UI**
- Defines it: the screen is an object. Chunky physical buttons, segmented or dot-matrix displays, dials, a limited printed colour set.
- References: Balatro (CRT treatment cited above; [Playstack](https://www.playstack.com/games/balatro)); [Teenage Engineering](https://teenage.engineering) product UI (not fetched); [Playdate](https://play.date) (not fetched).
- Why it works: Balatro shows one strong whole-screen treatment can carry an identity without a large art pipeline (analysis cited above).
- On a Plor screen: Fragments as a ticking device with a segmented countdown and a chunk on a dot-matrix display; the keyboard area styled as its keys.
- Production: code-authored CSS/SVG; segmented displays are easy and exact. Cost: medium.
- Risks: skeuomorphic chrome takes space a phone keyboard already takes; scanline or CRT overlays reduce text sharpness; close to the retro mood of the pixel-art attempt that was rejected.
- Phone performance: good without full-screen shaders; a full-screen CRT shader needs WebGL and a fallback.

**8. Generative / procedural per-day art**
- Defines it: each day's puzzle seeds a pattern (the date, the chunk or the question drives colours and geometry), so the art is new daily and identical for everyone.
- References: date-as-seed approach (cited above); [Please, Touch the Artwork](https://unity.com/resources/please-touch-the-artwork); Mini Metro's procedurally grown maps (not fetched for this point).
- Why it works: gives "personal and customised" with no per-day drawing; a daily shareable image comes free; it is pure code.
- On a Plor screen: a quiet pattern behind the play area that reacts to typing, and a full-bleed version on the results card and share image ("today's Offbeat looks like this").
- Production: code-authored canvas or SVG with a seeded random generator. Cost: medium. The work is in tuning rules so every day looks good, which needs the human's eye over many samples.
- Risks: some days come out ugly or low-contrast unless the rules are constrained; easily becomes noise behind text.
- Phone performance: good if drawn once per round to a canvas; continuous full-screen shaders cost battery.

**9. Mascot / sticker / emoji**
- Defines it: one or more characters with thick outlines and a die-cut sticker edge, reacting to play.
- References: Duolingo ([Rive case study](https://rive.app/blog/duolingo-s-ai-powered-video-call-brings-lily-to-life)); [Neko Atsume](https://en.wikipedia.org/wiki/Neko_Atsume) (not fetched); [Pikuniku](https://pikuniku.net) (not fetched).
- Why it works: a face carries emotion faster than any layout; the host could be the mascot.
- Production: needs a designed character and many consistent poses or a rigged vector file. Cost: high. A very simple code-built character (two eyes on a shape, Pikuniku-like) is medium and is the only version an agent can keep consistent.
- Risks: this is exactly the kind of asset where AI generation drifts (see the feasibility section); a weak mascot is worse than none.
- Phone performance: good for SVG or Rive characters.

**10. Claymation / soft 3D look**
- Defines it: rounded, squishy forms with soft shading, fingerprint texture, slightly stepped animation.
- References: Jackbox Party Pack 7 (claymation look, cited above); [Harold Halibut](https://en.wikipedia.org/wiki/Harold_Halibut) (not fetched); Fall Guys (not fetched).
- Production: real clay or 3D renders, or AI images. A CSS approximation (soft inner shadows, squash-and-stretch) gives "soft toy buttons", not clay. Cost: high for the real thing, low to medium for the approximation.
- Risks: nearest to the low-poly 3D village that went too far; heavy shading competes with text.
- Phone performance: fair; many blurred inner shadows are costly to paint.

**11. Watercolour / gouache / painterly**
- Defines it: soft washes, bleeding edges, paper tooth, muted palettes.
- References: [Gris](https://en.wikipedia.org/wiki/Gris) (not fetched); [Old Man's Journey](https://en.wikipedia.org/wiki/Old_Man%27s_Journey) (not fetched).
- Production: painted or AI-generated backgrounds; code can only fake washes with blurred gradients and turbulence. Cost: high.
- Risks: calm and slow in mood, the opposite of a 20-second typing round; variable-tone backgrounds are the worst case for text contrast; hardest to keep consistent.
- Phone performance: fine as static images; poor if faked with live filters.

### Gaps
- No source found describes Puzzmo's actual typography, palette or layout; only the newspaper-page concept is sourced.
- Game UI Database, Interface In Game, ArtStation, Behance, Dribbble, Awwwards and GDC talks were not searched individually. The Jamie Churchman GDC talk on Mini Metro's visual design is referenced by Game Developer but its content was not retrieved.
- No source was retrieved for Monument Valley, Alto's Adventure, Untitled Goose Game, Tearaway, Lumino City, Paper Mario, Chicory, Harold Halibut, Fall Guys, Pikuniku, Gris, Old Man's Journey, Disco Elysium's UI, Kentucky Route Zero or Teenage Engineering; they appear as uncited pointers only.
- "Paperback Paperback" from the brief was not identified.
- Whether Baba Is You's wobble is three hand-drawn frames per sprite was not confirmed by any source found.
- No source gives a cost in hours or money for any direction. All cost levels above are the researcher's relative estimates.

## Which directions read best at phone size around fast typing UI without hurting legibility?

### Takeaway
No source measured this directly. The cited design accounts point one way: styles built from flat fields, strong contrast and information readable at a glance (flat geometric, typographic) are the safe ones, and anything that moves or textures the area under the text is where complaints and performance problems come from.

### Cited Findings
- Mini Metro was designed so state is judged at a glance with no submenus or hidden statistics. — [Game Developer](https://gamedeveloper.com/design/video-behind-the-minimalistic-visual-design-of-i-mini-metro-i-)
- Neobrutalism is defined by high contrast, blocky layouts and thick borders. — [NN/g](https://www.nngroup.com/articles/neobrutalism/)
- Wiggling text in Baba Is You bothers some people enough that players asked for an off switch. — [Steam discussion](https://steamcommunity.com/app/736260/discussions/0/2650805212055291931/?l=greek)
- Animated `feTurbulence` that runs well on desktop was reported as "really sluggish" on iOS, and the poster concluded they would disable it on mobile. — [GreenSock forum](https://greensock.com/forums/topic/33075-gsap-and-feturbulence-mobile-performance/) (one user's report, not a benchmark)
- WebKit cannot use SVG filters in accelerated filters, including `backdrop-filter`. — [WebKit bug 245510](https://bugs.webkit.org/show_bug.cgi?id=245510)
- Firefox has an open report that `feTurbulence` and `feDisplacementMap` do not work in SVG backdrop filters. — [Mozilla bug 1808785](https://bugzilla.mozilla.org/show_bug.cgi?id=1808785)

### Inferences
- Ranking for legibility at phone size, best first (researcher's judgement): 1 type as art; 2 flat geometric; 3 print finish (static grain only); 5 doodle (decoration only); 4 paper cut-out; 8 generative (kept behind a solid text panel); 6 game-show set; 7 retro device; 9 mascot (takes space); 10 clay; 11 watercolour.
- A rule that holds across every direction: with the phone keyboard open, roughly the top half of the screen is all the game has. The style has to live in the question or chunk, the timer and the input, not in a background scene. Scenes belong on the screens with no keyboard: the lobby, the reveal, the results and the share image.
- Text should sit on a solid or near-solid panel in every direction. Texture, halftone and generative pattern go around that panel, not under it.
- "A lot of motion" is safest when it is motion of the meaningful objects (the chunk, the taken letters, the timer) on transform and opacity, and when ambient motion stops under the Reduce motion setting. The Baba Is You request is evidence that constant decorative motion on text is disliked by some players.
- Texture effects should be static images or filters rendered once, never animated SVG filters, on the evidence of the iOS report and the WebKit and Firefox bugs.

### Gaps
- No usability study or benchmark was found comparing these styles for timed typing on phones. The ranking is judgement.
- No measurement exists for Plor's own screens. This would need a prototype tested on a real iPhone and a mid-range Android phone.
- The iOS `feTurbulence` evidence is a single forum report of unknown date; current iOS behaviour is *unverified*.

## Which can an AI coding agent produce reliably in code, and which need an illustrator or careful AI image generation?

### Takeaway
Directions whose "hand" comes from rules or a library (type, flat shapes, print finishes, Rough.js doodles, seeded generative art) are code-producible and stay consistent by construction. Directions that need many matching drawn or painted images run into the documented problem that AI image style drifts without a real production process and human review.

### Cited Findings
- Rough.js gives a consistent sketchy look from options (`roughness`, `bowing`, fill styles) in under 9 kB. — [roughjs.com](https://roughjs.com/)
- Paper texture, grain, halftone and riso looks have published CSS/SVG recipes. — [Codrops](https://tympanus.net/codrops/2019/02/19/svg-filter-effects-creating-texture-with-feturbulence/); [CSS-Tricks](https://css-tricks.com/?p=351302); [Frontend Masters](https://frontendmasters.com/blog/pure-css-halftone-effect-in-3-declarations/); [Jonathan Stephens](https://jonathanstephens.us/play/riso/)
- True halftone with dot size varying by tone "pushes the boundaries" of CSS alone. — [DEV: CSS dotted background](https://dev.to/codingdudecom/css-dotted-background-4m20)
- Date-seeded generation gives the same piece to everyone each day. — [DEV](https://dev.to/knownquantity/generative-algorithm-using-human-interpretation-34dc)
- One test of AI game art concludes a single style prompt is not enough; reliable consistency needs approved reference assets, explicit visual rules, reference-conditioned generation, small review batches and a shared checklist. — [SEELE: Can AI keep game art visually consistent?](https://www.seeles.ai/resources/blogs/ai-game-visual-consistency-across-assets) (a vendor blog)
- A studio-facing review calls style consistency, not image quality, the hardest problem in AI game art. — [Inkration: AI art tools for game studios in 2026](https://inkration.com/ai-art-tools-for-game-studios-in-2026-what-actually-works-for-production/) (a vendor blog)
- Teams that hold a style together often train a style model on their own art; one example used a style LoRA trained on 150 hand-painted images. — [Flowith: how indie studios use custom AI art styles](https://flowith.io/blog/how-indie-game-studios-use-civitai-custom-ai-art-styles) (a vendor blog)
- Duolingo's characters rely on a designed rig of reusable parts in Rive. — [Rive](https://rive.app/blog/duolingo-s-ai-powered-video-call-brings-lily-to-life)

### Inferences
Researcher's sorting of the eleven directions:

| Direction | Mostly code | Needs drawn or generated art | Consistency risk |
|---|---|---|---|
| 1 Type as art | yes | a typeface choice only | very low |
| 2 Flat geometric | yes (abstract); partly (scenes) | scenes | low |
| 3 Print / riso finish | yes | no | low |
| 5 Doodle (Rough.js) | yes | no | low |
| 8 Generative per-day | yes | no | medium: bad days need rules |
| 7 Retro device | yes | no | low |
| 6 Game-show set | yes without a character host | a character host | medium |
| 4 Paper cut-out | shapes yes; photo collage no | collage scraps | medium |
| 9 Mascot / sticker | only a very simple shape character | yes | high |
| 10 Clay | approximation only | yes | high |
| 11 Watercolour | approximation only | yes | high |

- The earlier pixel-art themes and the low-poly village both sit in the "needs generated art" column. The sources' point that AI style holds only with a reference set, written rules and review batches is a plausible reason those attempts were hard to control; this link is the researcher's reading, not something a source says about Plor.
- The cheapest route to "very personal" is a small set of code tokens per game (a typeface, two or three inks, one shape family, one motion signature) rather than a set of images per game.
- If a character is wanted later, the sources suggest the workable form is one human-approved design built as a rig of reusable parts (the Duolingo approach), not a new generated image per pose.

### Gaps
- All three AI-art-consistency sources are vendor blogs; no independent study was found.
- No source tests how reliably a coding agent, as opposed to a human developer, produces each style. The table is judgement based on which styles are rule-driven.
- Rive's and Lottie's cost and fit for a Next.js site were not researched.

## Which directions suit the two specific games?

### Takeaway
No source addresses Offbeat or Fragments, so this section is almost all inference. The closest evidence is Jackbox, where each game takes a look from its own premise (ASCII art for a text game), which supports choosing by each game's fiction: the host and the reveal for Offbeat, the clock and the chunk for Fragments.

### Cited Findings
- Jackbox's Hypnotorious artist chose ASCII art because the game is about text, and drew on fashion for character designs. — [Jackbox blog](https://www-origin.jackboxgames.com/blog/behind-the-scenes-of-pp10-art)
- Jackbox games have taken looks as different as a thick-lined cartoon office and claymation while sharing structure. — [Screen Rant](https://screenrant.com/jackbox-party-pack-8-review/); [TheSixthAxis](https://www.thesixthaxis.com/?p=366973)
- Balatro's psychedelic, screen-wide treatment is tied by one analysis to the game's tension and feedback. — [Blake Crosley](https://blakecrosley.com/guides/design/balatro) (interpretation)

### Inferences
- **Offbeat** (a host, seven "name something…" questions, secret answers, letters taken): strongest fits are 6 game-show set, 4 paper cut-out (a board of answer slips that flip) and 3 print (a survey sheet or quiz-night answer card). Its natural motion beats are the reveal (flip, curtain, spotlight) and the host taking a letter (strike, knock-out, pull away). The mood is social and comic, so warm colours and rounder type suit it.
- **Fragments** (a chunk, a clock, seven rounds): strongest fits are 1 type as art (the chunk is the hero), 7 retro device (a ticking object) and 5 doodle (a cartoon fuse). Its natural motion beats are escalation (pulse rate, shake, colour shift as time runs out) and the snap when a valid word lands. The mood is tense, so high contrast, condensed heavy type and a hotter accent colour suit it.
- A literal bomb is the obvious image for Fragments but ties the look to BombParty; a fuse, a ticking timer, a pressure gauge or simply the chunk itself swelling gives the same tension with its own identity.
- 8 generative suits both as a secondary layer: the day's question or chunk seeds the results card and share image.
- 10 clay and 11 watercolour suit neither game's pace.

### Gaps
- No source was found on visual design for BombParty-style or "don't match" survey games specifically.
- Which mood the owner wants for each game (comic, tense, cosy, loud) is a question for the human, not something research can settle.
- Current app copy and the host's on-screen presentation were not read from the codebase for these notes.

## Which allow a per-game identity that still sits in one brand?

### Takeaway
Jackbox is the sourced model: keep structure and general UI the same across games and let the art differ on purpose, which its artists say makes the games more memorable. Code-authored directions make this cheap, because a game's identity can be a small set of swapped values over one shared layout.

### Cited Findings
- Jackbox: games are consistent in structure and general UI, and the art sets them apart instead of bringing them together, creating contrast and making them more memorable. — [Jackbox blog](https://www-origin.jackboxgames.com/blog/behind-the-scenes-of-pp10-art)
- Jackbox artists meet regularly to show progress and keep in mind the themes other games in the pack are using. — [Jackbox blog](https://www-origin.jackboxgames.com/blog/behind-the-scenes-of-pp10-art)
- A player who has played a few Jackbox games has learned how to play them all. — [Built In Chicago](https://www.builtinchicago.org/articles/jackbox-games-design-party-pack)
- Counter-view: one reviewer found some Party Pack 12 games felt remarkably similar to earlier ones, and another writer notes a feeling of sameness when browsing a large catalogue even though individual games look distinct. — [Gaming Trend: Party Pack 12 review](https://gamingtrend.com/reviews/the-jackbox-party-pack-12-review/); [Jason Shen: The product genius behind Jackbox](https://www.jasonshen.com/2020/the-product-genius-behind-jackbox-games/)
- Puzzmo presents many different puzzles as one printed page. — [Game Developer](https://www.gamedeveloper.com/design/puzzmo-co-creator-zach-gage-on-building-newspaper-games-that-can-last-forever)

### Inferences
- Two workable models, both the researcher's framing:
  - *Jackbox model:* shared shell (navigation, friends, boards, comments, input mechanics) stays plain; each game has its own world inside its play screens. Largest contrast between games, most work per game.
  - *Puzzmo model:* one house style (one paper, one grid, one type system) and each game varies only ink and a motif. Strongest brand, least per-game personality.
- A middle path fits a tiny team: one shared production technique with per-game values. For example a shared print finish (direction 3) with Offbeat as a warm two-ink game-show card and Fragments as a stark two-ink typographic device. The grain, borders and layout are the brand; the inks, typeface, shape family and motion signature are the game.
- Directions that support this well: 1, 2, 3, 5, 8 (each is a rule set, so two games are two settings of the same rules). Directions that support it poorly: 9, 10, 11 (each new game needs a new batch of consistent art) and 6 and 7 used alone (a game-show set or a device is one game's fiction, not a brand).
- The plain social shell already built for the beta can stay as the neutral frame, which limits any restyle to the game screens and so limits how far it can "go too far".

### Gaps
- No source describes how Puzzmo or NYT Games specify per-game identity inside their house style.
- No evidence was found on whether players of daily word games prefer strong per-game worlds or a uniform house style.
- How many games Plor expects to add, which decides whether per-game cost matters, is a question for the human.
