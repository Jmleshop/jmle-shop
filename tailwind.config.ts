import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: "#FF6B00",
          light: "#FB923C",
          dark: "#EA580C",
          soft: "#FFEDD5",
        },
        brand: {
          orange: "#FF6B00",
          "orange-bright": "#F97316",
          red: "#DC2626",
          "red-bright": "#EF4444",
          "red-dark": "#B91C1C",
        },
        jmle: {
          yellow: "#FDBA74",
          "yellow-light": "#FFEDD5",
          orange: "#FF6B00",
          "orange-dark": "#C2410C",
          cream: "#FFF7ED",
          warm: "#FFF7ED",
          ocher: "#FED7AA",
          mahogany: "#7F1D1D",
        },
        luxury: {
          black: "#7F1D1D",
          charcoal: "#991B1B",
          cream: "#FFF7ED",
          ink: "#450A0A",
        },
      },
      fontFamily: {
        arabic: [
          "var(--font-tajawal)",
          "var(--font-noto-arabic)",
          "sans-serif",
        ],
        display: ["var(--font-amiri)", "serif"],
        ui: ["var(--font-tajawal)", "sans-serif"],
        body: ["var(--font-noto-arabic)", "sans-serif"],
      },
      boxShadow: {
        gold: "0 8px 30px -8px rgba(255, 107, 0, 0.4)",
        "gold-sm": "0 4px 14px -4px rgba(220, 38, 38, 0.3)",
        boutique: "0 12px 40px -12px rgba(127, 29, 29, 0.18)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(-100%)" },
        },
        "cart-bump": {
          "0%, 100%": { transform: "scale(1)" },
          "35%": { transform: "scale(1.22)" },
          "60%": { transform: "scale(0.94)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.45s ease-out both",
        shimmer: "shimmer 1.4s infinite",
        "cart-bump": "cart-bump 0.5s ease-boutique",
      },
      transitionTimingFunction: {
        boutique: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
