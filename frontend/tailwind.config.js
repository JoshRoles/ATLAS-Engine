/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        ae: {
          bg: '#070a0e',
          panel: '#0c1018',
          card: '#101520',
          border: '#192030',
          borderHi: '#253248',
          green: '#00e5a0',
          red: '#ff3d6b',
          amber: '#f5a623',
          blue: '#3b9eff',
          purple: '#c084fc',
          text: '#dce6f5',
          mid: '#6a7a99',
          dim: '#2e3d58',
        },
      },
    },
  },
  plugins: [],
}

