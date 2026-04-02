/** @type {import('tailwindcss').Config} */
module.exports = {
  // ADD "./app/**/*.{js,jsx,ts,tsx}" to the list below
  content: [
    "./app/**/*.{js,jsx,ts,tsx}", 
    "./components/**/*.{js,jsx,ts,tsx}",
    "./App.tsx" 
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#1B4332",    
        secondary: "#E8F5E9", 
        tertiary: "#FF9F1C" ,
        accent: "#FF8A00",     
      },
    },
  },
  plugins: [],
};