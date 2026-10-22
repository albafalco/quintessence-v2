import type { Config } from 'tailwindcss';

/** Theme colour from a CSS variable holding "R G B" (see globals.css). */
const v = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Every colour is a CSS variable (globals.css), so the Quintessence (dark)
      // and Hajnal (light) themes swap them; opacity modifiers keep working.
      colors: {
        background: v('background'),
        foreground: v('foreground'),
        card: v('card'),
        'card-elevated': v('card-elevated'),
        primary: {
          DEFAULT: v('primary'),
          light: v('primary-light'),
          dark: v('primary-dark'),
          foreground: v('primary-foreground'),
        },
        accent: {
          DEFAULT: v('accent'),
          light: v('accent-light'),
          dark: v('accent-dark'),
          foreground: v('accent-foreground'),
        },
        cosmic: {
          DEFAULT: v('cosmic'),
          deep: v('cosmic-deep'),
          glow: v('cosmic-glow'),
        },
        cream: v('cream'),
        muted: {
          DEFAULT: v('muted'),
          foreground: v('muted-foreground'),
        },
        border: v('border'),
        ring: v('accent'),
        // Status colours in use: darker on the light theme so they stay readable
        red: {
          200: v('red-200'),
          300: v('red-300'),
          400: v('red-400'),
          500: v('red-500'),
          600: v('red-600'),
          900: v('red-900'),
          950: v('red-950'),
        },
        green: {
          300: v('green-300'),
          400: v('green-400'),
          500: v('green-500'),
          600: v('green-600'),
          900: v('green-900'),
        },
        amber: {
          200: v('amber-200'),
          300: v('amber-300'),
          400: v('amber-400'),
          500: v('amber-500'),
          900: v('amber-900'),
        },
        slate: {
          100: v('slate-100'),
          200: v('slate-200'),
          300: v('slate-300'),
          400: v('slate-400'),
          500: v('slate-500'),
          600: v('slate-600'),
          700: v('slate-700'),
          800: v('slate-800'),
        },
        emerald: {
          400: v('emerald-400'),
          600: v('emerald-600'),
          950: v('emerald-950'),
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      borderRadius: {
        lg: '0.875rem',
        xl: '1.125rem',
        '2xl': '1.375rem',
      },
      boxShadow: {
        glow: 'var(--shadow-glow)',
        'glow-gold': 'var(--shadow-glow-gold)',
        card: 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
      },
      backgroundImage: {
        'cosmic-gradient': 'var(--gradient-cosmic)',
        'magia-gradient': 'var(--gradient-magia)',
        'angol-gradient': 'var(--gradient-angol)',
        'gold-shimmer': 'var(--gradient-gold-shimmer)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        shimmer: 'shimmer 2.5s infinite',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        'flip-in': 'flipIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
        'fade-up': 'fadeUp 0.3s ease-out backwards',
        'pop-in': 'popIn 0.18s ease-out backwards',
        'bell-ring': 'bellRing 0.9s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'translateY(4px) scale(0.95)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        bellRing: {
          '0%, 100%': { transform: 'rotate(0)' },
          '15%': { transform: 'rotate(14deg)' },
          '30%': { transform: 'rotate(-12deg)' },
          '45%': { transform: 'rotate(9deg)' },
          '60%': { transform: 'rotate(-6deg)' },
          '75%': { transform: 'rotate(3deg)' },
        },
        flipIn: {
          '0%': { transform: 'rotateY(-90deg)', opacity: '0' },
          '100%': { transform: 'rotateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;