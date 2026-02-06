"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectWallet } from "@/components/wallet/ConnectWallet";
import { useAccount } from "wagmi";
import Image from "next/image";
import { useCircleWallet } from "@/components/providers/CircleWalletProvider";

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
            <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 group shrink-0">
                    <div className="relative h-20 w-32 md:h-32 md:w-40 overflow-hidden rounded-none">
                        <Image
                            src="/eidolonLOGO.png"
                            alt="EIDOLON"
                            fill
                            sizes="(max-width: 768px) 128px, 160px"
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
                    <Link href="/docs" target="_blank" className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg ${isActive('/docs') ? 'text-white bg-white/5 border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Docs</Link>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-3">
                    {isConnected && (
                        <div className="hidden lg:flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-1.5 pr-4 shadow-[0_0_10px_-3px_rgba(165,243,252,0.3)] backdrop-blur-sm transition-all hover:border-primary/50">
                            <div className="relative flex items-center justify-center size-5">
                                <span className="material-symbols-outlined text-primary text-[18px] animate-pulse">language</span>
                            </div>
                            <div className="flex flex-col leading-none">
                                <span className="text-[10px] text-primary/60 font-bold tracking-widest uppercase mb-0.5">Network</span>
                                <span className="text-xs font-display font-medium text-white tracking-wide">{networkName}</span>
                            </div>
                        </div>
                    )}
                    <div className="hidden sm:block">
                        <ConnectWallet />
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden p-2 text-slate-400 hover:text-white transition-all active:scale-90"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        <span className="material-symbols-outlined text-3xl">{isMobileMenuOpen ? 'close' : 'menu'}</span>
                    </button>
                </div>
            </div>

            {isMobileMenuOpen && (
                <div className="md:hidden absolute top-20 left-0 right-0 z-50 bg-[#0a0a0f] border-b border-white/10 shadow-2xl flex flex-col p-6 gap-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex flex-col gap-2 mb-2 border-b border-white/10 pb-4">
                        <ConnectWallet />
                        {isConnected && (
                            <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 shadow-[0_0_10px_-3px_rgba(165,243,252,0.3)]">
                                <div className="relative flex items-center justify-center size-6 rounded-full bg-primary/10 border border-primary/20">
                                    <span className="material-symbols-outlined text-primary text-[18px] animate-pulse">language</span>
                                </div>
                                <div className="flex flex-col leading-none">
                                    <span className="text-[10px] text-primary/60 font-bold tracking-widest uppercase mb-0.5">Connected Network</span>
                                    <span className="text-sm font-display font-medium text-white tracking-wide">{networkName}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className={`p-3 text-lg font-medium transition-all rounded-lg ${isActive('/') ? 'text-white bg-white/10 border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Sanctum</Link>
                    <Link href="/mirror" onClick={() => setIsMobileMenuOpen(false)} className={`p-3 text-lg font-medium transition-all rounded-lg ${isActive('/mirror') ? 'text-white bg-white/10 border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Mirror</Link>
                    <Link href="/analytics" onClick={() => setIsMobileMenuOpen(false)} className={`p-3 text-lg font-medium transition-all rounded-lg ${isActive('/analytics') ? 'text-white bg-white/10 border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Analytics</Link>
                    <Link href="/rewards" onClick={() => setIsMobileMenuOpen(false)} className={`p-3 text-lg font-medium transition-all rounded-lg ${isActive('/rewards') ? 'text-white bg-white/10 border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Rewards</Link>
                    <Link href="/docs" target="_blank" onClick={() => setIsMobileMenuOpen(false)} className={`p-3 text-lg font-medium transition-all rounded-lg ${isActive('/docs') ? 'text-white bg-white/10 border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Docs</Link>
                </div>
            )}
        </nav>
    );
}
