-- The baseline (docs/milestones/M13-13g-migration-squash.md): the 48 migrations of M02 to M13 folded into one file
-- that builds the same database, schema, functions, grants, policies and settings alike, proven by comparing a stack
-- built from each (the ticket's Evidence). The human, 2026-10-26: squash "When M13 ends"; 2026-10-28: "By hand, by
-- area (Recommended)", "Squash only (Recommended)", "Drop them (Recommended)" (the roles riff_app and plor_publisher),
-- "Append-only again (Recommended)": from this file on, an applied migration is never edited (DECISIONS.md, Database
-- migrations). Their history is in git before this commit.
--
-- Each object is in its final form, with the comments of every definition it had, first to last: the first says what
-- it is for, the later ones what changed and why ("As 13b's, …" means as it was in 13b). The milestone and ticket
-- names in them say where each decision was made; "the … migration (git history, before the squash)" names a file
-- this one replaced.
--
-- Order: setup; tables by area, each with its later changes; constraints across tables; functions by area, each before
-- what calls it; the view; table and view privileges in the order the migrations gave them; triggers; policies; the
-- live board's realtime policy.

-- ====================================================================================================================
-- Setup: the private schema, privileges, extensions
-- ====================================================================================================================

-- Every role holds everything granted to PUBLIC on top of its own grants, so plor_app would otherwise
-- inherit Supabase's PUBLIC defaults. These are the revokes Supabase documents for custom roles
-- (supabase.com/docs/guides/troubleshooting/custom-role-inherits-privileges-that-were-not-explicitly-granted-ddaa1c).
-- CONNECT on the database is deliberately kept: revoking it breaks the Data API, Auth and Storage (same page).
revoke usage on schema public from public;

revoke temporary on database postgres from public;

alter default privileges for role postgres revoke execute on functions from public;

-- The player's profile, created at first sign-in before the first run (docs/milestones/M00-data-design.md §3).
-- Every game object lives in `private`, which the Data API doesn't expose; route handlers reach it as
-- plor_app (M00 data design, "Principles used throughout").
create schema private;

-- citext keeps uniqueness case-insensitive in the database itself (M00 data design §3: `username citext unique`).
create extension if not exists citext with schema extensions;

revoke all on schema private from public, anon, authenticated, service_role;

-- plor_app reads a profile and creates it once; usernames can't be changed or deleted in M02.
-- Account deletion (M07) removes it through the cascade from auth.users, which runs as the table owner.
grant usage on schema private to plor_app;


-- ====================================================================================================================
-- Tables: Accounts
-- ====================================================================================================================

create table private.profile (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username extensions.citext not null unique,
  created_at timestamptz not null default now(),
  -- 3-20 characters of a-z, 0-9 and _ (human, 2026-10-18; docs/milestones/M02-sign-in-and-play.md, Numbers).
  -- Cast to text first: citext's own regex match ignores case, which would let upper-case letters through.
  constraint profile_username_format check (username::text ~ '^[a-z0-9_]{3,20}$')
);

-- Backstop if the schema were ever exposed: RLS on with no policies, and nothing granted to the Data API roles.
alter table private.profile enable row level security;

-- M07 7a: an optional display name, shown to other players instead of the username, changeable any time
-- (docs/milestones/M07-friends-and-live-board.md, D1). The username stays the unique handle.
alter table private.profile add column display_name text;

-- 1 to 24 characters: letters in any script (accents included), digits, spaces and ' . _ -; no leading, trailing
-- or double spaces; stored in NFC so one name has one spelling (human, 2026-10-21, M07 D1). [[:alpha:]] accepted
-- Zoë, Łukasz and 名前 and refused emoji under the local stack's ICU en_US.UTF-8 locale (observed 2026-10-21);
-- that the hosted database's locale behaves the same is unverified until the migrations are pushed (M15).
alter table private.profile add constraint profile_display_name_format check (
  display_name is null or (
    char_length(display_name) between 1 and 24
    and display_name ~ '^[[:alpha:][:digit:] ''._-]+$'
    and display_name !~ '(^ | $|  )'
    and display_name is nfc normalized
  )
);

-- M12 12b: a player can change their username once every 30 days (docs/milestones/M12-account.md, A2; human,
-- 2026-10-23). Security change: plor_app may now update the username column, which it couldn't since M02 (DECISIONS.md
-- Log). The update policy on private.profile (the display name migration (git history, before the squash)) already covers it.

-- When the username last changed; null until the first change, so a wrong pick at sign-up can be fixed at once (A2).
alter table private.profile add column username_changed_at timestamptz;

-- M14 14a-3b: the player's two settings, saved on the account (docs/milestones/M14-14a-3b-settings.md): Skip the game
-- screen (L39: Play goes straight to question 1) and Numbers on the calendar (L46). Both off until the player turns
-- them on (L39's default; L46's "if u want"). Security change, approved by the human (2026-10-25: "Approve it
-- (Recommended)"; DECISIONS.md Log): plor_app may update these two columns, and the route names only the signed-in
-- player's row. The update policy on private.profile (the display name migration (git history, before the squash)) already covers it.
alter table private.profile
  add column skip_game_screen boolean not null default false,
  add column calendar_numbers boolean not null default false;

-- M14 14b-1: the player's theme, saved on the account (docs/milestones/M14-14b-1-themes.md; L20: "On the account").
-- 'device' follows the device's light or dark (Paper or Night); the others are the presets of L21. Security change,
-- approved by the human (2026-10-24: "Approve it (Recommended)"; DECISIONS.md Log): plor_app may update this column,
-- and the route names only the signed-in player's row. The update policy on private.profile
-- (the display name migration (git history, before the squash)) already covers it.
alter table private.profile
  add column theme text not null default 'device'
  constraint profile_theme check (theme in ('device', 'paper', 'night', 'sky', 'moonlit', 'ink'));

-- M12 12e: sign-in code limits per player IP and per email address (docs/milestones/M12-12e-sign-in-limits.md, L1 (a);
-- human, 2026-10-23). Our routes call Supabase Auth from the server, so Auth's per-IP limits count Vercel's address and
-- are shared by every player; these count each player before Auth is called. Security change (DECISIONS.md Log):
-- plor_app may execute the two functions below, and holds nothing on the table itself.

-- One row per attempt, kept only as long as its limit's window. Keys are SHA-256 hashes of an IP or an email address,
-- never the address itself (src/lib/auth-limits.ts; the privacy page says so).
create table private.auth_attempt (
  kind text not null,
  key text not null,
  at timestamptz not null default statement_timestamp(),
  constraint auth_attempt_kind check (kind in ('send_ip', 'send_email', 'check_ip', 'check_email')),
  constraint auth_attempt_key_hashed check (key ~ '^[0-9a-f]{64}$')
);

-- Counting a key's attempts, and clearing a kind's expired ones.
create index auth_attempt_key on private.auth_attempt (kind, key, at);

create index auth_attempt_at on private.auth_attempt (kind, at);

-- Backstop if the schema were ever exposed: RLS on, and no policy, since only the functions below touch the table
-- (DECISIONS.md, Row-level security in `private`).
alter table private.auth_attempt enable row level security;

-- M03 Puzzle insights: who may see the report, and what plor_app may read to build it
-- (docs/milestones/M03-puzzle-insights.md, D1 and D4; human, 2026-10-19). Security change, approved in principle by
-- the human; these exact grants are shown in the M03 PR.

-- Admins are a list of user IDs. The human adds a row once in Supabase's SQL editor (as postgres); no route
-- writes it, so plor_app may only read it.
create table private.admin (
  user_id uuid primary key references auth.users (id) on delete cascade,
  added_at timestamptz not null default now()
);

alter table private.admin enable row level security;


-- ====================================================================================================================
-- Tables: Days, runs and the ledger
-- ====================================================================================================================

-- §4: one row per published day. The content is a validated format-1 file (src/content/puzzle.ts); the
-- format number lives inside it, and nothing reads a hash or publish time, so neither is stored (M02 Removes).
create table private.puzzle (
  game_id text not null,
  puzzle_date date not null,
  content jsonb not null,
  primary key (game_id, puzzle_date),
  -- The file's own game and date must be its key, as its path must be (DECISIONS.md: Puzzle content format).
  constraint puzzle_content_matches_key check (content ->> 'game_id' = game_id and content ->> 'date' = puzzle_date::text)
);

-- Backstop (M00 data design): RLS on, nothing for the Data API roles. §7 also takes everything from service_role.
alter table private.puzzle enable row level security;

-- §5: one run per player per day, its date pinned when it starts (the start route inserts private.today()).
-- The foreign key to puzzle means no run exists for an unpublished day (ROADMAP item from M00 review).
create table private.run (
  user_id uuid not null references auth.users (id) on delete cascade,
  game_id text not null,
  puzzle_date date not null,
  started_at timestamptz not null default now(),
  primary key (user_id, game_id, puzzle_date),
  foreign key (game_id, puzzle_date) references private.puzzle (game_id, puzzle_date)
);

alter table private.run enable row level security;

-- §5: one row per answered question, append-only (§7).
create table private.run_event (
  user_id uuid not null,
  game_id text not null,
  puzzle_date date not null,
  question_idx smallint not null check (question_idx >= 0),
  entry_id text not null,
  matched boolean not null,
  created_at timestamptz not null default now(),
  primary key (user_id, game_id, puzzle_date, question_idx),
  foreign key (user_id, game_id, puzzle_date) references private.run (user_id, game_id, puzzle_date) on delete cascade
);

alter table private.run_event enable row level security;

-- M13 13c-4: reveal, then "Next" (G5, human, 2026-10-21; docs/milestones/M04-game-mechanics.md, "Rules to build",
-- rule 5). After an answer the player sees the reveal; the next question and its 20 seconds start only when they tap
-- Next. Question 1 still starts with the run (Start, run.started_at). Questions 2 to 7 start at a row here, so the
-- first timer's rule, "the previous answer starts the next question", no longer holds. A run waiting on the reveal has no
-- deadline and stays in progress.
-- New failure: OB006 not_open, an answer to a question that hasn't been opened with Next.

-- One row per question opened with Next, append-only like run_event (M00 data design §7).
create table private.question_open (
  user_id uuid not null,
  game_id text not null,
  puzzle_date date not null,
  question_idx smallint not null check (question_idx > 0),
  opened_at timestamptz not null default now(),
  primary key (user_id, game_id, puzzle_date, question_idx),
  foreign key (user_id, game_id, puzzle_date) references private.run (user_id, game_id, puzzle_date) on delete cascade
);

-- Backstop and grants, as for the other game tables (M02). Security change, approved by the human (DECISIONS.md Log, 2026-10-21: "Approve them"):
-- plor_app reads and inserts question_open (append-only) and runs the two functions.
alter table private.question_open enable row level security;

-- M09 9a: the points ledger (docs/milestones/M09-points-and-leaderboard.md; M00-data-design.md §6 and §7). Security
-- change: this table and plor_app's grants on it were approved by the human on 2026-10-22 (D7; DECISIONS.md Log).

-- One row per run, written once the run is finished and its day is closed (D9, D10), so the final rarity bonus is
-- known: points is the run's total (the question ladder plus the bonus) and bonus the bonus part. The leaderboard is
-- the sum of points. Append-only (§7): plor_app may only read and insert, and settling inserts with ON CONFLICT DO
-- NOTHING, so points are never awarded twice. A row belongs to its run (a stricter key than §6's auth.users one, with
-- the same account cascade through it).
create table private.points_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  game_id text not null,
  puzzle_date date not null,
  points integer not null check (points >= 0),
  bonus integer not null,
  created_at timestamptz not null default now(),
  unique (user_id, game_id, puzzle_date),
  foreign key (user_id, game_id, puzzle_date) references private.run (user_id, game_id, puzzle_date) on delete cascade,
  constraint points_ledger_bonus check (bonus between 0 and points)
);

-- DECISIONS.md, Row-level security in `private`: RLS on, nothing for the Data API roles, one policy per command
-- granted to plor_app. Which rows a request reads is decided by the route: the viewer's and their friends'.
alter table private.points_ledger enable row level security;


-- ====================================================================================================================
-- Tables: The answer base
-- ====================================================================================================================

-- M13 13a-1: the answer database's base (docs/milestones/M13-13a-the-base.md; M13 ticket D1, D3, D6). Things with a
-- permanent ID of Plor's own (D3 a), their names and aliases, facts linking them ("kind of", "member of"), categories
-- as recipes over those facts, and a log of every import. Security change (DECISIONS.md Log; D1 a, human,
-- 2026-10-24): the tables hold no grant for plor_app; imports run as the owner through private.import_source, and
-- plor_app may only execute private.base_lookup, which checks the caller is an admin (the admin browse page).

