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
        },
        jmle: {
          yellow: "#FACC15",
          "yellow-light": "#FEF08A",
          orange: "#FB923C",
          "orange-dark": "#C2410C",
          cream: "#FFFBEB",
          warm: "#FFF7ED",
        },
        luxury: {
          black: "#7C2D12",
          charcoal: "#9A3412",
          cream: "#FFFBEB",
        },
      },
      fontFamily: {
        arabic: ["var(--font-noto-arabic)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
