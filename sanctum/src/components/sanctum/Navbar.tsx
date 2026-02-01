"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectWallet } from "@/components/wallet/ConnectWallet";
import { useAccount } from "wagmi";
import Image from "next/image";

export function Navbar() {
    const pathname = usePathname();
    const { isConnected, chain } = useAccount();

    const isActive = (path: string) => pathname === path;

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-md">
            <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="relative h-32 w-32 overflow-hidden rounded-none">
                        <Image
                            src="/eidolonLOGO.png"
                            alt="EIDOLON"
                            fill
                            className="object-contain filter brightness-125 drop-shadow-[0_0_8px_rgba(165,243,252,0.5)]"
                            priority
                        />
                    </div>
                    <h2 className="text-white text-2xl font-display font-bold tracking-widest uppercase drop-shadow-lg hidden sm:block">EIDOLON</h2>
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
                            <span className="text-xs font-mono font-medium text-slate-300">{chain?.name || "Unknown Network"}</span>
                        </div>
                    )}
                    <ConnectWallet />

                    {/* Mobile Menu Button */}
                    <button
                        className="md:hidden p-2 text-slate-400 hover:text-white"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        <span className="material-symbols-outlined text-2xl">{isMobileMenuOpen ? 'close' : 'menu'}</span>
                    </button>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="md:hidden absolute top-20 left-0 w-full bg-[#0a0a0f] border-b border-white/10 py-4 px-6 flex flex-col gap-2 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200">
                    <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className={`px-4 py-3 text-base font-medium transition-colors rounded-lg ${isActive('/') ? 'text-white bg-white/5 border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Sanctum</Link>
                    <Link href="/mirror" onClick={() => setIsMobileMenuOpen(false)} className={`px-4 py-3 text-base font-medium transition-colors rounded-lg ${isActive('/mirror') ? 'text-white bg-white/5 border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Mirror</Link>
                    <Link href="/analytics" onClick={() => setIsMobileMenuOpen(false)} className={`px-4 py-3 text-base font-medium transition-colors rounded-lg ${isActive('/analytics') ? 'text-white bg-white/5 border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Analytics</Link>
                    <Link href="/rewards" onClick={() => setIsMobileMenuOpen(false)} className={`px-4 py-3 text-base font-medium transition-colors rounded-lg ${isActive('/rewards') ? 'text-white bg-white/5 border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>Rewards</Link>
                    <Link href="#" className="px-4 py-3 text-base font-medium text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">Docs</Link>
                </div>
            )}
        </nav>
    );
}
