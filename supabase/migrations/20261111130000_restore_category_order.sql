-- Kategorie-Reihenfolge wiederherstellen (2026-11-11).
-- Rekonstruiert aus audit_log: Stand nach der Sortierung vom 2026-10-04.
-- Danach haben drei Bearbeitungen (Umbenennen) die Position fälschlich auf 0
-- gesetzt (Bug im Admin-Bearbeiten, behoben 2026-11-11):
--   15.10. kategorie-20 „خبز/معكرونة / كعك“   10 → 0
--   15.10. kategorie-38 „بهارات و توابل“        10 → 0
--   16.10. kategorie-34 „فريكه / عدس/ذرة“       2 → 0
-- Idempotent: setzt feste Werte, ein zweiter Lauf ändert nichts mehr.

update public.categories as c
set sort_order = v.sort_order
from (values
  -- Hauptkategorien
  ('kategorie-54',       0),  -- قسم الجملة
  ('cat-1791032081315',  1),  -- قسم المونة
  ('cat-1790797224686',  2),  -- قسم الخضروات الطازجة و المجمدة
  ('cat-1790797211255',  3),  -- قسم اللحوم الطازجة و المجمدة
  ('cat-1790797471932',  4),  -- قسم ألبان وأجبان
  ('kategorie-56',       5),  -- أغذية ومعلبات
  ('kategorie-31',       6),  -- بقوليات ورز وشعيرية
  ('kategorie-41',       7),  -- حلويات و التسالي
  ('kategorie-23',       8),  -- سوائل و مشروبات
  ('kategorie-38',       9),  -- بهارات و توابل
  ('kategorie-20',      10),  -- خبز/معكرونة / كعك
  ('kategorie-46',      11),  -- لوازم منزلية
  -- Unterkategorie in „بقوليات ورز وشعيرية“
  ('kategorie-34',       2)   -- فريكه / عدس/ذرة
) as v(id, sort_order)
where c.id = v.id
returning c.id, c.name_ar, c.sort_order;

