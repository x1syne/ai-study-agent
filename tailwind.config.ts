import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1.5rem',
        lg: '2rem',
        xl: '2rem',
        '2xl': '2rem',
      },
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        // Primary — electric violet
        primary: {
          50:  '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        // Accent — cyan neon
        accent: {
          50:  '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },
        // Dark background layers
        dark: {
          50:  '#1e1e2e',
          100: '#16161f',
          200: '#111118',
          300: '#0c0c14',
          400: '#050508',
        },
        // Surface colours
        surface: {
          DEFAULT: '#111118',
          elevated: '#16161f',
          hover:    '#1c1c28',
        },
        // Border colours
        border: {
          DEFAULT: '#1e1e2e',
          light:   '#2a2a3e',
          glow:    'rgba(124,58,237,0.25)',
        },
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },

      borderRadius: {
        '2xl':  '16px',
        '3xl':  '20px',
        '4xl':  '24px',
        '5xl':  '32px',
      },

      boxShadow: {
        'sm-dark':   '0 1px 3px rgba(0,0,0,0.5)',
        'md-dark':   '0 4px 16px rgba(0,0,0,0.4)',
        'lg-dark':   '0 8px 32px rgba(0,0,0,0.5)',
        'primary':   '0 0 32px rgba(124,58,237,0.25), 0 4px 16px rgba(0,0,0,0.4)',
        'accent':    '0 0 24px rgba(6,182,212,0.2)',
        'glow-sm':   '0 0 12px rgba(124,58,237,0.3)',
        'glow-md':   '0 0 24px rgba(124,58,237,0.35)',
        'glow-lg':   '0 0 48px rgba(124,58,237,0.4)',
        'card':      '0 4px 24px rgba(0,0,0,0.35)',
        'card-hover':'0 12px 40px rgba(0,0,0,0.4), 0 0 24px rgba(124,58,237,0.1)',
      },

      backgroundImage: {
        'gradient-primary':  'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)',
        'gradient-violet':   'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
        'gradient-cyan':     'linear-gradient(135deg, #06b6d4 0%, #22d3ee 100%)',
        'gradient-warm':     'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
        'gradient-success':  'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
        'gradient-danger':   'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
        'gradient-card':     'linear-gradient(145deg, #111118 0%, #0c0c14 100%)',
        'gradient-radial-primary': 'radial-gradient(ellipse at center, rgba(124,58,237,0.15) 0%, transparent 70%)',
        'noise':             "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E\")",
      },

      animation: {
        'fade-in':       'fadeIn 0.3s ease-out',
        'slide-up':      'slideUp 0.4s cubic-bezier(0.4,0,0.2,1)',
        'slide-in-left': 'slideInLeft 0.35s cubic-bezier(0.4,0,0.2,1)',
        'scale-in':      'scaleIn 0.3s cubic-bezier(0.4,0,0.2,1)',
        'pulse-glow':    'pulseGlow 2s ease-in-out infinite',
        'float':         'float 3s ease-in-out infinite',
        'shimmer':       'shimmer 1.5s infinite',
        'spin-slow':     'spin 8s linear infinite',
        'glow-pulse':    'glowPulse 2s ease-in-out infinite',
        'border-spin':   'borderSpin 4s linear infinite',
      },

      keyframes: {
        fadeIn:       { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:      { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideInLeft:  { from: { opacity: '0', transform: 'translateX(-16px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        scaleIn:      { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
        pulseGlow:    { '0%,100%': { boxShadow: '0 0 0 0 rgba(124,58,237,0.4)' }, '50%': { boxShadow: '0 0 0 8px rgba(124,58,237,0)' } },
        float:        { '0%,100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-6px)' } },
        shimmer:      { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        glowPulse:    { '0%,100%': { opacity: '0.5' }, '50%': { opacity: '1' } },
        borderSpin:   { to: { '--angle': '360deg' } as any },
      },

      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },

      spacing: {
        '4.5': '1.125rem',
        '13':  '3.25rem',
        '15':  '3.75rem',
        '18':  '4.5rem',
      },

      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
      },
    },
  },
  plugins: [],
}

export default config
