import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        "inverse-on-surface": "#f2f1ea",
        surface: "#fafaf3",
        "on-background": "#1b1c18",
        "inverse-surface": "#30312c",
        "on-primary-container": "#9dd090",
        "tertiary-fixed-dim": "#e7c433",
        "tertiary-fixed": "#ffe174",
        "primary-fixed": "#bcf0ae",
        "surface-dim": "#dbdad4",
        "secondary-fixed-dim": "#ffb68c",
        "secondary-container": "#ffa26a",
        "surface-variant": "#e3e3dc",
        "on-secondary-fixed-variant": "#753401",
        "inverse-primary": "#a1d494",
        "on-tertiary-fixed": "#221b00",
        "primary-fixed-dim": "#a1d494",
        "on-secondary-container": "#783603",
        "secondary-fixed": "#ffdbc9",
        "surface-container-lowest": "#ffffff",
        "outline-variant": "#c2c9bb",
        "on-secondary": "#ffffff",
        tertiary: "#705d00",
        "on-tertiary": "#ffffff",
        "on-primary-fixed-variant": "#23501e",
        outline: "#72796e",
        "surface-tint": "#3b6934",
        "on-primary-fixed": "#002201",
        "error-container": "#ffdad6",
        "on-tertiary-fixed-variant": "#554500",
        "surface-container-high": "#e9e8e2",
        "on-primary": "#ffffff",
        "on-secondary-fixed": "#321200",
        "surface-container": "#efeee7",
        "on-tertiary-container": "#4c3e00",
        "tertiary-container": "#caa910",
        "primary-container": "#2d5a27",
        "on-surface-variant": "#42493e",
        "on-error-container": "#93000a",
        "on-surface": "#1b1c18",
        "on-error": "#ffffff",
        "surface-container-highest": "#e3e3dc",
        "surface-container-low": "#f5f4ed",
        "surface-bright": "#fafaf3",
      },
      fontFamily: {
        headline: ["Plus Jakarta Sans"],
        body: ["Inter"],
        label: ["Inter"],
        display: ["Epilogue"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "fade-in": {
          from: {
            opacity: "0",
          },
          to: {
            opacity: "1",
          },
        },
        "slide-in": {
          from: {
            opacity: "0",
            transform: "translateY(10px)",
          },
          to: {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
      },
      backdropBlur: {
        xs: "2px",
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
