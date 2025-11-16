/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './mobile.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#4f46e5',
          secondary: '#0ea5e9',
        },
      },
    },
  },
  plugins: [],
};
