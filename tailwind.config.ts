import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { 950: "#05030b", 900: "#0a0614", 850: "#0f0a1d", 800: "#151026", 700: "#1f1736", 600: "#2c2148" },
        mw: { purple: "#8b3fd6", violet: "#b44dff", cyan: "#38e8ff", blue: "#2f6bff", pink: "#ff2bd6", gold: "#ffd23f", green: "#3dff9a" },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        neon: "0 0 0 1px rgba(180,77,255,.45), 0 0 24px rgba(180,77,255,.35)",
        cyan: "0 0 0 1px rgba(56,232,255,.5), 0 0 24px rgba(56,232,255,.35)",
      },
      keyframes: {
        floaty: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
        shine: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        pop: { "0%": { transform: "scale(.6)", opacity: "0" }, "60%": { transform: "scale(1.08)", opacity: "1" }, "100%": { transform: "scale(1)" } },
        rise: { "0%": { transform: "translateY(16px)", opacity: "0" }, "100%": { transform: "translateY(0)", opacity: "1" } },
        swipe: { "0%": { transform: "translate(0,0)", opacity: "0" }, "20%": { opacity: "1" }, "80%": { opacity: "1" }, "100%": { transform: "translate(var(--sx), var(--sy))", opacity: "0" } },
        pulseGlow: { "0%,100%": { boxShadow: "0 0 18px rgba(180,77,255,.55)" }, "50%": { boxShadow: "0 0 36px rgba(56,232,255,.75)" } },
        spinSlow: { to: { transform: "rotate(360deg)" } },
      },
      animation: {
        floaty: "floaty 4s ease-in-out infinite",
        shine: "shine 3s linear infinite",
        pop: "pop .45s cubic-bezier(.2,1.4,.4,1) both",
        rise: "rise .4s ease-out both",
        swipe: "swipe 1.1s ease-in-out infinite",
        pulseGlow: "pulseGlow 2.4s ease-in-out infinite",
        spinSlow: "spinSlow 12s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
