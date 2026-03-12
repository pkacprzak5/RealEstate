import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.tsx',
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                navy: {
                    DEFAULT: '#1E3A5F',
                    50: '#EFF6FF',
                    600: '#1E3A5F',
                    700: '#172E4A',
                },
                teal: {
                    DEFAULT: '#0F766E',
                    600: '#0F766E',
                    700: '#0D6358',
                },
            },
        },
    },
    plugins: [forms],
};
