import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// GitHub project pages live at /<repo-name>/; set VITE_BASE_PATH in CI (see .github/workflows).
const base = process.env.VITE_BASE_PATH || '/'

export default defineConfig({
  plugins: [svelte(), tailwindcss()],
  base,
})
