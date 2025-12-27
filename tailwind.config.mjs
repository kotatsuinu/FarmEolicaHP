/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['system-ui', 'sans-serif'],
        serif: ['Shippori Mincho', 'Zen Old Mincho', 'serif'],
        display: ['Cinzel', 'Cormorant Garamond', 'serif'],
        mono: ['Courier Prime', 'Space Mono', 'monospace'], // Lab感のための等幅フォント
      },
      colors: {
        // Botanical Lab カラーパレット
        'stone-white': '#F2F2F0',
        'greige': '#E8E6E3',
        'dark-slate': '#2F4F4F',
        'rust': '#8B4513',
        'warm-gray': {
          50: '#F2F2F0',
          100: '#E8E6E3',
          200: '#D5D3CF',
          300: '#B8B6B2',
          400: '#9A9894',
          500: '#7D7B77',
        },
        'lab-green': {
          DEFAULT: '#2F4F4F',
          light: '#3D6363',
          dark: '#1F3333',
        },
      },
      backgroundImage: {
        // ノイズテクスチャ（紙・土のような質感）
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E\")",
      },
      animation: {
        'fade-in-up': 'fadeInUp 1s ease-out forwards',
        'fade-in': 'fadeIn 1.2s ease-out forwards',
        'slide-in-right': 'slideInRight 1s ease-out forwards',
      },
      keyframes: {
        fadeInUp: {
          '0%': {
            opacity: '0',
            transform: 'translateY(40px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        fadeIn: {
          '0%': {
            opacity: '0',
          },
          '100%': {
            opacity: '1',
          },
        },
        slideInRight: {
          '0%': {
            opacity: '0',
            transform: 'translateX(-40px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateX(0)',
          },
        },
      },
      boxShadow: {
        'lab': '0 10px 40px rgba(47, 79, 79, 0.1)',
        'lab-lg': '0 20px 60px rgba(47, 79, 79, 0.15)',
      },
    },
  },
  plugins: [],
};
