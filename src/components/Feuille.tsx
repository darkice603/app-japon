import { useEffect, useRef, type ReactNode } from 'react'

/**
 * Feuille qui monte du bas (style B4) : poignée, grand titre, bouton fermer rond.
 * Le contenu défile si la feuille est plus haute que l'écran.
 */
export default function Feuille({
  titre,
  onFermer,
  children,
  niveau = 0,
}: {
  titre: string
  onFermer: () => void
  children: ReactNode
  /** 1 pour une feuille ouverte par-dessus une autre. */
  niveau?: number
}) {
  const fermer = useRef(onFermer)
  fermer.current = onFermer

  useEffect(() => {
    const touche = (e: KeyboardEvent) => e.key === 'Escape' && fermer.current()
    window.addEventListener('keydown', touche)
    const ancien = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', touche)
      document.body.style.overflow = ancien
    }
  }, [])

  return (
    <div className="fixed inset-0 flex items-end justify-center" style={{ zIndex: 60 + niveau * 10 }}>
      <div className="absolute inset-0 bg-black/45" onClick={onFermer} aria-hidden="true" />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={titre}
        className="relative max-h-[92svh] w-full max-w-md overflow-y-auto rounded-t-feuille bg-carte px-5 pb-[max(env(safe-area-inset-bottom),24px)]"
      >
        <div className="sticky top-0 z-10 bg-carte pt-3 pb-4">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-black/15" />
          <div className="mt-4 flex items-center justify-between gap-4">
            <h2 className="font-titre text-[30px] leading-tight tracking-tight">{titre}</h2>
            <button
              onClick={onFermer}
              aria-label="Fermer"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-fond"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        </div>
        {children}
      </section>
    </div>
  )
}

/** Styles partagés des formulaires (style B4). */
export const styles = {
  label: 'mb-2 block text-[15px] font-semibold text-texte-2',
  champ:
    'min-h-14 w-full rounded-[22px] bg-fond px-5 text-base text-encre outline-none focus:ring-2 focus:ring-encre appearance-none',
  boutonPrincipal: 'min-h-14 w-full rounded-full bg-encre text-lg font-bold text-white disabled:opacity-50',
  boutonDiscret: 'min-h-11 w-full rounded-full text-sm font-semibold text-manger-fonce',
}
