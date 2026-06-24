/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class', // 启用基于class的暗色模式
  theme: {
    extend: {
      colors: {
        // 亮色主题颜色
        light: {
          background: '#ffffff',
          surface: '#f8fafc',
          text: '#1e293b',
          textSecondary: '#64748b',
          border: '#e2e8f0',
          primary: '#f97316',
          primaryHover: '#ea580c',
        },
        // 暗色主题颜色
        dark: {
          background: '#0f172a',
          surface: '#1e293b',
          text: '#f1f5f9',
          textSecondary: '#94a3b8',
          border: '#334155',
          primary: '#f97316',
          primaryHover: '#ea580c',
        },
      },
    },
  },
  plugins: [],
};
