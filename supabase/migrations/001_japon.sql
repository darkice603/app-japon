-- =====================================================================
-- App Japon — étape 2 : création du schéma « japon »
-- ---------------------------------------------------------------------
-- Ce script NE FAIT QUE CRÉER. Il ne modifie ni ne supprime rien
-- de l'autre app (schéma public, bucket « photos », comptes).
-- Tout est dans une transaction : si une ligne échoue, rien n'est créé.
-- À coller dans Supabase > SQL Editor > New query, puis « Run ».
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Le dossier (schéma) qui contient toutes les tables de l'app
-- ---------------------------------------------------------------------
create schema if not exists japon;

-- Met à jour automatiquement la colonne updated_at (utile pour la synchro hors ligne)
create or replace function japon.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Préfectures (liste fixe des 47, commune à tous)
-- ---------------------------------------------------------------------
create table japon.prefectures (
  code     smallint primary key check (code between 1 and 47),
  name_fr  text not null,
  name_ja  text not null,
  region   text not null
);

insert into japon.prefectures (code, name_fr, name_ja, region) values
  (1,  'Hokkaidō',  '北海道',   'Hokkaidō'),
  (2,  'Aomori',    '青森県',   'Tōhoku'),
  (3,  'Iwate',     '岩手県',   'Tōhoku'),
  (4,  'Miyagi',    '宮城県',   'Tōhoku'),
  (5,  'Akita',     '秋田県',   'Tōhoku'),
  (6,  'Yamagata',  '山形県',   'Tōhoku'),
  (7,  'Fukushima', '福島県',   'Tōhoku'),
  (8,  'Ibaraki',   '茨城県',   'Kantō'),
  (9,  'Tochigi',   '栃木県',   'Kantō'),
  (10, 'Gunma',     '群馬県',   'Kantō'),
  (11, 'Saitama',   '埼玉県',   'Kantō'),
  (12, 'Chiba',     '千葉県',   'Kantō'),
  (13, 'Tokyo',     '東京都',   'Kantō'),
  (14, 'Kanagawa',  '神奈川県', 'Kantō'),
  (15, 'Niigata',   '新潟県',   'Chūbu'),
  (16, 'Toyama',    '富山県',   'Chūbu'),
  (17, 'Ishikawa',  '石川県',   'Chūbu'),
  (18, 'Fukui',     '福井県',   'Chūbu'),
  (19, 'Yamanashi', '山梨県',   'Chūbu'),
  (20, 'Nagano',    '長野県',   'Chūbu'),
  (21, 'Gifu',      '岐阜県',   'Chūbu'),
  (22, 'Shizuoka',  '静岡県',   'Chūbu'),
  (23, 'Aichi',     '愛知県',   'Chūbu'),
  (24, 'Mie',       '三重県',   'Kansai'),
  (25, 'Shiga',     '滋賀県',   'Kansai'),
  (26, 'Kyoto',     '京都府',   'Kansai'),
  (27, 'Osaka',     '大阪府',   'Kansai'),
  (28, 'Hyōgo',     '兵庫県',   'Kansai'),
  (29, 'Nara',      '奈良県',   'Kansai'),
  (30, 'Wakayama',  '和歌山県', 'Kansai'),
  (31, 'Tottori',   '鳥取県',   'Chūgoku'),
  (32, 'Shimane',   '島根県',   'Chūgoku'),
  (33, 'Okayama',   '岡山県',   'Chūgoku'),
  (34, 'Hiroshima', '広島県',   'Chūgoku'),
  (35, 'Yamaguchi', '山口県',   'Chūgoku'),
  (36, 'Tokushima', '徳島県',   'Shikoku'),
  (37, 'Kagawa',    '香川県',   'Shikoku'),
  (38, 'Ehime',     '愛媛県',   'Shikoku'),
  (39, 'Kōchi',     '高知県',   'Shikoku'),
  (40, 'Fukuoka',   '福岡県',   'Kyūshū-Okinawa'),
  (41, 'Saga',      '佐賀県',   'Kyūshū-Okinawa'),
  (42, 'Nagasaki',  '長崎県',   'Kyūshū-Okinawa'),
  (43, 'Kumamoto',  '熊本県',   'Kyūshū-Okinawa'),
  (44, 'Ōita',      '大分県',   'Kyūshū-Okinawa'),
  (45, 'Miyazaki',  '宮崎県',   'Kyūshū-Okinawa'),
  (46, 'Kagoshima', '鹿児島県', 'Kyūshū-Okinawa'),
  (47, 'Okinawa',   '沖縄県',   'Kyūshū-Okinawa');

-- ---------------------------------------------------------------------
-- 3. Les tables personnelles (chaque ligne appartient à un utilisateur)
--    Les identifiants (id) peuvent être fabriqués par l'app elle-même,
--    pour pouvoir ajouter des choses hors ligne.
-- ---------------------------------------------------------------------

