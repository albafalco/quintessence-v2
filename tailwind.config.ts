import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0812',
        foreground: '#f5f0e8',
        card: '#14101f',
        'card-elevated': '#1c1630',
        primary: {
          DEFAULT: '#4C1D95',
          light: '#6d28d9',
          dark: '#3B2A6E',
          foreground: '#f5f0e8',
        },
        accent: {
          DEFAULT: '#D4AF37',
          light: '#e8c96a',
          dark: '#b8942d',
          foreground: '#0a0812',
        },
        cosmic: {
          DEFAULT: '#3B2A6E',
          deep: '#1a1035',
          glow: '#5b21b6',
        },
        cream: '#f5f0e8',
        muted: {
          DEFAULT: '#221c35',
          foreground: '#a89bb8',
        },
        border: '#2e2648',
        ring: '#D4AF37',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-playfair)', 'Georgia', 'serif'],
      },
      borderRadius: {
        lg: '0.875rem',
        xl: '1.125rem',
        '2xl': '1.375rem',
      },
      boxShadow: {
        glow: '0 0 40px -8px rgba(76, 29, 149, 0.5)',
        'glow-gold': '0 0 32px -6px rgba(212, 175, 55, 0.35)',
        card: '0 8px 32px -8px rgba(0, 0, 0, 0.5)',
        'card-hover': '0 16px 48px -12px rgba(76, 29, 149, 0.25)',
      },
      backgroundImage: {
        'cosmic-gradient':
          'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(76, 29, 149, 0.22) 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 100% 100%, rgba(212, 175, 55, 0.06) 0%, transparent 50%)',
        'magia-gradient':
          'linear-gradient(135deg, rgba(76, 29, 149, 0.15) 0%, rgba(59, 42, 110, 0.08) 50%, rgba(212, 175, 55, 0.05) 100%)',
        'angol-gradient':
          'linear-gradient(135deg, rgba(30, 58, 95, 0.12) 0%, rgba(20, 16, 31, 0.6) 100%)',
        'gold-shimmer':
          'linear-gradient(90deg, transparent 0%, rgba(212, 175, 55, 0.15) 50%, transparent 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        shimmer: 'shimmer 2.5s infinite',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        'flip-in': 'flipIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
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