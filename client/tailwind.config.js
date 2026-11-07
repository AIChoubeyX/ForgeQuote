/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    // Square corners everywhere; `rounded-full` stays for dots and spinners.
    borderRadius: {
      none: '0',
      sm: '0',
      DEFAULT: '0',
      md: '0',
      lg: '0',
      xl: '0',
      '2xl': '0',
      '3xl': '0',
      full: '9999px'
    },
    extend: {
      screens: {
        xs: '420px'
      },
      colors: {
        forge: {
          DEFAULT: '#0755B5',
          hover: '#05468F',
          active: '#043A78'
        },
        paper: '#F4F2E8',
        surface: '#FAF9F3',
        sunken: '#E9E7DA',
        ink: {
          DEFAULT: '#0755B5',
          soft: '#1F5FB0',
          muted: '#3F6FB0'
        },
        line: {
          DEFAULT: '#AEC3DC',
          strong: '#5F8AC4'
        },
        danger: '#B42318',
        success: '#15803D'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'monospace']
      },
      // Flat by design: hairlines carry the hierarchy, not elevation.
      boxShadow: {
        sm: 'none',
        DEFAULT: 'none',
        md: 'none',
        lg: 'none',
        xl: 'none',
        '2xl': 'none'
      }
    }
  },
  plugins: []
};