-- A thing: one answer, whatever names it goes by. name is its US English display name (human, 2026-10-24: "US
-- English"); a taxon with no English name keeps its scientific one and has no 'name' alias, so it can't be answered.
create table private.thing (
  id uuid primary key default gen_random_uuid(),
  name text not null check (name <> ''),
  created_at timestamptz not null default now()
);

-- DECISIONS.md, Row-level security in `private`: RLS on, and nothing for the Data API roles. plor_app has no grant
-- on these tables; it reaches them only through private.base_lookup.
alter table private.thing enable row level security;

-- Which entry in a source each thing came from (D3 a: Plor's IDs, linked to the source's own).
create table private.thing_source (
  source text not null check (source in ('wikidata', 'col', 'oewn', 'usda')),
  source_id text not null check (source_id <> ''),
  thing_id uuid not null references private.thing (id) on delete cascade,
  primary key (source, source_id)
);

create index thing_source_thing on private.thing_source (thing_id);

alter table private.thing_source enable row level security;

-- The names a thing can be typed as, normalized when written (src/content/puzzle.ts, normalize). kind says what the
-- alias is; origin who added it (D6 a: names from the sources, nicknames from the AI and players).
create table private.thing_alias (
  thing_id uuid not null references private.thing (id) on delete cascade,
  alias text not null check (alias <> ''),
  kind text not null check (kind in ('name', 'synonym', 'plural', 'scientific')),
  origin text not null check (origin in ('source', 'ai', 'players', 'human')),
  source_ref text,
  added_at timestamptz not null default now(),
  primary key (thing_id, alias)
);

-- Typed text is looked up by alias.
create index thing_alias_alias on private.thing_alias (alias);

alter table private.thing_alias enable row level security;

-- M13 13b: learning from misses (docs/milestones/M13-13b-learning-from-misses.md). A text enough players type for a
-- category becomes an answer from the next day on, unless the facts reject it, and the human audits every outcome.
-- Security change (DECISIONS.md Log; human, 2026-10-24: "I approve 13b's design, adding LDNOOBW to SOURCES.md, and its
-- security change (new miss-review tables; plor_app may run the one miss function; admin-only audit functions)"):
-- plor_app logs a miss only through private.record_miss, which may add to the base; the audit runs through admin-only
-- functions; the new tables hold no grant for plor_app.

-- Removal from a moment on: nothing is deleted, so a day that started before keeps what it had (13b design, 4).
alter table private.thing_alias add column removed_at timestamptz, add check (removed_at >= added_at);

-- A fact links two things: "polar bear kind_of bear", "France member_of United Nations". kind_of makes the tree
-- a host answer covers (human, 2026-10-24: "Caught: bear covers it").
create table private.fact (
  id bigint generated always as identity primary key,
  thing_id uuid not null references private.thing (id) on delete cascade,
  trait text not null check (trait in ('kind_of', 'member_of')),
  value_thing uuid not null references private.thing (id) on delete cascade,
  origin text not null check (origin in ('source', 'ai', 'players', 'human')),
  source_ref text,
  added_at timestamptz not null default now(),
  unique (thing_id, trait, value_thing),
  check (thing_id <> value_thing)
);

-- Categories walk the tree downward, from a value to the things under it.
create index fact_value on private.fact (trait, value_thing);

alter table private.fact enable row level security;

alter table private.fact add column removed_at timestamptz, add check (removed_at >= added_at);

-- M13 13e-4a: subsets of any category (docs/milestones/M13-13e-4-subsets.md, "13e-4a"). A category can name a base
-- category and one filter: a fact about its members (continent, conservation status; continent may be reached through
-- the member's country), a number at least some value (population), or the first letter of what's typed. Facts gain
-- three traits and numbers their own table (O2, O3); approval freezes the filter as `where` (A1; DECISIONS.md, Puzzle
-- content format); misses on a subset are learned only if the new answer fits it (A2).
-- private.number_fact and the subset functions hold no grant for plor_app (they're read inside the security-definer
-- functions it runs).

-- Thing-valued facts subsets filter on, from Wikidata (SOURCES.md, Wikidata properties): P17, P30, P141.
alter table private.fact drop constraint fact_trait_check,
  add constraint fact_trait_check check (trait in ('kind_of', 'member_of', 'country', 'continent', 'conservation_status'));

-- M13 13e-6: pop culture (docs/milestones/M13-13e-6-pop-culture.md). Two new kinds of fact, genre (P136) and
-- publisher (P123), approved by the human (2026-10-27: "Approve 13e-6's design, its SOURCES.md rows and the genre and
-- publisher facts"), so a subset can be "Name a racing game" or "Name a Nintendo game". import_source loads them as it
-- loads the facts before them.
alter table private.fact drop constraint fact_trait_check;

alter table private.fact add constraint fact_trait_check
  check (trait in ('kind_of', 'member_of', 'country', 'continent', 'conservation_status', 'genre', 'publisher'));

-- Numbers in their own table (human, 2026-10-26: "Their own table (Recommended)"): the value and the point in time
-- (P585) it's true for. A reload with a different value removes the old one from that moment, so a started day keeps
-- the number it had.
create table private.number_fact (
  id bigint generated always as identity primary key,
  thing_id uuid not null references private.thing (id) on delete cascade,
  trait text not null check (trait in ('population')),
  value numeric not null check (value >= 0),
  as_of date,
  origin text not null check (origin in ('source', 'ai', 'players', 'human')),
  source_ref text,
  added_at timestamptz not null default now(),
  removed_at timestamptz check (removed_at >= added_at)
);

create unique index number_fact_current on private.number_fact (thing_id, trait) where removed_at is null;

alter table private.number_fact enable row level security;

-- M13 13e-4a: number facts are read by thing and trait as of a moment (private.fits_where), which the partial
-- current-row index can't serve, so a number filter scanned the table once per member (9.3 s for "US city of at
-- least 1,000,000", 10,761 members, 13e-4 Evidence).
create index number_fact_lookup on private.number_fact (thing_id, trait);

-- M13 13e-5b: Wikidata's own doubles (docs/milestones/M13-13e-5b-wikidata-doubles.md). Hard to reverse (DECISIONS.md
-- Log, 2026-10-27): a join or a merge retires a thing ID, and private.thing_retired keeps it pointing at its thing
-- (human, 2026-10-27: "Keep pointing (Recommended)"). import_source takes merged_into, a merge within one source, and
-- names a thing WordNet joins by the joining item's name, which the load picks (scripts/base.ts, shownNames). Readers that take thing IDs from files resolve them: approve_puzzle
-- and thing_names, with their owners' rights, so plor_app needs no new grant.

-- Each retired ID and the thing it now names. Written by import_source only.
create table private.thing_retired (
  id uuid primary key,
  thing_id uuid not null references private.thing (id) on delete cascade,
  retired_at timestamptz not null default now(),
  source_ref text not null
);

create index thing_retired_thing on private.thing_retired (thing_id);

-- DECISIONS.md, Row-level security in `private`: RLS on, nothing for the Data API roles; only functions with their
-- owners' rights read it.
alter table private.thing_retired enable row level security;

-- Every import and category change, by whom and when. Each alias and fact also carries its own origin, source_ref
-- and added_at, so a row can be traced to the import that added it.
create table private.base_log (
  id bigint generated always as identity primary key,
  actor text not null check (actor <> ''),
  action text not null check (action in ('import', 'define_category')),
  detail jsonb not null,
  at timestamptz not null default now()
);

alter table private.base_log enable row level security;

alter table private.base_log drop constraint base_log_action_check,
  add constraint base_log_action_check check (action in ('import', 'define_category', 'miss_review', 'audit'));

-- M13 13e-2 (docs/milestones/M13-13e-2-links-and-the-first-batch.md): links, reviewed "kind of" facts from
-- data/links.json that fill gaps in a source's tree. WordNet files tulip under liliaceous plant, not flower, and pie
-- under pastry, not dessert, so "Name a flower" would refuse "tulip" and the facts check would reject it (human,
-- 2026-10-25: "Links as facts (Recommended)"). A link is a kind_of fact like any other: every walk, the facts check
-- and the answers fixed at a day's start see it from when it was added. Claude writes the links and the human
-- approves them by merging the batch, so they carry origin 'ai' and source_ref 'links'.
alter table private.base_log drop constraint base_log_action_check,
  add constraint base_log_action_check check (action in ('import', 'define_category', 'miss_review', 'audit', 'link'));

-- load_begin and load_finish log what they erased beside the imports and links.
alter table private.base_log drop constraint base_log_action_check,
  add constraint base_log_action_check check (action in ('import', 'define_category', 'miss_review', 'audit', 'link', 'erase'));


-- ====================================================================================================================
-- Tables: Categories
-- ====================================================================================================================

-- A category is a recipe: everything under root in the kind_of tree, optionally only those that are member_of a
-- thing (UN members among countries). key names it in a question (format 3, 13a-2).
create table private.category (
  key text primary key check (key ~ '^[a-z][a-z_]*$'),
  name text not null check (name <> ''),
  root uuid not null references private.thing (id),
  member_of uuid references private.thing (id)
);

alter table private.category enable row level security;

-- A subset's one filter, beside its base's root and member_of (copied by private.define_subset). The forms are A1's.
alter table private.category
  add column fact_trait text check (fact_trait in ('continent', 'conservation_status')),
  add column fact_value uuid references private.thing (id),
  add column fact_via text check (fact_via = 'country'),
  add column number_trait text check (number_trait = 'population'),
  add column at_least numeric,
  add column starts_with text check (starts_with ~ '^[a-z]$'),
  add check ((fact_trait is null) = (fact_value is null)),
  add check (fact_via is null or fact_trait = 'continent'),
  add check ((number_trait is null) = (at_least is null)),
  add check (num_nonnulls(fact_trait, number_trait, starts_with) <= 1);

-- M13 13e-4b: a fact filter holds a list of values, and a thing fits with any of them (docs/milestones/M13-13e-4-subsets.md,
-- 13e-4b; human, 2026-10-26: "Approve: always a list (Recommended)"), so "Name an endangered animal" takes vulnerable,
-- endangered or critically endangered ("Both, endangered as players mean it (Recommended)"). Format 3's `where` fact
-- form becomes {trait, values, via?} (DECISIONS.md, Puzzle content format); no day was approved with the one-value
-- form. A new thing can't be given one of several values, so a miss on such a subset is held for the human, as a via or
-- number subset's is (A2).
alter table private.category add column fact_values uuid[] check (cardinality(fact_values) > 0);

-- The one-value column goes once nothing reads it (category_where's body depended on it).
alter table private.category drop column fact_value,
  add check ((fact_trait is null) = (fact_values is null));

alter table private.category drop constraint category_fact_trait_check;

alter table private.category add constraint category_fact_trait_check
  check (fact_trait in ('continent', 'conservation_status', 'genre', 'publisher'));

-- A thing the human accepted for one category against the facts ("Listed, you decide (Recommended)": "spider" for an
-- insect, "close enough"), without changing its facts anywhere else.
create table private.category_extra (
  category text not null references private.category (key),
  thing_id uuid not null references private.thing (id) on delete cascade,
  added_by uuid not null,
  added_at timestamptz not null default now(),
  -- Undone from this moment on (human, 2026-10-24: "Yes, undo anything (Recommended)").
  removed_at timestamptz check (removed_at >= added_at),
  primary key (category, thing_id)
);

alter table private.category_extra enable row level security;


-- ====================================================================================================================
-- Tables: Misses and the audit
-- ====================================================================================================================

-- Typed text that matched no entry, kept for a human to review and add (human, 2026-10-18). It costs the
-- player nothing and belongs to the run it was typed in.
create table private.missed_answer (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  game_id text not null,
  puzzle_date date not null,
  question_idx smallint not null check (question_idx >= 0),
  typed text not null,
  created_at timestamptz not null default now(),
  foreign key (user_id, game_id, puzzle_date) references private.run (user_id, game_id, puzzle_date) on delete cascade,
  -- At most 40 characters; longer input is rejected and not logged (human, 2026-10-18; M02 ticket, Numbers).
  constraint missed_answer_typed_length check (char_length(typed) between 1 and 40 and typed = btrim(typed))
);

alter table private.missed_answer enable row level security;

-- The miss's text normalized as aliases are (src/content/puzzle.ts, normalize), which misses are counted by. Null on
-- misses logged before 13b: those days (formats 1 and 2) name no category, so they're never counted.
alter table private.missed_answer add column normalized text;

-- A text that reached the threshold for a category (M13 D4), decided once: accepted (a new member), held (on the
-- LDNOOBW list), rejected (it names a thing outside the category) or near_typo (one typo from a member). thing_id is
-- the thing made for it, when one was; chosen the thing an admin linked it to or accepted for the category.
create table private.miss_review (
  id bigint generated always as identity primary key,
  category text not null references private.category (key),
  text text not null check (text <> ''),
  outcome text not null check (outcome in ('accepted', 'held', 'rejected', 'near_typo')),
  thing_id uuid references private.thing (id),
  players int not null check (players > 0),
  answered int not null check (answered >= players),
  reached_at timestamptz not null default now(),
  decision text check (decision in ('undone', 'linked', 'accepted', 'dismissed')),
  chosen uuid references private.thing (id),
  decided_by uuid,
  decided_at timestamptz,
  unique (category, text),
  check ((decision is null) = (decided_by is null) and (decision is null) = (decided_at is null))
);

alter table private.miss_review enable row level security;

-- A text held because the subset's filter can't be checked on a new answer (through its country, or a number): the
-- human can accept it for the subset (A2).
alter table private.miss_review drop constraint miss_review_outcome_check,
  add constraint miss_review_outcome_check check (outcome in ('accepted', 'held', 'held_subset', 'rejected', 'near_typo'));


-- ====================================================================================================================
-- Tables: Friends and groups
-- ====================================================================================================================

-- M07 7b: invite links and friends (docs/milestones/M07-friends-and-live-board.md). Security change: these tables
-- and plor_app's grants on them were approved by the human on 2026-10-22 (DECISIONS.md Log).

-- One personal invite code per player, usable any number of times; resetting replaces it, so the old link stops
-- working. 16 random bytes written as 22 base64url characters (human, 2026-10-21, M07 D3). Random, not the
-- username, so a rename never breaks a link.
create table private.friend_invite (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now(),
  constraint friend_invite_code_format check (code ~ '^[A-Za-z0-9_-]{22}$')
);

-- DECISIONS.md, Row-level security in `private`: RLS on, nothing for the Data API roles, one policy per command
-- granted to plor_app. Which player's rows a request touches is decided by the route from the verified session.
alter table private.friend_invite enable row level security;

-- M14 14b-3: invite codes of 10 base64url characters, 60 random bits, for friends and groups
-- (docs/milestones/M14-14b-3-invite-button.md; human, 2026-10-26: "10 characters (Recommended)", "Replace every link").
-- Security change (DECISIONS.md Log, 2026-10-26; human: "Approve it (Recommended)"): the codes are the tokens that add
-- a friend or join a group, so the codes made before then were replaced, and every link sent before then stopped working.

-- A fresh code: 8 cryptographically strong random bytes (pgcrypto's gen_random_bytes, PostgreSQL 17, pgcrypto), in
-- base64url, cut to the first 10 characters, which carry 60 of their bits and stop before any padding. The app makes
-- its codes the same way (src/friends/friends.ts, newInviteCode). The unique constraints
-- refuse a collision loudly rather than overwrite anything.
alter table private.friend_invite drop constraint friend_invite_code_format;

alter table private.friend_invite add constraint friend_invite_code_format check (code ~ '^[A-Za-z0-9_-]{10}$');

-- Friends are mutual: one row per pair, the smaller user ID first, so a pair can't be stored twice or with itself.
create table private.friendship (
  user_a uuid not null references auth.users (id) on delete cascade,
  user_b uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  constraint friendship_ordered check (user_a < user_b)
);

-- The primary key serves lookups by user_a; this serves them by user_b.
create index friendship_user_b on private.friendship (user_b);

alter table private.friendship enable row level security;

-- M10 10b: groups and their members (docs/milestones/M10-groups.md, G1, G6, G8–G11). Security change: these tables
-- and plor_app's grants on them were approved by the human on 2026-10-22 (G10; DECISIONS.md Log).
-- Expected failures: OB009 group_full, OB010 too_many_groups.

-- A named group with one invite link that every member can share; only the creator renames it, resets the link,
-- removes members or deletes it (G1). Named player_group because "group" is an SQL keyword.
create table private.player_group (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  creator_id uuid not null,
  -- 16 random bytes written as 22 base64url characters, as friend invites (G8; M07 D3).
  invite_code text not null unique,
  created_at timestamptz not null default now(),
  -- The display name rule (G11; M07 D1, profile_display_name_format in 20261022064011_display_name.sql).
  constraint player_group_name_format check (
    char_length(name) between 1 and 24
    and name ~ '^[[:alpha:][:digit:] ''._-]+$'
    and name !~ '(^ | $|  )'
    and name is nfc normalized
  ),
  constraint player_group_invite_code_format check (invite_code ~ '^[A-Za-z0-9_-]{22}$')
);

-- DECISIONS.md, Row-level security in `private`: RLS on, nothing for the Data API roles, one policy per command
-- granted to plor_app. Which group and player a request touches is decided by the route from the verified session.
alter table private.player_group enable row level security;

alter table private.player_group drop constraint player_group_invite_code_format;

alter table private.player_group add constraint player_group_invite_code_format check (invite_code ~ '^[A-Za-z0-9_-]{10}$');

create table private.group_member (
  group_id uuid not null references private.player_group (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- The primary key serves lookups by group; this serves "my groups".
create index group_member_user_id on private.group_member (user_id);

alter table private.group_member enable row level security;


-- ====================================================================================================================
-- Tables: Comments and reactions
-- ====================================================================================================================

-- M08 8a: comments on the day's game (docs/milestones/M08-comments-and-reactions.md). Security change: this table and
-- plor_app's grants on it were approved by the human on 2026-10-22 (D8; DECISIONS.md Log).

-- One level, no replies. A comment belongs to its author's run that day, so only a player who played the day can
-- have one; the route also requires the run to be over and the day to be today (D6: past days are read-only).
-- Deleting removes the row for good (D4); deleting the run or the account cascades.
create table private.comment (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  game_id text not null,
  puzzle_date date not null,
  body text not null,
  created_at timestamptz not null default now(),
  foreign key (user_id, game_id, puzzle_date) references private.run (user_id, game_id, puzzle_date) on delete cascade,
  -- 1 to 280 characters (human, 2026-10-22, D1), already trimmed by the route; char_length counts characters, so an
  -- emoji is one.
  constraint comment_body_format check (char_length(body) between 1 and 280 and body = btrim(body))
);

-- A day's thread is read oldest first.
create index comment_day on private.comment (game_id, puzzle_date, created_at);

-- DECISIONS.md, Row-level security in `private`: RLS on, nothing for the Data API roles, one policy per command
-- granted to plor_app. Which rows a request reads or deletes is decided by the route from the verified session.
alter table private.comment enable row level security;

-- M08 8b: reactions on comments and on friends' runs (docs/milestones/M08-comments-and-reactions.md, D2 and D3).
-- Security change: this table and plor_app's grants on it were approved by the human on 2026-10-22 (D8; DECISIONS.md
-- Log).

-- A reaction on a comment names the comment's day too (the foreign key below), so it can only be on that day.
alter table private.comment add constraint comment_id_day unique (id, game_id, puzzle_date);

-- M10 10d: one comment thread per group per day (docs/milestones/M10-groups.md, G4, G5, G6, G9). No new grant or
-- policy: plor_app's grants and policies on private.comment are table-wide (M08 8a), and the nudges use the board
-- topics and the own-board read policy approved in M07 (G5; DECISIONS.md: Real-time transport).

-- Null is the friends thread (M08); otherwise the comment is in that group's thread, seen by its current members
-- (G4; the routes decide who reads what). Its author must be a member, and leaving or being removed deletes their
-- comments there, with their reactions and reports (G6), because the comment hangs off the membership.
alter table private.comment add column group_id uuid;

alter table private.comment add constraint comment_group_member foreign key (group_id, user_id)
  references private.group_member (group_id, user_id) on delete cascade;

-- The membership cascade looks comments up by group and author.
create index comment_group on private.comment (group_id, user_id) where group_id is not null;

-- M12 12c: a player deletes their own account (docs/milestones/M12-account.md, A4, A5, A7, A10; human, 2026-10-23).
-- Security changes (DECISIONS.md Log): plor_app may execute private.delete_account, which deletes the player's
-- auth.users row with its owner's rights; and plor_app's insert on private.profile narrows to (user_id, username).

-- Deleting a run cascades to its comments and reactions by the run's key, which neither table had an index on, so
-- every run deleted with an account scanned both (ROADMAP "Next revision", For M12).
create index comment_run on private.comment (user_id, game_id, puzzle_date);

-- One reaction per player per target: a comment, or a friend's run that day (D2). A reaction belongs to the reactor's
-- run that day, so only a player who played the day can react; the route also requires that run to be over, the day
-- to be today (D6: past days are read-only) and the target to be one the reactor can see. Changing a reaction deletes
-- the old one and inserts the new one in one transaction, since plor_app has no update. Deleting the comment, either
-- run or either account cascades (D4: a deleted comment's reactions go with it).
create table private.reaction (
  user_id uuid not null,
  game_id text not null,
  puzzle_date date not null,
  comment_id bigint,
  run_user_id uuid,
  emoji text not null,
  created_at timestamptz not null default now(),
  foreign key (user_id, game_id, puzzle_date) references private.run (user_id, game_id, puzzle_date) on delete cascade,
  foreign key (comment_id, game_id, puzzle_date) references private.comment (id, game_id, puzzle_date) on delete cascade,
  foreign key (run_user_id, game_id, puzzle_date) references private.run (user_id, game_id, puzzle_date) on delete cascade,
  constraint reaction_one_target check (num_nonnulls(comment_id, run_user_id) = 1),
  -- Reactions go on friends' runs (D2), and no one is their own friend.
  constraint reaction_not_own_run check (run_user_id <> user_id),
  -- The set (human, 2026-10-22, D3). src/config/tunables.ts REACTIONS holds the same five, and the reactions route
  -- test sends each one through. ❤️ is U+2764 U+FE0F.
  constraint reaction_emoji check (emoji in ('👍', '😂', '😮', '😢', '❤️'))
);

create unique index reaction_one_per_comment on private.reaction (user_id, comment_id) where comment_id is not null;

create unique index reaction_one_per_run on private.reaction (user_id, game_id, puzzle_date, run_user_id) where run_user_id is not null;

-- Reactions are read per comment (a day's thread) and per run (the board), and cascade from both.
create index reaction_comment on private.reaction (comment_id) where comment_id is not null;

create index reaction_run on private.reaction (run_user_id, game_id, puzzle_date) where run_user_id is not null;

-- DECISIONS.md, Row-level security in `private`: RLS on, nothing for the Data API roles, one policy per command
-- granted to plor_app. Which rows a request reads or deletes is decided by the route from the verified session.
alter table private.reaction enable row level security;

create index reaction_run_owner on private.reaction (user_id, game_id, puzzle_date);

-- M08 8c: reports on comments (docs/milestones/M08-comments-and-reactions.md, D5). Security change: this table and
-- plor_app's grants on it were approved by the human on 2026-10-22 (D8; DECISIONS.md Log).

-- Who reported which comment, and when; one per player per comment. A report hides the comment for its reporter, and
-- admins see every comment with a report until one of them deletes it (D5: nothing is hidden automatically). The
-- route allows reporting only a comment the reporter can see and didn't write. Deleting the comment (by its author
-- or an admin) removes its reports (D4), and deleting the reporter's account removes theirs.
create table private.comment_report (
  comment_id bigint not null references private.comment (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, reporter_id)
);

-- The account cascade looks reports up by reporter.
create index comment_report_reporter on private.comment_report (reporter_id);

-- DECISIONS.md, Row-level security in `private`: RLS on, nothing for the Data API roles, one policy per command
-- granted to plor_app. Which rows a request reads is decided by the route: a player's own reports, or every report
-- for an admin.
alter table private.comment_report enable row level security;

-- M12 12d: a record of which admin deleted which reported comment (docs/milestones/M12-12d-decided-fixes.md; human,
-- 2026-10-23: "add record of which admin does it"). Security change (DECISIONS.md Log; D1 (a), human, 2026-10-24):
-- the deletion and its record are one statement in a function with its owner's rights, which plor_app may execute;
-- plor_app may only read the record, so app code can't skip it or write a false one.

-- Which admin deleted which comment, its author, its text, and when. The comment row is gone, so comment_id has no
-- foreign key. The record goes with the admin's or the author's account (D2 (a), human, 2026-10-24), so an account
-- deletion still removes everything tied to the account (M12 A5).
create table private.comment_deletion (
  id bigint generated always as identity primary key,
  admin_id uuid not null references auth.users (id) on delete cascade,
  comment_id bigint not null,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  deleted_at timestamptz not null default now()
);

-- The account cascades look records up by admin and by author.
create index comment_deletion_admin on private.comment_deletion (admin_id);

create index comment_deletion_author on private.comment_deletion (author_id);

-- DECISIONS.md, Row-level security in `private`: RLS on, nothing for the Data API roles, one policy per command
-- granted to plor_app. Only admins' routes read it.
alter table private.comment_deletion enable row level security;

-- M14 14b-2b-2b: an admin keeps a reported comment (docs/milestones/M14-14b-2b-2-admin-build.md; round 10's "Keep
-- comment", human, 2026-10-26: "Add Keep comment"). Security change (DECISIONS.md Log; human, 2026-10-26: "Approve it
-- (Recommended)"): as with deleting, an admin's keep is recorded only through a function with its owner's rights, which
-- plor_app may execute; plor_app may only read the record, so app code can't write a false one.

-- Which admin kept which comment, its author, its text, and when; the comment's reports made up to then are handled.
-- Its author may delete it later, so comment_id has no foreign key. The record goes with the admin's or the author's
-- account, as a deletion's does (M12 12d, D2 a).
create table private.comment_keep (
  id bigint generated always as identity primary key,
  admin_id uuid not null references auth.users (id) on delete cascade,
  comment_id bigint not null,
  author_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  kept_at timestamptz not null default now()
);

-- The account cascades look records up by admin and by author.
create index comment_keep_admin on private.comment_keep (admin_id);

create index comment_keep_author on private.comment_keep (author_id);

-- DECISIONS.md, Row-level security in `private`: RLS on, nothing for the Data API roles, one policy per command
-- granted to plor_app. Only admins' routes read it.
alter table private.comment_keep enable row level security;


-- ====================================================================================================================
-- Tables: Loading the base
-- ====================================================================================================================

-- Removal on load (docs/milestones/M13-13f-3-import-and-draft-tools.md, 13f-3a; human, 2026-10-27: "Build it now
-- (Recommended)", "Erase it", "Keep the thing, erase the rest (Recommended)", "Player-added (Recommended)", "Human
-- decisions (Recommended)"). A load owns the names and facts it wrote from a source or a hand file (origin 'source',
-- and the links: origin 'ai', source_ref 'links'); `npm run base -- load all` opens a load (load_begin), each import and
-- the links mark every owned row the files give, already loaded or not, and load_finish ends the owned rows no file
-- gave at the next midnight (a load a day after erases them) and erases the categories data/categories.json no longer lists.
-- Readers of the base as it is now (drafting, approval, the admin pages) see an ended row gone at once; a started day
-- reads as of its start, so it keeps it until the day is over. A thing's row is never erased: it keeps its shown name,
-- so past results that point at its ID still show it (format 3: permanent IDs). Player-added rows (origin 'players')
-- and the admin's decisions (origin 'human', and private.category_extra) are never erased, and a category that holds
-- either is kept. Rows don't record their set (source_ref is the source and the snapshot's date, which sets share), so
-- what the files give is gathered across the whole load.
create table private.load_seen_alias (
  thing_id uuid not null,
  alias text not null,
  primary key (thing_id, alias)
);

alter table private.load_seen_alias enable row level security;

create table private.load_seen_fact (
  thing_id uuid not null,
  trait text not null,
  value_thing uuid not null,
  primary key (thing_id, trait, value_thing)
);

alter table private.load_seen_fact enable row level security;

-- fresh: a fact this load added or brought back, which load_finish checks for circles again (4).
alter table private.load_seen_fact add column fresh boolean not null default false;

create table private.load_seen_number (
  thing_id uuid not null,
  trait text not null,
  primary key (thing_id, trait)
);

alter table private.load_seen_number enable row level security;

-- strong: a joining WordNet item's name, which a later one replaces; the made-from item's name never replaces it.
create table private.load_seen_name (
  thing_id uuid primary key,
  name text not null,
  strong boolean not null
);

alter table private.load_seen_name enable row level security;

-- The load's gaps (docs/milestones/M13-13f-3-import-and-draft-tools.md, 13f-3b-1; ROADMAP, "From the 13f-3a review";
-- human, 2026-10-28: "All eight now", "Keep while unfinished (Recommended)", "Name them, keep going (Recommended)").
-- A load is open in the session that holds its lock, from load_begin to load_finish:
-- 1. one load at a time: a second load_begin is refused while another session's load is open;
-- 2. only an open load marks what the files give, so a single `load <set>` and the suites' imports leave no load_seen rows;
-- 3. a ref to an item no import of this load gave (one that left its snapshot) is refused, as a fresh load refuses it;
-- 4. the circle checks walk the base as the files give it (what this load has marked, and players' and the admin's
--    facts), and load_finish checks again the facts this load added or brought back;
-- 5. the shown name the files give follows import_source's rename by a joining or merged item too;
-- 6. a category stays while an unfinished run of a day naming it exists, and record_miss refuses a missing category;
-- 7. load_finish names the approved days not started yet whose host answers it changed.

-- Every item an import of the open load gave, by source and ID (3).
create table private.load_seen_item (
  source text not null,
  source_id text not null,
  primary key (source, source_id)
);

alter table private.load_seen_item enable row level security;


-- ====================================================================================================================
-- Constraints across tables, once both exist
-- ====================================================================================================================

-- The creator is always a member. Checked at commit, because a group and its first member are inserted together, and
-- a creator who leaves is replaced by the trigger below before the transaction ends (G6).
alter table private.player_group add constraint player_group_creator_is_member
  foreign key (id, creator_id) references private.group_member (group_id, user_id) deferrable initially deferred;


-- ====================================================================================================================
-- Functions: Days, runs and the ledger
-- ====================================================================================================================

-- Offbeat's game tables: the day boundary, published puzzles, runs, answers and logged misses
-- (docs/milestones/M00-data-design.md §4, §5, §7, §8; docs/milestones/M02-sign-in-and-play.md).
-- Expected failures raise their own SQLSTATE (OB…), each named where it is raised and mapped by the code that
-- calls it.
--
-- §8: one global day that resets at midnight America/Los_Angeles, following DST (human, 2026-10-17).
-- day_of is the whole rule for any instant, so tests can ask about chosen instants; today() is the only
-- definition of "today" and every caller uses it.
create function private.day_of(at_instant timestamptz) returns date
  language sql stable
  return (at_instant at time zone 'America/Los_Angeles')::date;

-- M02 2f, B21: "today" is the day of the statement being run, not of its transaction. now() is fixed when a
-- transaction starts, so a transaction begun just before midnight Pacific would run its UPDATE
-- after midnight against yesterday's date, and the started-day guard (refuse_started_puzzle_change) would let a
-- change to the new day through. statement_timestamp() is the start of the current statement (PostgreSQL 17,
-- "Current Date/Time"), and it stays the same for every row and trigger of one statement.
-- This narrows the window, it doesn't close it: the guard runs when a day's UPDATE runs, but the change becomes
-- visible at COMMIT, so an UPDATE just before midnight whose transaction commits just after still changes a day that
-- has started (2f review; ROADMAP).
create or replace function private.today() returns date
  language sql stable
  return private.day_of(statement_timestamp());

-- plor_app: read puzzles, start runs, record answers (append-only: SELECT and INSERT only, §7), read the
-- status view, and log misses. The trigger and the view call today() as plor_app.
grant execute on function private.day_of(timestamptz), private.today() to plor_app;

-- The next reset, for the countdown (ROADMAP item from the M00 review): midnight America/Los_Angeles after today(),
-- following DST. It sits next to day_of, the only other place the time zone is named.
create function private.next_reset() returns timestamptz
  language sql stable
  return (private.today() + 1)::timestamp at time zone 'America/Los_Angeles';

-- M13 13c-2: 20 seconds per question (human, 2026-10-21; docs/milestones/M04-game-mechanics.md, "Rules to build",
-- rule 3). When a question's time runs out the run ends (G10); when a question starts is 13c-4's rule
-- (private.question_started_at). The database decides: the answer trigger refuses a late answer with OB005 time_up,
-- and the status view shows such a run as 'timed_out' with no write needed.
--
-- The timer replaces the day boundary as what ends an unfinished run. A run started before midnight Pacific can be
-- played to its end after midnight (human, 2026-10-21: "they get to play the puzzle but their score doesn't
-- contribute to leaderboard"; leaderboards are M08). So the trigger no longer raises OB001 day_over, and the view has
-- no 'abandoned' state: every run ends died, survived or timed_out, or waits on a reveal (13c-4).
--
-- The one place the 20 seconds lives.
create function private.question_deadline(question_started_at timestamptz) returns timestamptz
  language sql immutable
  return question_started_at + interval '20 seconds';

-- plor_app evaluates the view and the trigger, so it runs the function, like today() (approved by the human,
-- 2026-10-21; DECISIONS.md Log).
revoke all on function private.question_deadline(timestamptz) from public, anon, authenticated, service_role;

grant execute on function private.question_deadline(timestamptz) to plor_app;

-- When a question started: Start for the first, Next for the rest; null while the reveal waits for Next.
create function private.question_started_at(run_user uuid, run_game text, run_date date, idx int) returns timestamptz
  language sql stable
  return case
    when idx = 0 then (select r.started_at from private.run r
                       where r.user_id = run_user and r.game_id = run_game and r.puzzle_date = run_date)
    else (select o.opened_at from private.question_open o
          where o.user_id = run_user and o.game_id = run_game and o.puzzle_date = run_date and o.question_idx = idx)
  end;

grant execute on function private.question_started_at(uuid, text, date, int), private.next_reset() to plor_app;

-- When a format-3 day's answers are fixed: the start of its day (midnight Pacific, as private.next_reset), or its
-- approval if that came later (human, 2026-10-24: "Yes, from the next day (Recommended)"). A day approved ahead picks
-- up what was learned before it starts; a started day never changes.
create function private.answers_as_of(p_content jsonb, p_date date) returns timestamptz
  language sql stable set search_path = ''
  return greatest((p_content ->> 'approved_at')::timestamptz, p_date::timestamp at time zone 'America/Los_Angeles');

revoke all on function private.answers_as_of(jsonb, date) from public, anon, authenticated, service_role;

-- §5: checked at insert time inside the answer's transaction, so no answer slips in between a check and the
-- write; the day no longer ends a run (13c-2). Order: the next index only, and nothing after a match or
-- after the last question. Two inserts for the same index meet at the primary key.
--
-- The answer trigger (13c-4): unlike 13c-2's, the question's 20 seconds run from when it was opened, and an
-- answer to a question not yet opened is refused.
create or replace function private.check_run_event() returns trigger
  language plpgsql
  as $$
declare
  answered int;
  died boolean;
  questions int;
  started timestamptz;
begin
  select count(*), coalesce(bool_or(e.matched), false) into answered, died
    from private.run_event e
    where e.user_id = new.user_id and e.game_id = new.game_id and e.puzzle_date = new.puzzle_date;
  select jsonb_array_length(p.content -> 'questions') into questions
    from private.puzzle p
    where p.game_id = new.game_id and p.puzzle_date = new.puzzle_date;
  if died or answered >= questions then
    raise exception 'run_over' using errcode = 'OB003';
  end if;
  if new.question_idx <> answered then
    raise exception 'out_of_order: expected question %', answered using errcode = 'OB002';
  end if;
  started := private.question_started_at(new.user_id, new.game_id, new.puzzle_date, new.question_idx);
  if started is null then
    raise exception 'not_open: question % has not been opened', new.question_idx using errcode = 'OB006';
  end if;
  -- Statement time, like today() (M02 2f, B21): the answer's own moment, not its transaction's start.
  if statement_timestamp() > private.question_deadline(started) then
    raise exception 'time_up' using errcode = 'OB005';
  end if;
  return new;
end
$$;

-- Next opens only the question after the last answer, of a run still going: not after a catch, the last question,
-- or one already open (the primary key).
create function private.check_question_open() returns trigger
  language plpgsql
  as $$
declare
  answered int;
  died boolean;
  questions int;
begin
  select count(*), coalesce(bool_or(e.matched), false) into answered, died
    from private.run_event e
    where e.user_id = new.user_id and e.game_id = new.game_id and e.puzzle_date = new.puzzle_date;
  select jsonb_array_length(p.content -> 'questions') into questions
    from private.puzzle p
    where p.game_id = new.game_id and p.puzzle_date = new.puzzle_date;
  if died or answered >= questions then
    raise exception 'run_over' using errcode = 'OB003';
  end if;
  if new.question_idx <> answered then
    raise exception 'out_of_order: expected question %', answered using errcode = 'OB002';
  end if;
  return new;
end
$$;

revoke all on function private.question_started_at(uuid, text, date, int), private.check_question_open(), private.next_reset()
  from public, anon, authenticated, service_role;

-- §4: a puzzle can't change once its day has started, whoever writes it.
create function private.refuse_started_puzzle_change() returns trigger
  language plpgsql
  as $$
begin
  if old.puzzle_date <= private.today() then
    raise exception 'puzzle_started: % % has started and cannot change', old.game_id, old.puzzle_date
      using errcode = 'OB004';
  end if;
  return new;
end
$$;

revoke all on function private.day_of(timestamptz), private.today(), private.refuse_started_puzzle_change(),
  private.check_run_event() from public, anon, authenticated, service_role;


-- ====================================================================================================================
-- Functions: Accounts
-- ====================================================================================================================

-- Records one attempt and returns true, or returns false without recording it when the key already has p_limit
-- attempts within p_window. A lock per key makes two requests at once count as two. The kind's expired rows are deleted
-- on the way, so the table holds at most a window of attempts. The limits themselves are src/config/tunables.ts's
-- AUTH_LIMITS (the human's numbers, N1–N4), passed in by the routes.
create function private.take_auth_attempt(p_kind text, p_key text, p_limit int, p_window interval) returns boolean
  language plpgsql security definer set search_path = ''
as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_kind || ':' || p_key, 0));
  delete from private.auth_attempt where kind = p_kind and at <= statement_timestamp() - p_window;
  if (select count(*) from private.auth_attempt where kind = p_kind and key = p_key) >= p_limit then
    return false;
  end if;
  insert into private.auth_attempt (kind, key) values (p_kind, p_key);
  return true;
end;
$$;

revoke all on function private.take_auth_attempt(text, text, int, interval) from public, anon, authenticated, service_role;

grant execute on function private.take_auth_attempt(text, text, int, interval) to plor_app;

-- M12 12e review: a code request counts against its address only when Auth actually sends the code (N2: "code emails
-- per email address"), and against its IP only when it reached Auth (docs/milestones/M12-12e-sign-in-limits.md, Source
-- diff). The send route takes the count first, so two requests at once can't both slip under the limit, and gives it
-- back when the request goes no further.
--
-- Removes the newest attempt of one key, the one the caller just took. Same rights and grants as the other two.
create function private.give_back_auth_attempt(p_kind text, p_key text) returns void
  language sql security definer set search_path = ''
as $$
  delete from private.auth_attempt
  where ctid = (select ctid from private.auth_attempt where kind = p_kind and key = p_key order by at desc limit 1);
$$;

revoke all on function private.give_back_auth_attempt(text, text) from public, anon, authenticated, service_role;

grant execute on function private.give_back_auth_attempt(text, text) to plor_app;

-- Forgets one key's attempts: a new code gets a fresh set of checks (N4).
create function private.clear_auth_attempts(p_kind text, p_key text) returns void
  language sql security definer set search_path = ''
as $$
  delete from private.auth_attempt where kind = p_kind and key = p_key;
$$;

revoke all on function private.clear_auth_attempts(text, text) from public, anon, authenticated, service_role;

grant execute on function private.clear_auth_attempts(text, text) to plor_app;

-- The rule lives in the database, as the username's format and uniqueness do: a trigger stamps each change, and
-- refuses one within 30 days of the last (OB011). It runs with the caller's rights: column privileges are checked
-- against the columns an UPDATE names, not those a BEFORE trigger writes into NEW, so plor_app's grant on the username
-- alone is enough for the stamp (M12 12b review: least privilege).
create function private.profile_username_change() returns trigger
  language plpgsql security invoker set search_path = ''
as $$
begin
  if new.username::text is distinct from old.username::text then
    if old.username_changed_at is not null and statement_timestamp() < old.username_changed_at + interval '30 days' then
      raise exception 'username changed less than 30 days ago' using errcode = 'OB011';
    end if;
    new.username_changed_at := statement_timestamp();
  end if;
  return new;
end;
$$;

revoke all on function private.profile_username_change() from public, anon, authenticated, service_role;

-- Deletes an account when given the player's own username, as typed on the account page (A4), and says whether it did.
-- The route passes only the verified player's ID, so plor_app can delete no one else (A7). Deleting the auth.users row
-- removes everything else of theirs through its cascades (A5; M00 data design §7), Auth's sessions included, which ends
-- their refresh tokens (SOURCES.md, Supabase user management, "Removing account access").
create function private.delete_account(p_user_id uuid, p_username text) returns boolean
  language plpgsql security definer set search_path = ''
as $$
declare
  g uuid;
begin
  if not exists (select from private.profile where user_id = p_user_id and username::text = p_username) then
    return false;
  end if;
  -- Leave each group first, the way leaveGroup does: the group's lock, then the membership (src/groups/groups.ts,
  -- LOCK_GROUP), so the handover and last-member rules run as for any leave (M10 G6). Left to the auth.users cascade,
  -- the memberships went the other way round and deadlocked with a creator leaving the same group (12c plan step 1).
  for g in select group_id from private.group_member where user_id = p_user_id order by group_id loop
    perform from private.player_group where id = g for update;
    delete from private.group_member where group_id = g and user_id = p_user_id;
  end loop;
  delete from auth.users where id = p_user_id;
  return true;
end;
$$;

revoke all on function private.delete_account(uuid, text) from public, anon, authenticated, service_role;

grant execute on function private.delete_account(uuid, text) to plor_app;


-- ====================================================================================================================
-- Functions: The answer base
-- ====================================================================================================================

-- A thing by a reference: "source:id" names another source's entry, a bare id one of p_source's. null if unknown.
create function private.thing_by_ref(p_source text, p_ref text) returns uuid
  language sql stable set search_path = ''
as $$
  select s.thing_id from private.thing_source s
  where (position(':' in p_ref) > 0 and s.source = split_part(p_ref, ':', 1) and s.source_id = substr(p_ref, position(':' in p_ref) + 1))
     or (position(':' in p_ref) = 0 and s.source = p_source and s.source_id = p_ref);
$$;

revoke all on function private.thing_by_ref(text, text) from public, anon, authenticated, service_role;

-- The thing an ID names now: itself, or the thing a join or merge folded it into.
create function private.thing_now(p_id uuid) returns uuid
  language sql stable set search_path = ''
as $$
  select coalesce((select r.thing_id from private.thing_retired r where r.id = p_id), p_id);
$$;

revoke all on function private.thing_now(uuid) from public, anon, authenticated, service_role;

-- The display names of things, for the reveal, the board and the insights.
--
-- Names for the IDs a page holds, a retired one included (the admin puzzles page reads drafts' IDs from files).
create or replace function private.thing_names(p_ids uuid[]) returns table (id uuid, name text)
  language sql stable security definer set search_path = ''
as $$
  select x.id, t.name from unnest(p_ids) as x(id) join private.thing t on t.id = private.thing_now(x.id);
$$;

revoke all on function private.thing_names(uuid[]) from public, anon, authenticated, service_role;

grant execute on function private.thing_names(uuid[]) to plor_app;

-- A thing and everything above it in the kind_of tree, as the base stood at p_as_of.
create or replace function private.ancestors_as_of(p_thing uuid, p_as_of timestamptz) returns setof uuid
  language sql stable set search_path = ''
as $$
  with recursive up (id) as (
    select p_thing
    union
    select f.value_thing from private.fact f join up on f.thing_id = up.id
    where f.trait = 'kind_of' and f.added_at <= p_as_of and (f.removed_at is null or f.removed_at > p_as_of)
  )
  select id from up;
$$;

revoke all on function private.ancestors_as_of(uuid, timestamptz) from public, anon, authenticated, service_role;

-- M13 13e-5: the base's shape (docs/milestones/M13-13e-5-the-base-shape.md; human, 2026-10-26: "One tree-walk
-- function", "Yes, check on import (Recommended)"). The downward kind_of walk, written in category_members,
-- approve_puzzle's caught set, scripts/draft.ts and the review, becomes private.descendants_now; the upward one is
-- already private.ancestors_as_of. import_source refuses a kind_of circle, as load_links does (13e-2).
-- private.descendants_now holds no grant: it is reached only through those functions and the owner's scripts.
--
-- Things and everything under them in the kind_of tree now. "union" visits each thing once, so a circle can't loop.
create function private.descendants_now(p_things uuid[]) returns setof uuid
  language sql stable set search_path = ''
as $$
  with recursive down (id) as (
    select unnest(p_things)
    union
    select f.thing_id from private.fact f join down d on f.value_thing = d.id where f.trait = 'kind_of' and f.removed_at is null
  )
  select id from down;
$$;

revoke all on function private.descendants_now(uuid[]) from public, anon, authenticated, service_role;

-- Whether a typed (normalized) name starts with the letter, a leading "the " ignored (human, 2026-10-26: "What's
-- typed must start with it (Recommended)": "The Gambia" counts under G).
create function private.alias_starts(p_alias text, p_letter text) returns boolean
  language sql immutable set search_path = ''
  return left(regexp_replace(p_alias, '^the ', ''), 1) = p_letter;

revoke all on function private.alias_starts(text, text) from public, anon, authenticated, service_role;

-- The admin browse page (human, 2026-10-24: "Search and browse (Recommended)"): every thing one of whose aliases is
-- exactly p_alias (normalized by the caller), with its names, sources, facts and the categories it falls in. Raises
-- OB007 for a caller who isn't an admin, as the puzzle functions do (M06); the route checks first too.
--
-- The admin lookup, as 13a-1's, without what was removed.
create or replace function private.base_lookup(p_admin uuid, p_alias text) returns jsonb
  language plpgsql stable security definer set search_path = ''
as $$
begin
  if not exists (select from private.admin a where a.user_id = p_admin) then
    raise exception using errcode = 'OB007', message = 'base_lookup: admins only';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', t.id,
      'name', t.name,
      'aliases', (select coalesce(jsonb_agg(jsonb_build_object('alias', a.alias, 'kind', a.kind, 'origin', a.origin)
                    order by a.kind, a.alias), '[]') from private.thing_alias a where a.thing_id = t.id and a.removed_at is null),
      'sources', (select coalesce(jsonb_agg(jsonb_build_object('source', s.source, 'id', s.source_id)
                    order by s.source), '[]') from private.thing_source s where s.thing_id = t.id),
      'facts', (select coalesce(jsonb_agg(jsonb_build_object('trait', f.trait, 'value', v.name, 'origin', f.origin,
                    'source_ref', f.source_ref) order by f.trait, v.name), '[]')
                from private.fact f join private.thing v on v.id = f.value_thing where f.thing_id = t.id and f.removed_at is null),
      'categories', (select coalesce(jsonb_agg(c.key order by c.key), '[]') from private.category c where private.in_category_now(t.id, c.key))
    ) order by t.name)
    from private.thing t
    where t.id in (select a.thing_id from private.thing_alias a where a.alias = p_alias and a.removed_at is null)), '[]');
end;
$$;

revoke all on function private.base_lookup(uuid, text) from public, anon, authenticated, service_role;

grant execute on function private.base_lookup(uuid, text) to plor_app;


-- ====================================================================================================================
-- Functions: Categories
-- ====================================================================================================================

-- The category's filter as format 3's `where` (A1), or null for a category with none.
create or replace function private.category_where(c private.category) returns jsonb
  language sql immutable set search_path = ''
  return case
    when c.fact_trait is not null then jsonb_strip_nulls(jsonb_build_object('trait', c.fact_trait, 'values', to_jsonb(c.fact_values), 'via', c.fact_via))
    when c.number_trait is not null then jsonb_build_object('number', c.number_trait, 'at_least', c.at_least)
    when c.starts_with is not null then jsonb_build_object('starts_with', c.starts_with)
  end;

revoke all on function private.category_where(private.category) from public, anon, authenticated, service_role;

-- Whether a thing fits a filter as the base stood at p_as_of: the fact (on the thing, or on its country), the number,
-- or a name starting with the letter. A null filter fits everything.
--
-- As 13e-4a's, a fact matching any of the filter's values.
create or replace function private.fits_where(p_thing uuid, p_where jsonb, p_as_of timestamptz) returns boolean
  language sql stable set search_path = ''
  return p_where is null
    or (p_where ? 'trait' and p_where ->> 'via' is null and exists (
      select from private.fact f
      where f.thing_id = p_thing and f.trait = p_where ->> 'trait'
        and f.value_thing in (select v::uuid from jsonb_array_elements_text(p_where -> 'values') as v)
        and f.added_at <= p_as_of and (f.removed_at is null or f.removed_at > p_as_of)))
    or (p_where ->> 'via' = 'country' and exists (
      select from private.fact v join private.fact f on f.thing_id = v.value_thing
      where v.thing_id = p_thing and v.trait = 'country' and v.added_at <= p_as_of and (v.removed_at is null or v.removed_at > p_as_of)
        and f.trait = p_where ->> 'trait'
        and f.value_thing in (select x::uuid from jsonb_array_elements_text(p_where -> 'values') as x)
        and f.added_at <= p_as_of and (f.removed_at is null or f.removed_at > p_as_of)))
    or (p_where ? 'number' and exists (
      select from private.number_fact n
      where n.thing_id = p_thing and n.trait = p_where ->> 'number' and n.value >= (p_where ->> 'at_least')::numeric
        and n.added_at <= p_as_of and (n.removed_at is null or n.removed_at > p_as_of)))
    or (p_where ? 'starts_with' and exists (
      select from private.thing_alias a
      where a.thing_id = p_thing and private.alias_starts(a.alias, p_where ->> 'starts_with')
        and a.added_at <= p_as_of and (a.removed_at is null or a.removed_at > p_as_of)));

revoke all on function private.fits_where(uuid, jsonb, timestamptz) from public, anon, authenticated, service_role;

-- Defines or redefines a category by its root (and optional member_of) as source entries. Run by the import scripts
-- as the owner; no role is granted it.
--
-- As 13a-1's and 13e-4a's, and in an open load a root, member_of or value no import of this load gave is refused, as
-- a fresh load refuses it as unknown (3).
create or replace function private.define_category(p_key text, p_name text, p_source text, p_root text, p_member_of text)
  returns void
  language plpgsql set search_path = ''
as $$
declare
  root_id uuid := private.thing_by_ref(p_source, p_root);
  member_id uuid := private.thing_by_ref(p_source, p_member_of);
begin
  if root_id is null or (p_member_of is not null and member_id is null) then
    raise exception 'define_category %: % or % is not a % thing', p_key, p_root, p_member_of, p_source;
  end if;
  if private.load_open() and not (private.load_ref_seen(p_source, p_root) and (p_member_of is null or private.load_ref_seen(p_source, p_member_of))) then
    raise exception 'define_category %: % or % is no longer in the files this load gives', p_key, p_root, p_member_of;
  end if;
  insert into private.category (key, name, root, member_of) values (p_key, p_name, root_id, member_id)
  -- A key that was a subset becomes a base: its filter goes with it (ROADMAP, 13e-4a review; 13f-3b-2).
  on conflict (key) do update set name = excluded.name, root = excluded.root, member_of = excluded.member_of,
    fact_trait = null, fact_values = null, fact_via = null, number_trait = null, at_least = null, starts_with = null;
  insert into private.base_log (actor, action, detail)
  values ('source:' || p_source, 'define_category',
    jsonb_build_object('key', p_key, 'name', p_name, 'root', p_root, 'member_of', p_member_of));
end;
$$;

revoke all on function private.define_category(text, text, text, text, text) from public, anon, authenticated, service_role;

-- Defines or redefines a subset: its base category's root and member_of, and one filter (A1's forms, with a fact's
-- value as a source entry of p_source). The base must be defined first, as data/categories.json orders them.
--
-- As 13e-4a's, with a fact filter's values as source entries of p_source, each one loaded.
create or replace function private.define_subset(p_key text, p_name text, p_of text, p_source text, p_where jsonb) returns void
  language plpgsql set search_path = ''
as $$
declare
  base private.category;
  value_ids uuid[];
  unknown text;
begin
  select * into base from private.category where key = p_of;
  if not found then
    raise exception 'define_subset %: no base category %', p_key, p_of;
  end if;
  if p_where ? 'trait' then
    select string_agg(v, ', ') into unknown from jsonb_array_elements_text(p_where -> 'values') as v where private.thing_by_ref(p_source, v) is null;
    if unknown is not null then
      raise exception 'define_subset %: % not % things', p_key, unknown, p_source;
    end if;
    if private.load_open() then
      select string_agg(v, ', ') into unknown from jsonb_array_elements_text(p_where -> 'values') as v where not private.load_ref_seen(p_source, v);
      if unknown is not null then
        raise exception 'define_subset %: % no longer in the files this load gives', p_key, unknown;
      end if;
    end if;
    select array_agg(private.thing_by_ref(p_source, v)) into value_ids from jsonb_array_elements_text(p_where -> 'values') as v;
  end if;
  insert into private.category (key, name, root, member_of, fact_trait, fact_values, fact_via, number_trait, at_least, starts_with)
  values (p_key, p_name, base.root, base.member_of, p_where ->> 'trait', value_ids, p_where ->> 'via', p_where ->> 'number',
    (p_where ->> 'at_least')::numeric, p_where ->> 'starts_with')
  on conflict (key) do update set name = excluded.name, root = excluded.root, member_of = excluded.member_of,
    fact_trait = excluded.fact_trait, fact_values = excluded.fact_values, fact_via = excluded.fact_via,
    number_trait = excluded.number_trait, at_least = excluded.at_least, starts_with = excluded.starts_with;
  insert into private.base_log (actor, action, detail)
  values ('source:' || p_source, 'define_category', jsonb_build_object('key', p_key, 'name', p_name, 'of', p_of, 'where', p_where));
end;
$$;

revoke all on function private.define_subset(text, text, text, text, jsonb) from public, anon, authenticated, service_role;

-- A category's members: every thing under its root in the kind_of tree (the root itself excluded: "animal" isn't an
-- answer to "Name an animal"), that has a name players can type, and, if the category says so, is member_of its
-- thing. union (not union all) ends the walk on a cycle in a source's tree.
--
-- A category's members now (the approval checks, drafting, the review): as before, without what was removed, and with
-- what the human accepted for it.
--
-- As 13b's, and fitting the category's filter.
--
-- As 13e-4b's, walking with descendants_now.
--
-- The drafting tools' speed (docs/milestones/M13-13f-4-scale-and-leftovers.md, 13f-4a; human, 2026-10-28: "Split by
-- kind (Recommended)"). As 13e-5's category_members, but a category with no filter doesn't call fits_where for each
-- member: set search_path keeps it from being inlined, so the call alone took most of a base category's time (animal,
-- 56,169 members: 1.7 to 2.0 s with it, 0.5 to 0.7 s without; the ticket's Evidence). A subset still checks each member.
create or replace function private.category_members(p_key text) returns setof uuid
  language sql stable set search_path = ''
as $$
  with cat as (select c.root, c.member_of, private.category_where(c) as filter from private.category c where c.key = p_key),
  under (id) as (select private.descendants_now(array[root]) from cat)
  select u.id from under u cross join cat
  where u.id <> cat.root
    and exists (select from private.thing_alias a where a.thing_id = u.id and a.kind = 'name' and a.removed_at is null)
    and (cat.member_of is null or exists (
      select from private.fact m where m.thing_id = u.id and m.trait = 'member_of' and m.value_thing = cat.member_of and m.removed_at is null))
    and (cat.filter is null or private.fits_where(u.id, cat.filter, now()))
  union
  select e.thing_id from private.category_extra e where e.category = p_key and e.removed_at is null;
$$;

revoke all on function private.category_members(text) from public, anon, authenticated, service_role;

-- Whether a thing is a member of a category now: under its root with a name players can type (and member_of its
-- thing if it has one), or accepted for it by the human.
--
-- As 13b's, and fitting the category's filter.
create or replace function private.in_category_now(p_thing uuid, p_key text) returns boolean
  language sql stable set search_path = ''
as $$
  select exists (select from private.category_extra e where e.category = p_key and e.thing_id = p_thing and e.removed_at is null)
    or exists (
      select from private.category c
      where c.key = p_key and c.root <> p_thing
        and c.root in (select private.ancestors_as_of(p_thing, now()))
        and exists (select from private.thing_alias a where a.thing_id = p_thing and a.kind = 'name' and a.removed_at is null)
        and (c.member_of is null or exists (
          select from private.fact m
          where m.thing_id = p_thing and m.trait = 'member_of' and m.value_thing = c.member_of and m.removed_at is null))
        and private.fits_where(p_thing, private.category_where(c), now()));
$$;

revoke all on function private.in_category_now(uuid, text) from public, anon, authenticated, service_role;

-- The questions of format-3 days that ask a category.
create function private.category_questions(p_key text) returns table (game_id text, puzzle_date date, question_idx smallint)
  language sql stable set search_path = ''
as $$
  select p.game_id, p.puzzle_date, (q.i - 1)::smallint
  from private.puzzle p cross join jsonb_array_elements(p.content -> 'questions') with ordinality as q(v, i)
  where p.content ->> 'format' = '3' and q.v ->> 'category' = p_key;
$$;

revoke all on function private.category_questions(text) from public, anon, authenticated, service_role;


-- ====================================================================================================================
-- Functions: Loading the base
-- ====================================================================================================================

-- The session's load lock, a session-level advisory lock keyed by load_seen_item, so it outlives each set's
-- transaction and goes with the session if the load script dies.
create function private.load_open() returns boolean
  language sql stable set search_path = ''
  return exists (select from pg_catalog.pg_locks l
    where l.locktype = 'advisory' and l.pid = pg_catalog.pg_backend_pid() and l.granted
      and l.classid = 'private.load_seen_item'::regclass and l.objid = 0 and l.objsubid = 2);

-- Whether an import of the open load gave the item a ref names: "source:id", or an ID in p_source (as thing_by_ref).
-- One key lookup: thing_by_ref's two-branch "or" read the whole table for each ref once it held a load's items (a
-- reload stalled at 5 sets in 15 minutes).
create function private.load_ref_seen(p_source text, p_ref text) returns boolean
  language sql stable set search_path = ''
  return exists (select from private.load_seen_item s
    where s.source = case when position(':' in p_ref) > 0 then split_part(p_ref, ':', 1) else p_source end
      and s.source_id = case when position(':' in p_ref) > 0 then substr(p_ref, position(':' in p_ref) + 1) else p_ref end);

-- The kind_of ancestors as the files of the open load give them: owned facts this load marked, and every fact a
-- load doesn't own (players', the admin's). A row the files no longer give still counts for today (it ends at
-- midnight), but not for the circle checks: a fresh load of the same files wouldn't have it (4).
create function private.load_ancestors(p_thing uuid) returns setof uuid
  language sql stable set search_path = ''
