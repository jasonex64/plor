// Every tunable number, each with its origin (DECISIONS.md: Config and tunables).

// Origin: human, 2026-10-18 (docs/milestones/M01-puzzle-content.md, Numbers).
export const QUESTIONS_PER_DAY = 7;

// How many answers the host names at each question, Q1 to Q7, drawn at random from the host bank (human, 2026-10-24:
// "1 1 1 1 2 2 3", "Random from the host bank"; docs/milestones/M13-13c-rarity-and-the-host.md). The validator holds
// every day to it, drafted or written by hand.
export const HOST_ANSWERS_PER_QUESTION = [1, 1, 1, 1, 2, 2, 3];
// The fewest familiar answers (common or uncommon in the day's levels) a question must leave typeable past the stolen
// letters and safe from the host (human, 2026-10-24: "3", M13 Numbers; "Typeable and safe (Recommended)", 13c; M04 G9).
// scripts/draft.ts picks letters by it; private.approve_puzzle checks the same 3 (supabase/tests/puzzle_entry.test.sql).
export const FAMILIAR_SAFE_MIN = 3;
// The share of players each question would catch on a "Gentle" day, Q1 to Q7 (human, 2026-10-24, M13 Numbers: "Gentle:
// 3→20%, ~45% finish"). Only shown next to a draft's expected catch rates (13c: "Show, never warn (Recommended)").
export const CATCH_TARGETS = [0.03, 0.05, 0.07, 0.1, 0.13, 0.16, 0.2];
// The fewest days between two uses of a category (human, 2026-10-24, M13 D7: "not saying it should be EXACTLY 30 days just
// at least 30 days"; 13d: "Same category (Recommended)"). npm run draft picks by it and content:validate checks it.
export const REPEAT_GAP_DAYS = 30;

// Username length (human, 2026-10-18; docs/milestones/M02-sign-in-and-play.md, Numbers). The database's check
// constraint profile_username_format enforces it; src/lib/profile.db.test.ts checks the two agree (M02 2f, B6).
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
// A username changes at most once every this many days, the first change at once (human, 2026-10-23,
// docs/milestones/M12-account.md, A2). The trigger in supabase/migrations/20261028140000_baseline.sql enforces
// the same 30: supabase/tests/profile.test.sql checks it on both sides, and src/lib/profile.db.test.ts that the two agree.
export const USERNAME_CHANGE_DAYS = 30;

// Display name length (human, 2026-10-21; docs/milestones/M07-friends-and-live-board.md, D1). The database's check
// constraint profile_display_name_format enforces it; src/lib/profile.db.test.ts checks the two agree.
export const DISPLAY_NAME_MAX_LENGTH = 24;

// Invite code size, for friends and groups: 10 base64url characters, 60 random bits (human, 2026-10-26: "10 characters
// (Recommended)"; docs/milestones/M14-14b-3-invite-button.md, answer 5; 22 from M07 D3 before). The database's checks
// friend_invite_code_format and player_group_invite_code_format hold the same 10; the friends and groups route tests
// issue real codes through them.
export const INVITE_CODE_LENGTH = 10;

// Groups (human, 2026-10-22; docs/milestones/M10-groups.md, G11): a name follows the display name rule, up to 24
// characters; 50 members per group and 10 groups per player. The database judges all three (player_group_name_format
// and private.group_member_guard); the groups route test sends each limit through it.
export const GROUP_NAME_MAX_LENGTH = 24;
export const GROUP_MAX_MEMBERS = 50;
export const GROUPS_PER_PLAYER = 10;

// Comment length (human, 2026-10-22; docs/milestones/M08-comments-and-reactions.md, D1). The database's check
// constraint comment_body_format enforces it; the comments route test posts both lengths through it.
export const COMMENT_MAX_LENGTH = 280;

// The reaction set, in the order the page shows it (human, 2026-10-22; docs/milestones/M08-comments-and-reactions.md,
// D3). The database's check constraint reaction_emoji holds the same five; the reactions route test sends each one
// through it.
export const REACTIONS = ["👍", "😂", "😮", "😢", "❤️"] as const;

