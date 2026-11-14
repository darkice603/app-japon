import { useState, type FormEvent } from 'react'
import Feuille, { styles } from './Feuille'
import type { Prefecture } from '../lib/prefectures'

export type Etape = {
  id: string
  city: string
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
  const [prefecture, setPrefecture] = useState(etape?.prefecture_code?.toString() ?? '')
  const [arrivee, setArrivee] = useState(etape?.arrival_date ?? arriveeParDefaut ?? '')
  const [depart, setDepart] = useState(etape?.departure_date ?? '')
  const [erreur, setErreur] = useState<string | null>(null)

  const regions = [...new Set(prefectures.map((p) => p.region))]

  function valider(e: FormEvent) {
    e.preventDefault()
    if (arrivee && depart && depart < arrivee) return setErreur('Le départ est avant l’arrivée.')
    onValider({
      id: etape?.id ?? crypto.randomUUID(),
      city: ville.trim(),
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
            placeholder="Ex. Kanazawa"
            value={ville}
            onChange={(e) => setVille(e.target.value)}
            className={`${styles.champ} font-titre text-2xl`}
            maxLength={60}
            required
          />
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
          <button type="submit" disabled={!ville.trim()} className={styles.boutonPrincipal}>
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