as $$
  with recursive up (id) as (
    select p_thing
    union
    select f.value_thing from private.fact f join up on f.thing_id = up.id
    where f.trait = 'kind_of' and (f.removed_at is null or f.removed_at > now())
      and (not (f.origin = 'source' or (f.origin = 'ai' and f.source_ref = 'links'))
        or exists (select from private.load_seen_fact s where s.thing_id = f.thing_id and s.trait = 'kind_of' and s.value_thing = f.value_thing))
  )
  select id from up;
$$;

revoke all on function private.load_open(), private.load_ref_seen(text, text), private.load_ancestors(uuid)
  from public, anon, authenticated, service_role;

-- Loads one source's snapshot: each item is {id, name, aliases: [{alias, kind}], kind_of: [refs], member_of: [refs],
-- same_as?: ref}, where a ref is an id in this source or "source:id" in another (thing_by_ref). An item with same_as
-- is linked to that existing thing instead of becoming a new one (the same cheese in WordNet and USDA). Things
-- already linked to the same source ID are kept, with their name; new aliases and facts are added. Every ref must
-- name a known thing, from this snapshot or an earlier import, or nothing is loaded. Run by the import scripts as the
-- owner (scripts/base.ts); no role is granted it.
--
-- M13 13a-2: days built on the answer database (docs/milestones/M13-13a-the-base.md, "13a-2 and 13a-3"). A format-3
-- day keeps no copy of its lists: every typed answer is resolved against the base as of the day's approval, so a
-- started day never changes and the database grows with the base, not with days (human, 2026-10-24, on size).
-- Security change (DECISIONS.md Log): plor_app may execute private.resolve_answer and private.thing_names, which
-- read the base with their owner's rights and return only what a published day's answer needs.
--
-- A new thing takes the item's thing_id when it has one: the import computes it from the source entry, so the same
-- import gives the same IDs on every database (human, 2026-10-24: "Same everywhere (Recommended)"; M13 D3).
-- A thing merged from another source keeps its name, unless it had no name players can type (a taxon named by its
-- scientific name): then it takes the merging item's, so a WordNet "horse" merged into a Wikidata taxon shows as
-- "horse" (13a-1 review: display names after a merge).
--
-- As 13a-2's, with the three new traits among an item's facts and its population as a number fact (13e-4a).
--
-- As 13e-4a's, refusing a kind_of circle.
--
-- Failures to fail loudly (docs/milestones/M13-13f-3-import-and-draft-tools.md, 13f-3b-2; human, 2026-10-27: "Failures
-- and tests first (Recommended)"). As 13f-3b-1's and 13f-3a's functions, and:
-- - import_source refuses a same_as naming another thing than the one its item is already loaded as;
-- - import_source and load_finish name the same circle each time when there are several;
-- - define_category clears a subset's filter when its key becomes a base;
-- - approve_puzzle gives its problems as a JSON list in the error's detail, so the admin page splits none in two.
--
-- The database's gaps (docs/milestones/M13-13f-4-scale-and-leftovers.md, 13f-4b; the human's answers, rounds 4 to 6,
-- 2026-10-28). As the latest import_source, load_links, load_finish, record_miss and add_player_thing, and:
-- - a fact and a link for one edge share a row, so a load brings it back by either kind it owns (import_source,
--   load_links);
-- - import_source refuses a retired ID given for another thing than the one it points at;
-- - load_finish names an approved day not started yet whose host answer's ancestor lost its kind_of, and unlocks last;
-- - record_miss judges a miss by the day's frozen question (its root, member_of and filter), not the category now;
-- - add_player_thing shows a player-added thing as players' text normalized; typed_form goes with its last caller.
create or replace function private.import_source(p_source text, p_snapshot text, p_items jsonb) returns jsonb
  language plpgsql set search_path = ''