// "Where everyone ended": how many friends are named per place before "+ k more" (human, 2026-10-21;
// docs/milestones/M07-friends-and-live-board.md, D2).
export const FRIENDS_PER_PLACE = 3;

// Typo auto-correct on typed answers: one typo forgiven, only for text of 4+ letters (human, 2026-10-19, for
// "did you mean"; auto-correct instead of a prompt, human, 2026-10-21; docs/milestones/M04-game-mechanics.md).
export const TYPO_MAX_EDITS = 1;
export const TYPO_MIN_LETTERS = 4;

// Learning from misses (human, 2026-10-24; docs/milestones/M13-answer-lists-and-content.md, D4): a text becomes an
// answer once at least this many distinct players typed it for a category, and at least this share (in percent) of the
// players who answered the category's questions. private.record_miss applies both.
export const MISS_ACCEPT_MIN_PLAYERS = 3;
export const MISS_ACCEPT_SHARE_PERCENT = 1;

// Points for surviving each question, Q1 to Q7 (the ladder): they rise with each harder question in growing jumps, to
// 1000 for all seven (human, 2026-10-21; M04 G1). Replaces k points for question k. The rarity bonus comes on top.
export const POINTS_PER_QUESTION = [25, 50, 75, 100, 150, 250, 350];

// The rarity bonus (human, 2026-10-22; docs/milestones/M09-points-and-leaderboard.md, Numbers N1–N4). Changing one
// changes days settled afterwards; ledger rows already written keep their bonus.
// The first guess (human, 2026-10-24, M13 D5: "40 / 40 / 20"; replaces M09's N5): the share of players expected to give
// some common, uncommon or rare answer to a question, before play has counted any.
export const FIRST_GUESS_SHARES = { common: 0.4, uncommon: 0.4, rare: 0.2 } as const;
// N1: the first guess weighs as this many players against the pooled counts.
export const RARITY_EXPECTATION_WEIGHT = 10;
// N4: a question's real counts are used once at least this many players answered it (as INSIGHTS_MIN_PLAYERS).
export const RARITY_MIN_PLAYERS = 5;
// N2: an answer earns up to this fraction of its question's points, shrinking to 0 at RARITY_ZERO_SHARE of players.
// Up to half keeps the human's rule without the cap ever cutting: getting further always beats rarer answers.
export const RARITY_BONUS_FRACTION = 0.5;
export const RARITY_ZERO_SHARE = 0.2;
// N3: the most bonus a perfect run can earn (a missed question caps the others).
export const PERFECT_RUN_BONUS_CAP = 500;

// How many players gave each of your answers (docs/milestones/M11-home-screen.md, H5, Numbers): a question's share
// shows once at least this many players answered it; fewer is "too few players yet" (human, 2026-10-22).
export const ANSWER_SHARE_MIN_PLAYERS = 5;

// A question's answer search (docs/milestones/M14-14b-12-answer-lists.md, Numbers): the matches shown at once, and for
// an empty box (human, 2026-10-30: "10").
export const ANSWER_SEARCH_LIMIT = 10;

// Stolen letters, schedule A (human, 2026-10-21, G8; docs/milestones/M04-game-mechanics.md, "Rules to build", rule 4):
// the tier a letter is taken from at each question, or null for none. Tiers are the M04 ticket's measured grouping
// (the share of a category's answers one letter removes): medium C P H U B D M G; heavy consonants R N L T S; vowels
// E A I O.
export const LETTER_TIERS = { medium: "cphubdmg", heavy_consonant: "rnlts", vowel: "eaio" } as const;
export const LETTER_SCHEDULE: (keyof typeof LETTER_TIERS | null)[] = [null, "medium", null, "medium", "heavy_consonant", null, "vowel"];

// Puzzle insights report (human, 2026-10-19; docs/milestones/M03-puzzle-insights.md, Numbers).
// A question's catch rate counts once this many players answered it; fewer is shown as "too few".
export const INSIGHTS_MIN_PLAYERS = 5;
// A later question that catches at least this many percentage points fewer players than an earlier one breaks the
// day's gently rising shape (DECISIONS.md: Game 1).
export const INSIGHTS_SHAPE_DROP_POINTS = 10;
// How many of a question's most common answers the report lists.
export const INSIGHTS_TOP_ANSWERS = 5;

