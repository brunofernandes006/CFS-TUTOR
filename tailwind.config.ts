import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary palette
        "navy-950": "#0a1628",
        "navy-900": "#0f1f33",
        "navy-800": "#1a2c47",
        graphite: "#2a3a4a",
        steel: "#4a5a6a",
        silver: "#8a9aaa",

        // Highlight colors
        "electric-blue": "#00b4ff",
        "cyan-glow": "#00e5ff",
        "gold-institution": "#c9a84c",
        "alert-red": "#ff4757",
        "success-green": "#2ed573",
        "warning-gold": "#ffa502",

        // Text colors
        "text-primary": "#e8ecf1",
        "text-secondary": "#a0aab3",
        "text-muted": "#6a7a8a",
      },
      backgroundColor: {
        navy: "#0a1628",
        "navy-900": "#0f1f33",
        "navy-800": "#1a2c47",
        graphite: "#2a3a4a",
        steel: "#4a5a6a",
      },
      borderColor: {
        graphite: "#2a3a4a",
        steel: "#4a5a6a",
      },
      textColor: {
        primary: "#e8ecf1",
        secondary: "#a0aab3",
        muted: "#6a7a8a",
      },
      boxShadow: {
        "glow-blue": "0 0 20px rgba(0, 229, 255, 0.3)",
        "glow-gold": "0 0 20px rgba(201, 168, 76, 0.3)",
      },
      animation: {
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        spin: "spin 1s linear infinite",
      },
      keyframes: {
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        spin: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      fontSize: {
        xs: ["11px", "1.4"],
        sm: ["12px", "1.5"],
        base: ["14px", "1.6"],
        lg: ["16px", "1.4"],
        xl: ["20px", "1.3"],
        "2xl": ["24px", "1.2"],
        "3xl": ["32px", "1.2"],
        "4xl": ["40px", "1.2"],
      },
      fontWeight: {
        400: "400",
        600: "600",
        700: "700",
        900: "900",
      },
      letterSpacing: {
        widest: "0.2em",
        wider: "0.1em",
        wide: "0.05em",
      },
    },
  },
  plugins: [],
};

export default config;
