import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

type Etat = { session: Session | null; chargement: boolean }

const AuthContext = createContext<Etat>({ session: null, chargement: true })

/** Garde la session Supabase à jour pour toute l'app. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [etat, setEtat] = useState<Etat>({ session: null, chargement: true })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setEtat({ session: data.session, chargement: false }))
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setEtat({ session, chargement: false }))
    return () => data.subscription.unsubscribe()
  }, [])

  return <AuthContext.Provider value={etat}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

/**
 * Déconnexion : on vide aussi les données gardées pour le hors ligne,
 * pour qu'une autre personne connectée sur cet appareil ne les voie pas.
 */
export async function deconnexion() {
  const { lireTaches } = await import('./attente')
  const enAttente = (await lireTaches()).length
  if (enAttente && !window.confirm(`${enAttente} élément(s) n'ont pas encore été envoyés et seront perdus. Se déconnecter quand même ?`)) return
  if (enAttente) {
    const { del } = await import('idb-keyval')
    await del('japon:attente')
  }
  try {
    for (const nom of ['japon-donnees', 'japon-unsplash']) await caches.delete(nom)
  } catch {
    /* pas de cache */
  }
  await supabase.auth.signOut()
}
