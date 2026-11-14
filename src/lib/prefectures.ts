import { supabase } from './supabase'

export type Prefecture = { code: number; name_fr: string; name_ja: string; region: string }

let cache: Promise<Prefecture[]> | null = null

/** Les 47 préfectures (lues une seule fois dans japon.prefectures). */
export function chargerPrefectures(): Promise<Prefecture[]> {
  cache ??= Promise.resolve(
    supabase
      .from('prefectures')
      .select('code, name_fr, name_ja, region')
      .order('code')
      .then(({ data, error }) => {
        if (error) {
          cache = null
          throw error
        }
        return data as Prefecture[]
      }),
  )
  return cache
}
