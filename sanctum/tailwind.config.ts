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
                // Base Theme
                primary: "#A5F3FC", // Phantom Cyan
                "primary-glow": "rgba(165, 243, 252, 0.5)",
                secondary: "#0891B2", // Signal Cyan

                // Backgrounds
                "background-light": "#0a0a0f", // Unused
                "background-dark": "#030303", // Void
                void: "#030303",
                obsidian: "#000000",

                // Surfaces
                "card-dark": "rgba(0, 0, 0, 0.6)",
                "surface-dark": "#000000",
                panel: "#000000",

                // Borders & Text
                "border-dark": "rgba(255, 255, 255, 0.08)",
                "text-muted": "#94A3B8", // Slate-400
                "glass-border": "rgba(255, 255, 255, 0.08)",
                "glass-surface": "rgba(20, 25, 30, 0.4)",

                // Stitch Component Specifics
                "eidolon-cyan": "#A5F3FC",
                "eidolon-violet": "#6325f4", // Keep for legacy
                "phantom-cyan": "#A5F3FC",
                "signal-cyan": "#0891B2",
                "signal-crimson": "#DC2626",
                danger: "#DC2626",
                "danger-dark": "#7f1d1d",
                accent: "#A5F3FC",
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
                display: ["var(--font-orbitron)", "sans-serif"],
                mono: ["var(--font-jetbrains-mono)", "monospace"],
                sans: ["var(--font-inter)", "sans-serif"],
            },
        },
    },
    plugins: [],
};

export default config;
