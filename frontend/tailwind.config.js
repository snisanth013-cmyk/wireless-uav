/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0A1424',
        panel: '#101F36',
        panel2: '#15294A',
        line: '#21385E',
        accent: '#2EC4B6',
        uav: '#F28C28',
        bad: '#E5484D',
        good: '#2EC4B6',
        relief: '#EAB308',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Barlow Condensed', 'sans-serif'],
        body: ['Barlow', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
