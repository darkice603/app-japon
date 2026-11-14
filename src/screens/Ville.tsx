import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { LngLatBounds, Marker } from 'maplibre-gl'
import { supabase } from '../lib/supabase'
import { typeDe } from '../lib/categories'
import { ecartJours, formatYen } from '../lib/dates'
import { chargerPrefectures } from '../lib/prefectures'
import { photoBanque, type PhotoBanque } from '../lib/google'
import { creerCarte, elementEpingle, positionLieu } from '../lib/carte'
import Couverture from '../components/Couverture'

type Lieu = {
  id: string
  name: string
  category: string
  type: string | null
  rating: number | null
  lat: number | null
  lng: number | null
  visited_at: string | null
  expenses: { amount_jpy: number; amount_eur: number | null }[]
}
type Etape = {
  id: string
  city: string
  name_ja: string | null
  prefecture_code: number | null
  arrival_date: string | null
  departure_date: string | null
  lat: number | null
  lng: number | null
  trip_id: string
  places: Lieu[]
}

/** B7 · Ville (une étape d'un voyage) */
export default function Ville() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [etape, setEtape] = useState<Etape | null>(null)
  const [prefecture, setPrefecture] = useState<string | null>(null)
  const [photo, setPhoto] = useState<PhotoBanque | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('stops')
      .select(
        'id, city, name_ja, prefecture_code, arrival_date, departure_date, lat, lng, trip_id, places(id, name, category, type, rating, lat, lng, visited_at, expenses(amount_jpy, amount_eur))',
      )
      .eq('id', id!)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) return setErreur(error.message)
        if (!data) return navigate('/', { replace: true })
        const e = data as unknown as Etape
        setEtape(e)
        if (e.prefecture_code) chargerPrefectures().then((l) => setPrefecture(l.find((p) => p.code === e.prefecture_code)?.name_fr ?? null)).catch(() => {})
        photoBanque(`${e.city} japan`).then(setPhoto).catch(() => {})
      })
  }, [id, navigate])

  if (erreur) return <p className="m-5 rounded-carte bg-manger-clair p-4 text-sm font-semibold text-manger-fonce">{erreur}</p>
  if (!etape) return null

  const nuits = etape.arrival_date && etape.departure_date ? ecartJours(etape.arrival_date, etape.departure_date) : null
  const f = (d: string) => new Date(d + 'T00:00:00')
  const dates =
    etape.arrival_date && etape.departure_date
      ? `${f(etape.arrival_date).getDate()} → ${f(etape.departure_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
      : etape.arrival_date
        ? f(etape.arrival_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
        : null
  const yens = etape.places.reduce((s, l) => s + l.expenses.reduce((t, e) => t + e.amount_jpy, 0), 0)
  const euros = etape.places.reduce((s, l) => s + l.expenses.reduce((t, e) => t + (e.amount_eur ?? 0), 0), 0)
  const lieux = [...etape.places].sort((a, b) => (a.visited_at ?? '').localeCompare(b.visited_at ?? ''))

  return (
    <main className="mx-auto max-w-md px-5 pt-[max(env(safe-area-inset-top),24px)] pb-36">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(`/voyage/${etape.trip_id}`))}
          aria-label="Retour"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-carte"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        {dates && (
          <span className="rounded-full bg-encre px-4 py-2 text-sm font-bold text-white">
            {dates}
            {nuits ? ` · ${nuits} nuit${nuits > 1 ? 's' : ''}` : ''}
          </span>
        )}
      </div>

      <div className="mt-5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-texte-2">{[etape.name_ja, prefecture].filter(Boolean).join(' · ')}</p>
          <h1 className="truncate font-titre text-[44px] leading-none tracking-tight">{etape.city}</h1>
        </div>
        {yens > 0 && (
          <div className="shrink-0 text-right">
            <p className="font-titre text-[28px] leading-none">{Math.round(euros).toLocaleString('fr-FR')} €</p>
            <p className="mt-1 text-sm text-texte-2">{formatYen(yens)} en tout</p>
          </div>
        )}
      </div>

      {/* Photo de la ville + mini-carte */}
      <div className="relative mt-5 h-[190px] overflow-hidden rounded-[30px] bg-visiter-clair">
        {photo ? (
          <img src={photo.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <Couverture categorieId="visiter" typeId="vue" className="absolute inset-0" />
        )}
        {photo && (
          <p className="absolute bottom-3 left-3 max-w-[50%] truncate rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white">
            Photo :{' '}
            <a href={photo.lienAuteur} target="_blank" rel="noreferrer" className="underline">
              {photo.auteur}
            </a>{' '}
            ·{' '}
            <a href={photo.lien} target="_blank" rel="noreferrer" className="underline">
              Unsplash
            </a>
          </p>
        )}
        <Link to={lieux[0] ? `/carte?lieu=${lieux[0].id}` : '/carte'} aria-label="Voir sur la carte" className="absolute bottom-3 right-3">
          <MiniCarteVille etape={etape} />
        </Link>
      </div>

      {/* Mes adresses */}
      <div className="mt-7 flex items-baseline justify-between">
        <h2 className="font-titre text-2xl">Mes adresses</h2>
        <p className="text-sm text-texte-2">
          {lieux.length} lieu{lieux.length > 1 ? 'x' : ''}
        </p>
      </div>
      <ul className="mt-3 space-y-2">
        {lieux.map((l) => {
          const prix = l.expenses.reduce((s, e) => s + e.amount_jpy, 0)
          return (
            <li key={l.id}>
              <Link to={`/lieu/${l.id}`} className="flex items-center gap-3 rounded-[22px] bg-carte p-2.5 pr-4">
                <Couverture categorieId={l.category} typeId={l.type} taille="petite" className="h-14 w-14 shrink-0 rounded-[16px]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{l.name}</span>
                  <span className="block truncate text-sm text-texte-2">
                    {typeDe(l.category, l.type).label}
                    {l.rating !== null ? ` · ${l.rating.toLocaleString('fr-FR')} / 10` : ''}
                  </span>
                </span>
                <span className="shrink-0 font-titre text-lg">{prix ? formatYen(prix) : 'Gratuit'}</span>
              </Link>
            </li>
          )
        })}
      </ul>
      <Link
        to={`/chercher?etape=${etape.id}`}
        className="mt-2 flex min-h-12 items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-black/15 text-sm font-semibold text-texte-2"
      >
        <span className="text-lg leading-none">+</span> Ajouter un lieu à {etape.city}
      </Link>
    </main>
  )
}

/** Petite carte figée avec les épingles de la ville (comme sur la maquette B7). */
function MiniCarteVille({ etape }: { etape: Etape }) {
  const conteneur = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!conteneur.current) return
    const points = etape.places
      .map((l) => ({ l, pos: positionLieu(l, etape) }))
      .filter((p) => p.pos) as { l: Lieu; pos: { lng: number; lat: number } }[]
    const centre = etape.lat != null && etape.lng != null ? ([etape.lng, etape.lat] as [number, number]) : undefined
    // Cadrage dès la création : sur toutes les épingles, sinon sur la ville
    const cadrage =
      points.length > 1
        ? { bounds: points.reduce((b, p) => b.extend([p.pos.lng, p.pos.lat]), new LngLatBounds()), fitBoundsOptions: { padding: 28, maxZoom: 15 } }
        : points[0]
          ? { center: [points[0].pos.lng, points[0].pos.lat] as [number, number], zoom: 14 }
          : centre
            ? { center: centre, zoom: 12 }
            : {}
    const c = creerCarte(conteneur.current, { interactive: false, attributionControl: false, ...cadrage })
    for (const { l, pos } of points) {
      const el = elementEpingle(l.category, l.type, { petit: true })
      new Marker({ element: el }).setLngLat([pos.lng, pos.lat]).addTo(c)
    }
    return () => c.remove()
  }, [etape])
  return (
    <div className="h-[120px] w-[120px] overflow-hidden rounded-[22px] ring-4 ring-white">
      <div ref={conteneur} className="h-full w-full" />
    </div>
  )
}
