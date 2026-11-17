# Pixel art and low-poly 3D done well, and how each could work for Plor

Researcher's notes, 2026-11-16. How to read them:

- **Cited Findings** carry a link to a page that was searched or fetched in this session. Where a claim came from a search summary and not from reading the page itself, it says "(search summary)".
- **Inferences** are the researcher's own reasoning or background knowledge. They are not sourced and should be treated as *unverified* until checked.
- Every number below is an example quoted from a source. None is a recommendation for Plor; a value for Plor would have to come from a ticket or the human.
- Source quality is uneven. Primary sources found: MDN, the react-three-fiber docs, the three.js docs and forum, Lospec, Game Developer, Adam Robinson-Yu's PlayStation Blog post, Square Enix interviews. Much of the rest is secondary analysis or tool vendors' pages, flagged where used.

---

# Part 1: Pixel art

## 1. What are the hallmarks of high-quality pixel art?

### Takeaway
Good pixel art is a set of visible constraints kept everywhere at once: one pixel size on screen, one small palette, one light direction, one outline rule. Most of what reads as "cheap" is a constraint broken in one place (a sprite at a different scale, a blurred edge, a colour from outside the palette).

### Cited Findings
- **One pixel size on screen.** "Mixels" are pixels of different sizes sharing the same screen; pixel-art glossaries list them as a named fault. — [Pixnote glossary](https://pixnote.net/en/learn/glossary) (search summary)
- **Nearest-neighbour scaling, never smoothing.** The browser's default scaling averages colours and blurs hard edges; `image-rendering: pixelated` switches to nearest-neighbour. — [MDN, Crisp pixel art look](https://developer.mozilla.org/en-US/docs/Games/Techniques/Crisp_pixel_art_look)
- **Whole-number scale factors.** When `devicePixelRatio` is not a whole number (for example Chrome at 110% zoom), some art pixels are drawn larger than others and edges look uneven; MDN says `pixelated` cannot fully fix this and offers no complete workaround. — [MDN, Crisp pixel art look](https://developer.mozilla.org/en-US/docs/Games/Techniques/Crisp_pixel_art_look)
- **Inside a canvas too.** `drawImage()` sizes and `ctx.scale()` must leave each art pixel on a whole number of canvas pixels; MDN's example is a 128x128 canvas shown at 512 CSS px (4x). — [MDN, Crisp pixel art look](https://developer.mozilla.org/en-US/docs/Games/Techniques/Crisp_pixel_art_look)
- **A 16x16 image is shown at 16 x devicePixelRatio device pixels by default; the suggested fix is to jump to the nearest size where every art pixel gets the same whole number of device pixels.** — [greggman, pixel-perfect.js](https://greggman.github.io/pixel-perfect.js) (search summary)
- **Exact device-pixel sizing is possible** with `ResizeObserver`'s `devicePixelContentBox`. — [web.dev, Pixel-perfect rendering with devicePixelContentBox](https://web.dev/device-pixel-content-box/) (title and topic from search; page not read)
- **Outlines are a deliberate, per-sprite choice.** The one-pixel, fully connected line is the most common; it separates objects from the background, which matters most with small palettes. Leave the outline off where an object touches another (feet on ground), or it looks like it is floating. Add inner lines only where contrast is too low to separate parts. — [Lospec, Pixel Art Outlines](https://lospec.com/articles/pixel-art-outlines)
- **Hand-placed anti-aliasing is optional and costs readability.** Anti-aliasing in pixel art means hand-placing in-between colours on jagged edges; the more of it, the less readable the image, and one guide says to skip it at 32x32 or below. — [Pixel Parmesan, Anti-aliasing fundamentals](https://pixelparmesan.com/anti-aliasing-fundamentals-for-pixel-artists), [Sprite-AI fundamentals guide](https://www.sprite-ai.art/guides/pixel-art-fundamentals) (search summaries; the second is a tool vendor)
- **Named beginner faults:** *pillow shading* (shading in rings that follow the outline and ignore the light source), *banding* (adjacent colour strips whose ends line up), unwanted *jaggies*. The fix for pillow shading is to choose one light direction and shade from it. — [Pixnote glossary](https://pixnote.net/en/learn/glossary), [TU Delft paper on pixel-art faults](https://repository.tudelft.nl/file/File_65d43acd-9779-4eab-999b-9bcd4f0a96a9) (search summaries)
- **Palettes need more contrast than painting palettes; look for at least three shades per colour (base, shadow, highlight).** — [prose.sh pixel art guide](https://algieg.prose.sh/The_ONLY_Pixel_Art_Guide_You_N) (search summary; an individual's guide, low authority)
- **Pedro Medeiros (Saint11, Celeste's pixel artist) publishes free one-image tutorials** covering, by filename, outlines, silhouette, sub-pixel animation, easings, squash, 1-bit, UI 9-slice, shine, impact and more. — [saint11.art tutorials](https://saint11.art/blog/pixel-art-tutorials/) (topics read from filenames; the principles inside the images were not readable by the fetch tool)

### Inferences
- *Unverified background knowledge:* shipped pixel games usually fix a small internal resolution and scale the whole frame by a whole number (Celeste is commonly cited at 320x180). For a web page, the equivalent is choosing one "art pixel = N CSS px" value for the whole site and sizing every pixel asset to it.
- *Unverified:* animation in good pixel art is usually few frames with strong key poses (idle loops of roughly 2 to 8 frames) plus squash, anticipation and easing; the Saint11 tutorial filenames (easings, squash, subpixel) point the same way but the content was not read.
- *Unverified:* dithering is a texture choice that suits large static areas and tiny palettes; on phone screens at small scale it tends to read as noise, and it compresses badly in lossy formats, so pixel assets should ship as PNG or lossless WebP.
- Phones are the easy case for whole-number scaling: their `devicePixelRatio` is usually 2 or 3. Desktop with browser zoom or Windows display scaling at 125% or 150% is where uneven pixels appear, and per MDN there is no complete CSS fix.

### Gaps
- Michael Azzi's *Pixel Logic* and the Slynyrd blog were named as sources but were not reached in this session; nothing here is cited to them.
- No authoritative source was found for specific frame counts or for when to dither.
- The Lospec palette list (lospec.com/palette-list) is the usual place to choose a named limited palette; it was not fetched, so no palette is recommended here.

## 2. Which games show pixel art working next to a lot of UI and text, and why do they read as modern?

### Takeaway
The pixel games that feel current pair low-resolution art with high-resolution *behaviour*: smooth motion, shader treatment over the whole screen, strict colour meaning and heavy feedback. Balatro is the closest model for Plor because it is nearly all UI.

### Cited Findings
- **Balatro: sprites drawn in Aseprite in limited palettes, scaled with nearest-neighbour in the LÖVE framework, with the CRT look applied as a GLSL shader over the whole canvas (including chromatic aberration).** — [foro3d, The art of digital CRT: Balatro and the magic of LÖVE](https://foro3d.com/en/2026/mayo/el-arte-del-crt-digital-balatro-y-la-magia-de-love.html) (search summary; secondary, not LocalThunk)
- **A Rust re-implementation of Balatro's renderer describes the CRT pass as: extract bright pixels, blur them for bloom, adjust contrast, add a vignette.** — [dev.to, re-implementing LÖVE in Rust to play Balatro](https://dev.to/4rh1t3ct0r/how-i-reimplemented-love2d-in-rust-to-play-balatro-in-a-terminal-2ag2) (search summary; describes the port)
- **Balatro design analysis:** the CRT is a fiction the whole product keeps (menus, shop, pause screen, logo), not a filter on one screen; cards lift and scale on hover and selection and are in constant small motion; colour is a fixed language (blue chips, red multiplier, gold money); each scoring event stacks card animation, rolling digits, screen shake scaled to the score, particles and rising-pitch audio. — [Blake Crosley, Balatro design guide](https://blakecrosley.com/guides/design/balatro) (secondary; its CSS values and timings are the author's own illustrations, not taken from the game)
- **Balatro's card motion and shaders are distinctive enough that developers rebuild them as an exercise.** — [80.lv, Balatro's card movements and shaders recreated in Unity](https://80.lv/articles/balatro-s-card-movements-shaders-recreated-in-unity) (title from search; page not read)
- **A pixel-perfect 1:1 buffer drawn first, then a CRT shader on top, is the stated key to clean CRT pixel art** (written about a different game). — [Game Developer, CRT simulation in Super Win the Game](https://gamedeveloper.com/programming/crt-simulation-in-super-win-the-game) (search summary)
- **Octopath Traveler (HD-2D):** see Part 3.

### Inferences
- *Unverified background knowledge on the other named references*, offered as viewing pointers, not findings:
  - **Downwell**: three colours on screen at once, with swappable palettes as unlockables. The model for "a theme is a palette swap, not new art".
  - **Celeste**: tiny sprites, strong silhouettes, heavy particles and screen shake, and high-resolution portraits and text boxes over low-resolution play.
  - **Dead Cells**: characters are 3D models rendered down to pixel sprites, which is why animation is so fluid. An early hybrid.
  - **Papers, Please / Return of the Obra Dinn**: the UI *is* the game; severe palette limits carry the mood.
  - **Stardew Valley**: pixel 9-slice panels and a pixel font used for every menu. Charming, but menus are dense and small text is harder to read than a vector font would be.
  - **Unpacking, Eastward, Sea of Stars, Hyper Light Drifter**: high-density, hand-authored pixel art with modern lighting layered on. These show the cost: this level is full-time specialist work.
- What makes Balatro read as modern is mostly not the sprites. It is (a) motion at the display's full frame rate and sub-pixel positions, so sprites glide, tilt and wobble; (b) one shader over everything, so sprites, text and background share a surface; (c) a pixel font drawn large enough to be read easily; (d) colour that always means the same thing. A web word game can do (a), (c) and (d) with CSS alone.
- Plor's earlier themes (a cauldron, fireworks, an "afterglow") were *scene art placed beside* the game. Balatro's art *is* the game's objects (cards, chips, score). For Plor the equivalents are the letter tiles, the timer, the host and the answer field.

### Gaps
- No statement from LocalThunk about the shader or art process was found; every Balatro technical detail above is second-hand.
- GDC talks for Celeste and Eastward art were suggested as sources and were not found in this session.

## 3. How does AI-generated pixel art fail, and how is it corrected?

### Takeaway
Generators produce pictures *of* pixel art: the squares are not on a real grid and the colours are not a real palette. The known fix is a fixed pipeline (find the grid, snap to it, cut to a locked palette, then hand-clean), and it works best on small canvases with one shared palette across every asset.

### Cited Findings
- **Root cause:** diffusion models work in a continuous space with no notion of hard pixels or a fixed palette. — [dev.to, How to tame your AI pixel art](https://dev.to/jenissimo/how-to-tame-your-ai-pixel-art-3pk5)
- **Failure modes named:** "pixels" that do not follow one grid; pixels that bleed into neighbours or blur at edges; a huge number of near-duplicate colours; muddy results from naive nearest-neighbour downscaling. — [dev.to, How to tame your AI pixel art](https://dev.to/jenissimo/how-to-tame-your-ai-pixel-art-3pk5)
- **The same three faults in a vendor's words:** pixels inconsistent in size and position, grid resolution that drifts across the image, colours not tied to a strict palette. — [Scenario, Pixel Snapper: The Essentials](https://help.scenario.com/articles/1753861053-pixel-snapper-the-essentials) (search summary; vendor)
- **Cleanup pipeline, step by step:** (1) detect the pixel scale by edge detection and the most common spacing between edge peaks; (2) find the grid offset and crop so the image divides evenly; (3) quantize colours (the author uses Wu quantization via the `image-q` library), ideally to a shared palette such as one from Lospec so sprites match each other; (4) downscale by letting each block take its dominant colour (the author's threshold: a colour wins if it beats the runner-up by more than 5%); (5) quantize again, because blending creates new colours; (6) hand touch-up in a pixel editor for what remains. — [dev.to, How to tame your AI pixel art](https://dev.to/jenissimo/how-to-tame-your-ai-pixel-art-3pk5)
- **Tools that do the snap step:** Sprite Fusion Pixel Snapper (open source, Rust, with batch and WASM builds), Phaser's Tidy Pixel Art, RepairAI Pixel. — [Phaser, Tidy Pixel Art](https://phaser.io/tools/tidy-pixel-art), [Scenario, Pixel Snapper](https://help.scenario.com/articles/1753861053-pixel-snapper-the-essentials) (search summaries; vendor pages, results not independently verified)
- **Residual errors (stray pixels, inconsistent outlines) still need manual editing after the automatic pass.** — [pixie.haus, fixing and refining assets](https://pixie.haus/resources/fixing-refining-assets-the-built-in-pixel-art-editor) (search summary; vendor)

### Inferences
- The faults that survive the pipeline are the ones a viewer reads as "AI-looking": **style drift between assets** (each generation has its own outline weight, light direction, level of detail and perspective) and **over-detail** (texture and shading noise that a human artist at that size would have simplified to a few clusters). No tool fixes these; the controls are process:
  - Lock **one** palette before generating anything, and quantize every asset to it. Theme variants become palette swaps.
  - Lock **one** canvas size per asset class and one on-screen scale. Small canvases leave less room for noise.
  - Write a one-page style sheet (light from which side, outline rule from section 1, maximum colours per sprite) and reject anything that breaks it.
  - Generate from a reference image of an already-approved asset, not from text alone.
  - Fewer assets: three sprites that match beat twenty that almost match.
- *From this session's tool list, not from the web:* the PixelLab connector available to Plor's agents lists tools named `correct_pixelart`, `reduce_colors`, `create_image_pro_from_style`, `create_ui_asset` and `pixelart_workbench`, and the repo has a `pixel-art` skill described as enforcing a locked palette and "pixelkit checks". These look like the snap, quantize and style-reference steps above. Their behaviour was *not* tested here.
- A mechanical check an agent can run on every asset: count unique colours (must be a subset of the locked palette), and confirm the file's native size equals its intended art-pixel size (no pre-upscaled "fake pixels").

### Gaps
- No independent comparison of the snapping tools was found; all claims about their quality are the vendors' own.
- No source was found that documents style drift or over-detail in AI pixel art with evidence; those points are the researcher's inference from the grid and palette sources.

## 4. Pixel art for UI chrome versus scene art: what should a word game do, and how on the web?

### Takeaway
For a timed typing game, text legibility decides everything: keep the words the player reads and types in a clean vector font, and spend pixel art on a few accent objects (the host, the timer, tiles, rewards) that share one palette and one scale. Motion and colour meaning, not scene illustration, carry the style.

### Cited Findings
- **Canvas content is invisible to screen readers; it needs an `aria-label` or fallback text.** — [MDN, Crisp pixel art look](https://developer.mozilla.org/en-US/docs/Games/Techniques/Crisp_pixel_art_look)
- **CSS recipe for a pixel image:** set width and height to a multiple of the native size and `image-rendering: pixelated`. — [MDN, Crisp pixel art look](https://developer.mozilla.org/en-US/docs/Games/Techniques/Crisp_pixel_art_look)
- **Uneven pixels at fractional `devicePixelRatio` cannot be fully fixed in CSS.** — [MDN, Crisp pixel art look](https://developer.mozilla.org/en-US/docs/Games/Techniques/Crisp_pixel_art_look)
- **Pixel-art UI panels are built as 9-slice pieces** (Saint11 has a tutorial named for it). — [saint11.art tutorials](https://saint11.art/blog/pixel-art-tutorials/) (topic from filename)
- **Balatro's lesson for UI: colour as a fixed language, and feedback stacked on each scoring event.** — [Blake Crosley, Balatro design guide](https://blakecrosley.com/guides/design/balatro) (secondary)

### Inferences
Three levels, from least to most risk. All are the researcher's proposals, *unverified* against Plor's code.

1. **Pixel accents on a clean UI (lowest risk).** Vector text everywhere. One pixel mascot or host sprite, a pixel timer, small pixel icons and reward stamps. All drawn at one native scale, shown at one whole-number multiple, from one palette whose colours are also the UI's CSS colour tokens, so chrome and sprites match exactly.
2. **Pixel chrome.** Add 9-slice panels and buttons through CSS `border-image` with `image-rendering: pixelated`, and a pixel *display* font for headings, scores and the chunk ("cks"), keeping body text and the typing field in a clean font. A pixel font is only crisp at whole-number multiples of its design size; between sizes it blurs or breaks. That constrains responsive type and is the usual reason pixel UIs look wrong on the web.
3. **Full pixel screen with a shader (Balatro's route).** The whole play area on one low-resolution canvas, scaled up, with a CRT or glow pass. This gives the most unity and costs the most: text input, accessibility, selection, the on-screen keyboard and localisation all have to be rebuilt or overlaid. Not a fit for a one-person team unless the game moves to canvas for other reasons.

How this maps to the two games:
- **Offbeat:** the host is the natural hero sprite. "The host takes letters" can be shown as pixel letter tiles that the host sprite removes, with a few frames of animation. The 20-second timer is a pixel object that changes state (candle, fuse), not a scene.
- **Fragments:** the chunk is the hero. A large pixel-font tile for "cks", a fuse or bomb timer, a short burst when a word lands. Everything else stays plain.

Web details:
- Animate sprite sheets with CSS `steps()` on `background-position`; move, tilt and scale the sprite element itself with ordinary smooth transforms. That split (stepped frames, smooth motion) is the Balatro effect at near-zero cost.
- A whole-screen "CRT" on a DOM UI can be approximated with a fixed overlay (scanline gradient, vignette) set to `pointer-events: none`, but it lowers text contrast; it must pass contrast checks and be off under reduced motion or a high-contrast preference.
- Honour `prefers-reduced-motion`: keep state changes, drop wobble, shake and looping idle animation.
- Ship sprites at native size as PNG or lossless WebP; never pre-upscale.

Why the earlier pixel themes probably "went too far" (inference from the brief, not from seeing them): they were full illustrated scenes generated per theme, so each brought its own palette, pixel size and detail level, and competed with the text for attention during a 20-second timer. The corrections above all point the same way: fewer, smaller, matched assets tied to game objects.

### Gaps
- No source was found that tests pixel fonts against vector fonts for reading speed in timed games; the recommendation to keep typed text in a vector font is a design judgement.
- The reverted Plor themes were not inspected, so the diagnosis above is a hypothesis for the owner to confirm or reject.

---

# Part 2: Low-poly and stylized 3D

## 5. What are the hallmarks of high-quality low-poly or stylized 3D?

### Takeaway
The good examples decide the *image* first (a fixed camera, a small palette, a custom lighting model) and build only the geometry that image needs. Low polygon count is a side effect of the art direction, not the style itself.

### Cited Findings
- **Monument Valley: every screen was planned to be good enough to frame and hang on a wall.** Screens were printed and pinned up to review the game as a colour script, and changed on that basis. — [Creative Bloq, The making of Monument Valley](https://creativebloq.com/computer-arts/making-monument-valley-71412213) (search summary)
- **Monument Valley: a fixed isometric camera gave the designers tight control of every composition; Ken Wong described the constraint as removing tools from the artist's toolbox**, and noted isometric art is by nature built from three tones (one per visible face). Each screen had to work as a puzzle, as architecture and as graphic composition. — [Kill Screen, Monument Valley's elegance](https://killscreen.com/monument-valley-elegance), [Creative Bloq, The making of Monument Valley](https://creativebloq.com/computer-arts/making-monument-valley-71412213) (search summaries)
- **A Short Hike: custom "unlit-ish" shaders, a custom lighting ramp, simpler models, colours taken from reference photos (autumn in the Canadian Shield), and the whole camera rendered to a small texture then enlarged with no anti-aliasing.** — [GDC Vault, Crafting a Tiny Open World: A Short Hike Postmortem](https://gdcvault.com/play/1026613/Independent-Games-Summit-Crafting-A), [PlayStation Blog, Crafting a tiny open world](https://blog.playstation.com/2021/08/05/crafting-a-tiny-open-world-a-look-behind-the-scenes-at-the-creation-of-a-short-hike/) (search summaries of the talk's chapter list and the developer's post; neither page was read in full)
- **A Short Hike, the reason:** at low resolution and from far away, assets do not need much detail, which made them feasible for one developer, and low resolution gives an "impressionist effect" where the mind fills in detail. Some players disliked it, so pixel size is a setting. — [PlayStation Blog, Crafting a tiny open world](https://blog.playstation.com/2021/08/05/crafting-a-tiny-open-world-a-look-behind-the-scenes-at-the-creation-of-a-short-hike/) (search summary)
- **Townscaper: an irregular grid (a hexagonal grid relaxed into quads) so buildings wind like real towns; larger shapes are predictable while small details (windows, chimneys, benches) vary by rule; standardised tiles are what give "the handcrafted look".** — [Game Developer, How Townscaper works](https://www.gamedeveloper.com/game-platforms/how-townscaper-works-a-story-four-games-in-the-making)
- **Townscaper motion:** a placed block appears first and its decoration fills in a moment later; birds and butterflies react to nearby geometry. — [Game Developer, How Townscaper works](https://www.gamedeveloper.com/game-platforms/how-townscaper-works-a-story-four-games-in-the-making)
- **Townscaper palette, in Stålberg's words: a rainbow palette plus two greys and white.** — [MCV/Develop, When we made Townscaper](https://mcvuk.com/business-news/when-we-made-townscaper) (search summary; attribution to this page is probable, not confirmed)
- **Stålberg on low-power platforms: flat-shaded styles and simple lighting look good without heavy cost.** — [XR AI Spotlight, How to make procedural generation look good](https://xraispotlight.substack.com/p/how-to-make-procedural-generation) (search summary; attribution probable)
- **Baked lighting stores an offline ray-traced render in textures that WebGL then just displays; it is cheap at run time.** — [Three.js Journey, Creating a scene in Blender](https://www.threejs-journey.com/lessons/creating-a-scene-in-blender) (search summary)

### Inferences
- A checklist distilled from the above (researcher's synthesis):
  1. **Camera first.** Fixed, usually orthographic or a long lens, composed like a poster. A free camera exposes every weak angle.
  2. **Palette on purpose.** A handful of hues, one accent; colours live in one small shared texture or in vertex colours so every object draws from the same set.
  3. **Own the lighting.** Either bake it (soft shadows and ambient occlusion in a texture) or use a custom ramp or toon shader. The engine's default lit material with a default directional light is the single most recognisable "unstyled" look.
  4. **One shading rule.** All flat-faceted, or all smooth with ramps, never a mix.
  5. **Atmosphere.** Fog or a gradient background to merge the scene's edges into the page; a light colour grade.
  6. **Silhouette and restraint.** One focal object, a few supporting shapes, empty space.
  7. **Motion.** Small secondary motion (Townscaper's delayed decoration, ambient creatures) is what makes a static diorama feel alive.

### Gaps
- No Oskar Stålberg source on Townscaper's lighting or ambient occlusion was found.
- The A Short Hike talk itself was not watched; details come from its chapter list and summaries.

## 6. Which references are worth studying?

### Takeaway
The references split into three useful groups for Plor: composed isometric dioramas (Monument Valley, Townscaper, Islanders), flat graphic minimalism (Mini Motorways, Alto, Superhot), and low-resolution 3D (A Short Hike, PS1-style). The second group is closest to a UI-led product.

### Cited Findings
- **Monument Valley**: composition-first isometric; see section 5. — [Creative Bloq](https://creativebloq.com/computer-arts/making-monument-valley-71412213)
- **Townscaper**: rule-driven detail and placement juice; see section 5. — [Game Developer](https://www.gamedeveloper.com/game-platforms/how-townscaper-works-a-story-four-games-in-the-making)
- **A Short Hike**: low-resolution 3D with custom shading; see section 5. — [GDC Vault](https://gdcvault.com/play/1026613/Independent-Games-Summit-Crafting-A)
- **Bruno Simon's portfolio**: the standard three.js example of a playful baked-light diorama; its source is public and an Awwwards case study exists. — [Awwwards, Bruno's portfolio case study](https://www.awwwards.com/brunos-portfolio-case-study.html) (search summary; the case study itself was not read)
- **Baking in Bruno Simon's course packs the scene's lighting into one shared texture.** — [three.js forum, How to bake light with textures](https://discourse.threejs.org/t/how-to-bake-light-with-textures/52076) (search summary; forum commentary)

### Inferences
- *Unverified background knowledge, as viewing pointers:*
  - **Mini Motorways / Mini Metro**: almost no 3D "look" at all: flat colour, soft shadow, perfect spacing. The best model for a UI where the scene and the interface are the same surface.
  - **Alto's Adventure**: silhouettes against gradient skies; time-of-day colour shifts do all the theming with no new assets.
  - **Islanders**: tiny scenes, soft gradients, very few object types.
  - **Superhot**: three colours with fixed meanings (white world, red enemies, black interactables). Colour as a language, like Balatro.
  - **Firewatch**: layered flat colour and fog; shows how much atmosphere colour grading alone provides.
  - **Lil Gator Game, Poly Bridge**: friendly, rounded low-poly with flat colour.
  - **PS1-style**: low resolution, affine texture warping, vertex jitter. A strong flavour that suits horror and nostalgia more than a friendly word game.
- For Plor, the Alto and Mini Motorways lessons transfer best: theme by palette and time of day, not by adding props.

### Gaps
- Bruno Simon's own write-up of his 2025 portfolio (performance, baking) was searched for and not found; only a repository mirror and forum commentary turned up.
- Links to each game's own site were not collected or verified in this session.

## 7. Why do asset-kit dioramas look generic, and what fixes them?

### Takeaway
A scene assembled from free packs inherits each pack's palette, proportions and default material, lit by the engine's default light: viewers have seen that exact combination many times. The fix is to override everything the packs decided (colour, material, light) and to cut the scene down to one hero object.

### Cited Findings
- **Packs that hold together do so through one shared texture:** vendors advertise all assets sharing one unified texture or a single material with a small atlas (one cites 256x256). — [Unity Asset Store, Low Poly Ultimate Pack](https://assetstore.unity.com/packages/3d/props/low-poly-ultimate-pack-54733/reviews), [itch.io, PolyWorks packs](https://offaxisstudios.itch.io/polyworks-town-pack) (search summaries; vendor listings, attribution to the exact listing is probable)
- **Developer comment: a few palettes, each tuned to a mood, work better than one palette meant to cover everything.** — [itch.io community post](https://itch.io/post/15445959) (search summary; a single developer's opinion)
- **Some packs ship a tool to recolour the shared atlas, and buyers credit the included post-processing for much of the look.** — [Unity Asset Store listings](https://marketplace.unity.com/packages/3d/environments/poly-low-poly-ultimate-bundle-238513) (search summary; vendor)
- **The same assets look different under different render pipelines because lighting and material values differ.** — [Unity Asset Store, Stylized Low Poly Cube World](https://marketplace.unity.com/packages/3d/environments/stylized-low-poly-cube-world-building-pack-184562) (search summary; vendor)
- **Townscaper's "handcrafted" feel comes from rules and standardised pieces, not from quantity.** — [Game Developer, How Townscaper works](https://www.gamedeveloper.com/game-platforms/how-townscaper-works-a-story-four-games-in-the-making)

### Inferences
- The search found no authoritative article on why asset-pack scenes look generic; what follows is the researcher's reasoning from the hallmark sources.
- Likely causes in a three.js scene built from free models (as "Midnight Brew" was described): models from different authors with different proportions and bevels; each model's own colours; `MeshStandardMaterial` under a default directional and ambient light; no fog or grade; a camera angle chosen for convenience; many props of equal visual weight; nothing moving.
- Fixes, in order of effect for effort:
  1. **Replace every material with one shared material** and one palette texture (or vertex colours remapped to the palette). This alone removes most of the "kit" look.
  2. **Write the lighting**: bake it in Blender to one texture, or use a toon/ramp material with one key light and a coloured ambient. No default lights.
  3. **Cut props** until there is one hero and two or three supports. For a "brew" theme the cauldron is the scene.
  4. **Fix the camera**: orthographic, one composed angle, framed for a phone's upper third.
  5. **Add atmosphere**: fog matched to the page background so the diorama has no hard edge; a light grade.
  6. **Add one piece of motion tied to play** (steam, a bob, a glow that responds to typing).
  7. **Optionally outline** (inverted-hull or a post pass) for a graphic look; costs performance.
- Free models are best treated as blockout. If the hero object matters, it should be modelled or at least re-proportioned for this product; a hero from a public pack is recognisable.

### Gaps
- polyfork.dev was not examined; nothing here is specific to its models or licences.
- No evidence-backed source on "generic" asset-pack looks was found; treat this section's diagnosis as opinion.

## 8. What are the web specifics, and how would 3D work for a word-game UI?

### Takeaway
On phones a 3D layer has to be cheap when idle and small to download; the react-three-fiber docs give the pattern (render only on change, cap pixel ratio, share materials, compress models). A single hero object that reacts to typing fits that budget and the game; a full diorama above the keyboard fights both.

### Cited Findings
- **Render on demand:** `<Canvas frameloop="demand">` renders only when props change, saving battery; call `invalidate()` for changes React cannot see. — [react-three-fiber docs, Scaling performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance)
- **Share geometries and materials** across meshes; assets loaded through `useLoader` from the same URL are cached and shared. — [react-three-fiber docs, Scaling performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance)
- **Draw calls:** the docs advise staying under about 1,000, ideally a few hundred or fewer, and using instancing for repeats. — [react-three-fiber docs, Scaling performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance)
- **Adaptive quality:** drei's `PerformanceMonitor` measures frame rate and lets the app step `dpr` down or up (the docs' example starts at 1.5 and moves between 1 and 2); `performance.regress()` does nothing unless the app reads `performance.current`. — [react-three-fiber docs, Scaling performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance)
- **Nested `Suspense`** lets a low-quality stand-in show while the real model loads. — [react-three-fiber docs, Scaling performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance)
- **Model compression:** glTF-Transform's `optimize` command compresses geometry with meshopt (its default), Draco or quantization, and textures to KTX2, WebP or AVIF. One guide says Draco files are slightly smaller but decode more slowly and need a larger decoder, and recommends meshopt for most cases; textures usually dominate file size. — [Cinevva, Optimize GLB for web](https://app.cinevva.com/guides/optimize-glb-for-web) (search summary; third-party guide, check against the official glTF-Transform docs)
- **Loaders:** Draco needs `DRACOLoader` with a decoder path, KTX2 needs `KTX2Loader` with a transcoder path, meshopt needs `MeshoptDecoder`; drei's `useGLTF` handles Draco and meshopt. — [jvinhit, glTF compression: Draco, meshopt, KTX2](https://jvinhit.github.io/blog/threejs-16-gltf-compression-draco-meshopt-ktx2/) (search summary; third-party)
- **Baked lighting is light to render** because the lighting is a texture. — [Three.js Journey, Creating a scene in Blender](https://www.threejs-journey.com/lessons/creating-a-scene-in-blender) (search summary)

### Inferences
- **Hero object, not a scene.** One object in a transparent canvas that sits in the layout like an image: Offbeat's host or cauldron, Fragments' bomb. It idles still (zero frames rendered under `frameloop="demand"`), and each keystroke, correct answer or timer threshold calls `invalidate()` and plays a short spring. That is "juice" tied to input, costs almost nothing between events, and leaves the text UI as ordinary DOM.
- **Layout on phones.** The on-screen keyboard takes roughly half the screen while typing, so a diorama "on top with typing below" is competing for the remaining half with the question, the timer and the input. A hero object can be small; a village cannot. This is a likely reason the full scene felt like too much (hypothesis; the reverted build was not inspected).
- **Load.** three.js plus react-three-fiber is a large script for a page whose core is text. Load the 3D layer with `next/dynamic` and `ssr: false`, after the game is interactive, with a static image of the same object as the placeholder so layout does not shift and the game is playable before 3D arrives. With flat colours from one small palette texture, texture compression (KTX2) is unnecessary; meshopt on geometry is enough.
- **Lighting.** With one object and no moving lights, bake lighting and ambient occlusion into the texture or vertex colours and use an unlit material: no lights and no shadow maps at run time.
- **Pixel ratio.** Cap `dpr`; phone screens at 3x triple-square the pixel work for little visible gain on flat-shaded shapes.
- **Reduced motion.** Under `prefers-reduced-motion`, render one still frame and skip springs; with on-demand rendering that is a single branch.
- **Fallbacks.** WebGL context loss and low-end devices: the static image placeholder is also the fallback, so the game never depends on 3D. Pause rendering when the tab is hidden.
- **Cheaper alternative with the same look.** Pre-render the hero object in Blender to a short sprite sheet or a few stills (idle, react, win, lose) and play them as images. This gets baked lighting quality with no three.js at all, at the cost of fixed angles. For a UI-led game this may be the better trade and is worth prototyping first.

### Gaps
- No measured numbers were found for three.js bundle size, phone frame rates or battery cost in a comparable page; anything quantitative would need to be measured on Plor's own target phones.
- The official glTF-Transform documentation was not read; compression claims come from third-party guides.
- Next.js-specific loading behaviour was not checked against the bundled Next.js docs that Plor's `AGENTS.md` requires reading before any implementation.

---

# Part 3: Hybrids

## 9. What hybrid approaches exist, and which suit Plor?

### Takeaway
Hybrids work when one layer clearly leads and post-processing or a shared palette binds the layers together. For a text-first web game the lowest-risk hybrid is a clean vector UI with a few pixel (or pre-rendered 3D) accent objects sharing the UI's palette.

### Cited Findings
- **HD-2D (Octopath Traveler):** 2D pixel sprites and billboards in fully 3D environments, with dynamic lighting, depth of field and tilt-shift. — [Wikipedia, HD-2D](https://en.wikipedia.org/wiki/HD-2D) (search summary)
- **Putting pixel characters on a 3D background technically works by itself but does not produce the look; it took the team a long time to tune.** Early versions lacked depth; another attempt pushed resolution and saturation too far and lost the appeal of pixel art. — [Siliconera, Project Octopath Traveler developers on HD-2D](https://www.siliconera.com/project-octopath-traveler-developers-answer-project-started-troubles-developing-hd-2d/) (search summary)
- **In the sequel, flat sprites read as "sheets of paper" once the camera moves, which limited how far the camera could rotate.** — [Unreal Engine, Octopath Traveler II developer interview](https://www.unrealengine.com/developer-interviews/octopath-traveler-ii-builds-a-bigger-bolder-world-in-its-stunning-hd-2d-style) (search summary)
- **Pixelated 3D in three.js:** `RenderPixelatedPass(pixelSize, scene, camera)` is a built-in post-processing pass (the docs' example uses a pixel size of 6); a TSL `PixelationPassNode` exists for the WebGPU renderer. — [three.js docs, RenderPixelatedPass](https://threejs.org/docs/pages/RenderPixelatedPass.html)
- **Known problems with the official pixelation example:** objects are rendered twice (depth and beauty), and the object's contour is not itself pixelated. — [three.js forum, Pixelation postprocessing issues](https://discourse.threejs.org/t/pixelation-postprocessing-issues-render-order-and-official-example/86498) (search summary)
- **Simple alternative:** render the 3D canvas at low resolution and enlarge it with CSS `image-rendering: pixelated`. This is the same idea as A Short Hike's downscaled render texture. — [Stack Overflow mirror, Rendering with pixelated effect in three.js](https://kaweah.freedombox.rocks/kiwix/stackoverflow.com_en_all_2023-11/questions/50776193/rendering-with-pixelated-effect-in-three-js), [PlayStation Blog, A Short Hike](https://blog.playstation.com/2021/08/05/crafting-a-tiny-open-world-a-look-behind-the-scenes-at-the-creation-of-a-short-hike/) (search summaries)
- **Dead Cells-style pipeline (3D rendered to sprites)** — no source fetched; see Inferences.

### Inferences
- **Ranked for Plor (researcher's judgement):**
  1. **Clean UI + pixel accents.** Lowest cost, most forgiving, works with AI-assisted assets if the palette and scale are locked (sections 3 and 4).
  2. **Clean UI + one pixelated 3D hero.** A small low-resolution 3D canvas enlarged with `image-rendering: pixelated`. The low resolution hides modelling weaknesses (A Short Hike's stated reason), makes the canvas cheap on phones, and lets a 3D object sit next to pixel icons without a style clash. A moving object "crawls" at low resolution unless motion is snapped or kept slow.
  3. **Pre-rendered 3D as sprites.** Model once, render stills or a sprite sheet with baked lighting, optionally snap to the pixel palette. No run-time 3D. *Unverified background:* this is how Dead Cells produced its animation.
  4. **HD-2D proper.** Needs a full 3D environment, tuned depth of field and lighting, and hand-made sprites; Square Enix's team struggled to tune it. Not a fit for a one-person web word game.
- **The binding rule for any hybrid:** one palette shared by CSS tokens, sprites and 3D materials; one "pixel size" if anything is pixelated; one light direction; and text always in the clean layer.
- **A staged way back in**, if the owner revisits either look: start with a single accent object on the plain UI, judge it on a phone with the keyboard open, and add a second element only if the first clearly helps. Both reverted attempts appear to have started at the full-scene end.

### Gaps
- No source was found on the t3ssel8r-style pixelated-3D technique (outlines at pixel resolution, snapped camera) beyond the three.js pass and forum thread.
- No examples were found of shipped web word games using either look well; the application guidance throughout is reasoning from games in other genres.
