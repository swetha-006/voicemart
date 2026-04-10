/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./store/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        "cyber-cyan": "#06b6d4",
        "cyber-purple": "#7c3aed",
        "neon-pink": "#ec4899",
        "base-night": "#0a0a0f",
      },
      fontFamily: {
        display: ["var(--font-orbitron)", "sans-serif"],
        body: ["var(--font-rajdhani)", "sans-serif"],
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 18px rgba(6, 182, 212, 0.35)" },
          "50%": { boxShadow: "0 0 32px rgba(124, 58, 237, 0.55)" },
        },
        slideInTop: {
          from: { opacity: "0", transform: "translateY(-20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideInBottom: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        matrix: {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "0 160px" },
        },
      },
      animation: {
        float: "float 5s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2.8s ease-in-out infinite",
        slideInTop: "slideInTop 0.6s ease-out forwards",
        slideInBottom: "slideInBottom 0.6s ease-out forwards",
        matrix: "matrix 12s linear infinite",
      },
      boxShadow: {
        neon: "0 0 24px rgba(6, 182, 212, 0.35)",
        "neon-pink": "0 0 24px rgba(236, 72, 153, 0.3)",
      },
      backgroundImage: {
        "cyber-gradient":
          "linear-gradient(135deg, rgba(6,182,212,0.18), rgba(124,58,237,0.16), rgba(236,72,153,0.12))",
      },
    },
  },
  plugins: [],
};
