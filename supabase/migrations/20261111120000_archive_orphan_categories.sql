-- Verwaiste Kategorien in den Papierkorb legen (2026-11-11).
-- Unterkategorien, deren Ober-Kategorie (oder ein höherer Vorfahr) bereits
-- im Papierkorb liegt, wurden früher nicht mitgelöscht und tauchten dann im
-- Shop/Admin fälschlich als Hauptkategorien auf (z. B. „saft“).
-- Seit 2026-11-11 archiviert die Admin-API Unterkategorien automatisch mit.
--
-- Idempotent: ein zweiter Lauf findet nichts mehr. Nichts wird endgültig
-- gelöscht — die Einträge landen im Papierkorb und sind wiederherstellbar.
-- Stand 2026-11-11: betrifft 20 Kategorien, keine davon mit Produkten.

with recursive alive as (
  select id
  from public.categories
  where parent_id is null and deleted_at is null
  union all
  select c.id
  from public.categories c
  join alive a on c.parent_id = a.id
  where c.deleted_at is null
)
update public.categories
set deleted_at = now()
where deleted_at is null
  and id not in (select id from alive)
returning id, name_ar;
