import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { aujourdhui, ecartJours } from '../lib/dates'
import { categorie, typeDe } from '../lib/categories'
import FeuilleDepense, { CATEGORIES_DEPENSE, type Depense } from '../components/FeuilleDepense'
import FeuilleBudget from '../components/FeuilleBudget'

type Voyage = { id: string; name: string; start_date: string | null; end_date: string | null }
type Ligne = Depense & {
  amount_eur: number | null
  place_id: string | null
  places: { name: string; category: string; type: string | null } | null
}
type Budget = { id: string; trip_id: string | null; amount_eur: number }

const TOUS = 'tous'

/** B8 · Budget */
export default function BudgetEcran() {
  const navigate = useNavigate()
  const [voyages, setVoyages] = useState<Voyage[] | null>(null)
  const [choix, setChoix] = useState<string | null>(null)
  const [lignes, setLignes] = useState<Ligne[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [devise, setDevise] = useState<'jpy' | 'eur'>(() => {
    try {
      return localStorage.getItem('budget:devise') === 'eur' ? 'eur' : 'jpy'
    } catch {
      return 'jpy'
    }
  })
  const [jour, setJour] = useState<string | null>(null)
  const [feuille, setFeuille] = useState<Depense | 'nouvelle' | null>(null)
  const [feuilleBudget, setFeuilleBudget] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  // Voyages + voyage choisi par défaut (en cours, sinon le plus récent commencé)
  useEffect(() => {
    supabase
      .from('trips')
      .select('id, name, start_date, end_date')
      .order('start_date', { ascending: false, nullsFirst: false })
      .then(({ data, error }) => {
        if (error) return setErreur(error.message)
        const liste = (data ?? []) as Voyage[]
        setVoyages(liste)
        const j = aujourdhui()
        const enCours = liste.find((v) => v.start_date && v.start_date <= j && (!v.end_date || v.end_date >= j))
        const commence = liste.find((v) => v.start_date && v.start_date <= j)
        setChoix((enCours ?? commence ?? liste[0])?.id ?? TOUS)
      })
  }, [])

  const charger = useCallback(() => {
    if (!choix) return
    let req = supabase
      .from('expenses')
      .select('id, trip_id, label, amount_jpy, amount_eur, category, spent_on, place_id, places(name, category, type)')
      .order('spent_on', { ascending: false })
    if (choix !== TOUS) req = req.eq('trip_id', choix)
    Promise.all([req, supabase.from('budgets').select('id, trip_id, amount_eur')]).then(([d, b]) => {
      const err = d.error ?? b.error
      if (err) return setErreur(err.message)
      setLignes((d.data ?? []) as unknown as Ligne[])
      setBudgets((b.data ?? []) as Budget[])
    })
  }, [choix])

  useEffect(() => {
    setJour(null)
    charger()
  }, [charger])

  function changerDevise(d: 'jpy' | 'eur') {
    setDevise(d)
    try {
      localStorage.setItem('budget:devise', d)
    } catch {
      /* stockage indisponible */
    }
  }

  const voyage = voyages?.find((v) => v.id === choix) ?? null
  const nbJours = voyage?.start_date && voyage.end_date ? ecartJours(voyage.start_date, voyage.end_date) + 1 : null
  const totalJpy = lignes.reduce((s, l) => s + l.amount_jpy, 0)
  const totalEur = lignes.reduce((s, l) => s + (l.amount_eur ?? 0), 0)
  const budget = budgets.find((b) => (choix === TOUS ? b.trip_id === null : b.trip_id === choix)) ?? null

  // Montant affiché dans la devise choisie
  const montant = (l: { amount_jpy: number; amount_eur: number | null }) => (devise === 'jpy' ? l.amount_jpy : (l.amount_eur ?? 0))
  const affiche = (n: number) => (devise === 'jpy' ? `¥${Math.round(n).toLocaleString('fr-FR')}` : `${Math.round(n).toLocaleString('fr-FR')} €`)
  const court = (n: number) =>
    devise === 'jpy' ? (n >= 1000 ? `${(n / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}k` : `${n}`) : `${Math.round(n)} €`
  const total = devise === 'jpy' ? totalJpy : totalEur

  const parCategorie = CATEGORIES_DEPENSE.map((c) => {
    const s = lignes.filter((l) => l.category === c.id).reduce((t, l) => t + montant(l), 0)
    return { ...c, somme: s, pourcent: total ? Math.round((s / total) * 100) : 0 }
  })

  // Jours du voyage (J1, J2…) avec leur total
  const jours = useMemo(() => {
    if (!voyage?.start_date || !nbJours || nbJours > 60) return []
    return Array.from({ length: nbJours }, (_, i) => {
      const d = new Date(voyage.start_date + 'T00:00:00')
      d.setDate(d.getDate() + i)
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      return { iso, numero: i + 1, somme: lignes.filter((l) => l.spent_on === iso).reduce((t, l) => t + montant(l), 0) }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voyage, nbJours, lignes, devise])

  const visibles = jour ? lignes.filter((l) => l.spent_on === jour) : lignes
  const jourParDefaut = (() => {
    const j = aujourdhui()
    if (voyage?.start_date && voyage.end_date && j >= voyage.start_date && j <= voyage.end_date) return j
    return jour ?? voyage?.start_date ?? j
  })()

  return (
    <main className="mx-auto max-w-md px-5 pt-[max(env(safe-area-inset-top),32px)] pb-44">
      {/* Voyage + devise */}
      <div className="flex items-center justify-between gap-3">
        <label className="relative min-w-0">
          <span className="sr-only">Voyage</span>
          <select
            value={choix ?? ''}
            onChange={(e) => setChoix(e.target.value)}
            className="max-w-full appearance-none truncate bg-transparent pr-6 font-semibold text-texte-2 outline-none"
          >
            {(voyages ?? []).map((v) => {
              const n = v.start_date && v.end_date ? ecartJours(v.start_date, v.end_date) + 1 : null
              return (
                <option key={v.id} value={v.id}>
                  {v.name}
                  {n ? ` · ${n} jours` : ''}
                </option>
              )
            })}
            <option value={TOUS}>Tous les voyages</option>
          </select>
          <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-texte-2" aria-hidden="true">
            ▾
          </span>
        </label>
        <div className="flex shrink-0 rounded-full bg-carte p-1" role="radiogroup" aria-label="Devise">
          {(['jpy', 'eur'] as const).map((d) => (
            <button
              key={d}
              role="radio"
              aria-checked={devise === d}
              onClick={() => changerDevise(d)}
              className={`h-11 w-12 rounded-full font-bold ${devise === d ? 'bg-encre text-white' : ''}`}
            >
              {d === 'jpy' ? '¥' : '€'}
            </button>
          ))}
        </div>
      </div>

      {erreur && <p className="mt-4 rounded-carte bg-manger-clair p-4 text-sm font-semibold text-manger-fonce">{erreur}</p>}

      {/* Total */}
      <p className="mt-3 font-titre text-[54px] leading-none tracking-tight">{affiche(total)}</p>
      <p className="mt-2 text-texte-2">
        {devise === 'jpy' ? `≈ ${totalEur.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €` : `≈ ¥${totalJpy.toLocaleString('fr-FR')}`}
        {nbJours && choix !== TOUS ? ` · environ ${Math.round(totalEur / nbJours)} € par jour` : ''}
      </p>

      {/* Budget prévu */}
      {budget ? (
        <button onClick={() => setFeuilleBudget(true)} className="mt-4 block w-full rounded-[22px] bg-carte p-4 text-left">
          <div className="flex justify-between text-sm font-semibold">
            <span>Budget prévu · {Math.round(budget.amount_eur).toLocaleString('fr-FR')} €</span>
            <span className={totalEur > budget.amount_eur ? 'text-manger-fonce' : 'text-texte-2'}>
              {totalEur > budget.amount_eur
                ? `dépassé de ${Math.round(totalEur - budget.amount_eur)} €`
                : `reste ${Math.round(budget.amount_eur - totalEur).toLocaleString('fr-FR')} €`}
            </span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-fond">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, (totalEur / budget.amount_eur) * 100)}%`,
                background: totalEur > budget.amount_eur ? '#C25E14' : '#121212',
              }}
            />
          </div>
        </button>
      ) : (
        <button onClick={() => setFeuilleBudget(true)} className="mt-3 min-h-11 text-sm font-semibold text-texte-2 underline">
          + Fixer un budget {choix === TOUS ? 'global' : 'pour ce voyage'}
        </button>
      )}

      {/* Catégories */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        {parCategorie.slice(0, 2).map((c) => (
          <div key={c.id} className="flex h-36 flex-col justify-between rounded-carte p-4" style={{ background: c.id === 'logement' ? c.vif : '#9DC0F0', color: c.id === 'logement' ? '#fff' : '#121212' }}>
            <span className="font-kanji text-2xl" aria-hidden="true">
              {c.kanji}
            </span>
            <span>
              <span className="block text-[15px] font-semibold">
                {c.label} · {c.pourcent} %
              </span>
              <span className="block font-titre text-[26px] leading-tight">{affiche(c.somme)}</span>
            </span>
          </div>
        ))}
        {parCategorie.slice(2).map((c) => (
          <div
            key={c.id}
            className="flex min-h-16 items-center justify-between gap-2 rounded-carte px-4"
            style={{ background: c.id === 'repas' ? c.vif : '#BFE4EA', color: '#121212' }}
          >
            <span className="text-[15px] font-semibold">{c.label}</span>
            <span className="font-titre text-lg">{affiche(c.somme)}</span>
          </div>
        ))}
      </div>

      {/* Jours */}
      {jours.length > 0 && (
        <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
          <button
            onClick={() => setJour(null)}
            className={`flex h-16 min-w-16 shrink-0 flex-col items-center justify-center rounded-[22px] px-3 ${!jour ? 'bg-encre text-white' : 'bg-carte'}`}
          >
            <span className="text-sm">Tout</span>
            <span className="font-bold">{court(total)}</span>
          </button>
          {jours.map((j) => (
            <button
              key={j.iso}
              onClick={() => setJour(jour === j.iso ? null : j.iso)}
              className={`flex h-16 min-w-16 shrink-0 flex-col items-center justify-center rounded-[22px] px-3 ${jour === j.iso ? 'bg-encre text-white' : 'bg-carte'}`}
            >
              <span className={`text-sm ${jour === j.iso ? 'text-white/70' : 'text-texte-2'}`}>J{j.numero}</span>
              <span className="font-bold">{court(j.somme)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Dépenses */}
      <section className="mt-3 rounded-carte bg-carte px-4">
        {visibles.length === 0 && <p className="py-6 text-center text-sm text-texte-2">Aucune dépense {jour ? 'ce jour-là' : 'pour l’instant'}.</p>}
        <ul className="divide-y divide-black/5">
          {visibles.map((l) => {
            const cat = CATEGORIES_DEPENSE.find((c) => c.id === l.category)!
            const lieu = l.places
            const couleur = lieu ? categorie(lieu.category) : null
            return (
              <li key={l.id}>
                <button
                  onClick={() => (l.place_id ? navigate(`/lieu/${l.place_id}`) : setFeuille(l))}
                  className="flex w-full items-center gap-3 py-3 text-left"
                >
                  <span
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] font-kanji text-2xl"
                    style={{ background: couleur?.clair ?? cat.clair, color: couleur?.fonce ?? cat.fonce }}
                    aria-hidden="true"
                  >
                    {lieu ? typeDe(lieu.category, lieu.type).kanji : cat.kanji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{lieu?.name ?? l.label ?? cat.label}</span>
                    <span className="block truncate text-sm text-texte-2">
                      {[cat.label, new Date(l.spent_on + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })].join(' · ')}
                    </span>
                  </span>
                  <span className="shrink-0 font-titre text-lg">{affiche(montant(l))}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      {/* Ajouter une dépense */}
      {choix !== TOUS && voyage && (
        <div className="fixed inset-x-0 bottom-[calc(max(env(safe-area-inset-bottom),16px)+80px)] z-40 mx-auto max-w-md px-5">
          <button onClick={() => setFeuille('nouvelle')} className="min-h-14 w-full rounded-full bg-encre text-lg font-bold text-white shadow-lg">
            + Ajouter une dépense
          </button>
        </div>
      )}

      {voyages && voyages.length === 0 && (
        <p className="mt-6 rounded-carte bg-carte p-5 text-center text-texte-2">Crée d’abord un voyage pour suivre ton budget.</p>
      )}

      {feuille && voyage && (
        <FeuilleDepense
          depense={feuille === 'nouvelle' ? null : feuille}
          tripId={voyage.id}
          jourParDefaut={jourParDefaut}
          onFermer={() => setFeuille(null)}
          onEnregistre={() => {
            setFeuille(null)
            charger()
          }}
        />
      )}
      {feuilleBudget && (
        <FeuilleBudget
          budget={budget}
          tripId={choix === TOUS ? null : choix}
          nomVoyage={voyage?.name ?? null}
          onFermer={() => setFeuilleBudget(false)}
          onEnregistre={() => {
            setFeuilleBudget(false)
            charger()
          }}
        />
      )}
    </main>
  )
}
