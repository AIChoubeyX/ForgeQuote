/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      screens: {
        xs: '420px'
      },
      colors: {
        forge: '#FF5A1F',
        'forge-hover': '#E94B13',
        dark: {
          bg: '#080808',
          surface: '#111111',
          elevated: '#181818',
          alt: '#202020',
          sidebar: '#080808',
          card: '#181818',
          input: '#111111',
          border: '#292D34',
          'border-orange': '#66301C'
        },
        txt: {
          primary: '#F5F5F5',
          secondary: '#A3A3A3',
          muted: '#737373'
        }
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif']
      }
    }
  },
  plugins: []
};
