import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                violet: {
                    950: "#1a0a2e",
                },
                primary: "#895af6",
                "primary-glow": "#895af680",
                secondary: "#06b6d4",
                "background-light": "#f6f5f8",
                "background-dark": "#0b0814",
                "card-dark": "#161023",
                "surface-dark": "#211834",
                "border-dark": "#2e2249",
                "text-muted": "#a290cb",
                void: "#0a0a0f",
                panel: "#13131a",
            },
            backgroundImage: {
                'aurora': 'radial-gradient(circle at 50% -20%, #4c1d95 0%, #161023 45%, #0b0814 100%)',
                'noise': 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' opacity=\'0.05\'/%3E%3C/svg%3E")',
            },
            boxShadow: {
                'glow': '0 0 20px -5px var(--tw-shadow-color)',
                'neon': '0 0 10px #895af6, 0 0 20px #895af6',
                'neon-cyan': '0 0 10px rgba(6, 182, 212, 0.5), 0 0 20px rgba(6, 182, 212, 0.3)',
            },
            animation: {
                "glow-pulse": "glow-pulse 4s ease-in-out infinite",
                "shimmer": "shimmer 1.5s infinite",
            },
            keyframes: {
                "glow-pulse": {
                    "0%, 100%": { opacity: "0.5", transform: "scale(1)" },
                    "50%": { opacity: "0.8", transform: "scale(1.05)" },
                },
                "shimmer": {
                    "0%": { transform: "translateX(-100%)" },
                    "100%": { transform: "translateX(100%)" }
                }
            },
            fontFamily: {
                display: ["Inter", "sans-serif"],
                mono: ["JetBrains Mono", "monospace"],
            },
        },
    },
    plugins: [],
};

export default config;
