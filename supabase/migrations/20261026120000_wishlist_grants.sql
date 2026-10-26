-- Merkliste für angemeldete Nutzer: Tabellenrechte fehlten in Produktion
-- (RLS-Policies "own wishlist" existieren bereits, aber ohne GRANT → 403 / permission denied).
-- Idempotent: GRANT kann beliebig oft ausgeführt werden.

alter table public.wishlist_items enable row level security;

grant select, insert, delete on table public.wishlist_items to authenticated;
revoke all on table public.wishlist_items from anon;