as $$
declare
  ref text := p_source || ':' || p_snapshot;
  open boolean := private.load_open();
  new_things int;
  new_aliases int;
  new_facts int;
  new_numbers int;
  unknown text;
  kids uuid[];
  parents uuid[];
  circle text;
  bad text;
begin
  -- An open load marks every item it gives first, so refs between items of this batch count (3).
  if open then
    insert into private.load_seen_item (source, source_id)
    select p_source, i->>'id' from jsonb_array_elements(p_items) as i
    on conflict do nothing;
    -- A ref to an item the base has but no import of this load gave: a fresh load of the same files would refuse it
    -- as unknown (13f-3a review). Refs the base lacks fall to the checks below.
    with refs (r) as (
      select i->>'same_as' from jsonb_array_elements(p_items) as i where i ? 'same_as'
      union
      select i->>'merged_into' from jsonb_array_elements(p_items) as i where i ? 'merged_into'
      union
      select v from jsonb_array_elements(p_items) as i
      cross join (values ('kind_of'), ('member_of'), ('country'), ('continent'), ('conservation_status'), ('genre'), ('publisher')) as t(trait)
      cross join jsonb_array_elements_text(coalesce(i->t.trait, '[]')) as v
    )
    select string_agg(r, ', ' order by r) into bad
    from refs where private.thing_by_ref(p_source, r) is not null and not private.load_ref_seen(p_source, r);
    if bad is not null then
      raise exception 'import_source: refs to items no file of this load gives (they left their snapshot, or load after this set): %', left(bad, 500);
    end if;
  end if;

  -- A merge names a kept item of the same source, in this batch or already loaded; never both same_as and merged_into.
  with kept as (
    select p_source || ':' || (k->>'id') as ref from jsonb_array_elements(p_items) as k where not k ? 'merged_into'
  )
  select string_agg(distinct i->>'id', ', ') into bad
  from jsonb_array_elements(p_items) as i left join kept on kept.ref = i->>'merged_into'
  where i ? 'merged_into' and (i ? 'same_as' or (kept.ref is null and private.thing_by_ref(p_source, i->>'merged_into') is null));
  if bad is not null then
    raise exception 'import_source: merged_into must name a kept item of this source, and not beside same_as: %', left(bad, 500);
  end if;
  -- A merge reaches only items not loaded yet: one already loaded as its own thing would keep it silently.
  with kept as (
    select p_source || ':' || (k->>'id') as ref, (k->>'thing_id')::uuid as given from jsonb_array_elements(p_items) as k where not k ? 'merged_into'
  )
  select string_agg(distinct i->>'id', ', ') into bad
  from jsonb_array_elements(p_items) as i left join kept on kept.ref = i->>'merged_into'
  join private.thing_source s on s.source = p_source and s.source_id = i->>'id'
  where i ? 'merged_into' and s.thing_id is distinct from coalesce(private.thing_by_ref(p_source, i->>'merged_into'), kept.given);
  if bad is not null then
    raise exception 'import_source: already loaded as their own things, so they can''t merge now (npx supabase db reset, then npm run base -- load all): %', left(bad, 500);
  end if;

  select string_agg(distinct i->>'same_as', ', ') into unknown
  from jsonb_array_elements(p_items) as i
  where i ? 'same_as' and private.thing_by_ref(p_source, i->>'same_as') is null;
  if unknown is not null then
    raise exception 'import_source: same_as refs unknown: %', left(unknown, 500);
  end if;
  -- An item already linked keeps its thing, so a same_as naming another thing (a re-fetch where a WordNet synset
  -- newly names a loaded Wikidata thing) would be kept apart without a word (ROADMAP, 13a-1 review; 13f-3b-2).
  select string_agg(format('%s (its thing %s, same_as %s)', i->>'id', s.thing_id, private.thing_by_ref(p_source, i->>'same_as')), ', ')
  into bad
  from jsonb_array_elements(p_items) as i
  join private.thing_source s on s.source = p_source and s.source_id = i->>'id'
  where i ? 'same_as' and s.thing_id <> private.thing_by_ref(p_source, i->>'same_as');
  if bad is not null then
    raise exception 'import_source: same_as names another thing than the one the item is loaded as (npx supabase db reset, then npm run base -- load all): %', left(bad, 500);
  end if;

  -- New source IDs get a new thing, or the same_as one, or the kept item's for a merge (13e-5b: the kept item's thing
  -- when loaded, else its given ID in this batch). "materialized" makes each random ID once, for both inserts.
  -- The kept items a merge can name in this batch, joined once (a lookup per item scanned the batch for each).
  with kept as materialized (
    select p_source || ':' || (k->>'id') as ref, (k->>'thing_id')::uuid as given
    from jsonb_array_elements(p_items) as k where not k ? 'merged_into'
  ), item as materialized (
    select distinct on (i->>'id') i->>'id' as source_id, i->>'name' as name, i ? 'same_as' as joined,
      coalesce(private.thing_by_ref(p_source, i->>'same_as'), private.thing_by_ref(p_source, i->>'merged_into'), kept.given) as same,
      (i->>'thing_id')::uuid as given
    from jsonb_array_elements(p_items) as i left join kept on kept.ref = i->>'merged_into'
  ), fresh as materialized (
    select coalesce(n.same, n.given, gen_random_uuid()) as thing_id, n.source_id, n.name, n.same is null as is_new, n.joined, n.given from item n
    where not exists (select from private.thing_source s where s.source = p_source and s.source_id = n.source_id)
  ), made as (
    insert into private.thing (id, name) select thing_id, name from fresh where is_new returning id
  ), linked as (
    insert into private.thing_source (source, source_id, thing_id) select p_source, source_id, thing_id from fresh
  ), retired as (
    -- A join or a merge retires the ID the item would have had; files naming it still find its thing (DECISIONS.md
    -- Log, 2026-10-27: "Keep pointing").
    insert into private.thing_retired (id, thing_id, source_ref)
    select f.given, f.thing_id, ref from fresh f where not f.is_new and f.given is not null and f.given <> f.thing_id
    on conflict (id) do nothing
  ), renamed as (
    -- A joining WordNet item's name is the thing's shown name; the load picks it (scripts/base.ts, shownNames; 13e-5b,
    -- human, 2026-10-27: "Keep a name WordNet lists (Recommended)").
    update private.thing t set name = f.name from fresh f
    where not f.is_new and t.id = f.thing_id
      and ((p_source = 'oewn' and f.joined) or not exists (select from private.thing_alias a where a.thing_id = t.id and a.kind = 'name'))
  )
  select count(*) into new_things from made;

  -- A retired ID keeps pointing at the thing it was recorded for; given again for another thing it would point at the
  -- old one without a word (13e-5b review; 13f-4b).
  select string_agg(format('%s (retired for %s, now given for %s)', r.id, r.thing_id, s.thing_id), ', ') into bad
  from jsonb_array_elements(p_items) as i
  join private.thing_source s on s.source = p_source and s.source_id = i->>'id'
  join private.thing_retired r on r.id = (i->>'thing_id')::uuid
  where r.thing_id <> s.thing_id;
  if bad is not null then
    raise exception 'import_source: retired IDs given for another thing: %', left(bad, 500);
  end if;

  -- The shown name the files give each thing, as the renames above pick it on a fresh load (5): a joining WordNet item's
  -- name, or the name of a joining or merged item whose thing has no name the files give yet, replaces (strong); else
  -- the name of the item the thing was made from. A join or merge renames only a thing an earlier import made: one this
  -- batch makes doesn't exist yet for the rename's statement. load_finish shows it, so a load on a loaded base shows
  -- what a fresh one does (13f-3a; 13f-1's review: "cornet" kept on a live base). After the batch's items are linked
  -- (a fresh load's new items have no thing before), and before its names are marked, as the fresh rename reads the
  -- names before this batch's are added.
  if open then
    with batch as materialized (
      select p_source || ':' || (b->>'id') as ref from jsonb_array_elements(p_items) as b
    ), named as (
      select s.thing_id, i->>'name' as name, i->>'id' as id,
        (i ? 'same_as' or i ? 'merged_into')
        and not exists (select from batch
          where batch.ref = case when position(':' in coalesce(i->>'same_as', i->>'merged_into')) > 0
            then coalesce(i->>'same_as', i->>'merged_into') else p_source || ':' || coalesce(i->>'same_as', i->>'merged_into') end)
        and ((p_source = 'oewn' and i ? 'same_as') or not exists (
          select from private.thing_alias a where a.thing_id = s.thing_id and a.kind = 'name' and (a.removed_at is null or a.removed_at > now())
            and (a.origin <> 'source' or exists (select from private.load_seen_alias x where x.thing_id = a.thing_id and x.alias = a.alias)))) as strong,
        not (i ? 'same_as' or i ? 'merged_into') as made
      from jsonb_array_elements(p_items) as i
      join private.thing_source s on s.source = p_source and s.source_id = i->>'id'
    )
    insert into private.load_seen_name (thing_id, name, strong)
    select distinct on (thing_id) thing_id, name, strong from named
    where strong or made
    order by thing_id, strong desc, id
    on conflict (thing_id) do update set name = excluded.name, strong = true where excluded.strong;
  end if;

  insert into private.thing_alias (thing_id, alias, kind, origin, source_ref)
  select s.thing_id, a->>'alias', a->>'kind', 'source', ref
  from jsonb_array_elements(p_items) as i
  join private.thing_source s on s.source = p_source and s.source_id = i->>'id'
  cross join jsonb_array_elements(i->'aliases') as a
  on conflict (thing_id, alias) do nothing;
  get diagnostics new_aliases = row_count;

  -- A name waiting for midnight that the files give again stays (13f-3a; any import does it, so a single `load <set>`
  -- and the suites' fixture loads too).
  update private.thing_alias a set removed_at = null
  from jsonb_array_elements(p_items) as i
  join private.thing_source s on s.source = p_source and s.source_id = i->>'id'
  cross join jsonb_array_elements(i->'aliases') as x
  where a.thing_id = s.thing_id and a.alias = x->>'alias' and a.origin = 'source' and a.removed_at > now();

  -- Every name the files give, already loaded or not, so load_finish ends the ones they no longer give (13f-3a).
  if open then
    insert into private.load_seen_alias (thing_id, alias)
    select s.thing_id, a->>'alias'
    from jsonb_array_elements(p_items) as i
    join private.thing_source s on s.source = p_source and s.source_id = i->>'id'
    cross join jsonb_array_elements(i->'aliases') as a
    on conflict do nothing;
  end if;

  select string_agg(distinct v, ', ') into unknown
  from jsonb_array_elements(p_items) as i
  cross join (values ('kind_of'), ('member_of'), ('country'), ('continent'), ('conservation_status'), ('genre'), ('publisher')) as t(trait)
  cross join jsonb_array_elements_text(coalesce(i->t.trait, '[]')) as v
  where private.thing_by_ref(p_source, v) is null;
  if unknown is not null then
    raise exception 'import_source: refs unknown: %', left(unknown, 500);
  end if;

  with added as (
    insert into private.fact (thing_id, trait, value_thing, origin, source_ref)
    select s.thing_id, t.trait, private.thing_by_ref(p_source, v), 'source', ref
    from jsonb_array_elements(p_items) as i
    join private.thing_source s on s.source = p_source and s.source_id = i->>'id'
    cross join (values ('kind_of'), ('member_of'), ('country'), ('continent'), ('conservation_status'), ('genre'), ('publisher')) as t(trait)
    cross join jsonb_array_elements_text(coalesce(i->t.trait, '[]')) as v
    where private.thing_by_ref(p_source, v) <> s.thing_id
    on conflict (thing_id, trait, value_thing) do nothing
    returning thing_id, trait, value_thing
  )
  select count(*), coalesce(array_agg(thing_id) filter (where trait = 'kind_of'), '{}'),
    coalesce(array_agg(value_thing) filter (where trait = 'kind_of'), '{}')
  into new_facts, kids, parents from added;

  -- A fact waiting for midnight that the files give again stays, and every fact the files give is marked, as for names.
  -- A fact and a link for one edge share one row (one key), so either kind the load owns brings it back (13f-3b-1
  -- review; 13f-4b).
  -- In an open load one brought back is checked for circles as a new one is, and both are fresh for load_finish's
  -- check (4).
  with revived as (
    update private.fact f set removed_at = null
    from jsonb_array_elements(p_items) as i
    join private.thing_source s on s.source = p_source and s.source_id = i->>'id'
    cross join (values ('kind_of'), ('member_of'), ('country'), ('continent'), ('conservation_status'), ('genre'), ('publisher')) as t(trait)
    cross join jsonb_array_elements_text(coalesce(i->t.trait, '[]')) as v
    where f.thing_id = s.thing_id and f.trait = t.trait and f.value_thing = private.thing_by_ref(p_source, v)
      and (f.origin = 'source' or (f.origin = 'ai' and f.source_ref = 'links')) and f.removed_at > now()
    returning f.thing_id, f.trait, f.value_thing
  )
  select kids || coalesce(array_agg(thing_id) filter (where open and trait = 'kind_of'), '{}'),
    parents || coalesce(array_agg(value_thing) filter (where open and trait = 'kind_of'), '{}')
  into kids, parents from revived;
  if open then
    insert into private.load_seen_fact (thing_id, trait, value_thing)
    select s.thing_id, t.trait, private.thing_by_ref(p_source, v)
    from jsonb_array_elements(p_items) as i
    join private.thing_source s on s.source = p_source and s.source_id = i->>'id'
    cross join (values ('kind_of'), ('member_of'), ('country'), ('continent'), ('conservation_status'), ('genre'), ('publisher')) as t(trait)
    cross join jsonb_array_elements_text(coalesce(i->t.trait, '[]')) as v
    where private.thing_by_ref(p_source, v) <> s.thing_id
    on conflict do nothing;
    update private.load_seen_fact s set fresh = true
    from unnest(kids, parents) as n(child, parent)
    where s.thing_id = n.child and s.trait = 'kind_of' and s.value_thing = n.parent;
  end if;

  -- A circle in kind_of leaves the host-answer pick nothing to keep (ROADMAP, 13a-2 review), and joins make one likelier
  -- (13e-5; human, 2026-10-26: "Yes, check on import (Recommended)"). Any new circle runs through a new fact, so only
  -- those are checked: a new fact's child already above its parent. Each parent is walked up once. The exception undoes
  -- the whole import. In an open load the walk reads the base as the files give it (4): a re-fetch that reverses an
  -- edge loads as it does fresh, and load_finish catches a circle a later set closes. When one import closes several,
  -- the refusal names the first by name, the same one each time (ROADMAP, 13e-5 review; 13f-3b-2).
  if open then
    select format('%s (%s) kind_of %s (%s), and %s is already under %s', c.name, n.child, p.name, n.parent, p.name, c.name)
    into circle
    from (select distinct x.parent from unnest(parents) as x(parent)) as top
    cross join lateral private.load_ancestors(top.parent) as above(id)
    join unnest(kids, parents) as n(child, parent) on n.parent = top.parent and n.child = above.id
    join private.thing c on c.id = n.child
    join private.thing p on p.id = n.parent
    order by c.name, p.name, n.child, n.parent
    limit 1;
  else
    select format('%s (%s) kind_of %s (%s), and %s is already under %s', c.name, n.child, p.name, n.parent, p.name, c.name)
    into circle
    from (select distinct x.parent from unnest(parents) as x(parent)) as top
    cross join lateral private.ancestors_as_of(top.parent, now()) as above(id)
    join unnest(kids, parents) as n(child, parent) on n.parent = top.parent and n.child = above.id
    join private.thing c on c.id = n.child
    join private.thing p on p.id = n.parent
    order by c.name, p.name, n.child, n.parent
    limit 1;
  end if;
  if circle is not null then
    raise exception 'import_source: a kind_of circle: %', circle;
  end if;

  -- A population that changed ends the old one now, then the new one is added: two statements, so the current-row
  -- unique index never sees both.
  update private.number_fact n set removed_at = now()
  from jsonb_array_elements(p_items) as i
  join private.thing_source s on s.source = p_source and s.source_id = i->>'id'
  where i ? 'population' and n.thing_id = s.thing_id and n.trait = 'population' and n.removed_at is null
    and n.value <> (i->'population'->>'value')::numeric;
  insert into private.number_fact (thing_id, trait, value, as_of, origin, source_ref)
  select s.thing_id, 'population', (i->'population'->>'value')::numeric, (i->'population'->>'as_of')::date, 'source', ref
  from jsonb_array_elements(p_items) as i
  join private.thing_source s on s.source = p_source and s.source_id = i->>'id'
  where i ? 'population' and not exists (
    select from private.number_fact n where n.thing_id = s.thing_id and n.trait = 'population' and n.removed_at is null);
  get diagnostics new_numbers = row_count;
  if open then
    insert into private.load_seen_number (thing_id, trait)
    select s.thing_id, 'population'
    from jsonb_array_elements(p_items) as i
    join private.thing_source s on s.source = p_source and s.source_id = i->>'id'
    where i ? 'population'
    on conflict do nothing;
  end if;

  insert into private.base_log (actor, action, detail)
  values ('source:' || p_source, 'import', jsonb_build_object('snapshot', p_snapshot, 'items', jsonb_array_length(p_items),
    'things', new_things, 'aliases', new_aliases, 'facts', new_facts, 'numbers', new_numbers));
  return jsonb_build_object('things', new_things, 'aliases', new_aliases, 'facts', new_facts, 'numbers', new_numbers);
end;
$$;

revoke all on function private.import_source(text, text, jsonb) from public, anon, authenticated, service_role;

-- Adds the links given as [{thing, name, kind_of, kind_of_name}], refs as "source:id". Each name must be the thing's
-- name in the base, so a wrong ID in the file is refused, not linked; a link whose kind_of sits under its thing
-- (a cycle) is refused. A link already in the base, from the file or a source, is kept as it is. Any refusal
-- loads nothing. Run by `npm run base -- load all` as the owner; no role is granted it.
create or replace function private.load_links(p_links jsonb) returns jsonb
  language plpgsql set search_path = ''
as $$
declare
  open boolean := private.load_open();
  link jsonb;
  child uuid;
  parent uuid;
  added int := 0;
  n int;
  fresh boolean;
begin
  for link in select * from jsonb_array_elements(p_links) loop
    child := private.thing_by_ref('oewn', link ->> 'thing');
    parent := private.thing_by_ref('oewn', link ->> 'kind_of');
    if child is null or parent is null then
      raise exception 'link %: % or % is not in the base', link, link ->> 'thing', link ->> 'kind_of';
    end if;
    -- As import_source's refs: an item no import of this load gave would be unknown to a fresh load (3).
    if open and not (private.load_ref_seen('oewn', link ->> 'thing') and private.load_ref_seen('oewn', link ->> 'kind_of')) then
      raise exception 'link %: % or % is no longer in the files this load gives', link, link ->> 'thing', link ->> 'kind_of';
    end if;
    -- On a loaded base a rename lands in load_finish, after the links, so the name the files give counts (13f-3a review).
    if (select coalesce(s.name, t.name) from private.thing t left join private.load_seen_name s on s.thing_id = t.id where t.id = child)
        is distinct from link ->> 'name'
      or (select coalesce(s.name, t.name) from private.thing t left join private.load_seen_name s on s.thing_id = t.id where t.id = parent)
        is distinct from link ->> 'kind_of_name' then
      raise exception 'link %: the base names them % and %', link,
        (select name from private.thing where id = child), (select name from private.thing where id = parent);
    end if;
    if (open and child in (select private.load_ancestors(parent)))
      or (not open and child in (select private.ancestors_as_of(parent, now()))) then
      raise exception 'link %: % is already above %, so the link would make a cycle', link, link ->> 'name', link ->> 'kind_of_name';
    end if;
    insert into private.fact (thing_id, trait, value_thing, origin, source_ref)
    values (child, 'kind_of', parent, 'ai', 'links')
    on conflict (thing_id, trait, value_thing) do nothing;
    get diagnostics n = row_count;
    fresh := n > 0;
    -- The edge's row may be a snapshot's: either kind the load owns comes back (13f-3b-1 review; 13f-4b).
    update private.fact set removed_at = null
    where thing_id = child and trait = 'kind_of' and value_thing = parent
      and (origin = 'source' or (origin = 'ai' and source_ref = 'links')) and removed_at > now();
    fresh := fresh or found;
    if open then
      insert into private.load_seen_fact (thing_id, trait, value_thing, fresh) values (child, 'kind_of', parent, fresh)
      on conflict (thing_id, trait, value_thing) do update set fresh = load_seen_fact.fresh or excluded.fresh;
    end if;
    added := added + n;
  end loop;
  insert into private.base_log (actor, action, detail)
  values ('links', 'link', jsonb_build_object('links', jsonb_array_length(p_links), 'added', added));
  return jsonb_build_object('links', jsonb_array_length(p_links), 'added', added);
end;
$$;

revoke all on function private.load_links(jsonb) from public, anon, authenticated, service_role;

-- Erasing waits for midnight (Los Angeles, as private.day_of and answers_as_of count days): load_finish gives an owned
-- row the files no longer give a removed_at at the next day's start, so a started day, which reads the base as of its
-- start, stays as it began, and a later day doesn't hold it (human, 2026-10-27: "Erase at the next midnight
-- (Recommended)"). A run can be finished after midnight (DECISIONS.md, Timer), so an ended row is deleted only once a
-- whole day has passed since it ended (human, 2026-10-27: "Wait one more day (Recommended)"). A future removed_at is
-- only ever a load's: the admin's removals and a replaced population end at now(), and the admin removes player-added
-- and human rows only.
--
-- A load opens by erasing the owned rows that ended before yesterday began: no day in play, nor a run of yesterday
-- finished today, reads them now. Then nothing is seen. A row waiting for midnight stays ended unless this load gives it
-- again (import_source, load_links), so a load that fails half-way brings back only rows the files give (13f-3a review).
--
-- As 13f-3a's, holding the session's load lock until load_finish (1); a session that already holds it keeps it.
create or replace function private.load_begin() returns jsonb
  language plpgsql set search_path = ''
as $$
declare
  cutoff timestamptz := (private.today() - 1)::timestamp at time zone 'America/Los_Angeles';
  erased_aliases int;
  erased_facts int;
  erased_numbers int;
begin
  if not private.load_open() and not pg_catalog.pg_try_advisory_lock('private.load_seen_item'::regclass::oid::int, 0) then
    raise exception 'load_begin: another load is running; wait for it to finish';
  end if;
  delete from private.thing_alias where origin = 'source' and removed_at <= cutoff;
  get diagnostics erased_aliases = row_count;
  delete from private.fact
  where (origin = 'source' or (origin = 'ai' and source_ref = 'links')) and removed_at <= cutoff;
  get diagnostics erased_facts = row_count;
  delete from private.number_fact where origin = 'source' and removed_at <= cutoff;
  get diagnostics erased_numbers = row_count;
  truncate private.load_seen_alias, private.load_seen_fact, private.load_seen_number, private.load_seen_name, private.load_seen_item;
  if erased_aliases + erased_facts + erased_numbers > 0 then
    insert into private.base_log (actor, action, detail)
    values ('load', 'erase', jsonb_build_object('aliases', erased_aliases, 'facts', erased_facts, 'numbers', erased_numbers));
  end if;
  return jsonb_build_object('aliases', erased_aliases, 'facts', erased_facts, 'numbers', erased_numbers);
end;
$$;

revoke all on function private.load_begin() from public, anon, authenticated, service_role;

-- What the files no longer give (an import or link that gives a row waiting for midnight again has kept it): the owned
-- names, facts, links and populations no import or link of this load marked end at the next midnight; each thing shows the
-- name the files give it; and the categories not in p_categories go now, except one that holds a player's miss or an
-- admin's addition, or that a day from yesterday on names (human, 2026-10-27: "Keep for those days (Recommended)";
-- yesterday's for a run finished today). Kept ones are named, not erased. A population isn't brought back: the import
-- adds the files' one as current beside it.
--
-- As 13f-3a's, and: only in the session whose load is open; a circle a later set closed through a fact this load added
-- or brought back is refused (4); a dropped category is kept while an unfinished run of a day naming it exists (6);
-- and the approved days not started yet whose host answers lost a name, a fact or a link, or were renamed, are named
-- (7). It releases the load lock.
create or replace function private.load_finish(p_categories text[]) returns jsonb
  language plpgsql set search_path = ''
as $$
declare
  midnight timestamptz := (private.today() + 1)::timestamp at time zone 'America/Los_Angeles';
  ending_aliases int;
  ending_facts int;
  ending_links int;
  ending_numbers int;
  renamed int;
  named_off uuid[];
  facts_off uuid[];
  kinds_off uuid[];
  links_off uuid[];
  renamed_things uuid[];
  erased_categories text[];
  kept_categories text[];
  touched jsonb;
  circle text;
begin
  if not private.load_open() then
    raise exception 'load_finish: no load is open in this session (private.load_begin)';
  end if;

  -- On a fresh load every fact is fresh and import_source has checked each against all the ones before it; facts this
  -- load found already loaded can close a circle through a fresh one only after its check, so they're walked again.
  if exists (select from private.load_seen_fact where trait = 'kind_of' and not fresh) then
    select format('%s (%s) kind_of %s (%s), and %s is already under %s', c.name, n.thing_id, p.name, n.value_thing, p.name, c.name)
    into circle
    from (select distinct value_thing from private.load_seen_fact where trait = 'kind_of' and fresh) as top
    cross join lateral private.load_ancestors(top.value_thing) as above(id)
    join private.load_seen_fact n on n.trait = 'kind_of' and n.fresh and n.value_thing = top.value_thing and n.thing_id = above.id
    join private.thing c on c.id = n.thing_id
    join private.thing p on p.id = n.value_thing
    order by c.name, p.name, n.thing_id, n.value_thing
    limit 1;
    if circle is not null then
      raise exception 'load_finish: a kind_of circle: %', circle;
    end if;
  end if;

  with ended as (
    update private.thing_alias a set removed_at = midnight
    where a.origin = 'source' and a.removed_at is null
      and not exists (select from private.load_seen_alias s where s.thing_id = a.thing_id and s.alias = a.alias)
    returning a.thing_id
  )
  select count(*), coalesce(array_agg(distinct thing_id), '{}') into ending_aliases, named_off from ended;
  with ended as (
    update private.fact f set removed_at = midnight
    where f.origin = 'source' and f.removed_at is null
      and not exists (select from private.load_seen_fact s where s.thing_id = f.thing_id and s.trait = f.trait and s.value_thing = f.value_thing)
    returning f.thing_id, f.trait
  )
  select count(*), coalesce(array_agg(distinct thing_id), '{}'), coalesce(array_agg(distinct thing_id) filter (where trait = 'kind_of'), '{}')
  into ending_facts, facts_off, kinds_off from ended;
  with ended as (
    update private.fact f set removed_at = midnight
    where f.origin = 'ai' and f.source_ref = 'links' and f.removed_at is null
      and not exists (select from private.load_seen_fact s where s.thing_id = f.thing_id and s.trait = f.trait and s.value_thing = f.value_thing)
    returning f.thing_id
  )
  select count(*), coalesce(array_agg(distinct thing_id), '{}') into ending_links, links_off from ended;
  update private.number_fact n set removed_at = midnight
  where n.origin = 'source' and n.removed_at is null
    and not exists (select from private.load_seen_number s where s.thing_id = n.thing_id and s.trait = n.trait);
  get diagnostics ending_numbers = row_count;

  with changed as (
    update private.thing t set name = s.name
    from private.load_seen_name s
    where t.id = s.thing_id and t.name <> s.name
    returning t.id
  )
  select count(*), coalesce(array_agg(id), '{}') into renamed, renamed_things from changed;

  -- An approved day not started yet keeps what it was approved with only until its start, when it reads the base as it
  -- is then; each one this load changed is named, so the admin can check it again (human, 2026-10-28: "Name them, keep
  -- going (Recommended)").
  select coalesce(jsonb_agg(jsonb_build_object('date', p.puzzle_date, 'question', q.idx, 'answer', t.name, 'changes', ch.changes)
    order by p.puzzle_date, q.idx, t.name), '[]')
  into touched
  from private.puzzle p
  cross join jsonb_array_elements(p.content -> 'questions') with ordinality as q(v, idx)
  cross join jsonb_array_elements_text(coalesce(q.v -> 'host_answers', '[]')) as h(id)
  join private.thing t on t.id = h.id::uuid
  cross join lateral (select array_remove(array[
    case when t.id = any (named_off) then 'name ended' end,
    case when t.id = any (facts_off) then 'fact ended' end,
    case when t.id = any (links_off) then 'link ended' end,
    case when t.id = any (renamed_things) then 'renamed' end,
    -- An ended kind_of above it moves it out from under its category's root too (13f-3b-1 review; 13f-4b).
    case when exists (select from private.ancestors_as_of(t.id, now()) as up(id)
      where up.id <> t.id and up.id = any (kinds_off || links_off)) then 'above it ended' end], null) as changes) as ch
  where p.puzzle_date > private.today() and p.content ? 'approved_at' and cardinality(ch.changes) > 0;

  select coalesce(array_agg(c.key order by c.key), '{}') into kept_categories
  from private.category c
  where c.key <> all (p_categories)
    and (exists (select from private.miss_review r where r.category = c.key)
      or exists (select from private.category_extra e where e.category = c.key)
      or exists (select from private.puzzle p cross join jsonb_array_elements(p.content -> 'questions') as q
        where p.puzzle_date >= private.today() - 1 and q ->> 'category' = c.key)
      -- A run waits at a reveal until Next, so a day of any age can still be played on (DECISIONS.md, Timer; human,
      -- 2026-10-28: "Keep while unfinished (Recommended)").
      or exists (select from private.run_status s
        join private.puzzle p on p.game_id = s.game_id and p.puzzle_date = s.puzzle_date
        cross join jsonb_array_elements(p.content -> 'questions') as q
        where s.status = 'in_progress' and q ->> 'category' = c.key));
  with gone as (
    delete from private.category c where c.key <> all (p_categories) and c.key <> all (kept_categories) returning c.key
  )
  select coalesce(array_agg(key order by key), '{}') into erased_categories from gone;

  truncate private.load_seen_alias, private.load_seen_fact, private.load_seen_number, private.load_seen_name, private.load_seen_item;
  insert into private.base_log (actor, action, detail)
  values ('load', 'erase', jsonb_build_object('at', midnight, 'aliases', ending_aliases, 'facts', ending_facts,
    'links', ending_links, 'numbers', ending_numbers, 'renamed', renamed,
    'categories', to_jsonb(erased_categories), 'kept_categories', to_jsonb(kept_categories), 'touched', touched));
  -- Last: an unlock isn't undone by a rollback, so a failed write above leaves the load open, not half closed
  -- (13f-3b-1 review; 13f-4b).
  perform pg_catalog.pg_advisory_unlock('private.load_seen_item'::regclass::oid::int, 0);
  return jsonb_build_object('at', midnight, 'aliases', ending_aliases, 'facts', ending_facts, 'links', ending_links,
    'numbers', ending_numbers, 'renamed', renamed,
    'categories', to_jsonb(erased_categories), 'kept_categories', to_jsonb(kept_categories), 'touched', touched);
end;
$$;

revoke all on function private.load_finish(text[]) from public, anon, authenticated, service_role;


-- ====================================================================================================================
-- Functions: Answers, misses and the audit
-- ====================================================================================================================

-- The members a format-3 question accepts for some typed texts (normalized by the caller, src/game/matching.ts): for
-- each alias among p_texts, every thing that bears it and was a member of the question's category when the day was
-- approved (under its root, with a name players can type, and member_of its thing if it has one), whether the host
-- catches it (it is a host answer or under one: human, 2026-10-24, "Caught: bear covers it"), and its ancestors, so
-- the caller can pick among several. Only published days are read.
--
-- As 13a-2's, resolved as of private.answers_as_of instead of the approval alone, without what was removed by then,
-- and with what the human accepted for the question's category by then.
--
-- As 13b's, with the question's frozen filter (`where`): the thing fits it as of the day's answers, and a letter
-- subset's typed name starts with the letter, for an answer the human accepted for the category too.
create or replace function private.resolve_answer(p_game text, p_date date, p_index int, p_texts text[])
  returns table (alias text, thing_id uuid, caught boolean, ancestors uuid[])
  language plpgsql stable security definer set search_path = ''
as $$
declare
  q jsonb;
  as_of timestamptz;
  hosts uuid[];
  extras uuid[];
begin
  -- answers_as_of alone would hide a missing approved_at (greatest() skips nulls), so it's checked here (13b review).
  select p.content -> 'questions' -> p_index, private.answers_as_of(p.content, p.puzzle_date) into q, as_of
  from private.puzzle p where p.game_id = p_game and p.puzzle_date = p_date and p.content ->> 'format' = '3' and p.content ? 'approved_at';
  if q is null or as_of is null then
    raise exception 'resolve_answer: % % has no approved format-3 question %', p_game, p_date, p_index;
  end if;
  select array_agg(h::uuid) into hosts from jsonb_array_elements_text(q -> 'host_answers') as h;
  select coalesce(array_agg(e.thing_id), '{}') into extras
  from private.category_extra e
  where e.category = q ->> 'category' and e.added_at <= as_of and (e.removed_at is null or e.removed_at > as_of);
  return query
    select a.alias, a.thing_id, up.ids && hosts, up.ids
    from private.thing_alias a
    cross join lateral (select array_agg(x) as ids from private.ancestors_as_of(a.thing_id, as_of) as x) as up
    where a.alias = any(p_texts) and a.added_at <= as_of and (a.removed_at is null or a.removed_at > as_of)
      and (q -> 'where' ->> 'starts_with' is null or private.alias_starts(a.alias, q -> 'where' ->> 'starts_with'))
      and (a.thing_id = any(extras) or (
        a.thing_id <> (q ->> 'root')::uuid and (q ->> 'root')::uuid = any(up.ids)
        and exists (
          select from private.thing_alias n
          where n.thing_id = a.thing_id and n.kind = 'name' and n.added_at <= as_of and (n.removed_at is null or n.removed_at > as_of))
        and (q ->> 'member_of' is null or exists (
          select from private.fact m
          where m.thing_id = a.thing_id and m.trait = 'member_of' and m.value_thing = (q ->> 'member_of')::uuid
            and m.added_at <= as_of and (m.removed_at is null or m.removed_at > as_of)))
        and private.fits_where(a.thing_id, q -> 'where', as_of)));
end;
$$;

revoke all on function private.resolve_answer(text, date, int, text[]) from public, anon, authenticated, service_role;

grant execute on function private.resolve_answer(text, date, int, text[]) to plor_app;

-- A new thing for a text, a member of the category from now: under its root, and member_of its thing if it has one.
--
-- As 13b's, with a subset's direct fact (a country's continent, an animal's status) on the new thing (A2).
--
-- As 13e-4a's: a subset's direct fact goes on the new thing only when it has one value (several can't be chosen among).
create or replace function private.add_player_thing(p_key text, p_text text, p_origin text) returns uuid
  language plpgsql set search_path = ''
as $$
declare
  cat private.category;
  made uuid;
begin
  select * into strict cat from private.category where key = p_key;
  -- Shown as players' text normalized, as every name is (13f-1: "jackalope", not "JACKALOPE!!!"; 13f-4b).
  insert into private.thing (name) values (p_text) returning id into made;
  insert into private.thing_alias (thing_id, alias, kind, origin, source_ref) values (made, p_text, 'name', p_origin, 'miss:' || p_key);
  insert into private.fact (thing_id, trait, value_thing, origin, source_ref) values (made, 'kind_of', cat.root, p_origin, 'miss:' || p_key);
  if cat.member_of is not null then
    insert into private.fact (thing_id, trait, value_thing, origin, source_ref) values (made, 'member_of', cat.member_of, p_origin, 'miss:' || p_key);
  end if;
  if cat.fact_trait is not null and cat.fact_via is null and cardinality(cat.fact_values) = 1 then
    insert into private.fact (thing_id, trait, value_thing, origin, source_ref) values (made, cat.fact_trait, cat.fact_values[1], p_origin, 'miss:' || p_key);
  end if;
  return made;
end;
$$;

revoke all on function private.add_player_thing(text, text, text) from public, anon, authenticated, service_role;

-- Logs a miss for the question the player is on (false if it isn't: no run in progress at that index), and decides
-- what the text becomes once enough players typed it for the question's category (M13 D4): at least p_min_players,
-- and at least p_share_percent of the players who answered the category (a miss counts as answering), counted over
-- every day. In order: one typo from a member (p_near_typo) waits in the audit; a text naming a thing outside the
-- category is rejected (Facts win) and waits in the audit; one on the LDNOOBW list (p_listed) is held for the human;
-- any other becomes a new member. The caller (src/game/runs.ts) normalizes the text and works out the two flags.
--
-- As 13b's, for a subset (A2: "Learn only if it fits (Recommended)"): a letter subset's text that doesn't start with
-- its letter is logged and nothing more; a text a subset's filter can't be checked on (through its country, a number)
-- is held for the human instead of accepted.
--
-- As 13e-4a's, holding a text for a subset of several values too.
--
-- As 13e-4a's, refusing a day whose question names a category the base doesn't have, where it returned without a word
-- (13f-3a review): load_finish keeps a category while an unfinished run of a day naming it exists (6), so a missing
-- one is a fault.
create or replace function private.record_miss(p_user uuid, p_game text, p_date date, p_index int, p_typed text, p_text text,
  p_near_typo boolean, p_listed boolean, p_min_players int, p_share_percent numeric) returns boolean
  language plpgsql security definer set search_path = ''
as $$
declare
  cat private.category;
  q jsonb;
  typed_by int;
  answered int;
  outcome text;
  made uuid;
begin
  insert into private.missed_answer (user_id, game_id, puzzle_date, question_idx, typed, normalized)
  select s.user_id, s.game_id, s.puzzle_date, p_index, p_typed, p_text
  from private.run_status s
  where s.user_id = p_user and s.game_id = p_game and s.puzzle_date = p_date and s.status = 'in_progress' and s.answered = p_index;
  if not found then
    return false;
  end if;
  if p_text = '' then
    return true;
  end if;
  select c.* into cat from private.puzzle p join private.category c on c.key = p.content -> 'questions' -> p_index ->> 'category'
  where p.game_id = p_game and p.puzzle_date = p_date;
  if not found then
    raise exception 'record_miss: % % question % names a category the base doesn''t have', p_game, p_date, p_index;
  end if;
  -- The day's question as approved (its root, member_of and filter, frozen in the day: 13a-2, 13e-4a), as the answer
  -- check reads it, not the category as it is now, which a redefined subset changes (13e-4a review; 13f-4b).
  select p.content -> 'questions' -> p_index into q from private.puzzle p where p.game_id = p_game and p.puzzle_date = p_date;
  if q ->> 'root' is null then
    raise exception 'record_miss: % % question % has no frozen root (not format 3)', p_game, p_date, p_index;
  end if;
  if q -> 'where' ->> 'starts_with' is not null and not private.alias_starts(p_text, q -> 'where' ->> 'starts_with') then
    return true;
  end if;
  -- Two players reaching the threshold at once decide it once.
  perform pg_advisory_xact_lock(hashtextextended('miss:' || cat.key || ':' || p_text, 0));
  if exists (select from private.miss_review r where r.category = cat.key and r.text = p_text) then
    return true;
  end if;
  select count(distinct m.user_id) into typed_by
  from private.missed_answer m join private.category_questions(cat.key) q using (game_id, puzzle_date, question_idx)
  where m.normalized = p_text;
  if typed_by < p_min_players then
    return true;
  end if;
  select count(distinct x.user_id) into answered
  from (
    select m.user_id, m.game_id, m.puzzle_date, m.question_idx from private.missed_answer m
    union all
    select e.user_id, e.game_id, e.puzzle_date, e.question_idx from private.run_event e
  ) x join private.category_questions(cat.key) q using (game_id, puzzle_date, question_idx);
  if typed_by * 100 < answered * p_share_percent then
    return true;
  end if;
  -- Already a member since this day started (imported, or linked by the human): nothing to learn.
  if exists (select from private.thing_alias a where a.alias = p_text and a.removed_at is null
      and (exists (select from private.category_extra e where e.category = cat.key and e.thing_id = a.thing_id and e.removed_at is null)
        or ((q ->> 'root')::uuid <> a.thing_id and (q ->> 'root')::uuid in (select private.ancestors_as_of(a.thing_id, now()))
          and exists (select from private.thing_alias n where n.thing_id = a.thing_id and n.kind = 'name' and n.removed_at is null)
          and (q ->> 'member_of' is null or exists (select from private.fact m
            where m.thing_id = a.thing_id and m.trait = 'member_of' and m.value_thing = (q ->> 'member_of')::uuid and m.removed_at is null))
          and private.fits_where(a.thing_id, q -> 'where', now())))) then
    return true;
  end if;
  outcome := case
    when p_near_typo then 'near_typo'
    when exists (select from private.thing_alias a where a.alias = p_text and a.removed_at is null) then 'rejected'
    when p_listed then 'held'
    when q -> 'where' ? 'via' or q -> 'where' ? 'number' or jsonb_array_length(coalesce(q -> 'where' -> 'values', '[]')) > 1 then 'held_subset'
    -- add_player_thing builds the thing from the category as it is now; a day approved before the category changed
    -- (its root, member_of or filter) would get a thing in neither, so the human decides it on the audit (13f-4b review).
    when (q ->> 'root')::uuid <> cat.root or (q ->> 'member_of')::uuid is distinct from cat.member_of
      or (q -> 'where') is distinct from private.category_where(cat) then 'held_subset'
    else 'accepted'
  end;
  if outcome = 'accepted' then
    made := private.add_player_thing(cat.key, p_text, 'players');
  end if;
  insert into private.miss_review (category, text, outcome, thing_id, players, answered)
  values (cat.key, p_text, outcome, made, typed_by, answered);
  insert into private.base_log (actor, action, detail)
  values ('players', 'miss_review', jsonb_build_object('category', cat.key, 'text', p_text, 'outcome', outcome,
    'thing', made, 'players', typed_by, 'answered', answered));
  return true;
end;
$$;

revoke all on function private.record_miss(uuid, text, date, int, text, text, boolean, boolean, int, numeric)
  from public, anon, authenticated, service_role;

grant execute on function private.record_miss(uuid, text, date, int, text, text, boolean, boolean, int, numeric) to plor_app;

-- The audit (human, 2026-10-24: "an easy way for me to audit what's added and remove if needed"): every text that
-- reached the threshold, newest first, with the things already named by it (a rejected text's meanings) and the thing
-- an admin chose. Admins only (OB007), as private.base_lookup.
create function private.audit_list(p_admin uuid) returns jsonb
  language plpgsql stable security definer set search_path = ''
as $$
begin
  if not exists (select from private.admin a where a.user_id = p_admin) then
    raise exception using errcode = 'OB007', message = 'audit_list: admins only';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', r.id, 'category', r.category, 'category_name', c.name, 'text', r.text, 'outcome', r.outcome,
      'players', r.players, 'answered', r.answered, 'reached_at', r.reached_at,
      'thing', (select jsonb_build_object('id', t.id, 'name', t.name) from private.thing t where t.id = r.thing_id),
      'decision', r.decision, 'decided_at', r.decided_at,
      'chosen', (select jsonb_build_object('id', t.id, 'name', t.name) from private.thing t where t.id = r.chosen),
      'named', (
        select coalesce(jsonb_agg(distinct jsonb_build_object('id', t.id, 'name', t.name)), '[]')
        from private.thing_alias a join private.thing t on t.id = a.thing_id
        where a.alias = r.text and a.removed_at is null and a.thing_id is distinct from r.thing_id)
    ) order by r.reached_at desc, r.id desc)
    from private.miss_review r join private.category c on c.key = r.category), '[]');
end;
$$;

revoke all on function private.audit_list(uuid) from public, anon, authenticated, service_role;

grant execute on function private.audit_list(uuid) to plor_app;

-- M14 14b-2b-2b: the audit's one-click link for a near-typo (docs/milestones/M14-14b-2b-2-admin-build.md; round 10,
-- board 3: "the near-typo's first action is one click"). Security change (DECISIONS.md Log; human, 2026-10-26: "New
-- lookup function (Recommended)"): an admin-only function with its owner's rights, which plor_app may execute.
--
-- The answers a waiting near-typo review could be linked to: the category's members now (as private.audit_decide's
-- link requires) bearing a name among p_texts, the texts within a typo of what was typed, which the caller works out
-- with the game's own typo rule (src/game/matching.ts, withinTypo), so the rule has one place. Empty for a review that
-- isn't a waiting near-typo.
create function private.audit_near(p_admin uuid, p_review bigint, p_texts text[]) returns jsonb
  language plpgsql stable security definer set search_path = ''
as $$
begin
  if not exists (select from private.admin a where a.user_id = p_admin) then
    raise exception using errcode = 'OB007', message = 'audit_near: admins only';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name) order by t.name, t.id)
    from private.miss_review r
    join private.thing t on t.id in (select a.thing_id from private.thing_alias a where a.alias = any(p_texts) and a.removed_at is null)
    where r.id = p_review and r.outcome = 'near_typo' and r.decision is null and private.in_category_now(t.id, r.category)), '[]');
