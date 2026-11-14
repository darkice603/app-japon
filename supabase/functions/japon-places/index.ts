// =====================================================================
// App Japon — Edge Function « japon-places »
// Relais sécurisé vers Google Places API (New).
// La clé Google reste ici, côté serveur (secret JAPON_GOOGLE_PLACES_KEY) :
// elle n'est jamais envoyée à l'app ni à GitHub.
// Seules les personnes connectées à l'app peuvent l'appeler (JWT vérifié par Supabase).
//
// Actions (POST, corps JSON) :
//   { action: "autocomplete", input, sessionToken?, lat?, lng? }
//   { action: "details", placeId, sessionToken? }
//   { action: "photo", name, maxWidth? }
//   { action: "photosLieu", placeId }
//   { action: "pexels", query }   (clé Pexels : secret JAPON_PEXELS_KEY)
// =====================================================================

const CLE = Deno.env.get('JAPON_GOOGLE_PLACES_KEY') ?? ''
const GOOGLE = 'https://places.googleapis.com/v1'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function reponse(corps: unknown, status = 200) {
  return new Response(JSON.stringify(corps), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

async function google(url: string, init: RequestInit & { champs?: string } = {}) {
  const { champs, ...reste } = init
  const r = await fetch(url, {
    ...reste,
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': CLE,
      ...(champs ? { 'X-Goog-FieldMask': champs } : {}),
    },
  })
  const json = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(json?.error?.message ?? `Google ${r.status}`)
  return json
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return reponse({ erreur: 'Méthode non autorisée' }, 405)
  if (!CLE) return reponse({ erreur: 'Clé Google absente (secret JAPON_GOOGLE_PLACES_KEY)' }, 500)

  try {
    const corps = await req.json()

    // 1. Suggestions pendant la frappe (Japon uniquement)
    if (corps.action === 'autocomplete') {
      const input = String(corps.input ?? '').slice(0, 100)
      if (input.trim().length < 2) return reponse({ suggestions: [] })
      const demande: Record<string, unknown> = {
        input,
        includedRegionCodes: ['jp'],
        languageCode: 'fr',
      }
      if (corps.sessionToken) demande.sessionToken = String(corps.sessionToken)
      if (typeof corps.lat === 'number' && typeof corps.lng === 'number') {
        demande.locationBias = { circle: { center: { latitude: corps.lat, longitude: corps.lng }, radius: 20000 } }
      }
      const g = await google(`${GOOGLE}/places:autocomplete`, { method: 'POST', body: JSON.stringify(demande) })
      const suggestions = (g.suggestions ?? [])
        .map((s: any) => s.placePrediction)
        .filter(Boolean)
        .map((p: any) => ({
          placeId: p.placeId,
          nom: p.structuredFormat?.mainText?.text ?? p.text?.text,
          detail: p.structuredFormat?.secondaryText?.text ?? '',
          types: p.types ?? [],
        }))
      return reponse({ suggestions })
    }

    // 2. Détails d'un lieu choisi (français + nom japonais)
    if (corps.action === 'details') {
      const id = String(corps.placeId ?? '').replace(/[^A-Za-z0-9_-]/g, '')
      if (!id) return reponse({ erreur: 'placeId manquant' }, 400)
      const jeton = corps.sessionToken ? `&sessionToken=${encodeURIComponent(String(corps.sessionToken))}` : ''
      const [fr, ja] = await Promise.all([
        google(`${GOOGLE}/places/${id}?languageCode=fr${jeton}`, {
          champs: 'id,displayName,location,primaryType,types,shortFormattedAddress,addressComponents,photos',
        }),
        google(`${GOOGLE}/places/${id}?languageCode=ja`, { champs: 'displayName' }).catch(() => null),
      ])
      const composant = (type: string, langue: 'longText' | 'shortText' = 'longText') =>
        fr.addressComponents?.find((c: any) => c.types?.includes(type))?.[langue] ?? null
      return reponse({
        placeId: fr.id,
        nom: fr.displayName?.text ?? '',
        nomJa: ja?.displayName?.text && ja.displayName.text !== fr.displayName?.text ? ja.displayName.text : null,
        lat: fr.location?.latitude ?? null,
        lng: fr.location?.longitude ?? null,
        typePrincipal: fr.primaryType ?? null,
        types: fr.types ?? [],
        adresse: fr.shortFormattedAddress ?? null,
        ville: composant('locality'),
        prefecture: composant('administrative_area_level_1'),
        photos: (fr.photos ?? []).slice(0, 3).map((p: any) => ({
          name: p.name,
          auteurs: (p.authorAttributions ?? []).map((a: any) => ({ nom: a.displayName, lien: a.uri })),
        })),
      })
    }

    // 3 bis. Photos Google d'un lieu (redemandées à l'affichage, jamais stockées)
    if (corps.action === 'photosLieu') {
      const id = String(corps.placeId ?? '').replace(/[^A-Za-z0-9_-]/g, '')
      if (!id) return reponse({ erreur: 'placeId manquant' }, 400)
      const g = await google(`${GOOGLE}/places/${id}`, { champs: 'photos' })
      return reponse({
        photos: (g.photos ?? []).slice(0, 3).map((p: any) => ({
          name: p.name,
          auteurs: (p.authorAttributions ?? []).map((a: any) => ({ nom: a.displayName, lien: a.uri })),
        })),
      })
    }

    // 4. Photo Pexels (ville ou type de lieu) — secret JAPON_PEXELS_KEY
    if (corps.action === 'pexels') {
      const clePexels = Deno.env.get('JAPON_PEXELS_KEY') ?? ''
      if (!clePexels) return reponse({ erreur: 'Clé Pexels absente (secret JAPON_PEXELS_KEY)' }, 500)
      const requete = String(corps.query ?? '').slice(0, 80)
      if (!requete.trim()) return reponse({ erreur: 'Recherche vide' }, 400)
      const r = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(requete)}&per_page=5&orientation=landscape`,
        { headers: { Authorization: clePexels } },
      )
      if (!r.ok) return reponse({ erreur: `Pexels ${r.status}` }, 502)
      const p = await r.json()
      const photo = p.photos?.[0]
      return reponse({
        photo: photo
          ? { url: photo.src?.large, auteur: photo.photographer, lienAuteur: photo.photographer_url, lien: photo.url }
          : null,
      })
    }

    // 3. Adresse temporaire d'une photo Google (la clé n'apparaît pas dans l'adresse renvoyée)
    if (corps.action === 'photo') {
      const name = String(corps.name ?? '')
      if (!/^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/.test(name)) return reponse({ erreur: 'Photo invalide' }, 400)
      const largeur = Math.min(Math.max(Number(corps.maxWidth) || 800, 100), 1600)
      const g = await google(`${GOOGLE}/${name}/media?maxWidthPx=${largeur}&skipHttpRedirect=true`)
      return reponse({ url: g.photoUri })
    }

    return reponse({ erreur: 'Action inconnue' }, 400)
  } catch (e) {
    return reponse({ erreur: (e as Error).message }, 502)
  }
})