-- Voyages
create table japon.trips (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null,
  start_date  date,
  end_date    date,
  country     text not null default 'JP',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

-- Étapes (une ville pendant un voyage)
create table japon.stops (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  trip_id          uuid not null references japon.trips(id) on delete cascade,
  city             text not null,
  prefecture_code  smallint references japon.prefectures(code),
  arrival_date     date,
  departure_date   date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (departure_date is null or arrival_date is null or departure_date >= arrival_date)
);

-- Lieux (resto, café, hôtel, visite…)
create table japon.places (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  stop_id          uuid not null references japon.stops(id) on delete cascade,
  google_place_id  text,
  name             text not null,
  name_ja          text,
  category         text not null check (category in ('manger','cafe','dormir','visiter','transport','shopping')),
  type             text,             -- ramen, izakaya, sushi, onsen, temple…
  lat              double precision,
  lng              double precision,
  visited_at       timestamptz,
  rating           numeric(3,1) check (rating between 1 and 10),
  would_return     text check (would_return in ('oui','bof','non')),
  note             text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Ce que j'ai pris dans un lieu + prix (ex. « Shio ramen ¥880 »)
create table japon.place_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  place_id    uuid not null references japon.places(id) on delete cascade,
  label       text not null,
  price_jpy   integer check (price_jpy >= 0),
  position    smallint not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Dépenses (en yens + conversion en euros au taux du jour)
create table japon.expenses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  trip_id     uuid not null references japon.trips(id) on delete cascade,
  place_id    uuid references japon.places(id) on delete set null,
  label       text,
  amount_jpy  integer not null check (amount_jpy >= 0),
  rate        numeric(12,6),         -- 1 ¥ = x €
  amount_eur  numeric(10,2),
  category    text not null check (category in ('logement','transport','repas','divers')),
  spent_on    date not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Photos (le fichier est dans le bucket « japon-photos », ici on garde son chemin)
create table japon.photos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  storage_path  text not null,
  place_id      uuid references japon.places(id) on delete cascade,
  stop_id       uuid references japon.stops(id) on delete cascade,
  taken_at      timestamptz,
  lat           double precision,
  lng           double precision,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (place_id is not null or stop_id is not null)
);

-- Envies (préfecture, ville ou lieu que je veux faire)
create table japon.envies (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  prefecture_code  smallint references japon.prefectures(code),
  city             text,
  place_name       text,
  google_place_id  text,
  done             boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (prefecture_code is not null or city is not null or place_name is not null)
);

-- Budgets prévus (par voyage, ou global si trip_id est vide)
create table japon.budgets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  trip_id     uuid references japon.trips(id) on delete cascade,
  amount_eur  numeric(10,2) not null check (amount_eur >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- Un seul budget par voyage, et un seul budget global par utilisateur
create unique index budgets_one_per_trip on japon.budgets (trip_id) where trip_id is not null;
create unique index budgets_one_global   on japon.budgets (user_id) where trip_id is null;

-- Index pour que les listes s'affichent vite
create index on japon.trips       (user_id);
create index on japon.stops       (trip_id);
create index on japon.places      (stop_id);
create index on japon.place_items (place_id);
create index on japon.expenses    (trip_id);
create index on japon.expenses    (place_id);
create index on japon.photos      (place_id);
create index on japon.photos      (stop_id);
create index on japon.envies      (user_id);

-- Mise à jour automatique de updated_at
create trigger set_updated_at before update on japon.trips       for each row execute function japon.set_updated_at();
create trigger set_updated_at before update on japon.stops       for each row execute function japon.set_updated_at();
create trigger set_updated_at before update on japon.places      for each row execute function japon.set_updated_at();
create trigger set_updated_at before update on japon.place_items for each row execute function japon.set_updated_at();
create trigger set_updated_at before update on japon.expenses    for each row execute function japon.set_updated_at();
create trigger set_updated_at before update on japon.photos      for each row execute function japon.set_updated_at();
create trigger set_updated_at before update on japon.envies      for each row execute function japon.set_updated_at();
create trigger set_updated_at before update on japon.budgets     for each row execute function japon.set_updated_at();

-- ---------------------------------------------------------------------
-- 4. Sécurité : chacun ne voit et ne modifie que ses propres données
-- ---------------------------------------------------------------------
alter table japon.prefectures enable row level security;
alter table japon.trips       enable row level security;
alter table japon.stops       enable row level security;
alter table japon.places      enable row level security;
alter table japon.place_items enable row level security;
alter table japon.expenses    enable row level security;
alter table japon.photos      enable row level security;
alter table japon.envies      enable row level security;
alter table japon.budgets     enable row level security;

-- Préfectures : lecture seule pour les personnes connectées
create policy "lecture" on japon.prefectures
  for select to authenticated using (true);

-- Tables personnelles : uniquement mes lignes
create policy "mes donnees" on japon.trips       for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "mes donnees" on japon.stops       for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "mes donnees" on japon.places      for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "mes donnees" on japon.place_items for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "mes donnees" on japon.expenses    for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "mes donnees" on japon.photos      for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "mes donnees" on japon.envies      for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "mes donnees" on japon.budgets     for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Droits d'accès au schéma : personnes connectées uniquement (pas les visiteurs anonymes)
grant usage on schema japon to authenticated, service_role;
grant select on japon.prefectures to authenticated;
grant select, insert, update, delete on
  japon.trips, japon.stops, japon.places, japon.place_items,
  japon.expenses, japon.photos, japon.envies, japon.budgets
  to authenticated;
grant all on all tables in schema japon to service_role;

-- ---------------------------------------------------------------------
-- 5. Espace photos séparé : bucket privé « japon-photos »
--    Chaque utilisateur range ses photos dans un dossier à son identifiant.
--    Ces règles ne concernent QUE ce bucket (le bucket « photos » de
--    l'autre app n'est pas touché).
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('japon-photos', 'japon-photos', false, 5242880, array['image/jpeg','image/webp','image/png']);

create policy "japon_photos_lire" on storage.objects for select to authenticated
  using (bucket_id = 'japon-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "japon_photos_ajouter" on storage.objects for insert to authenticated
  with check (bucket_id = 'japon-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "japon_photos_modifier" on storage.objects for update to authenticated
  using (bucket_id = 'japon-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'japon-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "japon_photos_supprimer" on storage.objects for delete to authenticated
  using (bucket_id = 'japon-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

commit;
