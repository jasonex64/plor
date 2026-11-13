-- M17 17c: friend invite links end (docs/milestones/M17-profiles-and-friend-requests.md, "17c design"; answers 6 and
-- 33). A friendship is made by an accepted friend request (17a), found by username (17b), so nothing reads or writes
-- a player's invite code any more. Security change of the removing kind (DECISIONS.md, log, 2026-11-13): dropping the
-- table drops plor_app's grants on it (select, insert, update of code) and its three policies; nothing is granted.
-- Every stored code is deleted. private.friendship is not touched: friendships made through links stay. Group invite
-- codes are private.player_group.invite_code, unchanged.
--
-- On a deployed site this goes to the database after the code that stops reading the table, not before.
drop table private.friend_invite;
