import { useEffect, useState, type FormEvent } from 'react'
import Feuille, { styles } from './Feuille'
import type { Prefecture } from '../lib/prefectures'
import { chercherVilles, type VilleTrouvee } from '../lib/villes'

export type Etape = {
  id: string
  city: string
  name_ja: string | null
  lat: number | null
  lng: number | null
  prefecture_code: number | null
  arrival_date: string | null
  departure_date: string | null
}

/**
 * Ajouter ou modifier une étape (une ville) d'un voyage.
 * Rien n'est envoyé à Supabase ici : c'est le bouton « Enregistrer » du voyage qui envoie tout.
 */
export default function FeuilleEtape({
  etape,
  prefectures,
  debutVoyage,
  finVoyage,
  arriveeParDefaut,
  onFermer,
  onValider,
  onSupprimer,
}: {
  etape: Etape | null
  prefectures: Prefecture[]
  debutVoyage: string
  finVoyage: string
  arriveeParDefaut: string | null
  onFermer: () => void
  onValider: (etape: Etape) => void
  onSupprimer: (id: string) => void
}) {
  const [ville, setVille] = useState(etape?.city ?? '')
  // Infos venues de la recherche (effacées si on retape le nom à la main)
  const [trouvee, setTrouvee] = useState<{ nomJa: string | null; lat: number; lng: number } | null>(
    etape?.lat != null && etape?.lng != null ? { nomJa: etape.name_ja, lat: etape.lat, lng: etape.lng } : null,
  )
  const [suggestions, setSuggestions] = useState<VilleTrouvee[]>([])
  const [recherche, setRecherche] = useState<'repos' | 'en-cours' | 'vide' | 'erreur'>('repos')
  const [ouvert, setOuvert] = useState(false)
  const [prefecture, setPrefecture] = useState(etape?.prefecture_code?.toString() ?? '')
  const [arrivee, setArrivee] = useState(etape?.arrival_date ?? arriveeParDefaut ?? '')
  const [depart, setDepart] = useState(etape?.departure_date ?? '')
  const [erreur, setErreur] = useState<string | null>(null)

  const regions = [...new Set(prefectures.map((p) => p.region))]

  // Recherche pendant la frappe (après une petite pause, à partir de 2 lettres)
  useEffect(() => {
    const q = ville.trim()
    if (!ouvert || trouvee || q.length < 2) {
      setSuggestions([])
      setRecherche('repos')
      return
    }
    const controle = new AbortController()
    const minuteur = setTimeout(() => {
      setRecherche('en-cours')
      chercherVilles(q, prefectures, controle.signal)
        .then((liste) => {
          setSuggestions(liste)
          setRecherche(liste.length ? 'repos' : 'vide')
        })
        .catch((e) => e.name !== 'AbortError' && setRecherche('erreur'))
    }, 300)
    return () => {
      clearTimeout(minuteur)
      controle.abort()
    }
  }, [ville, ouvert, trouvee, prefectures])

  function choisir(v: VilleTrouvee) {
    setVille(v.nom)
    setTrouvee({ nomJa: v.nomJa, lat: v.lat, lng: v.lng })
    if (v.prefectureCode) setPrefecture(v.prefectureCode.toString())
    setOuvert(false)
  }

  function valider(e: FormEvent) {
    e.preventDefault()
    if (arrivee && depart && depart < arrivee) return setErreur('Le départ est avant l’arrivée.')
    onValider({
      id: etape?.id ?? crypto.randomUUID(),
      city: ville.trim(),
      name_ja: trouvee?.nomJa ?? null,
      lat: trouvee?.lat ?? null,
      lng: trouvee?.lng ?? null,
      prefecture_code: prefecture ? Number(prefecture) : null,
      arrival_date: arrivee || null,
      departure_date: depart || null,
    })
  }

  function supprimer() {
    if (!etape) return
    if (!window.confirm(`Retirer ${etape.city} du voyage ? Les lieux notés dans cette ville seront aussi supprimés à l'enregistrement.`)) return
    onSupprimer(etape.id)
  }

  return (
    <Feuille titre={etape ? 'Modifier la ville' : 'Nouvelle ville'} onFermer={onFermer} niveau={1}>
      <form onSubmit={valider} className="space-y-6">
        <div>
          <label htmlFor="ville" className={styles.label}>
            Ville
          </label>
          <input
            id="ville"
            placeholder="Tape les premières lettres…"
            value={ville}
            onChange={(e) => {
              setVille(e.target.value)
              setTrouvee(null)
              setOuvert(true)
            }}
            autoComplete="off"
            role="combobox"
            aria-expanded={suggestions.length > 0}
            aria-controls="suggestions-villes"
            className={`${styles.champ} font-titre text-2xl`}
            maxLength={60}
            required
          />
          {trouvee?.nomJa && <p className="mt-2 px-5 text-sm text-texte-2">{trouvee.nomJa}</p>}
          {recherche === 'en-cours' && <p className="mt-2 px-5 text-sm text-texte-2">Recherche…</p>}
          {recherche === 'vide' && <p className="mt-2 px-5 text-sm text-texte-2">Aucune ville trouvée : tu peux garder ce nom et choisir la préfecture.</p>}
          {recherche === 'erreur' && <p className="mt-2 px-5 text-sm text-texte-2">Recherche indisponible (pas de réseau ?) : choisis la préfecture à la main.</p>}
          {suggestions.length > 0 && (
            <ul id="suggestions-villes" role="listbox" className="mt-2 overflow-hidden rounded-[22px] border border-black/10">
              {suggestions.map((v) => (
                <li key={v.cle} role="option" aria-selected="false">
                  <button
                    type="button"
                    onClick={() => choisir(v)}
                    className="flex min-h-14 w-full items-center justify-between gap-3 border-b border-black/5 px-5 py-2 text-left last:border-0 hover:bg-fond"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{v.nom}</span>
                      {v.prefectureNom && <span className="block truncate text-sm text-texte-2">{v.prefectureNom}</span>}
                    </span>
                    {v.nomJa && <span className="shrink-0 text-texte-2">{v.nomJa}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label htmlFor="prefecture" className={styles.label}>
            Préfecture
          </label>
          <div className="relative">
            <select id="prefecture" value={prefecture} onChange={(e) => setPrefecture(e.target.value)} className={`${styles.champ} pr-12`}>
              <option value="">Choisir…</option>
              {regions.map((r) => (
                <optgroup key={r} label={r}>
                  {prefectures
                    .filter((p) => p.region === r)
                    .map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.name_fr} · {p.name_ja}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
            <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-texte-2" aria-hidden="true">
              ▾
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="arrivee" className={styles.label}>
              Arrivée
            </label>
            <input
              id="arrivee"
              type="date"
              value={arrivee}
              min={debutVoyage || undefined}
              max={finVoyage || undefined}
              onChange={(e) => setArrivee(e.target.value)}
              className={styles.champ}
            />
          </div>
          <div>
            <label htmlFor="depart" className={styles.label}>
              Départ
            </label>
            <input
              id="depart"
              type="date"
              value={depart}
              min={arrivee || debutVoyage || undefined}
              max={finVoyage || undefined}
              onChange={(e) => setDepart(e.target.value)}
              className={styles.champ}
            />
          </div>
        </div>

        {erreur && <p className="rounded-[18px] bg-manger-clair p-3 text-sm font-semibold text-manger-fonce">{erreur}</p>}

        <div className="space-y-2">
          <button type="submit" className={styles.boutonPrincipal}>
            {etape ? 'Valider' : 'Ajouter'}
          </button>
          {etape && (
            <button type="button" onClick={supprimer} className={styles.boutonDiscret}>
              Retirer cette ville
            </button>
          )}
        </div>
      </form>
    </Feuille>
  )
}
