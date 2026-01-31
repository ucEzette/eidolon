"use client";

import { useState } from "react";
import { TokenSelector } from "@/components/sanctum/TokenSelector";

export function SummoningPortal() {
    const [isTokenSelectorOpen, setIsTokenSelectorOpen] = useState(false);

    return (
        <div className="w-full max-w-[560px] glass-card rounded-2xl p-1 shadow-2xl shadow-primary/10 relative overflow-hidden animate-fade-in-up bg-[#161023]/60 backdrop-blur-xl border border-[#895af6]/15">
            {/* Top decorative glow line */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>

            <div className="bg-background-dark/40 rounded-xl p-8 backdrop-blur-sm relative">
                {/* Header */}
                <div className="mb-8 text-center">
                    <div className="inline-flex items-center justify-center p-3 mb-4 rounded-full bg-primary/10 border border-primary/20 shadow-[0_0_15px_-3px_rgba(137,90,246,0.3)]">
                        <span className="material-symbols-outlined text-primary text-2xl">pentagon</span>
                    </div>
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/70 tracking-tight mb-2">Summon Ghost Permit</h1>
                    <p className="text-text-muted text-sm">Authorize zero-TVL liquidity without locking assets.</p>
                </div>

                {/* Asset Input Section */}
                <div className="space-y-6">
                    {/* Token Input Group */}
                    <div className="relative group/input">
                        <div className="flex justify-between items-center mb-2 px-1">
                            <label className="text-sm font-medium text-white/80">Asset Amount</label>
                            <span className="text-xs font-mono text-text-muted">Balance: 142.5 ETH</span>
                        </div>
                        <div className="relative flex items-center bg-surface-dark border border-border-dark hover:border-primary/40 focus-within:border-primary/80 focus-within:shadow-[0_0_15px_-5px_#895af6] rounded-xl transition-all duration-300">
                            {/* Input */}
                            <input
                                className="w-full bg-transparent border-none focus:ring-0 text-white font-mono text-3xl font-medium placeholder-white/20 p-5 pr-32 caret-primary"
                                placeholder="0.00"
                                type="text"
                                defaultValue="5.0"
                            />
                            {/* Token Selector Pill */}
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <button
                                    onClick={() => setIsTokenSelectorOpen(true)}
                                    className="flex items-center gap-2 bg-[#2e2249] hover:bg-[#3a2c5b] text-white pl-2 pr-3 py-1.5 rounded-lg border border-white/5 transition-colors shadow-lg"
                                >
                                    <div className="size-6 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                                        <img alt="Ethereum logo" className="w-4 h-4" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCwND7wf2eTPp9JWfuDxhsMogxcpN-WI4C7CVmUkEIzesRJiwQLsOkTk6iDEK07NKRtEW9Qhx7EtR59x0BcyFsxwoXja9s0anHvC5EBn9s0yIaILG-5_EY-q5BOisYirItOYAmAR4J73ZmvpGxJRLnc9GWmarPt7Td0qPeIkaWGaRHEiZqwTlVjxOYjZzDO_PMBR12zUUkvyBLc4FpoIzMjBWTHpXcWrKWWMxymMQNgIOSEMSyf6fc36rp9ImnGcgetDkicnpKLeu0" />
                                    </div>
                                    <span className="font-bold text-sm">ETH</span>
                                    <span className="material-symbols-outlined text-lg text-white/50">expand_more</span>
                                </button>
                            </div>
                        </div>
                        {/* USD Value */}
                        <div className="mt-2 px-1 flex justify-end">
                            <p className="text-text-muted text-xs font-mono">≈ $12,482.35 USD</p>
                        </div>
                    </div>

                    {/* Validity Slider */}
                    <div className="p-5 rounded-xl bg-white/5 border border-white/5">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2 text-white/90">
                                <span className="material-symbols-outlined text-primary text-[20px]">hourglass_top</span>
                                <span className="text-sm font-medium">Permit Validity</span>
                            </div>
                            <span className="text-primary font-mono font-bold text-sm">7 Days</span>
                        </div>
                        <div className="relative w-full h-8 flex items-center">
                            <input className="w-full z-10 accent-primary" max="4" min="1" step="1" type="range" defaultValue="3" />
                            {/* Visual Track Background */}
                            <div className="absolute w-full flex justify-between px-[10px] pointer-events-none text-[10px] text-white/30 font-mono mt-8">
                                <span>1H</span>
                                <span>24H</span>
                                <span className="text-primary font-bold">7D</span>
                                <span>30D</span>
                            </div>
                        </div>
                    </div>

                    {/* Transaction Summary Details */}
                    <div className="border-t border-white/10 pt-5 space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-text-muted">Network Fee</span>
                            <div className="flex items-center gap-1 font-mono text-white/90">
                                <span className="material-symbols-outlined text-xs">local_gas_station</span>
                                <span>$4.52</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-text-muted">Nonce</span>
                            <span className="font-mono text-white/50">#492</span>
                        </div>
                    </div>

                    {/* Action Button */}
                    <button className="relative w-full group overflow-hidden rounded-xl bg-primary hover:bg-[#7c4df0] transition-all duration-300 h-14 shadow-neon shadow-primary/20">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
                        <div className="flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-white animate-pulse">fingerprint</span>
                            <span className="text-white text-base font-bold tracking-wide">SIGN GHOST PERMIT</span>
                        </div>
                    </button>
                </div>
            </div>

            {/* Bottom decorative glow line */}
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>

            {/* Render Token Selector if open */}
            {isTokenSelectorOpen && <TokenSelector onClose={() => setIsTokenSelectorOpen(false)} />}
        </div>
    );
}
