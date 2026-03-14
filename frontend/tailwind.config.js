/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        void: '#0B0D17', // Very deep tech blue/black
        surface: 'rgba(20, 24, 44, 0.45)', // Glassy layer
        elevated: 'rgba(30, 36, 60, 0.65)',
        border: 'rgba(255, 255, 255, 0.05)',
        accent: '#00E5FF', // Vibrant Cyan neon
        'accent-dim': '#00B8D4',
        warn: '#FF3D00',
        danger: '#FF1744',
        'text-primary': '#FFFFFF',
        'text-secondary': '#8A99BA',
        'text-muted': '#4A5578',
      },
      boxShadow: {
        'neu-glass': '-8px -8px 16px rgba(255, 255, 255, 0.02), 8px 8px 24px rgba(0, 0, 0, 0.8), inset 1px 1px 2px rgba(255, 255, 255, 0.08)',
        'neu-pressed': 'inset 4px 4px 8px rgba(0, 0, 0, 0.6), inset -4px -4px 8px rgba(255, 255, 255, 0.02)',
        'btn-glow': '0 0 20px rgba(0, 229, 255, 0.4), inset 1px 1px 3px rgba(255, 255, 255, 0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
        'slide-up': 'slideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)',
        'float': 'float 6s ease-in-out infinite',
        'pulse-accent': 'pulseAccent 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(30px) scale(0.95)' }, to: { opacity: 1, transform: 'translateY(0) scale(1)' } },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        pulseAccent: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: .5 },
        },
      },
    },
  },
  plugins: [],
}
