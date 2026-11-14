import { aujourdhui } from './dates'

/**
 * Taux de change JPY → EUR (taux BCE) via l'API gratuite Frankfurter, sans clé.
 * Pour un week-end ou un jour férié, Frankfurter renvoie le dernier taux connu.
 * Une date future utilise le dernier taux disponible.
 */
const cache = new Map<string, Promise<number>>()

export function tauxJpyEur(date: string): Promise<number> {
  const jour = !date || date > aujourdhui() ? 'latest' : date
  let promesse = cache.get(jour)
  if (!promesse) {
    promesse = fetch(`https://api.frankfurter.dev/v1/${jour}?base=JPY&symbols=EUR`)
      .then((r) => {
        if (!r.ok) throw new Error(`Taux indisponible (${r.status})`)
        return r.json()
      })
      .then((d: { rates: { EUR: number } }) => d.rates.EUR)
    promesse.catch(() => cache.delete(jour))
    cache.set(jour, promesse)
  }
  return promesse
}
