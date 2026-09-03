import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./NUEVA TIENDA/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--primary-color, #b8935a)",
        gold: {
          DEFAULT: "#b8935a",
          deep: "#9c7a45",
          light: "#d4b382",
        },
        nude: {
          DEFAULT: "#efe4d6",
          soft: "#f7f1e8",
        },
        ink: {
          DEFAULT: "#2b241c",
          soft: "#8a7d6c",
        },
        line: "#e7ddcd",
      },
    },
  },
  plugins: [],
};

export default config;
