// Every tunable number, each with its origin (DECISIONS.md: Config and tunables).

// Origin: human, 2026-10-18 (docs/milestones/M01-puzzle-content.md, Numbers).
export const QUESTIONS_PER_DAY = 7;

// Username length (human, 2026-10-18; docs/milestones/M02-sign-in-and-play.md, Numbers). The database's check
// constraint profile_username_format enforces it; src/lib/profile.db.test.ts checks the two agree (M02 2f, B6).
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
// A username changes at most once every this many days, the first change at once (human, 2026-10-23,
// docs/milestones/M12-account.md, A2). The trigger in supabase/migrations/20261023083041_username_change.sql enforces
// the same 30: supabase/tests/profile.test.sql checks it on both sides, and src/lib/profile.db.test.ts that the two agree.
export const USERNAME_CHANGE_DAYS = 30;

// Display name length (human, 2026-10-21; docs/milestones/M07-friends-and-live-board.md, D1). The database's check
// constraint profile_display_name_format enforces it; src/lib/profile.db.test.ts checks the two agree.
export const DISPLAY_NAME_MAX_LENGTH = 24;

// Invite code size: 16 random bytes, written as 22 base64url characters (human, 2026-10-21;
// docs/milestones/M07-friends-and-live-board.md, D3). The database's check friend_invite_code_format holds the same
// 22 characters; the friends route test issues a real code through it.
export const INVITE_CODE_BYTES = 16;

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

// Points for surviving each question, Q1 to Q7 (the ladder): they rise with each harder question in growing jumps, to
// 1000 for all seven (human, 2026-10-21; M04 G1). Replaces k points for question k. The rarity bonus comes on top.
export const POINTS_PER_QUESTION = [25, 50, 75, 100, 150, 250, 350];

// The rarity bonus (human, 2026-10-22; docs/milestones/M09-points-and-leaderboard.md, Numbers N1–N5). Changing one
// changes days settled afterwards; ledger rows already written keep their bonus.
// N5: the share of players expected to give a host-bank answer; the host bank is the "common" tier (D11).
export const HOST_BANK_EXPECTED_SHARE = 0.5;
// N1: the expectation weighs as this many players against a day's real counts.
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

