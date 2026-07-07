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
        frido: {
          yellow: "var(--frido-yellow)",
          "yellow-press": "var(--frido-yellow-press)",
          black: "var(--frido-black)",
          white: "var(--frido-white)",
        },
        "blue-strong": "var(--blue-strong)",
        "blue-mid": "var(--blue-mid)",
        "blue-soft": "var(--blue-soft)",
        slate: "var(--slate)",
        mist: "var(--mist)",
        green: "var(--green)",
        red: "var(--red)",
        terracotta: "var(--terracotta)",
        // Semantic roles
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        border: "var(--border)",
        text: "var(--text)",
        "text-muted": "var(--text-muted)",
        primary: "var(--primary)",
        "on-primary": "var(--on-primary)",
        "focus-ring": "var(--focus-ring)",
        danger: "var(--danger)",
        required: "var(--required)",
      },
      fontFamily: {
        display: ["var(--font-poppins)", "sans-serif"],
        body: ["var(--font-outfit)", "sans-serif"],
      },
      borderRadius: {
        "r-sm": "var(--r-sm)",
        "r-md": "var(--r-md)",
        "r-lg": "var(--r-lg)",
        "r-pill": "var(--r-pill)",
      },
    },
  },
  plugins: [],
};

export default config;
