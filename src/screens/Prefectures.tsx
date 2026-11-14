import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { aujourdhui } from '../lib/dates'
import { chargerPrefectures, type Prefecture } from '../lib/prefectures'

/** Position des 8 régions (en % du cadre), comme sur la maquette B9. */
const REGIONS: { id: string; label: string; gauche: number; haut: number; largeur: number; hauteur: number }[] = [
  { id: 'Hokkaidō', label: 'Hokkaidō', gauche: 68.6, haut: 0, largeur: 31.4, hauteur: 20.9 },
  { id: 'Tōhoku', label: 'Tōhoku', gauche: 62.9, haut: 23.5, largeur: 28.6, hauteur: 21.2 },
  { id: 'Chūbu', label: 'Chūbu', gauche: 35, haut: 35.6, largeur: 28.6, hauteur: 29.1 },
  { id: 'Kantō', label: 'Kantō', gauche: 65.3, haut: 47.1, largeur: 26.1, hauteur: 20 },
  { id: 'Chūgoku', label: 'Chūgoku', gauche: 5.3, haut: 50.8, largeur: 24.3, hauteur: 15.8 },
  { id: 'Kansai', label: 'Kansai', gauche: 31.4, haut: 66.5, largeur: 26.1, hauteur: 18.8 },
  { id: 'Shikoku', label: 'Shikoku', gauche: 12.1, haut: 68.9, largeur: 17.4, hauteur: 12.9 },
  { id: 'Kyūshū-Okinawa', label: 'Kyūshū', gauche: 0, haut: 84.8, largeur: 25, hauteur: 14.8 },
]

/** Plus la région est complète, plus le violet est foncé. */
function teinte(ratio: number) {
  if (ratio >= 0.85) return { fond: '#5B3FC4', texte: '#fff' }
  if (ratio >= 0.6) return { fond: '#7B61E8', texte: '#fff' }
  if (ratio >= 0.3) return { fond: '#B9A7F7', texte: '#121212' }
  if (ratio > 0) return { fond: '#DDD3FF', texte: '#121212' }
  return { fond: '#fff', texte: '#121212' }
}

