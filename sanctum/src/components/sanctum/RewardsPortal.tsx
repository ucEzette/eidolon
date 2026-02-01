"use client";

import React, { useState, useEffect } from 'react';
import { useActivityHistory } from "@/hooks/useActivityHistory";
import { useGhostPositions, type GhostPosition } from "@/hooks/useGhostPositions";
import { formatDistanceToNow } from 'date-fns';

export function RewardsPortal() {
    const { positions } = useGhostPositions();
    const { events, loading } = useActivityHistory();
    const [currentTime, setCurrentTime] = useState(Date.now());

    // Update time every minute to refresh rewards
    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(Date.now()), 60000);
        return () => clearInterval(interval);
    }, []);

    const activePositions = positions.filter(p => p.status === 'Active');

    // History is now fetched from blockchain via useActivityHistory

    return (
        <div className="max-w-[1440px] mx-auto p-4 md:p-8 lg:p-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 h-full">

            {/* Hero: Global Multiplier Card */}
            <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-[#02040a] p-6 md:p-8 shadow-[0_0_25px_-5px_rgba(6,182,212,0.15)] group">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent pointer-events-none"></div>
                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-400 border border-cyan-500/20">Active Epoch</span>
                            <span className="text-white/50 text-sm font-mono">Ends in 04h 23m</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight font-display">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-white/70">3.42x</span>
                            <span className="text-2xl md:text-3xl text-white/40 font-normal ml-2">Global Boost</span>
                        </h1>
                        <p className="text-white/60 max-w-md text-sm md:text-base">Your permitted liquidity positions are currently earning multiplied yields.</p>
                    </div>
                </div>
            </div>

            {/* Section Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2 font-display">
                    <span className="material-symbols-outlined text-cyan-400">grid_view</span>
                    Permitted Pools & Rewards
                </h2>
            </div>

            {/* Permitted Pools Table (Replacing Vaults Grid) */}
            <div className="w-full glass-panel rounded-xl overflow-hidden border border-white/10 bg-white/[0.02] shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                <th className="px-6 py-4 text-xs font-bold text-white/50 uppercase tracking-wider font-mono">Pool Pair</th>
                                <th className="px-6 py-4 text-xs font-bold text-white/50 uppercase tracking-wider font-mono">Liquidity</th>
                                <th className="px-6 py-4 text-xs font-bold text-white/50 uppercase tracking-wider font-mono">APR (Boosted)</th>
                                <th className="px-6 py-4 text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono text-right">Earned Rewards</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {activePositions.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500 font-mono">
                                        No active permitted pools. Summon a Ghost Permit to start earning.
                                    </td>
                                </tr>
                            ) : (
                                activePositions.map((pos) => {
                                    const rewards = calculateRewards(pos, currentTime);
                                    return (
                                        <tr key={pos.id} className="group hover:bg-white/[0.02] transition-colors">
                                            {/* Pool Pair */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex -space-x-2">
                                                        <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-[#0a1016] flex items-center justify-center text-[10px] font-bold z-10 relative">
                                                            {pos.tokenA[0]}
                                                        </div>
                                                        <div className="w-8 h-8 rounded-full bg-slate-700 border-2 border-[#0a1016] flex items-center justify-center text-[10px] font-bold">
                                                            {pos.tokenB[0]}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-white">{pos.tokenA}/{pos.tokenB}</div>
                                                        <div className="text-xs text-white/40 font-mono capitalize">{pos.liquidityMode}</div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Liquidity */}
                                            <td className="px-6 py-4 font-mono text-white/80">
                                                <div>{pos.amountA} {pos.tokenA}</div>
                                                {pos.liquidityMode === 'dual-sided' && (
                                                    <div className="text-xs text-white/40">+ {pos.amountB} {pos.tokenB}</div>
                                                )}
                                            </td>

                                            {/* APR */}
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-950 text-cyan-400 border border-cyan-800">
                                                    142.5%
                                                </span>
                                            </td>

                                            {/* Earned Rewards */}
                                            <td className="px-6 py-4 text-right">
                                                <div className="font-mono font-bold text-cyan-400 text-lg">
                                                    {rewards.toFixed(6)} EIDOLON
                                                </div>
                                                <div className="text-xs text-white/30">
                                                    ≈ ${(rewards * 0.45).toFixed(2)}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Activity Log (Blockchain Verified) */}
            <div className="w-full glass-panel rounded-xl flex flex-col border border-white/10 bg-white/[0.02]">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <h3 className="font-bold text-lg text-white font-display">Activity Log</h3>
                    <div className="flex gap-2">
                        <span className="text-xs font-mono text-cyan-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                            Blockchain Verified
                        </span>
                    </div>
                </div>

                <div className="p-2 space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="p-8 text-center text-white/30 font-mono text-sm animate-pulse">
                            Scanning blockchain events...
                        </div>
                    ) : events.length === 0 ? (
                        <div className="p-8 text-center text-white/30 font-mono text-sm">No confirmed on-chain activity found.</div>
                    ) : (
                        events.map((event) => (
                            <div key={event.hash} className="group flex flex-col gap-1.5 p-3 rounded hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Badge status={event.type} />
                                        <span className="text-xs font-bold text-white/70">
                                            {event.description}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-white/40 font-mono">
                                        {formatDistanceToNow(event.timestamp, { addSuffix: true })}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="text-sm font-bold text-white font-mono">
                                        Confirmed Transaction
                                    </div>
                                    <a
                                        href={`https://sepolia.uniscan.xyz/tx/${event.hash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="material-symbols-outlined text-[16px] text-white/20 group-hover:text-cyan-400 transition-colors"
                                    >
                                        open_in_new
                                    </a>
                                </div>
                                <div className="text-[10px] font-mono text-white/30 truncate flex items-center gap-2">
                                    <span className="w-1 h-1 bg-white/20 rounded-full" />
                                    <span className="text-cyan-400 font-mono">Tx: {event.hash.slice(0, 10)}...{event.hash.slice(-8)}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

        </div>
    );
}

// Helper to mock reward calculation
function calculateRewards(pos: GhostPosition, currentTime: number) {
    // Mock APR 142.5%
    // Formula: Principal * APR * (TimeElapsed / Year)
    // Simplify: just assume 1 unit of liquidity generates 0.000001 reward per ms for demo
    const timeElapsed = currentTime - pos.timestamp;
    const principal = parseFloat(pos.amountA);
    // This is purely for visual demo
    return principal * 0.0000001 * timeElapsed;
}

function Badge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        'Active': "text-emerald-400 bg-emerald-900/20 border-emerald-500/20",
        'Revoked': "text-red-400 bg-red-900/20 border-red-500/20",
        'Expired': "text-orange-400 bg-orange-900/20 border-orange-500/20",
        'Revoke': "text-red-400 bg-red-900/20 border-red-500/20", // Mapped from event type
        'Interaction': "text-indigo-400 bg-indigo-900/20 border-indigo-500/20",
        'Earned': "text-yellow-400 bg-yellow-900/20 border-yellow-500/20"
    };

    const style = styles[status] || "text-white bg-gray-500/20";

    return (
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${style} uppercase`}>
            {status}
        </span>
    );
}
