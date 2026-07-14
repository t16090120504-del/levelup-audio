import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Background layers (deep purple-blue, not pure black)
        'bg-deepest': '#0D0B1E',
        'bg-deep': '#13111C',
        'bg-base': '#1A1528',
        'bg-elevated': '#1E1A2E',
        'bg-card': '#252035',
        'bg-hover': '#2D2840',
        // Gold/amber accent
        'gold-bright': '#F5B544',
        'gold': '#D4941E',
        'gold-dark': '#8B6914',
        'gold-light': '#FFD067',
        // Secondary accents
        'purple-deep': '#3D2B5E',
        'blue-deep': '#1B2845',
        // Status colors
        'status-free': '#22CC44',
        'status-unlocked': '#4488FF',
        'status-locked': '#6B6B7B',
        'status-warning': '#FF6B35',
        // Text
        'text-primary': '#F0EDE4',
        'text-secondary': '#A09B8C',
        'text-muted': '#6B6677',
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'coin-spin': 'coin-spin 1s ease-in-out',
        'float': 'float 3s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(245, 181, 68, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(245, 181, 68, 0.5)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'coin-spin': {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(360deg)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      boxShadow: {
        'gold-glow': '0 0 20px rgba(245, 181, 68, 0.3)',
        'gold-glow-lg': '0 0 40px rgba(245, 181, 68, 0.4)',
        'gold-glow-sm': '0 0 10px rgba(245, 181, 68, 0.2)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
        'card-hover': '0 8px 32px rgba(0, 0, 0, 0.5)',
        'inset-gold': 'inset 0 0 0 1px rgba(245, 181, 68, 0.2)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-gold': 'linear-gradient(135deg, #F5B544 0%, #D4941E 100%)',
        'gradient-dark': 'linear-gradient(180deg, #0D0B1E 0%, #13111C 50%, #1A1528 100%)',
        'gradient-card': 'linear-gradient(145deg, #252035 0%, #1E1A2E 100%)',
        'shimmer-bg': 'linear-gradient(90deg, transparent 0%, rgba(245, 181, 68, 0.1) 50%, transparent 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
