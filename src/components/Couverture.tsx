import type { ReactNode } from 'react'
import { categorie, typeDe, type CategorieId } from '../lib/categories'

/**
 * Couverture générée (image de secours n°4) : fond clair de la catégorie,
 * motif propre à la catégorie et grand kanji du type.
 */
export default function Couverture({
  categorieId,
  typeId,
  taille = 'grande',
  className = '',
}: {
  categorieId: string
  typeId: string | null
  taille?: 'grande' | 'petite'
  className?: string
}) {
  const c = categorie(categorieId)
  const t = typeDe(categorieId, typeId)
  const motifId = `motif-${c.id}-${taille}`
  const grande = taille === 'grande'

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: c.clair }} aria-hidden="true">
      <svg className="absolute inset-0 h-full w-full">
        <defs>
          <Motif id={motifId} categorie={c.id} couleur={c.vif} echelle={grande ? 1 : 0.5} />
        </defs>
        <rect width="100%" height="100%" fill={`url(#${motifId})`} />
      </svg>
      <span
        className={`absolute font-kanji leading-none ${grande ? '-bottom-[0.14em] -right-[0.06em] text-[270px]' : 'inset-0 flex items-center justify-center text-[30px]'}`}
        style={{ color: c.vif }}
      >
        {t.kanji}
      </span>
      {grande && (
        <span className="absolute bottom-8 left-5 text-sm font-bold uppercase tracking-[0.12em]" style={{ color: c.fonce }}>
          {t.lecture}
        </span>
      )}
    </div>
  )
}

/** Motifs : nouilles, grains, futon, seigaiha, rails, ichimatsu. */
function Motif({ id, categorie, couleur, echelle }: { id: string; categorie: CategorieId; couleur: string; echelle: number }) {
  const trait = { fill: 'none', stroke: couleur, strokeOpacity: 0.35, strokeWidth: 4, strokeLinecap: 'round' as const }
  const plein = { fill: couleur, fillOpacity: 0.3 }
  const s = (n: number) => n * echelle
  const motifs: Record<CategorieId, { l: number; h: number; dessin: ReactNode }> = {
    // Nouilles : vagues
    manger: { l: 60, h: 24, dessin: <path d="M0 12 q15 -12 30 0 t30 0" {...trait} /> },
    // Grains de café
    cafe: { l: 40, h: 40, dessin: <><ellipse cx="10" cy="10" rx="6" ry="4" {...plein} /><ellipse cx="30" cy="30" rx="6" ry="4" {...plein} /></> },
    // Futon : rayures
    dormir: { l: 48, h: 32, dessin: <><rect x="4" y="6" width="40" height="8" rx="4" {...plein} /><rect x="-20" y="22" width="40" height="8" rx="4" {...plein} /><rect x="28" y="22" width="40" height="8" rx="4" {...plein} /></> },
    // Seigaiha : vagues en écailles
    visiter: {
      l: 40, h: 20,
      dessin: <>{[18, 12, 6].map((r) => <g key={r}><path d={`M${20 - r} 20 a${r} ${r} 0 0 1 ${2 * r} 0`} {...trait} strokeWidth={2.5} /><path d={`M${-r} 10 a${r} ${r} 0 0 1 ${2 * r} 0`} {...trait} strokeWidth={2.5} /><path d={`M${40 - r} 10 a${r} ${r} 0 0 1 ${2 * r} 0`} {...trait} strokeWidth={2.5} /></g>)}</>,
    },
    // Rails : deux lignes et des traverses
    transport: { l: 24, h: 40, dessin: <><path d="M0 12h24M0 28h24" {...trait} strokeWidth={3} /><path d="M12 6v28" {...trait} strokeWidth={5} /></> },
    // Ichimatsu : damier
    shopping: { l: 40, h: 40, dessin: <><rect width="20" height="20" {...plein} /><rect x="20" y="20" width="20" height="20" {...plein} /></> },
  }
  const m = motifs[categorie]
  return (
    <pattern id={id} width={s(m.l)} height={s(m.h)} patternUnits="userSpaceOnUse">
      <g transform={`scale(${echelle})`}>{m.dessin}</g>
    </pattern>
  )
}
