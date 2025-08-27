import type { Config } from 'tailwindcss';

export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9ebff',
          200: '#b9d9ff',
          300: '#8ac0ff',
          400: '#5ea5ff',
          500: '#3b82f6', // primary
          600: '#2f6fe0',
          700: '#275cc0',
          800: '#234e9e',
          900: '#1f447f',
        },
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        focusRing: {
          '0%': { boxShadow: '0 0 0 0 rgba(59, 130, 246, 0.7)' },
          '70%': { boxShadow: '0 0 0 10px rgba(59, 130, 246, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(59, 130, 246, 0)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        'fade-in-up': 'fadeInUp 200ms ease-out',
        'focus-ring': 'focusRing 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
      },
      screens: {
        'xs': '475px',
      },
    },
  },
  plugins: [
    // Custom plugin for accessibility utilities
    function({ addUtilities, theme }: any) {
      const newUtilities = {
        '.sr-only': {
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: '0',
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: '0',
        },
        '.focus-visible\\:ring-2:focus-visible': {
          '--tw-ring-offset-shadow': 'var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color)',
          '--tw-ring-shadow': 'var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color)',
          boxShadow: 'var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000)',
        },
        '.focus-visible\\:ring-brand-500:focus-visible': {
          '--tw-ring-color': theme('colors.brand.500'),
        },
        '.focus-visible\\:ring-offset-2:focus-visible': {
          '--tw-ring-offset-width': '2px',
        },
        '.high-contrast': {
          '--tw-text-opacity': '1',
          color: 'rgb(0 0 0 / var(--tw-text-opacity))',
        },
        '.dark .high-contrast': {
          '--tw-text-opacity': '1',
          color: 'rgb(255 255 255 / var(--tw-text-opacity))',
        },
      };
      addUtilities(newUtilities);
    },
  ],
} satisfies Config;

