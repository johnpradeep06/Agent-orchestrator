import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#05070d",
        surface: "#0c1120",
        surface2: "#121933",
        surface3: "#182142",
        border: "#212a45",
        borderHover: "#334066",
        ink: "#eef1fb",
        muted: "#8991ab",
        dim: "#565f7c",

        accent: "#7c5cff",
        accent2: "#5b8cff",
        cyan: "#22d3ee",
        indigo: "#6f79ff",
        violet: "#c17bff",
        amber: "#ffb648",

        pass: "#3ddc97",
        fail: "#ff6b7a",
        review: "#ffb648",
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        "glow-accent": "0 0 0 1px rgba(124,92,255,0.4), 0 0 24px -4px rgba(124,92,255,0.65)",
        "glow-cyan": "0 0 0 1px rgba(34,211,238,0.4), 0 0 24px -4px rgba(34,211,238,0.65)",
        "glow-indigo": "0 0 0 1px rgba(111,121,255,0.4), 0 0 24px -4px rgba(111,121,255,0.65)",
        "glow-violet": "0 0 0 1px rgba(193,123,255,0.4), 0 0 24px -4px rgba(193,123,255,0.65)",
        "glow-amber": "0 0 0 1px rgba(255,182,72,0.4), 0 0 24px -4px rgba(255,182,72,0.65)",
        "glow-pass": "0 0 0 1px rgba(61,220,151,0.4), 0 0 24px -4px rgba(61,220,151,0.65)",
        "glow-fail": "0 0 0 1px rgba(255,107,122,0.4), 0 0 24px -4px rgba(255,107,122,0.65)",
        card: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 20px 40px -20px rgba(0,0,0,0.6)",
      },
      backgroundImage: {
        "grid-glow":
          "radial-gradient(circle at 20% 0%, rgba(124,92,255,0.16), transparent 45%), radial-gradient(circle at 85% 20%, rgba(34,211,238,0.12), transparent 40%)",
        "dot-grid": "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};
export default config;
