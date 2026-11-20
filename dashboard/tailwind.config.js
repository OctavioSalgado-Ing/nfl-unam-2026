/** Tailwind 3.4. Los colores salen de las variables CSS de src/styles/index.css. */
const token = (nombre) => `rgb(var(${nombre}) / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        fondo: token('--bg'),
        superficie: token('--surface'),
        elevado: token('--raised'),
        linea: token('--line'),
        tinta: token('--ink'),
        apagado: token('--muted'),
        acento: token('--accent'),
        'acento-tinta': token('--accent-ink'),
        rojo: token('--danger'),
        ambar: token('--warn'),
        verde: token('--ok'),
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      borderRadius: { sm: '4px', DEFAULT: '6px', md: '6px', lg: '8px' },
      transitionTimingFunction: {
        salida: 'cubic-bezier(0.23, 1, 0.32, 1)',
        'entra-sale': 'cubic-bezier(0.77, 0, 0.175, 1)',
      },
      fontSize: {
        cifra: ['6.5rem', { lineHeight: '0.9', letterSpacing: '-0.02em', fontWeight: '600' }],
        'cifra-sm': ['4rem', { lineHeight: '0.9', letterSpacing: '-0.02em', fontWeight: '600' }],
      },
    },
  },
  plugins: [],
}
