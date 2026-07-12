/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  // Forces every custom theme-color utility actually used in the app to
  // always be generated, as a safety net against content-scan discrepancies
  // between environments. This is the exact set in use — not a broad pattern
  // — so it can't balloon the output.
  safelist: [
    "bg-accent",
    "bg-accent/10",
    "bg-accent/5",
    "bg-card",
    "bg-card/60",
    "bg-destructive/10",
    "bg-foreground/40",
    "bg-muted",
    "bg-muted/40",
    "bg-primary",
    "bg-secondary",
    "border-accent/20",
    "border-accent/30",
    "border-accent/40",
    "border-border",
    "border-input",
    "border-primary",
    "border-primary/30",
    "focus:border-ring",
    "focus:ring-ring/30",
    "hover:bg-accent/20",
    "hover:bg-accent/90",
    "hover:bg-muted",
    "hover:bg-primary/90",
    "hover:border-primary",
    "hover:border-primary/50",
    "hover:text-destructive",
    "hover:text-foreground",
    "hover:text-primary",
    "text-accent-foreground",
    "text-accent-foreground/80",
    "text-destructive",
    "text-foreground",
    "text-foreground/90",
    "text-muted-foreground",
    "text-muted-foreground/70",
    "text-primary",
    "text-primary-foreground",
    "text-secondary-foreground",
    "bg-primary-foreground",
    "bg-secondary-foreground",
    "bg-destructive",
    "bg-destructive-foreground",
    "bg-popover",
    "text-popover-foreground",
    "bg-background",
    "text-background",
    "border-ring",
    "ring-ring",
    "bg-card-foreground",
    "text-card-foreground",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1180px" },
    },
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
