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
                primary: {
                    50: '#eff6ff',
                    500: '#3b82f6',
                    600: '#2563eb',
                    700: '#1d4ed8',
                },
                priority: {
                    p1: '#ef4444', // red
                    p2: '#f97316', // orange
                    p3: '#eab308', // yellow
                    p4: '#22c55e', // green
                }
            },
        },
    },
    plugins: [
        // require('@tailwindcss/typography'), // Temporarily disabled to fix page designs
    ],
} 