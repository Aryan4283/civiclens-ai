export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        civic: {
          primary: '#1a73e8',
          danger: '#d93025',
          warning: '#f9ab00',
          success: '#188038',
          surface: '#f8f9fa',
        }
      }
    }
  },
  plugins: [],
}

