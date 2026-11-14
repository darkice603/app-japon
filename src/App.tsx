import { Route, Routes } from 'react-router-dom'
import NavFlottante from './components/NavFlottante'
import EcranVide from './screens/EcranVide'
import Connexion from './screens/Connexion'
import Prenom from './screens/Prenom'
import MesVoyages from './screens/MesVoyages'
import AjouterLieu from './screens/AjouterLieu'
import { useAuth } from './lib/auth'
import { useProfil } from './lib/profil'

const ecrans = [
  { path: '/carte', code: 'B2', titre: 'Carte' },
  { path: '/chercher', code: 'B3', titre: 'Chercher un lieu' },
  { path: '/lieu/:id', code: 'B5', titre: 'Fiche lieu' },
  { path: '/restos', code: 'B6', titre: 'Mes restos' },
  { path: '/ville/:id', code: 'B7', titre: 'Ville' },
  { path: '/budget', code: 'B8', titre: 'Budget' },
  { path: '/prefectures', code: 'B9', titre: 'Préfectures' },
]

export default function App() {
  const { session, chargement } = useAuth()
  const profil = useProfil()

  if (chargement) return <Attente />
  if (!session) return <Connexion />
  if (profil.chargement) return <Attente />
  if (profil.erreur) return <ErreurProfil message={profil.erreur} />
  if (!profil.prenom) return <Prenom />

  return (
    <>
      <Routes>
        <Route path="/" element={<MesVoyages />} />
        <Route path="/ajouter" element={<AjouterLieu />} />
        <Route path="/lieu/:id/modifier" element={<AjouterLieu />} />
        {ecrans.map((e) => (
          <Route key={e.path} path={e.path} element={<EcranVide code={e.code} titre={e.titre} />} />
        ))}
        <Route path="*" element={<EcranVide code="404" titre="Page introuvable" />} />
      </Routes>
      <NavFlottante />
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
