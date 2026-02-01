"use client";

import React, { useState } from 'react';

interface TokenSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (token: any) => void;
}

export function TokenSelector({ isOpen, onClose, onSelect }: TokenSelectorProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0a0812]/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-[520px] rounded-[2rem] p-[1px] bg-gradient-to-br from-cyan-400 via-cyan-600 to-indigo-900 shadow-[0_0_40px_-10px_rgba(34,211,238,0.4)]">
                <div className="bg-[#02040a] relative flex h-[700px] w-full flex-col overflow-hidden rounded-[2rem]">

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
                        <h2 className="text-xl font-bold tracking-tight text-white font-display">Summon Asset</h2>
                        <button
                            onClick={onClose}
                            className="group flex h-8 w-8 items-center justify-center rounded-full bg-white/5 transition-colors hover:bg-white/10 text-white/70 hover:text-white"
                        >
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>

                    {/* Search */}
                    <div className="px-6 pt-6 pb-2">
                        <div className="relative group/search">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-cyan-200/50 group-focus-within/search:text-cyan-400 transition-colors">
                                <span className="material-symbols-outlined text-[20px]">search</span>
                            </div>
                            <input
                                className="w-full h-12 rounded-full bg-[#0a0812]/60 border border-white/10 pl-11 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50 focus:shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all duration-300 font-display"
                                placeholder="Search by name or paste address"
                                type="text"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Trending */}
                    <div className="px-6 py-4">
                        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-white/40">Trending Vessels</p>
                        <div className="flex flex-wrap gap-2">
                            <TrendingChip symbol="ETH" change="+1.2%" isPositive />
                            <TrendingChip symbol="USDC" change="+0.01%" isPositive />
                            <TrendingChip symbol="OP" change="-2.4%" isPositive={false} />
                        </div>
                    </div>

                    {/* Token List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-4 space-y-1">
                        <TokenRow symbol="ETH" name="Ethereum" amount="14.0532" value="$24,203.44" type="LAYER 1" />
                        <TokenRow symbol="USDC" name="USD Coin" amount="2,400.00" value="$2,400.00" />
                        <TokenRow symbol="ARB" name="Arbitrum" amount="5,230.50" value="$6,119.68" type="L2" />
                        <TokenRow symbol="WBTC" name="Wrapped BTC" amount="0.0450" value="$2,340.12" />
                        <TokenRow symbol="LINK" name="Chainlink" amount="0" value="$0.00" />
                        <TokenRow symbol="SOL" name="Solana" amount="150.00" value="$12,450.00" />
                    </div>

                </div>
            </div>
        </div>
    );
}

function TrendingChip({ symbol, change, isPositive }: any) {
    return (
        <button className="group flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 border border-white/5 transition-all hover:bg-white/10 hover:border-cyan-400/50 hover:shadow-[0_0_10px_rgba(34,211,238,0.2)]">
            <span className="text-sm font-medium text-white">{symbol}</span>
            <span className={`font-mono text-xs flex items-center ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                <span className="material-symbols-outlined text-[10px] mr-0.5">
                    {isPositive ? 'arrow_upward' : 'arrow_downward'}
                </span>
                {change}
            </span>
        </button>
    )
}

function TokenRow({ symbol, name, amount, value, type }: any) {
    return (
        <div className="group relative flex cursor-pointer items-center justify-between rounded-xl p-4 transition-all duration-300 hover:bg-white/5 border border-transparent hover:border-white/10">
            <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10 group-hover:border-cyan-400/50 transition-colors shadow-lg">
                    {/* Placeholder Icon */}
                    <span className="text-xs font-bold text-white/40">{symbol[0]}</span>
                </div>
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-white group-hover:text-cyan-200 transition-colors">{symbol}</span>
                        {type && <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-white/60">{type}</span>}
                    </div>
                    <span className="text-sm text-white/40 group-hover:text-white/60 transition-colors">{name}</span>
                </div>
            </div>
            <div className="flex flex-col items-end gap-0.5">
                <span className="font-mono text-sm font-medium text-white group-hover:text-cyan-300 transition-colors">{amount}</span>
                <span className="font-mono text-xs text-white/40 group-hover:text-white/60">{value}</span>
            </div>
        </div>
    )
}
