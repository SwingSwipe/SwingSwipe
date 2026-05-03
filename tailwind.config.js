/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#1D9E75',
          dark: '#1a1a1a',
          bg: '#f5f5f2',
          card: '#ffffff',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        pill: '8px',
      },
    },
  },
  plugins: [],
}
