import type { ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'

const icones: Record<string, ReactNode> = {
  voyages: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z" /></>,
  carte: <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zm0 0v14m6-12v14" />,
  restos: <path d="M7 3v7a2 2 0 0 0 2 2M11 3v7a2 2 0 0 1-2 2m0 0v9M17 21V3c-2 1.5-3 4-3 7s1 4 3 4" />,
  budget: <path d="M6 20v-6M12 20V8M18 20v-9" />,
}

function Icone({ nom }: { nom: string }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {icones[nom]}
    </svg>
  )
}

const onglets = [
  { to: '/', nom: 'voyages', label: 'Voyages' },
  { to: '/carte', nom: 'carte', label: 'Carte' },
  null, // emplacement du bouton +
  { to: '/restos', nom: 'restos', label: 'Restos' },
  { to: '/budget', nom: 'budget', label: 'Budget' },
]

/** Navigation flottante (B1) : pilule blanche, onglet actif noir avec libellé, bouton + orange. */
export default function NavFlottante() {
  const { pathname } = useLocation()
  // L'onglet Voyages reste actif sur la page d'un voyage
  const actif = (isActive: boolean, to: string) => isActive || (to === '/' && pathname.startsWith('/voyage/'))
  return (
    <nav aria-label="Navigation principale" className="fixed inset-x-0 bottom-[max(env(safe-area-inset-bottom),16px)] z-50 flex justify-center px-4">
      <div className="flex items-center gap-1 rounded-full bg-carte p-2 shadow-[0_10px_40px_rgba(0,0,0,0.10)]">
        {onglets.map((o) =>
          o === null ? (
            <NavLink key="plus" to="/ajouter" aria-label="Ajouter un lieu" className="mx-1 flex h-12 w-12 items-center justify-center rounded-full bg-manger text-encre">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            </NavLink>
          ) : (
            <NavLink
              key={o.to}
              to={o.to}
              end={o.to === '/'}
              aria-label={o.label}
              className={({ isActive }) =>
                `flex h-12 items-center justify-center gap-2 rounded-full transition-all ${
                  actif(isActive, o.to) ? 'bg-encre px-5 text-white' : 'w-12 text-encre/70'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icone nom={o.nom} />
                  {actif(isActive, o.to) && <span className="text-[15px] font-bold">{o.label}</span>}
                </>
              )}
            </NavLink>
          ),
        )}
      </div>
    </nav>
  )
}
