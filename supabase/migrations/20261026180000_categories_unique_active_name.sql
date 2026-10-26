-- Kategorien: keine zwei aktiven Kategorien mit gleichem arabischem Namen unter derselben Elternkategorie.
-- Ursache der Duplikate (Sept. 2026): doppeltes Absenden im Admin erzeugte zwei Zeilen im Abstand < 1 s.
-- Gilt nur für aktive Zeilen (deleted_at is null) → Papierkorb-Einträge und gleiche Namen unter
-- anderen Eltern bleiben erlaubt. Stand 2026-10-26 gibt es in Produktion keine aktiven Duplikate
-- (vor dem Ausführen mit der Abfrage unten prüfen, sonst schlägt der Index fehl).
--
--   select coalesce(parent_id,''), lower(btrim(regexp_replace(name_ar, '\s+', ' ', 'g'))), count(*)
--   from public.categories where deleted_at is null group by 1, 2 having count(*) > 1;
--
-- Idempotent.

create unique index if not exists categories_active_name_parent_uniq
  on public.categories (
    coalesce(parent_id, ''),
    lower(btrim(regexp_replace(name_ar, '\s+', ' ', 'g')))
  )
  where deleted_at is null;
