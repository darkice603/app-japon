import { useEffect, useState } from 'react'
import { lireTaches, surChangement, synchroniser } from '../lib/attente'

/**
 * Petit bandeau en haut de l'écran : « Hors ligne », « 2 en attente d'envoi »,
 * puis « Tout est envoyé ». Lance la synchro au démarrage et au retour du réseau.
 */
export default function BandeauReseau() {
  const [enLigne, setEnLigne] = useState(navigator.onLine)
  const [attente, setAttente] = useState(0)
  const [envoye, setEnvoye] = useState(false)

  useEffect(() => {
    let actif = true
    const compter = () => lireTaches().then((l) => actif && setAttente(l.length))

    const synchro = async () => {
      const avant = (await lireTaches()).length
      if (!avant || !navigator.onLine) return
      const reste = await synchroniser()
      if (!actif) return
      setAttente(reste)
      if (reste < avant) {
        // Prévenir les écrans ouverts qu'ils peuvent recharger leurs données
        window.dispatchEvent(new Event('japon:synchro'))
        if (reste === 0) {
          setEnvoye(true)
          setTimeout(() => actif && setEnvoye(false), 3000)
        }
      }
    }

    const enLigneMaintenant = () => {
      setEnLigne(true)
      synchro()
    }
    const horsLigne = () => setEnLigne(false)
    const auRetour = () => document.visibilityState === 'visible' && synchro()

    compter()
    synchro()
    window.addEventListener('online', enLigneMaintenant)
    window.addEventListener('offline', horsLigne)
    document.addEventListener('visibilitychange', auRetour)
    const arreter = surChangement(compter)
    return () => {
      actif = false
      window.removeEventListener('online', enLigneMaintenant)
      window.removeEventListener('offline', horsLigne)
      document.removeEventListener('visibilitychange', auRetour)
      arreter()
    }
  }, [])

  let texte: string | null = null
  if (!enLigne) texte = attente ? `Hors ligne · ${attente} en attente d’envoi` : 'Hors ligne · tu peux quand même ajouter des lieux'
  else if (attente) texte = `Envoi de ${attente} élément${attente > 1 ? 's' : ''}…`
  else if (envoye) texte = 'Tout est envoyé ✓'
  if (!texte) return null

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 top-[max(env(safe-area-inset-top),8px)] z-[90] flex justify-center px-4"
    >
      <span className={`rounded-full px-4 py-2 text-sm font-semibold shadow-lg ${enLigne ? 'bg-encre text-white' : 'bg-cafe-clair text-cafe-fonce'}`}>
        {texte}
      </span>
    </div>
  )
}
