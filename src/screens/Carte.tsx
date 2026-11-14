import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { LngLatBounds, Marker, type GeoJSONSource, type Map as CarteML } from 'maplibre-gl'
import { supabase } from '../lib/supabase'
import { CATEGORIES, type CategorieId } from '../lib/categories'
import { creerCarte, elementEpingle, positionLieu } from '../lib/carte'
import { ecartJours, formatYen } from '../lib/dates'
import Couverture from '../components/Couverture'

type LieuCarte = {
  id: string
  name: string
  category: CategorieId
  type: string | null
  lat: number | null
  lng: number | null
  visited_at: string | null
  stop_id: string
  stops: { city: string; lat: number | null; lng: number | null; trips: { start_date: string | null } | null } | null
  expenses: { amount_jpy: number; amount_eur: number | null }[]
}

type LieuPlace = LieuCarte & { pos: { lng: number; lat: number; approx: boolean }; jour: string | null }

/** B2 · Carte : épingles par catégorie + « Ta journée à … » */
export default function Carte() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const lieuCible = params.get('lieu')
  const conteneur = useRef<HTMLDivElement>(null)
  const carte = useRef<CarteML | null>(null)
  const [carteChargee, setCarteChargee] = useState(false)
  const [lieux, setLieux] = useState<LieuPlace[] | null>(null)
  const [sansPosition, setSansPosition] = useState(0)
  const [filtre, setFiltre] = useState<CategorieId | null>(() => (params.get('filtre') as CategorieId | null) ?? null)
  const [jour, setJour] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  // Panneau « Ta journée » replié : il se replie aussi tout seul dès qu'on bouge la carte avec les doigts
  const [replie, setReplie] = useState(false)

  // Données
  useEffect(() => {
    supabase
      .from('places')
      .select('id, name, category, type, lat, lng, visited_at, stop_id, stops(city, lat, lng, trips(start_date)), expenses(amount_jpy, amount_eur)')
      .then(({ data, error }) => {
        if (error) return setErreur(error.message)
        const tous = (data ?? []) as unknown as LieuCarte[]
        const places: LieuPlace[] = []
        for (const l of tous) {
          const pos = positionLieu(l, l.stops)
          if (pos) places.push({ ...l, pos, jour: l.visited_at ? jourLocal(new Date(l.visited_at)) : null })
        }
        setSansPosition(tous.length - places.length)
        setLieux(places)
        const jours = [...new Set(places.map((l) => l.jour).filter(Boolean))].sort() as string[]
        const cible = places.find((l) => l.id === lieuCible)
        const aujourdhui = jourLocal(new Date())
        setJour(cible?.jour ?? (jours.includes(aujourdhui) ? aujourdhui : (jours.at(-1) ?? null)))
      })
  }, [lieuCible])

  // Carte
  useEffect(() => {
    if (!conteneur.current) return
    const c = creerCarte(conteneur.current)
    // Seulement les gestes de l'utilisateur (pas les cadrages automatiques)
    const replier = (e: { originalEvent?: unknown }) => e.originalEvent && setReplie(true)
    c.on('dragstart', replier)
    c.on('zoomstart', replier)
    c.on('load', () => {
      c.addSource('trajet', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      c.addLayer({
        id: 'trajet',
        type: 'line',
        source: 'trajet',
        paint: { 'line-color': '#121212', 'line-width': 3, 'line-dasharray': [0.1, 2] },
        layout: { 'line-cap': 'round' },
      })
      setCarteChargee(true)
    })
    carte.current = c
    return () => c.remove()
  }, [])

  const jours = useMemo(() => [...new Set((lieux ?? []).map((l) => l.jour).filter(Boolean))].sort() as string[], [lieux])
  const visibles = useMemo(() => (lieux ?? []).filter((l) => !filtre || l.category === filtre), [lieux, filtre])
  const duJour = useMemo(
    () => (lieux ?? []).filter((l) => l.jour === jour).sort((a, b) => (a.visited_at ?? '').localeCompare(b.visited_at ?? '')),
    [lieux, jour],
  )

  // Épingles
  useEffect(() => {
    const c = carte.current
    if (!c || !carteChargee) return
    const marqueurs = visibles.map((l) => {
      const el = elementEpingle(l.category, l.type, {
        approx: l.pos.approx,
        nom: l.jour === jour || l.id === lieuCible ? l.name : undefined,
        actif: l.id === lieuCible,
      })
      el.addEventListener('click', () => navigate(`/lieu/${l.id}`))
      return new Marker({ element: el }).setLngLat([l.pos.lng, l.pos.lat]).addTo(c)
    })
    return () => marqueurs.forEach((m) => m.remove())
  }, [visibles, carteChargee, jour, lieuCible, navigate])

  // Trajet pointillé de la journée + cadrage
  useEffect(() => {
    const c = carte.current
    if (!c || !carteChargee || !lieux) return
    const points = duJour.map((l) => [l.pos.lng, l.pos.lat])
    ;(c.getSource('trajet') as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: points.length > 1 ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: points } }] : [],
    })
    const cible = lieux.find((l) => l.id === lieuCible)
    const padding = { top: 150, bottom: 380, left: 50, right: 50 }
    if (cible) c.jumpTo({ center: [cible.pos.lng, cible.pos.lat], zoom: 15, padding })
    else if (duJour.length || lieux.length) {
      const b = new LngLatBounds()
      for (const l of duJour.length ? duJour : lieux) b.extend([l.pos.lng, l.pos.lat])
      c.fitBounds(b, { padding, maxZoom: 15, duration: 600 })
    }
  }, [duJour, lieux, carteChargee, lieuCible])

  const categoriesPresentes = CATEGORIES.filter((c) => (lieux ?? []).some((l) => l.category === c.id))
  const indexJour = jour ? jours.indexOf(jour) : -1

  return (
    <main className="fixed inset-0 bg-fond">
      <div className="absolute inset-0">
        <div ref={conteneur} className="h-full w-full" />
      </div>

      {/* Filtres */}
      <div className="absolute inset-x-0 top-[max(env(safe-area-inset-top),16px)] flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
        <button
          onClick={() => setFiltre(null)}
          className={`min-h-11 shrink-0 rounded-full px-4 font-bold shadow-sm ${!filtre ? 'bg-encre text-white' : 'bg-carte'}`}
        >
          Tout · {lieux?.length ?? 0}
        </button>
        {categoriesPresentes.map((c) => (
          <button
            key={c.id}
            onClick={() => setFiltre(filtre === c.id ? null : c.id)}
            className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 font-semibold shadow-sm ${filtre === c.id ? 'bg-encre text-white' : 'bg-carte'}`}
          >
            <span className="h-3 w-3 rounded-full" style={{ background: c.vif }} />
            {c.label}
          </button>
        ))}
      </div>

      {/* Ta journée */}
      {replie ? (
        <button
          onClick={() => setReplie(false)}
          className="absolute inset-x-3 bottom-[calc(max(env(safe-area-inset-bottom),16px)+76px)] mx-auto flex min-h-14 max-w-md items-center justify-between gap-3 rounded-full bg-carte px-5 shadow-[0_-4px_30px_rgba(0,0,0,0.10)]"
          aria-label="Afficher le panneau de la journée"
        >
          <span className="truncate font-semibold">
            {jour ? `Ta journée · ${duJour.length} lieu${duJour.length > 1 ? 'x' : ''}` : 'Mes lieux'}
          </span>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 15l6-6 6 6" />
          </svg>
        </button>
      ) : (
      <section className="absolute inset-x-3 bottom-[calc(max(env(safe-area-inset-bottom),16px)+76px)] mx-auto max-w-md rounded-[30px] bg-carte p-5 pt-2 shadow-[0_-4px_30px_rgba(0,0,0,0.08)]">
        {/* Poignée : touche pour replier */}
        <button onClick={() => setReplie(true)} aria-label="Replier le panneau" className="-mx-5 mb-2 flex h-6 w-[calc(100%+40px)] items-center justify-center">
          <span className="h-1.5 w-10 rounded-full bg-black/15" />
        </button>
        {erreur && <p className="text-sm font-semibold text-manger-fonce">{erreur}</p>}
        {lieux && lieux.length === 0 && (
          <div>
            <p className="font-titre text-2xl">Aucun lieu sur la carte</p>
            <p className="mt-1 text-sm text-texte-2">
              {sansPosition
                ? 'Tes lieux n’ont pas encore de position : choisis une ville avec la recherche, ou place le lieu sur la mini-carte dans « Modifier ».'
                : 'Ajoute ton premier lieu avec le bouton +.'}
            </p>
          </div>
        )}
        {jour && <Journee jour={jour} lieux={duJour} index={indexJour} total={jours.length} onJour={(i) => setJour(jours[i])} onReplier={() => setReplie(true)} />}
        {!jour && lieux && lieux.length > 0 && <p className="text-sm text-texte-2">Ces lieux n’ont pas de date de visite.</p>}
      </section>
      )}
    </main>
  )
}

function Journee({ jour, lieux, index, total, onJour, onReplier }: { jour: string; lieux: LieuPlace[]; index: number; total: number; onJour: (i: number) => void; onReplier: () => void }) {
  const villes = lieux.map((l) => l.stops?.city).filter(Boolean) as string[]
  const ville = villes.sort((a, b) => villes.filter((v) => v === b).length - villes.filter((v) => v === a).length)[0]
  const debut = lieux[0]?.stops?.trips?.start_date
  const numero = debut ? ecartJours(debut, jour) + 1 : null
  const date = new Date(jour + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })
  const yens = lieux.reduce((s, l) => s + l.expenses.reduce((t, e) => t + e.amount_jpy, 0), 0)
  const euros = lieux.reduce((s, l) => s + l.expenses.reduce((t, e) => t + (e.amount_eur ?? 0), 0), 0)
  const fleche = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fond text-xl disabled:opacity-30'

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-texte-2">
            {date.charAt(0).toUpperCase() + date.slice(1)}
            {numero && numero >= 1 ? ` · Jour ${numero}` : ''}
          </p>
          <h2 className="font-titre text-[26px] leading-tight">Ta journée à {ville}</h2>
        </div>
        <div className="flex shrink-0 gap-1">
          <button className={fleche} disabled={index <= 0} onClick={() => onJour(index - 1)} aria-label="Jour précédent">
            ‹
          </button>
          <button className={fleche} disabled={index >= total - 1} onClick={() => onJour(index + 1)} aria-label="Jour suivant">
            ›
          </button>
          <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-encre text-white" onClick={onReplier} aria-label="Replier le panneau">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-[22px] bg-fond px-4 py-3">
          <p className="font-titre text-[26px] leading-none">{lieux.length}</p>
          <p className="mt-1 text-sm text-texte-2">{lieux.length > 1 ? 'lieux' : 'lieu'}</p>
        </div>
        <div className="rounded-[22px] bg-manger-clair px-4 py-3">
          <p className="font-titre text-[26px] leading-none">{formatYen(yens)}</p>
          <p className="mt-1 text-sm text-manger-fonce">
            {euros ? `≈ ${Math.round(euros).toLocaleString('fr-FR')} €` : 'dépensés'}
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        {lieux.slice(0, 3).map((l) => (
          <Link key={l.id} to={`/lieu/${l.id}`} aria-label={l.name}>
            <Couverture categorieId={l.category} typeId={l.type} taille="petite" className="h-16 w-16 rounded-[18px]" />
          </Link>
        ))}
        {lieux.length > 3 && (
          <span className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-fond font-semibold text-texte-2">+{lieux.length - 3}</span>
        )}
      </div>

      <Link
        to={`/chercher?etape=${lieux[0]?.stop_id ?? ''}`}
        className="mt-4 flex min-h-14 items-center justify-center rounded-full bg-encre text-lg font-bold text-white"
      >
        Ajouter un lieu ici
      </Link>
    </div>
  )
}

function jourLocal(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
