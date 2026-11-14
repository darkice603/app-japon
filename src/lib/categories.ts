/** Catégories de lieux, types (avec leur kanji de couverture) et libellés des notes. */

export type CategorieId = 'manger' | 'cafe' | 'dormir' | 'visiter' | 'transport' | 'shopping'
export type CategorieDepense = 'logement' | 'transport' | 'repas' | 'divers'

export type Categorie = {
  id: CategorieId
  label: string
  /** Couleurs : vif / fond clair / texte foncé (voir CLAUDE.md) */
  vif: string
  clair: string
  fonce: string
  types: { id: string; label: string; kanji: string; lecture: string }[]
  depense: CategorieDepense
}

export const CATEGORIES: Categorie[] = [
  {
    id: 'manger', label: 'Manger', vif: '#F08A3C', clair: '#FFE7D3', fonce: '#C25E14', depense: 'repas',
    types: [
      { id: 'ramen', label: 'Ramen', kanji: '麺', lecture: 'Men · nouilles' },
      { id: 'izakaya', label: 'Izakaya', kanji: '酒', lecture: 'Sake · alcool' },
      { id: 'sushi', label: 'Sushi', kanji: '寿', lecture: 'Su · sushi' },
      { id: 'resto', label: 'Resto', kanji: '食', lecture: 'Shoku · repas' },
    ],
  },
  {
    id: 'cafe', label: 'Café', vif: '#E0A800', clair: '#FFF1C2', fonce: '#8A6200', depense: 'repas',
    types: [{ id: 'cafe', label: 'Café', kanji: '茶', lecture: 'Cha · thé' }],
  },
  {
    id: 'dormir', label: 'Dormir', vif: '#8F72F2', clair: '#EAE3FF', fonce: '#5B3FC4', depense: 'logement',
    types: [
      { id: 'hotel', label: 'Hôtel', kanji: '宿', lecture: 'Yado · auberge' },
      { id: 'onsen', label: 'Ryokan / onsen', kanji: '湯', lecture: 'Yu · eau chaude' },
    ],
  },
  {
    id: 'visiter', label: 'Visiter', vif: '#3DB3C7', clair: '#D8F1F5', fonce: '#1D7C8C', depense: 'divers',
    types: [
      { id: 'temple', label: 'Temple', kanji: '寺', lecture: 'Tera · temple' },
      { id: 'chateau', label: 'Château', kanji: '城', lecture: 'Shiro · château' },
      { id: 'vue', label: 'Vue', kanji: '景', lecture: 'Kei · paysage' },
      { id: 'onsen', label: 'Onsen', kanji: '湯', lecture: 'Yu · eau chaude' },
    ],
  },
  {
    id: 'transport', label: 'Transport', vif: '#5C8BD6', clair: '#DCE8FA', fonce: '#2F5FA8', depense: 'transport',
    types: [{ id: 'gare', label: 'Gare', kanji: '駅', lecture: 'Eki · gare' }],
  },
  {
    id: 'shopping', label: 'Shopping', vif: '#E0609A', clair: '#FCE1EC', fonce: '#A8326A', depense: 'divers',
    types: [{ id: 'konbini', label: 'Konbini', kanji: '買', lecture: 'Kau · acheter' }],
  },
]

export const categorie = (id: string | null | undefined) => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0]

/** Le type d'un lieu (ou le premier type de sa catégorie). */
export function typeDe(categorieId: string | null | undefined, typeId: string | null | undefined) {
  const c = categorie(categorieId)
  return c.types.find((t) => t.id === typeId) ?? c.types[0]
}

/** 1–4 Bof · 5–6 Correct · 7–8 Très bon · 9 Top · 10 Culte */
export function libelleNote(note: number): string {
  if (note >= 10) return 'Culte'
  if (note >= 9) return 'Top'
  if (note >= 7) return 'Très bon'
  if (note >= 5) return 'Correct'
  return 'Bof'
}
