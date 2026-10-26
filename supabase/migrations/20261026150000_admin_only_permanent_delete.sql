-- Endgültiges Löschen nur für Admins (Inhaber-Entscheidung 2026-10-26).
-- Mitarbeiter dürfen weiter anlegen, bearbeiten, archivieren und deaktivieren.
-- Hintergrund: Mehrere permissive Policies werden mit ODER verknüpft — solange
-- "Staff can delete …" existiert, wirkt "nur Admin löscht … endgültig" nicht.

-- Produkte und Kategorien: Admin-Policy bleibt, Staff-Löschrecht entfällt.
drop policy if exists "Staff can delete products" on public.products;
drop policy if exists "Staff can delete categories" on public.categories;

-- Marken-Logos: Staff verwaltet, Admin löscht.
drop policy if exists "Staff manage brand logos" on public.brand_logos;
create policy "Staff read brand logos" on public.brand_logos
  for select to authenticated using (is_staff());
create policy "Staff insert brand logos" on public.brand_logos
  for insert to authenticated with check (is_staff());
create policy "Staff update brand logos" on public.brand_logos
  for update to authenticated using (is_staff()) with check (is_staff());
create policy "Admin delete brand logos" on public.brand_logos
  for delete to authenticated using (is_admin());

-- Banner/Slides: Staff verwaltet, Admin löscht.
drop policy if exists "Staff manage hero slides" on public.hero_slides;
create policy "Staff read hero slides" on public.hero_slides
  for select to authenticated using (is_staff());
create policy "Staff insert hero slides" on public.hero_slides
  for insert to authenticated with check (is_staff());
create policy "Staff update hero slides" on public.hero_slides
  for update to authenticated using (is_staff()) with check (is_staff());
create policy "Admin delete hero slides" on public.hero_slides
  for delete to authenticated using (is_admin());
