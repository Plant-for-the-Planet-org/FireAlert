/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/incident/**/*.{js,ts,jsx,tsx}',
    './src/Components/FireIncident/**/*.{js,ts,jsx,tsx}',
  ],
  corePlugins: {
    preflight: false, // Disable base styles to not affect other pages
  },
  important: '#incident-page', // Scope all Tailwind to this ID
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#E87B64',
          dark: '#FA7902',
          deep: '#CF5137',
        },
        white: '#FFFFFF',
        black: '#000000',
        text: {
          DEFAULT: '#4D5153',
        },
        border: {
          light: '#D5D5D5',
        },
        disable: '#CCCCCC',
        background: '#FAFAFF',
        orange: '#F2994A',
        success: '#2ecc71',
        warning: '#e67e22',
        alert: '#e74c3c',
        gray: {
          light: '#E6E9EC',
          medium: '#E1E2E2',
          dark: '#D3D3D3',
          lightest: '#707070',
          deep: '#767676',
        },
        transparent: 'transparent',
        gradient: {
          primary: '#E86F56',
        },
        planet: {
          'dark-gray': '#4F4F4F',
          'dark-green': '#68B030',
        },
      },
      fontFamily: {
        sans: ['OpenSans-Regular', 'Open Sans', 'system-ui', 'sans-serif'],
        bold: ['OpenSans-Bold', 'Open Sans', 'system-ui', 'sans-serif'],
        italic: ['OpenSans-Italic', 'Open Sans', 'system-ui', 'sans-serif'],
        semibold: ['OpenSans-SemiBold', 'Open Sans', 'system-ui', 'sans-serif'],
        extrabold: [
          'OpenSans-ExtraBold',
          'Open Sans',
          'system-ui',
          'sans-serif',
        ],
        oswald: ['Oswald-Bold', 'sans-serif'],
      },
      fontSize: {
        30: '1.875rem', // 30px
        27: '1.6875rem', // 27px
        25: '1.5625rem', // 25px
        24: '1.5rem', // 24px
        22: '1.375rem', // 22px
        20: '1.25rem', // 20px
        18: '1.125rem', // 18px
        16: '1rem', // 16px
        14: '0.875rem', // 14px
        12: '0.75rem', // 12px
        10: '0.625rem', // 10px
        8: '0.5rem', // 8px
      },
      lineHeight: {
        40: '2.5rem', // 40px
        30: '1.875rem', // 30px
        24: '1.5rem', // 24px
        20: '1.25rem', // 20px
        16: '1rem', // 16px
      },
    },
  },
  plugins: [],
};
