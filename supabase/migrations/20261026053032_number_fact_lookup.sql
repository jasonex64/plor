-- M13 13e-4a: number facts are read by thing and trait as of a moment (private.fits_where), which the partial
-- current-row index can't serve, so a number filter scanned the table once per member (9.3 s for "US city of at
-- least 1,000,000", 10,761 members, 13e-4 Evidence). No grant changes.
create index number_fact_lookup on private.number_fact (thing_id, trait);
