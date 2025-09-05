/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    './index.html',
  ],
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
        // New dark theme colors as per design requirements
        background: "#181818",
        foreground: "#ffffff",
        primary: {
          DEFAULT: "#00C6FF",
          foreground: "#ffffff",
          50: "#e6f9ff",
          100: "#ccf3ff",
          200: "#99e6ff",
          300: "#66daff",
          400: "#33cdff",
          500: "#00C6FF",
          600: "#009ecc",
          700: "#007799",
          800: "#004f66",
          900: "#002833",
        },
        accent: {
          DEFAULT: "#FF5C8D",
          foreground: "#ffffff",
          50: "#fff0f4",
          100: "#ffe1ea",
          200: "#ffc3d4",
          300: "#ffa6bf",
          400: "#ff84a6",
          500: "#FF5C8D",
          600: "#cc4971",
          700: "#993755",
          800: "#662538",
          900: "#33121c",
        },
        muted: {
          DEFAULT: "#2a2a2a",
          foreground: "#a3a3a3",
        },
        card: {
          DEFAULT: "#202020",
          foreground: "#ffffff",
        },
        popover: {
          DEFAULT: "#202020",
          foreground: "#ffffff",
        },
        border: "#333333",
        input: "#333333",
        ring: "#00C6FF",
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
        },
        warning: {
          DEFAULT: "#f59e0b",
          foreground: "#000000",
        },
        success: {
          DEFAULT: "#10b981",
          foreground: "#ffffff",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "fade-in": {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        "slide-in": {
          from: { transform: "translateY(10px)", opacity: 0 },
          to: { transform: "translateY(0)", opacity: 1 },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 5px rgba(0, 198, 255, 0.3)" },
          "50%": { boxShadow: "0 0 20px rgba(0, 198, 255, 0.6)" },
        },
        "shimmer": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "shimmer": "shimmer 2s infinite",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'neumorphic': 'inset 5px 5px 10px rgba(0, 0, 0, 0.3), inset -5px -5px 10px rgba(255, 255, 255, 0.1)',
        'neumorphic-pressed': 'inset -5px -5px 10px rgba(0, 0, 0, 0.3), inset 5px 5px 10px rgba(255, 255, 255, 0.1)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}