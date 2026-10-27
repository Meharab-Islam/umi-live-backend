/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/**/*.{html,js}",
    "./src/**/*.{html,js,scss}"
  ],
  theme: {
    extend: {
      colors: {
        game: {
          greenLight: '#c0f0cc',
          greenMid: '#7fd898',
          greenDark: '#4abf68',
          card1: '#ffe83c',
          card2: '#ffd000',
          card3: '#f8be00',
          btnGreen1: '#4dd86a',
          btnGreen2: '#2ab84a',
          btnGreen3: '#1a9838',
          btnOrange1: '#ffb830',
          btnOrange2: '#f09010',
          btnOrange3: '#c07000',
        }
      },
      fontFamily: {
        nunito: ['Nunito', 'sans-serif'],
        fredoka: ['Fredoka', 'Nunito', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
