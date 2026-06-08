/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        exam: {
          nav: "#1a2332",
          navHover: "#243044",
          panel: "#f5f5f5",
          passage: "#ffffff",
          question: "#ffffff",
          accent: "#1a73e8",
          flagged: "#f59e0b",
          correct: "#16a34a",
          incorrect: "#dc2626",
          selected: "#dbeafe",
          selectedBorder: "#3b82f6",
          strip: "#2a3a4e",
        },
      },
      fontFamily: {
        exam: ['"Source Sans 3"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        passage: ['"Merriweather"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
