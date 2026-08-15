/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        tnnavy: {
          50: '#f0f4f9',
          100: '#d9e2f0',
          200: '#b4c7e2',
          300: '#85a4cf',
          400: '#5c81bb',
          500: '#3e63a3',
          600: '#2e4c85',
          700: '#243b6b',
          800: '#1c2d52',
          900: '#14203d',
          950: '#0c1326',
        },
        tngold: {
          50: '#fbf8ea',
          100: '#f5eecc',
          200: '#ebdb9c',
          300: '#dec266',
          400: '#d1aa3c',
          500: '#b58f26',
          600: '#946f1e',
          700: '#75521c',
          800: '#60421d',
          900: '#51371e',
        },
        tnemerald: {
          50: '#f0fdf6',
          100: '#dbfbe9',
          200: '#b8f5d3',
          300: '#81ecb3',
          400: '#43d88c',
          500: '#1bbd6f',
          600: '#109957',
          700: '#107847',
          800: '#125f3a',
          900: '#114f32',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
