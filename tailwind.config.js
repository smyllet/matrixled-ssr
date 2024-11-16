/** @type {import('tailwindcss').Config} */
export default {
  content: ['./inertia/**/*.edge', './inertia/**/*.{js,ts,jsx,tsx,vue}'],
  theme: {
    extend: {},
  },
  plugins: [require('tailwindcss-primeui')],
}
