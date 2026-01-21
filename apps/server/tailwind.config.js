/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/incident/**/*.{js,ts,jsx,tsx}',
    './src/Components/FireIncident/**/*.{js,ts,jsx,tsx}',
  ],
  corePlugins: {
    preflight: false,
  },
  important: '#incident-page',
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
          'page-bg': '#D5D5D5',
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
        fire: {
          orange: '#E86F56',
          brown: '#B47C55',
          gray: '#C6C3C2',
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
        30: '1.875rem',
        27: '1.6875rem',
        25: '1.5625rem',
        24: '1.5rem',
        22: '1.375rem',
        20: '1.25rem',
        18: '1.125rem',
        16: '1rem',
        14: '0.875rem',
        12: '0.75rem',
        10: '0.625rem',
        8: '0.5rem',
      },
      lineHeight: {
        40: '2.5rem',
        30: '1.875rem',
        24: '1.5rem',
        20: '1.25rem',
        16: '1rem',
      },
    },
  },
  plugins: [],
  safelist: ['bg-primary', 'bg-gray-medium', 'text-primary', 'border-primary'],
};
