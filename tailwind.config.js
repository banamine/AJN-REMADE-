/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0B0F19',
        surface: '#1A1F2C',
        surfaceHover: '#252B3B',
        primary: '#3B82F6',
        accent: '#F59E0B',
        textMain: '#F3F4F6',
        textMuted: '#9CA3AF',
        borderSubtle: '#374151',
      },
      boxShadow: {
        'glow': '0 0 15px rgba(59, 130, 246, 0.5)',
      }
    },
  },
  plugins: [],
};
