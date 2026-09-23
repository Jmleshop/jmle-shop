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
          DEFAULT: "#F97316",
          light: "#FDBA74",
          dark: "#EA580C",
          soft: "#FED7AA",
        },
        jmle: {
          yellow: "#FACC15",
          "yellow-light": "#FEF08A",
          orange: "#FB923C",
          "orange-dark": "#C2410C",
          cream: "#FFFBEB",
          warm: "#FFF7ED",
          ocher: "#F5E6C8",
          mahogany: "#5C1A0A",
        },
        luxury: {
          black: "#7C2D12",
          charcoal: "#9A3412",
          cream: "#FFFBEB",
          ink: "#3B1408",
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
        gold: "0 8px 30px -8px rgba(249, 115, 22, 0.35)",
        "gold-sm": "0 4px 14px -4px rgba(249, 115, 22, 0.28)",
        boutique: "0 12px 40px -12px rgba(92, 26, 10, 0.18)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(-100%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.45s ease-out both",
        shimmer: "shimmer 1.4s infinite",
      },
      transitionTimingFunction: {
        boutique: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
