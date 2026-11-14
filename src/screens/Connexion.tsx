import { useState, type FormEvent } from 'react'
import { supabase, supabaseConfigure } from '../lib/supabase'

/** Porte d'entrée : connexion par code reçu par e-mail (comme dans l'autre app). */
export default function Connexion() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [codeEnvoye, setCodeEnvoye] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  async function envoyerCode(e: FormEvent) {
    e.preventDefault()
    setEnCours(true)
    setErreur(null)
    // shouldCreateUser: false → connexion à un compte existant uniquement.
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })
    setEnCours(false)
    if (error) setErreur(traduire(error.message))
    else setCodeEnvoye(true)
  }

  async function verifierCode(e: FormEvent) {
    e.preventDefault()
    setEnCours(true)
    setErreur(null)
    const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'email' })
    setEnCours(false)
    if (error) setErreur(traduire(error.message))
  }

  const champ = 'min-h-14 w-full rounded-full bg-fond px-5 text-base text-encre outline-none focus:ring-2 focus:ring-encre'
  const bouton = 'min-h-14 w-full rounded-full bg-encre font-semibold text-white disabled:opacity-50'

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-5 py-10">
      <img src="/icon.svg" alt="" className="h-20 w-20 rounded-[22px] bg-carte shadow-sm ring-1 ring-black/10" />
      <h1 className="mt-4 font-titre text-5xl leading-none tracking-tight">Tabi</h1>
      <p className="mt-2 text-texte-2">Ton carnet de voyage au Japon. Connecte-toi avec le code reçu par e-mail.</p>

      <div className="mt-6 rounded-carte bg-carte p-5 shadow-sm">
        {!supabaseConfigure ? (
          <p className="text-texte-2">Supabase n'est pas encore branché : remplir le fichier .env.local.</p>
        ) : !codeEnvoye ? (
          <form onSubmit={envoyerCode} className="space-y-3">
            <input
              type="email"
              autoComplete="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={champ}
              required
            />
            {erreur && <p className="text-sm font-semibold text-manger-fonce">{erreur}</p>}
            <button type="submit" disabled={enCours} className={bouton}>
              {enCours ? 'Envoi…' : 'Recevoir un code'}
            </button>
          </form>
        ) : (
          <form onSubmit={verifierCode} className="space-y-3">
            <p className="text-texte-2">
              Code envoyé à <strong className="text-encre">{email}</strong>. Regarde tes e-mails (et les spams).
            </p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Code reçu"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              maxLength={10}
              className={`${champ} text-center font-titre text-2xl tracking-[0.3em]`}
              required
            />
            {erreur && <p className="text-sm font-semibold text-manger-fonce">{erreur}</p>}
            <button type="submit" disabled={enCours || code.length < 6} className={bouton}>
              {enCours ? 'Vérification…' : 'Valider'}
            </button>
            <button
              type="button"
              onClick={() => {
                setCodeEnvoye(false)
                setErreur(null)
                setCode('')
              }}
              className="min-h-11 w-full text-sm font-semibold text-texte-2"
            >
              Changer d'e-mail
            </button>
          </form>
        )}
      </div>
    </main>
  )
}

function traduire(message: string) {
  if (/signups not allowed|user not found/i.test(message)) return 'Aucun compte avec cet e-mail.'
  if (/expired|invalid/i.test(message)) return 'Code incorrect ou expiré.'
  if (/rate limit|security purposes/i.test(message)) return 'Trop de demandes : patiente une minute avant de redemander un code.'
  return message
}
