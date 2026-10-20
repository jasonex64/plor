# M12 — Visual design

**Status:** planned (draft: mockups for comparison, no app code yet)

## Goal
Give Plor (the platform) and Offbeat (its first game) their look, phone first, beyond M02's plain functional UI.

## Who uses it / what breaks without it
- Used by: every player, on every screen; anyone who sees a shared result (M05) or the front page (M09) before signing in.
- Breaks without it: nothing functional. The human placed M12 last (2026-10-19), so the closed beta (M11) runs on the plain UI on purpose. Without it, the share card (M05) has no image look, the front page (M09) has no layout to fill, and profile frames (M10) have no slot to sit in.

## Source
No entry in `docs/SOURCES.md` covers visual design or accessibility yet. Only a human can add one (SOURCES.md, Rules). Proposed for the human's approval (decision D11):
- **WCAG 2.2** (W3C Recommendation): 1.4.1 Use of Color, 1.4.3 Contrast (Minimum), 1.4.11 Non-text Contrast, 2.5.8 Target Size (Minimum). The mockups follow these from memory: *unverified* until the source is pinned and read.
- **Google sign-in branding guidelines** (Google Identity docs), for the "Continue with Google" button. The mockups draw a plain outlined button; *unverified* against the guidelines.
- If a web font is chosen (D4): its license page (the Google Fonts families shown are under the SIL Open Font License per Google Fonts; *unverified*).

Product facts the mockups follow, already in the repo:
- `docs/ROADMAP.md`: Product ("welcoming but neutral", human 2026-10-19); M05 Share, M06 Friends, M07 Comments, M08 Leaderboards, M09 Front page, M10 Cosmetics (profile frames, emotes), M12.
- `docs/DECISIONS.md`, Game 1: 7 questions, rising difficulty, sudden death, k points for surviving question k; host answers shown only after the player answers. "Offbeat" is the display name and can change; `game_id` `offbeat` can't.
- `docs/DECISIONS.md`, Client platform: mobile-first web app.
- The current screens in `src/app/` (`page.tsx`, `home.tsx`, `game.tsx`, `globals.css`): sign-in (Google, email link), pick a username, start, question with autocomplete ("did you mean", "Not in the list? Send"), pick then "Lock in", safe line, result list.
- ROADMAP, after the MVP: game 2 gets its own name and look, and must not use Wordle's green, yellow and gray tiles.

