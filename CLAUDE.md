# App voyage — brief projet

App perso (PWA installable sur iPhone) pour garder une trace de mes voyages, surtout au Japon : villes visitées, hôtels, restos, cafés, activités, avec **notes sur 10**, **prix payés** (en yens + conversion en euros) et photos.

Je suis designer UX/UI, pas développeur : explique simplement ce que tu fais, avance par petites étapes testables, et demande-moi avant les choix structurants.

## Stack

- **Front** : React + Vite + TypeScript, Tailwind CSS
- **PWA** : vite-plugin-pwa (installable, cache hors ligne)
- **Carte** : MapLibre GL JS + fond de carte gratuit (OpenFreeMap ou MapTiler, offre gratuite)
- **Base de données, comptes, photos** : Supabase (Postgres + Auth + Storage), plan gratuit
- **Recherche de lieux** : Google Places API (New) : Autocomplete + Place Details
- **Photos de ville / type de lieu** : Pexels API
- **Taux de change** : API Frankfurter (taux BCE, gratuit, sans clé), au **taux du jour de la dépense**
- **Photos** : compression avant envoi (browser-image-compression), lecture date + GPS (exifr)
- **Hébergement** : Vercel
- **Code** : Git + GitHub

## Sécurité (obligatoire)

- Aucune clé d'API dans le code front ni dans Git. Les appels Google Places et Pexels passent par des **Supabase Edge Functions** ; clés stockées en secrets.
- Clé Google restreinte (API Places uniquement) + **quotas journaliers** fixés dans Google Cloud pour ne jamais être facturé.
- Côté Google, ne stocker durablement que le `place_id` ; les autres données Google sont redemandées à l'affichage.
- Row Level Security activée sur toutes les tables (chaque utilisateur ne voit que ses données).

## Modèle de données (base)

- `trips` : nom, dates, pays
- `stops` : ville, préfecture, dates d'arrivée/départ, lié à un voyage
- `places` : google_place_id (optionnel), nom, nom japonais, catégorie, type, lat/lng, date et heure, **note 1–10** (décimale possible), j'y retournerais (oui/bof/non), note perso, lié à une étape
- `place_items` : ce que j'ai pris + prix (ex. « Shio ramen ¥880 »)
- `expenses` : montant JPY, taux, montant EUR, catégorie (logement, transport, repas, divers), date, lié à un voyage et éventuellement à un lieu
- `photos` : chemin Storage, lieu ou étape, date, GPS
- `prefectures` : les 47, avec région ; visité = au moins un lieu ou une étape dedans
- `envies` : préfecture, ville ou lieu à faire, fait (oui/non)
- `budgets` : montant prévu, lié à un voyage ou global

## Décisions validées (14/11/2026)

- Plusieurs utilisateurs possibles (chacun ses voyages, rien de partagé) ; commercialisation éventuelle plus tard, pas prioritaire.
- **Japon uniquement**, tout en yens → euros.
- Noms de lieux en français, sinon en rōmaji (+ nom japonais).
- **Retirés** : « Partager ma carte » (B8), pas / km / « ma position » (pas de géolocalisation). B3 « Autour de moi » devient « autour de la ville de l'étape ».
- **Envies** : table `envies` (préfecture, ville ou lieu que je veux faire), alimentée depuis B9 « Il te manque ».
- Le prix payé saisi sur un lieu **crée automatiquement une dépense** (pas de double saisie).
- Budget prévu **par voyage** + budget **global**.
- Numéro du jour = date − date de début du voyage + 1.
- **Hors ligne façon Polarsteps** : ajout possible sans réseau, synchro au retour (identifiants générés côté app dès l'étape 3, synchro à l'étape 9).
- Photos : 3 max par lieu. Anciens voyages ressaisis à la main.
- Comptes existants : GitHub, Supabase, Vercel. À créer : Google Cloud (carte bancaire + quotas, étape 5), Pexels (étape 6).
- Navigation flottante : Voyages · Carte · [+] · Budget · Préfectures (à ajuster selon les maquettes).

## Méthode de travail (économie de contexte)

- Une **nouvelle session Claude par étape** ; ce fichier suffit pour repartir.
- Pas de sous-agents. Lire uniquement la capture de l'écran en cours dans `design/` (B1.png…B10.png).

## Design — direction « B · La carte d'abord »

Maquettes de référence : captures dans `/design` (écrans B1 à B10). Respecter fidèlement.

**Polices** : Bricolage Grotesque 800 (titres, chiffres), Inter 400–700 (texte), Zen Maru Gothic 700 (kanji des couvertures).

**Couleurs**
- Encre `#121212`, fond `#F4F4F1`, cartes `#FFFFFF`, texte secondaire `#5B5B5B`
- Catégories (vif / fond clair / texte foncé) :
  - Manger `#F08A3C` / `#FFE7D3` / `#C25E14`
  - Café `#E0A800` / `#FFF1C2` / `#8A6200`
  - Dormir `#8F72F2` / `#EAE3FF` / `#5B3FC4`
  - Visiter `#3DB3C7` / `#D8F1F5` / `#1D7C8C`
  - Transport `#5C8BD6` / `#DCE8FA` / `#2F5FA8`
  - Shopping `#E0609A` / `#FCE1EC` / `#A8326A`

**Formes** : coins très arrondis (cartes 22–30 px, feuilles du bas 34 px en haut), boutons et filtres en pilule, bouton principal noir 56 px, navigation flottante blanche en pilule (onglet actif noir, bouton + orange), cibles tactiles ≥ 44 px.

**Notes sur 10** : 1–4 Bof · 5–6 Correct · 7–8 Très bon · 9 Top · 10 Culte. Saisie avec une rangée de 10 cases.

**Image d'un lieu, par ordre de priorité**
1. Mes photos
2. Photo Google du lieu (avec crédit de l'auteur)
3. Photo Pexels de la ville ou du type de lieu (avec lien Pexels)
4. Couverture générée : fond clair de la catégorie + motif (nouilles, grains, futon, seigaiha, rails, ichimatsu) + grand kanji du type (麺 ramen, 酒 izakaya, 寿 sushi, 食 resto, 茶 café, 宿 hôtel, 湯 onsen, 城 château, 寺 temple, 景 vue, 駅 gare, 買 konbini)

## Écrans

B1 Mes voyages · B2 Carte · B3 Chercher un lieu · B4 Ajouter un lieu · B5 Fiche lieu (avec / sans photo) · B6 Mes restos (podium + classement) · B7 Ville · B8 Budget · B9 Préfectures · B10 Identité visuelle

## Étapes

1. Projet Vite + Tailwind + PWA, polices et couleurs, navigation flottante, écrans vides
2. Supabase : comptes, tables, sécurité
3. Voyages, étapes, lieux en saisie manuelle (B1, B4, B5)
4. Carte MapLibre avec épingles par catégorie (B2)
5. Recherche Google Places via Edge Function (B3)
6. Photos : envoi, compression, EXIF ; couvertures de secours
7. Dépenses + conversion au taux du jour (B8), page Ville (B7)
8. Mes restos (B6), Préfectures (B9)
9. Hors ligne, mise en ligne sur Vercel, installation sur iPhone
