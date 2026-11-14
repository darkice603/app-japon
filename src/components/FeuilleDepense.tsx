import { useEffect, useState, type FormEvent } from 'react'
import Feuille, { styles } from './Feuille'
import { supabase } from '../lib/supabase'
import { tauxJpyEur } from '../lib/change'
import { aujourdhui } from '../lib/dates'
import { ajouterTache, erreurReseau } from '../lib/attente'
import type { CategorieDepense } from '../lib/categories'

export const CATEGORIES_DEPENSE: { id: CategorieDepense; label: string; kanji: string; vif: string; clair: string; fonce: string }[] = [
  { id: 'logement', label: 'Logement', kanji: '宿', vif: '#8F72F2', clair: '#EAE3FF', fonce: '#5B3FC4' },
  { id: 'transport', label: 'Transport', kanji: '駅', vif: '#5C8BD6', clair: '#DCE8FA', fonce: '#2F5FA8' },
  { id: 'repas', label: 'Repas', kanji: '食', vif: '#F08A3C', clair: '#FFE7D3', fonce: '#C25E14' },
  { id: 'divers', label: 'Divers', kanji: '買', vif: '#3DB3C7', clair: '#D8F1F5', fonce: '#1D7C8C' },
]

export type Depense = {
  id: string
  trip_id: string
  label: string | null
  amount_jpy: number
  category: CategorieDepense
  spent_on: string
}

/** Ajouter ou modifier une dépense hors lieu (JR Pass, taxi, souvenir…), convertie au taux du jour. */
export default function FeuilleDepense({
  depense,
  tripId,
  jourParDefaut,
  onFermer,
  onEnregistre,
}: {
  depense: Depense | null
  tripId: string
  jourParDefaut: string
  onFermer: () => void
  onEnregistre: () => void
}) {
  const [libelle, setLibelle] = useState(depense?.label ?? '')
  const [montant, setMontant] = useState(depense?.amount_jpy.toString() ?? '')
  const [categorie, setCategorie] = useState<CategorieDepense>(depense?.category ?? 'transport')
  const [jour, setJour] = useState(depense?.spent_on ?? jourParDefaut)
  const [taux, setTaux] = useState<number | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  useEffect(() => {
    setTaux(null)
    tauxJpyEur(jour).then(setTaux).catch(() => setTaux(null))
  }, [jour])

  const yens = Number(montant) || 0
  const euros = taux && yens ? yens * taux : null

  async function enregistrer(e: FormEvent) {
    e.preventDefault()
    if (!yens) return setErreur('Indique le montant en yens.')
    setEnCours(true)
    setErreur(null)
    const ligne = {
      id: depense?.id ?? crypto.randomUUID(),
      trip_id: tripId,
      place_id: null,
      label: libelle.trim() || null,
      amount_jpy: yens,
      category: categorie,
      spent_on: jour || aujourdhui(),
    }
    // Sans réseau : une NOUVELLE dépense est gardée sur l'appareil et envoyée plus tard
    const mettreEnAttente = async () => {
      await ajouterTache({ id: ligne.id, type: 'depense', cree: new Date().toISOString(), nom: ligne.label ?? 'Dépense', depense: ligne })
      onEnregistre()
    }
    if (!navigator.onLine) {
      if (!depense) return mettreEnAttente()
      setEnCours(false)
      return setErreur('Pas de réseau : la modification se fait en ligne. Réessaie plus tard.')
    }
    const t = taux ?? (await tauxJpyEur(jour).catch(() => null))
    const { error } = await supabase
      .from('expenses')
      .upsert({ ...ligne, rate: t, amount_eur: t ? Math.round(yens * t * 100) / 100 : null })
    setEnCours(false)
    if (error) {
      if (!depense && erreurReseau(error.message)) return mettreEnAttente()
      return setErreur(error.message)
    }
    onEnregistre()
  }

  async function supprimer() {
    if (!depense || !window.confirm('Supprimer cette dépense ?')) return
    const { error } = await supabase.from('expenses').delete().eq('id', depense.id)
    if (error) return setErreur(error.message)
    onEnregistre()
  }

  return (
    <Feuille titre={depense ? 'Modifier la dépense' : 'Nouvelle dépense'} onFermer={onFermer}>
      <form onSubmit={enregistrer} className="space-y-6">
        <div>
          <label htmlFor="montant" className={styles.label}>
            Combien ?
          </label>
          <div className="flex min-h-[76px] items-center gap-3 rounded-[30px] border-[2.5px] border-encre px-5">
            <span className="font-titre text-4xl text-texte-2/70" aria-hidden="true">
              ¥
            </span>
            <input
              id="montant"
              inputMode="numeric"
              autoFocus={!depense}
              placeholder="0"
              value={montant}
              onChange={(e) => setMontant(e.target.value.replace(/\D/g, ''))}
              className="min-w-0 flex-1 bg-transparent font-titre text-4xl outline-none placeholder:text-texte-2/40"
            />
            {euros !== null && (
              <span className="shrink-0 rounded-full bg-manger-clair px-3 py-2 text-sm font-bold text-manger-fonce">
                ≈ {euros.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </span>
            )}
          </div>
        </div>

        <div>
          <p className={styles.label}>Catégorie</p>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Catégorie">
            {CATEGORIES_DEPENSE.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={categorie === c.id}
                onClick={() => setCategorie(c.id)}
                className="flex min-h-12 items-center gap-2 rounded-full px-4 font-semibold"
                style={categorie === c.id ? { background: c.vif, color: '#fff' } : { background: c.clair, color: c.fonce }}
              >
                <span className="font-kanji">{c.kanji}</span> {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-[1.4fr_1fr] gap-3">
          <div>
            <label htmlFor="libelle" className={styles.label}>
              Quoi
            </label>
            <input
              id="libelle"
              placeholder="Ex. JR Pass, taxi…"
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              maxLength={60}
              className={styles.champ}
            />
          </div>
          <div>
            <label htmlFor="jour" className={styles.label}>
              Quand
            </label>
            <input id="jour" type="date" value={jour} onChange={(e) => setJour(e.target.value)} className={`${styles.champ} px-3 text-sm`} />
          </div>
        </div>

        {erreur && <p className="rounded-[18px] bg-manger-clair p-3 text-sm font-semibold text-manger-fonce">{erreur}</p>}

        <div className="space-y-2">
          <button type="submit" disabled={enCours} className={styles.boutonPrincipal}>
            {enCours ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          {depense && (
            <button type="button" onClick={supprimer} className={styles.boutonDiscret}>
              Supprimer cette dépense
            </button>
          )}
        </div>
      </form>
    </Feuille>
  )
}
