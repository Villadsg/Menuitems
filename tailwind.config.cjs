// tailwind.config.cjs

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,js,svelte,ts}', // Include all Svelte files
    './node_modules/flowbite-svelte/**/*.{html,js,svelte,ts}', // Include Flowbite Svelte components
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('daisyui')],
  daisyui: {
    themes: [
      {
        mytheme: {
          'primary': '#4CAF50',
          'secondary': '#FF5722',
          'accent': '#3b82f6',
          'neutral': '#3d4451',
          'base-100': '#ffffff',
          'info': '#2094f3',
          'success': '#009485',
          'warning': '#ff9900',
          'error': '#ff5724',
        },
      },
      'light', // Optional: you can also extend or use daisyUI built-in themes
      'dark',
    ],
  },
};
