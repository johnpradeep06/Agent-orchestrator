import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0b1220",
        paper: "#f7f8fa",
        panel: "#ffffff",
        border: "#e2e5eb",
        muted: "#5b6472",
        accent: "#2451c9",
        pass: "#0f9d58",
        fail: "#d93025",
        review: "#b8860b",
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
