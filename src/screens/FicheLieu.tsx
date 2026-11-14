import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { categorie, typeDe } from '../lib/categories'
import { ecartJours, formatYen } from '../lib/dates'
import Couverture from '../components/Couverture'

type LieuComplet = {
  id: string
  name: string
  name_ja: string | null
  category: string
  type: string | null
  visited_at: string | null
  rating: number | null
  would_return: 'oui' | 'bof' | 'non' | null
  note: string | null
  stops: { city: string; trip_id: string; trips: { start_date: string | null } | null } | null
  place_items: { id: string; label: string; price_jpy: number | null; position: number }[]
  expenses: { amount_jpy: number; amount_eur: number | null }[]
}

const RETOUR = {
  oui: { titre: 'Oui', texte: 'j’y retourne' },
  bof: { titre: 'Bof', texte: 'peut-être' },
  non: { titre: 'Non', texte: 'pas la peine' },
}

/** B5 · Fiche lieu (version sans photo : couverture générée). */
export default function FicheLieu() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [lieu, setLieu] = useState<LieuComplet | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('places')
      .select(
        'id, name, name_ja, category, type, visited_at, rating, would_return, note, stops(city, trip_id, trips(start_date)), place_items(id, label, price_jpy, position), expenses(amount_jpy, amount_eur)',
      )
      .eq('id', id!)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) return setErreur(error.message)
        if (!data) return navigate('/', { replace: true })
        setLieu(data as unknown as LieuComplet)
      })
  }, [id, navigate])

  if (erreur) return <p className="m-5 rounded-carte bg-manger-clair p-4 text-sm font-semibold text-manger-fonce">{erreur}</p>
  if (!lieu) return null

  const c = categorie(lieu.category)
  const t = typeDe(lieu.category, lieu.type)
  const debut = lieu.stops?.trips?.start_date
  const date = lieu.visited_at ? new Date(lieu.visited_at) : null
  const jourNum = date && debut ? ecartJours(debut, dateLocale(date)) + 1 : null
  const heure = date?.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const quand = date && (jourNum && jourNum >= 1 ? `Jour ${jourNum} · ${heure}` : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }))
  const depense = lieu.expenses[0]
  const articles = [...lieu.place_items].sort((a, b) => a.position - b.position)
  const retour = lieu.would_return ? RETOUR[lieu.would_return] : null
  const sousTitre = [lieu.name_ja, lieu.stops?.city].filter(Boolean).join(' · ')

  return (
    <main className="mx-auto max-w-md pb-[max(env(safe-area-inset-bottom),24px)]">
      {/* Couverture */}
      <div className="relative">
        <Couverture categorieId={lieu.category} typeId={lieu.type} className="h-[330px] rounded-b-[34px]" />
        <button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(`/voyage/${lieu.stops?.trip_id ?? ''}`))}
          aria-label="Retour"
          className="absolute left-5 top-[max(env(safe-area-inset-top),20px)] flex h-12 w-12 items-center justify-center rounded-full bg-carte"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
      </div>

      <div className="px-5">
        {/* Étiquettes */}
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full px-4 py-1.5 font-semibold" style={{ background: c.vif, color: '#121212' }}>
            {t.label}
          </span>
          {quand && <span className="rounded-full bg-carte px-4 py-1.5 font-semibold">{quand}</span>}
        </div>

        <h1 className="mt-3 font-titre text-[36px] leading-[1.05] tracking-tight">{lieu.name}</h1>
        {sousTitre && <p className="mt-2 text-texte-2">{sousTitre}</p>}

        {/* Note · prix · j'y retourne */}
        {(lieu.rating !== null || depense || retour) && (
          <div className="mt-5 grid grid-cols-3 gap-3">
            {lieu.rating !== null && (
              <div className="rounded-[22px] bg-carte px-3 py-3">
                <p className="font-titre text-[26px] leading-none">
                  {lieu.rating.toLocaleString('fr-FR')}
                  <span className="text-base text-texte-2/60"> /10</span>
                </p>
                <p className="mt-1 text-sm text-texte-2">ma note</p>
              </div>
            )}
            {depense && (
              <div className="rounded-[22px] px-3 py-3" style={{ background: c.clair }}>
                <p className={`font-titre leading-none ${depense.amount_jpy >= 10000 ? 'text-[19px]' : 'text-[24px]'}`}>
                  {formatYen(depense.amount_jpy)}
                </p>
                {depense.amount_eur !== null && (
                  <p className="mt-1 text-sm" style={{ color: c.fonce }}>
                    ≈ {depense.amount_eur.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </p>
                )}
              </div>
            )}
            {retour && (
              <div className="rounded-[22px] bg-encre px-3 py-3 text-white">
                <p className="font-titre text-[26px] leading-none">{retour.titre}</p>
                <p className="mt-1 text-sm text-white/70">{retour.texte}</p>
              </div>
            )}
          </div>
        )}

        {/* Ce que j'ai pris */}
        {articles.length > 0 && (
          <section className="mt-3 rounded-carte bg-carte px-5 py-4">
            <h2 className="font-semibold">Ce que j’ai pris</h2>
            <ul className="mt-1">
              {articles.map((a) => (
                <li key={a.id} className="flex justify-between gap-3 py-1">
                  <span>{a.label}</span>
                  {a.price_jpy !== null && <span className="font-semibold">{formatYen(a.price_jpy)}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Note perso */}
        {lieu.note && (
          <section className="mt-3 rounded-carte bg-carte px-5 py-4">
            <h2 className="font-semibold">Note perso</h2>
            <p className="mt-1 whitespace-pre-line text-texte-2">{lieu.note}</p>
          </section>
        )}

        {/* Actions */}
        <div className="mt-6 grid grid-cols-[1fr_1.1fr] gap-3">
          <Link to={`/carte?lieu=${lieu.id}`} className="flex min-h-14 items-center justify-center gap-2 rounded-full bg-carte font-bold">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zm0 0v14m6-12v14" />
            </svg>
            Sur la carte
          </Link>
          <Link to={`/lieu/${lieu.id}/modifier`} className="flex min-h-14 items-center justify-center rounded-full bg-encre font-bold text-white">
            Modifier
          </Link>
        </div>
      </div>
    </main>
  )
}

function dateLocale(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
