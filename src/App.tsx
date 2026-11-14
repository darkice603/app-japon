import { lazy, Suspense } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import NavFlottante from './components/NavFlottante'
import BandeauReseau from './components/BandeauReseau'
import Connexion from './screens/Connexion'
import Prenom from './screens/Prenom'
import MesVoyages from './screens/MesVoyages'
import { useAuth } from './lib/auth'
import { useProfil } from './lib/profil'

// Écrans chargés à la demande
const Restos = lazy(() => import('./screens/Restos'))
const Prefectures = lazy(() => import('./screens/Prefectures'))
const AjouterLieu = lazy(() => import('./screens/AjouterLieu'))
const FicheLieu = lazy(() => import('./screens/FicheLieu'))
const Voyage = lazy(() => import('./screens/Voyage'))
const Carte = lazy(() => import('./screens/Carte'))
const Chercher = lazy(() => import('./screens/Chercher'))
const BudgetEcran = lazy(() => import('./screens/Budget'))
const Ville = lazy(() => import('./screens/Ville'))

export default function App() {
  const { session, chargement } = useAuth()
  const profil = useProfil()
  const { pathname } = useLocation()

  if (chargement) return <Attente />
  if (!session) return <Connexion />
  if (profil.chargement) return <Attente />
  if (profil.erreur) return <ErreurProfil message={profil.erreur} />
  if (!profil.prenom) return <Prenom />

  return (
    <>
      {/* Chaque écran est chargé quand on l’ouvre (premier lancement plus rapide) */}
      <Suspense fallback={<Attente />}>
      <Routes>
        <Route path="/" element={<MesVoyages />} />
        <Route path="/ajouter" element={<AjouterLieu />} />
        <Route path="/lieu/:id/modifier" element={<AjouterLieu />} />
        <Route path="/lieu/:id" element={<FicheLieu />} />
        <Route path="/voyage/:id" element={<Voyage />} />
        <Route path="/carte" element={<Carte />} />
        <Route path="/chercher" element={<Chercher />} />
        <Route path="/budget" element={<BudgetEcran />} />
        <Route path="/ville/:id" element={<Ville />} />
        <Route path="/restos" element={<Restos />} />
        <Route path="/prefectures" element={<Prefectures />} />
        <Route path="*" element={<Introuvable />} />
      </Routes>
      </Suspense>
      {/* Pas de navigation sur la fiche lieu ni sur B4 (comme sur les maquettes) */}
      {!/^\/(lieu|ajouter|chercher|prefectures)/.test(pathname) && <NavFlottante />}
      <BandeauReseau />
    </>
  )
}

function Attente() {
  return (
    <main className="flex min-h-svh items-center justify-center">
      <p className="font-kanji text-5xl text-texte-2/40">旅</p>
    </main>
  )
}

function ErreurProfil({ message }: { message: string }) {
  const tableManquante = /profils|schema cache|does not exist/i.test(message)
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-5">
      <div className="rounded-carte bg-manger-clair p-5 text-manger-fonce">
        <p className="font-titre text-xl">Oups</p>
        <p className="mt-1 text-sm">
          {tableManquante ? 'La table « profils » n’existe pas encore : lance le script 002_profils.sql dans Supabase.' : message}
        </p>
      </div>
    </main>
  )
}

function Introuvable() {
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center px-5 text-center">
      <p className="font-kanji text-5xl text-texte-2/40">迷</p>
      <h1 className="mt-3 font-titre text-3xl">Page introuvable</h1>
      <Link to="/" className="mt-6 flex min-h-14 items-center rounded-full bg-encre px-8 font-bold text-white">
        Retour à mes voyages
      </Link>
    </main>
  )
}
