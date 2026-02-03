"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectWallet } from "@/components/wallet/ConnectWallet";
import { useAccount } from "wagmi";
import Image from "next/image";
import { useCircleWallet } from "@/components/providers/CircleWalletProvider";
import { NetworkGuard } from "@/components/providers/NetworkGuard";

export function Navbar() {
    const pathname = usePathname();
    const { isConnected: isWagmiConnected, chain } = useAccount();
    const { isConnected: isCircleConnected } = useCircleWallet();

    const isConnected = isWagmiConnected || isCircleConnected;
    const networkName = isCircleConnected ? "Unichain Sepolia" : (chain?.name || "Unknown Network");

    const isActive = (path: string) => pathname === path;

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-md">
            <NetworkGuard />
            <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="relative h-32 w-32 overflow-hidden rounded-none">
                        <Image
                            src="/eidolonLOGO.png"
                            alt="EIDOLON"
                            fill
                            sizes="(max-width: 768px) 100px, 128px"
                            className="object-contain filter brightness-125 drop-shadow-[0_0_8px_rgba(165,243,252,0.5)]"
                            priority
                        />
                    </div>
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-1">
                    <Link href="/" className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg ${isActive('/') ? 'text-white bg-white/5 border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Sanctum</Link>
                    <Link href="/mirror" className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg ${isActive('/mirror') ? 'text-white bg-white/5 border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Mirror</Link>
                    <Link href="/analytics" className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg ${isActive('/analytics') ? 'text-white bg-white/5 border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Analytics</Link>
                    <Link href="/rewards" className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg ${isActive('/rewards') ? 'text-white bg-white/5 border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Rewards</Link>
                    <Link href="#" className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">Docs</Link>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-3">
                    {isConnected && (
                        <div className="hidden sm:flex items-center gap-2 rounded-full border border-primary/20 bg-[#13131a] px-3 py-1.5 pr-4">
                            <div className="relative flex size-2.5">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex size-2.5 rounded-full bg-green-500"></span>
                            </div>
                            <span className="text-xs font-mono font-medium text-slate-300">{networkName}</span>
                        </div>
                    )}
                    <div className="hidden md:block">
                        <ConnectWallet />
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden p-2 text-slate-400 hover:text-white"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        <span className="material-symbols-outlined text-2xl">{isMobileMenuOpen ? 'close' : 'menu'}</span>
                    </button>
                </div>
            </div>

            {isMobileMenuOpen && (
                <div className="md:hidden absolute top-20 left-0 right-0 z-50 bg-[#0a0a0f] border-b border-white/10 shadow-2xl flex flex-col p-6 gap-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex flex-col gap-2 mb-2 border-b border-white/10 pb-4">
                        <ConnectWallet />
                        {isConnected && (
                            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-[#13131a] px-3 py-2">
                                <div className="relative flex size-2.5">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex size-2.5 rounded-full bg-green-500"></span>
                                </div>
                                <span className="text-xs font-mono font-medium text-slate-300">{networkName}</span>
                            </div>
                        )}
                    </div>

                    <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className={`p-3 text-lg font-medium transition-all rounded-lg ${isActive('/') ? 'text-white bg-white/10 border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Sanctum</Link>
                    <Link href="/mirror" onClick={() => setIsMobileMenuOpen(false)} className={`p-3 text-lg font-medium transition-all rounded-lg ${isActive('/mirror') ? 'text-white bg-white/10 border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Mirror</Link>
                    <Link href="/analytics" onClick={() => setIsMobileMenuOpen(false)} className={`p-3 text-lg font-medium transition-all rounded-lg ${isActive('/analytics') ? 'text-white bg-white/10 border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Analytics</Link>
                    <Link href="/rewards" onClick={() => setIsMobileMenuOpen(false)} className={`p-3 text-lg font-medium transition-all rounded-lg ${isActive('/rewards') ? 'text-white bg-white/10 border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Rewards</Link>
                </div>
            )}
        </nav>
    );
}
