import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        // Neutral base (warm-cool zinc)
        ink: {
          950: "#09090b",
          900: "#18181b",
          800: "#27272a",
          700: "#3f3f46",
          600: "#52525b",
          500: "#71717a",
          400: "#a1a1aa",
          300: "#d4d4d8",
          200: "#e4e4e7",
          100: "#f4f4f5",
          50: "#fafafa",
        },
        // Accent — deep petrol teal, used sparingly
        brand: {
          50: "#f0f9f7",
          100: "#d9efea",
          200: "#b3ded6",
          300: "#84c6bb",
          400: "#4fa89b",
          500: "#2b8a7c",
          600: "#1c6f63",
          700: "#175a51",
          800: "#154a43",
          900: "#123c37",
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(24 24 27 / 0.04)",
        pop: "0 8px 30px -8px rgb(24 24 27 / 0.18)",
      },
      borderRadius: {
        lg: "0.5rem",
        xl: "0.625rem",
      },
    },
  },
  plugins: [],
};

export default config;
