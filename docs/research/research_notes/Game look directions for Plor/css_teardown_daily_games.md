# CSS/JS teardown of shipped daily and word web games (fonts, colours, motion values)

All values below were read from the shipped front-end files on 2026-11-16 (fetched with curl, searched with grep). NYT, Puzzmo and Gram Jam bundle file names carry content hashes and will change on their next deploy; the URL cited is the one that served the value on that date. Values are recorded as found. They are reference data, not recommendations.

## 1. Wordle (NYT): tile flip, shake, bounce, colours, fonts

### Takeaway
Wordle's whole motion vocabulary is six short keyframes: a 100 ms pop on typing, a two-part 250 ms + 250 ms `ease-in` flip staggered 300 ms per tile, a 600 ms row shake, and a 1000 ms win bounce staggered 100 ms per tile. The palette is three state colours over a grey "tone" scale, with separate dark and colour-blind sets; fonts are self-hosted NYT Franklin (tiles, UI) and Karnak Condensed (title).

### Cited Findings
Keyframes and durations (all in the shared games chunk CSS):
- `Tile-module_PopIn`: `from{transform:scale(0.8);opacity:0} 40%{transform:scale(1.1);opacity:1}`, applied on `[data-animation=pop]` with `animation-duration:100ms` (no timing function set, so the CSS default `ease`). — [9424 css](https://www.nytimes.com/games-assets/v2/9424.520931dadeb3da6d0828.css)
- `Tile-module_FlipIn`: `0%{rotateX(0)} 100%{rotateX(-90deg)}`; `Tile-module_FlipOut`: `0%{rotateX(-90deg)} 100%{rotateX(0)}`. Each is `animation-duration:250ms; animation-timing-function:ease-in` (`[data-animation=flip-in]` / `[data-animation=flip-out]`). So one tile's full flip is 500 ms, with the colour swap at the 250 ms midpoint. — [9424 css](https://www.nytimes.com/games-assets/v2/9424.520931dadeb3da6d0828.css)
- `Row-module_Shake` (invalid word): `10%,90%{translateX(-1px)} 20%,80%{translateX(2px)} 30%,50%,70%{translateX(-4px)} 40%,60%{translateX(4px)}`, `animation-duration:600ms`. — [9424 css](https://www.nytimes.com/games-assets/v2/9424.520931dadeb3da6d0828.css)
- `Row-module_Bounce` (win): `0%,20%{translateY(0)} 40%{translateY(-30px)} 50%{translateY(5px)} 60%{translateY(-15px)} 80%{translateY(2px)} 100%{translateY(0)}`, `animation-duration:1000ms`. An identical `Key-module_Bounce` (1000 ms) exists for keyboard keys. — [9424 css](https://www.nytimes.com/games-assets/v2/9424.520931dadeb3da6d0828.css)
- Keyboard key colour change: `transition:background-color .1s ease,color .1s ease`. — [9424 css](https://www.nytimes.com/games-assets/v2/9424.520931dadeb3da6d0828.css)
- Modal: `Modal-module_SlideIn` `0%{translateY(30px);opacity:0} 100%{translateY(0);opacity:1}` at `200ms`; `SlideOut` reverses to `translateY(30px)` with opacity 0 by 90%, also `200ms`. — [9424 css](https://www.nytimes.com/games-assets/v2/9424.520931dadeb3da6d0828.css)
- Toast keyframes: `fadeIn` (`0%{opacity:0} 15%{opacity:0} 100%{opacity:1}`), `flyIn`, `flyOut`, `slideDown` (`0%,90%{translateY(0)} 100%{translateY(100%)}`). — [4085 css](https://www.nytimes.com/games-assets/v2/4085.d393aa647f7f460747e5.css)

Stagger delays (set in JS, not CSS):
- Row component: `_=h?100:300` where `h` is `shouldFlipFaster`; each tile gets `flipDelay:o*_` (tile index × 300 ms, or × 100 ms in the faster mode). Win bounce: `style:{animationDelay:"".concat(100*o,"ms")}` (tile index × 100 ms). — [9424 js](https://www.nytimes.com/games-assets/v2/9424.5b0324df3d944c1ae374.js)
- The tile moves through states `idle → pop → flip-in → flip-out`, advancing on `onAnimationEnd`. — [9424 js](https://www.nytimes.com/games-assets/v2/9424.5b0324df3d944c1ae374.js)

Colours:
- Semantic variables, light (`:root`): `--color-correct: var(--green)`, `--color-present: var(--yellow-3)`, `--color-absent: var(--color-tone-2)`, `--key-bg: var(--color-tone-4)`, `--tile-text-color: var(--color-tone-7)`. Dark (`.dark`): correct `var(--green-4)`, present `var(--yellow-4)`, absent `var(--color-tone-4)`, `--key-bg: var(--color-tone-2)`. Colour-blind (`.colorblind`): correct `var(--orange)`, present `var(--blue)`. — [wordle css](https://www.nytimes.com/games-assets/v2/wordle.4c88bc7c61cb872f3684.css)
- Hex values behind them: `--green #6aaa64`, `--green-4 #538d4e`, `--yellow-3 #c9b458`, `--yellow-4 #b59f3b`, `--orange #f5793a`, `--blue #85c0f9`, `--wordle-high-contrast-green #58a351`, `--outlineBlue #2873dc`. Light tone scale: tone-1 `--black`, tone-2 `--gray-18 #787c7e`, tone-3 `--gray-19 #878a8c`, tone-4 `--gray-13 #d3d6da`, tone-5 `--gray-20 #edeff1`, tone-6 `--gray-21 #f6f7f8`, tone-7 `--white #fff`. Dark tone scale: tone-1 `--newsDarkContentPrimary #f8f8f8`, tone-2 `--gray-24 #818384`, tone-3 `--gray-25 #565758`, tone-4 `--gray-26 #3a3a3c`, tone-5 `--wordleBlack-2 #272729`, tone-6 `--wordleBlack-3 #1a1a1b`, tone-7 `--wordleBlack-4 #121213`. — [wordle css](https://www.nytimes.com/games-assets/v2/wordle.4c88bc7c61cb872f3684.css) and the shared token sheets [4625 css](https://www.nytimes.com/games-assets/v2/4625.686cced5b0a6103b0b7b.css), [9160 css](https://www.nytimes.com/games-assets/v2/9160.2cb9010b87f5a3f7e1b9.css)
- Tile states: `empty` → `border:2px solid var(--color-tone-4)`; `tbd` (typed) → `border:2px solid var(--color-tone-3)`, background tone-7, text tone-1; `correct`/`present`/`absent` → filled background, no border. — [9424 css](https://www.nytimes.com/games-assets/v2/9424.520931dadeb3da6d0828.css)

Fonts:
- Tile: `font-family:"nyt-franklin"; font-size:2rem; line-height:1; font-weight:bold; text-transform:uppercase` (1.8rem under `.pz-mobile`, 1.6rem for the small variant). — [9424 css](https://www.nytimes.com/games-assets/v2/9424.520931dadeb3da6d0828.css)
- Header title: `font-family:"nyt-karnakcondensed"; font-weight:700; font-size:28px; letter-spacing:.01em` (36px and 32px at other breakpoints). — [9424 css](https://www.nytimes.com/games-assets/v2/9424.520931dadeb3da6d0828.css)
- `@font-face` families declared: `nyt-franklin` (weights 400/500/600/700/800 seen), `nyt-karnak`, `nyt-karnakcondensed` (700), `nyt-stymie`, `nyt-imperial`, `nyt-cheltenham`, `nyt-franklin-cw`, plus Inter 600. All self-hosted woff2/woff with relative paths such as `./fonts/franklin/franklin-normal-700.woff2` and `./fonts/karnakcondensed/karnakcondensed-normal-700.woff2`, i.e. under `https://www.nytimes.com/games-assets/v2/fonts/`. — [wordle css](https://www.nytimes.com/games-assets/v2/wordle.4c88bc7c61cb872f3684.css), [4625 css](https://www.nytimes.com/games-assets/v2/4625.686cced5b0a6103b0b7b.css)

Reduced motion:
- None of the seven stylesheets the Wordle page links contains a `prefers-reduced-motion` media query (grep count 0 in each). The only uses in Wordle's JS chunks are `window.matchMedia("(prefers-reduced-motion: reduce)").matches` in promotional components (a games carousel card and a Duolingo promo that swaps a Rive animation for a static image). — [368 js](https://www.nytimes.com/games-assets/v2/368.e390f589358e70e79146.js), [4085 js](https://www.nytimes.com/games-assets/v2/4085.77b49eb529a7500aeb73.js)

### Inferences
- Revealing a five-letter guess takes about 1.7 s end to end: last tile starts at 4 × 300 ms = 1200 ms and its flip takes 500 ms (computed from the values above, not stated in the code).
- The win bounce finishes about 1.4 s after it starts (4 × 100 ms + 1000 ms).
- The game tile and row animations appear to play regardless of the OS reduced-motion setting, since no CSS or tile/row JS checks it. The Tile component has a `skipAnimation` prop, but what sets it was not traced.

### Gaps
- Toast display time (how long "Not in word list" stays) is set in JS and was not located.
- An exact cross-check against the original pre-NYT Wordle source was not possible: the Wayback Machine returned HTTP 429 for the archived `main.e65ce0a5.js`.

## 2. NYT Connections and Strands

### Takeaway
Connections uses small, fast card motions: a 300 ms bounce with 100 ms stagger across the four selected cards, a 200 ms shake played 1.5 times for a mistake, and a 300 ms pulse to 1.2× on the solved row. Strands reuses the same 200 ms × 1.5 shake and adds a 200 ms scale pulse; both share the NYT font stack and each game has its own named colour tokens.

### Cited Findings
Connections motion:
- `Card-module_bounce`: `0%,100%{translateY(0)} 50%{translateY(-10px)}`, rule `animation:Card-module_bounce ease-in .3s 1`, with `bounce2/3/4` classes adding `animation-delay:.1s / .2s / .3s`. — [2709 css](https://www.nytimes.com/games-assets/v2/2709.402d96412319a352854d.css)
- `Card-module_shake` (mistake): `0%,100%{translateX(0)} 25%{translateX(-5px)} 75%{translateX(5px)}`, rule `animation:Card-module_shake ease-in .2s 1.5` (iteration count 1.5). — [2709 css](https://www.nytimes.com/games-assets/v2/2709.402d96412319a352854d.css)
- Shuffle: card text fades from transparent to its colour over `1s` (`Card-module_textfadein`, `textfadeinwhite` for selected cards). — [2709 css](https://www.nytimes.com/games-assets/v2/2709.402d96412319a352854d.css)
- `Card-module_shrinkCard`: `transition:all .3s ease-in-out; transform:scale(0.9)`. — [2709 css](https://www.nytimes.com/games-assets/v2/2709.402d96412319a352854d.css)
- Solved row: `SolvedCategory-module_pulse` `0%{scale 1} 40%{scale 1.2} 70%{scale 1.2} 100%{scale 1}`, rule `animation:... linear .3s 1`; the row also has `transition:transform .6s`; its text fades in over `.5s`. — [2709 css](https://www.nytimes.com/games-assets/v2/2709.402d96412319a352854d.css)
- Mistake dot: `Mistakes-module_pop` `25%{scale(1.2)} 75%{scale(0.4)} 100%{scale(0)}`, `ease-in .4s 1`, fill-mode forwards; wrapper `transition:opacity 500ms ease 500ms`. — [2709 css](https://www.nytimes.com/games-assets/v2/2709.402d96412319a352854d.css)
- Toast: `transition:opacity 300ms cubic-bezier(0.645, 0.045, 0.355, 1)`. Loading header: `slide-up` from `translateY(20px)`, `600ms cubic-bezier(0.1, 0.2, 0.3, 1) both`. Modals: `SlideIn`/`SlideOut` at `var(--modal-animation-duration, 200ms)`. — [2709 css](https://www.nytimes.com/games-assets/v2/2709.402d96412319a352854d.css)
- Reduced motion: the only rule in the Connections chunk is `@media(prefers-reduced-motion: reduce){.LoadingHeader-module_slideIn{animation:none}}`. — [2709 css](https://www.nytimes.com/games-assets/v2/2709.402d96412319a352854d.css)

Connections colour and type:
- Card: `font-size:20px` (16px at a smaller breakpoint), `font-weight:700`, uppercase, `border-radius:6px`, `background-color:var(--bg-tile-connections)`; selected uses `--bg-tile-connections-selected` with alternate text colour; grid gap `8px`, cards `150px × 80px` on desktop and `22.5vw` square-ish on mobile. — [2709 css](https://www.nytimes.com/games-assets/v2/2709.402d96412319a352854d.css)
- Group colours: `--connections-yellow #f9df6d`, `--connections-green #a0c35a`, `--connections-blue #b0c4ef`, `--connections-maroon #ba81c5` (the purple group), brand `--connections-purple #b4a8ff`. Token mapping as written: `--bg-connections-straightforward: yellow`, `--bg-connections-easy: green`, `--bg-connections-medium: blue`, `--bg-connections-tricky: maroon`. — [655 css](https://www.nytimes.com/games-assets/v2/655.4a08448ed89c773725a7.css), [9160 css](https://www.nytimes.com/games-assets/v2/9160.2cb9010b87f5a3f7e1b9.css)
- Tile beiges: `--connections-lightest-beige #efefe6`, `--connections-light-beige #cfcfbf`, `--connections-beige #a39f95`, `--connections-darker-beige #787668`, `--connections-extra-dark-beige #656458`, `--connections-darkest-beige #5a594e`. `--bg-tile-connections` is defined twice (lightest-beige and light-beige) and `--bg-tile-connections-selected` twice (darkest-beige and extra-dark-beige), one per colour scheme. — [655 css](https://www.nytimes.com/games-assets/v2/655.4a08448ed89c773725a7.css)
- Buttons: `font-family:nyt-franklin,Arial; font-size:16px; font-weight:600; border-radius:32px; height:3em; border:1px solid`. — [2709 css](https://www.nytimes.com/games-assets/v2/2709.402d96412319a352854d.css)

Strands:
- Invalid word: `styles-module_shake` (same keyframe as Connections, ±5px), `ease-in .2s 1.5`. — [1650 css](https://www.nytimes.com/games-assets/v2/1650.3fa445b6ec438c2ecbce.css)
- `styles-module_Pulse`: `0%{scale(1)} 50%{scale(0.85)} 100%{scale(1)}`, `200ms ease`. `Pulser-module_bounce`: `0%{scale(1)} 15%{scale(0.62)} 38%{scale(1.13)} 77%{scale(0.95)} 100%{scale(1)}`, `1s`. — [1650 css](https://www.nytimes.com/games-assets/v2/1650.3fa445b6ec438c2ecbce.css)
- Hint outline: `pulseHintOutline` `0%{scale(1)} 3.75%{scale(0.85)} 9.5%{scale(1.1)} 25%{scale(1)}`; submit outline: `pulseSubmitOutline` animates `outline-offset` 6px → -4px → 3px → 6px. Hint modal `SlideInHint` at `120ms`. — [1650 css](https://www.nytimes.com/games-assets/v2/1650.3fa445b6ec438c2ecbce.css)
- End-of-game flip: `riddle-module_EndGamePseudo` rotates `rotateX(-180deg)` → `0deg` in the first 10% of a `4s` animation with a `2.2s` delay (`ease`); a delayed variant runs `5s` with a `5.2s` delay. — [1650 css](https://www.nytimes.com/games-assets/v2/1650.3fa445b6ec438c2ecbce.css)
- Colours: `--strands-mint #b2ded8` (`--bg-strands`), `--strands-blue #aedfee` (`--bg-strands-theme`, found theme words), `--strands-yellow #f8cd05` (`--bg-spangram`), `--strands-beige #dbd8c5` (`--bg-strands-hint`), plus `--strands-dark-mint #3f9ebc`, `--strands-darker-mint #0f7ea0`, `--strands-dark-yellow #db9e00`, `--strands-dark-beige #c4c1af`. — [655 css](https://www.nytimes.com/games-assets/v2/655.4a08448ed89c773725a7.css)
- The Strands chunk CSS contains no `prefers-reduced-motion` rule (grep count 0). — [1650 css](https://www.nytimes.com/games-assets/v2/1650.3fa445b6ec438c2ecbce.css)

### Inferences
- The lighter beige pair (`#efefe6` tile, `#5a594e` selected) is most likely the light scheme and the other pair the dark scheme; the selectors were not read to confirm.
- The card-swap movement when a Connections group is solved (cards sliding into the top row) is not in the CSS keyframes, so it is probably driven by JS-set transforms combined with the `transition:transform .6s` on the solved row.
- The `1.5` iteration count on a 0→left→right→0 shake means it ends mid-cycle at the 50% point, which is back at centre, giving three direction changes in 300 ms total.

### Gaps
- Connections and Strands game logic chunks (where JS-timed delays between "bounce", "check" and "reveal" live) were not traced; only the entry stubs (`connections.7d3af79fd7e272d0ad4b.js`, 4 KB) were read.
- Strands letter-drag line drawing and found-word colour fill timings were not found in the CSS.

## 3. Puzzmo

### Takeaway
Puzzmo ships a named theme-token system (`--theme-*`, 34 base tokens each with 11 alpha variants) injected inline for light and dark, self-hosts five font families (Poppins, Zodiak, Red Hat Mono, Dongle, Rubik, plus League Spartan in the calendar), and uses overshoot ("back") easing curves widely. It is the only target here besides Monkeytype with systematic reduced-motion CSS.

### Cited Findings
- Fonts declared in an inline `<style data-font-faces>` block, each weight as its own family name, `font-display: swap`, served as subset woff2 from `/assets/fonts-woff2/` (e.g. `RedHatMono-Bold-subset.e2933468.woff2`): Poppins (Thin to Black, with italics), Zodiak (Thin to Black, italics, Variable), RedHatMono (Light to Bold, italics), Dongle (Light/Regular/Bold), Rubik (Light/Regular). `LeagueSpartan` is used by the calendar in the main stylesheet. — [puzzmo.com HTML](https://www.puzzmo.com/), [main css](https://www.puzzmo.com/assets/main.BVRlFlte.css)
- Theme tokens are written by an inline script as `:root{...}` for dark or light. Dark: `a_bg #141620`, `a_bgAlt #202433`, `fg #ECECEC`, `a_headerText #A1BAD4`, `a_infoBG #282C3A`, `a_table #303246`, `a_tableAlt #393b52`, `g_bg #374351`, `g_bgAlt #333D49`, `g_bgDark #2C2F33`, `g_outline #646464`, `g_unsolved #747474`. Light: `a_bg #F2F2F2`, `a_bgAlt #ECECEC`, `fg #000000`, `a_headerText #000000`, `a_infoBG #FFFFFF`, `a_table #F9F9F9`, `a_tableAlt #F6F4F4`, `g_bg #FFFFFF`, `g_bgAlt #EBEBEB`, `g_bgDark #D6D6D6`, `g_outline #1B1D29`, `g_unsolved #C2C2C2`. — [puzzmo.com HTML](https://www.puzzmo.com/)
- Tokens identical in both schemes: `key #FFAAAC`, `keyLight #FFD2D3`, `keyStrong #F7868B`, `keyFG #000000`, `player #5DBAFC`, `playerLight #9EDDFF`, `subBrand #FFC000` (also `a_puzmo`), `a_anchor #1F97EE`, `error #FF3C3C`, `alt1 #98B389`, `alt2 #FAC16C`, `alt3 #D298FF`, `alwaysDark #1B1D29`, `alwaysLight #FFFFFF`. Each token also has alpha variants `-a00, -a05, -a10, -a20, -a25, -a30, -a40, -a50, -a66, -a75, -a90`. — [puzzmo.com HTML](https://www.puzzmo.com/)
- Focus and selection use the key colour: `:focus-visible{outline:1px solid var(--theme-key)}`, `::selection{background:var(--theme-key);color:var(--theme-keyFG)}`; page background is `var(--theme-alwaysDark)`. — [main css](https://www.puzzmo.com/assets/main.BVRlFlte.css)
- Easing curves present in the atomic (StyleX) stylesheet: `cubic-bezier(.22,1,.36,1)`, `cubic-bezier(.34,1.4,.64,1)`, `cubic-bezier(.34,1.56,.64,1)`, `cubic-bezier(.65,0,.35,1)`, and overshoot transitions `transform .25s cubic-bezier(.2,.9,.3,1.6)`, `transform .3s cubic-bezier(.2,.9,.3,1.4)`, `transform .3s cubic-bezier(.2,.9,.3,1.6)`. One compound transition: `opacity .7s ease, transform .7s ease, left .9s cubic-bezier(.65,0,.35,1), top .9s cubic-bezier(.65,0,.35,1), box-shadow .4s ease`. — [stylex css](https://www.puzzmo.com/assets/stylex.45ae50d3.css)
- Animation durations present: `.15s, .18s, .25s, .35s, .4s, .42s, .45s, .52s, .7s, .9s, 1s, 1.8s, 2s, 3s, 4s, 9s, 24s`; transition durations: `.11s, .12s, .125s, .15s, .16s, .2s, .25s, .3s, .4s, .5s, .6s, 1s`. — [stylex css](https://www.puzzmo.com/assets/stylex.45ae50d3.css)
- Keyframes (names are hashes): pop-in `0%{scale(.3);opacity:0} 60%{scale(1.1);opacity:1} 80%{scale(.96)} 100%{scale(1)}`; `0%{scale(0)} 70%{scale(1.25)} 100%{scale(1)}`; `0%{scale(.6)} 45%{scale(1.15)} 70%{scale(.95)} 100%{scale(1)}`; hop `0%{translateY(0) scale(1)} 25%{translateY(-10px) scale(1.06)} 50%{translateY(0) scale(.97)} 70%{translateY(-3px) scale(1.01)} 100%{...scale(1)}`; drop-in `0%{translateY(-110%)} 70%{translateY(10%)} 100%{translateY(0)}`; wiggle that rests at `rotate(-2deg)` for 88% then `91%{rotate(3deg) scale(1.04)} 94%{rotate(-4deg) scale(1.04)} 97%{rotate(2deg)}`; entrance fades from `translateY(4px/6px/8px/14px/24px)`; a `translateX(0)→translateX(-50%)` marquee. — [stylex css](https://www.puzzmo.com/assets/stylex.45ae50d3.css)
- Reduced motion: six `@media (prefers-reduced-motion: reduce)` rules in the atomic sheet, setting `animation-duration:.01ms`, `animation-name:none`, `transition-duration:.01ms`, `transition-duration:0s`, replacing a transition with `opacity .2s ease`, and pinning the marquee at `translateX(-33%)`; the main sheet has `.thumbnail-enter{animation:none}` (the normal value is `.2s ease-out`). — [stylex css](https://www.puzzmo.com/assets/stylex.45ae50d3.css), [main css](https://www.puzzmo.com/assets/main.BVRlFlte.css)

### Inferences
- Because StyleX emits one class per declaration, the stylesheet does not show which duration, curve and keyframe belong together or to which component; the pairings above are not known.
- These values describe the Puzzmo site shell (today page, cards, modals). The individual games are separate bundles and were not opened.

### Gaps
- Which font family is used for what (headings vs body vs numbers) is set through hashed CSS variables (`--x-fontFamily` etc.) and was not resolved; only `Poppins-Bold` and `Poppins-Semibold` appear as literal `font-family` values in the atomic sheet.
- Per-game colours and motion (Typeshift, SpellTower, Bongo, etc.) were not examined.

## 4. Monkeytype (open source: monkeytypegame/monkeytype)

### Takeaway
Monkeytype defines every theme as exactly ten colours (187 themes in the current list), exposed as ten CSS variables, and its signature motion is the caret: a 1 s infinite opacity blink plus a JS-animated position glide of 85/100/150 ms. It disables nearly all transitions and animations under `prefers-reduced-motion`.

### Cited Findings
- Repository location: the GitHub repo is `monkeytypegame/monkeytype` (the path `monkeytype/monkeytype` returns 404), default branch `master`. — [GitHub](https://github.com/monkeytypegame/monkeytype)
- Theme shape: `bg, main, caret, sub, subAlt, text, error, errorExtra, colorfulError, colorfulErrorExtra` (all hex), plus optional `hasCss`. The themes object has 187 entries, matching 187 names in the `ThemeNameSchema` enum; 52 themes also ship an extra CSS file under `frontend/static/themes/`. — [constants/themes.ts](https://raw.githubusercontent.com/monkeytypegame/monkeytype/master/frontend/src/ts/constants/themes.ts), [schemas/themes.ts](https://raw.githubusercontent.com/monkeytypegame/monkeytype/master/packages/schemas/src/themes.ts)
- Example, `serika_dark` (the well-known default look): `bg #323437, main #e2b714, caret #e2b714, sub #646669, subAlt #2c2e31, text #d1d0c5, error #ca4754, errorExtra #7e2a33, colorfulError #ca4754, colorfulErrorExtra #7e2a33`. — [constants/themes.ts](https://raw.githubusercontent.com/monkeytypegame/monkeytype/master/frontend/src/ts/constants/themes.ts)
- CSS variable names in the shipped stylesheet: `--bg-color, --main-color, --caret-color, --sub-color, --sub-alt-color, --text-color, --error-color, --error-extra-color, --colorful-error-color, --colorful-error-extra-color`. — [live css](https://monkeytype.com/css/monkeytype.0aLSzEHN.css)
- Other root values: `--roundness: 0.5rem; --font: "Roboto Mono", "Vazirharf", monospace`. Roboto Mono is self-hosted and preloaded (`/webfonts/RobotoMono-Regular.woff2`); user-selectable fonts are generated from a font map with `font-display: block`. — [core.scss](https://raw.githubusercontent.com/monkeytypegame/monkeytype/master/frontend/src/styles/core.scss), [fonts.scss](https://raw.githubusercontent.com/monkeytypegame/monkeytype/master/frontend/src/styles/fonts.scss), [monkeytype.com HTML](https://monkeytype.com/)
- Caret: `#caret{height:1.2em; background:var(--caret-color); animation:caretFlashSmooth 1s infinite; border-radius:var(--roundness)}`. Widths by style: default `0.1em`, block `0.5em`, underline `0.1em` high × `0.5em` wide, outline `0.05em` border with no blink animation; image carets (carrot `0.25em`, banana and monkey `1em`). Pace caret: `var(--sub-color)` at `opacity:0.5`. — [caret.scss](https://raw.githubusercontent.com/monkeytypegame/monkeytype/master/frontend/src/styles/caret.scss)
- Blink keyframes: `caretFlashSmooth` `0%,100%{opacity:0} 50%{opacity:1}`; `caretFlashHard` `0%,50%{opacity:1} 51%,100%{opacity:0}`. Others in the same file: `shake` (`translate(2px,0)` → `translate(-2px,0)` → `translate(2px,0)`), `flashKey` (key flashes from main colour back to background), `fadeIn`, `fadeOut`, `loader`. — [animations.scss](https://raw.githubusercontent.com/monkeytypegame/monkeytype/master/frontend/src/styles/animations.scss)
- Caret glide duration by the `smoothCaret` setting: off `0`, slow `150`, medium `100`, fast `85` (ms), with default easing `"inOut(1.25)"`. — [elements/caret.ts](https://raw.githubusercontent.com/monkeytypegame/monkeytype/master/frontend/src/ts/elements/caret.ts)
- Reduced motion: `@media (prefers-reduced-motion){ body:not(.ignore-reduced-motion) *:not(.fa-spin, loader, .preloader, .typed-effect-fade .word.typed) {transition:none!important; animation:none!important} html{scroll-behavior:auto!important} }`. A user setting adds the `ignore-reduced-motion` class to opt back in. A JS helper `prefersReducedMotion()` wraps `matchMedia("(prefers-reduced-motion)")`. — [live css](https://monkeytype.com/css/monkeytype.0aLSzEHN.css), [media-queries.scss](https://github.com/monkeytypegame/monkeytype/blob/master/frontend/src/styles/media-queries.scss), [utils/misc.ts](https://github.com/monkeytypegame/monkeytype/blob/master/frontend/src/ts/utils/misc.ts)

### Inferences
- `"inOut(1.25)"` is an easing string in the syntax of the anime.js v4 animation library (a power in-out curve); the import that confirms the library was not read, so treat the library name as unverified.

### Gaps
- The `docs/THEMES.md` contributor guide and the wrong-word/letter error styling (`test.scss`) were not read in detail.
- The older `frontend/static/themes/_list.json` file named in the task no longer exists; the list now lives in the two TypeScript files cited above.

## 5. JKLM.fun (BombParty)

### Takeaway
BombParty's game board is drawn on a `<canvas>`, so its motion is hand-written JavaScript rather than CSS: each player animation is a 300 to 600 ms one-shot using power-curve decay (`(1 - t)^2` or `^3`) and a damped cosine shake. Fonts are self-hosted Lato (game text), Varela Round (base UI) and Pacifico (logo); the board sits on a warm brown radial gradient.

### Cited Findings
- The lobby is at jklm.fun; the BombParty client is served from a game server host and was reachable at `phoenix.jklm.fun/games/bombparty/` (HTTP 200). `falcon.jklm.fun` returned 522 and `jklm.fun/games/bombparty/` 404. — [BombParty client HTML](https://phoenix.jklm.fun/games/bombparty/)
- Fonts: `@font-face` for `Lato` 400, `Pacifico` 400 and `Varela Round` 400, self-hosted copies of the Google Fonts files (`lato/v16/...woff2`, `pacifico/v16/...`, `varelaround/v12/...`), `font-display: swap`. Base body font `"Varela Round", sans-serif`; headings/buttons `"Lato", sans-serif`; logo `'Pacifico', sans-serif`. — [fonts.css](https://jklm.fun/common/fonts/fonts.css), [base.css](https://jklm.fun/common/base.css), [central.css](https://jklm.fun/central.css)
- Board background: `radial-gradient(ellipse, #564a42, #463d36 70%, #37302b), #37302b`; top bar `rgba(0,0,0,0.1)`, bottom bar `rgba(0,0,0,0.3)`, text `#eee`. Answer input: `background: rgba(0,0,0,0.5); border-radius: 1em; color: #eee; font-size: 1.25em; text-align: center; box-shadow: 0 0 1em rgba(0,0,0,0.3) inset`. Syllable prompt: bold, `font-size: larger`, `#fff`. — [bombparty.css](https://phoenix.jklm.fun/games/bombparty/bombparty.css)
- Lobby colours: page `#445061`, header purple `#7855c7`, link blue `#26f`, primary green button `#26aa36`, blue `#3ba3ff`, red `#ff5a5a`; lobby fade `transition: opacity 0.2s ease-in` with `0.2s` delay. — [central.css](https://jklm.fun/central.css), [base.css](https://jklm.fun/common/base.css)
- Player animation durations: join `300`, correct word `500`, fail word `600`, lose life `600`, bonus-alphabet complete ("woo") `600`; `explosionDuration = 500` (ms). — [bombparty.js](https://phoenix.jklm.fun/games/bombparty/bombparty.js)
- Curves, with `p` = elapsed/duration: correct word scales `1 + 0.3 × (1-p)^3` and rotates by a random angle between π/16 and π/8 (either direction) × `(1-p)^3`; fail word translates X by `cos(p × 20) × 10 × (1-p)` px; lose life adds a Y drop `10 × (1-p)^2` px and Y-squash `1 - 0.2 × (1-p)^3`; join scales from 0.5 with a π/4 rotation decaying by `(1-p)^3`; "woo" does a full 2π spin. — [bombparty.js](https://phoenix.jklm.fun/games/bombparty/bombparty.js)
- Bomb idle: scale `1.05 - 0.05 × pulse^2` where pulse cycles every 20 frames; the fuse spark is redrawn each frame at a random rotation and a random scale between 0.8 and 1.2. The arrow turns toward the current player with `lerpAngle(current, target, 0.15)` per frame. Explosion flash: white at alpha `0.5 × (1 - progress)`, eased by `1 - progress^5`. — [bombparty.js](https://phoenix.jklm.fun/games/bombparty/bombparty.js)
- Canvas text: `"Lato"` at `1em`, `1.25em`, `0.75em` (names and words), `bold 1em` (bonus letters), `4em` (explosion). Colours: typed word `#fff` for the current player and `#aaa` for others, matched-syllable highlight `#4d4`, offline players `#888` italic, bonus letter tiles `#db6` (unused) or `#888` (used) with `#444` text. — [bombparty.js](https://phoenix.jklm.fun/games/bombparty/bombparty.js)
- No `prefers-reduced-motion` handling was found in `bombparty.css`, `base.css`, `central.css` or the lines of `bombparty.js` searched. — [bombparty.css](https://phoenix.jklm.fun/games/bombparty/bombparty.css)

### Inferences
- The bomb pulse and arrow lerp are tied to frame count, not time, so their real speed depends on the display refresh rate (20 frames is about 333 ms at 60 Hz).
- The fail-word shake completes roughly three oscillations in 600 ms (`cos(20p)` covers 20 radians, about 3.2 cycles) with linearly shrinking amplitude from 10 px.

### Gaps
- The bomb, spark and heart artwork are image assets drawn through `jklmGfx`; they were not downloaded.
- Sound timing (`jklmAudio.play('explosion' / 'correctWord' / 'failWord')`) fires at the same moment as the animations, but the audio files were not examined.

## 6. Gram Jam (solo-built Svelte word game)

### Takeaway
Gram Jam's author published a technical write-up (May 2026) explaining a custom animation engine on Svelte transitions with pre-computed spring easing; the shipped bundle confirms the constants: spring `stiffness 0.2, damping 1`, a five-step player-chosen animation speed (333 ms to 3000 ms), 25 ms per-tile stagger and a 250 ms fade. The code is not open source; values come from the live bundle.

### Cited Findings
- Write-up: "Spring Physics in my Word Game?" by Cole Chamberlin, first in a series; describes FLIP for tile swaps (`animate:flip={{ duration: 200 }}`), `in:fly={{ y: 20, duration: 200 }}`, a custom `flipOver` transition using `rotateY` up to 90° with `perspective(max(width, 50) × 10 px)`, `sineOut` on the way in and `sineIn` on the way out, and a diagonal sweep via `delay: stagger * (i + j)` from board coordinates. — [Substack post](https://colechamberlin.substack.com/p/spring-physics-in-my-word-game)
- The post explains replacing Svelte's `crossfade` (default duration `sqrt(distance) × 30` ms, `cubicOut`) with a custom send animation built from piecewise segments, because "a word moving a long distance across the board should feel different" from a short move. — [Substack post](https://colechamberlin.substack.com/p/spring-physics-in-my-word-game)
- Shipped constants: `var SPRING = { stiffness: .2, damping: 1, precision: 1, fps: 60 }`. — [COfMwrwu.js](https://gramjam.app/_app/immutable/chunks/COfMwrwu.js)
- Animation speed setting (default 3): 1 "really slow" `spring 15, ms 3000`; 2 "slow" `spring 30, ms 1500`; 3 "medium" `spring 60, ms 750`; 4 "fast" `spring 90, ms 500`; 5 "really fast" `spring 120, ms 333`. — [COfMwrwu.js](https://gramjam.app/_app/immutable/chunks/COfMwrwu.js)
- Tile flip duration is derived: `tileFlipDuration = animationSpeed.ms / 2` (375 ms at the default). — [CIW0iHe8.js](https://gramjam.app/_app/immutable/chunks/CIW0iHe8.js)
- Word-send animation: `FADE_DUR = 250`, `SPRING_UP_WEIGHT = 50`, per-tile `delay = 25 * index`, spring simulated at `fps = animationSpeed.spring / 2`, tile scales `1 → 1.25` during the lift, `z-index: 800`. — [CwzVgfX-.js](https://gramjam.app/_app/immutable/chunks/CwzVgfX-.js), [Substack post](https://colechamberlin.substack.com/p/spring-physics-in-my-word-game)
- Font: Poppins 400 from Google Fonts (`fonts.googleapis.com/css2?family=Poppins:wght@400&display=swap`), stack `'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`; "Fira Code" monospace appears once. — [gramjam.app HTML](https://gramjam.app/)
- Toast/status colours found in CSS: `--success-bg #36ae7c`, `--error-bg #eb5353`, `--warning-bg #f9d923`, `--warning-text #2f3640`, `--normal-bg #fff / #2f3640 / #000`, `--slider-accent #005ddf / #8ecae6`. — [gramjam.app CSS chunks](https://gramjam.app/)
- Reduced motion: the bundle contains `matchMedia("(prefers-reduced-motion)").matches` (variable `preferLessMotion`) and one `@media (prefers-reduced-motion)` CSS block. — [gramjam.app JS chunks](https://gramjam.app/)

### Inferences
- The spring is frame-based: the "spring" number in each speed option is the simulation frame rate, so a higher setting plays the same pre-computed frames faster rather than changing stiffness.
- `preferLessMotion` may belong to a bundled library (for example a toast component) rather than the game's own engine; its owner was not traced.

### Gaps
- No public Gram Jam repository was found (GitHub search returned only unrelated repos).
- The tile and board colour palette is not in CSS custom properties with hex values; it was not extracted.
- The `stagger` value passed to the Flipper component was not located.

## 7. Cross-checks: open-source Wordle clone, LinkedIn Games

### Takeaway
No clone was found that reproduces NYT Wordle's timings exactly; the popular WebDevSimplified clone uses the same structure (half-flip, shake, staggered win "dance") but different numbers, which shows the feel survives some variation. LinkedIn Games exposes only a guest landing page to unauthenticated fetches, so no game CSS was obtained.

### Cited Findings
- WebDevSimplified/wordle-clone (178 stars): tile `transition: transform 250ms linear`; `FLIP_ANIMATION_DURATION = 500` with per-tile stagger `index × 500 / 2` (250 ms, versus Wordle's 300 ms); shake `250ms ease-in-out` with percent offsets (±5%, ±7.5%) versus Wordle's 600 ms pixel offsets; win `dance 500ms ease-in-out` (`20%{-50%} 40%{5%} 60%{-25%} 80%{2.5%} 90%{-5%}`) staggered `index × 500 / 5` (100 ms, same as Wordle); alerts fade `opacity 500ms ease-in-out` and show for `1000` ms by default. Colours in HSL: background `hsl(240, 3%, 7%)`, wrong `hsl(240, 2%, 23%)`, wrong-location `hsl(49, 51%, 47%)`, correct `hsl(115, 29%, 43%)`. — [styles.css](https://raw.githubusercontent.com/WebDevSimplified/wordle-clone/main/styles.css), [script.js](https://raw.githubusercontent.com/WebDevSimplified/wordle-clone/main/script.js)
- LinkedIn Games: `linkedin.com/games/` returns a 50 KB guest page listing Crossclimb, Mini Sudoku, Patches, Pinpoint, Queens, Tango, Wend and Zip; `linkedin.com/games/pinpoint/` returns a 4 KB shell. The linked stylesheet is LinkedIn's general guest CSS (system font stack `-apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, ...`; keyframes only `dash, fadein, fadeout, nodeInserted, spin`; no `prefers-reduced-motion`). — [linkedin.com/games](https://www.linkedin.com/games/), [guest css](https://static.licdn.com/aero-v1/sc/h/5jxftsrioqyunnuqnxn6pwkc4)

### Inferences
- The clone's HSL colours convert to roughly Wordle's dark-mode values (`#538d4e` green, `#b59f3b` yellow, `#3a3a3c` grey); the conversion was done by eye, not computed.

### Gaps
- Original Wordle (powerlanguage.co.uk) source: Wayback Machine returned HTTP 429; not retried.
- `cwackerfuss/react-wordle` returned 404 from the GitHub API (moved or removed); two GitHub code searches for clones using the original keyframe names returned nothing.
- LinkedIn's actual game bundles load only inside the signed-in app shell and were not reachable.