end;
$$;

revoke all on function private.audit_near(uuid, bigint, text[]) from public, anon, authenticated, service_role;

grant execute on function private.audit_near(uuid, bigint, text[]) to plor_app;

-- "N to review" on the admin pages ("Count on admin page (Recommended)"): held, rejected and near-typo texts not
-- yet decided.
create function private.audit_open_count(p_admin uuid) returns int
  language plpgsql stable security definer set search_path = ''
as $$
begin
  if not exists (select from private.admin a where a.user_id = p_admin) then
    raise exception using errcode = 'OB007', message = 'audit_open_count: admins only';
  end if;
  return (select count(*)::int from private.miss_review where outcome <> 'accepted' and decision is null);
end;
$$;

revoke all on function private.audit_open_count(uuid) from public, anon, authenticated, service_role;

grant execute on function private.audit_open_count(uuid) to plor_app;

-- An admin's decision on a text, taking effect from now (13b design, 4), so a day that started before keeps what it
-- had. A decision that doesn't fit the text's state raises OB012.
--   undo: any decision that made an answer, from now (human, 2026-10-24: "Yes, undo anything (Recommended)"): an
--     accepted text's thing stops being an answer, a link's name goes, an acceptance for the category ends.
--   link: the text becomes a name of p_thing, a member of the category ("New answer, you link (Recommended)"); an
--     accepted text's own thing stops being an answer.
--   accept: a held text becomes a new member.
--   accept_for_category: p_thing, which the rejected text names, becomes a member of this category alone. A rejected
--     text can't be linked (human, 2026-10-24: "keep china as only the place and country for now").
--   dismiss: a held, rejected or near-typo text stays out.
--
-- As 13b's: a held_subset text accepted by the human becomes a new thing accepted for the subset, as its filter can't
-- be checked on it (A2); undoing an accepted text also ends that acceptance.
--
-- M13 13e-4a review: private.audit_decide's Accept on a subset (docs/milestones/M13-13e-4-subsets.md, A2).
--
-- As 13e-4a's, with the acceptance for a subset whose filter a new thing can't carry (through its country, a number)
-- decided by that filter, whatever held the text (13e-4a review: a held offensive-word text never joined such a subset).
--
-- As 13e-4a review's, accepting a held text for a subset of several values too.
create or replace function private.audit_decide(p_admin uuid, p_review bigint, p_action text, p_thing uuid) returns void
  language plpgsql security definer set search_path = ''
