/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary Colors (Design Tokens)
        primary: {
          main: '#00B2A1',
          hover: '#009688',
          light: '#00F5DC',
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#00B2A1',
          600: '#009688',
          700: '#0d9488',
          800: '#115e59',
          900: '#134e4a',
        },
        // Sidebar Colors
        sidebar: {
          background: '#3B4154',
          'background-hover': '#656D86',
          border: '#666F8F',
          'fav-text': '#00F5DC',
          'item-selected': '#00B2A1',
        },
        // Text Colors
        text: {
          heading: '#3B4154',
          body: '#333333',
          label: '#666F8F',
          muted: '#666666',
          light: '#B0B0B0',
        },
        // Border Colors
        border: {
          default: '#CFD2DE',
          light: '#E4E4E4',
          muted: '#B0B0B0',
        },
        // Background Colors
        background: {
          primary: '#FFFFFF',
          secondary: '#F4F5F6',
          light: '#FAFCFF',
          gray: '#F6F8FA',
        },
        // Status Colors - Project
        status: {
          'draft-bg': '#888FAA',
          'draft-text': '#FFFFFF',
          'hold-bg': '#CFD2DE',
          'hold-text': '#666F8F',
          'in-process-bg': '#EAA23B',
          'in-process-text': '#3B4154',
          'operational-bg': '#018E42',
          'operational-text': '#FFFFFF',
        },
        // Priority Colors
        priority: {
          'critical-bg': '#FEE2E1',
          'critical-text': '#DC2625',
          'high-bg': '#FFEDD5',
          'high-text': '#9A3413',
          'medium-bg': '#FEF9C3',
          'medium-text': '#854D0F',
          'low-bg': '#DCFCE7',
          'low-text': '#018E42',
        },
        // System Status Colors
        system: {
          'active-bg': '#DCFCE7',
          'active-text': '#018E42',
          'active-indicator': '#018E42',
          'inactive-bg': '#FEE2E1',
          'inactive-text': '#DC2625',
          'inactive-indicator': '#DC2625',
          'success-bg': '#DCFCE7',
          'success-text': '#018E42',
          'error-bg': '#FEE2E1',
          'error-text': '#DC2625',
          'warning-bg': '#FFEDD5',
          'warning-text': '#9A3413',
          'pending-bg': '#FEF9C3',
          'pending-text': '#854D0F',
        },
      },
      fontFamily: {
        sans: ['var(--sidebar-font-family)', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 25px -5px rgba(0, 0, 0, 0.04)',
        'large': '0 10px 40px -10px rgba(0, 0, 0, 0.2)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
