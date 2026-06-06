import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"Courier New"', 'Courier', 'monospace'],
      },
      keyframes: {
        glitch: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '20%':       { transform: 'translate(-3px, 1px)' },
          '40%':       { transform: 'translate(3px, -1px)' },
          '60%':       { transform: 'translate(-1px, 2px)' },
          '80%':       { transform: 'translate(1px, -2px)' },
        },
        scanline: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
      animation: {
        glitch:   'glitch 0.25s steps(1) infinite',
        scanline: 'scanline 4s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
