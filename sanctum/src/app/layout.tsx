import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/components/providers/Web3Provider";

const inter = Inter({
  variable: "--font-inter",
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
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased 
                    bg-gradient-to-br from-gray-950 via-violet-950/20 to-gray-950 
                    min-h-screen text-white font-sans`}
      >
        <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  );
}
