import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { aujourdhui } from '../lib/dates'
import { categorieDepuisGoogle, details, suggestions as chercher, type Suggestion } from '../lib/google'
import Couverture from '../components/Couverture'

type Etape = { id: string; city: string; lat: number | null; lng: number | null; arrival_date: string | null; departure_date: string | null }
export type LieuGoogle = {
  placeId: string
  nom: string
  nomJa: string | null
  lat: number | null
  lng: number | null
  categorie: string
  type: string
}

/** B3 · Chercher un lieu (Google Places, via le relais sécurisé). */
export default function Chercher() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [texte, setTexte] = useState('')
  const [resultats, setResultats] = useState<Suggestion[]>([])
  const [etat, setEtat] = useState<'repos' | 'recherche' | 'erreur'>('repos')
  const [erreur, setErreur] = useState<string | null>(null)
  const [etapes, setEtapes] = useState<Etape[]>([])
  const [etapeId, setEtapeId] = useState<string | null>(null)
  const [dejaNotes, setDejaNotes] = useState<Map<string, { id: string; rating: number | null }>>(new Map())
  const [ouverture, setOuverture] = useState<string | null>(null)
  // Un « jeton de session » regroupe les suggestions et le choix final (moins de requêtes facturées).
  const jeton = useRef(crypto.randomUUID())

  useEffect(() => {
    supabase
      .from('stops')
      .select('id, city, lat, lng, arrival_date, departure_date')
      .order('arrival_date', { ascending: false, nullsFirst: false })
      .limit(6)
      .then(({ data }) => {
        const liste = (data ?? []) as Etape[]
        setEtapes(liste)
        const jour = aujourdhui()
        const duJour = liste.find((e) => e.arrival_date && e.arrival_date <= jour && (!e.departure_date || e.departure_date >= jour))
        const demandee = liste.find((e) => e.id === params.get('etape'))
        setEtapeId((demandee ?? duJour ?? liste[0])?.id ?? null)
      })
    supabase
      .from('places')
      .select('id, google_place_id, rating')
      .not('google_place_id', 'is', null)
      .then(({ data }) => setDejaNotes(new Map((data ?? []).map((p) => [p.google_place_id as string, { id: p.id, rating: p.rating }]))))
  }, [])

  const etape = etapes.find((e) => e.id === etapeId) ?? null

  // Suggestions pendant la frappe (après une petite pause)
  useEffect(() => {
    const q = texte.trim()
    if (q.length < 2) {
      setResultats([])
      setEtat('repos')
      return
    }
    let annule = false
    const minuteur = setTimeout(() => {
      setEtat('recherche')
      const centre = etape?.lat != null && etape?.lng != null ? { lat: etape.lat, lng: etape.lng } : null
      chercher(q, jeton.current, centre)
        .then((r) => {
          if (annule) return
          setResultats(r)
          setEtat('repos')
        })
        .catch((e) => {
          if (annule) return
          setErreur(e.message)
          setEtat('erreur')
        })
    }, 350)
    return () => {
      annule = true
      clearTimeout(minuteur)
    }
  }, [texte, etape])

  async function choisir(s: Suggestion) {
    const deja = dejaNotes.get(s.placeId)
    if (deja) return navigate(`/lieu/${deja.id}`)
    setOuverture(s.placeId)
    try {
      const d = await details(s.placeId, jeton.current)
      jeton.current = crypto.randomUUID() // nouvelle session pour la prochaine recherche
      const { categorie, type } = categorieDepuisGoogle(d.types.length ? d.types : s.types)
      const lieu: LieuGoogle = { placeId: d.placeId, nom: d.nom, nomJa: d.nomJa, lat: d.lat, lng: d.lng, categorie, type }
      navigate(`/ajouter${etapeId ? `?etape=${etapeId}` : ''}`, { state: { google: lieu }, replace: true })
    } catch (e) {
      setErreur((e as Error).message)
      setEtat('erreur')
      setOuverture(null)
    }
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col bg-carte px-5 pt-[max(env(safe-area-inset-top),24px)] pb-[max(env(safe-area-inset-bottom),20px)]">
      {/* Recherche */}
      <div className="flex items-center gap-3">
        <div className="flex min-h-14 min-w-0 flex-1 items-center gap-3 rounded-full border-[2.5px] border-encre px-4">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            autoFocus
            type="search"
            enterKeyHint="search"
            placeholder="Resto, temple, hôtel…"
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            aria-label="Chercher un lieu"
            className="min-w-0 flex-1 bg-transparent text-lg font-semibold outline-none placeholder:font-normal placeholder:text-texte-2/60 [&::-webkit-search-cancel-button]:hidden"
          />
          {texte && (
            <button onClick={() => setTexte('')} aria-label="Effacer" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-fond">
              ✕
            </button>
          )}
        </div>
        <button onClick={() => navigate(-1)} className="min-h-11 shrink-0 font-semibold">
          Annuler
        </button>
      </div>

      {/* Ville de l'étape (les résultats proches passent en premier) */}
      {etapes.length > 0 && (
        <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
          {etapes.map((e) => (
            <button
              key={e.id}
              onClick={() => setEtapeId(e.id)}
              className={`min-h-11 shrink-0 rounded-full px-4 font-semibold ${e.id === etapeId ? 'bg-encre text-white' : 'bg-fond'}`}
            >
              {e.city}
            </button>
          ))}
        </div>
      )}

      {/* Résultats */}
      <div className="mt-5 flex-1">
        {texte.trim().length >= 2 && (
          <p className="text-sm font-semibold text-texte-2">
            {etat === 'recherche' ? 'Recherche…' : etat === 'erreur' ? `Recherche impossible : ${erreur}` : `Résultats Google · ${resultats.length}`}
          </p>
        )}
        <ul className="mt-2 divide-y divide-black/5">
          {resultats.map((s, i) => {
            const { categorie, type } = categorieDepuisGoogle(s.types)
            const deja = dejaNotes.get(s.placeId)
            return (
              <li key={s.placeId}>
                <button onClick={() => choisir(s)} disabled={!!ouverture} className="flex w-full items-center gap-4 py-3 text-left">
                  <Couverture categorieId={categorie} typeId={type} taille="petite" className="h-12 w-12 shrink-0 rounded-[16px]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[17px] font-bold">{s.nom}</span>
                    <span className="block truncate text-sm text-texte-2">{s.detail}</span>
                  </span>
                  {deja ? (
                    <span className="shrink-0 rounded-full bg-encre px-3 py-1.5 text-sm font-bold text-white">
                      Déjà noté{deja.rating !== null ? ` · ${deja.rating.toLocaleString('fr-FR')}/10` : ''}
                    </span>
                  ) : (
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl ${i === 0 ? 'bg-manger' : 'bg-fond'}`}
                      aria-hidden="true"
                    >
                      {ouverture === s.placeId ? '…' : '+'}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Lieu introuvable */}
      <div className="mt-4 flex items-center gap-3 rounded-[26px] bg-fond p-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-carte" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />
            <circle cx="12" cy="9.5" r="2.5" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block whitespace-nowrap font-bold">Lieu introuvable ?</span>
          <span className="block text-sm text-texte-2">Remplis-le toi-même</span>
        </span>
        <Link
          to={`/ajouter${etapeId ? `?etape=${etapeId}` : ''}`}
          replace
          className="flex min-h-12 shrink-0 items-center rounded-full bg-encre px-5 font-bold text-white"
        >
          Épingler
        </Link>
      </div>
    </main>
  )
}
