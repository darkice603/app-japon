import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useProfil } from '../lib/profil'
import { deconnexion } from '../lib/auth'
import FeuilleVoyage from '../components/FeuilleVoyage'
import { aujourdhui, ecartJours, formatEuro, formatYen, moisAnnee } from '../lib/dates'

type Voyage = {
  id: string
  name: string
  start_date: string | null
  end_date: string | null
  stops: { city: string; prefecture_code: number | null; arrival_date: string | null; lat: number | null; lng: number | null }[]
  expenses: { amount_jpy: number; amount_eur: number | null }[]
}

type Donnees = { voyages: Voyage[]; lieuxNotes: number }

/** Couleurs provisoires des couvertures (les illustrations arrivent à l'étape 6). */
const couvertures = [
  { fond: '#F2B48C', bas: '#3F6F86' },
  { fond: '#E8D8C4', bas: '#6F7F5A' },
  { fond: '#BFD9E6', bas: '#2F5FA8' },
  { fond: '#EAE3FF', bas: '#5B3FC4' },
  { fond: '#FFF1C2', bas: '#8A6200' },
]

/** B1 · Mes voyages */
export default function MesVoyages() {
  const { prenom } = useProfil()
  const navigate = useNavigate()
  const [donnees, setDonnees] = useState<Donnees | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [menu, setMenu] = useState(false)
  const [feuille, setFeuille] = useState<'nouveau' | null>(null)

  const charger = useCallback(() => {
    Promise.all([
      supabase
        .from('trips')
        .select('id, name, start_date, end_date, stops(city, prefecture_code, arrival_date, lat, lng), expenses(amount_jpy, amount_eur)')
        .order('start_date', { ascending: false, nullsFirst: false }),
      supabase.from('places').select('id', { count: 'exact', head: true }).not('rating', 'is', null),
    ]).then(([voyages, lieux]) => {
      const err = voyages.error ?? lieux.error
      if (err) return setErreur(err.message)
      setErreur(null)
      setDonnees({ voyages: (voyages.data ?? []) as Voyage[], lieuxNotes: lieux.count ?? 0 })
    })
  }, [])

  useEffect(charger, [charger])
  // Recharger quand des lieux ajoutés hors ligne viennent d'être envoyés
  useEffect(() => {
    window.addEventListener('japon:synchro', charger)
    return () => window.removeEventListener('japon:synchro', charger)
  }, [charger])

  const jour = aujourdhui()
  const voyages = donnees?.voyages ?? []
  const enCours = voyages.find((v) => v.start_date && v.start_date <= jour && (!v.end_date || v.end_date >= jour))
  const futurs = voyages
    .filter((v) => v.start_date && v.start_date > jour)
    .sort((a, b) => a.start_date!.localeCompare(b.start_date!))
  // Mis en avant : le voyage en cours, sinon le prochain.
  const vedette = enCours ?? futurs[0]
  const aVenir = futurs.filter((v) => v !== vedette)
  const passes = voyages.filter((v) => v !== enCours && !futurs.includes(v))
  const prefectures = new Set(voyages.flatMap((v) => v.stops.map((s) => s.prefecture_code)).filter(Boolean)).size

  return (
    <main className="mx-auto max-w-md px-5 pt-[max(env(safe-area-inset-top),40px)] pb-36">
      {/* En-tête */}
      <header className="flex items-center justify-between gap-4">
        <h1 className="font-titre text-[34px] leading-tight tracking-tight">Salut {prenom}</h1>
        <div className="relative">
          <button
            onClick={() => setMenu(!menu)}
            aria-label="Mon compte"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-dormir font-titre text-lg text-white"
          >
            {prenom?.charAt(0).toUpperCase()}
          </button>
          {menu && (
            <div className="absolute right-0 top-14 z-10 w-48 rounded-carte bg-carte p-2 shadow-[0_10px_40px_rgba(0,0,0,0.12)]">
              <button
                onClick={() => deconnexion()}
                className="min-h-11 w-full rounded-full px-4 text-left text-sm font-semibold hover:bg-fond"
              >
                Se déconnecter
              </button>
            </div>
          )}
        </div>
      </header>

      {erreur && <p className="mt-6 rounded-carte bg-manger-clair p-4 text-sm font-semibold text-manger-fonce">{erreur}</p>}

      {/* Voyage en cours (ou prochain voyage) */}
      {vedette && <CarteVedette voyage={vedette} enCours={vedette === enCours} jour={jour} onOuvrir={() => navigate(`/voyage/${vedette.id}`)} />}

      {/* Compteurs */}
      <section className="mt-3 grid grid-cols-3 gap-3">
        <Link to="/prefectures" className="rounded-[22px] bg-dormir-clair px-3 py-4">
          <p className="font-titre text-[26px] leading-none">
            {donnees ? prefectures : '–'}
            <span className="text-base text-dormir-fonce">/47</span>
          </p>
          <p className="mt-1 text-sm text-dormir-fonce">préfectures</p>
        </Link>
        <div className="rounded-[22px] bg-visiter-clair px-3 py-4">
          <p className="font-titre text-[26px] leading-none">{donnees ? voyages.length : '–'}</p>
          <p className="mt-1 text-sm text-visiter-fonce">{voyages.length > 1 ? 'voyages' : 'voyage'}</p>
        </div>
        <div className="rounded-[22px] bg-manger-clair px-3 py-4">
          <p className="font-titre text-[26px] leading-none">{donnees ? donnees.lieuxNotes : '–'}</p>
          <p className="mt-1 text-sm text-manger-fonce">lieux notés</p>
        </div>
      </section>

      {donnees && voyages.length === 0 && (
        <section className="mt-8 rounded-carte bg-carte p-6 text-center">
          <p className="font-kanji text-4xl text-texte-2">旅</p>
          <p className="mt-2 font-titre text-xl">Aucun voyage pour l'instant</p>
          <p className="mt-1 text-sm text-texte-2">Commence par créer ton premier voyage.</p>
          <button onClick={() => setFeuille('nouveau')} className="mt-5 min-h-14 w-full rounded-full bg-encre text-lg font-bold text-white">
            Nouveau voyage
          </button>
        </section>
      )}

      {voyages.length > 0 && (
        <button
          onClick={() => setFeuille('nouveau')}
          className="mt-3 flex min-h-14 w-full items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-black/15 font-semibold text-texte-2"
        >
          <span className="text-xl leading-none">+</span> Nouveau voyage
        </button>
      )}

      {aVenir.length > 0 && (
        <Rangee titre="À venir">
          {aVenir.map((v, i) => (
            <CarteVoyage key={v.id} voyage={v} couleur={couvertures[(i + 2) % couvertures.length]} onOuvrir={() => navigate(`/voyage/${v.id}`)} />
          ))}
        </Rangee>
      )}

      {passes.length > 0 && (
        <Rangee titre="Voyages passés">
          {passes.map((v, i) => (
            <CarteVoyage key={v.id} voyage={v} couleur={couvertures[i % couvertures.length]} onOuvrir={() => navigate(`/voyage/${v.id}`)} />
          ))}
        </Rangee>
      )}

      {feuille && (
        <FeuilleVoyage
          voyage={null}
          onFermer={() => setFeuille(null)}
          onEnregistre={() => {
            setFeuille(null)
            charger()
          }}
        />
      )}
    </main>
  )
}

