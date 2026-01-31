"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectWallet } from "@/components/wallet/ConnectWallet";
import { useAccount, useNetwork } from "wagmi";

export function Navbar() {
    const pathname = usePathname();
    const { isConnected } = useAccount();
    const { chain } = useNetwork();

    const isActive = (path: string) => pathname === path;

    return (
        <nav className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-md">
            <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
                <div className="flex items-center gap-4">
                    {/* Logo Icon */}
                    <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-secondary/10 border border-primary/20 text-white shadow-[0_0_15px_rgba(137,90,246,0.2)]">
                        <span className="material-symbols-outlined text-2xl">diamond</span>
                    </div>
                    <h2 className="text-white text-xl font-bold tracking-tight">EIDOLON</h2>
                </div>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-1">
                    <Link
                        href="/"
                        className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg ${isActive('/') ? 'text-white bg-white/5 border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        Sanctum
                    </Link>
                    <Link
                        href="/mirror"
                        className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg ${isActive('/mirror') ? 'text-white bg-white/5 border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                    >
                        Mirror
                    </Link>
                    <Link
                        href="#"
                        className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                    >
                        Docs
                    </Link>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-3">
                    {/* Network Status */}
                    {isConnected && (
                        <div className="hidden sm:flex items-center gap-2 rounded-full border border-primary/20 bg-[#13131a] px-3 py-1.5 pr-4">
                            <div className="relative flex size-2.5">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex size-2.5 rounded-full bg-green-500"></span>
                            </div>
                            <span className="text-xs font-mono font-medium text-slate-300">{chain?.name || "Unknown Network"}</span>
                        </div>
                    )}

                    {/* Connect Wallet */}
                    <ConnectWallet />
                </div>
            </div>
        </nav>
    );
}
