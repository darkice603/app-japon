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
