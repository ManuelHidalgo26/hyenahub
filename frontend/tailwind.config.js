/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          400: "#fb923c",   // orange-400
          500: "#f97316",   // orange-500
          600: "#ea580c",   // orange-600
        },
      },
      animation: {
        "fade-in":     "fadeIn 0.4s ease-out both",
        "slide-up":    "slideUp 0.4s ease-out both",
        "slide-up-sm": "slideUpSm 0.3s ease-out both",
      },
      keyframes: {
        fadeIn:    { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp:   { from: { opacity: "0", transform: "translateY(20px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        slideUpSm: { from: { opacity: "0", transform: "translateY(8px)"  }, to: { opacity: "1", transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
};