as $$
declare
  r private.miss_review;
  made uuid;
  decided text;
begin
  if not exists (select from private.admin a where a.user_id = p_admin) then
    raise exception using errcode = 'OB007', message = 'audit_decide: admins only';
  end if;
  select * into r from private.miss_review where id = p_review for update;
  if not found then
    raise exception using errcode = 'OB012', message = format('audit: no review %s', p_review);
  end if;
  if p_action = 'undo' and r.decision = 'linked' then
    update private.thing_alias set removed_at = now() where thing_id = r.chosen and alias = r.text and removed_at is null;
    decided := 'undone';
  elsif p_action = 'undo' and r.decision = 'accepted' and r.outcome = 'rejected' then
    update private.category_extra set removed_at = now() where category = r.category and thing_id = r.chosen and removed_at is null;
    decided := 'undone';
  elsif p_action = 'undo' and r.thing_id is not null and (r.decision is null or r.decision = 'accepted') then
    update private.thing_alias set removed_at = now() where thing_id = r.thing_id and removed_at is null;
    update private.fact set removed_at = now() where thing_id = r.thing_id and removed_at is null;
    update private.category_extra set removed_at = now() where category = r.category and thing_id = r.thing_id and removed_at is null;
    decided := 'undone';
  elsif p_action = 'link' and r.outcome in ('accepted', 'near_typo') and r.decision is null then
    if p_thing is null or p_thing = r.thing_id or not private.in_category_now(p_thing, r.category) then
      raise exception using errcode = 'OB012', message = format('audit: %s is not a member of %s', p_thing, r.category);
    end if;
    if exists (select from private.thing_alias a where a.thing_id = p_thing and a.alias = r.text) then
      raise exception using errcode = 'OB012', message = format('audit: "%s" is or was already a name of %s', r.text, p_thing);
    end if;
    insert into private.thing_alias (thing_id, alias, kind, origin, source_ref)
    values (p_thing, r.text, 'synonym', 'human', 'miss_review:' || r.id);
    if r.thing_id is not null then
      update private.thing_alias set removed_at = now() where thing_id = r.thing_id and removed_at is null;
      update private.fact set removed_at = now() where thing_id = r.thing_id and removed_at is null;
    end if;
    decided := 'linked';
  elsif p_action = 'accept' and r.outcome in ('held', 'held_subset') and r.decision is null then
    made := private.add_player_thing(r.category, r.text, 'human');
    -- The subset's filter, not the hold's reason, decides: a text held for the offensive-word list on such a subset
    -- needs it too (13e-4a review).
    if exists (select from private.category c where c.key = r.category and (c.fact_via is not null or c.number_trait is not null or cardinality(c.fact_values) > 1)) then
      insert into private.category_extra (category, thing_id, added_by) values (r.category, made, p_admin);
    end if;
    decided := 'accepted';
  elsif p_action = 'accept_for_category' and r.outcome = 'rejected' and r.decision is null then
    if p_thing is null or not exists (
      select from private.thing_alias a where a.thing_id = p_thing and a.alias = r.text and a.removed_at is null) then
      raise exception using errcode = 'OB012', message = format('audit: "%s" is not a name of %s', r.text, p_thing);
    end if;
    if exists (select from private.category_extra e where e.category = r.category and e.thing_id = p_thing) then
      raise exception using errcode = 'OB012', message = format('audit: %s is or was already accepted for %s', p_thing, r.category);
    end if;
    insert into private.category_extra (category, thing_id, added_by) values (r.category, p_thing, p_admin);
    decided := 'accepted';
  elsif p_action = 'dismiss' and r.outcome <> 'accepted' and r.decision is null then
    decided := 'dismissed';
  else
    raise exception using errcode = 'OB012',
      message = format('audit: can''t %s review %s (%s, %s)', p_action, p_review, r.outcome, coalesce(r.decision, 'undecided'));
  end if;
  update private.miss_review
  set decision = decided, decided_by = p_admin, decided_at = now(), thing_id = coalesce(made, thing_id),
    chosen = case when p_action in ('link', 'accept_for_category') then p_thing else chosen end
  where id = p_review;
  insert into private.base_log (actor, action, detail)
  values ('admin:' || p_admin, 'audit', jsonb_build_object('review', p_review, 'action', p_action, 'thing', coalesce(made, p_thing)));
