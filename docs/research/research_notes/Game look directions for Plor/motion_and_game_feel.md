# Motion design, "juice" and game feel for a UI-heavy web word game (Plor)

Researched 2026-11-16. Everything under "Cited Findings" has a source link. Anything from the researcher's memory with no source found is under "Gaps" and marked *unverified*. Several sources are third-party analyses, not developer statements; those are flagged inline.

## 1. Game-feel principles: which apply to typing, timers, right/wrong answers, reveals and score count-ups?

### Takeaway
The canonical "juice" sources all say the same thing: take a game that already works and layer on easing, squash/wobble, particles, short pauses, shake and bassy sound so that every player input gets a visible and audible answer. They also all warn that it is a seasoning: it has to reinforce the core action and be proportional to how much the event matters. For a typing game this means the keypress, the submit, the verdict and the score are the four places to spend motion; everything else should stay quiet.

### Cited Findings
- "Juice It or Lose It" was given by Martin Jonasson and Petri Purho (Kloonigames) at GDC Europe 2012, Independent Games Summit. The recording is on GDC Vault. — [GDC Vault](https://gdcvault.com/play/1016487/Juice-It-or-Lose)
- Jonasson's working definition of juice: things that wobble, squirt, bounce and make cute noises; the talk's thesis was that the juicier a game is, the more fun it is to play. The demo was a plain block-breaking game with effects added one at a time. — [Game Developer write-up](https://gamedeveloper.com/design/video-is-your-game-juicy-enough-)
- A counter-talk exists on GDC Vault titled "Don't Juice It or Lose It" (title only verified; content not read). — [GDC Vault](https://gdcvault.com/play/1020861/Don-t-Juice-It-or)
- Jan Willem Nijman (Vlambeer), "The Art of Screenshake", 2013: starts from a dull side-scrolling shooter and applies 30 small tweaks, each of which makes it feel a bit better. — [Game Developer](https://gamedeveloper.com/design/vlambeer-co-founder-shares-advice-on-building-better-action-games)
- A partial list of Nijman's tricks from a university handout: basic animation and sound, lower enemy HP, more of everything, bigger explosions, permanence (smoke/debris that lingers), slow motion, and a game-over screen for meaning; Nijman is quoted as saying to fill the game with love and tiny details. — [Univ. Bayreuth lecture PDF](https://medienwissenschaft.uni-bayreuth.de/wp-content/uploads/GxD-10-Game-Feel.pdf)
- Developers discussing the 30 tricks noted there is a point where it becomes too much and distracts. — [Make Games SA thread](https://makegamessa.com/discussion/comment/16542)
- A Game Developer article defines juice as layers of animation and audio added to a game that already works, and lists the toolkit: tweening with easing (linear motion looks unnatural; UI that appears should usually ease out), particles, hit-stop (a brief pause on impact), trails, procedural motion (sine bobbing, pulsing scale/opacity), bass-rich compressed sound effects that confirm each action, and quiet ambient loops. — [Game Developer, "Squeezing more juice out of your game design"](https://gamedeveloper.com/design/squeezing-more-juice-out-of-your-game-design-)
- The same article's cautions: juice must reinforce the core mechanic and match the game's pace; it cannot rescue weak fundamentals; and, quoted, "Used in excess, juicing techniques will both waste your time and annoy your users." — [Game Developer](https://gamedeveloper.com/design/squeezing-more-juice-out-of-your-game-design-)
- A word-game developer (Gram Jam, Svelte) built per-tile motion on springs and published the numbers he settled on: word tiles staggered 25 ms per letter index, a 200 ms default flip, a grid-reveal stagger based on row + column so it sweeps diagonally, a move duration of sqrt(distance) x 30 ms, and an 80 ms buffer between queued animations. — [Cole Chamberlin, "Spring Physics in my Word Game?"](https://colechamberlin.substack.com/p/spring-physics-in-my-word-game)
- The same write-up's structural lessons: queue animations and have game logic await a promise that resolves when they settle, so sequences never overlap; a spring's duration cannot be read from its parameters, it has to be simulated; delay entering tiles until exiting ones have left; share one transform-origin when scaling a row of tiles so spacing holds. — [Cole Chamberlin](https://colechamberlin.substack.com/p/spring-physics-in-my-word-game)

### Inferences
Mapping the principles onto Plor's moments (these are the researcher's inferences from the sources above, not sourced values; any durations would have to come from the ticket or the human):
- **Each keystroke (typing):** the smallest, fastest response in the game. A just-typed glyph can pop in with a tiny overshoot (squash and stretch), plus an optional key sound. It must never delay or obscure the next keypress: no hit-stop, no shake, nothing that moves the input line.
- **Submit (Enter):** this is the "impact". Anticipation is the player's own keypress; the response is a stamp/slam on the word, the one place a few milliseconds of hit-stop and a low thud belong.
- **Correct / wrong:** proportional feedback. Wrong = short horizontal shake of the answer only (shake as a data channel, not the whole screen). Correct = pop, colour flood, small particle burst. Bigger for a streak or a risky answer.
- **The host "takes" letters (Offbeat) / the chunk (Fragments):** letters are the natural actors: taken letters can be plucked, struck or dropped out of the alphabet; the chunk can slam in at the start of a round. These are reveal moments between inputs, so they can be the most theatrical.
- **Timer:** continuous, calm procedural motion that escalates late (pulse rate, weight, colour), never a jump. It is read peripherally, so it should not compete with the input line.
- **Reveals (host's secret answers):** staggered, one at a time, left-to-right or top-down, with a rising sound. Staggering both builds tension and teaches causality.
- **Score count-up:** rolling digits with easing and ticking sound, then a settle with overshoot; flourish scaled to the size of the result.
- **End-of-game / share card:** the one place for a long (1 s or more) celebration, because no clock is running.
- The Gram Jam "queue and await" pattern is directly relevant: verdict, reveal and score are a sequence, and game state should wait on the animation promise only where the design wants it to (and skip instantly under Reduce motion).

### Gaps
- Steve Swink's *Game Feel* was not sourced in this pass. *Unverified, from memory:* Swink frames game feel as real-time control + simulated space + polish, and stresses that response needs to land within roughly 100 ms of input to feel instantaneous. Check the book before citing.
- The full, numbered list of the 30 "Art of Screenshake" tricks and the exact effect list from "Juice it or lose it" were not retrieved (the talk videos could not be read). The DK Liao itch.io recreation devlog has a per-effect breakdown: https://dkliao.itch.io/the-art-of-screenshake-recreation/devlog/451576/quick-breakdown-of-all-the-effects (not read).
- Disney's 12 principles (squash and stretch, anticipation, follow-through) were not sourced to a primary reference here.
- No source was found that measures whether juice improves retention or performance in typing or word games specifically.

## 2. Shipped examples of great UI juice

### Takeaway
The best-documented example for Plor's situation is Balatro: a game that is nearly all UI, where the scoring sequence itself is the spectacle and the designer refused a score preview to protect it. Duolingo shows the other route: designer-authored Rive characters driven by state machines, which needs dedicated animation staff. Wordle shows that a single well-chosen motion (the staggered flip) can carry a whole daily game. Persona 5 shows both the appeal and the readability cost of loud kinetic UI.

### Cited Findings
**Balatro**
- LocalThunk has said the feature they are most proud of is the flame effect that appears when a hand beats the required score, built in one very productive night. — [GamesRadar](https://gamesradar.com/games/roguelike/after-winning-big-at-the-game-awards-and-taking-hours-of-our-time-in-2024-balatro-creator-reveals-their-most-productive-night-resulted-in-one-of-the-games-most-satisfying-features)
- LocalThunk declined to add a score preview; per Game Maker's Toolkit, this deliberately keeps the tension and the "Rube Goldberg machine" spectacle of the scoring phase (at the cost of some players reaching for outside calculators). — [GMTK, "Balatro's 'Cursed' Design Problem"](https://gmtk.substack.com/p/balatros-cursed-design-problem)
- Third-party design breakdown (interpretation, not developer statements; its pixel and millisecond values appear to be the author's own estimates or recreation values): scoring runs step by step, base hand then each Joker left to right with a bounce or pulse, then the total flies to the counter; score digits roll like reels with overshoot and a per-digit stagger; each scored card plays a rising pitch; shake scales with the size of the score in tiers; background colour pulses toward the played hand's colour; always-on scanlines and vignette; consistent colour per quantity (chips blue, mult red, money gold). — [Blake Crosley, Balatro design guide](https://blakecrosley.com/guides/design/balatro)
- The same guide's lessons for UI designers: "Feedback is the product, not the polish"; make feedback proportional to significance; show causality step by step so the system teaches itself; use shake as a data channel (subtle shake on errors); roll numbers to their targets; keep colour coding per data type consistent; pick an aesthetic your constraints allow and apply it completely. — [Blake Crosley](https://blakecrosley.com/guides/design/balatro)

**Duolingo**
- Duolingo drives character mouths with Rive state machines: viseme (mouth-shape) inputs plus timing data trigger animation states in sync with speech audio. — [Duolingo blog, visemes](https://blog.duolingo.com/world-character-visemes)
- Duolingo's workflow has animators build timelines in Rive while "creative technologists" build the state-machine logic so engineers get an optimal setup. That is a specialised role sitting between design and engineering. — [Rive blog, creative technologists](https://rive.app/blog/creative-technologists-duolingo-s-solution-to-the-designer-to-developer-handoff)
- Rive says the state machine for Duolingo's Lily video call drives mouth positions, expressions and camera moves, and cuts file size by blending transitions at runtime instead of shipping pre-animated sequences. (Vendor source.) — [Rive blog, Lily](https://rive.app/blog/duolingo-s-ai-powered-video-call-brings-lily-to-life)
- Duolingo's streak-milestone animation went through multiple rough passes to tune rhythm and energy. — [Duolingo blog, streak milestone](https://blog.duolingo.com/streak-milestone-design-animation)

**Wordle**
- A design critique notes Wordle has essentially no animation beyond the flip reveal. — [Pratt IXD critique](https://ixd.prattsi.org/2025/09/design-critique-wordle-website/)
- Clone tutorials reproduce the reveal as a per-letter cascading flip with the tile's colour swapped at the midpoint, when the tile is edge-on; one uses a 0.1 s per-letter delay. These are the tutorial authors' values, not NYT's. — [Kodeco SwiftUI tutorial](https://kodeco.com/31881532-how-to-make-a-game-like-wordle-in-swiftui-part-two?page=1)

**Persona 5**
- Atlus described (CEDEC + KYUSHU 2017) keeping to the signature red instead of adding sub-colours and using strong central lines to guide the eye. — [Siliconera, citing Famitsu](https://www.siliconera.com/?p=668266)
- The UI lead drew typographic inspiration from ransom-note-style punk album covers. — [The Star](https://www.thestar.com.my/tech/tech-news/2024/10/20/exuberant-video-game-menus-designed-with-da-vinci-in-mind)
- The angular black/red/white text was hard to read at first and needed heavy iteration; the director has called these menus very laborious to make. — [Kotaku](https://kotaku.com/-metaphor-refantazio-persona-5-menu-ui-hashino-1851667088)

**Monkeytype**
- Typing feel is delivered by a few small, optional things: a "smooth caret" that glides between letters, a choice of click sounds, and a separate error sound; one sound set is a pentatonic scale chosen so it sounds pleasant whatever keys are hit at whatever speed. All of them are user settings and can be turned off. (Details from third-party docs mirror and release notes; exact option counts conflict between sources.) — [Monkeytype docs mirror](https://www.mintlify.com/monkeytypegame/monkeytype/features); [Monkeytype releases](https://www.github.com/monkeytypegame/monkeytype/releases?page=16)

**Gram Jam (small web word game, solo developer)**
- A solo-built Svelte word game got its feel from spring-driven tile moves, staggered flips and an animation queue, with no art assets involved. — [Cole Chamberlin](https://colechamberlin.substack.com/p/spring-physics-in-my-word-game)

### Inferences
- **Why Balatro works despite pixel art, and why it is the closest model for Plor:** the pixel art is static dressing; the feel comes from motion, sequencing, sound pitch and proportional escalation applied to plain numbers and cards. None of that depends on the art style, so it transfers to a plain typographic look. The owner's rejected pixel-art and low-poly looks changed the *rendering*; Balatro's lesson is to change the *behaviour*.
- Balatro's "no preview, watch it count" maps closely onto Offbeat's reveal of the host's secret answers and both games' final scoring: sequence the reveal, let pitch and tempo rise, and scale the finish to the result.
- Duolingo's approach presumes animators and creative technologists. For a one-human team with AI agents, a mascot/character pipeline is the expensive route; Wordle, Monkeytype and Gram Jam show the cheap route (code-authored motion on text and tiles).
- Persona 5 is evidence that "stylized, lots of motion" UI can hurt legibility and costs a lot of iteration; under a 20-second clock, legibility of the question and the input wins.
- Monkeytype's pentatonic trick is a cheap way to make key sounds musical without composing anything.

### Gaps
- Not sourced in this pass (no reliable source fetched; statements below are *unverified, from memory*): Peggle (end-of-level slow-motion zoom, "Ode to Joy", rising pitch per peg hit), Vampire Survivors (level-up/chest-opening fanfare modelled on slot machines), Slay the Spire, Hades UI, Tetris Effect (music and particles synced to inputs), Alphabear, Typing of the Dead, Nitro Type, Letterpress (tile physics and sound by Loren Brichter). Treat these as leads to look at, not findings.
- No first-hand LocalThunk statement about the CRT shader, card wobble or sound design was found; the specifics above are third-party analysis.
- NYT has not published Wordle's animation timings; the live CSS would have to be inspected.
- No Duolingo post specifically on haptics or lesson-complete sound was found.

## 3. Kinetic typography: letters as the hero

### Takeaway
Animating individual glyphs on the web is a well-trodden technique (split text into per-character spans, stagger by index) and variable fonts make weight and width animatable. The cost is that variable-axis animation repaints text on the CPU, so it should be limited to a handful of characters at a time on phones.

### Cited Findings
- `font-variation-settings` is animatable in CSS: any axis of a variable font can be animated by its four-letter tag within its range. — [Val Head, "Animating variable fonts with CSS"](https://valhead.com/2020/11/15/animating-variable-fonts-with-css/)
- Animating variation settings cannot be hardware accelerated and causes repaints (stated in 2020; may have changed). — [Val Head](https://valhead.com/2020/11/15/animating-variable-fonts-with-css/)
- A variable font file tends to be larger than a single static font, so it is worth it only when several variations are used. — [24 ways, "Interactivity and Animation with Variable Fonts"](https://24ways.org/2019/interactivity-and-animation-with-variable-fonts/)
- Per-letter technique: split text into character spans and stagger `animation-delay` through a CSS custom index variable; animate the `wght` axis rather than `font-weight`; per-character variable-font animation is CPU-heavy on mobile, so limit how many characters animate. (Developer guide, not a benchmark.) — [camoa dev guide, variable font animation](https://camoa.github.io/dev-guides/css/css-craft/variable-font-animation/)
- GSAP's SplitText (splits text into characters/words/lines for animation) was a paid Club plugin and is now free for commercial use. — [GSAP standard license page](https://gsap.com/community/standard-license/)
- In a shipped word game, per-letter stagger (25 ms x index) and position-based stagger for grids were enough to make motion read as a sweep. — [Cole Chamberlin](https://colechamberlin.substack.com/p/spring-physics-in-my-word-game)
- Persona 5's ransom-note typography shows letters themselves carrying the style, at a known readability cost. — [The Star](https://www.thestar.com.my/tech/tech-news/2024/10/20/exuberant-video-game-menus-designed-with-da-vinci-in-mind); [Kotaku](https://kotaku.com/-metaphor-refantazio-persona-5-menu-ui-hashino-1851667088)

### Inferences
Ideas specific to Plor (inferences, to be designed with the human):
- **Time pressure as type:** the timer or the prompt slowly gains weight or narrows in width as the clock runs down (one element, so the repaint cost is small). Transform-based alternatives (scale, skew, letter-spacing avoided) are cheaper than axis animation.
- **Taken letters (Offbeat):** struck through, plucked upward, shattered or greyed with a stamp; if the player types a taken letter, that glyph alone shakes or cracks.
- **The chunk (Fragments):** "cks" slams in large, then docks; when the player's word contains it, the chunk inside the typed word lights up or locks in as it is typed. This is feedback that also helps play.
- **Typed answer:** each glyph pops in; on submit the word is stamped (scale down with overshoot plus a thud); on a wrong answer the letters fall or scatter.
- **Accessibility detail:** when splitting a word into spans, keep the real word available to screen readers (for example an `aria-label` on the wrapper and `aria-hidden` on the spans). *Unverified here; a standard practice that should be checked against the SplitText docs, which is said to handle this.*
- Transform and opacity animations on spans are compositor-friendly; variable-axis, colour-flood and filter animations are not. Use the latter for single hero elements only.

### Gaps
- No current (2025/2026) benchmark of `font-variation-settings` animation cost on phones was found.
- No shipped word game using variable-font axes as a time-pressure signal was found; this idea is untested.
- Whether Plor's current font is variable, and what axes it has, was not checked (outside this research's scope).

## 4. Web tech comparison

### Takeaway
For a mostly-text React game built by coding agents, code-authored motion on the DOM is the fit: CSS and the View Transitions API for the basics, plus one JS animation library (Motion or GSAP, both now free) for sequencing, springs and per-letter work. Rive and Lottie need a designer-authored file and add a WASM runtime of roughly 150 to 650 KB compressed; PixiJS/WebGL/three.js move text off the DOM, which costs accessibility and is the direction that already "went too far".

### Cited Findings
**CSS and View Transitions**
- Same-document view transitions (`document.startViewTransition`, `view-transition-name`) became Baseline Newly available in October 2025 when Firefox 144 shipped them. — [web.dev](https://web.dev/blog/same-document-view-transitions-are-now-baseline-newly-available)
- Cross-document view transitions: Chrome/Edge since 126, Safari since 18.2; Firefox only partial from 144 onward. — [Chrome docs](https://developer.chrome.com/docs/web-platform/view-transitions); [caniuse](https://caniuse.com/cross-document-view-transitions)
- CSS keyframe animations can be hardware-accelerated and run off the main thread. — [Cole Chamberlin](https://colechamberlin.substack.com/p/spring-physics-in-my-word-game)

**Motion (formerly Framer Motion)**
- The full `motion` component is about 34 KB; with `m` + `LazyMotion` the initial cost can drop to under 5 KB, with feature bundles (`domAnimation`, `domMax`) loaded synchronously or lazily. — [Motion docs, reduce bundle size](https://motion.dev/motion/guide-reduce-bundle-size/); [Motion docs, LazyMotion](https://motion.dev/motion/lazy-motion/)
- Sizes for the "mini" `animate`/`useAnimate` (about 2.3 to 3.8 KB) come from third-party guides only; the search summary could not confirm them against official docs. — [pkgpulse comparison](https://www.pkgpulse.com/guides/framer-motion-vs-motion-one-vs-autoanimate-2026)

**GSAP**
- Verified: Webflow made GSAP 100% free, including all former Club plugins (SplitText, MorphSVG and others), for everyone including commercial use, not only Webflow customers. — [Webflow blog](https://webflow.com/blog/gsap-becomes-free); [GSAP standard license](https://gsap.com/community/standard-license/)
- It is a "no charge" proprietary licence, not an open-source one; it restricts use in visual no-code animation builders that compete with Webflow, and Webflow can revise it. Irrelevant for a game site, but it is not MIT. — [GSAP standard license](https://gsap.com/community/standard-license/); [Pinegrow forum](https://forum.pinegrow.com/t/gsap-has-been-acquired-by-webflow/9906)

**Rive**
- Web runtime WASM sizes from Rive's docs (brotli -9): canvas-lite 222 KB (707 KB raw), canvas 567 KB (1,728 KB raw), webgl2 648 KB (2,179 KB raw). — [Rive docs, runtime sizes](https://rive.app/docs/runtimes/runtime-sizes.md)
- A 2022 developer post put the WASM at 78 KB; that figure is out of date against the docs above. The same post notes the WASM and .riv file only start loading after React runs, so a first-screen animation can appear late unless preloaded. — [Pixel Point](https://pixelpoint-website-6l3rd8f5q-pixelpoint.vercel.app/blog/rive-app-overview)
- Rive runtimes are open source under MIT with no runtime fees; exporting from the editor has moved to paid plans; already-exported files keep working. Plan prices differ between third-party sites, so check rive.app/pricing. — [Rive blog, new plan](https://rive.app/blog/rive-s-new-9-mo-plan)
- Rive claims its files are often 10 to 15 times smaller than equivalent Lottie JSON (vendor claim). — [Rive blog](https://rive.app/blog/rive-as-a-lottie-alternative)

**Lottie / dotLottie**
- LottieFiles lists the dotLottie web runtime at about 150 KB (WASM, ThorVG renderer) and disputes Rive's file-size advantage (vendor claim). — [LottieFiles dotLottie](https://lottiefiles.com/dotlottie)

**PixiJS**
- PixiJS v8 is a single tree-shakeable package with WebGPU as a core backend and WebGL fallback; the team cautions WebGPU is not automatically faster because Pixi is often CPU-bound. — [PixiJS v8 launch post](https://pixijs.com/blog/pixi-v8-launches)
- One non-official guide puts the full library around 450 KB minified; no verified gzip figure was found. — [abratabia guide](https://abratabia.com/pixijs/)

**Accessibility**
- WCAG 2.3.3 (Animation from Interactions, AAA) asks that non-essential motion triggered by interaction can be disabled; the `prefers-reduced-motion` media query is a listed sufficient technique (C39). — [W3C Understanding 2.3.3](https://w3.org/WAI/WCAG21/Understanding/animation-from-interactions); [W3C technique C39](https://www.w3.org/WAI/WCAG22/Techniques/css/C39.html)
- `prefers-reduced-motion` does not cover auto-playing or looping content, which needs its own pause control under WCAG 2.2.2. — [specification.website](https://specification.website/spec/accessibility/reduced-motion.md)

### Inferences
Comparison for Plor (the "agent-authorable" and "fit" columns are the researcher's judgment):

| Tool | Cost to ship | Authored by | Good for in Plor | Main risk |
|---|---|---|---|---|
| CSS transitions/keyframes | 0 KB | Agent, in code | Key pops, shakes, timer pulse, flips; trivially gated by a reduce-motion media query or class | Sequencing and interruption get awkward |
| View Transitions API | 0 KB, Baseline (same-document) | Agent, in code | Screen-to-screen and question-to-question changes, shared-element moves | Cross-document incomplete in Firefox; how it interacts with this version of Next.js must be read from the bundled Next docs, *unverified* |
| Motion | ~5 to 34 KB | Agent, in code (React-native API) | Springs, layout animation, enter/exit of React elements, gestures | Per-letter timelines are clumsier than GSAP |
| GSAP (+ SplitText) | size not verified here | Agent, in code (imperative timelines) | Sequenced reveals, score count-up choreography, per-letter text | Imperative style needs care with React lifecycles; licence is free but not open source |
| Rive | 222 to 648 KB WASM + paid export | A human designer in the Rive editor | A host character with states (idle, taking a letter, gloating) | An agent cannot author .riv files; needs a designer and a paid plan |
| Lottie/dotLottie | ~150 KB runtime | A designer (After Effects / Lottie Creator), or stock files | One-off celebration clips | Linear playback only; stock look; agent cannot author reliably |
| PixiJS / canvas / WebGL shaders | hundreds of KB; own render loop | Agent, in code | A background or overlay layer only (particles, a shader backdrop) | Text off the DOM loses selection, screen readers, native input; battery |
| react-three-fiber / three.js | largest | Agent, in code | Not recommended | Already tried and reverted as "too far" |

- **Pick one JS animation library, not two** (the project's "one way to do each thing" rule): Motion fits React state-driven UI; GSAP fits choreographed sequences and split text. The choice is a DECISIONS.md entry for the human.
- **A middle path for "stylized":** keep all text and input in the DOM and put a single decorative canvas behind or over it (particles on a correct answer, an animated backdrop). The canvas can be dropped entirely under Reduce motion with no functional loss, and it avoids the full-scene trap of the three.js attempt.
- **What agents author reliably:** anything expressed as code and numbers (CSS, Motion, GSAP, canvas particles, shaders). What they cannot author: .riv and Lottie files, which are visual-editor artefacts. A Rive host character is only realistic if the owner hires or becomes the animator.
- Phone performance: animate `transform` and `opacity`; avoid animating layout, filters and large blurred shadows during the timed phase.

### Gaps
- GSAP core and SplitText gzip sizes were not retrieved; measure from the build.
- Motion's exact current sizes and its licence (MIT for the open-source library, with paid "Motion+" extras) are *unverified* in this pass.
- No independent, current benchmark comparing these tools on low-end phones was found.
- Next.js App Router support for view transitions in the version Plor uses was not checked; AGENTS.md requires reading `node_modules/next/dist/docs/` first.
- Rive's current plan names and prices are inconsistent across third-party sites; not verified against rive.app/pricing.

## 5. Sound and haptics for a light web game

### Takeaway
Sound is half of juice in every source, and a small palette goes a long way (key tick, submit thud, right, wrong, reveal tick with rising pitch, timer warning, finish). On the web, audio only starts after a user gesture, and haptics are effectively Android-only: iOS Safari does not implement the Vibration API, and the one known workaround is a hack.

### Cited Findings
- The juice literature treats sound as a core layer: bass-rich, compressed effects that confirm each action. — [Game Developer](https://gamedeveloper.com/design/squeezing-more-juice-out-of-your-game-design-)
- Rising pitch per scored item and rolling tick sounds on count-up are central to Balatro's scoring feel (third-party analysis). — [Blake Crosley](https://blakecrosley.com/guides/design/balatro)
- A pentatonic key-sound set sounds pleasant regardless of which keys are pressed or how fast. — [Monkeytype releases](https://www.github.com/monkeytypegame/monkeytype/releases?page=16)
- Howler.js defaults to the Web Audio API with HTML5 Audio fallback; mobile browsers and Chrome/Safari lock audio until a user interaction, and Howler tries to unlock on the first `touchend`; it supports audio sprites (many named sounds in one file, one request); a core-only build omits spatial audio. — [howler on npm](https://npmjs.com/package/howler)
- iOS Safari does not expose `navigator.vibrate()`; a 2024 W3C implementation report found Safari on iOS failing all Vibration API tests. — [W3C device-apis list](https://lists.w3.org/Archives/Public/public-device-apis-log/2024Jun/0061.html); [web-haptics browser support](https://www.mintlify.com/lochie/web-haptics/advanced/browser-support)
- A single user report claims `vibrate` now works on iOS Safari; other sources contradict it. Treat as unverified. — [MDN browser-compat-data issue](https://github.com/mdn/browser-compat-data/issues/29166)
- The open-source "web-haptics" approach gets a haptic tick on iOS by toggling an `<input type="checkbox" switch>` (a side effect of the switch control added in Safari 17.4) and uses `navigator.vibrate()` on Android; it is a hack that could stop working. — [azukiazusa.dev](https://azukiazusa.dev/blog/ios-safari-web-haptics.md); [web-haptics docs](https://www.mintlify.com/lochie/web-haptics/advanced/browser-support)
- General advice: do not rely on vibration for core feedback on iOS; always have a visual/audio equivalent. — [bugnet.io](https://bugnet.io/blog/fix-web-game-vibrate-api-not-available-ios-safari)

### Inferences
- Plor's games begin with a tap or keypress, so the audio-unlock gesture is naturally available; start the audio context on "Play".
- For about ten short effects, the raw Web Audio API (decode once, play buffers, vary `playbackRate` for the rising-pitch trick) may be enough and adds no dependency; Howler buys convenience (sprites, unlock handling). Under "build for today" this is a decision for the ticket.
- Sound needs its own setting, separate from Reduce motion, and a sensible default. *Unverified, from memory:* iOS's hardware silent switch mutes Web Audio in Safari, so many phone players will hear nothing regardless; motion must carry the feedback alone.
- Haptics: treat as an Android-only bonus on a few events (submit, wrong, time up), behind feature detection. Shipping the iOS switch hack would be building on an undocumented side effect; flag it rather than adopt it.
- Every cue should exist in at least two channels (visual plus sound or haptic), so muting any one loses nothing.

### Gaps
- Howler's current gzip size was not retrieved.
- No source was found for where to get or how to generate a small licensed SFX palette (the repo's PixelLab connector lists a sound-effect tool; its licence terms were not checked).
- Behaviour of the iOS silent switch with Web Audio and whether Apple plans Vibration API support: no primary Apple source found.
- No data on what share of daily word-game players play with sound on.

## 6. Pitfalls: repeat daily play, motion sickness, battery, distraction under time pressure

### Takeaway
The sources that teach juice also warn against excess, and the two strongest reference points for a daily word game (Wordle, Monkeytype) are restrained and make their effects optional. For a game played every day against a clock, motion has to be fast, non-blocking during input, proportional, and fully removable.

### Cited Findings
- Excess juice wastes time and annoys users; juice should match the game's pace and reinforce the core action. — [Game Developer](https://gamedeveloper.com/design/squeezing-more-juice-out-of-your-game-design-)
- Developers discussing Vlambeer's tricks observed a point where effects become distracting. — [Make Games SA thread](https://makegamessa.com/discussion/comment/16542)
- A GDC talk titled "Don't Juice It or Lose It" exists as a counterpoint (content not read). — [GDC Vault](https://gdcvault.com/play/1020861/Don-t-Juice-It-or)
- Wordle, the most successful daily word game, has essentially one animation. — [Pratt IXD critique](https://ixd.prattsi.org/2025/09/design-critique-wordle-website/)
- Monkeytype makes caret smoothing and every sound a user-controlled setting. — [Monkeytype docs mirror](https://www.mintlify.com/monkeytypegame/monkeytype/features)
- Some users experience distraction or nausea from animation; WCAG 2.3.3 asks that interaction-triggered, non-essential motion can be turned off, and `prefers-reduced-motion` is the standard mechanism. — [W3C technique C39](https://www.w3.org/WAI/WCAG22/Techniques/css/C39.html); [W3C Understanding 2.3.3](https://w3.org/WAI/WCAG21/Understanding/animation-from-interactions)
- Persona 5's highly stylised moving UI was initially hard to read and expensive to iterate. — [Kotaku](https://kotaku.com/-metaphor-refantazio-persona-5-menu-ui-hashino-1851667088)
- Balatro's missing score preview shows spectacle can cost clarity: some players turn to outside tools. — [GMTK](https://gmtk.substack.com/p/balatros-cursed-design-problem)
- Per-character variable-font animation is CPU-heavy on mobile. — [camoa dev guide](https://camoa.github.io/dev-guides/css/css-craft/variable-font-animation/)
- Overlapping animation sequences produce visual mess unless queued. — [Cole Chamberlin](https://colechamberlin.substack.com/p/spring-physics-in-my-word-game)

### Inferences
A checklist the report writer can use (inferences):
- **Never block input.** During the 20-second answer window no animation should delay a keypress, move the input line, or cover the question. Theatrical motion goes *between* questions and at the end, when the clock is stopped.
- **Do not eat the player's clock.** If a reveal or transition takes time, the timer must not be running under it; state this in the ticket.
- **Day 30 test.** Anything seen every day should be short and either skippable by tap or self-shortening. Reserve long sequences for rare events (a perfect game, a streak milestone).
- **Proportionality.** Scale effects to the event; if everything shakes, nothing does. Whole-screen shake is the riskiest effect on a phone held close; shake the answer, not the viewport.
- **Vestibular triggers** to keep out of the default look or gate behind the setting: large-area parallax, zooms, full-screen shake, spinning, flashing. *Not sourced to a specific list in this pass.*
- **Reduce motion is a second design, not an off switch.** Keep state changes legible with instant swaps, colour and opacity fades, and sound; drop travel, shake, particles and any canvas layer. Plor's existing setting should also honour the OS `prefers-reduced-motion` value.
- **Battery and heat.** Prefer event-driven animation over a permanent render loop; pause any canvas/shader layer when the tab is hidden and during the typing phase; avoid always-on full-screen shaders (the Balatro CRT approach) on phones.
- **Legibility beats style under time pressure.** Any stylisation of the question, chunk or input text must be tested for reading speed first.
- **"Went too far" guard.** The earlier pixel-art and 3D attempts replaced the look. A motion-first direction can be introduced on top of the current plain look, one moment at a time (keypress, submit, verdict, reveal, score), each reversible, which makes it easy to stop at the point the owner likes.

### Gaps
- No quantitative research was found on animation length versus retention in daily games, or on the performance cost of feedback effects during timed typing.
- No measured battery data for CSS versus canvas/WebGL animation on current phones was found.
- A primary list of vestibular triggers (for example from web.dev or WebKit's reduced-motion guidance) was not retrieved; the web.dev article "prefers-reduced-motion: Sometimes less movement is more" exists but was not read.
