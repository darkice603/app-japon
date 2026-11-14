import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import { useAuth } from './auth'

type Etat = {
  prenom: string | null
  chargement: boolean
  /** Message si la table profils est introuvable ou inaccessible. */
  erreur: string | null
  enregistrerPrenom: (prenom: string) => Promise<string | null>
}

const ProfilContext = createContext<Etat>({
  prenom: null,
  chargement: true,
  erreur: null,
  enregistrerPrenom: async () => null,
})

/** Charge le prénom (table japon.profils) de la personne connectée. */
export function ProfilProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user.id
  const [prenom, setPrenom] = useState<string | null>(null)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    setPrenom(null)
    setErreur(null)
    if (!userId) return
    setChargement(true)
    supabase
      .from('profils')
      .select('prenom')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setErreur(error.message)
        else setPrenom(data?.prenom ?? null)
        setChargement(false)
      })
  }, [userId])

  const enregistrerPrenom = useCallback(
    async (nouveau: string) => {
      const { error } = await supabase.from('profils').upsert({ user_id: userId, prenom: nouveau.trim() })
      if (error) return error.message
      setPrenom(nouveau.trim())
      return null
    },
    [userId],
  )

  return (
    <ProfilContext.Provider value={{ prenom, chargement, erreur, enregistrerPrenom }}>{children}</ProfilContext.Provider>
  )
}

export const useProfil = () => useContext(ProfilContext)
