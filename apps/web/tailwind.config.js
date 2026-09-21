/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        guard: {
          dark: "#070A12",
          cardDark: "rgba(15, 23, 42, 0.75)",
          accent: "#00E5FF",
          accentHover: "#00B8CC",
          securityBlue: "#3B82F6",
          danger: "#FF2A55",
          dangerHover: "#E01944",
          success: "#10B981",
          warning: "#F59E0B"
        }
      },
      borderRadius: {
        'card': '20px',
        'pill': '9999px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'cyan-glow': '0 0 20px -5px rgba(0, 229, 255, 0.4)',
        'red-glow': '0 0 20px -5px rgba(255, 42, 85, 0.4)',
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
}
