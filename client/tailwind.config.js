/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17233e",
        navy: "#19294b",
        teal: "#087f8c",
        mint: "#eaf7f4",
        canvas: "#f6f7fb",
      },
      boxShadow: {
        card: "0 16px 42px rgba(27, 44, 75, 0.08)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
