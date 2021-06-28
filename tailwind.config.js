const production = !process.env.ROLLUP_WATCH

module.exports = {
  future: {
    removeDeprecatedGapUtilities: true,
    purgeLayersByDefault: true,
  },
  plugins: [],
  purge: {
    content: ['./src/**/*.svelte'],
    enabled: false,
  },
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#f9ce03',
          light: '#fbe167',
        },
        secondary: {
          DEFAULT: '#965cb8',
          light: '#c09dd4',
        },
        background: {
          DEFAULT: '#222222',
          light: '#2d2d2d',
        },
        foreground: {
          dark: '#aaaaaa',
          DEFAULT: '#e0e0e0',
        },
      },
    },
  },
}
