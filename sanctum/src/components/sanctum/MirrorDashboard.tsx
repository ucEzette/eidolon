"use client";

import { useAccount } from "wagmi";

export function MirrorDashboard() {
    const { isConnected } = useAccount();

    if (!isConnected) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="glass-panel p-8 rounded-xl text-center max-w-md">
                    <span className="material-symbols-outlined text-4xl text-slate-500 mb-4">lock</span>
                    <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
                    <p className="text-slate-400">Connect your wallet to view your Mirror Dashboard.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto flex max-w-7xl flex-col gap-8">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card 1: Virtual TVL */}
                <div className="glass-card relative overflow-hidden rounded-xl p-6 group">
                    <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl transition-all group-hover:bg-primary/20"></div>
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Virtual TVL</p>
                        <span className="material-symbols-outlined text-slate-500">query_stats</span>
                    </div>
                    <div className="flex items-baseline gap-3">
                        <h3 className="text-3xl font-bold text-white font-mono tracking-tighter">$4,203,192<span className="text-slate-500 text-xl">.00</span></h3>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                        <span className="material-symbols-outlined text-sm">trending_up</span>
                        <span>+1.2% (24h)</span>
                    </div>
                </div>

                {/* Card 2: Ghost Permits */}
                <div className="glass-card relative overflow-hidden rounded-xl p-6 group">
                    <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-secondary/10 blur-3xl transition-all group-hover:bg-secondary/20"></div>
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Ghost Permits</p>
                        <span className="material-symbols-outlined text-slate-500">badge</span>
                    </div>
                    <div className="flex items-baseline gap-3">
                        <h3 className="text-3xl font-bold text-white font-mono tracking-tighter">1,024</h3>
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">Active</span>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        <span>System Status: Stable</span>
                    </div>
                </div>

                {/* Card 3: Pending Rewards */}
                <div className="glass-card relative overflow-hidden rounded-xl p-6 group border-primary/30">
                    <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl transition-all group-hover:bg-primary/30"></div>
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-primary text-sm font-bold uppercase tracking-wider drop-shadow-[0_0_8px_rgba(137,90,246,0.5)]">Your Rewards</p>
                        <span className="material-symbols-outlined text-primary">savings</span>
                    </div>
                    <div className="flex items-baseline justify-between w-full">
                        <h3 className="text-3xl font-bold text-white font-mono tracking-tighter">450.22 <span className="text-sm font-sans text-slate-400">EID</span></h3>
                        <button className="bg-primary/10 hover:bg-primary/20 border border-primary/30 text-xs font-bold text-white px-3 py-1.5 rounded-lg uppercase tracking-wide transition-all">
                            Claim
                        </button>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        <span>Next epoch in 4h 12m</span>
                    </div>
                </div>
            </div>

            {/* Active Positions Section */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">view_list</span>
                        Active Mirror Positions
                    </h2>
                    <div className="flex gap-2">
                        <button className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                            <span className="material-symbols-outlined">filter_list</span>
                        </button>
                        <button className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                            <span className="material-symbols-outlined">refresh</span>
                        </button>
                    </div>
                </div>

                {/* Table Container */}
                <div className="glass-card rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Asset Pair</th>
                                    <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Staked Amount</th>
                                    <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Expiry Countdown</th>
                                    <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider">APY</th>
                                    <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider text-right">Status</th>
                                    <th className="px-6 py-4 text-xs font-medium text-slate-400 uppercase tracking-wider text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-sm">
                                {/* Row 1 */}
                                <tr className="group hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex -space-x-2">
                                                <div className="h-8 w-8 rounded-full bg-slate-700 ring-2 ring-[#13131a] flex items-center justify-center text-[10px] font-bold text-white bg-gradient-to-br from-blue-600 to-indigo-600">ETH</div>
                                                <div className="h-8 w-8 rounded-full bg-slate-700 ring-2 ring-[#13131a] flex items-center justify-center text-[10px] font-bold text-white bg-gradient-to-br from-blue-400 to-cyan-400">USDC</div>
                                            </div>
                                            <div>
                                                <div className="font-bold text-white">ETH-USDC</div>
                                                <div className="text-xs text-slate-500">Uniswap V3</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-slate-300">
                                        5.20 <span className="text-xs text-slate-500">ETH</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 font-mono text-emerald-400">
                                            <span className="material-symbols-outlined text-base">timer</span>
                                            14h 22m 10s
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-primary font-bold">12.4%</td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                            </span>
                                            Active
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-slate-400 hover:text-white transition-colors">
                                            <span className="material-symbols-outlined">more_vert</span>
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination/Footer of table */}
                    <div className="border-t border-white/5 bg-white/[0.02] px-6 py-3 flex items-center justify-between">
                        <span className="text-xs text-slate-500">Showing 1 of 1 positions</span>
                        <div className="flex gap-1">
                            <button disabled className="p-1 rounded hover:bg-white/10 text-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                <span className="material-symbols-outlined text-sm">chevron_left</span>
                            </button>
                            <button disabled className="p-1 rounded hover:bg-white/10 text-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                <span className="material-symbols-outlined text-sm">chevron_right</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
