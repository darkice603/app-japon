import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Feuille, { styles } from '../components/Feuille'
import ChoixPosition from '../components/ChoixPosition'
import { supabase } from '../lib/supabase'
import { CATEGORIES, categorie, libelleNote, type CategorieId } from '../lib/categories'
import { tauxJpyEur } from '../lib/change'
import { aujourdhui } from '../lib/dates'
import type { LieuGoogle } from './Chercher'

type EtapeChoix = {
  id: string
  city: string
  arrival_date: string | null
  lat: number | null
  lng: number | null
  departure_date: string | null
  trip_id: string
  trips: { name: string; start_date: string | null } | null
}

type Article = { id: string; label: string; prix: string }

type Retour = 'oui' | 'bof' | 'non'

/** B4 · Ajouter (ou modifier) un lieu, en saisie manuelle. */
export default function AjouterLieu() {
  const navigate = useNavigate()
  const { id: idExistant } = useParams()
  const [params] = useSearchParams()
  // Lieu choisi dans la recherche Google (B3) : sert à préremplir le formulaire
  const google = (useLocation().state as { google?: LieuGoogle } | null)?.google ?? null

  const [id] = useState(() => idExistant ?? crypto.randomUUID())
  const [etapes, setEtapes] = useState<EtapeChoix[] | null>(null)
  const [etapeId, setEtapeId] = useState('')
  const [nom, setNom] = useState(google?.nom ?? '')
  const [nomJa, setNomJa] = useState(google?.nomJa ?? '')
  const [cat, setCat] = useState<CategorieId>((google?.categorie as CategorieId) ?? 'manger')
  const [type, setType] = useState<string>(google?.type ?? 'ramen')
  const [quand, setQuand] = useState(() => maintenantLocal())
  const [prix, setPrix] = useState('')
  const [articles, setArticles] = useState<Article[]>([])
  const [note, setNote] = useState<number | null>(null)
  const [retour, setRetour] = useState<Retour | null>(null)
  const [notePerso, setNotePerso] = useState('')
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(
    google?.lat != null && google?.lng != null ? { lat: google.lat, lng: google.lng } : null,
  )
  const [googlePlaceId, setGooglePlaceId] = useState<string | null>(google?.placeId ?? null)
  const [taux, setTaux] = useState<number | null>(null)
  const [depenseId, setDepenseId] = useState<string | null>(null)
  const [articlesInitiaux, setArticlesInitiaux] = useState<string[]>([])
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  const categorieActive = categorie(cat)
  const kanji = categorieActive.types.find((t) => t.id === type)?.kanji ?? categorieActive.types[0].kanji

  // Étapes disponibles + (en modification) le lieu existant
  useEffect(() => {
    supabase
      .from('stops')
      .select('id, city, arrival_date, departure_date, lat, lng, trip_id, trips(name, start_date)')
      .order('arrival_date', { ascending: false, nullsFirst: false })
      .then(({ data, error }) => {
        if (error) return setErreur(error.message)
        const liste = (data ?? []) as unknown as EtapeChoix[]
        setEtapes(liste)
        if (!idExistant) setEtapeId(params.get('etape') ?? etapeParDefaut(liste)?.id ?? '')
      })

    if (!idExistant) return
    Promise.all([
      supabase.from('places').select('*').eq('id', idExistant).single(),
      supabase.from('place_items').select('id, label, price_jpy').eq('place_id', idExistant).order('position'),
      supabase.from('expenses').select('id, amount_jpy').eq('place_id', idExistant).limit(1).maybeSingle(),
    ]).then(([lieu, items, depense]) => {
      const err = lieu.error ?? items.error ?? depense.error
      if (err) return setErreur(err.message)
      const l = lieu.data
      setEtapeId(l.stop_id)
      setNom(l.name)
      setNomJa(l.name_ja ?? '')
      setCat(l.category)
      setType(l.type ?? categorie(l.category).types[0].id)
      if (l.visited_at) setQuand(versLocal(new Date(l.visited_at)))
      setNote(l.rating)
      setRetour(l.would_return)
      setNotePerso(l.note ?? '')
      if (l.lat != null && l.lng != null) setPosition({ lat: l.lat, lng: l.lng })
      setGooglePlaceId(l.google_place_id ?? null)
      setArticles((items.data ?? []).map((a) => ({ id: a.id, label: a.label, prix: a.price_jpy?.toString() ?? '' })))
      setArticlesInitiaux((items.data ?? []).map((a) => a.id))
      if (depense.data) {
        setDepenseId(depense.data.id)
        setPrix(depense.data.amount_jpy.toString())
      }
    })
  }, [idExistant, params])

  // Nouveau lieu dans une étape passée ou future : on cale la date sur l'arrivée dans la ville.
  useEffect(() => {
    if (idExistant) return
    const et = etapes?.find((e) => e.id === etapeId)
    // Sans date d'arrivée, on prend le début du voyage.
    const arrivee = et?.arrival_date ?? et?.trips?.start_date
    if (!et || !arrivee) return
    const jour = aujourdhui()
    const dedans = arrivee <= jour && (et.departure_date ? et.departure_date >= jour : arrivee === jour)
    setQuand(dedans ? maintenantLocal() : `${arrivee}T12:00`)
  }, [etapeId, etapes, idExistant])

  // Taux du jour de la visite
  const jourVisite = quand.slice(0, 10)
  useEffect(() => {
    setTaux(null)
    tauxJpyEur(jourVisite).then(setTaux).catch(() => setTaux(null))
  }, [jourVisite])

  const sommeArticles = articles.reduce((s, a) => s + (Number(a.prix) || 0), 0)
  const total = Number(prix) || sommeArticles
  const euros = taux && total ? total * taux : null

  const etapeChoisie = etapes?.find((e) => e.id === etapeId)
  const centreVille = useMemo(
    () => (etapeChoisie?.lat != null && etapeChoisie?.lng != null ? { lat: etapeChoisie.lat, lng: etapeChoisie.lng } : null),
    [etapeChoisie?.lat, etapeChoisie?.lng],
  )

  const etapesParVoyage = useMemo(() => {
    const groupes = new Map<string, EtapeChoix[]>()
    for (const e of etapes ?? []) groupes.set(e.trips?.name ?? 'Voyage', [...(groupes.get(e.trips?.name ?? 'Voyage') ?? []), e])
    return [...groupes]
  }, [etapes])

  function choisirCategorie(nouvelle: CategorieId) {
    setCat(nouvelle)
    setType(categorie(nouvelle).types[0].id)
  }

  function fermer() {
    if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }

  async function enregistrer(e: FormEvent) {
    e.preventDefault()
    if (!nom.trim()) {
      setErreur('Donne un nom au lieu (tout en haut).')
      document.getElementById('nom-lieu')?.focus()
      return
    }
    const etape = etapes?.find((et) => et.id === etapeId)
    if (!etape) return setErreur('Choisis la ville (étape) où se trouve ce lieu.')
    setEnCours(true)
    setErreur(null)

    const { error: errLieu } = await supabase.from('places').upsert({
      id,
      stop_id: etape.id,
      name: nom.trim(),
      name_ja: nomJa.trim() || null,
      category: cat,
      type,
      visited_at: quand ? new Date(quand).toISOString() : null,
      rating: note,
      would_return: retour,
      note: notePerso.trim() || null,
      google_place_id: googlePlaceId,
      lat: position?.lat ?? null,
      lng: position?.lng ?? null,
    })
    if (errLieu) return echec(errLieu.message)

    // Ce que j'ai pris
    const gardes = articles.filter((a) => a.label.trim())
    const retires = articlesInitiaux.filter((ancien) => !gardes.some((a) => a.id === ancien))
    if (retires.length) {
      const { error } = await supabase.from('place_items').delete().in('id', retires)
      if (error) return echec(error.message)
    }
    if (gardes.length) {
      const { error } = await supabase.from('place_items').upsert(
        gardes.map((a, i) => ({ id: a.id, place_id: id, label: a.label.trim(), price_jpy: Number(a.prix) || null, position: i })),
      )
      if (error) return echec(error.message)
    }

    // Dépense créée automatiquement à partir du prix payé
    if (total > 0) {
      const tauxJour = taux ?? (await tauxJpyEur(jourVisite).catch(() => null))
      const { error } = await supabase.from('expenses').upsert({
        id: depenseId ?? crypto.randomUUID(),
        trip_id: etape.trip_id,
        place_id: id,
        label: nom.trim(),
        amount_jpy: total,
        rate: tauxJour,
        amount_eur: tauxJour ? Math.round(total * tauxJour * 100) / 100 : null,
        category: categorieActive.depense,
        spent_on: jourVisite || aujourdhui(),
      })
      if (error) return echec(error.message)
    } else if (depenseId) {
      const { error } = await supabase.from('expenses').delete().eq('id', depenseId)
      if (error) return echec(error.message)
    }

    // Nouveau lieu : on ouvre sa fiche. Modification : on revient à la fiche.
    if (idExistant) navigate(-1)
    else navigate(`/lieu/${id}`, { replace: true })
  }

  async function supprimer() {
    if (!window.confirm(`Supprimer « ${nom} » et sa dépense ? C'est définitif.`)) return
    setEnCours(true)
    if (depenseId) {
      const { error } = await supabase.from('expenses').delete().eq('id', depenseId)
      if (error) return echec(error.message)
    }
    const { error } = await supabase.from('places').delete().eq('id', id)
    if (error) return echec(error.message)
    const tripId = etapes?.find((et) => et.id === etapeId)?.trip_id
    navigate(tripId ? `/voyage/${tripId}` : '/', { replace: true })
  }

  function echec(message: string) {
    setEnCours(false)
    setErreur(message)
  }

  const ajouterArticle = () => setArticles([...articles, { id: crypto.randomUUID(), label: '', prix: '' }])
  const modifierArticle = (i: number, champ: 'label' | 'prix', valeur: string) =>
    setArticles(articles.map((a, j) => (j === i ? { ...a, [champ]: champ === 'prix' ? valeur.replace(/\D/g, '') : valeur } : a)))

  return (
    <main className="min-h-svh bg-[#6F716C]">
      <Feuille titre={idExistant ? 'Modifier le lieu' : 'Nouveau lieu'} onFermer={fermer}>
        {etapes && etapes.length === 0 ? (
          <div className="space-y-4 pb-4">
            <p className="text-texte-2">Pour ajouter un lieu, crée d’abord un voyage avec au moins une ville.</p>
            <button onClick={() => navigate('/')} className={styles.boutonPrincipal}>
              Aller à mes voyages
            </button>
          </div>
        ) : (
          <form onSubmit={enregistrer} className="space-y-7 pb-2">
            {/* Le lieu */}
            <div className="rounded-[26px] bg-fond p-4">
              {!idExistant && (
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-texte-2">{googlePlaceId ? 'Trouvé sur Google' : 'Saisie manuelle'}</p>
                  <button
                    type="button"
                    onClick={() => navigate(`/chercher${etapeId ? `?etape=${etapeId}` : ''}`, { replace: true })}
                    className="min-h-10 rounded-full border border-black/15 bg-white px-4 text-sm font-bold"
                  >
                    {googlePlaceId ? 'Changer' : 'Chercher sur Google'}
                  </button>
                </div>
              )}
              <div className="flex items-center gap-4">
                <div
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] font-kanji text-3xl text-white"
                  style={{ background: categorieActive.vif }}
                  aria-hidden="true"
                >
                  {kanji}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    id="nom-lieu"
                    aria-label="Nom du lieu"
                    placeholder="Nom du lieu *"
                    value={nom}
                    autoFocus={!idExistant}
                    onChange={(e) => setNom(e.target.value)}
                    className="min-h-12 w-full rounded-[16px] bg-white px-4 font-titre text-lg outline-none placeholder:font-sans placeholder:text-base placeholder:font-semibold placeholder:text-texte-2/70 focus:ring-2 focus:ring-encre"
                    maxLength={80}
                  />
                  <input
                    aria-label="Nom japonais"
                    placeholder="Nom japonais (facultatif)"
                    value={nomJa}
                    onChange={(e) => setNomJa(e.target.value)}
                    className="min-h-11 w-full rounded-[16px] bg-white px-4 text-sm outline-none placeholder:text-texte-2/70 focus:ring-2 focus:ring-encre"
                    maxLength={80}
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Catégorie">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={cat === c.id}
                    onClick={() => choisirCategorie(c.id)}
                    className="min-h-11 rounded-full px-4 text-sm font-semibold"
                    style={cat === c.id ? { background: c.vif, color: '#121212' } : { background: '#fff', color: c.fonce }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {categorieActive.types.length > 1 && (
                <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Type">
                  {categorieActive.types.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      role="radio"
                      aria-checked={type === t.id}
                      onClick={() => setType(t.id)}
                      className={`min-h-11 rounded-full px-4 text-sm font-semibold ${type === t.id ? 'bg-encre text-white' : 'bg-white text-encre'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Où et quand */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="etape" className={styles.label}>
                  Ville
                </label>
                <select id="etape" value={etapeId} onChange={(e) => setEtapeId(e.target.value)} className={`${styles.champ} pr-3`} required>
                  <option value="">Choisir…</option>
                  {etapesParVoyage.map(([voyage, liste]) => (
                    <optgroup key={voyage} label={voyage}>
                      {liste.map((et) => (
                        <option key={et.id} value={et.id}>
                          {et.city}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="quand" className={styles.label}>
                  Quand
                </label>
                <input id="quand" type="datetime-local" value={quand} onChange={(e) => setQuand(e.target.value)} className={`${styles.champ} px-3 text-sm`} />
              </div>
            </div>

            {/* Où sur la carte (facultatif) */}
            <div>
              <p className={styles.label}>Sur la carte</p>
              <ChoixPosition
                position={position}
                centreVille={centreVille}
                categorieId={cat}
                typeId={type}
                onChange={setPosition}
              />
            </div>

            {/* Combien tu as payé ? */}
            <div>
              <label htmlFor="prix" className={styles.label}>
                Combien tu as payé ?
              </label>
              <div className="flex min-h-[76px] items-center gap-3 rounded-[30px] border-[2.5px] border-encre px-5 focus-within:ring-2 focus-within:ring-encre/30">
                <span className="font-titre text-4xl text-texte-2/70" aria-hidden="true">
                  ¥
                </span>
                <input
                  id="prix"
                  inputMode="numeric"
                  placeholder={sommeArticles ? sommeArticles.toString() : '0'}
                  value={prix}
                  onChange={(e) => setPrix(e.target.value.replace(/\D/g, ''))}
                  className="min-w-0 flex-1 bg-transparent font-titre text-4xl outline-none placeholder:text-texte-2/40"
                />
                {euros !== null && (
                  <span className="shrink-0 rounded-full bg-manger-clair px-3 py-2 text-sm font-bold text-manger-fonce">
                    ≈ {euros.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-texte-2">Une dépense est créée automatiquement, au taux du jour de la visite.</p>
            </div>

            {/* Ce que j'ai pris */}
            <div>
              <p className={styles.label}>Ce que j’ai pris</p>
              <ul className="space-y-2">
                {articles.map((a, i) => (
                  <li key={a.id} className="flex gap-2">
                    <input
                      aria-label="Article"
                      placeholder="Ex. Shio ramen"
                      value={a.label}
                      onChange={(e) => modifierArticle(i, 'label', e.target.value)}
                      className={`${styles.champ} min-h-12 flex-1`}
                    />
                    <input
                      aria-label="Prix en yens"
                      inputMode="numeric"
                      placeholder="¥"
                      value={a.prix}
                      onChange={(e) => modifierArticle(i, 'prix', e.target.value)}
                      className={`${styles.champ} min-h-12 w-24 px-4 text-right`}
                    />
                    <button
                      type="button"
                      aria-label="Retirer"
                      onClick={() => setArticles(articles.filter((_, j) => j !== i))}
                      className="flex h-12 w-11 shrink-0 items-center justify-center rounded-full text-texte-2"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={ajouterArticle}
                className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-black/15 text-sm font-semibold text-texte-2"
              >
                <span className="text-lg leading-none">+</span> Ajouter ce que j’ai pris
              </button>
            </div>

            {/* Ta note */}
            <div>
              <div className="mb-3 flex items-end justify-between">
                <p className="text-[15px] font-semibold text-texte-2">Ta note</p>
                {note !== null && (
                  <p className="flex items-baseline gap-2">
                    <span className="font-semibold" style={{ color: categorieActive.fonce }}>
                      {libelleNote(note)}
                    </span>
                    <span className="font-titre text-3xl leading-none">{note.toLocaleString('fr-FR')}</span>
                    <span className="font-titre text-texte-2/60">/ 10</span>
                  </p>
                )}
              </div>
              <div className="grid grid-cols-10 gap-1.5" role="radiogroup" aria-label="Note sur 10">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
                  const choisi = note !== null && Math.round(note) === n
                  const dessous = note !== null && n < note
                  return (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={choisi}
                      onClick={() => setNote(choisi ? null : n)}
                      className="flex h-11 items-center justify-center rounded-[14px] text-[15px] font-bold"
                      style={
                        choisi
                          ? { background: '#121212', color: '#fff' }
                          : dessous
                            ? { background: categorieActive.vif, color: '#121212' }
                            : { background: '#F4F4F1', color: '#121212' }
                      }
                    >
                      {n}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* J'y retournerais */}
            <div className="flex items-center justify-between gap-2 rounded-[26px] bg-fond py-3 pl-4 pr-2">
              <p className="whitespace-nowrap font-semibold">J’y retournerais</p>
              <div className="flex gap-1 rounded-full bg-white p-1" role="radiogroup" aria-label="J'y retournerais">
                {(['oui', 'bof', 'non'] as Retour[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={retour === r}
                    onClick={() => setRetour(retour === r ? null : r)}
                    className={`min-h-11 rounded-full px-3 text-sm font-semibold capitalize ${retour === r ? 'bg-encre text-white' : 'text-texte-2'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Note perso */}
            <div>
              <label htmlFor="note-perso" className={styles.label}>
                Note perso
              </label>
              <textarea
                id="note-perso"
                rows={3}
                placeholder="Ce que je veux retenir…"
                value={notePerso}
                onChange={(e) => setNotePerso(e.target.value)}
                className="w-full rounded-[22px] bg-fond px-5 py-4 text-base outline-none focus:ring-2 focus:ring-encre"
              />
            </div>

            {erreur && <p className="rounded-[18px] bg-manger-clair p-3 text-sm font-semibold text-manger-fonce">{erreur}</p>}

            <div className="space-y-2">
              <button type="submit" disabled={enCours} className={styles.boutonPrincipal}>
                {enCours ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              {idExistant && (
                <button type="button" onClick={supprimer} disabled={enCours} className={styles.boutonDiscret}>
                  Supprimer ce lieu
                </button>
              )}
            </div>
          </form>
        )}
      </Feuille>
    </main>
  )
}

/** L'étape du jour si un voyage est en cours, sinon la plus récente. */
function etapeParDefaut(liste: EtapeChoix[]) {
  const jour = aujourdhui()
  return (
    liste.find((e) => e.arrival_date && e.arrival_date <= jour && (!e.departure_date || e.departure_date >= jour)) ??
    liste[0]
  )
}

function versLocal(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

const maintenantLocal = () => versLocal(new Date())
