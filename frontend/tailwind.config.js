/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'Cambria', 'serif'],
      },
      colors: {
        stone: {
          50:  '#fafaf9',
          100: '#f5f5f4',
          200: '#e7e5e4',
          300: '#d6d3d1',
          400: '#a8a29e',
          500: '#78716c',
          600: '#57534e',
          700: '#44403c',
          800: '#292524',
          900: '#1c1917',
        },
        warm: {
          50:  '#fdf8f0',
          100: '#faf0e0',
          200: '#f5e0c0',
          300: '#ecc98a',
          400: '#d4a853',
          500: '#b8893a',
          600: '#8c6528',
          700: '#6b4a1a',
          800: '#4a3210',
          900: '#2e1e08',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
        'pill': '9999px',
      },
      boxShadow: {
        'soft': '0 1px 4px 0 rgb(0 0 0 / 0.06)',
        'card': '0 2px 12px 0 rgb(0 0 0 / 0.07)',
        'elevated': '0 8px 30px 0 rgb(0 0 0 / 0.10)',
        'warm': '0 4px 20px 0 rgb(180 140 80 / 0.12)',
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
    },
  },
  plugins: [],
};
