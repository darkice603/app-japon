import imageCompression from 'browser-image-compression'
import exifr from 'exifr'
import { supabase, BUCKET_PHOTOS } from './supabase'

/** 3 photos maximum par lieu (décision CLAUDE.md). */
export const MAX_PHOTOS = 3

export type PhotoPreparee = {
  id: string
  fichier: Blob
  apercu: string // adresse locale pour l'aperçu avant envoi
  date: string | null // ISO
  lat: number | null
  lng: number | null
}

export type PhotoEnregistree = { id: string; storage_path: string; url: string | null }

/** Lit la date et le GPS de la photo, puis la compresse (≈ 1600 px, ~400 Ko, JPEG). */
export async function preparerPhoto(fichier: File): Promise<PhotoPreparee> {
  let date: string | null = null
  let lat: number | null = null
  let lng: number | null = null
  try {
    const exif = await exifr.parse(fichier, { gps: true, pick: ['DateTimeOriginal', 'CreateDate', 'latitude', 'longitude'] })
    const d = exif?.DateTimeOriginal ?? exif?.CreateDate
    if (d instanceof Date && !isNaN(d.getTime())) date = d.toISOString()
    if (typeof exif?.latitude === 'number' && typeof exif?.longitude === 'number') {
      lat = exif.latitude
      lng = exif.longitude
    }
  } catch {
    // Pas d'EXIF (capture d'écran, photo envoyée par messagerie…) : ce n'est pas grave.
  }
  const compresse = await imageCompression(fichier, {
    maxWidthOrHeight: 1600,
    maxSizeMB: 0.4,
    fileType: 'image/jpeg',
    initialQuality: 0.82,
    useWebWorker: true,
  })
  return { id: crypto.randomUUID(), fichier: compresse, apercu: URL.createObjectURL(compresse), date, lat, lng }
}

/** Envoie une photo préparée dans le bucket privé et l'enregistre dans japon.photos. */
export async function envoyerPhoto(p: PhotoPreparee, userId: string, lieu: { placeId: string }) {
  const chemin = `${userId}/${lieu.placeId}/${p.id}.jpg`
  const { error: errEnvoi } = await supabase.storage.from(BUCKET_PHOTOS).upload(chemin, p.fichier, {
    contentType: 'image/jpeg',
    upsert: false,
  })
  if (errEnvoi) throw errEnvoi
  const { error } = await supabase.from('photos').insert({
    id: p.id,
    storage_path: chemin,
    place_id: lieu.placeId,
    taken_at: p.date,
    lat: p.lat,
    lng: p.lng,
  })
  if (error) {
    await supabase.storage.from(BUCKET_PHOTOS).remove([chemin])
    throw error
  }
}

/** Supprime des photos (fichier + ligne). */
export async function supprimerPhotos(photos: { id: string; storage_path: string }[]) {
  if (!photos.length) return
  const { error: errFichiers } = await supabase.storage.from(BUCKET_PHOTOS).remove(photos.map((p) => p.storage_path))
  if (errFichiers) throw errFichiers
  const { error } = await supabase.from('photos').delete().in('id', photos.map((p) => p.id))
  if (error) throw error
}

/** Photos d'un lieu avec une adresse temporaire (le bucket est privé : adresses valables 1 h). */
export async function photosDuLieu(placeId: string): Promise<PhotoEnregistree[]> {
  const { data, error } = await supabase
    .from('photos')
    .select('id, storage_path, taken_at, created_at')
    .eq('place_id', placeId)
    .order('created_at')
  if (error) throw error
  if (!data?.length) return []
  const { data: urls } = await supabase.storage.from(BUCKET_PHOTOS).createSignedUrls(
    data.map((p) => p.storage_path),
    3600,
  )
  return data.map((p, i) => ({ id: p.id, storage_path: p.storage_path, url: urls?.[i]?.signedUrl ?? null }))
}
