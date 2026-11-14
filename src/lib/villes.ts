import type { Prefecture } from './prefectures'

/**
 * Recherche de villes japonaises avec Photon (OpenStreetMap), gratuit et sans clé.
 * Seul le texte tapé est envoyé. Deux requêtes en parallèle : noms en rōmaji
 * (anglais) et noms locaux (kanji), associées par leur identifiant OSM.
 */
export type VilleTrouvee = {
  cle: string
  nom: string
  nomJa: string | null
  prefectureCode: number | null
  prefectureNom: string | null
  lat: number
  lng: number
}

type Resultat = {
  features: {
    properties: { osm_id: number; osm_type: string; name?: string; state?: string; countrycode?: string }
    geometry: { coordinates: [number, number] }
  }[]
}

const JAPON = '122,24,154,46'

function url(q: string, lang?: string) {
  const p = new URLSearchParams({ q, limit: '8', bbox: JAPON, layer: 'city' })
  if (lang) p.set('lang', lang)
  return `https://photon.komoot.io/api/?${p}`
}

export async function chercherVilles(q: string, prefectures: Prefecture[], signal?: AbortSignal): Promise<VilleTrouvee[]> {
  const [en, local] = await Promise.all(
    [url(q, 'en'), url(q)].map((u) =>
      fetch(u, { signal }).then((r) => {
        if (!r.ok) throw new Error(`Recherche indisponible (${r.status})`)
        return r.json() as Promise<Resultat>
      }),
    ),
  )
  const kanji = new Map(local.features.map((f) => [`${f.properties.osm_type}${f.properties.osm_id}`, f.properties]))

  const vus = new Set<string>()
  const villes: VilleTrouvee[] = []
  for (const f of en.features) {
    const p = f.properties
    const cle = `${p.osm_type}${p.osm_id}`
    if (p.countrycode !== 'JP' || !p.name || vus.has(cle)) continue
    vus.add(cle)
    const ja = kanji.get(cle)
    const pref = trouverPrefecture(prefectures, ja?.state, p.state)
    villes.push({
      cle,
      nom: p.name,
      nomJa: ja?.name && ja.name !== p.name ? ja.name : null,
      prefectureCode: pref?.code ?? null,
      prefectureNom: pref?.name_fr ?? p.state?.replace(/ Prefecture$/, '') ?? null,
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
    })
  }
  return villes
}

/** Retrouve la préfecture par son nom en kanji (le plus fiable), sinon par son nom en rōmaji. */
function trouverPrefecture(prefectures: Prefecture[], etatJa?: string, etatEn?: string) {
  const simplifier = (s: string) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/ prefecture$/, '').replace(/[-\s]/g, '')
  return (
    prefectures.find((p) => etatJa && p.name_ja === etatJa) ??
    prefectures.find((p) => etatEn && simplifier(p.name_fr) === simplifier(etatEn))
  )
}
