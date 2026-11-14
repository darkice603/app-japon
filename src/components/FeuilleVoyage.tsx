import { useEffect, useState, type FormEvent } from 'react'
import Feuille, { styles } from './Feuille'
import FeuilleEtape, { type Etape } from './FeuilleEtape'
import { supabase } from '../lib/supabase'
import { chargerPrefectures, type Prefecture } from '../lib/prefectures'

export type VoyageAEditer = {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
}

/**
 * Créer ou modifier un voyage et ses étapes.
 * Tout est enregistré d'un coup avec le bouton « Enregistrer ».
 */
export default function FeuilleVoyage({
  voyage,
  onFermer,
  onEnregistre,
}: {
  /** null = nouveau voyage */
  voyage: VoyageAEditer | null
  onFermer: () => void
  onEnregistre: () => void
}) {
  // L'identifiant est fabriqué par l'app (utile plus tard pour le hors ligne).
  const [id] = useState(() => voyage?.id ?? crypto.randomUUID())
  const [nom, setNom] = useState(voyage?.name ?? '')
  const [debut, setDebut] = useState(voyage?.start_date ?? '')
  const [fin, setFin] = useState(voyage?.end_date ?? '')
  const [etapes, setEtapes] = useState<Etape[]>([])
  const [etapesInitiales, setEtapesInitiales] = useState<string[]>([])
  const [prefectures, setPrefectures] = useState<Prefecture[]>([])
  const [etapeOuverte, setEtapeOuverte] = useState<Etape | 'nouvelle' | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  useEffect(() => {
    chargerPrefectures().then(setPrefectures).catch((e) => setErreur(e.message))
    if (!voyage) return
    supabase
      .from('stops')
      .select('id, city, prefecture_code, arrival_date, departure_date')
      .eq('trip_id', voyage.id)
      .then(({ data, error }) => {
        if (error) return setErreur(error.message)
        setEtapes(trier(data as Etape[]))
        setEtapesInitiales(data.map((e) => e.id))
      })
  }, [voyage])

  function enregistrerEtape(etape: Etape) {
    setEtapes((liste) => trier([...liste.filter((e) => e.id !== etape.id), etape]))
    setEtapeOuverte(null)
  }

  function supprimerEtape(etapeId: string) {
    setEtapes((liste) => liste.filter((e) => e.id !== etapeId))
    setEtapeOuverte(null)
  }

  async function enregistrer(e: FormEvent) {
    e.preventDefault()
    if (debut && fin && fin < debut) return setErreur('La date de fin est avant la date de début.')
    setEnCours(true)
    setErreur(null)

    const { error: errVoyage } = await supabase
      .from('trips')
      .upsert({ id, name: nom.trim(), start_date: debut || null, end_date: fin || null })
    if (errVoyage) return echec(errVoyage.message)

    const supprimees = etapesInitiales.filter((ancien) => !etapes.some((e) => e.id === ancien))
    if (supprimees.length) {
      const { error } = await supabase.from('stops').delete().in('id', supprimees)
      if (error) return echec(error.message)
    }
    if (etapes.length) {
      const { error } = await supabase.from('stops').upsert(etapes.map((et) => ({ ...et, trip_id: id })))
      if (error) return echec(error.message)
    }
    onEnregistre()
  }

  async function supprimerVoyage() {
    if (!voyage) return
    if (!window.confirm(`Supprimer « ${voyage.name} » avec toutes ses étapes, lieux et dépenses ? C'est définitif.`)) return
    setEnCours(true)
    const { error } = await supabase.from('trips').delete().eq('id', voyage.id)
    if (error) return echec(error.message)
    onEnregistre()
  }

  function echec(message: string) {
    setEnCours(false)
    setErreur(message)
  }

  const nomPrefecture = (code: number | null) => prefectures.find((p) => p.code === code)?.name_fr

  return (
    <>
      <Feuille titre={voyage ? 'Modifier le voyage' : 'Nouveau voyage'} onFermer={onFermer}>
        <form onSubmit={enregistrer} className="space-y-6">
          <div>
            <label htmlFor="nom-voyage" className={styles.label}>
              Nom du voyage
            </label>
            <input
              id="nom-voyage"
              placeholder="Ex. Hokuriku"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className={`${styles.champ} font-titre text-2xl`}
              maxLength={60}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="debut" className={styles.label}>
                Du
              </label>
              <input id="debut" type="date" value={debut} onChange={(e) => setDebut(e.target.value)} className={styles.champ} />
            </div>
            <div>
              <label htmlFor="fin" className={styles.label}>
                Au
              </label>
              <input id="fin" type="date" value={fin} min={debut || undefined} onChange={(e) => setFin(e.target.value)} className={styles.champ} />
            </div>
          </div>

          <div>
            <p className={styles.label}>Étapes</p>
            <ul className="space-y-2">
              {etapes.map((et, i) => (
                <li key={et.id}>
                  <button
                    type="button"
                    onClick={() => setEtapeOuverte(et)}
                    className="flex min-h-16 w-full items-center gap-3 rounded-[22px] bg-fond px-4 py-3 text-left"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-encre font-titre text-white">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{et.city}</span>
                      <span className="block truncate text-sm text-texte-2">
                        {[nomPrefecture(et.prefecture_code), periode(et.arrival_date, et.departure_date)].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <span className="text-texte-2" aria-hidden="true">›</span>
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setEtapeOuverte('nouvelle')}
              className="mt-2 flex min-h-14 w-full items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-black/20 font-semibold text-texte-2"
            >
              <span className="text-xl leading-none">+</span> Ajouter une ville
            </button>
          </div>

          {erreur && <p className="rounded-[18px] bg-manger-clair p-3 text-sm font-semibold text-manger-fonce">{erreur}</p>}

          <div className="space-y-2">
            <button type="submit" disabled={enCours || !nom.trim()} className={styles.boutonPrincipal}>
              {enCours ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            {voyage && (
              <button type="button" onClick={supprimerVoyage} disabled={enCours} className={styles.boutonDiscret}>
                Supprimer ce voyage
              </button>
            )}
          </div>
        </form>
      </Feuille>

      {etapeOuverte && (
        <FeuilleEtape
          etape={etapeOuverte === 'nouvelle' ? null : etapeOuverte}
          prefectures={prefectures}
          debutVoyage={debut}
          finVoyage={fin}
          arriveeParDefaut={etapes.at(-1)?.departure_date ?? debut}
          onFermer={() => setEtapeOuverte(null)}
          onValider={enregistrerEtape}
          onSupprimer={supprimerEtape}
        />
      )}
    </>
  )
}

const trier = (liste: Etape[]) => [...liste].sort((a, b) => (a.arrival_date ?? '9999').localeCompare(b.arrival_date ?? '9999'))

function periode(arrivee: string | null, depart: string | null) {
  const f = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  if (arrivee && depart) return arrivee === depart ? f(arrivee) : `${f(arrivee)} → ${f(depart)}`
  return arrivee ? f(arrivee) : depart ? f(depart) : ''
}
