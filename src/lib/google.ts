import { supabase } from './supabase'
import type { CategorieId } from './categories'

/** Appels au relais sécurisé « japon-places » (la clé Google reste côté serveur). */

export type Suggestion = { placeId: string; nom: string; detail: string; types: string[] }

export type DetailsGoogle = {
  placeId: string
  nom: string
  nomJa: string | null
  lat: number | null
  lng: number | null
  typePrincipal: string | null
  types: string[]
  adresse: string | null
  ville: string | null
  prefecture: string | null
  photos: { name: string; auteurs: { nom: string; lien: string }[] }[]
}

async function appeler<T>(corps: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('japon-places', { body: corps })
  if (error) throw new Error(error.message)
  if (data?.erreur) throw new Error(data.erreur)
  return data as T
}

export const suggestions = (input: string, sessionToken: string, centre?: { lat: number; lng: number } | null) =>
  appeler<{ suggestions: Suggestion[] }>({ action: 'autocomplete', input, sessionToken, ...(centre ?? {}) }).then((r) => r.suggestions)

export const details = (placeId: string, sessionToken: string) => appeler<DetailsGoogle>({ action: 'details', placeId, sessionToken })

/** Catégorie et type de l'app déduits des types Google. */
export function categorieDepuisGoogle(types: string[]): { categorie: CategorieId; type: string } {
  const a = (...t: string[]) => t.some((x) => types.includes(x))
  if (a('ramen_restaurant')) return { categorie: 'manger', type: 'ramen' }
  if (a('sushi_restaurant')) return { categorie: 'manger', type: 'sushi' }
  if (a('japanese_izakaya_restaurant', 'bar', 'pub', 'wine_bar')) return { categorie: 'manger', type: 'izakaya' }
  if (a('cafe', 'coffee_shop', 'tea_house', 'cat_cafe', 'dessert_shop', 'bakery', 'cafeteria')) return { categorie: 'cafe', type: 'cafe' }
  if (types.some((t) => t.endsWith('_restaurant')) || a('restaurant', 'food', 'meal_takeaway')) return { categorie: 'manger', type: 'resto' }
  if (a('japanese_inn')) return { categorie: 'dormir', type: 'onsen' }
  if (a('lodging', 'hotel', 'hostel', 'motel', 'guest_house', 'bed_and_breakfast', 'resort_hotel')) return { categorie: 'dormir', type: 'hotel' }
  if (a('spa', 'public_bath', 'sauna')) return { categorie: 'visiter', type: 'onsen' }
  if (a('buddhist_temple', 'shinto_shrine', 'place_of_worship', 'church', 'hindu_temple')) return { categorie: 'visiter', type: 'temple' }
  if (a('castle', 'historical_landmark', 'historical_place', 'monument')) return { categorie: 'visiter', type: 'chateau' }
  if (a('train_station', 'subway_station', 'transit_station', 'bus_station', 'airport', 'light_rail_station', 'ferry_terminal'))
    return { categorie: 'transport', type: 'gare' }
  if (a('convenience_store', 'store', 'shopping_mall', 'department_store', 'market', 'supermarket', 'gift_shop', 'clothing_store', 'book_store'))
    return { categorie: 'shopping', type: 'konbini' }
  return { categorie: 'visiter', type: 'vue' }
}
