/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        discord: {
          dark: '#1e1e1e',
          darker: '#121212',
          light: '#36393f',
          lighter: '#40444b',
          accent: '#5865f2',
          accentHover: '#4752c4',
          text: '#dcddde',
          muted: '#8e9297'
        }
      }
    },
  },
  plugins: [],
}