## Screens
Each direction in the mockups shows all seven:
1. Sign-in (Google and email link; the privacy link; the intro Google's brand check needs, M02 2c).
2. Home, signed in, before playing (room for friends M06, leaderboard M08, front page M09, the avatar frame M10).
3. Question with autocomplete (typed text, suggestions, "Not in the list? Send").
4. Answer result: safe.
5. The run-ending moment: the player matched the host.
6. Full-run result (7 of 7), with room for comments and reactions (M07).
7. Spoiler-free share card, as an image and as text (M05).

Not mocked yet: pick a username, the "Lock in / Change it" step, "did you mean", errors, loading, the abandoned-run message, the privacy page. They follow once a direction is chosen.

## Mockups
Artifact (private until the human shares it): https://claude.ai/artifact/NQmsChneJ1uew7mBzHuLvc
Its source files are copied to `docs/design/m12/` (`Main.dc.html` is direction A, `B.dc.html` and `C.dc.html` the others, `canvas.json` the layout), so the directions stay in the repo if the Artifact changes.

Three directions, one row each. All use the real 2026-11-02 questions. Host answers shown are **stand-ins**, picked only from entries outside each question's host bank, so the mockups reveal no real host answer. The full-run lists leave host answers out.

| | A · Full scale (music) | B · Seven steps (plain) | C · Host chat (conversation) |
|---|---|---|---|
| Idea | The day's 7 questions are 7 notes of a rising scale. Staying off the host's answer is "off the beat"; matching is "off-key"; 7 of 7 is a "full scale". The starting idea from the session that started this one, not decided. | No metaphor. 7 bars rising in height show the rising difficulty. "Safe", "Caught", "All 7 cleared". Home is a list of today's games, ready for game 2. | The host is a character who asks in chat bubbles and answers after you. "Dodge", "caught", "same as me". The answer box sits at the bottom, near the thumb. |
| Progress mark | A staff with 7 notes; filled = survived, ringed = now, slashed + "off-key" label = matched | 7 numbered bars; filled = safe, outlined = now, ✕ + "caught" label | 7 dots; filled = dodged, ringed = now, ✕ + "caught on 5" label |
| Share text | `♪♪♪♪✕·· 4/7` | `▁▂▃▄✕·· 4/7` | `●●●●✕○○ 4/7` |
| Placeholder look | Light; indigo accent; Bricolage Grotesque + Inter | Light grey; teal accent, rust for "caught"; Manrope | Dark; amber accent, light blue host; Nunito |

**Round 1 result (human, 2026-10-20):** "i dont like these designs". None of A, B or C is carried forward as it stands.

**Round 2 (2026-10-20): a wide spread.** The human asked for a spread of directions dealt with the `design-taste-frontend` skill (Leonxlnx/taste-skill, MIT, installed at the human's request), each shown as one quick tile: the question screen and the share card. It's on the canvas page "Round 2 · wide spread" (files `docs/design/m12/R2-*.dc.html`). `draw.mjs` dealt ten of its 20 library directions, each with its own dealt font and palette: quiet instrument, colour chapters, one motif, dressed as something else (a fight card), the page is the object (an answer sheet), loud and flat, the name as a monument, the well-kept board, the dark room, and type and nothing else. How the skill was used, following the parent session's notes and CLAUDE.md: dealt directions are options for the human, not adopted; no brand choice was made; no images were downloaded; the skill's working files stayed in the session scratchpad, outside the repo. Two dealt fonts (Chillax, Cabinet Grotesk) come from Fontshare, which the mockup canvas can't load, so their type slot was redrawn until a Google Fonts face came up. Text colours were checked at 4.5:1 or more. Tile 8 uses a yellow accent with dark tiles; any final share card must stay clear of Wordle's green, yellow and gray tiles (ROADMAP, after the MVP).

Colours and fonts are placeholders to tell the directions apart, not proposals (D3, D4). Every text colour pair in the mockups was checked at 4.5:1 or more, and input borders and progress marks at 3:1 or more (checked with the WCAG relative-luminance formula, computed with a one-off node command; formula *unverified* against the pinned source). No state is shown by colour alone: each also has a shape and a word. Buttons and list rows are at least 44 px tall (the design tool's own guideline; WCAG 2.5.8's minimum is to be read once pinned).

## The human's design notes (human, 2026-10-20)
In the human's words where quoted; everything else is a close summary.
- **Plor vs the games.** The home page should be "a more neutral page", while "each individual game will be more stylized and look unique". Later: the home page "shouldn't be too far away from any of the individual games"; since each game will have some animation and pixel art, the home page should share that style to some extent.
- **Pixel art and animation** in the game itself, maybe making assets with PixelLab. *Unverified:* what PixelLab costs, its terms, and who owns the assets it makes. The human decides (D14), and it needs a SOURCES.md entry before any asset is used.
- **References for the game:**
  - krillion.io. Liked: "the animations, the minimalistic theming". Disliked: "the font can be a bit thin sometimes, and maybe its lacking a little bit of detail".
    Wants "more illustration and small animation"; "the screen information is quite good". Krillion's structure, as the human describes it: you start at sea level and go deeper with each step, each with its own animation, and the answer text is attached to an animation and "shakes as it goes lower". The human shared a screenshot (not committed: it's another site's art): a dark underwater scene with rising bubbles, a pixel-art shrimp in a witch hat perched on a word plate with stepped pixel corners, the answer in a glowing pixel font, and a dashed depth line behind it.
  - monkeytype: likes "the minimal layout", the caret animation (the text cursor that glides as you type), and the themes ("lots of color variants"). Concern: "the fact that there's only 2 or 3 prominent colors could be a problem".
- **The word is the centre.** The human wants to do something with the player's word, as Krillion does, partly because players will later collect and personalize **borders on the text bubbles** (M10 cosmetics). So every concept needs a word container that can take a border.
- **Friends on the board.** Once friends and groups exist (M06), each game's theme should be able to show visually where each friend ended, e.g. with 7 steps on a path, a friend who got caught "fall[s] off the path or something" (human, 2026-10-20). M06 already says a friend's ending shows only after you've played, so the theme must also work for many friends at one step; how many to draw is a human number for M06.
- **Concept first.** The human asked for help to work out and settle the game's concept and theme before any art: the theme decides which animations and pixel art need making (human, 2026-10-20).
- **Round 2 tiles:** likes "the font in the first card": the big serif headline (Young Serif); "the body text is alright too" (Source Serif 4). Likes "the overall feel of the 4th" (tile 4, the fight card: blue, red and black, Bebas Neue capitals, rounds).
- **No suggestions while typing:** "i wouldn't want a dropdown menu as i'm typing the answer, becauase i dont want to give users any free hints as to guesses. the list should be internal only". This changes a game rule, not only the look; see D15.

## Offbeat concept: the ridge (draft, from D16)
Everything below is a draft for the human to change; only the D16 choice itself is decided.

**The story.** "Offbeat" read as *off the beaten path*. Each day the player's character climbs a trail along a cliff edge with 7 stops. The host has walked this trail many times and worn some stones smooth: the common answers. At each stop the player plants a sign with their answer. A worn stone gives way under it, so matching the host's answer means the ledge crumbles and the character falls off the path. The 7 stops climb higher and the drop gets deeper, which shows the rising difficulty (DECISIONS.md, Game 1). Reaching the top after stop 7 is a full run.

**How it maps to the rules.**
| Rule (DECISIONS.md, Game 1) | On the ridge |
|---|---|
| 7 fixed questions, same order for everyone | 7 stops on one trail; everyone climbs the same ridge |
| Rising difficulty | Each stop is higher, with a deeper drop |
| Name an answer the host didn't | Plant your sign; the host's sign is revealed on its worn stone |
| Matching ends the run (sudden death) | The ledge crumbles and you fall at that stop |
| Host answers shown only after you answer | The host's sign appears only at the reveal |
| k points for stop k | Shown at each stop (D9) |

**The word.** The player's typed word is painted on a sign they plant at each stop. The sign is the word container: its frame is the slot for collectible borders (M10). Like Krillion's word, the sign reacts: it wobbles in the wind higher up and shakes while the ledge is deciding.

**Typing (D15).** A plain answer box with no suggestions. The word paints onto the sign as it's typed, with a gliding caret like monkeytype's. What happens with typos and unknown words is D15's ticket.

**Friends (M06, after you've played).** One ridge for everyone. Friends' characters stand at the stop they reached; friends who got caught sit in the clouds under the stop where they fell; a crowd at one stop stacks with a count. Each friend's character is told apart by its cosmetic (scarf colour in the draft) and a name tag, never by colour alone.

**Share card (M05).** The ridge in miniature with the stop where you fell marked; text version e.g. `▲▲▲▲✕△△ 4/7`.

**Animations it needs** (timings are D20): idle (character breathing, wind, drifting clouds); the word painting onto the sign as typed; planting the sign; the reveal (ground rumbles, sign shakes more at higher stops); safe (dust settles, the host's sign appears, the character climbs to the next stop); caught (ledge crumbles, the character and sign fall into the clouds); the top (flag, full run); friends appearing on the ridge.

**Pixel art it needs** (D14 decides how it's made): the player character (idle, walk or hop, plant, fall, cheer); the host (D19); signs (blank and painted) and sign frames (M10); the trail and cliff tiles, including a crumbling ledge; sky and far peaks in layers, clouds; the top flag; a share card frame. Plor's home borrows some of this style (D5).

**Mockup:** the canvas page "Round 3 · the ridge" (`docs/design/m12/R3-ridge.dc.html`) shows stop 4 while typing, a safe reveal, the fall at stop 5, the friends' ridge and the share card. The pixel art there is a placeholder drawn in code, not a proposal for the final art. Colours borrow round 2's tile 4 (blue, red, black); the question uses tile 1's serif headline (Young Serif); the sign uses a pixel font (Pixelify Sans) like the Krillion screenshot. All are placeholders (D3, D4).

## Round 4: first PixelLab art (2026-10-20)
The human OK'd a first small set at 64×64 px sprites, about 11–12 generations (human, 2026-10-20: "sure, tryit"). 64 px is a trial size picked because it's PixelLab's cheapest unit (a 64×64, 8-frame animation is 1 generation, per the `animate_image` tool description), not a D20 answer. The account is on PixelLab's trial: 40 generations, one job at a time (`get_balance` and the rate-limit error, 2026-10-20).

Shown on the canvas page "Round 4 · PixelLab art" (`docs/design/m12/R4-pixellab.dc.html`): three goats, two trail scenes, two blank signs, each sign also with a word painted on as page text in Pixelify Sans. The images live only in the Artifact's asset store, not in git, until the human approves each one.

**Generated assets** (all PixelLab MCP, 2026-10-20, 1 generation each as charged):
| Asset | Tool | Prompt (short) | Seed | Size | Artifact asset id | Status |
|---|---|---|---|---|---|---|
| Goat A | `create_image_pixen` | small white goat, grey horns, red scarf, side view | 11 | 64×64 | 6deb5d78520abc03f8b0250fbf31ed40 | not approved: too high-res (human, 2026-10-20) |
| Goat B | `create_image_pixen` | fluffy cream goat kid, beard, red knitted scarf | 27 | 64×64 | c09018a1fd7a701021eb99f1a6335c60 | not approved: too high-res (human, 2026-10-20) |
| Goat C | `create_image_pixen` | round goat, big curled horns, red scarf in the wind | 42 | 64×64 | 54e0c94cc83be8e6f8bd055d2f8d4e50 | not approved: too high-res (human, 2026-10-20) |
| Trail A | `create_image_pixen` | trail along a cliff edge, cream path, navy rock, cloud sea | 5 | 384×192 | e9abbe06293193199389915da4036c4f | not approved: too high-res, but the human likes its angle (human, 2026-10-20) |
| Trail B | `create_image_pixen` | ledge path along a cliff edge, clouds below, misty peaks | 19 | 384×192 | 3ee00aa86167b9ebccce82b094f7ef11 | not approved: too high-res (human, 2026-10-20) |
| Sign A | `create_image_pixen` | blank cream board in a dark wooden frame on a post | 8 | 64×64 | 59fbcf478e7c81094a60e85d5017ead9 | not approved: too high-res (human, 2026-10-20) |
| Sign B | `create_image_pixen` | blank weathered plank on a stake | 31 | 64×64 | 1bc9b29c6ffe52598d628dea7aa7a93a | not approved: too high-res (human, 2026-10-20) |

**Round 4 result (human, 2026-10-20):** "everything from the goats to the signs to the path is far too high-res for my liking", but the human likes "the angle or perspective of the path" (trail A, seen from behind as it winds away). "maybe the pixellab tool is not the right fit for the job" (D14 reopened). Wants to explore "instead of side view a 1st or 3rd person perspective". None of the seven assets is approved; the animations planned above are on hold.

## Round 5: camera sketches (2026-10-20)
The human chose: free code-drawn sketches of both camera views first, then a small low-res PixelLab test (about 2 generations) on the one they prefer (human, 2026-10-20). On the canvas page "Round 5 · camera sketches" (`docs/design/m12/R5-camera.dc.html`), each camera shows typing at stop 4 and getting caught at stop 5:
- **3rd person, behind the goat:** the path winds away up the ridge (Round 4 trail A's angle); the next stops and the top flag are ahead; the player's sign stands beside the path; caught, the landing breaks and the goat tumbles off the side.
- **1st person, the goat's eyes:** the player's sign stands big in the middle of the screen, so the word is the largest thing shown; the goat's front legs show at the bottom; caught, the view tips and the ground in front drops into the clouds. Friends (M06) would need a separate view.

The sketch grid cell (6 px) is the same as Round 3's and is not a D20 answer. No PixelLab generations were used.

**Camera (human, 2026-10-20):** 3rd person, behind the goat.

**Low-res PixelLab test (2026-10-20).** Hypothesis, written before running: at 128 × 72 px for the scene and 32 × 32 px for the goat (trial sizes, not D20), PixelLab draws chunky art close to the Round 3 sketch size when shown at 3×; if it still looks fine-grained or smooth when scaled up, that counts against PixelLab. Pro Flash, which can cap colours, was quoted at 5–6 generations an image (`get_pro_flash_capabilities`), so the test used `create_image_pixen` with "low detail" at 1 generation each. Shown below the sketches on the Round 5 page (`docs/design/m12/R6-lowres.dc.html`), on their own and put together in a stop 4 screen.
| Asset | Tool | Prompt (short) | Seed | Size | Artifact asset id | Status |
|---|---|---|---|---|---|---|
| Low-res trail | `create_image_pixen` | path winds up a ridge seen from behind, clouds both sides, chunky, few colours | 5 | 128×72 | 2c729c765e3f7f90b4ded2d72bce8fc1 | shown, awaiting the human |
| Low-res goat (back) | `create_image_pixen` | tiny white goat seen from behind, red scarf, chunky, few colours | 11 | 32×32 | 2113353e55704ee298d738ab93fc2435 | shown, awaiting the human |

PixelLab total so far: 9 of 40 trial generations.

## Decisions (for the human)
Nothing here is decided until the human answers. Answers get recorded as "human, <date>".

| # | Decision | Options shown | Answer (origin) |
|---|---|---|---|
| D1 | Which direction, or which mix (e.g. B's layout with A's share card)? | A, B, C, or a mix | |
| D2 | The words for the game's moments: survive, match the host, 7 of 7 | A: off the beat / off-key / full scale. B: safe / caught / all 7 cleared. C: dodged / caught / same as me | |
| D3 | Brand colours for Plor and for Offbeat | Placeholders only; needs the human's choice | |
| D4 | Fonts: a web font (which) or the phone's system font (no download) | Placeholders only | |
| D5 | How separate are Plor's look and Offbeat's? (Game 2 will have its own name and look.) | Shared frame with a per-game accent, or each game fully its own | Plor's home stays neutral but close to the games, sharing some of their pixel and animation style; each game gets its own stylized look (human, 2026-10-20). Still open: what, if anything, the games share (header, sign-in, share card frame) |
| D6 | Light, dark, or follow the phone's setting | A and B light, C dark | |
| D7 | Safe answer: its own moment with a "Next" tap (all mockups), or a line above the next question (today's UI) | | |
| D8 | Share (M05): image and text, or text only first; which symbols | See the table above | |
| D9 | Show points during the run (+k per question) before M08 adds the ledger, or only at the end | Mockups show "+4 points · 10 so far" | |
| D10 | Avatar shape and frame slot (M10 profile frames) | A and C round, B rounded square | |
| D11 | Accessibility source and numbers: pin WCAG 2.2 in SOURCES.md? Contrast ratios and the tap-target size are human numbers until then | | |
| D12 | Smallest phone width to support | Mockups are 390 px wide (the design tool's default phone size); no minimum chosen | |
| D13 | Does the host have a face or name (C)? | C shows a circle marked "H" | |
| D14 | Pixel art: made with PixelLab, drawn by hand, or bought; who owns the assets, and what it costs | PixelLab suggested by the human (2026-10-20). Read 2026-10-20, to pin in SOURCES.md if chosen: PixelLab's Terms of Service say you own what you make and may use it commercially, but not to train other models, and they link the Open RAIL-M license (not yet read). The pricing page didn't load its plans; signup offers a free trial with no card. Search results say PixelLab runs an official MCP server at `api.pixellab.ai/mcp` that uses a token from your account (*unverified* on PixelLab's own MCP page, which only redirected). The token stays in the human's own Claude config, never in chat or the repo (CLAUDE.md, Security), and generated assets stay out of the repo until the human approves each one | PixelLab, to try first: the human signed up and connected its MCP server, and asked for it to be added to SOURCES.md (human, 2026-10-20). Asset ownership terms still need the Open RAIL-M license read |
| D15 | No suggestions while typing (human, 2026-10-20). The player types free text and the server alone matches it to the list. Open: what happens to a typo or an answer that isn't in the list (today: "did you mean" and a no-penalty "not in our list yet"; both can hint at the list); what the player sees before locking in | Needs a DECISIONS.md change (Answer model: the accepted bank is sent to the client for autocomplete) and changes to M02 code, the network message (entry ID → text) and the security of the bank. That's its own ticket, not M12 | |
| D16 | Offbeat's concept and theme (what the 7 steps are, what the word sits in, what happens when you match the host) | Trail, spotlight, out of tune, descent (proposed in chat, 2026-10-20) | "Go with the trail along a cliff edge: friends fall off at the stop where they got caught" (human, 2026-10-20). Worked out below in "Offbeat concept: the ridge"; the details there are drafts |
| D17 | Where a caught player lands, and how soft it should feel | The draft lands them in the clouds below, unhurt | |
| D18 | The player's character | The draft uses a small mountain goat (no skin tones to choose; friends differ by scarf colour, a slot for M10 cosmetics) | |
| D19 | The host's character | The draft uses a raven circling above the ridge | |
| D20 | Pixel size, sprite sizes and animation timings | None chosen; human numbers (or the artist's), not set by the mockups | |

## Acceptance criteria
For this draft (exploration):
- [ ] The mockups show all 7 screens in each direction (open the Artifact link above).
- [ ] The human has answered D1–D13; each answer is in the table with "human, <date>".

For M12 itself (written now so they don't get lost; refined when M12 starts):
- [ ] The chosen look is built into `src/app/` with no change to game logic or network messages (`git diff --stat` touches only UI files).
- [ ] Every text and background colour pair passes the contrast ratio chosen in D11, checked by a script (`npm run …`, to be named), not by eye.
- [ ] No state is shown by colour alone (checked per screen in the review).
- [ ] Every tap target meets the size chosen in D11.
- [ ] Each screen in the list above is checked at the width chosen in D12, with screenshots in Evidence.

## Out of scope
- App code (`src/`, `supabase/`, `scripts/`) until M12 starts or the human moves it earlier.
- Building the share feature (M05), friends (M06), comments (M07), leaderboards (M08), the front page (M09) and cosmetics (M10). The mockups only leave room for them.
- Sound and animation. The music direction invites both; nothing is planned without the human.
- Game 2's look.

## Numbers
| Value | Used for | Origin (source section / person + date) |
|---|---|---|
| 7 questions | Progress marks | DECISIONS.md, Game 1 (human, 2026-10-18) |
| k points for question k | "+4 points · 10 so far", "28 points" | DECISIONS.md, Game 1, Scoring (human-accepted, 2026-10-17) |
| 4.5:1 text, 3:1 non-text contrast | Mockup colour checks | WCAG 2.2 from memory: *unverified*; needs D11 |
| 44 px minimum tap height | Mockup buttons and rows | The design tool's guideline; *not a project source*; needs D11 |
| 390 × 844 px phone frame | Mockup size | The design tool's default phone size; needs D12 |
| 16 px input text | Mockup inputs | Already in `src/app/globals.css` (stops iOS zooming into inputs) |

## Plan
1. Done: read the ROADMAP rows, DECISIONS.md Game 1 and the current UI; draft this ticket; make three directions as one Artifact canvas.
2. Now: the human compares the directions and answers D1–D13 (in chat or as comments on the Artifact).
3. Iterate on the chosen direction: mock the remaining screens (username, lock-in, did-you-mean, errors, loading), dark or light per D6.
4. When M12 starts (or is moved earlier): write the design tokens and restyle `src/app/`, fill in Source diff, Evidence and Review.

## Removes
This draft adds one docs file and removes nothing: it is new work with no earlier version. When M12 is built, the plain styles in `src/app/globals.css` are replaced, not kept beside the new ones.

---
*Fill in the sections below at the end.*

## Source diff
| Source says | We built | Why different |
|---|---|---|

## Evidence

## Review
- Blocking findings and how each was fixed:
- Deferred to ROADMAP "Next revision":
