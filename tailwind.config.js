/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#0D0D0D",
                black: "#0A0A0A",
                surface: "#181818",
                surface2: "#1F1F1F",
                border: "#2A2A2A",
                border2: "#333333",
                textPrimary: "#E8E4DC",
                text2: "#8A8680",
                text3: "#555250",
                red: {
                    DEFAULT: "#D94040",
                    dim: "#5C1A1A",
                },
                amber: {
                    DEFAULT: "#C87D2F",
                    dim: "#3D2610",
                },
                green: {
                    DEFAULT: "#4A8C5C",
                    dim: "#1A3324",
                },
                white: "#F0EDE8",
            },
            fontFamily: {
                mono: ['"Space Mono"', 'monospace'],
                condensed: ['"Barlow Condensed"', 'sans-serif'],
                body: ['"Barlow"', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
