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
    require('flowbite/plugin'), // Include Flowbite as a Tailwind plugin
  ],
};
