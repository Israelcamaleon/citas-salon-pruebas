/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}", "./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        lh: {
          bg: "#f4f3ef",
          card: "#ffffff",
          sidebar: "#1a1a2e",
          "sidebar-text": "#c8c7d4",
          accent: "#378add",
          "accent-2": "#185fa5",
          text: "#1a1a1a",
          muted: "#777777",
          border: "#e8e7e2",
          danger: "#e53e3e",
          ok: "#38a169",
        },
      },
      borderRadius: {
        lh: "12px",
      },
      boxShadow: {
        modal: "0 24px 60px rgba(0,0,0,0.25)",
      },
    },
  },
  plugins: [],
}
