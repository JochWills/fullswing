import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Sampled from the logo
        brand: {
          DEFAULT: "#25AAE1",
          50: "#EEF8FD",
          100: "#D6EFFA",
          200: "#ADDFF5",
          300: "#79CBEE",
          400: "#46B7E7",
          500: "#25AAE1",
          600: "#1689BC",
          700: "#126C95",
          800: "#0F5474",
          900: "#0B3A4F",
        },
        ball: {
          DEFAULT: "#8CC63F",
          50: "#F3F9EA",
          100: "#E3F1CF",
          600: "#6FA22C",
          700: "#557D22",
        },
        ink: {
          DEFAULT: "#0A1620",
          800: "#13232F",
          700: "#1E3240",
        },
      },
      fontFamily: {
        display: ['"Barlow Condensed"', "Impact", "sans-serif"],
        sans: ["Barlow", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgb(10 22 32 / 0.04), 0 8px 24px -12px rgb(10 22 32 / 0.12)",
        lift: "0 2px 4px rgb(10 22 32 / 0.04), 0 24px 48px -20px rgb(10 22 32 / 0.25)",
        glow: "0 12px 32px -12px rgb(37 170 225 / 0.6)",
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
