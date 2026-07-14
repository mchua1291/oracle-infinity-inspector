import type { Config } from 'tailwindcss';

export default {
  content: ['./*.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#312d2a',
        oracle: '#c74634',
        canvas: '#f5f4f2',
        surface: '#fbf9f8',
        moss: '#5f6f52',
      },
      boxShadow: {
        panel: '0 1px 2px rgba(49, 45, 42, 0.10), 0 5px 16px rgba(49, 45, 42, 0.04)',
      },
    },
  },
  plugins: [],
} satisfies Config;
