-- M14 14b-3: invite codes of 10 base64url characters, 60 random bits, for friends and groups
-- (docs/milestones/M14-14b-3-invite-button.md; human, 2026-10-26: "10 characters (Recommended)", "Replace every link").
-- Security change (DECISIONS.md Log, 2026-10-26; human: "Approve it (Recommended)"): the codes are the tokens that add
-- a friend or join a group, so every existing one is replaced, and every link already sent stops working. No grant,
-- policy or RLS changes: plor_app keeps updating friend_invite.code and player_group.invite_code as it does.

-- A fresh code: 8 cryptographically strong random bytes (pgcrypto's gen_random_bytes, PostgreSQL 17, pgcrypto), in
-- base64url, cut to the first 10 characters, which carry 60 of their bits and stop before any padding. The app makes
-- its codes the same way (src/friends/friends.ts, newInviteCode). The unique constraints stay, so a collision fails
-- the migration loudly rather than overwriting anything.
alter table private.friend_invite drop constraint friend_invite_code_format;
alter table private.player_group drop constraint player_group_invite_code_format;

update private.friend_invite set code = left(translate(encode(extensions.gen_random_bytes(8), 'base64'), '+/', '-_'), 10);
update private.player_group set invite_code = left(translate(encode(extensions.gen_random_bytes(8), 'base64'), '+/', '-_'), 10);

alter table private.friend_invite add constraint friend_invite_code_format check (code ~ '^[A-Za-z0-9_-]{10}$');
alter table private.player_group add constraint player_group_invite_code_format check (invite_code ~ '^[A-Za-z0-9_-]{10}$');