end;
$$;

revoke all on function private.audit_decide(uuid, bigint, text, uuid) from public, anon, authenticated, service_role;

grant execute on function private.audit_decide(uuid, bigint, text, uuid) to plor_app;


-- ====================================================================================================================
-- Functions: Puzzles and approval
-- ====================================================================================================================

-- The content was checked by src/content/puzzle.ts before the call; the table's own check ties it to its key, and the
-- existing trigger refuses changing a day that has started (OB004). A day with no puzzle yet, today included, can be
-- added.
--
-- Approving a format-3 day (DECISIONS.md, Puzzle approval; the admin page is still the one way in). Besides the M06
-- checks, it refuses a day whose questions don't hold up against the base, with every problem in one message (OB009):
-- an unknown category; a host bank entry that isn't a member; a host answer outside the host bank; a question with
-- no member the host doesn't catch that can still be typed (M04 rule 6). Whether a host answer's name avoids the
-- stolen letters is checked by the approve route, which normalizes names as the game does (src/content/puzzle.ts). It stores the day with approved_at, the moment its answers are
-- resolved as of, and per question its category's root and member_of, so a later change to the category leaves the
-- day as it was, and its member count, which the provisional bonus divides by (src/game/scoring.ts).
--
-- As 13a-2's, without what was removed.
--
-- M13 13c: rarity and the host (docs/milestones/M13-13c-rarity-and-the-host.md). Approval refuses a day leaving a
-- question with fewer than 3 familiar answers that are typeable and safe (M04 G9), or a level on a thing outside its
-- category.
--
-- As 13b's, with the familiar-answers check in place of "at least one answer the host doesn't catch can be typed".
--
-- As 13c's, freezing a subset's filter as `where` (A1), and counting only names starting with a letter subset's
-- letter among the familiar answers that can be typed (O4).
--
-- As 13e-4a's, the host's caught set walked with descendants_now.
create or replace function private.approve_puzzle(p_user uuid, p_content jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  approved jsonb := '[]';
  q jsonb;
  cat private.category;
  stolen text := '';
  pattern text;
  hosts uuid[];
  bank uuid[];
  member_ids uuid[];
  members int;
  problems text[] := '{}';
begin
  if not exists (select from private.admin where user_id = p_user) then
    raise exception 'admins_only: % is not an admin', p_user using errcode = 'OB007';
  end if;
  if (p_content ->> 'date')::date < private.today() then
    raise exception 'day_past: % % is over', p_content ->> 'game_id', p_content ->> 'date' using errcode = 'OB008';
  end if;
  if p_content ->> 'format' is distinct from '3' then
    raise exception 'puzzle_invalid: format 3 expected' using errcode = 'OB009', detail = '["format 3 expected"]';
  end if;
  -- A day's thing IDs come from its file, so an ID a join or merge retired is read as its thing's (13e-5b), and the day
  -- is stored with the current IDs. Two IDs the file holds apart that now name one thing would lose a level or repeat
  -- an answer, so they're refused.
  problems := problems || array(
    select format('question %s: %s name one thing now (%s)', x.n, string_agg(i.id, ' and '), private.thing_now(i.id::uuid))
    from jsonb_array_elements(p_content -> 'questions') with ordinality as x(q, n)
    cross join lateral (
      select h as id, 'host_bank' as part from jsonb_array_elements_text(x.q -> 'host_bank') as h
      union all select l, 'levels' from jsonb_object_keys(coalesce(x.q -> 'levels', '{}')) as l
    ) as i
    group by x.n, i.part, private.thing_now(i.id::uuid) having count(distinct i.id) > 1);
  p_content := jsonb_set(p_content, '{questions}', (
    select coalesce(jsonb_agg(x.q || jsonb_build_object(
      'host_answers', (select coalesce(jsonb_agg(private.thing_now(h::uuid)), '[]') from jsonb_array_elements_text(x.q -> 'host_answers') as h),
      'host_bank', (select coalesce(jsonb_agg(private.thing_now(b::uuid)), '[]') from jsonb_array_elements_text(x.q -> 'host_bank') as b),
      'levels', (select coalesce(jsonb_object_agg(private.thing_now(l.key::uuid), l.value), '{}') from jsonb_each(coalesce(x.q -> 'levels', '{}')) as l)
    ) order by x.n), '[]')
    from jsonb_array_elements(p_content -> 'questions') with ordinality as x(q, n)));
  for i in 0 .. jsonb_array_length(p_content -> 'questions') - 1 loop
    q := p_content -> 'questions' -> i;
    stolen := stolen || coalesce(q ->> 'steals', '');
    pattern := case when stolen = '' then null else '[' || stolen || ']' end;
    select * into cat from private.category where key = q ->> 'category';
    if not found then
      problems := problems || format('question %s: no category %s', i + 1, q ->> 'category');
      continue;
    end if;
    select coalesce(array_agg(x::uuid), '{}') into hosts from jsonb_array_elements_text(q -> 'host_answers') as x;
    select coalesce(array_agg(x::uuid), '{}') into bank from jsonb_array_elements_text(q -> 'host_bank') as x;
    -- In a variable, not a temp table: a security-definer function must not touch a relation the caller's session
    -- could have created first in pg_temp (PostgreSQL 17, "Writing SECURITY DEFINER Functions Safely"; 13a-2 review).
    member_ids := array(select private.category_members(cat.key));
    members := cardinality(member_ids);
    problems := problems || array(
      select format('question %s: host bank entry %s is not a %s', i + 1, b, cat.key)
      from unnest(bank) as b where b <> all (member_ids));
    -- The bonus's first guess splits each tier among its members (src/game/scoring.ts, firstGuess), so a level on a
    -- thing outside the category would skew every rare answer's share (13c review).
    problems := problems || array(
      select format('question %s: level on %s, which is not a %s', i + 1, l, cat.key)
      from jsonb_object_keys(coalesce(q -> 'levels', '{}')) as l where l::uuid <> all (member_ids));
    problems := problems || array(
      select format('question %s: host answer %s is not in the host bank', i + 1, h) from unnest(hosts) as h where h <> all (bank));
    -- Three familiar answers (common or uncommon in the day's levels) the host doesn't catch, the host answers and
    -- everything under them, that can be typed past the letters stolen so far (human, 2026-10-24: "Typeable and safe
    -- (Recommended)"; FAMILIAR_SAFE_MIN in src/config/tunables.ts, which scripts/draft.ts uses to pick the letters).
    if (
      select count(distinct m.id) from unnest(member_ids) as m(id) join private.thing_alias a on a.thing_id = m.id
      where a.removed_at is null and m.id not in (select private.descendants_now(hosts)) and (pattern is null or a.alias !~ pattern)
        and (cat.starts_with is null or private.alias_starts(a.alias, cat.starts_with))
        and q -> 'levels' ? m.id::text
    ) < 3 then
      problems := problems || format('question %s: fewer than 3 familiar answers the host doesn''t catch can be typed without %s', i + 1, stolen);
    end if;
    approved := approved || jsonb_build_array(q || jsonb_build_object('root', cat.root, 'member_of', cat.member_of, 'members', members)
      || case when private.category_where(cat) is null then '{}' else jsonb_build_object('where', private.category_where(cat)) end);
  end loop;
  if cardinality(problems) > 0 then
    -- The problems as a JSON list too, so a category name holding "; " stays one problem (ROADMAP, 13a-2 review).
    raise exception 'puzzle_invalid: %', array_to_string(problems, '; ') using errcode = 'OB009', detail = to_jsonb(problems)::text;
  end if;
  insert into private.puzzle (game_id, puzzle_date, content)
  values (p_content ->> 'game_id', (p_content ->> 'date')::date, p_content || jsonb_build_object('questions', approved, 'approved_at', now()))
  on conflict (game_id, puzzle_date) do update set content = excluded.content;
end;
$$;

revoke all on function private.approve_puzzle(uuid, jsonb) from public;

grant execute on function private.approve_puzzle(uuid, jsonb) to plor_app;


-- ====================================================================================================================
-- Functions: Friends and groups
-- ====================================================================================================================

-- Before a membership is added or removed, the group's row is locked, so changes to one group's members run one at a
-- time: the member count can't pass the cap, and two members leaving at once can't both hand the group to each
-- other. A join also locks the joining player's profile, so their group count can't pass the cap either. A delete has
-- already locked its membership row by the time this runs, so the app's leave and remove statements lock the group
-- first (src/groups/groups.ts, LOCK_GROUP); otherwise a creator's handover can deadlock with the member it hands the
-- group to leaving at the same moment. Deleting an account (Auth's cascade) still takes them the other way round, so
-- it can deadlock with a leave in the same group, which aborts one of them (40P01): ROADMAP, Next revision, For M12.
create function private.group_member_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform from private.player_group where id = case when tg_op = 'INSERT' then new.group_id else old.group_id end for update;
  if tg_op = 'INSERT' then
    perform from private.profile where user_id = new.user_id for no key update;
    -- 50 members per group (G11, human, 2026-10-22); GROUP_MAX_MEMBERS in src/config/tunables.ts, which the groups
    -- route test checks against this.
    if (select count(*) from private.group_member where group_id = new.group_id) >= 50 then
      raise exception 'group_full: group % has 50 members', new.group_id using errcode = 'OB009';
    end if;
    -- 10 groups per player (G11, human, 2026-10-22); GROUPS_PER_PLAYER in src/config/tunables.ts, likewise.
    if (select count(*) from private.group_member where user_id = new.user_id) >= 10 then
      raise exception 'too_many_groups: % is in 10 groups', new.user_id using errcode = 'OB010';
    end if;
    return new;
  end if;
  return old;
end;
$$;

-- After a member leaves, is removed or deletes their account: the last member's group is deleted, and a creator's
-- group passes to the longest-standing member (G6). When the group itself was deleted, both find nothing to do. Runs
-- with its owner's rights because it sets creator_id, which plor_app may not (G10, Source diff); the guard above runs
-- the same way so both act alike whoever deletes the membership.
create function private.group_member_left() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select from private.group_member where group_id = old.group_id) then
    delete from private.player_group where id = old.group_id;
  else
    update private.player_group set creator_id = (
      select user_id from private.group_member where group_id = old.group_id order by joined_at, user_id limit 1
    ) where id = old.group_id and creator_id = old.user_id;
  end if;
  return null;
end;
$$;

-- M07 7c: the live board (docs/milestones/M07-friends-and-live-board.md). Security change, approved by the human
-- on 2026-10-21 as D5 and D6 (DECISIONS.md: Real-time transport, and the Log).
--
-- D6: when a player starts, answers or opens the next question, their new state goes to the board topic of each
-- friend, and to their own so their page learns when their run ends. It's sent inside the same transaction, and
-- Realtime delivers it only after COMMIT, never after ROLLBACK (plan step 1, observed 2026-10-21). realtime.send
-- turns its own failures into a Postgres WARNING (its source, local stack 2026-10-22), so a failed send never fails
-- the answer; that friend's row on other boards stays stale until their next page load or reconnect. Accepted by
-- the human, 2026-10-22, over failing the answer (DECISIONS.md Log).
-- No spoilers: the payload says only playing (with the question) or finished, never how a run ended
-- (DECISIONS.md, Game 1: server is authoritative). How a friend's run ended comes over HTTP once the viewer has
-- finished.
--
-- M12 12d: the live board hides a friend's progress until you've finished (docs/milestones/M12-12d-decided-fixes.md;
-- human, 2026-10-23: "hide progress until you've finished", and only "not started" or "started" before then).
-- Replaces M07 7c's broadcast_board (the live board migration (git history, before the squash)), whose sending, failure handling and topic policy
-- are unchanged. What changes is who gets which message:
--   * the player's own board, and a friend who has finished that day, get every change, as before;
--   * a friend who hasn't finished gets one message, when the run starts, saying only `started`. A message for each
--     answer or Next would show the friend's progress by its count and timing.
-- v is 2: `started` is a state a v1 page doesn't know, so an old page logs the message and refetches (M00 data
-- design §2), and the refetch's 409 client_outdated reloads it (protocol 5).
create or replace function private.broadcast_board() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare
  s record;
  payload jsonb;
  started jsonb;
  recipient uuid;
begin
  select rs.status, rs.answered into s from private.run_status rs
  where rs.user_id = new.user_id and rs.game_id = new.game_id and rs.puzzle_date = new.puzzle_date;
  payload := jsonb_build_object(
    'v', 2,
    'type', 'friend_status',
    'username', (select p.username::text from private.profile p where p.user_id = new.user_id),
    'gameId', new.game_id,
    'puzzleDate', new.puzzle_date,
    'state', case when s.status = 'in_progress' then 'playing' else 'finished' end,
    'question', case when s.status = 'in_progress' then s.answered + 1 end
  );
  started := payload || jsonb_build_object('state', 'started', 'question', null);
  perform realtime.send(payload, 'friend_status', 'board:' || new.user_id::text, true);
  for recipient in
    select case when f.user_a = new.user_id then f.user_b else f.user_a end
    from private.friendship f where new.user_id in (f.user_a, f.user_b)
  loop
    if exists (select from private.run_status rs
               where rs.user_id = recipient and rs.game_id = new.game_id and rs.puzzle_date = new.puzzle_date
                 and rs.status in ('died', 'survived', 'timed_out')) then
      perform realtime.send(payload, 'friend_status', 'board:' || recipient::text, true);
    elsif tg_table_name = 'run' then
      perform realtime.send(started, 'friend_status', 'board:' || recipient::text, true);
    end if;
  end loop;
  return null;
end;
$$;

revoke all on function private.broadcast_board() from public, anon, authenticated, service_role;


-- ====================================================================================================================
-- Functions: Comments and reactions
-- ====================================================================================================================

-- M08 8d: new comments and reactions reach friends' open pages (docs/milestones/M08-comments-and-reactions.md,
-- Design, "Live"). No new security change: these sends use the board topics and the own-board read policy approved in
-- M07 (D5, D6; DECISIONS.md: Real-time transport), as the ticket's design says.
--
-- A comment or reaction added or removed nudges the board topic of the player who made it (for their other tabs) and
-- of each of their friends: everyone who can see it, since a comment or reaction is seen only by its author and their
-- friends. The payload says only which day changed and whether it was the thread (comments and reactions on them) or
-- the reactions on runs; the page then refetches over HTTP, which keeps every rule about who sees what. So no comment
-- text is sent, and a player who hasn't finished gets nothing but the nudge. Like the board's sends, these go inside
-- the writing transaction, and a failed send is a WARNING, never a failed write (DECISIONS.md Log, 2026-10-22).
-- Deleting a comment also deletes its reactions, and each of those nudges too; a page refetches once per nudge.
--
-- As the live comments migration (git history, before the squash), with one change: a group comment, or a reaction on one, nudges the board topic
-- of each current member of the group instead of the author's friends, and its payload names the group (G5). A
-- friends-thread payload is unchanged, so a page that predates groups keeps working. A reaction removed because its
-- comment was deleted sends nothing of its own: the comment's deletion already nudged everyone who saw it.
create or replace function private.broadcast_comments() returns trigger
  language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid;
  game text;
  day date;
  run_target uuid;
  comment_target bigint;
  grp uuid;
  kind text := 'comments_changed';
  payload jsonb;
  recipient uuid;
begin
  if tg_op = 'DELETE' then
    actor := old.user_id; game := old.game_id; day := old.puzzle_date;
  else
    actor := new.user_id; game := new.game_id; day := new.puzzle_date;
  end if;
  -- Nested, because each table has fields the other lacks and plpgsql checks a field only when the line runs.
  if tg_table_name = 'comment' then
    if tg_op = 'DELETE' then grp := old.group_id; else grp := new.group_id; end if;
  else
    if tg_op = 'DELETE' then
      run_target := old.run_user_id; comment_target := old.comment_id;
    else
      run_target := new.run_user_id; comment_target := new.comment_id;
    end if;
    if run_target is not null then
      kind := 'run_reactions_changed';
    else
      select c.group_id into grp from private.comment c where c.id = comment_target;
      if not found then return null; end if;
    end if;
  end if;
  payload := jsonb_build_object('v', 1, 'type', kind, 'gameId', game, 'puzzleDate', day);
  if grp is not null then payload := payload || jsonb_build_object('groupId', grp); end if;
  for recipient in
    select actor where grp is null
    union all
    select case when f.user_a = actor then f.user_b else f.user_a end
    from private.friendship f where grp is null and actor in (f.user_a, f.user_b)
    union all
    select m.user_id from private.group_member m where m.group_id = grp
  loop
    perform realtime.send(payload, kind, 'board:' || recipient::text, true);
  end loop;
  return null;
end;
$$;

revoke all on function private.broadcast_comments() from public, anon, authenticated, service_role;

revoke all on function private.broadcast_comments() from public, anon, authenticated, service_role;

-- Deletes a reported comment for everyone, with its reports and reactions (M08 D4, D5), and records it, when p_admin
-- is an admin. Returns false when nothing was deleted: the comment is missing or has no report, or p_admin isn't an
-- admin (the route refuses a non-admin before it calls this, M08 8c).
create function private.delete_reported_comment(p_admin uuid, p_comment bigint) returns boolean
  language plpgsql security definer set search_path = ''
as $$
declare
  recorded int;
begin
  with deleted as (
    delete from private.comment c
    where c.id = p_comment
      and exists (select from private.admin a where a.user_id = p_admin)
      and exists (select from private.comment_report r where r.comment_id = c.id)
    returning c.id, c.user_id, c.body
  )
  insert into private.comment_deletion (admin_id, comment_id, author_id, body)
  select p_admin, d.id, d.user_id, d.body from deleted d;
  get diagnostics recorded = row_count;
  return recorded = 1;
end;
$$;

revoke all on function private.delete_reported_comment(uuid, bigint) from public, anon, authenticated, service_role;

grant execute on function private.delete_reported_comment(uuid, bigint) to plor_app;

-- Records that p_admin, an admin, kept a comment with an open report: one made after its last keep, if any. Its
-- reports stay, so it stays hidden for the players who reported it (M08 D5; human, 2026-10-26: "Still hidden
-- (Recommended)"), and it leaves the admins' list until another player reports it (each reports a comment once).
-- Returns false when nothing was recorded: the comment is missing or has no open report, or p_admin isn't an admin
-- (the route refuses a non-admin before it calls this).
create function private.keep_reported_comment(p_admin uuid, p_comment bigint) returns boolean
  language plpgsql security definer set search_path = ''
as $$
declare
  recorded int;
begin
  insert into private.comment_keep (admin_id, comment_id, author_id, body)
  select p_admin, c.id, c.user_id, c.body from private.comment c
  where c.id = p_comment
    and exists (select from private.admin a where a.user_id = p_admin)
    and exists (
      select from private.comment_report r
      where r.comment_id = c.id
        and not exists (select from private.comment_keep k where k.comment_id = c.id and k.kept_at >= r.created_at)
    );
  get diagnostics recorded = row_count;
  return recorded = 1;
end;
$$;

revoke all on function private.keep_reported_comment(uuid, bigint) from public, anon, authenticated, service_role;

grant execute on function private.keep_reported_comment(uuid, bigint) to plor_app;


-- ====================================================================================================================
-- Views
-- ====================================================================================================================

-- §5: the four run states. security_invoker, so a reader needs its own grants and policies on the tables
-- (a view otherwise runs as its owner and skips RLS: M00 data design, "Principles used throughout").
--
-- The run states, now four again: died, survived, timed_out, in_progress. deadline is the current question's, for
-- the client's countdown.
--
-- deadline is null while the reveal waits for Next, so such a run is in progress with no clock.
create or replace view private.run_status with (security_invoker = true) as
select
  s.user_id,
  s.game_id,
  s.puzzle_date,
  s.answered,
  s.questions,
  case
    when s.died then 'died'
    when s.answered = s.questions then 'survived'
    when statement_timestamp() > private.question_deadline(private.question_started_at(s.user_id, s.game_id, s.puzzle_date, s.answered)) then 'timed_out'
    else 'in_progress'
  end as status,
  case when not s.died and s.answered < s.questions
    then private.question_deadline(private.question_started_at(s.user_id, s.game_id, s.puzzle_date, s.answered))
  end as deadline
from (
  select
    r.user_id,
    r.game_id,
    r.puzzle_date,
    count(e.question_idx)::int as answered,
    jsonb_array_length(p.content -> 'questions') as questions,
    coalesce(bool_or(e.matched), false) as died
  from private.run r
  join private.puzzle p on p.game_id = r.game_id and p.puzzle_date = r.puzzle_date
  left join private.run_event e on e.user_id = r.user_id and e.game_id = r.game_id and e.puzzle_date = r.puzzle_date
  group by r.user_id, r.game_id, r.puzzle_date, p.content
) s;


-- ====================================================================================================================
-- Table and view privileges
-- ====================================================================================================================

revoke all on table private.profile from public, anon, authenticated, service_role;

grant select, insert on table private.profile to plor_app;

revoke all on table private.puzzle, private.run, private.run_event, private.run_status, private.missed_answer
  from public, anon, authenticated, service_role;

revoke all on sequence private.missed_answer_id_seq from public, anon, authenticated, service_role;

grant select on table private.puzzle to plor_app;

grant select, insert on table private.run, private.run_event to plor_app;

grant select on table private.run_status to plor_app;

grant insert on table private.missed_answer to plor_app;

revoke all on table private.admin from public, anon, authenticated, service_role;

grant select on table private.admin to plor_app;

-- The report lists the day's misses (without who typed them, D4), so plor_app may now read them too. Only the
-- admin-only route reads this table.
grant select on table private.missed_answer to plor_app;

revoke all on table private.question_open from public, anon, authenticated, service_role;

grant select, insert on table private.question_open to plor_app;

-- plor_app may change this one column, and only through an UPDATE the route scopes to the signed-in player
-- (DECISIONS.md: Row-level security in `private`, one policy per granted command).
grant update (display_name) on table private.profile to plor_app;

revoke all on table private.friend_invite, private.friendship from public, anon, authenticated, service_role;

-- Reading and creating a code, and replacing it on reset (the only column that changes).
grant select, insert on table private.friend_invite to plor_app;

grant update (code) on table private.friend_invite to plor_app;

-- Listing, adding and removing friends (D4).
grant select, insert, delete on table private.friendship to plor_app;

revoke all on table private.comment from public, anon, authenticated, service_role;

grant select, insert, delete on table private.comment to plor_app;

revoke all on table private.reaction from public, anon, authenticated, service_role;

grant select, insert, delete on table private.reaction to plor_app;

revoke all on table private.comment_report from public, anon, authenticated, service_role;

grant select, insert on table private.comment_report to plor_app;

revoke all on table private.points_ledger from public, anon, authenticated, service_role;

grant select, insert on table private.points_ledger to plor_app;

revoke all on table private.player_group, private.group_member from public, anon, authenticated, service_role;

-- Creating, reading and deleting a group; the creator renames it and resets its link. creator_id is set by the
-- handover trigger, which runs as its owner, so plor_app doesn't need it (G10 allowed it; Source diff).
grant select, insert, delete on table private.player_group to plor_app;

grant update (name, invite_code) on table private.player_group to plor_app;

-- Joining, listing members, leaving and removing (G6).
grant select, insert, delete on table private.group_member to plor_app;

grant update (username) on table private.profile to plor_app;

-- A10: a profile is created naming its user ID and username only; username_changed_at belongs to the trigger
-- (the username change migration (git history, before the squash)).
revoke insert on table private.profile from plor_app;

grant insert (user_id, username) on table private.profile to plor_app;

revoke all on table private.auth_attempt from public, anon, authenticated, service_role;

revoke all on table private.comment_deletion from public, anon, authenticated, service_role;

grant select on table private.comment_deletion to plor_app;

revoke all on table private.thing, private.thing_source, private.thing_alias, private.fact, private.category,
  private.base_log from public, anon, authenticated, service_role;

revoke all on table private.category_extra, private.miss_review from public, anon, authenticated, service_role;

-- One way to log a miss: through private.record_miss (DECISIONS.md, one way per thing). The insert policy goes with
-- the grant, so restoring one alone doesn't reopen the table (13b review).
revoke insert on table private.missed_answer from plor_app;

grant update (skip_game_screen, calendar_numbers) on table private.profile to plor_app;

grant update (theme) on table private.profile to plor_app;

revoke all on table private.number_fact from public, anon, authenticated, service_role;

revoke all on table private.comment_keep from public, anon, authenticated, service_role;

grant select on table private.comment_keep to plor_app;

revoke all on table private.thing_retired from public, anon, authenticated, service_role;

revoke all on private.load_seen_alias, private.load_seen_fact, private.load_seen_number, private.load_seen_name
  from public, anon, authenticated, service_role;

revoke all on private.load_seen_item from public, anon, authenticated, service_role;


-- ====================================================================================================================
-- Triggers
-- ====================================================================================================================

create trigger profile_username_change before update of username on private.profile
  for each row execute function private.profile_username_change();

create trigger puzzle_frozen_once_started
  before update on private.puzzle
  for each row execute function private.refuse_started_puzzle_change();

create trigger run_broadcast_board after insert on private.run
  for each row execute function private.broadcast_board();

create trigger run_event_rules
  before insert on private.run_event
  for each row execute function private.check_run_event();

create trigger run_event_broadcast_board after insert on private.run_event
  for each row execute function private.broadcast_board();

create trigger question_open_rules
  before insert on private.question_open
  for each row execute function private.check_question_open();

create trigger question_open_broadcast_board after insert on private.question_open
  for each row execute function private.broadcast_board();

create trigger group_member_guard before insert or delete on private.group_member
  for each row execute function private.group_member_guard();

create trigger group_member_left after delete on private.group_member
  for each row execute function private.group_member_left();

create trigger comment_broadcast after insert or delete on private.comment
  for each row execute function private.broadcast_comments();

create trigger reaction_broadcast after insert or delete on private.reaction
  for each row execute function private.broadcast_comments();


-- ====================================================================================================================
-- Row-level security policies
-- ====================================================================================================================

-- plor_app is not the owner and has no BYPASSRLS, so with RLS on and no policy it sees no rows and can
-- insert none (observed locally 2026-10-18: "new row violates row-level security policy"). These policies
-- name plor_app only, matching its grants; the Data API roles still have none. Which user's row a request
-- touches is decided by the route handler from the verified session.
create policy profile_plor_app_select on private.profile for select to plor_app using (true);

create policy profile_plor_app_insert on private.profile for insert to plor_app with check (true);

create policy profile_plor_app_update on private.profile for update to plor_app using (true) with check (true);

create policy admin_plor_app_select on private.admin for select to plor_app using (true);

create policy puzzle_plor_app_select on private.puzzle for select to plor_app using (true);

create policy run_plor_app_select on private.run for select to plor_app using (true);

create policy run_plor_app_insert on private.run for insert to plor_app with check (true);

create policy run_event_plor_app_select on private.run_event for select to plor_app using (true);

create policy run_event_plor_app_insert on private.run_event for insert to plor_app with check (true);

create policy question_open_plor_app_select on private.question_open for select to plor_app using (true);

create policy question_open_plor_app_insert on private.question_open for insert to plor_app with check (true);

create policy points_ledger_plor_app_select on private.points_ledger for select to plor_app using (true);

create policy points_ledger_plor_app_insert on private.points_ledger for insert to plor_app with check (true);

create policy missed_answer_plor_app_select on private.missed_answer for select to plor_app using (true);

create policy friend_invite_plor_app_select on private.friend_invite for select to plor_app using (true);

create policy friend_invite_plor_app_insert on private.friend_invite for insert to plor_app with check (true);

create policy friend_invite_plor_app_update on private.friend_invite for update to plor_app using (true) with check (true);

create policy friendship_plor_app_select on private.friendship for select to plor_app using (true);

create policy friendship_plor_app_insert on private.friendship for insert to plor_app with check (true);

create policy friendship_plor_app_delete on private.friendship for delete to plor_app using (true);

create policy player_group_plor_app_select on private.player_group for select to plor_app using (true);

create policy player_group_plor_app_insert on private.player_group for insert to plor_app with check (true);

create policy player_group_plor_app_update on private.player_group for update to plor_app using (true) with check (true);

create policy player_group_plor_app_delete on private.player_group for delete to plor_app using (true);

create policy group_member_plor_app_select on private.group_member for select to plor_app using (true);

create policy group_member_plor_app_insert on private.group_member for insert to plor_app with check (true);

create policy group_member_plor_app_delete on private.group_member for delete to plor_app using (true);

create policy comment_plor_app_select on private.comment for select to plor_app using (true);

create policy comment_plor_app_insert on private.comment for insert to plor_app with check (true);

create policy comment_plor_app_delete on private.comment for delete to plor_app using (true);

create policy reaction_plor_app_select on private.reaction for select to plor_app using (true);

create policy reaction_plor_app_insert on private.reaction for insert to plor_app with check (true);

create policy reaction_plor_app_delete on private.reaction for delete to plor_app using (true);

create policy comment_report_plor_app_select on private.comment_report for select to plor_app using (true);

create policy comment_report_plor_app_insert on private.comment_report for insert to plor_app with check (true);

create policy comment_deletion_plor_app_select on private.comment_deletion for select to plor_app using (true);

create policy comment_keep_plor_app_select on private.comment_keep for select to plor_app using (true);


-- ====================================================================================================================
-- Realtime: the live board's private topics
-- ====================================================================================================================

-- D5: a signed-in browser may join only its own board, `board:<own user id>`, and only to receive. There is no
-- INSERT policy, so browsers can't send. Shown to work on the local stack in plan step 1: the owner subscribed, and
-- another user got "Unauthorized". RLS on realtime.messages is already on and owned by Supabase, so it isn't
-- enabled here (Supabase Realtime /authorization).
create policy board_own_topic_select on realtime.messages for select to authenticated
  using ((select realtime.topic()) = 'board:' || (select auth.uid())::text and realtime.messages.extension = 'broadcast');

