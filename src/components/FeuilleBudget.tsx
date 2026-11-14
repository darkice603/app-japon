import { useState, type FormEvent } from 'react'
import Feuille, { styles } from './Feuille'
import { supabase } from '../lib/supabase'

/** Fixer le budget prévu (en euros) d'un voyage, ou le budget global si tripId est null. */
export default function FeuilleBudget({
  budget,
  tripId,
  nomVoyage,
  onFermer,
  onEnregistre,
}: {
  budget: { id: string; amount_eur: number } | null
  tripId: string | null
  nomVoyage: string | null
  onFermer: () => void
  onEnregistre: () => void
}) {
  const [montant, setMontant] = useState(budget ? Math.round(budget.amount_eur).toString() : '')
  const [erreur, setErreur] = useState<string | null>(null)

  async function enregistrer(e: FormEvent) {
    e.preventDefault()
    const euros = Number(montant)
    if (!euros) return setErreur('Indique un montant en euros.')
    const { error } = await supabase.from('budgets').upsert({ id: budget?.id ?? crypto.randomUUID(), trip_id: tripId, amount_eur: euros })
    if (error) return setErreur(error.message)
    onEnregistre()
  }

  async function supprimer() {
    if (!budget) return
    const { error } = await supabase.from('budgets').delete().eq('id', budget.id)
    if (error) return setErreur(error.message)
    onEnregistre()
  }

  return (
    <Feuille titre={tripId ? `Budget · ${nomVoyage}` : 'Budget global'} onFermer={onFermer}>
      <form onSubmit={enregistrer} className="space-y-6">
        <div>
          <label htmlFor="budget" className={styles.label}>
            Budget prévu
          </label>
          <div className="flex min-h-[76px] items-center gap-3 rounded-[30px] border-[2.5px] border-encre px-5">
            <input
              id="budget"
              inputMode="numeric"
              autoFocus
              placeholder="0"
              value={montant}
              onChange={(e) => setMontant(e.target.value.replace(/\D/g, ''))}
              className="min-w-0 flex-1 bg-transparent font-titre text-4xl outline-none placeholder:text-texte-2/40"
            />
            <span className="font-titre text-4xl text-texte-2/70" aria-hidden="true">
              €
            </span>
          </div>
          <p className="mt-2 text-xs text-texte-2">
            {tripId ? 'Pour ce voyage, vols compris si tu les ajoutes en dépense.' : 'Pour tous tes voyages au Japon réunis.'}
          </p>
        </div>
        {erreur && <p className="rounded-[18px] bg-manger-clair p-3 text-sm font-semibold text-manger-fonce">{erreur}</p>}
        <div className="space-y-2">
          <button type="submit" className={styles.boutonPrincipal}>
            Enregistrer
          </button>
          {budget && (
            <button type="button" onClick={supprimer} className={styles.boutonDiscret}>
              Retirer le budget
            </button>
          )}
        </div>
      </form>
    </Feuille>
  )
}
