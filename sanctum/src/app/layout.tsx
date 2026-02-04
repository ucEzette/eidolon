import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/components/providers/Web3Provider";
import { Toaster } from "sonner";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EIDOLON Sanctum | Zero-TVL Liquidity Protocol",
  description: "The Quantum Realm of DeFi - Provide liquidity without locking capital",
  keywords: ["DeFi", "Uniswap", "Liquidity", "Permit2", "Web3"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body
        className={`${outfit.variable} ${jetbrainsMono.variable} antialiased 
                    bg-background-dark min-h-screen text-white font-sans overflow-x-hidden`}
      >
        <Web3Provider>{children}</Web3Provider>
        <Toaster position="bottom-right" theme="dark" />
      </body>
    </html>
  );
}
