-- -----------------------------------------------------------------------------
-- 0015_care_actions.sql
-- "Not every meaningful interaction is a promise." Adds a specific,
-- action-oriented vocabulary (Called, Visited, Celebrated, etc.) to
-- journal_entries, so a caring moment can be logged quickly without being
-- tied to any promise. 'prayer' already exists and is reused as "Prayed" in
-- this context — no duplicate added.
-- -----------------------------------------------------------------------------

alter type journal_entry_type add value if not exists 'checked_in';
alter type journal_entry_type add value if not exists 'sent_encouragement';
alter type journal_entry_type add value if not exists 'called';
alter type journal_entry_type add value if not exists 'visited';
alter type journal_entry_type add value if not exists 'celebrated';
alter type journal_entry_type add value if not exists 'delivered_meal';
alter type journal_entry_type add value if not exists 'sent_resource';
