import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { typeDe, categorie } from '../lib/categories'
import { formatEuro, formatYen } from '../lib/dates'
import Couverture from '../components/Couverture'
import FeuilleVoyage from '../components/FeuilleVoyage'
import { chargerPrefectures, type Prefecture } from '../lib/prefectures'

type Lieu = { id: string; name: string; category: string; type: string | null; rating: number | null; visited_at: string | null }
type Etape = {
  id: string
  city: string
  prefecture_code: number | null
  arrival_date: string | null
  departure_date: string | null
  places: Lieu[]
}
type VoyageComplet = {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
  stops: Etape[]
  expenses: { amount_jpy: number; amount_eur: number | null }[]
}

/** Page d'un voyage : ses villes et, sous chaque ville, ses lieux. */
export default function Voyage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [voyage, setVoyage] = useState<VoyageComplet | null>(null)
  const [prefectures, setPrefectures] = useState<Prefecture[]>([])
  const [erreur, setErreur] = useState<string | null>(null)
  const [edition, setEdition] = useState(false)

  const charger = useCallback(() => {
    supabase
      .from('trips')
      .select(
        'id, name, start_date, end_date, stops(id, city, prefecture_code, arrival_date, departure_date, places(id, name, category, type, rating, visited_at)), expenses(amount_jpy, amount_eur)',
      )
      .eq('id', id!)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) return setErreur(error.message)
        if (!data) return navigate('/', { replace: true })
        setVoyage(data as VoyageComplet)
      })
  }, [id, navigate])

  useEffect(() => {
    charger()
    chargerPrefectures().then(setPrefectures).catch(() => {})
  }, [charger])

  if (erreur) return <p className="m-5 rounded-carte bg-manger-clair p-4 text-sm font-semibold text-manger-fonce">{erreur}</p>
  if (!voyage) return null

  const etapes = [...voyage.stops].sort((a, b) => (a.arrival_date ?? '9999').localeCompare(b.arrival_date ?? '9999'))
  const yens = voyage.expenses.reduce((s, e) => s + e.amount_jpy, 0)
  const euros = voyage.expenses.reduce((s, e) => s + (e.amount_eur ?? 0), 0)
  const nbLieux = etapes.reduce((s, e) => s + e.places.length, 0)

  return (
    <main className="mx-auto max-w-md px-5 pt-[max(env(safe-area-inset-top),24px)] pb-36">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/')} aria-label="Retour" className="flex h-12 w-12 items-center justify-center rounded-full bg-carte">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <button onClick={() => setEdition(true)} className="min-h-12 rounded-full bg-carte px-5 font-semibold">
          Modifier
        </button>
      </div>

      <h1 className="mt-5 font-titre text-[36px] leading-tight tracking-tight">{voyage.name}</h1>
      <p className="mt-1 text-texte-2">{periode(voyage.start_date, voyage.end_date)}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-visiter-clair px-3 py-1.5 text-sm font-bold text-visiter-fonce">
          {etapes.length} ville{etapes.length > 1 ? 's' : ''}
        </span>
        <span className="rounded-full bg-dormir-clair px-3 py-1.5 text-sm font-bold text-dormir-fonce">
          {nbLieux} lieu{nbLieux > 1 ? 'x' : ''}
        </span>
        {yens > 0 && (
          <span className="rounded-full bg-manger-clair px-3 py-1.5 text-sm font-bold text-manger-fonce">
            {formatYen(yens)}
            {euros > 0 && ` · ${formatEuro(euros)}`}
          </span>
        )}
      </div>

      {etapes.length === 0 && (
        <div className="mt-8 rounded-carte bg-carte p-6 text-center">
          <p className="font-titre text-xl">Pas encore de ville</p>
          <p className="mt-1 text-sm text-texte-2">Ajoute les villes de ce voyage avec « Modifier ».</p>
        </div>
      )}

      {etapes.map((et, i) => (
        <section key={et.id} className="mt-8">
          <Link to={`/ville/${et.id}`} className="block">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="min-w-0 truncate font-titre text-2xl">
                <span className="text-texte-2/50">{i + 1}.</span> {et.city} <span className="text-texte-2/50">›</span>
              </h2>
              <p className="shrink-0 text-sm text-texte-2">{periode(et.arrival_date, et.departure_date)}</p>
            </div>
            {et.prefecture_code && <p className="text-sm text-texte-2">{prefectures.find((p) => p.code === et.prefecture_code)?.name_fr}</p>}
          </Link>

          <ul className="mt-3 space-y-2">
            {[...et.places]
              .sort((a, b) => (a.visited_at ?? '').localeCompare(b.visited_at ?? ''))
              .map((l) => {
                const c = categorie(l.category)
                return (
                  <li key={l.id}>
                    <Link to={`/lieu/${l.id}`} className="flex items-center gap-3 rounded-[22px] bg-carte p-2.5 pr-4">
                      <Couverture categorieId={l.category} typeId={l.type} taille="petite" className="h-14 w-14 shrink-0 rounded-[16px]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{l.name}</span>
                        <span className="block truncate text-sm" style={{ color: c.fonce }}>
                          {typeDe(l.category, l.type).label}
                        </span>
                      </span>
                      {l.rating !== null && (
                        <span className="shrink-0 font-titre text-xl">
                          {l.rating.toLocaleString('fr-FR')}
                          <span className="text-sm text-texte-2/60">/10</span>
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
          </ul>
          <Link
            to={`/chercher?etape=${et.id}`}
            className="mt-2 flex min-h-12 items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-black/15 text-sm font-semibold text-texte-2"
          >
            <span className="text-lg leading-none">+</span> Ajouter un lieu à {et.city}
          </Link>
        </section>
      ))}

      {edition && (
        <FeuilleVoyage
          voyage={voyage}
          onFermer={() => setEdition(false)}
          onEnregistre={() => {
            setEdition(false)
            charger()
          }}
        />
      )}
    </main>
  )
}

function periode(debut: string | null, fin: string | null) {
  const f = (d: string, annee: boolean) =>
    new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', ...(annee ? { year: 'numeric' } : {}) })
  if (debut && fin) return debut === fin ? f(debut, true) : `${f(debut, false)} → ${f(fin, true)}`
  return debut ? f(debut, true) : fin ? f(fin, true) : ''
}
