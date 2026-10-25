-- M13 13e-2 (docs/milestones/M13-13e-2-links-and-the-first-batch.md): links, reviewed "kind of" facts from
-- data/links.json that fill gaps in a source's tree. WordNet files tulip under liliaceous plant, not flower, and pie
-- under pastry, not dessert, so "Name a flower" would refuse "tulip" and the facts check would reject it (human,
-- 2026-10-25: "Links as facts (Recommended)"). A link is a kind_of fact like any other: every walk, the facts check
-- and the answers fixed at a day's start see it from when it was added. Claude writes the links and the human
-- approves them by merging the batch, so they carry origin 'ai' and source_ref 'links'.

alter table private.base_log drop constraint base_log_action_check,
  add constraint base_log_action_check check (action in ('import', 'define_category', 'miss_review', 'audit', 'link'));

-- Adds the links given as [{thing, name, kind_of, kind_of_name}], refs as "source:id". Each name must be the thing's
-- name in the base, so a wrong ID in the file is refused, not linked; a link whose kind_of sits under its thing
-- (a cycle) is refused. A link already in the base, from the file or a source, is kept as it is. Any refusal
-- loads nothing. Run by `npm run base -- load all` as the owner; no role is granted it.
create function private.load_links(p_links jsonb) returns jsonb
  language plpgsql set search_path = ''
as $$
declare
  link jsonb;
  child uuid;
  parent uuid;
  added int := 0;
  n int;
begin
  for link in select * from jsonb_array_elements(p_links) loop
    child := private.thing_by_ref('oewn', link ->> 'thing');
    parent := private.thing_by_ref('oewn', link ->> 'kind_of');
    if child is null or parent is null then
      raise exception 'link %: % or % is not in the base', link, link ->> 'thing', link ->> 'kind_of';
    end if;
    if (select name from private.thing where id = child) is distinct from link ->> 'name'
      or (select name from private.thing where id = parent) is distinct from link ->> 'kind_of_name' then
      raise exception 'link %: the base names them % and %', link,
        (select name from private.thing where id = child), (select name from private.thing where id = parent);
    end if;
    if child in (select private.ancestors_as_of(parent, now())) then
      raise exception 'link %: % is already above %, so the link would make a cycle', link, link ->> 'name', link ->> 'kind_of_name';
    end if;
    insert into private.fact (thing_id, trait, value_thing, origin, source_ref)
    values (child, 'kind_of', parent, 'ai', 'links')
    on conflict (thing_id, trait, value_thing) do nothing;
    get diagnostics n = row_count;
    added := added + n;
  end loop;
  insert into private.base_log (actor, action, detail)
  values ('links', 'link', jsonb_build_object('links', jsonb_array_length(p_links), 'added', added));
  return jsonb_build_object('links', jsonb_array_length(p_links), 'added', added);
end;
$$;
revoke all on function private.load_links(jsonb) from public, anon, authenticated, service_role;
