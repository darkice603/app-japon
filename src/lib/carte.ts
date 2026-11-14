import { Map as CarteML, setWorkerUrl, type MapOptions } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
// MapLibre dessine la carte dans un « worker » : on indique à Vite où le trouver.
import urlWorker from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'

setWorkerUrl(urlWorker)
import { categorie, typeDe } from './categories'

/** Fond de carte gratuit, sans clé : OpenFreeMap, style clair « positron ». */
export const STYLE_CARTE = 'https://tiles.openfreemap.org/styles/positron'

/** Centre du Japon (vue d'ensemble). */
export const JAPON = { centre: [138.25, 36.2] as [number, number], zoom: 4.3 }

export function creerCarte(container: HTMLElement, options: Partial<MapOptions> = {}) {
  return new CarteML({
    container,
    style: STYLE_CARTE,
    center: JAPON.centre,
    zoom: JAPON.zoom,
    attributionControl: { compact: true },
    ...options,
  })
}

/**
 * Position d'un lieu : la sienne, sinon le centre de sa ville légèrement décalé
 * (toujours au même endroit pour un même lieu) pour que les épingles ne se superposent pas.
 */
export function positionLieu(
  lieu: { id: string; lat: number | null; lng: number | null },
  ville: { lat: number | null; lng: number | null } | null,
): { lng: number; lat: number; approx: boolean } | null {
  if (lieu.lat != null && lieu.lng != null) return { lng: lieu.lng, lat: lieu.lat, approx: false }
  if (ville?.lat == null || ville?.lng == null) return null
  let h = 0
  for (const c of lieu.id) h = (h * 31 + c.charCodeAt(0)) | 0
  const angle = ((h >>> 0) % 360) * (Math.PI / 180)
  const rayon = 0.004 + (((h >>> 9) % 100) / 100) * 0.006 // ≈ 400 à 1 000 m
  return { lng: ville.lng + Math.cos(angle) * rayon, lat: ville.lat + Math.sin(angle) * rayon * 0.8, approx: true }
}

/** Élément HTML d'une épingle : rond de la couleur de la catégorie, kanji du type. */
export function elementEpingle(
  categorieId: string,
  typeId: string | null,
  options: { approx?: boolean; nom?: string; actif?: boolean; petit?: boolean } = {},
) {
  const c = categorie(categorieId)
  const t = typeDe(categorieId, typeId)
  const el = document.createElement('button')
  el.type = 'button'
  el.className = 'epingle'
  el.setAttribute('aria-label', options.nom ?? t.label)
  const taille = options.petit ? 24 : options.actif ? 52 : 42
  el.innerHTML = `
    <span style="display:flex;align-items:center;justify-content:center;width:${taille}px;height:${taille}px;border-radius:9999px;
      background:${c.vif};border:${options.petit ? 2 : 3}px ${options.approx ? 'dashed' : 'solid'} #fff;box-shadow:0 4px 14px rgba(0,0,0,.18);
      font-family:'Zen Maru Gothic',sans-serif;font-weight:700;font-size:${taille * 0.45}px;color:#fff">${t.kanji}</span>
    ${options.nom ? `<span style="position:absolute;left:${taille + 6}px;top:50%;transform:translateY(-50%);white-space:nowrap;
      background:#fff;border-radius:10px;padding:3px 8px;font:600 13px Inter,sans-serif;color:#121212;box-shadow:0 2px 8px rgba(0,0,0,.08)">${echapper(options.nom)}</span>` : ''}`
  el.style.position = 'relative'
  // Bloc à la taille exacte du rond : l'épingle tombe pile sur sa position
  el.style.display = 'block'
  el.style.width = `${taille}px`
  el.style.height = `${taille}px`
  el.style.lineHeight = '0'
  el.style.background = 'none'
  el.style.border = '0'
  el.style.padding = '0'
  el.style.cursor = 'pointer'
  return el
}

function echapper(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}