// The answer database's imports (docs/milestones/M13-13a-the-base.md; scripts/base.ts).
// BASE_REVIEW_SAMPLE: random members shown in an import's review (human, 2026-10-24: "Summary + flags (Recommended)",
// whose text said 20 random samples). BASE_BATCH_IDS: Wikidata IDs one query asks about (the children of these taxa,
// their names), as the import reads the animal tree by key (13e-4c; human, 2026-10-26: "5,000 (Recommended)", after
// 5,000 took 3.3 s and 2.1 s against the query service's 60 s limit).
export const BASE_REVIEW_SAMPLE = 20;
export const BASE_BATCH_IDS = 5_000;
// The places 13b's facts check knows: Wikidata items with a population figure of at least this many people (human,
// 2026-10-24: "100,000+ people (Recommended)"; docs/milestones/M13-13b-learning-from-misses.md).
export const BASE_PLACES_MIN_POPULATION = 100_000;
// The fewest members a category may have: `npm run base -- review` flags any under it (human, 2026-10-24: "10 members";
// docs/milestones/M13-13e-growing-the-categories.md).
export const CATEGORY_MIN_MEMBERS = 10;
// A video game counts as well known with Wikipedia articles in at least this many languages (Wikidata sitelinks; human,
// 2026-10-27: "10+ languages (Recommended)"; docs/milestones/M13-13e-6-pop-culture.md).
export const BASE_VIDEO_GAME_MIN_SITELINKS = 10;

// Sign-in code limits (human, 2026-10-23; docs/milestones/M12-12e-sign-in-limits.md, N1–N4), counted per hashed key
// by private.take_auth_attempt. A code lasts an hour (SOURCES.md, Supabase email sign-in), so the checks per address
// are counted over the same hour, and sending a new code clears them.
export const AUTH_LIMITS = {
  // N1: code emails per player IP.
  send_ip: { limit: 5, windowSeconds: 60 * 60 },
  // N2: code emails per email address.
  send_email: { limit: 5, windowSeconds: 60 * 60 },
  // N3: code checks per player IP.
  check_ip: { limit: 30, windowSeconds: 5 * 60 },
  // N4: wrong codes per address before a new code is needed; a check is counted before Auth says whether it's right.
  check_email: { limit: 5, windowSeconds: 60 * 60 },
} as const;


// Offbeat's game screen (docs/milestones/M14-14a-2b-game-screen.md, Numbers): the chart of questions survived covers
// today and the days before it, this many in all (human, 2026-10-24, M14 L35: "Last 7 days chart").
export const STATS_CHART_DAYS = 7;

// The Me tab (docs/milestones/M14-14a-3a-me.md, Numbers): how many of the player's rarest answers it shows, from closed
// days (human, 2026-10-25: "3, from closed days (Recommended)").
export const RAREST_ANSWERS_SHOWN = 3;

// The streak's ranks (docs/milestones/M14-14b-2a-streak-ranks.md, Numbers): the first day of each, Seed to Sakura. 1, 5,
// 15 and 30 are L26's stages (human, 2026-10-24: "1–4 sprout, 5–14, 15–29, 30+"); 90 is the human's sakura (2026-10-26:
// "sakura blossom (3 months)", "90 days (Recommended)").
export const STREAK_RANK_FROM = [0, 1, 5, 15, 30, 90] as const;

// Comments and reactions show at once and are sent when the toast's window ends, unless undone
// (docs/milestones/M14-14b-6-feel-and-polish.md, 14b-6b; human, 2026-10-27: "5 seconds").
export const UNDO_SECONDS = 5;

// Game 2's dictionary (docs/milestones/M16-16a-the-dictionary.md). DICTIONARY_MAX_SIZE: the rarest words it takes, the
// English Speller Database's size (human, 2026-11-05: "About 239,000 words (Recommended)"). DICTIONARY_MIN_LETTERS: the
// shortest word (human, 2026-11-05: "3 letters or more (Recommended)").
export const DICTIONARY_MAX_SIZE = 85;
export const DICTIONARY_MIN_LETTERS = 3;
// A word is everyday from this size down, which is what keeps a round fair: players never see it (human, 2026-11-06,
// M16 S21: the everyday list, "Yes, use that").
export const DICTIONARY_EVERYDAY_SIZE = 35;

