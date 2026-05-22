/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './demo/**/*.{vue,ts,html}',
    './src/ui/tailwind/**/*.vue',
  ],
  corePlugins: { preflight: false },
  darkMode: 'class',
}