function Rangee({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-titre text-2xl">{titre}</h2>
      <div className="-mx-5 mt-3 flex snap-x gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none]">{children}</div>
    </section>
  )
}

function CarteVedette({ voyage, enCours, jour, onOuvrir }: { voyage: Voyage; enCours: boolean; jour: string; onOuvrir: () => void }) {
  const etapes = [...voyage.stops].sort((a, b) => (a.arrival_date ?? '9999').localeCompare(b.arrival_date ?? '9999'))
  const villes = etapes.map((s) => s.city)
  const totalJours = voyage.start_date && voyage.end_date ? ecartJours(voyage.start_date, voyage.end_date) + 1 : null
  const numeroJour = voyage.start_date ? ecartJours(voyage.start_date, jour) + 1 : null
  const dansJours = voyage.start_date ? ecartJours(jour, voyage.start_date) : null
  const depense = voyage.expenses.reduce((s, e) => s + e.amount_jpy, 0)

  return (
    <button onClick={onOuvrir} className="mt-6 flex w-full gap-3 rounded-[30px] bg-carte p-4 pl-5 text-left">
      <div className="min-w-0 flex-1 py-1">
        <p className="text-sm font-medium text-texte-2">{enCours ? 'En cours' : 'Prochain voyage'}</p>
        <h2 className="mt-1 truncate font-titre text-[28px] leading-tight">{voyage.name}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-encre px-3 py-1.5 text-sm font-bold text-white">
            {enCours
              ? `Jour ${numeroJour}${totalJours ? ` / ${totalJours}` : ''}`
              : `Dans ${dansJours} jour${dansJours === 1 ? '' : 's'}`}
          </span>
          {depense > 0 && (
            <span className="rounded-full bg-manger-clair px-3 py-1.5 text-sm font-bold text-manger-fonce">{formatYen(depense)}</span>
          )}
        </div>
        {villes.length > 0 && <p className="mt-3 text-sm text-texte-2">{villes.join(' → ')}</p>}
      </div>
      <MiniCarte etapes={etapes} />
    </button>
  )
}