// A day of game 2 (docs/milestones/M16-16c-a-day-of-game-2.md, Numbers). Each round's letters and how many dictionary
// words hold its set (human, 2026-11-06, S18: "2, 2, then five of 3 (Recommended)", "steady climb"). A band holds its
// lower number and not its upper, as the human's bands touch (Claude's reading, in the ticket).
export const SUBSTRING_ROUNDS = [
  { letters: 2, atLeast: 5000, below: Infinity },
  { letters: 2, atLeast: 2000, below: 5000 },
  { letters: 3, atLeast: 1000, below: 2000 },
  { letters: 3, atLeast: 500, below: 1000 },
  { letters: 3, atLeast: 300, below: 500 },
  { letters: 3, atLeast: 200, below: 300 },
  { letters: 3, atLeast: 100, below: 200 },
] as const;
// The fewest everyday words a set must have (human, 2026-11-06, S21: "At least 5 (Recommended)").
export const SUBSTRING_EVERYDAY_FLOOR = 5;
// The fewest days between two uses of a set (human, 2026-11-06, S18: "30 days (Recommended)").
export const SUBSTRING_REPEAT_GAP_DAYS = 30;
// Days one draft makes (human, 2026-11-07: "7 days (Recommended)").
export const SUBSTRING_BATCH_DAYS = 7;
// Sample words each round shows in the PR's table (human, 2026-11-07: "4 words (Recommended)").
export const SUBSTRING_SAMPLE_WORDS = 4;

// Game 2's score (docs/milestones/M16-16e-points-and-boards.md, Numbers). Each part grows by `growth` a step from
// `points` at `at`: a word by its letters, about 25% a letter (human, 2026-11-07: "kinda like 25 percent but round"),
// and the run's different letters at its end, about 15% a letter ("15, but again round to nice numbers"). The sizes,
// and the bonus letter's points for each word holding it, are Claude's so a typical run splits about a third each,
// approved with their tables and worked runs ("Approve these sizes").
export const SUBSTRING_WORD_POINTS = { at: 3, points: 20, growth: 1.25 } as const;
export const SUBSTRING_LETTERS_POINTS = { at: 18, points: 350, growth: 1.15 } as const;
export const SUBSTRING_BONUS_LETTER_POINTS = 120;

// Players a day of a game needs before "Better than X% of players" shows (human, 2026-11-07: "10 players";
// docs/milestones/M16-16e-points-and-boards.md, answer 16). A smaller day still counts on the boards (answer 17).
export const PERCENTILE_MIN_PLAYERS = 10;

