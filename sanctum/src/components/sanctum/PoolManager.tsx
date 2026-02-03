"use client";

import { useState } from "react";
import { TOKENS, TOKEN_MAP, type Token } from "@/config/tokens";
import { TokenSelector } from "@/components/sanctum/TokenSelector";
import { CONTRACTS } from "@/config/web3";
import { toast } from "sonner";
import { useAccount, useWriteContract } from "wagmi";
import { getPoolId } from "@/utils/uniswap";

// Mock list of "Official" Pools
const OFFICIAL_POOLS = [
    { tokenA: "ETH", tokenB: "USDC", fee: 3000, label: "Standard (0.3%)" },
    { tokenA: "ETH", tokenB: "USDC", fee: 500, label: "Stable (0.05%)" },
];

export function PoolManager() {
    const [isTokenAOpen, setIsTokenAOpen] = useState(false);
    const [isTokenBOpen, setIsTokenBOpen] = useState(false);
    const [tokenA, setTokenA] = useState<Token>(TOKEN_MAP["ETH"]);
    const [tokenB, setTokenB] = useState<Token>(TOKEN_MAP["USDC"]);
    const [feeTier, setFeeTier] = useState<number>(3000);
    const [initialPrice, setInitialPrice] = useState<string>("3000"); // USDC per ETH

    const { isConnected } = useAccount();

    const handleInitialize = async () => {
        if (!isConnected) {
            toast.error("Please connect wallet");
            return;
        }

        toast.promise(new Promise(resolve => setTimeout(resolve, 2000)), {
            loading: 'Initializing Pool...',
            success: 'Pool Initialized! (Mock)',
            error: 'Failed to initialize'
        });

        // TODO: Implement actual V4 initialization call
        // 1. Calculate SqrtPriceX96 from initialPrice
        // 2. Call PositionManager.initializePool(key, sqrtPriceX96)
    };

    return (
        <div className="w-full h-full bg-void border border-white/5 p-1 relative overflow-hidden animate-fade-in-up delay-100 flex flex-col">
            <div className="bg-black/40 p-6 relative backdrop-blur-md flex-1">
                <h2 className="text-xl font-display font-bold text-white mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-phantom-cyan">water_drop</span>
                    Sanctum Pools
                </h2>

                {/* Existing Pools List */}
                <div className="space-y-3 mb-8">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Verified Pools</h3>
                    {OFFICIAL_POOLS.map((pool, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:border-phantom-cyan/30 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="flex -space-x-2">
                                    <div className="h-6 w-6 rounded-full bg-slate-700 flex items-center justify-center text-[8px] font-bold text-white border border-black">{pool.tokenA}</div>
                                    <div className="h-6 w-6 rounded-full bg-slate-700 flex items-center justify-center text-[8px] font-bold text-white border border-black">{pool.tokenB}</div>
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-white flex items-center gap-2">
                                        {pool.tokenA}/{pool.tokenB}
                                        <span className="text-[10px] bg-slate-800 px-1.5 rounded text-slate-400">{pool.fee / 10000}%</span>
                                    </div>
                                    <div className="text-[10px] text-phantom-cyan flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[10px]">webhook</span>
                                        Eidolon Hook
                                    </div>
                                </div>
                            </div>
                            <button className="text-xs font-medium text-slate-400 hover:text-white px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors">
                                View
                            </button>
                        </div>
                    ))}
                </div>

                {/* Create Pool Section */}
                <div className="space-y-4 pt-6 border-t border-white/10">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                        Initialize New Pool
                        <span className="text-[10px] text-slate-600 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">Advanced</span>
                    </h3>

                    {/* Token Selection */}
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => setIsTokenAOpen(true)} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg hover:border-white/30 transition-all">
                            <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-bold">{tokenA.symbol[0]}</div>
                                <span className="font-mono font-bold">{tokenA.symbol}</span>
                            </div>
                            <span className="material-symbols-outlined text-slate-500">expand_more</span>
                        </button>
                        <button onClick={() => setIsTokenBOpen(true)} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg hover:border-white/30 transition-all">
                            <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-cyan-500 flex items-center justify-center text-[10px] font-bold">{tokenB.symbol[0]}</div>
                                <span className="font-mono font-bold">{tokenB.symbol}</span>
                            </div>
                            <span className="material-symbols-outlined text-slate-500">expand_more</span>
                        </button>
                    </div>

                    {/* Fee Tier Selection */}
                    <div className="grid grid-cols-3 gap-2">
                        {[500, 3000, 10000].map((fee) => (
                            <button
                                key={fee}
                                onClick={() => setFeeTier(fee)}
                                className={`py-2 text-xs font-mono font-bold rounded border transition-all ${feeTier === fee
                                    ? 'bg-phantom-cyan/20 border-phantom-cyan text-phantom-cyan'
                                    : 'bg-transparent border-white/10 text-slate-500 hover:text-white'
                                    }`}
                            >
                                {fee / 10000}%
                            </button>
                        ))}
                    </div>

                    {/* Initial Price */}
                    <div className="space-y-1">
                        <label className="text-xs text-slate-500 font-medium ml-1">Initial Price ({tokenB.symbol} per {tokenA.symbol})</label>
                        <div className="relative group/input">
                            <input
                                type="text"
                                value={initialPrice}
                                onChange={(e) => setInitialPrice(e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 font-mono text-sm text-white focus:border-phantom-cyan focus:outline-none transition-colors"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleInitialize}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-bold text-white uppercase tracking-wider hover:border-phantom-cyan/50 hover:text-phantom-cyan transition-all"
                    >
                        Initialize Pool
                    </button>
                </div>
            </div>

            <TokenSelector
                isOpen={isTokenAOpen}
                onClose={() => setIsTokenAOpen(false)}
                onSelect={(t) => { setTokenA(t); setIsTokenAOpen(false); }}
            />
            <TokenSelector
                isOpen={isTokenBOpen}
                onClose={() => setIsTokenBOpen(false)}
                onSelect={(t) => { setTokenB(t); setIsTokenBOpen(false); }}
            />
        </div>
    );
}
