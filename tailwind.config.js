/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        clinical: {
          header: '#1F4E79',
          bg: '#F4F8FC',
          row: '#EBF2FA',
        },
      },
    },
  },
  plugins: [],
}

