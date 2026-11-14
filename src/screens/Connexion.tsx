import { useEffect, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, supabaseConfigure } from '../lib/supabase'

/**
 * Écran provisoire (étape 2) : connexion par code reçu par e-mail
 * (comme dans l'autre app), puis test de lecture dans le schéma « japon ».
 */
export default function Connexion() {
  const [session, setSession] = useState<Session | null>(null)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [codeEnvoye, setCodeEnvoye] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  const [test, setTest] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return setTest(null)
    supabase
      .from('prefectures')
      .select('code', { count: 'exact', head: true })
      .then(({ count, error }) =>
        setTest(error ? `Erreur : ${error.message}` : `${count} préfectures lues dans le schéma japon`),
      )
  }, [session])

  async function envoyerCode(e: FormEvent) {
    e.preventDefault()
    setEnCours(true)
    setErreur(null)
    // shouldCreateUser: false → on se connecte seulement à un compte existant
    // (pas de création de compte depuis cette app pour l'instant).
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
    else setCode('')
  }

  const champ = 'min-h-14 w-full rounded-full bg-fond px-5 text-base text-encre outline-none focus:ring-2 focus:ring-encre'
  const bouton = 'min-h-14 w-full rounded-full bg-encre font-semibold text-white disabled:opacity-50'

  return (
    <main className="mx-auto max-w-md px-5 pt-[max(env(safe-area-inset-top),24px)] pb-32">
      <p className="text-sm font-semibold text-texte-2">Étape 2</p>
      <h1 className="font-titre text-4xl leading-tight">Connexion</h1>

      <div className="mt-6 rounded-carte bg-carte p-5 shadow-sm">
        {!supabaseConfigure ? (
          <p className="text-texte-2">Supabase n'est pas encore branché : remplir le fichier .env.local.</p>
        ) : session ? (
          <div className="space-y-4">
            <p>
              Connecté avec <strong>{session.user.email}</strong>
            </p>
            <p className="text-texte-2">{test ?? 'Test de lecture…'}</p>
            <button
              onClick={() => {
                supabase.auth.signOut()
                setCodeEnvoye(false)
              }}
              className="min-h-14 w-full rounded-full bg-fond font-semibold text-encre"
            >
              Se déconnecter
            </button>
          </div>
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
            {erreur && <p className="text-sm font-semibold text-[#C25E14]">{erreur}</p>}
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
            {erreur && <p className="text-sm font-semibold text-[#C25E14]">{erreur}</p>}
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
  if (/signups not allowed|user not found/i.test(message)) return "Aucun compte avec cet e-mail."
  if (/expired|invalid/i.test(message)) return 'Code incorrect ou expiré.'
  if (/rate limit|security purposes/i.test(message)) return 'Trop de demandes : patiente une minute avant de redemander un code.'
  return message
}
