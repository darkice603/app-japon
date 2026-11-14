import { useEffect, useRef } from 'react'
import { Marker, type Map as CarteML } from 'maplibre-gl'
import { creerCarte, elementEpingle, JAPON } from '../lib/carte'

/**
 * Mini-carte de B4 : on touche la carte (ou on glisse l'épingle) pour placer le lieu.
 * Sans position choisie, la carte est centrée sur la ville de l'étape.
 */
export default function ChoixPosition({
  position,
  centreVille,
  categorieId,
  typeId,
  onChange,
}: {
  position: { lat: number; lng: number } | null
  centreVille: { lat: number; lng: number } | null
  categorieId: string
  typeId: string | null
  onChange: (p: { lat: number; lng: number } | null) => void
}) {
  const conteneur = useRef<HTMLDivElement>(null)
  const carte = useRef<CarteML | null>(null)
  const epingle = useRef<Marker | null>(null)
  const surChangement = useRef(onChange)
  surChangement.current = onChange

  // Création de la carte (une seule fois)
  useEffect(() => {
    if (!conteneur.current) return
    const depart = position ?? centreVille
    const c = creerCarte(conteneur.current, {
      center: depart ? [depart.lng, depart.lat] : JAPON.centre,
      zoom: position ? 15 : centreVille ? 13 : JAPON.zoom,
      attributionControl: false,
    })
    c.on('click', (e) => surChangement.current({ lat: e.lngLat.lat, lng: e.lngLat.lng }))
    carte.current = c
    return () => c.remove()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Recentrer quand on change de ville (si aucune position n'est choisie)
  useEffect(() => {
    if (!position && centreVille) carte.current?.jumpTo({ center: [centreVille.lng, centreVille.lat], zoom: 13 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centreVille?.lat, centreVille?.lng])

  // Épingle (redessinée si la catégorie ou le type change)
  useEffect(() => {
    epingle.current?.remove()
    epingle.current = null
    if (!position || !carte.current) return
    const m = new Marker({ element: elementEpingle(categorieId, typeId), draggable: true })
      .setLngLat([position.lng, position.lat])
      .addTo(carte.current)
    m.on('dragend', () => {
      const p = m.getLngLat()
      surChangement.current({ lat: p.lat, lng: p.lng })
    })
    epingle.current = m
  }, [position, categorieId, typeId])

  return (
    <div>
      <div className="relative h-48 overflow-hidden rounded-[22px] bg-fond">
        <div className="absolute inset-0">
          <div ref={conteneur} className="h-full w-full" />
        </div>
        {!position && (
          <p className="pointer-events-none absolute inset-x-3 bottom-3 rounded-full bg-white/90 px-4 py-2 text-center text-sm font-semibold">
            Touche la carte pour placer le lieu
          </p>
        )}
      </div>
      {position && (
        <button type="button" onClick={() => onChange(null)} className="mt-1 min-h-11 px-2 text-sm font-semibold text-texte-2">
          Retirer la position
        </button>
      )}
    </div>
  )
}
