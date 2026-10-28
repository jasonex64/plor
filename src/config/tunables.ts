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

// Stolen letters, schedule A (human, 2026-10-21, G8; docs/milestones/M04-game-mechanics.md, "Rules to build", rule 4):
// the tier the Wind steals from at each question, or null for no theft. Tiers are the M04 ticket's measured grouping
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
