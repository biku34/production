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
        // Neutral base — driven by CSS variables so the whole app flips between
        // dark (default) and light themes. Values live in globals.css.
        ink: {
          950: "rgb(var(--ink-950) / <alpha-value>)",
          900: "rgb(var(--ink-900) / <alpha-value>)",
          800: "rgb(var(--ink-800) / <alpha-value>)",
          700: "rgb(var(--ink-700) / <alpha-value>)",
          600: "rgb(var(--ink-600) / <alpha-value>)",
          500: "rgb(var(--ink-500) / <alpha-value>)",
          400: "rgb(var(--ink-400) / <alpha-value>)",
          300: "rgb(var(--ink-300) / <alpha-value>)",
          200: "rgb(var(--ink-200) / <alpha-value>)",
          100: "rgb(var(--ink-100) / <alpha-value>)",
          50: "rgb(var(--ink-50) / <alpha-value>)",
        },
        // Surface — "white" in light, a raised dark panel in dark.
        white: "rgb(var(--surface) / <alpha-value>)",
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
