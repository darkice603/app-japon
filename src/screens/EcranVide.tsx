import { Link } from 'react-router-dom'

const liens = [
  ['/chercher', 'B3 Chercher'], ['/ajouter', 'B4 Ajouter'], ['/lieu/demo', 'B5 Fiche lieu'],
  ['/restos', 'B6 Mes restos'], ['/ville/demo', 'B7 Ville'], ['/prefectures', 'B9 Préfectures'],
]

/** Écran provisoire (étape 1) : titre + liens vers les écrans hors navigation. */
export default function EcranVide({ code, titre }: { code: string; titre: string }) {
  return (
    <main className="mx-auto max-w-md px-5 pt-[max(env(safe-area-inset-top),24px)] pb-32">
      <p className="text-sm font-semibold text-texte-2">{code}</p>
      <h1 className="font-titre text-4xl leading-tight">{titre}</h1>
      <div className="mt-6 rounded-carte bg-carte p-5 shadow-sm">
        <p className="text-texte-2">Écran à venir.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {liens.map(([to, label]) => (
            <Link key={to} to={to} className="flex min-h-11 items-center rounded-full bg-fond px-4 text-sm font-semibold text-encre">
              {label}
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
