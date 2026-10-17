import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Sampled from the logo
        brand: {
          DEFAULT: "#0193DD",
          50: "#EDF7FE",
          100: "#D4EDFB",
          200: "#A8DBF6",
          300: "#6CC3F0",
          400: "#2AA6E8",
          500: "#0193DD",
          600: "#0279BC",
          700: "#06629A",
          800: "#0A4F7A",
          900: "#0B3A57",
        },
        ball: {
          DEFAULT: "#8CC63F",
          50: "#F0FAF2",
          100: "#DDF2E3",
          400: "#70C706",
          500: "#43A90C",
          600: "#5DAE05",
          700: "#4A8A0A",
        },
        ink: {
          DEFAULT: "#071B31",
          800: "#13232F",
          700: "#1E3240",
        },
      },
      fontFamily: {
        display: ['"Barlow Condensed"', "Impact", "sans-serif"],
        // Heavy grotesk for the home hero and the logo lockup
        heavy: ["Archivo", "system-ui", "sans-serif"],
        sans: ["Barlow", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgb(10 22 32 / 0.04), 0 8px 24px -12px rgb(10 22 32 / 0.12)",
        lift: "0 2px 4px rgb(10 22 32 / 0.04), 0 24px 48px -20px rgb(10 22 32 / 0.25)",
        glow: "0 14px 32px -12px rgb(1 147 221 / 0.65)",
      },
      keyframes: {
        bounceBall: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-14px)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        dialogIn: {
          from: { opacity: "0", transform: "translateY(8px) scale(0.97)" },
          to: { opacity: "1", transform: "none" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "none" },
        },
      },
      animation: {
        "bounce-ball": "bounceBall 2.8s ease-in-out infinite",
        shimmer: "shimmer 1.4s ease-in-out infinite",
        "fade-in": "fadeIn 0.25s ease-out both",
        "dialog-in": "dialogIn 0.2s cubic-bezier(0.2, 0.9, 0.3, 1.2) both",
      },
    },
  },
  plugins: [],
} satisfies Config;
