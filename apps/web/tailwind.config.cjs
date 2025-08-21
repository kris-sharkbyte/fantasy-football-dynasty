/** @type {import('tailwindcss').Config} */
const PrimeUI = require('tailwindcss-primeui');

module.exports = {
  // Easier dark mode toggle: add class="app-dark" to <html> or a wrapper
  darkMode: ['class', '.app-dark'],
  content: [
    './src/**/*.{html,ts,scss,css}', // this app
    '../../libs/**/*.{html,ts,scss,css}', // shared Angular libs (if you render them)
    './src/index.html',
  ],
  theme: {
    screens: {
      sm: '576px',
      md: '768px',
      lg: '992px',
      xl: '1200px',
      '2xl': '1920px',
    },
    extend: {},
  },
  // If you use PrimeNG Unstyled + Tailwind, keep this plugin.
  // If you use a PrimeNG theme CSS instead, remove this plugin.
  plugins: [PrimeUI],
};
