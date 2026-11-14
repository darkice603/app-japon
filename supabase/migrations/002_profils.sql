-- =====================================================================
-- App Japon — étape 3 : table « profils » (prénom affiché sur B1)
-- ---------------------------------------------------------------------
-- NE FAIT QUE CRÉER une table dans le schéma japon.
-- Rien n'est touché dans public (la table profiles de l'autre app reste
-- indépendante). Si une ligne échoue, rien n'est créé.
-- À coller dans Supabase > SQL Editor > New query, puis « Run ».
-- =====================================================================

begin;

create table japon.profils (
  user_id     uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  prenom      text not null check (length(trim(prenom)) between 1 and 40),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger set_updated_at before update on japon.profils
  for each row execute function japon.set_updated_at();

alter table japon.profils enable row level security;

create policy "mon profil" on japon.profils for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select, insert, update on japon.profils to authenticated;
grant all on japon.profils to service_role;

commit;
