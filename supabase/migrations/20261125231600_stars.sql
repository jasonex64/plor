-- M24 24a: a player's stars (docs/milestones/M24-groups-tab-and-favourites.md). Security change, approved by the human
-- with the ticket on 2026-11-25 ("Approve M24"; DECISIONS.md, Log): plor_app may update these three columns and no
-- other column of either table.

-- A player's one starred group, their default: the Groups tab opens it (the human, 2026-11-25: "The one I starred",
-- "Just one star: the default"). The star is the membership's, so leaving, removal and account deletion take it along.
alter table private.group_member add column starred boolean not null default false;

-- One star per player. Moving it clears the old star before setting the new one (src/groups/groups.ts).
create unique index group_member_one_star on private.group_member (user_id) where starred;

-- A player's favourite friends (the human, 2026-11-25: "They come first in my lists"). A friendship is one row per
-- pair with the smaller user ID first, so each side has its own flag: favourite_of_a is user_a's star on user_b.
-- Unfriending, a block and account deletion delete the row and both flags with it.
alter table private.friendship
  add column favourite_of_a boolean not null default false,
  add column favourite_of_b boolean not null default false;

-- DECISIONS.md, Row-level security in `private`: one plor_app policy per granted command; the route decides the rows.
grant update (starred) on table private.group_member to plor_app;
create policy group_member_plor_app_update on private.group_member for update to plor_app using (true) with check (true);

grant update (favourite_of_a, favourite_of_b) on table private.friendship to plor_app;
create policy friendship_plor_app_update on private.friendship for update to plor_app using (true) with check (true);