/** B9 · Préfectures (sans « Partager ma carte », retiré). */
export default function Prefectures() {
  const navigate = useNavigate()
  const [prefectures, setPrefectures] = useState<Prefecture[]>([])
  const [visitees, setVisitees] = useState<Set<number>>(new Set())
  const [ici, setIci] = useState<string | null>(null)
  const [envies, setEnvies] = useState<Map<number, string>>(new Map()) // code → id de l'envie
  const [region, setRegion] = useState<string | null>(null)
  const [choisie, setChoisie] = useState<number | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      chargerPrefectures(),
      supabase.from('stops').select('prefecture_code, arrival_date, departure_date'),
      supabase.from('envies').select('id, prefecture_code').not('prefecture_code', 'is', null),
    ])
      .then(([prefs, etapes, env]) => {
        const err = etapes.error ?? env.error
        if (err) return setErreur(err.message)
        setPrefectures(prefs)
        const codes = new Set((etapes.data ?? []).map((e) => e.prefecture_code).filter(Boolean) as number[])
        setVisitees(codes)
        setEnvies(new Map((env.data ?? []).map((e) => [e.prefecture_code as number, e.id as string])))
        // « ici » : la région de la ville où tu es en ce moment (voyage en cours)
        const j = aujourdhui()
        const actuelle = (etapes.data ?? []).find((e) => e.arrival_date && e.arrival_date <= j && (!e.departure_date || e.departure_date >= j))
        const regionIci = prefs.find((p) => p.code === actuelle?.prefecture_code)?.region ?? null
        setIci(regionIci)
        // Région ouverte par défaut : celle d'ici, sinon la plus visitée
        const plusVisitee = REGIONS.map((r) => ({ r: r.id, n: prefs.filter((p) => p.region === r.id && codes.has(p.code)).length })).sort(
          (a, b) => b.n - a.n,
        )[0]
        setRegion(regionIci ?? plusVisitee?.r ?? 'Kantō')
      })
      .catch((e) => setErreur(e.message))
  }, [])

  const nbVisitees = visitees.size
  const dansRegion = prefectures.filter((p) => p.region === region)
  const nbRegion = dansRegion.filter((p) => visitees.has(p.code)).length
  const prefChoisie = prefectures.find((p) => p.code === choisie)

  async function basculerEnvie(code: number) {
    const existante = envies.get(code)
    if (existante) {
      const { error } = await supabase.from('envies').delete().eq('id', existante)
      if (error) return setErreur(error.message)
      const m = new Map(envies)
      m.delete(code)
      setEnvies(m)
    } else {
      const id = crypto.randomUUID()
      const { error } = await supabase.from('envies').insert({ id, prefecture_code: code })
      if (error) return setErreur(error.message)
      setEnvies(new Map(envies).set(code, id))
    }
  }

  return (
    <main className="mx-auto min-h-svh max-w-md bg-[#EEF0FA] pt-[max(env(safe-area-inset-top),24px)]">
      <div className="px-5">
        <button onClick={() => navigate(-1)} aria-label="Retour" className="flex h-12 w-12 items-center justify-center rounded-full bg-carte">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>

        <p className="mt-5 font-titre text-[60px] leading-none tracking-tight">
          {nbVisitees} <span className="text-[#8C80C4]">/ 47</span>
        </p>
        <p className="mt-2 text-texte-2">préfectures visitées · {Math.round((nbVisitees / 47) * 100)} % du Japon</p>
        {erreur && <p className="mt-3 rounded-carte bg-manger-clair p-3 text-sm font-semibold text-manger-fonce">{erreur}</p>}

        {/* Les 8 régions */}
        <div className="relative mt-6 aspect-[700/660] w-full">
          {REGIONS.map((r) => {
            const prefs = prefectures.filter((p) => p.region === r.id)
            const n = prefs.filter((p) => visitees.has(p.code)).length
            const t = teinte(prefs.length ? n / prefs.length : 0)
            const actif = region === r.id
            return (
              <button
                key={r.id}
                onClick={() => {
                  setRegion(r.id)
                  setChoisie(null)
                }}
                className={`absolute flex flex-col justify-between overflow-hidden rounded-[18px] px-2 py-1.5 text-left leading-tight ${n === 0 ? 'border-2 border-dashed border-[#B8B2D6]' : ''}`}
                style={{
                  left: `${r.gauche}%`,
                  top: `${r.haut}%`,
                  width: `${r.largeur}%`,
                  height: `${r.hauteur}%`,
                  background: t.fond,
                  color: t.texte,
                  boxShadow: actif ? '0 0 0 3px #F08A3C' : undefined,
                }}
              >
                <span className="text-[12px] font-bold">{r.label}</span>
                <span className="text-[12px]">
                  {n}/{prefs.length}
                  {ici === r.id ? ' · ici' : ''}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Détail de la région */}
      {region && (
        <section className="mt-6 rounded-t-[34px] bg-carte px-5 pt-6 pb-[max(env(safe-area-inset-bottom),28px)]">
          <div className="flex items-baseline justify-between">
            <h2 className="font-titre text-2xl">
              {REGIONS.find((r) => r.id === region)?.label} · {nbRegion} / {dansRegion.length}
            </h2>
            {nbRegion < dansRegion.length && <p className="text-sm text-texte-2">Il te manque {dansRegion.length - nbRegion}</p>}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {dansRegion.map((p) => {
              const vue = visitees.has(p.code)
              const envie = envies.has(p.code)
              const select = choisie === p.code
              return (
                <button
                  key={p.code}
                  onClick={() => !vue && setChoisie(select ? null : p.code)}
                  className={`min-h-11 rounded-full px-4 font-semibold ${
                    vue ? 'bg-dormir text-white' : select ? 'border-2 border-encre bg-carte' : 'border-2 border-dashed border-[#B8B2D6] bg-carte'
                  }`}
                >
                  {p.name_fr}
                  {envie && !vue ? ' ★' : ''}
                </button>
              )
            })}
          </div>
          {prefChoisie && (
            <button onClick={() => basculerEnvie(prefChoisie.code)} className="mt-5 min-h-14 w-full rounded-full bg-encre text-lg font-bold text-white">
              {envies.has(prefChoisie.code) ? `Retirer ${prefChoisie.name_fr} de mes envies` : `Ajouter ${prefChoisie.name_fr} à mes envies`}
            </button>
          )}
          {!prefChoisie && nbRegion < dansRegion.length && (
            <p className="mt-4 text-sm text-texte-2">Touche une préfecture en pointillés pour l’ajouter à tes envies (★).</p>
          )}
        </section>
      )}
    </main>
  )
}