// Afterglow's look and motion (docs/milestones/M14-14c-6-afterglow-in-play.md): each value moved unchanged from the
// approved mock, RIFF-mocks `themes/festival/game.js` at fcc11e4 (docs/milestones/M14-14c-5-firework-festival.md, its
// Numbers), with the origin it gave there; "proposed" values are Claude's, approved with the look in 14c-5 and still
// open to the human. Units: art pixels, seconds, or parts of the screen, as each says. The art's colours stay with the
// art in src/afterglow/scene.ts (DECISIONS.md, Styling: drawn art keeps its own colours).
export const AFTERGLOW = {
  // human, 2026-11-05 (ticket 14c-4, answer 9)
  FPS: 60,
  // proposed, ticket 14c-5: how early a screen's frame may come and still be drawn, so a 60 Hz screen's jitter skips nothing
  FRAME_SLACK_MS: 1,
  // ticket 14c-5: art rows on a tall and a wide screen
  REF_TALL: 633,
  REF_WIDE: 540,
  // proposed, ticket 14c-5: art pixels from the screen's edge
  EDGE: 6,
  // proposed, ticket 14c-5: the box's top, as a part of the height
  PROMPT_Y: .24,
  // proposed, ticket 14c-5: the box's width at type scale 1, in CSS px
  PROMPT_W: 230,
  // proposed, ticket 14c-5: when the sparks grow and the box shakes
  LATE_SECONDS: 5,
  // proposed, ticket 14c-5: the cord's thickness at type scale 1 in CSS px, and never under this many art pixels
  FUSE_CSS: 3,
  FUSE_MIN: 4,
  // proposed, ticket 14c-5: the prompt pill's corner at type scale 1, in CSS px
  PROMPT_R: 18,
  // proposed, ticket 14c-5: art pixels in each step of a pill's corner
  PILL_STEP: 2,
  // proposed, ticket 14c-5: art pixels along the cord for one turn of its twist
  TWIST: 8,
  // proposed, ticket 14c-5: art pixels of still-glowing cord behind the spark
  FUSE_HOT: 20,
  // proposed, ticket 14c-5: the burning head's arm in art pixels, before and at the end of the last seconds
  SPARK_EARLY: 5,
  SPARK_LATE: 13,
  // proposed, ticket 14c-5: the head's stepped glow, in art pixels
  HEAD_GLOW: 13,
  // proposed, ticket 14c-5: sparks spraying from the head, likewise
  FLY_EARLY: 10,
  FLY_LATE: 30,
  // proposed, ticket 14c-5: how far they fly, in art pixels, and how long they last
  FLY_REACH: 18,
  FLY_LIFE: .5,
  // proposed, ticket 14c-5: sparks spat all along the unburnt cord, before and at the end
  SPIT_EARLY: 26,
  SPIT_LATE: 60,
  // proposed, ticket 14c-5: how far out they spit, and how long they last
  SPIT_REACH: 13,
  SPIT_LIFE: .42,
  // proposed, ticket 14c-5: the box's shake, in whole art pixels, and how often it steps
  SHAKE_MAX: 2,
  SHAKE_HZ: 14,
  // proposed, ticket 14c-5: clouds wander this many art pixels each way, over this many seconds
  CLOUD_DRIFT: 18,
  CLOUD_PERIOD: 90,
  // proposed, ticket 14c-5: the part of the climb in which they come back to centre
  CLOUD_HOME: .1,
  // proposed, ticket 14c-5: how often a lit lantern may change, and how many are bright at once
  FLICKER_HZ: 7,
  FLICKER_SHARE: .3,
  // proposed, ticket 14c-5: rising sparks at full light, their seconds, their art pixels
  IDLE_SPARKS: 28,
  IDLE_SPARK_LIFE: 2.6,
  IDLE_SPARK_RISE: 46,
  // proposed, ticket 14c-5: the launched word's type at scale 1, in CSS px; set once per word and never changed
  WORD_SIZE: 42,
  // proposed, ticket 14c-5: the most of the screen's width the word may take
  WORD_MARGIN: .92,
  // proposed, ticket 14c-5: the word's centre at street level and in the sky
  CHARGE_Y: .64,
  BURST_Y: .36,
  // proposed, ticket 14c-5: seconds for the typed word to reach the front
  WORD_ENTER: .22,
  // proposed, ticket 14c-5: art pixels between the word and the ends of its pill
  BOX_PAD: 12,
  // proposed, ticket 14c-5: the rumble of word and box, in whole art pixels at full charge, and its steps per second at the start and end of the charge, so it tightens
  RUMBLE: { common: { amp: 2, hz: [7, 18] }, uncommon: { amp: 3, hz: [8, 23] }, rare: { amp: 4, hz: [9, 30] }, caught: { amp: 2, hz: [7, 11] } },
  // proposed, ticket 14c-5: the word sits down this many art pixels from this part of the charge, before it goes
  DIP: 5,
  DIP_FROM: .86,
  // proposed, ticket 14c-5: a better answer charges longer
  CHARGE_S: { common: .7, uncommon: 1.2, rare: 1.9 },
  // proposed, ticket 14c-5: sparks gathering at full charge
  CHARGE_SPARKS: { common: 14, uncommon: 26, rare: 44 },
  // proposed, ticket 14c-5 (answer 27): about a second longer than version 5, the same distance, sooner for a better answer
  CLIMB_S: { common: 3.7, uncommon: 3.3, rare: 2.9 },
  // proposed, ticket 14c-5: floors of tower between the street and open sky
  CLIMB_FLOORS: 30,
  // proposed, ticket 14c-5: the launch's ease in and its slowing to a hang
  CLIMB_IN: 2.2,
  CLIMB_OUT: 3,
  // proposed, ticket 14c-5: the part of the climb in which the word reaches its height in the frame
  WORD_RISE: .62,
  // proposed, ticket 14c-5: the sway, as a part of the screen's width: a better answer flies truer
  WOBBLE: { common: .2, uncommon: .12, rare: .05 },
  // proposed, ticket 14c-5: swings of the S-curve in a climb
  SWAY_TURNS: { common: 1.6, uncommon: 1.3, rare: 1 },
  // proposed, ticket 14c-5: the part of the climb after which the path is straight, hanging
  SWAY_END: .84,
  // proposed, ticket 14c-5: CSS px the box keeps from the screen's edge when it sways
  WORD_EDGE: 8,
  // proposed, ticket 14c-5: sparks blown out at takeoff, their seconds, and their reach as a part of the height
  BLAST_N: { common: 18, uncommon: 28, rare: 44 },
  BLAST_S: .5,
  BLAST_R: .2,
  // proposed, ticket 14c-5: the street jolts this many art pixels at takeoff, dying away over these seconds
  LAUNCH_SHAKE: 4,
  LAUNCH_SHAKE_S: .3,
  // proposed, ticket 14c-5: how far the view has risen, as a part of the height, when the tower has closed in from the screen's edges
  TOWER_IN: .22,
  // proposed, ticket 14c-5: the back strip's floors against the front's
  BACK_RATE: .6,
  // proposed, ticket 14c-5: how far the sky has slid by the top, as a part of the height, so it is slower and the clouds sit below
  SKY_END: .72,
  // proposed, ticket 14c-5: how far the cloud bank rises behind the street, as a part of the height, and the part of the climb it takes
  DECK_UP: .2,
  DECK_START: .12,
  // proposed, ticket 14c-5: points of the spark trail, and the seconds between them
  TRAIL_N: { common: 260, uncommon: 340, rare: 440 },
  TRAIL_STEP: .0035,
  // proposed, ticket 14c-5: its width in art pixels
  TRAIL_SPREAD: { common: 7, uncommon: 9, rare: 13 },
  // proposed, ticket 14c-5: its colours, tail to head, as steps of EMBER
  TRAIL_INK: { common: [2, 3, 4], uncommon: [3, 4, 5], rare: [4, 6, 7] },
  // proposed, ticket 14c-5
  BURST_S: { common: 2.1, uncommon: 2.5, rare: 3.6 },
  // proposed, ticket 14c-5: seconds to open
  BLOOM_S: { common: .55, uncommon: .7, rare: 1.1 },
  // proposed, ticket 14c-5: radius at the fewest and the most points, as a part of BURST_ROOM
  BURST_R: [.22, .62],
  // proposed, ticket 14c-5: a burst's room is the smaller of these parts of the width and the height
  BURST_ROOM_W: .8,
  BURST_ROOM_H: .62,
  // proposed, ticket 14c-5: stars in each shape
  PEONY_N: 220,
  CHRYS_N: 52,
  WILLOW_N: 30,
  // proposed, ticket 14c-5: the chrysanthemum's inner ring
  CHRYS_RING: .5,
  // proposed, ticket 14c-5: how far the willow's tips fall, as a part of its radius
  WILLOW_DROP: 2,
  // proposed, ticket 14c-5: points along each willow strand, and where along its flight it starts
  WILLOW_TRAIL: 64,
  WILLOW_FROM: .18,
  // proposed, ticket 14c-5: the hanging glitter: sparks, seconds each lives, seconds after opening it starts, seconds to fill, twinkles per second, and fall as a part of the radius
  GLITTER_N: { common: 170, uncommon: 150, rare: 190 },
  GLITTER_LIFE: [1.6, 3.4],
  GLITTER_FROM: { common: .9, uncommon: 1.1, rare: 1.6 },
  GLITTER_IN: 1,
  GLITTER_HZ: 6,
  GLITTER_FALL: .12,
  // proposed, ticket 14c-5: a burst's glow, as a part of its radius, and the part of its life it lasts
  GLOW_R: .85,
  GLOW_FOR: .36,
  // proposed, ticket 14c-5: the glow's rings, outer to inner, as steps of EMBER
  GLOW: { common: [1, 1, 2], uncommon: [1, 2, 2], rare: [2, 2, 3] },
  // proposed, ticket 14c-5: seconds after the burst lands
  RESULT_AT: .7,
  COUNT_S: .9,
  BUTTON_AT: 1.6,
  // proposed, ticket 14c-5: a sky lantern's half-width by rarity
  LANTERN_R: { common: 4, uncommon: 6, rare: 9 },
  // proposed, ticket 14c-5: sky lanterns' float
  BOB_PX: 2,
  BOB_S: 3.4,
  // proposed, ticket 14c-5: the way down, longer before a major step
  DRIFT_S: { tiny: 2.7, major: 4.2 },
  // proposed, ticket 14c-5: floors of tower on the way down
  DESCENT_FLOORS: 2,
  // proposed, ticket 14c-5: the part of the descent at which the street is home; the walk runs on after it
  LAND_AT: .86,
  // proposed, ticket 14c-5: how far back the walk starts, as a part of the near layer's scale
  WALK_ZOOM: { tiny: .035, major: .17 },
  // proposed, ticket 14c-5
  WALK_PARALLAX: { street: .85, palace: .12, far: .45, near: 1, strings: 1.08 },
  // proposed, ticket 14c-5: lights coming on as you arrive
  ARRIVE_S: { tiny: .55, major: 1.3 },
  // human, 2026-11-05 (answer 1): the questions you reach by a long walk
  MAJOR: [3, 6],
  // proposed, ticket 14c-5: steps of the lights coming on, and the width of their edge
  LIGHT_STEPS: 14,
  LIGHT_BAND: .22,
  // proposed, ticket 14c-5: embers falling on the way down
  EMBERS: 70,
  // proposed, ticket 14c-5
  DUD_CHARGE_S: 1,
  DUD_LIFT_S: .55,
  DUD_FALL_S: .6,
  DUD_SMOKE_S: 1.1,
  // proposed, ticket 14c-5: how far it lifts, as a part of the height
  DUD_LIFT: .13,
  // proposed, ticket 14c-5: seconds of smoke before the end text
  TIMEUP_S: 1.7,
  // proposed, ticket 14c-5
  SMOKE_PUFFS: 16,
  SMOKE_LIFE: 1.5,
  SMOKE_RISE: 90,
  // proposed, ticket 14c-5: seconds for Q7's text to fade out, and again for the results to fade in
  RESULTS_FADE_S: .5,
  // proposed, ticket 14c-5: seconds before an ending's button
  OVER_BUTTON_AT: .9,
  // proposed, ticket 14c-5 (answer 34): the snuffed lantern. Seconds lowering, burning, sputtering and dropping; its half-width as parts of the width and the height; where it hangs
  LETTER_LOWER: .55,
  LETTER_BURN: .45,
  LETTER_SPUTTER: .5,
  LETTER_DROP: .5,
  LETTER_RX: [.26, .16],
  LETTER_Y: .4,
  // proposed, ticket 14c-5: its flicker steps per second, smoke puffs and dying sparks
  LETTER_FLICKER: 12,
  LETTER_SMOKE: 10,
  LETTER_SPARKS: 12,
  // proposed, ticket 14c-5: the struck letter's pop, in whole art pixels, and the seconds of each step
  POP_STEPS: [-5, -4, -3, -2, -1],
  POP_STEP_S: .07,
  // proposed, ticket 14c-5: pre-draw time per frame
  PREDRAW_SLICE_MS: 4,
  // The box's shake when it refuses input, a taken letter or (14c-6 answer 28) text that names no answer: whole art
  // pixels, then the milliseconds of each step (`refuse()` in the mock, proposed in 14c-5).
  REFUSE_STEPS: [2, -2, 1, 0],
  REFUSE_STEP_MS: 40,
} as const;
