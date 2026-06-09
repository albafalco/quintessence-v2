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
        background: '#0f0f1a',
        foreground: '#e2e8f0',
        card: '#1e1e2e',
        primary: {
          DEFAULT: '#7c3aed',
          foreground: '#ffffff',
        },
        accent: {
          DEFAULT: '#f59e0b',
          foreground: '#0f0f1a',
        },
        muted: {
          DEFAULT: '#2a2a3e',
          foreground: '#94a3b8',
        },
        border: '#2e2e42',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-playfair)', 'serif'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;