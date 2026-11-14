import { createClient } from '@supabase/supabase-js'

// On accepte aussi l'adresse copiée avec « /rest/v1/ » à la fin : on la retire.
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

/** true si .env.local est rempli. */
export const supabaseConfigure = Boolean(url && key)

if (!supabaseConfigure) {
  console.warn('Supabase non configuré : remplir .env.local (voir .env.example).')
}

/**
 * Client Supabase de l'app. Toutes les requêtes vont dans le schéma « japon »
 * (jamais dans « public », qui appartient à l'autre app).
 */
export const supabase = createClient(url ?? 'http://localhost', key ?? 'manquante', {
  db: { schema: 'japon' },
})

/** Espace photos dédié à l'app (le bucket « photos » appartient à l'autre app). */
export const BUCKET_PHOTOS = 'japon-photos'
