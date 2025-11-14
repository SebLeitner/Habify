/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#007aff',
          secondary: '#34c759',
        },
      },
    },
  },
  plugins: [],
};
