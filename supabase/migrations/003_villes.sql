-- =====================================================================
-- App Japon — étape 3 : nom japonais et position des villes (étapes)
-- ---------------------------------------------------------------------
-- AJOUTE seulement 3 colonnes vides à japon.stops. Rien d'autre n'est
-- modifié, et rien n'est touché en dehors du schéma japon.
-- À coller dans Supabase > SQL Editor > New query, puis « Run ».
-- =====================================================================

begin;

alter table japon.stops
  add column if not exists name_ja text,
  add column if not exists lat double precision,
  add column if not exists lng double precision;

commit;
