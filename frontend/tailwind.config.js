/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0d0d0d',
        muted: '#5c5c5c',
        border: '#e5e5e5',
        borderStrong: '#cfcfcf',
        bg: '#fafaf8',
        primary: {
          DEFAULT: '#0e9f6e',
          dark: '#0b6e45',
          tint: '#e6f7f0',
        },
        danger: {
          DEFAULT: '#d92b2b',
          tint: '#fdeaea',
        },
        warning: {
          DEFAULT: '#b8730a',
          tint: '#fdf1de',
        },
        success: {
          DEFAULT: '#0e9f6e',
          tint: '#e6f7f0',
        },
        info: {
          DEFAULT: '#4f46c7',
          dark: '#3c359e',
          tint: '#ecebfa',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        pill: '999px',
      },
    },
  },
  plugins: [],
}
