-- Pop culture's facts (docs/milestones/M13-13e-6-pop-culture.md): genre and publisher load as facts, a subset filters
-- on them ("Name a racing game", "Name a Nintendo game"), and a series catches its entries. Run with `npm run test:sql`.
begin;
-- Same preamble as plor_app_role.test.sql: remote runs log in as cli_login_postgres.
set local role postgres;
set local search_path to extensions, public;
create extension if not exists pgtap with schema extensions;
select plan(4);

-- video game > Mario Kart (a series) > Mario Kart 8; Tetris stands alone. Racing and Nintendo are values of the set.
select private.import_source('wikidata', 'pop-culture-test', '[
  {"id": "pc-game", "name": "pc video game", "aliases": [{"alias": "pc video game", "kind": "name"}]},
  {"id": "pc-racing", "name": "pc racing game", "aliases": [{"alias": "pc racing game", "kind": "name"}]},
  {"id": "pc-nintendo", "name": "pc nintendo", "aliases": [{"alias": "pc nintendo", "kind": "name"}]},
  {"id": "pc-kart", "name": "pc kart", "aliases": [{"alias": "pc kart", "kind": "name"}], "kind_of": ["pc-game"]},
  {"id": "pc-kart-8", "name": "pc kart 8", "aliases": [{"alias": "pc kart 8", "kind": "name"}], "kind_of": ["pc-kart"], "genre": ["pc-racing"], "publisher": ["pc-nintendo"]},
  {"id": "pc-tetris", "name": "pc tetris", "aliases": [{"alias": "pc tetris", "kind": "name"}], "kind_of": ["pc-game"]}
]'::jsonb);
select private.define_category('pc_game', 'pc video game', 'wikidata', 'pc-game', null);
select private.define_subset('pc_racing', 'pc racing game', 'pc_game', 'wikidata', '{"trait": "genre", "values": ["pc-racing"]}');
select private.define_subset('pc_nintendo', 'pc Nintendo game', 'pc_game', 'wikidata', '{"trait": "publisher", "values": ["pc-nintendo"]}');
create function pg_temp.names(p_key text) returns text[] language sql
  return (select array_agg(t.name order by t.name) from private.category_members(p_key) m join private.thing t on t.id = m);

select is((select count(*)::int from private.fact where trait in ('genre', 'publisher') and source_ref = 'wikidata:pop-culture-test'), 2, 'genre and publisher load as facts');
select is(pg_temp.names('pc_racing'), array['pc kart 8'], 'a genre subset holds the games of that genre');
select is(pg_temp.names('pc_nintendo'), array['pc kart 8'], 'a publisher subset holds that publisher''s games');
select is((select array_agg(t.name order by t.name) from private.descendants_now(array[private.thing_by_ref('wikidata', 'pc-kart')]) d join private.thing t on t.id = d),
  array['pc kart', 'pc kart 8'], 'a series catches its entries');

select * from finish();
rollback;
