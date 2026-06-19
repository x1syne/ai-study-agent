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
        primary: {
          50: '#fbffe8',
          100: '#f1ffc2',
          200: '#e3ff86',
          300: '#d3ff57',
          400: '#c6ff4d',
          500: '#a9e92b',
          600: '#82bd16',
          700: '#63900f',
          800: '#4f7212',
          900: '#405d12',
        },
        accent: {
          50: '#f5f8f6',
          100: '#e7eee9',
          200: '#d0ded5',
          300: '#adc4b6',
          400: '#84a090',
          500: '#657f6f',
          600: '#4f6558',
          700: '#415249',
          800: '#36443d',
          900: '#101816',
        },
        info: {
          50: '#edf5ff',
          100: '#d7e9ff',
          200: '#b8d8ff',
          300: '#86bdff',
          400: '#4c97ff',
          500: '#1f78ff',
          600: '#005cff',
          700: '#0048d8',
          800: '#003daf',
          900: '#083785',
        },
        dark: {
          50: '#fbfcfa',
          100: '#f5f7f4',
          200: '#eef3ee',
          300: '#e2ebe4',
          400: '#101816',
        },
        surface: {
          DEFAULT: '#ffffff',
          elevated: '#f8faf7',
          hover: '#e8efe9',
        },
        border: {
          DEFAULT: '#dce5df',
          light: '#cbd8d0',
          glow: 'rgba(198,255,77,0.48)',
        },
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },

      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '24px',
        '5xl': '32px',
      },

      boxShadow: {
        'sm-dark': '0 1px 2px rgba(17,24,22,0.05)',
        'md-dark': '0 10px 30px rgba(17,24,22,0.08)',
        'lg-dark': '0 24px 70px rgba(17,24,22,0.12)',
        primary: '0 14px 36px rgba(130,190,42,0.26)',
        accent: '0 14px 34px rgba(31,120,255,0.12)',
        'glow-sm': '0 0 0 4px rgba(198,255,77,0.18)',
        'glow-md': '0 0 0 6px rgba(198,255,77,0.2)',
        'glow-lg': '0 18px 52px rgba(130,190,42,0.24)',
        card: '0 1px 2px rgba(17,24,22,0.05)',
        'card-hover': '0 12px 36px rgba(17,24,22,0.1)',
      },

      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #c6ff4d 0%, #8fe942 100%)',
        'gradient-violet': 'linear-gradient(135deg, #101816 0%, #27332f 100%)',
        'gradient-cyan': 'linear-gradient(135deg, #1f78ff 0%, #6fb1ff 100%)',
        'gradient-warm': 'linear-gradient(135deg, #ffc38f 0%, #ffe1bc 100%)',
        'gradient-success': 'linear-gradient(135deg, #18a76f 0%, #62d39d 100%)',
        'gradient-danger': 'linear-gradient(135deg, #e5484d 0%, #ff8b8f 100%)',
        'gradient-card': 'linear-gradient(180deg, #ffffff 0%, #f8faf7 100%)',
        'gradient-radial-primary': 'radial-gradient(ellipse at center, rgba(198,255,77,0.18) 0%, transparent 70%)',
        noise: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.025'/%3E%3C/svg%3E\")",
      },

      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.4,0,0.2,1)',
        'slide-in-left': 'slideInLeft 0.35s cubic-bezier(0.4,0,0.2,1)',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.4,0,0.2,1)',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        float: 'float 3s ease-in-out infinite',
        shimmer: 'shimmer 1.5s infinite',
        'spin-slow': 'spin 8s linear infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'border-spin': 'borderSpin 4s linear infinite',
      },

      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideInLeft: { from: { opacity: '0', transform: 'translateX(-16px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        scaleIn: { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
        pulseGlow: { '0%,100%': { boxShadow: '0 0 0 0 rgba(198,255,77,0.35)' }, '50%': { boxShadow: '0 0 0 8px rgba(198,255,77,0)' } },
        float: { '0%,100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-6px)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        glowPulse: { '0%,100%': { opacity: '0.55' }, '50%': { opacity: '1' } },
        borderSpin: { to: { '--angle': '360deg' } as any },
      },

      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },

      spacing: {
        '4.5': '1.125rem',
        '13': '3.25rem',
        '15': '3.75rem',
        '18': '4.5rem',
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