/**
 * Mini-carte de l'itinéraire : les villes placées à leur vraie position relative
 * (nord en haut). Sans positions connues, un tracé décoratif.
 */
function MiniCarte({ etapes }: { etapes: { lat: number | null; lng: number | null }[] }) {
  const connues = etapes.filter((e) => e.lat != null && e.lng != null) as { lat: number; lng: number }[]
  let points: number[][]
  if (connues.length >= 2) {
    const lats = connues.map((e) => e.lat)
    const lngs = connues.map((e) => e.lng)
    const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)]
    const etendue = Math.max(maxLat - minLat, maxLng - minLng, 0.05)
    const [cLat, cLng] = [(minLat + maxLat) / 2, (minLng + maxLng) / 2]
    points = connues.map((e) => [60 + ((e.lng - cLng) / etendue) * 88, 60 - ((e.lat - cLat) / etendue) * 88])
  } else {
    const n = Math.max(2, Math.min(etapes.length, 5))
    points = Array.from({ length: n }, (_, i) => [16 + (i * 88) / (n - 1), 104 - (i * 88) / (n - 1)])
  }
  const couleurs = ['#8F72F2', '#3DB3C7', '#5C8BD6', '#F08A3C', '#E0609A']
  return (
    <svg viewBox="0 0 120 120" className="h-[120px] w-[120px] shrink-0 rounded-[22px] bg-[#EDEDE9]" aria-hidden="true">
      <path d="M0 40h120M0 86h120M40 0v120M84 0v120" stroke="#fff" strokeWidth="6" />
      <polyline points={points.map((p) => p.join(',')).join(' ')} fill="none" stroke="#121212" strokeWidth="2.5" />
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="6" fill={couleurs[i % couleurs.length]} stroke="#fff" strokeWidth="2" />
      ))}
    </svg>
  )
}

function CarteVoyage({ voyage, couleur, onOuvrir }: { voyage: Voyage; couleur: { fond: string; bas: string }; onOuvrir: () => void }) {
  const euros = voyage.expenses.reduce((s, e) => s + (e.amount_eur ?? 0), 0)
  const details = [voyage.start_date && moisAnnee(voyage.start_date), euros > 0 && formatEuro(euros)].filter(Boolean)
  return (
    <button
      onClick={onOuvrir}
      className="relative flex h-60 w-[200px] shrink-0 snap-start flex-col justify-end overflow-hidden rounded-[30px] p-2.5 text-left"
      style={{ background: `linear-gradient(${couleur.fond} 0 66%, ${couleur.bas} 66%)` }}
    >
      <div className="w-full rounded-[20px] bg-black/40 px-3 py-2.5 text-white backdrop-blur-sm">
        <h3 className="truncate font-titre text-lg leading-tight">{voyage.name}</h3>
        {details.length > 0 && <p className="text-sm">{details.join(' · ')}</p>}
      </div>
    </button>
  )
}
