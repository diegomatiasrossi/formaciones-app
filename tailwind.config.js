/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Crewficina brand ──────────────────────────
        negro:          '#1C1C1C',
        crema:          '#F2F0EB',
        rojo:           '#C9343D',
        'rojo-oscuro':  '#a82830',
        dorado:         '#B8962E',
        'dorado-oscuro':'#9a7d24',
        blanco:         '#ffffff',
        // ── Grises y bordes ───────────────────────────
        'blanco-calido':'#faf8f5',
        borde:          '#333333',
        'borde-light':  '#e8e6e0',
        gris:           '#888888',
        'gris-light':   '#aaaaaa',
        // ── Superficies oscuras (editor) ──────────────
        'surface-1':    '#222222',
        'surface-2':    '#2a2a2a',
        'surface-3':    '#333333',
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', '-apple-system', 'Segoe UI', 'Helvetica', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        sm:   '4px',
        DEFAULT: '6px',
        md:   '8px',
        lg:   '12px',
        xl:   '16px',
        '2xl':'20px',
      },
      boxShadow: {
        soft: '0 2px 8px rgba(0,0,0,0.08)',
        card: '0 4px 16px rgba(0,0,0,0.10)',
        lg:   '0 8px 32px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
}
