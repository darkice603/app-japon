import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Icônes de l'app (npx pwa-assets-generator) : l'icône iPhone remplit tout le carré, fond crème (logo Tabi).
export default defineConfig({
  preset: {
    ...minimal2023Preset,
    apple: { sizes: [180], padding: 0, resizeOptions: { background: '#F4F4F1' } },
    maskable: { sizes: [512], padding: 0.2, resizeOptions: { background: '#F4F4F1' } },
  },
  images: ['public/icon.svg'],
})
