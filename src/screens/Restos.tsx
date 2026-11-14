import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { aujourdhui } from '../lib/dates'
import { categorie, typeDe } from '../lib/categories'
import Couverture from '../components/Couverture'
import { photosDuLieu } from '../lib/photos'

type Resto = {
  id: string
  name: string
  category: string
  type: string | null
  rating: number
  stops: { city: string; trip_id: string } | null
  expenses: { amount_jpy: number }[]
}
type Voyage = { id: string; name: string; start_date: string | null; end_date: string | null }

/** B6 · Mes restos : podium + classement (manger, café et konbini, notés). */
export default function Restos() {
  const navigate = useNavigate()
  const [restos, setRestos] = useState<Resto[] | null>(null)
  const [voyage, setVoyage] = useState<Voyage | null>(null)
  const [portee, setPortee] = useState<'voyage' | 'japon'>('voyage')
  const [type, setType] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      supabase
        .from('places')
        .select('id, name, category, type, rating, stops(city, trip_id), expenses(amount_jpy)')
        .not('rating', 'is', null)
        .or('category.in.(manger,cafe),type.eq.konbini'),
      supabase.from('trips').select('id, name, start_date, end_date').order('start_date', { ascending: false, nullsFirst: false }),
    ]).then(([r, t]) => {
      const err = r.error ?? t.error
      if (err) return setErreur(err.message)
      setRestos((r.data ?? []) as unknown as Resto[])
      // « Ce voyage » = le voyage en cours, sinon le plus récent déjà commencé
      const j = aujourdhui()
      const liste = (t.data ?? []) as Voyage[]
      const v = liste.find((x) => x.start_date && x.start_date <= j && (!x.end_date || x.end_date >= j)) ?? liste.find((x) => x.start_date && x.start_date <= j) ?? liste[0]
      setVoyage(v ?? null)
      if (!v) setPortee('japon')
    })
  }, [])

  const dansPortee = useMemo(
    () => (restos ?? []).filter((r) => portee === 'japon' || r.stops?.trip_id === voyage?.id),
    [restos, portee, voyage],
  )
  const typesPresents = [...new Set(dansPortee.map((r) => r.type).filter(Boolean))] as string[]
  const classement = dansPortee
    .filter((r) => !type || r.type === type)
    .sort((a, b) => b.rating - a.rating || prix(a) - prix(b))
  const total = classement.reduce((s, r) => s + prix(r), 0)
  const [premier, deuxieme, troisieme] = classement
  const suite = classement.slice(3)

  const pilule = (actif: boolean) => `min-h-11 shrink-0 rounded-full px-5 font-semibold ${actif ? 'bg-manger text-encre' : 'bg-carte'}`

  return (
    <main className="mx-auto min-h-svh max-w-md bg-[#FFF5EC] pt-[max(env(safe-area-inset-top),32px)] pb-36">
      <div className="flex items-center justify-between gap-3 px-5">
        <h1 className="whitespace-nowrap font-titre text-[32px] leading-none tracking-tight">Mes restos</h1>
        <div className="flex rounded-full bg-carte p-1">
          <span className="flex h-11 items-center rounded-full bg-encre px-4 font-bold text-white">Liste</span>
          <button onClick={() => navigate('/carte?filtre=manger')} className="h-11 rounded-full px-4 font-semibold">
            Carte
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="mt-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        {voyage && (
          <button onClick={() => setPortee('voyage')} className={pilule(portee === 'voyage')}>
            {voyage.name}
          </button>
        )}
        <button onClick={() => setPortee('japon')} className={pilule(portee === 'japon')}>
          Tout le Japon
        </button>
        {typesPresents.map((t) => {
          const r = dansPortee.find((x) => x.type === t)!
          return (
            <button key={t} onClick={() => setType(type === t ? null : t)} className={`min-h-11 shrink-0 rounded-full px-5 font-semibold ${type === t ? 'bg-encre text-white' : 'bg-carte'}`}>
              {typeDe(r.category, t).label}
            </button>
          )
        })}
      </div>

      {erreur && <p className="mx-5 mt-4 rounded-carte bg-manger-clair p-4 text-sm font-semibold text-manger-fonce">{erreur}</p>}

      {restos && classement.length === 0 && (
        <p className="mx-5 mt-8 rounded-carte bg-carte p-6 text-center text-texte-2">
          Aucun resto noté {portee === 'voyage' ? 'pour ce voyage' : 'pour l’instant'}. Ajoute un lieu « Manger » ou « Café » avec une note.
        </p>
      )}

      {/* Podium : 2 · 1 · 3 */}
      {premier && (
        <div className="mt-6 grid grid-cols-3 items-end gap-2 px-5">
          <Marche resto={deuxieme} rang={2} hauteur="h-[112px]" />
          <Marche resto={premier} rang={1} hauteur="h-[160px]" />
          <Marche resto={troisieme} rang={3} hauteur="h-[90px]" />
        </div>
      )}

      {/* Classement */}
      {classement.length > 0 && (
        <section className="min-h-[40svh] rounded-t-[34px] bg-carte px-5 pt-6 pb-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-titre text-2xl">Tous · {classement.length}</h2>
            <p className="text-texte-2">Total ¥{total.toLocaleString('fr-FR')}</p>
          </div>
          <ul className="mt-2 divide-y divide-black/5">
            {suite.map((r, i) => (
              <li key={r.id}>
                <Link to={`/lieu/${r.id}`} className="flex items-center gap-3 py-3">
                  <span className="w-6 shrink-0 font-titre text-lg text-texte-2/60">{i + 4}</span>
                  <Couverture categorieId={r.category} typeId={r.type} taille="petite" className="h-14 w-14 shrink-0 rounded-[18px]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold">{r.name}</span>
                    <span className="block truncate text-sm text-texte-2">
                      {typeDe(r.category, r.type).label}
                      {r.stops ? ` · ${r.stops.city}` : ''}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    {prix(r) > 0 && <span className="block font-titre text-lg">¥{prix(r).toLocaleString('fr-FR')}</span>}
                    <span className="mt-0.5 inline-block rounded-full bg-manger-clair px-2.5 py-0.5 text-sm font-bold text-manger-fonce">
                      {r.rating.toLocaleString('fr-FR')} / 10
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {suite.length === 0 && <p className="py-4 text-sm text-texte-2">Tous tes restos notés sont sur le podium.</p>}
        </section>
      )}
    </main>
  )
}

const prix = (r: Resto) => r.expenses.reduce((s, e) => s + e.amount_jpy, 0)

/** Une marche du podium : image (ta photo si tu en as une) + nom + rang + note. */
function Marche({ resto, rang, hauteur }: { resto: Resto | undefined; rang: number; hauteur: string }) {
  const [photo, setPhoto] = useState<string | null>(null)
  useEffect(() => {
    if (resto) photosDuLieu(resto.id).then((p) => setPhoto(p[0]?.url ?? null)).catch(() => {})
  }, [resto])
  if (!resto) return <div />
  const taille = rang === 1 ? 'h-[92px] w-[92px] rounded-[30px]' : 'h-[68px] w-[68px] rounded-full'
  return (
    <Link to={`/lieu/${resto.id}`} className="flex min-w-0 flex-col items-center">
      <span className={`overflow-hidden ring-[6px] ring-white ${taille}`}>
        {photo ? (
          <img src={photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <Couverture categorieId={resto.category} typeId={resto.type} taille="petite" className="h-full w-full" />
        )}
      </span>
      <span className="mt-2 w-full truncate text-center text-sm font-bold">{resto.name}</span>
      <span
        className={`mt-2 flex w-full flex-col items-center justify-center rounded-t-[22px] ${hauteur}`}
        style={{ background: rang === 1 ? categorie('manger').vif : '#fff' }}
      >
        <span className="font-titre text-4xl leading-none">{rang}</span>
        <span className={`mt-1 text-sm ${rang === 1 ? 'text-encre/70' : 'text-texte-2'}`}>{resto.rating.toLocaleString('fr-FR')} / 10</span>
      </span>
    </Link>
  )
}
