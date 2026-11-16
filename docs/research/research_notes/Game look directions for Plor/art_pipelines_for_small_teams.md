# Art pipelines for a one-person team with AI tools (2025-2026)

Research date: 2026-11-16. Reliability note: many search hits on this topic are vendor marketing or SEO blogs. Where a claim rests on such a source, or on a search snippet I could not open, it is marked *unverified* or *secondary*. Prices in particular conflict between sources and should be re-read on each vendor's own pricing page before any purchase. Midjourney's Terms page returned HTTP 403 to a direct fetch, so its terms are quoted from search snippets of the official page.

## 1. Code-authored art: LLM-written SVG, seeded generative art, CSS/SVG filter recipes, Rough.js, primitive-built emblem systems

### Takeaway
Code-authored art is the only pipeline here that is consistent by construction, free of licence questions, and fully within the coding agent's reach; its limit is that LLM-drawn SVG is reliable for geometric, emblem-level shapes and unreliable for anatomy and complex objects. The texture layer (grain, paper) is a few lines of SVG filter with a `seed` attribute, so a day-seeded look is cheap.

### Cited Findings
- The informal "pelican riding a bicycle" SVG test (Simon Willison) shows steady but non-monotonic improvement in LLM-drawn SVG from late 2024 to mid 2026; poor results still appear from frontier models, and the usual failure points are wheel/handlebar geometry and animal anatomy. Willison himself calls the test not robust. — [Simon Willison's weblog, pelican tag](https://simonwillison.net/tags/pelican-riding-a-bicycle/) (the timeline summary came from a secondary aggregator, *secondary*)
- A controlled study generated 1,008 SVGs across seven frontier models and scored them with an LLM judge; it found no statistically significant sign that labs train specifically for the pelican prompt (no cell cleared p < 0.05), so the improvement appears to be general SVG ability. — [Dylan Castillo, "Are AI labs pelicanmaxxing?"](https://dylancastillo.co/posts/pelicanmaxxing.html)
- Grain recipe: an SVG `feTurbulence` filter (`type='fractalNoise'`, a high `baseFrequency`, `numOctaves` above the default 1 for better-looking noise), embedded as a data-URI background or referenced from a CSS `filter`, so no image file is shipped. — [Frontend Masters, "Grainy Gradients"](https://frontendmasters.com/blog/grainy-gradients/); [freeCodeCamp, "Grainy CSS backgrounds using SVG filters"](https://www.freecodecamp.org/news/grainy-css-backgrounds-using-svg-filters/)
- `feTurbulence` produces coloured RGB noise by default; a monochrome paper/film grain needs an `feColorMatrix` (saturate 0) and usually an overlay blend. Common Paper replaced a raster texture this way and reported a 99% image-size reduction (their headline figure). — [Common Paper engineering blog](https://commonpaper.com/blog/speeding-up-common-paper-reducing-image-size-by-99)
- Tuning levers named in guides: overlay opacity (subtle to strong) and `baseFrequency` (lower = coarser grain, higher = finer). `feTurbulence` takes a `seed` attribute, so the same seed reproduces the same texture. — [freeCodeCamp](https://www.freecodecamp.org/news/grainy-css-backgrounds-using-svg-filters/)
- Rough.js is MIT-licensed, describes itself as a small (<9 kB gzipped) library, and draws sketchy hand-drawn lines, shapes and fills to canvas or SVG. — [roughjs.com](https://roughjs.com/); [npm: roughjs](https://www.npmjs.com/package/roughjs)
- A 2026 format guide argues that not every animation should be Lottie and that format choice should follow the use case (CSS/SVG for simple UI motion, heavier formats only when needed). — [dev.to, "Not everything should be Lottie" (2026)](https://dev.to/louisbuilds/not-everything-should-be-lottie-choosing-the-right-animation-format-in-2026-en1) (*title and gist only; not read in full*)

### Inferences
- The SVG evidence supports the first-round conclusion: keep the identity unit small. An emblem built from circles, arcs, rounded rects and a locked stroke width is inside what an LLM draws reliably; a mascot with limbs, or the "streak flowers" that came out inaccurate from PixelLab, is in the zone where LLM SVG still fails without human iteration.
- Consistency comes from shared parameters, not from the drawing: one stroke width, one corner radius, one roughness value, colours taken only from the five theme tokens. Because Plor already has five colour themes, code-authored art re-themes for free through CSS variables, while any raster set would need five exports or a tint trick.
- A day-seeded generative element (seed = puzzle date) gives "new every day, same family" at zero asset cost and matches the daily format. The agent can write it and write a deterministic test for it (same date, same output).
- The earlier canvas pixel scenes failed on cohesion and frame rate; that is an argument for SVG/CSS (compositor-animated transforms and opacity) over per-frame canvas drawing, not against code-authored art as such. *Unverified for Plor: no measurement was taken in this research.*
- Animated SVG filters (animating `baseFrequency` or `seed` each frame) are known to be expensive on phones; a static grain overlay is the safe form. *Unverified here: one search hit ("svg grain textures performance") points this way but was not read.*

### Gaps
- No sourced list of shipped games or sites whose whole look is code-generated was found in this pass (the query returned only filter recipes). Known candidates the report writer may want checked separately: Excalidraw (uses Rough.js, *unverified in this pass*), and generative daily-art sites. Codrops was not reached.
- No CSS halftone recipe (radial-gradient dot grid plus mask/blend) was sourced; the technique exists but I have no citation.
- No benchmark of LLM SVG quality on emblem/icon tasks specifically (as opposed to pelicans) was found.

## 2. AI image generation for consistent sets: style/character references, style training, vector output, vectorizing, AI animation, and licences

### Takeaway
The tools that hold a style across a set do it with a reusable style object (Recraft style IDs, Midjourney `--sref`/Omni Reference, a trained LoRA on Scenario) rather than with prompts, and even then sources agree that proportions, palette and line weight drift and need a human pass. For Plor, Recraft is the closest fit because it outputs real SVG that can be recoloured with theme tokens; commercial rights on every tool checked require a paid plan, and each has a catch.

### Cited Findings
**Recraft**
- Free-plan images are owned by Recraft, are public in the community gallery, and are not licensed for commercial use. Paid-plan images give the user "full ownership and commercial rights", stay private, and remain owned and private after the subscription ends. Ownership is fixed at generation time, so upgrading does not cover earlier free images. On all plans, outputs may not be used to train AI models. — [Recraft docs: Commercial rights and ownership](https://www.recraft.ai/docs/plans-and-billing/commercial-rights-and-ownership)
- Recraft exposes vector-output models with style control through APIs (listings exist for "Recraft V4 Styles Vector/SVG" models), and the API accepts a reusable `style_id` or reference images from which it makes a private style. — [Replicate: recraft-v4-styles-svg](https://replicate.com/recraft-ai/recraft-v4-styles-svg); [OpenRouter: recraft-v4-styles-vector](https://openrouter.ai/recraft/recraft-v4-styles-vector); style_id detail from [Flowith FAQ](https://flowith.io/blog/recraft-v3-faq-vector-export-formats-style-lock-commercial-license-api) (*secondary*)
- Recraft pricing is reported inconsistently by third parties (cheapest paid tier cited as about $10-12/month by one, Pro as $25 or $45 by others); whether free accounts can export SVG is also disputed. — [eesel.ai pricing review](https://www.eesel.ai/blog/recraft-ai-pricing); [zsky.ai](https://zsky.ai/blog/how-much-does-recraft-cost) (*conflicting, unverified*)
- Recraft markets itself as a route to Lottie (generate or vectorize a vector, then animate elsewhere). A CVPR 2026 paper's supplemental material reports that Recraft produced Lottie files every time but 22.7% failed to render to video, mainly from unsupported expression-driven animation. — [Recraft blog: Lottie AI generator](https://www.recraft.ai/blog/lottie-ai-generator-animations); [OmniLottie, arXiv 2603.02138](https://arxiv.org/abs/2603.02138)

**Midjourney**
- V7 keeps style references (`--sref`) and adds Omni Reference (`--oref`, weight `--ow`) which replaces most `--cref` character-reference use; it takes one reference image per prompt and doubles GPU time. — [Midjourney: V7 released](https://midjourney.substack.com/p/midjourney-v7-released); [CometAPI guide to Omni Reference](https://www.cometapi.com/how-to-use-omni-reference-in-midjourney-v7) (*secondary for the limits*)
- Terms: a company (or its employee) with more than US$1,000,000 gross revenue a year must be on Pro or Mega to own its assets; Stealth Mode (private images) is only on Pro and Mega, so on cheaper plans generations are publicly visible. — [Midjourney Terms of Service](https://docs.midjourney.com/docs/terms-of-service); [Midjourney: Comparing plans](https://docs.midjourney.com/docs/plans) (*from search snippets of the official pages; direct fetch was blocked*)
- Midjourney outputs raster only; no native vector output was found in any source read.

**Scenario (scenario.gg / scenario.com)**
- Built around training custom models (LoRAs) on a team's own reference art to keep style and characters consistent; billed in compute units. — [Scenario pricing](https://scenario.com/pricing); [Scenario help: Pricing and plans](https://help.scenario.com/en/articles/pricing-plans/)
- Third parties disagree on prices and on which tier includes custom training ($15 Starter without training and $30 Pro with it, per one October 2026 review; $19 Creator with two custom models per an older page). Paid plans are reported to carry a commercial licence and the free plan to be evaluation-only. — [Ludo.ai comparison](https://ludo.ai/compare/ludo-vs-scenario) (*competitor page, secondary; unverified*)
- Scenario ships a "Pixel Snapper" tool for cleaning AI pixel art. — [Scenario help: Pixel Snapper](https://help.scenario.com/articles/1753861053-pixel-snapper-the-essentials)

**FLUX and LoRA training**
- The FLUX [dev] weights are under a non-commercial licence (v2.0); the licence says Black Forest Labs claims no ownership of outputs, but restrictions on the model also apply to derivatives, which includes a LoRA trained on it. Community sources disagree on whether dev outputs may be used commercially without a commercial licence. — [BFL: FLUX dev Non-Commercial License](https://bfl.ai/legal/non-commercial-license-terms)

**Vectorizing raster output**
- VTracer is free and MIT-licensed with a CLI and a WebAssembly web build; Potrace is open source (GPL). Vectorizer.AI is a paid proprietary service with inconsistent third-party price reports (about $9.99/month web plan; API credits). — [Wikipedia: Comparison of raster-to-vector conversion software](https://www.wikipedia.org/wiki/Comparison_of_raster_to_vector_conversion_software); [Toolradar: Vectorizer.AI pricing](https://toolradar.com/tools/vectorizer-ai/pricing) (*prices unverified*)

**AI animation tools**
- LottieFiles' Motion Copilot (v2, in Lottie Creator 2.0) turns text prompts into editable keyframes; the suite also lists Prompt to State Machines and Prompt to Vector, and LottieFiles publishes an MCP server that AI assistants such as Claude can connect to. — [LottieFiles: Introducing Motion Copilot 2.0](https://lottiefiles.com/blog/working-with-lottie-animations/introducing-motion-copilot-on-lottie-creator); [LottieFiles docs: Lottie Creator MCP](https://docs.lottiefiles.com/en/creator/13_ai-tools/lottie-creator-mcp)
- Rive: a 2026 guide says Rive added Luau scripting and an AI agent in January 2026 and opened the agent to free users in April 2026; other profiles from early 2026 still say Rive has no AI features. — [rar.design Rive guide](https://rar.design/posts/rive-complete-guide); [rive.app/features](https://rive.app/features) (*conflicting; unverified against Rive's own changelog*)

**How consistency is kept**
- Practitioner write-ups describe the same method: a fixed base model plus one style LoRA (or locked preset), fixed seed, and a written style guide; they also report that proportions, palettes and line weight drift across generations and that animation frames need heavy manual clean-up. — [Wayline: 5 strategies for a consistent indie art style](https://www.wayline.io/blog/5-strategies-consistent-indie-game-art-style); [Relish Games: Generative AI for 2D game art](https://relishgames.com/journal/generative-ai-for-2d-game-art-tools-and-techniques/) (*gist from search summary; secondary*)

### Inferences
- For a five-theme site, native vector output matters more than image quality: an SVG emblem can use `currentColor` and theme variables, while a raster illustration bakes in one palette. That ranks Recraft (native SVG, reusable style) above Midjourney (raster, public by default below Pro) for this team.
- The real consistency control is the reusable style object plus a locked palette applied after generation (quantize/recolour), not prompt wording. A small set made in one sitting from one style ID drifts less than a set extended over months; the smaller the set, the less drift, which again favours the "small identity unit".
- Division of labour: generation and judging "does this match" sit with the human (accounts, taste, paid plans, terms acceptance); the agent can do everything downstream that is deterministic: SVG optimisation, recolouring to tokens, palette quantization, sprite-sheet packing, size budgets as failing checks.
- Self-hosted FLUX dev plus a LoRA is the wrong fit for a commercial site unless a commercial licence is bought; a hosted service that includes the licence (Scenario, Recraft, BFL's API) avoids the question.
- AI animation generators produce a Lottie/Rive file that still needs a runtime library on the page; for a signature motion of a geometric emblem, hand-written CSS/SVG animation by the agent is smaller and has no runtime. *Runtime sizes were not measured or sourced here.*

### Gaps
- Ideogram and Leonardo: no terms or consistency features were verified in this pass (Leonardo's commercial-usage help article exists at intercom.help/leonardo-ai but was not read).
- Midjourney's full terms text and effective date could not be fetched.
- Recraft: current price, whether custom styles and SVG export need a paid plan, and whether style IDs stay stable across model versions (V3 to V4) are unverified.
- No independent, named postmortem of a solo developer who shipped a consistent AI-assisted illustrated set was found; the hits were vendor case studies (Ludo.ai, Lovart, Flowith) that I do not consider reliable.
- No side-by-side quality test of Vectorizer.AI vs VTracer vs Potrace on AI-generated art was found.

## 3. AI pixel art: PixelLab, Retro Diffusion, Aseprite, and the documented clean-up pipeline

### Takeaway
AI "pixel art" is usually fake pixel art (off-grid, blurred cell edges, hundreds of near-identical colours), and the fix is a documented, mostly deterministic pipeline: detect the pseudo-pixel size, align the grid, downscale by dominant colour, quantize to a locked palette, then hand-clean. Several open-source tools implement it, so the agent can run it; the hand-clean step and small sizes (16×16) remain human work.

### Cited Findings
- Problems listed by the author of a clean-up tool: irregular grid, pixels bleeding over cell edges or sitting off-grid, a huge palette of near-identical shades, and muddy results from naive nearest-neighbour downscaling. — [jenissimo, "How to tame your AI pixel art" (dev.to)](https://dev.to/jenissimo/how-to-tame-your-ai-pixel-art-3pk5)
- That pipeline, step by step: (1) scale detection from Sobel edge profiles on the highest-variance tiles, taking the most common peak spacing as the pseudo-pixel size; (2) grid alignment by testing every offset and cropping to a multiple of the scale; (3) palette building by Wu quantization (`image-q`); (4) downscale by dominant colour per block, falling back to a mean when no colour clearly wins (the author's threshold is 5%); (5) optional morphological clean-up before, and a second quantization after. — [same article](https://dev.to/jenissimo/how-to-tame-your-ai-pixel-art-3pk5)
- The author's stated limits: some outputs are too painterly to automate, settings need adjusting per image, hand editing may still be needed, and the tool "won't replace pixel artists". The article calls the tool (Unfaker / unfake.js) open source without naming a licence. — [same article](https://dev.to/jenissimo/how-to-tame-your-ai-pixel-art-3pk5)
- Other implementations of the same idea: `unfake` on PyPI (scale detection, grid snapping, alpha clean-up, fixed-palette option); Sprite Fusion Pixel Snapper (Rust CLI and WASM build, grid detection with manual override, palette remap); perfectPixel (Python); Phaser's "Tidy Pixel Art" web tool; DeAI PixelKit (an Aseprite extension). — [PyPI: unfake](https://pypi.org/project/unfake/); [GitHub: spritefusion-pixel-snapper](https://github.com/Hugo-Dz/spritefusion-pixel-snapper); [GitHub: perfectPixel](https://github.com/harjeb/perfectPixel); [Phaser: Tidy Pixel Art](https://phaser.io/tools/tidy-pixel-art); [itch.io: DeAI PixelKit](https://onlyjasoncando.itch.io/deai-pixelkit) (*licences of each not checked*)
- PixelLab terms (last updated 2025-11-23 per the search summary): the user retains ownership of content created; the user agrees to the Open RAIL-M licence terms; training one's own models on PixelLab outputs is barred without written permission. — [PixelLab Terms of Service](https://www.pixellab.ai/termsofservice) (*read via search snippet; the Open RAIL-M use restrictions were not read*)
- Retro Diffusion: the Aseprite extension is a one-time purchase that runs locally (listed at $65 on itch.io; a third party cites $20-65), with "smart colour reduction" and text-guided palette creation; the developer states the model was trained on licensed assets from Astropulse and consenting pixel artists; the website (retrodiffusion.ai) uses different models from the extension. — [itch.io: Retro Diffusion Extension for Aseprite](https://astropulse.itch.io/retrodiffusion); [Retro Diffusion docs](https://astropulse.gitbook.io/retro-diffusion/aseprite-extension) (*training-data claim is the developer's own*)

### Inferences
- PixelLab being "good at 32×32, poor at 16×16" is consistent with the general finding: at 16×16 every pixel is a design decision, and no source read claims a generator gets that right; those sizes are drawn or fixed by hand, or avoided.
- A locked palette is the strongest cohesion lever for pixel art, and it is deterministic: quantize every asset to one palette file as a build step with a check that fails on any off-palette colour. That is agent work. With five player themes, one option is a palette of indexed slots mapped to theme tokens (palette swap), which pixel art supports naturally. *Design idea, not sourced.*
- This session's PixelLab connector lists tools named `correct_pixelart`, `reduce_colors`, `image_to_pixelart`, `create_image_pro_from_style` and a free `pixelart_workbench` for exact edits, so correction, colour reduction and style-referenced generation exist as callable tools. *Observed from the tool list only; their behaviour and quality were not tested or read in the docs.*
- Retro Diffusion's consent-based training claim is a point in its favour for the disclosure question in section 5, if the owner wants to be able to say where the model's data came from.

### Gaps
- PixelLab's own documentation for its correction and reduce-colours tools was not read; no independent review of their quality was found.
- Commercial-use terms for Retro Diffusion outputs were not confirmed from a licence text (only a competitor's comparison page says "Yes").
- No source measured how much hand-cleaning time remains after the automated pipeline.
- Aseprite's maintainers were reported (old, secondary) as opposed to AI art trained without consent and not involved in third-party AI extensions; current position unverified.

## 4. Pre-rendering 3D to sprites or video

### Takeaway
Rendering a 3D hero object offline and shipping frames is a well-supported way to keep the low-poly look without runtime 3D, but transparency splits the browser world: WebM/VP9 alpha works in Chrome and Firefox, Safari needs HEVC with alpha, and Blender's own WebM alpha export is unreliable, so the practical route is PNG frames then an encode step (or a sprite sheet / animated WebP, which avoid the split).

### Cited Findings
- Chrome has supported alpha in WebM since version 31; the Chrome team's guide exports a PNG sequence with alpha (Blender is one named route) and encodes with ffmpeg. — [Chrome for Developers: Alpha transparency in Chrome video](https://developer.chrome.com/blog/alpha-transparency-in-chrome-video/)
- Safari does not play VP9/WebM transparency; a 2026 guide recommends listing an HEVC-with-alpha `.mov` source first and WebM as the fallback, and its HEVC encode command uses Apple's VideoToolbox (macOS only). — [Rotato: How to use transparent videos on the web in 2026](https://rotato.app/blog/transparent-videos-for-the-web)
- Blender bug reports describe VP9 WebM renders whose alpha channel is missing or not recognised by players. — [Blender issue T80769](https://developer.blender.org/T80769); [Blender issue #85430](https://projects.blender.org/blender/blender/issues/85430)
- Sprite sheets vs transparent video in one vendor's benchmark (a game-UI browser engine, not a phone browser): sprite sheets cost little CPU but more video memory (60 MB in their test) and are capped by maximum texture size; video uses more CPU and CPU memory but has no frame cap. — [Coherent Labs docs: Transparent animation](https://coherent-labs.com/Documentation/cpp-gt/d8/dae/transparent_animation.html) (*single vendor, indicative only*)
- Animated WebP and animated AVIF both support alpha and beat GIF; AVIF compresses better but encodes far slower and has weaker tooling, so guides call animated WebP the pragmatic choice today. — [dev.to: GIF vs WebP vs APNG](https://dev.to/michael_lip_52d5151c3e364/gif-vs-webp-vs-apng-the-animated-image-format-war-nobody-won-4fj); [Compresto: AVIF vs WebP (2026)](https://compresto.app/blog/avif-vs-webp) (*secondary; specific percentages not verified*)

### Inferences
- The 10.8 MB polyfork scene's cost was models plus a 3D runtime. A pre-rendered loop of one small object at phone size is a few dozen frames of a small image; the size depends on frame count, dimensions and format and should be set as a budget in the ticket and measured, not assumed. *No size figure is sourced here.*
- For Plor the encode step that needs a Mac (HEVC alpha via VideoToolbox) is a real constraint: the PC cannot produce the Safari file that way. A sprite sheet stepped with CSS, or an animated WebP, sidesteps the codec split and works the same on iPhone. *The CSS `steps()` technique itself was not sourced in this pass.*
- An opaque render composited on a flat background would avoid alpha entirely, but the background would have to match five themes, so transparency (or five renders) is needed. Flat-shaded renders could also be quantized to theme-slot colours like pixel art.
- Agent vs human: the agent can script a headless three.js or Blender render, pack frames, encode and enforce a size budget; the human judges the look, and supplies or approves the model (the polyfork kits' licence was accepted before and was not re-checked here).
- Pre-rendered frames cannot react to play (no free camera, no physics); that fits an emblem or idle loop, not an interactive scene.

### Gaps
- No case study of a web game shipping pre-rendered 3D sprites with measured sizes was found.
- Animated AVIF support on iOS Safari and its decode cost on phones were not verified.
- Whether a non-Mac encoder can produce Safari-playable HEVC with alpha was not researched.

## 5. Real cases, backlash and disclosure (2024-2026)

### Takeaway
The documented pattern is consistent: players find undisclosed AI-generated assets, the studio apologises and replaces them; the anger is mostly about art that players see and about not being told. Platform rules have moved the same way: Steam's January 2026 rewrite limits disclosure to AI content players consume and explicitly excludes behind-the-scenes tools such as coding assistants.

### Cited Findings
- Gartic Phone (April 2024): a beta AI mode that drew the player's phrase was pulled within hours after artists and streamers objected that it removed the point of a drawing game; coverage found no public statement from the developer, Onrizon. — [PC Gamer](https://www.pcgamer.com/games/puzzle/the-game-thats-all-about-drawing-and-creativity-gartic-phone-adds-and-then-swiftly-removes-an-ai-mode-in-a-straight-up-slap-in-the-face-to-any-and-all-artists); [iTech Post](https://www.itechpost.com/articles/122029/20240422/gartic-phone-removes-ai-mode-amid-artist-backlash.htm)
- Steam (January 2026): Valve rewrote its AI disclosure form to focus on AI-generated content consumed by players, and to say it is not concerned with efficiency tools used behind the scenes, such as coding helpers. — [PC Gamer](https://www.pcgamer.com/software/ai/steam-updates-ai-disclosure-form-to-specify-that-its-focused-on-ai-generated-content-that-is-consumed-by-players-not-efficiency-tools-used-behind-the-scenes/); [Notebookcheck](https://www.notebookcheck.net/Steam-updates-AI-disclosure-form-requiring-developers-to-report-visible-and-in-game-AI-but-not-background-tools.1206103.0.html)
- A claim that Steam tightened labelling again in June 2026, and figures such as "one in five new releases" or "about 7% of the catalogue" carrying AI disclosures, come from weak sources and conflict; treat as unverified. — [remio.ai](https://www.remio.ai/post/indie-game-studios-are-rejecting-steam-s-new-mandatory-ai-metadata-tags) (*unverified*)
- Clair Obscur: Expedition 33 (late 2025): the Indie Game Awards rescinded its Game of the Year and Debut Game awards after generative-AI placeholder textures were found to have shipped, following a statement to the committee that no generative AI was used; the game kept its other awards. — [Recognizing Patterns (Substack analysis)](https://recognizingpatterns.substack.com/p/you-can-pick-up-the-cats) (*secondary; details disputed in comments*)
- Crimson Desert (March 2026): a day after launch players flagged AI-generated art; Pearl Abyss apologised, said the assets were experimental and meant to be replaced, and promised an audit. Player reaction was mixed. — [PC Gamer](https://www.pcgamer.com/games/rpg/crimson-desert-team-apologizes-after-players-find-ai-art-in-the-game-our-intention-has-always-been-for-any-such-assets-to-be-replaced); [Engadget](https://engadget.com/gaming/crimson-desert-developer-apologizes-and-promises-to-replace-ai-generated-art-183716439.html)
- Jurassic World Evolution 3 dropped AI-generated character portraits after community feedback. — [TechRadar](https://www.techradar.com/gaming/jurassic-world-evolution-3-thankfully-wont-feature-ai-generated-character-portraits-following-community-backlash)
- 1666: Amsterdam (August 2026): Panache removed all AI-generated assets from its Early Access build after demo backlash. — [finalboss.io](https://finalboss.io/1666-amsterdam-removes-ai-art-after-demo-backlash-what-players-should-check-next) (*secondary*)
- A solo developer announced in January 2026 that they would delist their Steam game "Hardest" because it relied on AI art. — [finalboss.io](https://finalboss.io/dev-will-delete-steam-game-hardest-over-ai) (*secondary*)
- False accusations also happen: a 2026 article covers a developer wrongly accused of using AI. — [Plagiarism Today (April 2026)](https://www.plagiarismtoday.com/2026/04/07/game-developer-falsely-accused-of-using-ai/) (*headline only; not read*)

### Inferences
- The Gartic Phone case is the closest analogue to Plor (a social game among friends): the objection was to AI replacing the human part of the game. Plor's human part is the typing and the friends; decorative art is less central, but AI-looking illustration on a small friendly site still carries a trust cost that code-drawn geometric art does not.
- Steam's line (player-consumed content vs behind-the-scenes tools) is a useful yardstick even though Plor is not on Steam: SVG and CSS written by a coding agent sits near the "tool" side in spirit, generated illustrations and pixel art sit on the "consumed content" side. *This mapping is my reading; Valve's text speaks of efficiency tools and does not address agent-written art code.*
- Every documented blow-up involved non-disclosure or "placeholder left in". If any generated raster art ships, a short honest line (what was generated, what was cleaned by hand) and no placeholder AI art in the repo are the cheap protections.
- Hand-made-looking code art can still be accused of being AI; keeping the generating code in the public repo is itself evidence of how it was made.

### Gaps
- No verified, named case of a solo developer shipping a polished AI-assisted art set that was well received was found; positive cases in search results were vendor case studies.
- No data on how casual web-game or word-game players (as opposed to Steam and artist communities) react to AI art.
- Primary statements (Indie Game Awards, Sandfall, Valve's Steamworks page) were not read directly.

## 6. Comparison of pipelines for this team (the objective)

### Takeaway
Ranked by consistency per unit of human time, the order is: code-authored SVG/CSS with shared parameters, then a small vector set from one Recraft style recoloured to theme tokens, then pre-rendered 3D frames of one hero object, then AI pixel art through a locked-palette clean-up pipeline, with open-ended AI illustration sets last.

### Cited Findings
- Consistency by reusable style object, with drift still reported: see section 2 ([Wayline](https://www.wayline.io/blog/5-strategies-consistent-indie-game-art-style)).
- Paid plan needed for commercial rights on Recraft: [Recraft docs](https://www.recraft.ai/docs/plans-and-billing/commercial-rights-and-ownership). Midjourney privacy only on Pro/Mega: [Midjourney plans](https://docs.midjourney.com/docs/plans). FLUX dev weights non-commercial: [BFL licence](https://bfl.ai/legal/non-commercial-license-terms). PixelLab user keeps ownership, Open RAIL-M applies: [PixelLab ToS](https://www.pixellab.ai/termsofservice).
- Rough.js MIT, under 9 kB: [roughjs.com](https://roughjs.com/). VTracer MIT, Potrace GPL: [Wikipedia comparison](https://www.wikipedia.org/wiki/Comparison_of_raster_to_vector_conversion_software).
- Pixel clean-up is automatable up to a hand-clean step: [dev.to article](https://dev.to/jenissimo/how-to-tame-your-ai-pixel-art-3pk5).
- Transparent video needs two encodes (WebM and HEVC): [Rotato](https://rotato.app/blog/transparent-videos-for-the-web).

### Inferences
The table is my synthesis of the sections above; cells without a source in those sections are judgement, not fact.

| Pipeline | Consistency | Cost | Licence | Agent can do | Needs the human | Where it fails |
|---|---|---|---|---|---|---|
| Code-authored SVG/CSS emblem system plus seeded generative element | Highest: shared stroke, radius, tokens | No tool cost | Own code; Rough.js MIT if used | Nearly all: draw, animate, theme, test determinism | Approve the shapes and motion | Organic or anatomical subjects; can look plain |
| SVG filter textures (grain, paper) | High: one filter, one seed | None | Own code | All | Approve strength | Animated filters are heavy on phones (*unverified*) |
| Recraft vector set from one style, recoloured to tokens | Medium-high for a small set made in one sitting | Paid plan required (price unverified) | Owned and commercial on paid plan only; no AI training on outputs | Optimise SVG, recolour, enforce palette and size | Account, generation, picking, taste | Drift when extended later; AI-art perception |
| Midjourney `--sref` / Omni Reference, then vectorize | Medium | Paid; privacy only on Pro/Mega | Owned under terms; public by default below Pro | Vectorize (VTracer), clean, quantize | Generation in Midjourney's own UI, picking | Raster only; vectorizing adds noise; five themes need recolour |
| Scenario or other trained LoRA | Medium-high for larger sets | Paid tier with training (price unverified) | Commercial on paid plans (*secondary*) | Post-processing | Needs 10-plus reference images first, which is the missing art | Overkill for a small set; chicken-and-egg on references |
| AI pixel art (PixelLab / Retro Diffusion) plus snap and locked palette | Medium at 32×32 and up; poor at 16×16 | Subscription or one-time purchase | PixelLab: user owns, Open RAIL-M; Retro Diffusion unconfirmed | Grid snap, quantize, palette check, packing; PixelLab tools via connector | Hand-clean, judging accuracy | Small sizes; accuracy of specific subjects (the flowers) |
| Pre-rendered 3D hero object as sprite sheet / animated WebP | High for one object | Free tools; model kit licence | Kit licence (not re-checked) | Script render, pack, encode, size budget | Choose the model and look; HEVC alpha encode needs a Mac | No interactivity; five themes need tinting or five renders |
| Lottie/Rive from AI generators | Medium | Free to paid tiers | Not checked | Integrate the file | Authoring in the vendor's editor | Adds a runtime; Recraft-made Lottie failed to render 22.7% of the time in one study |

- The first-round finding holds up against the tool evidence: every tool's consistency story weakens as the set grows, and every licence has a catch, so the smallest identity unit (hue, emblem, one motion, host voice) built in code is the low-risk base; a generated or pre-rendered hero piece can be layered on later as one asset per game.

### Gaps
- No option above was tested on Plor's actual pages or phones in this research; frame rate, bytes and look are all unmeasured.
- Prices for Recraft, Scenario, Midjourney and Vectorizer.AI are unverified and must come from the vendors' pages (the project rule against invented numbers applies).
