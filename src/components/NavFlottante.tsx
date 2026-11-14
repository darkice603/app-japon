import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

const icones: Record<string, ReactNode> = {
  voyages: <path d="M4 7h16v12H4zM9 7V5h6v2" />,
  carte: <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zm0 0v14m6-12v14" />,
  budget: <path d="M12 3v18M17 7H9.5a3 3 0 0 0 0 6h5a3 3 0 0 1 0 6H6" />,
  japon: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></>,
}

function Icone({ nom }: { nom: string }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {icones[nom]}
    </svg>
  )
}

const onglet = ({ isActive }: { isActive: boolean }) =>
  `flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
    isActive ? 'bg-encre text-white' : 'text-encre'
  }`

/** Navigation flottante en pilule blanche : onglet actif noir, bouton + orange. */
export default function NavFlottante() {
  return (
    <nav aria-label="Navigation principale" className="fixed inset-x-0 bottom-[max(env(safe-area-inset-bottom),16px)] z-50 flex justify-center px-4">
      <div className="flex items-center gap-1 rounded-full bg-carte p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
        <NavLink to="/" end className={onglet} aria-label="Voyages"><Icone nom="voyages" /></NavLink>
        <NavLink to="/carte" className={onglet} aria-label="Carte"><Icone nom="carte" /></NavLink>
        <NavLink to="/chercher" aria-label="Ajouter un lieu" className="flex h-12 w-12 items-center justify-center rounded-full bg-manger text-white">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        </NavLink>
        <NavLink to="/budget" className={onglet} aria-label="Budget"><Icone nom="budget" /></NavLink>
        <NavLink to="/prefectures" className={onglet} aria-label="Préfectures"><Icone nom="japon" /></NavLink>
      </div>
    </nav>
  )
}
