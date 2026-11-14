import { get, set } from 'idb-keyval'
import { supabase, BUCKET_PHOTOS } from './supabase'
import { tauxJpyEur } from './change'
import type { CategorieDepense } from './categories'

/**
 * File d'attente hors ligne (« façon Polarsteps ») : un lieu ou une dépense ajouté sans réseau
 * est gardé sur l'appareil (IndexedDB, photos comprises) puis envoyé au retour du réseau.
 * Les identifiants sont fabriqués par l'app : renvoyer deux fois la même tâche ne crée pas de doublon.
 */

type DepenseAttente = {
  id: string
  trip_id: string
  place_id: string | null
  label: string | null
  amount_jpy: number
  category: CategorieDepense
  spent_on: string
}

export type Tache =
  | {
      id: string
      type: 'lieu'
      cree: string
      nom: string
      userId: string
      place: Record<string, unknown> & { id: string }
      articles: { id: string; place_id: string; label: string; price_jpy: number | null; position: number }[]
      depense: DepenseAttente | null
      photos: { id: string; fichier: Blob; date: string | null; lat: number | null; lng: number | null }[]
    }
  | { id: string; type: 'depense'; cree: string; nom: string; depense: DepenseAttente }

const CLE = 'japon:attente'
const EVENEMENT = 'japon:attente'

export const lireTaches = async (): Promise<Tache[]> => (await get<Tache[]>(CLE)) ?? []

export async function ajouterTache(t: Tache) {
  const liste = await lireTaches()
  await set(CLE, [...liste.filter((x) => x.id !== t.id), t])
  window.dispatchEvent(new Event(EVENEMENT))
}

async function retirerTache(id: string) {
  await set(
    CLE,
    (await lireTaches()).filter((t) => t.id !== id),
  )
  window.dispatchEvent(new Event(EVENEMENT))
}

/** Prévenu à chaque changement de la file. */
export function surChangement(rappel: () => void) {
  window.addEventListener(EVENEMENT, rappel)
  return () => window.removeEventListener(EVENEMENT, rappel)
}

/** Une erreur due à l'absence de réseau (et pas à une donnée refusée) ? */
export function erreurReseau(message: string | undefined) {
  return !navigator.onLine || /failed to fetch|network|load failed|fetch/i.test(message ?? '')
}

async function verifier<T extends { error: { message: string } | null }>(p: PromiseLike<T>) {
  const r = await p
  if (r.error) throw new Error(r.error.message)
  return r
}

async function envoyerDepense(d: DepenseAttente) {
  const taux = await tauxJpyEur(d.spent_on).catch(() => null)
  await verifier(
    supabase.from('expenses').upsert({ ...d, rate: taux, amount_eur: taux ? Math.round(d.amount_jpy * taux * 100) / 100 : null }),
  )
}

async function envoyerTache(t: Tache) {
  if (t.type === 'depense') return envoyerDepense(t.depense)
  await verifier(supabase.from('places').upsert(t.place))
  if (t.articles.length) await verifier(supabase.from('place_items').upsert(t.articles))
  if (t.depense) await envoyerDepense(t.depense)
  for (const p of t.photos) {
    const chemin = `${t.userId}/${t.place.id}/${p.id}.jpg`
    const envoi = await supabase.storage.from(BUCKET_PHOTOS).upload(chemin, p.fichier, { contentType: 'image/jpeg', upsert: true })
    if (envoi.error) throw new Error(envoi.error.message)
    await verifier(
      supabase.from('photos').upsert({ id: p.id, storage_path: chemin, place_id: t.place.id, taken_at: p.date, lat: p.lat, lng: p.lng }),
    )
  }
}

let enCours = false

/** Envoie tout ce qui attend. Renvoie le nombre de tâches encore en attente. */
export async function synchroniser(): Promise<number> {
  if (enCours || !navigator.onLine) return (await lireTaches()).length
  enCours = true
  try {
    for (const t of await lireTaches()) {
      try {
        await envoyerTache(t)
        await retirerTache(t.id)
      } catch (e) {
        // Toujours pas de réseau : on réessaiera plus tard. Autre erreur : on garde la tâche aussi.
        console.warn('Synchro reportée :', t.nom, (e as Error).message)
        if (erreurReseau((e as Error).message)) break
      }
    }
  } finally {
    enCours = false
  }
  return (await lireTaches()).length
}
