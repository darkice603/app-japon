import { useState, type FormEvent } from 'react'
import { useProfil } from '../lib/profil'

/** Premier lancement : on demande le prénom affiché sur B1 (« Salut Anthony »). */
export default function Prenom() {
  const { enregistrerPrenom } = useProfil()
  const [prenom, setPrenom] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  async function valider(e: FormEvent) {
    e.preventDefault()
    setEnCours(true)
    const err = await enregistrerPrenom(prenom)
    setEnCours(false)
    setErreur(err)
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-5 py-10">
      <h1 className="font-titre text-4xl leading-tight">Bienvenue !</h1>
      <p className="mt-1 text-texte-2">Comment tu t'appelles ?</p>
      <form onSubmit={valider} className="mt-6 space-y-3 rounded-carte bg-carte p-5 shadow-sm">
        <input
          autoFocus
          autoComplete="given-name"
          placeholder="Prénom"
          maxLength={40}
          value={prenom}
          onChange={(e) => setPrenom(e.target.value)}
          className="min-h-14 w-full rounded-full bg-fond px-5 text-base text-encre outline-none focus:ring-2 focus:ring-encre"
          required
        />
        {erreur && <p className="text-sm font-semibold text-manger-fonce">{erreur}</p>}
        <button
          type="submit"
          disabled={enCours || !prenom.trim()}
          className="min-h-14 w-full rounded-full bg-encre font-semibold text-white disabled:opacity-50"
        >
          {enCours ? 'Enregistrement…' : 'Continuer'}
        </button>
      </form>
    </main>
  )
}
