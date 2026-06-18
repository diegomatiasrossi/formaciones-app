/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        negro: '#1a1a1a',
        'blanco-calido': '#faf8f5',
        dorado: '#C9A961',
        'dorado-oscuro': '#c5a028',
        borde: '#333333',
        gris: '#888888',
        'surface-1': '#222222',
        'surface-2': '#2a2a2a',
        'surface-3': '#333333',
      },
      fontFamily: {
        sans: ['-apple-system', 'Segoe UI', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
