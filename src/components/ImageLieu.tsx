import { useEffect, useState } from 'react'
import Couverture from './Couverture'
import { photosDuLieu, type PhotoEnregistree } from '../lib/photos'
import { photoBanque, photosGoogle, urlPhotoGoogle } from '../lib/google'

/** Mots-clés Unsplash (en anglais) par type de lieu, si la ville ne donne rien. */
const MOTS_TYPE: Record<string, string> = {
  ramen: 'ramen',
  izakaya: 'izakaya',
  sushi: 'sushi',
  resto: 'japanese food',
  cafe: 'japanese cafe',
  hotel: 'japanese hotel',
  onsen: 'onsen',
  temple: 'japanese temple',
  chateau: 'japanese castle',
  vue: 'japan landscape',
  gare: 'japan train station',
  konbini: 'japan convenience store',
}

type Image =
  | { source: 'moi'; url: string }
  | { source: 'google'; url: string; auteur: string | null; lien: string | null }
  | { source: 'banque'; url: string; auteur: string; lienAuteur: string; lien: string }

/**
 * Grande image en haut de B5, par ordre de priorité :
 * 1. mes photos · 2. photo Google (crédit de l'auteur) · 3. photo Unsplash (crédit + lien) · 4. couverture générée.
 */
export default function ImageLieu({
  lieu,
  className = '',
}: {
  lieu: { id: string; google_place_id: string | null; category: string; type: string | null; ville: string | null }
  className?: string
}) {
  const [mesPhotos, setMesPhotos] = useState<PhotoEnregistree[]>([])
  const [image, setImage] = useState<Image | null>(null)
  const [pret, setPret] = useState(false)
  const [visionneuse, setVisionneuse] = useState<number | null>(null)

  useEffect(() => {
    let annule = false
    ;(async () => {
      try {
        const miennes = (await photosDuLieu(lieu.id)).filter((p) => p.url)
        if (annule) return
        setMesPhotos(miennes)
        if (miennes.length) return setImage({ source: 'moi', url: miennes[0].url! })

        if (lieu.google_place_id) {
          const g = await photosGoogle(lieu.google_place_id).catch(() => [])
          if (g[0]) {
            const url = await urlPhotoGoogle(g[0].name)
            if (annule) return
            return setImage({ source: 'google', url, auteur: g[0].auteurs[0]?.nom ?? null, lien: g[0].auteurs[0]?.lien ?? null })
          }
        }

        const requetes = [lieu.ville && `${lieu.ville} japan`, MOTS_TYPE[lieu.type ?? ''] ?? 'japan'].filter(Boolean) as string[]
        for (const q of requetes) {
          const p = await photoBanque(q).catch(() => null)
          if (annule) return
          if (p) return setImage({ source: 'banque', url: p.url, auteur: p.auteur, lienAuteur: p.lienAuteur, lien: p.lien })
        }
      } finally {
        if (!annule) setPret(true)
      }
    })()
    return () => {
      annule = true
    }
  }, [lieu.id, lieu.google_place_id, lieu.type, lieu.ville])

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {image ? (
        <img src={image.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <Couverture categorieId={lieu.category} typeId={lieu.type} className={`absolute inset-0 transition-opacity ${pret ? 'opacity-100' : 'opacity-60'}`} />
      )}
      {/* Toucher la grande photo l'agrandit (placé avant les vignettes et crédits, qui restent cliquables) */}
      {mesPhotos.length > 0 && <button onClick={() => setVisionneuse(0)} aria-label="Agrandir la photo" className="absolute inset-0" />}

      {/* Crédit obligatoire pour Google et Unsplash */}
      {image?.source === 'google' && (
        <a
          href={image.lien ?? undefined}
          target="_blank"
          rel="noreferrer"
          className="absolute bottom-4 left-4 max-w-[60%] truncate rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white"
        >
          Photo : {image.auteur ?? 'Google'} · Google
        </a>
      )}
      {image?.source === 'banque' && (
        // Règle Unsplash : nom de l'auteur (lien vers son profil) + lien vers Unsplash
        <p className="absolute bottom-4 left-4 max-w-[60%] truncate rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white">
          Photo :{' '}
          <a href={image.lienAuteur} target="_blank" rel="noreferrer" className="underline">
            {image.auteur}
          </a>{' '}
          ·{' '}
          <a href={image.lien} target="_blank" rel="noreferrer" className="underline">
            Unsplash
          </a>
        </p>
      )}

      {/* Mes photos en vignettes (comme la maquette B5) */}
      {mesPhotos.length > 1 && (
        <div className="absolute bottom-5 right-5 flex">
          {mesPhotos.slice(1).map((p, i) => (
            <button
              key={p.id}
              onClick={() => setVisionneuse(i + 1)}
              aria-label="Voir la photo"
              className={`h-[58px] w-[58px] overflow-hidden rounded-[16px] ring-[3px] ring-white ${i ? '-ml-3 rotate-3' : '-rotate-3'}`}
            >
              <img src={p.url!} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {visionneuse !== null && (
        <Visionneuse photos={mesPhotos} index={visionneuse} onIndex={setVisionneuse} onFermer={() => setVisionneuse(null)} />
      )}
    </div>
  )
}

function Visionneuse({
  photos,
  index,
  onIndex,
  onFermer,
}: {
  photos: PhotoEnregistree[]
  index: number
  onIndex: (i: number) => void
  onFermer: () => void
}) {
  const bouton = 'flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-2xl text-white disabled:opacity-20'
  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black" role="dialog" aria-modal="true" aria-label="Photos">
      <div className="flex justify-end p-4 pt-[max(env(safe-area-inset-top),16px)]">
        <button onClick={onFermer} aria-label="Fermer" className={bouton}>
          ✕
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <img src={photos[index].url!} alt="" className="max-h-full max-w-full object-contain" />
      </div>
      <div className="flex items-center justify-center gap-6 p-4 pb-[max(env(safe-area-inset-bottom),24px)]">
        <button className={bouton} disabled={index === 0} onClick={() => onIndex(index - 1)} aria-label="Photo précédente">
          ‹
        </button>
        <span className="font-semibold text-white">
          {index + 1} / {photos.length}
        </span>
        <button className={bouton} disabled={index === photos.length - 1} onClick={() => onIndex(index + 1)} aria-label="Photo suivante">
          ›
        </button>
      </div>
    </div>
  )
}
