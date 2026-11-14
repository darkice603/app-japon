/** Petites fonctions de dates (dates au format AAAA-MM-JJ, sans fuseau horaire). */

export function aujourdhui(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Nombre de jours entre deux dates (b − a). */
export function ecartJours(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000)
}

/** « Avril 2025 », « Nov. 2024 » (mois long si court, abrégé sinon, comme sur B1). */
export function moisAnnee(date: string): string {
  const d = new Date(date + 'T00:00:00')
  const long = d.toLocaleDateString('fr-FR', { month: 'long' })
  const mois = long.length <= 5 ? long : d.toLocaleDateString('fr-FR', { month: 'short' })
  return `${mois.charAt(0).toUpperCase()}${mois.slice(1)} ${d.getFullYear()}`
}

export const formatYen = (n: number) => `¥${n.toLocaleString('fr-FR')}`
export const formatEuro = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} €`
