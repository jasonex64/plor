-- M23 23a (docs/milestones/M23-23a-researched-lists.md): a researched list is a source of the answer database, like
-- WordNet or Wikidata: each answer of content/lists/<category>.json loads as a thing of source 'research'
-- (scripts/base.ts, loadResearch). The only gate on a new source is this check. No grant, role or policy changes.
alter table private.thing_source drop constraint thing_source_source_check;
alter table private.thing_source add constraint thing_source_source_check check (source in ('wikidata', 'col', 'oewn', 'usda', 'research'));
