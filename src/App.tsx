import { Route, Routes } from 'react-router-dom'
import NavFlottante from './components/NavFlottante'
import EcranVide from './screens/EcranVide'

const ecrans = [
  { path: '/', code: 'B1', titre: 'Mes voyages' },
  { path: '/carte', code: 'B2', titre: 'Carte' },
  { path: '/chercher', code: 'B3', titre: 'Chercher un lieu' },
  { path: '/ajouter', code: 'B4', titre: 'Ajouter un lieu' },
  { path: '/lieu/:id', code: 'B5', titre: 'Fiche lieu' },
  { path: '/restos', code: 'B6', titre: 'Mes restos' },
  { path: '/ville/:id', code: 'B7', titre: 'Ville' },
  { path: '/budget', code: 'B8', titre: 'Budget' },
  { path: '/prefectures', code: 'B9', titre: 'Préfectures' },
]

export default function App() {
  return (
    <>
      <Routes>
        {ecrans.map((e) => (
          <Route key={e.path} path={e.path} element={<EcranVide code={e.code} titre={e.titre} />} />
        ))}
        <Route path="*" element={<EcranVide code="404" titre="Page introuvable" />} />
      </Routes>
      <NavFlottante />
    </>
  )
}
