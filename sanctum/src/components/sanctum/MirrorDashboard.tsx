"use client";

import { useState } from "react";
import { useEidolonHook } from "@/hooks/useEidolonHook";

export function MirrorDashboard() {
    const [showRevokeModal, setShowRevokeModal] = useState(false);
    const { fees, membership } = useEidolonHook();

    // For demo purposes, we'll calculate rewards based on membership status
    // In a real app, this would query the contract or an indexer for actual earnings
    const userTier = membership.isMember ? "Pro Member" : "Standard User";
    const feeTier = membership.isMember ? "0%" : `${fees.dualSided}%`;

    return (
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 lg:px-8">
            {/* Top Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card 1: Virtual TVL */}
                <div className="relative overflow-hidden p-6 group bg-black border border-white/10 hover:border-phantom-cyan/50 transition-all">
                    <div className="absolute -right-10 -top-10 h-32 w-32 bg-phantom-cyan/5 blur-3xl transition-all group-hover:bg-phantom-cyan/10"></div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Virtual TVL</p>
                            {/* Info Tooltip */}
                            <div className="relative group/info">
                                <button className="p-0.5 hover:bg-white/10 transition-colors">
                                    <span className="material-symbols-outlined text-[14px] text-slate-600 group-hover/info:text-phantom-cyan">info</span>
                                </button>
                                <div className="absolute left-0 top-6 z-50 w-64 p-3 bg-black border border-phantom-cyan/30 shadow-2xl opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all duration-200">
                                    <p className="font-bold text-phantom-cyan text-xs mb-1 font-mono uppercase">Virtual TVL</p>
                                    <p className="text-white/60 text-xs font-mono">Total value of all Ghost Permits. "Phantom" liquidity.</p>
                                </div>
                            </div>
                        </div>
                        <span className="material-symbols-outlined text-slate-600 group-hover:text-phantom-cyan transition-colors">query_stats</span>
                    </div>
                    <div className="flex items-baseline gap-3">
                        <h3 className="text-3xl font-bold text-white font-mono tracking-tighter">$4,203,192<span className="text-slate-600 text-xl">.00</span></h3>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-500 font-mono">
                        <span className="material-symbols-outlined text-sm">trending_up</span>
                        <span>+1.2% (24h)</span>
                    </div>
                </div>

                {/* Card 2: Ghost Permits */}
                <div className="relative overflow-hidden p-6 group bg-black border border-white/10 hover:border-signal-cyan/50 transition-all">
                    <div className="absolute -right-10 -top-10 h-32 w-32 bg-secondary/5 blur-3xl transition-all group-hover:bg-secondary/10"></div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest">Account Status</p>
                            <div className="relative group/info">
                                <button className="p-0.5 hover:bg-white/10 transition-colors">
                                    <span className="material-symbols-outlined text-[14px] text-slate-600 group-hover/info:text-secondary">info</span>
                                </button>
                                <div className="absolute left-0 top-6 z-50 w-64 p-3 bg-black border border-secondary/30 shadow-2xl opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all duration-200">
                                    <p className="font-bold text-secondary text-xs mb-1 font-mono uppercase">Membership Tier</p>
                                    <p className="text-white/60 text-xs font-mono">{membership.isMember ? "Active membership." : "Standard user."}</p>
                                </div>
                            </div>
                        </div>
                        <span className="material-symbols-outlined text-slate-600 group-hover:text-secondary transition-colors">badge</span>
                    </div>
                    <div className="flex items-baseline gap-3">
                        <h3 className="text-2xl font-bold text-white font-mono tracking-tighter">{userTier}</h3>
                        <span className={`px-2 py-0.5 text-xs font-bold uppercase tracking-wider border ${membership.isMember ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                            {membership.isMember ? 'Active' : 'Basic'}
                        </span>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-500 font-mono">
                        <span>Current Fee Rate: <span className="text-white">{feeTier}</span></span>
                    </div>
                </div>

                {/* Card 3: Your Rewards */}
                <div className="relative overflow-hidden p-6 group border border-phantom-cyan/30 bg-black hover:border-phantom-cyan/60 transition-all">
                    <div className="absolute -right-10 -top-10 h-32 w-32 bg-phantom-cyan/10 blur-3xl transition-all group-hover:bg-phantom-cyan/20"></div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <p className="text-phantom-cyan text-sm font-bold uppercase tracking-widest drop-shadow-[0_0_8px_rgba(165,243,252,0.3)]">Your Rewards</p>
                            {/* Info Tooltip */}
                            <div className="relative group/info">
                                <button className="p-0.5 hover:bg-white/10 transition-colors">
                                    <span className="material-symbols-outlined text-[14px] text-phantom-cyan/60 group-hover/info:text-phantom-cyan">info</span>
                                </button>
                                <div className="absolute left-0 top-6 z-50 w-64 p-3 bg-black border border-phantom-cyan/30 shadow-2xl opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all duration-200">
                                    <p className="font-bold text-phantom-cyan text-xs mb-1 font-mono uppercase">EID Rewards</p>
                                    <p className="text-white/60 text-xs font-mono">Protocol tokens earned from your Ghost Permits.</p>
                                </div>
                            </div>
                        </div>
                        <span className="material-symbols-outlined text-phantom-cyan">savings</span>
                    </div>
                    <div className="flex items-baseline justify-between w-full">
                        <h3 className="text-3xl font-bold text-white font-mono tracking-tighter">450.22 <span className="text-sm font-sans text-slate-500">EID</span></h3>
                        <button className="bg-phantom-cyan/10 border border-phantom-cyan/30 hover:bg-phantom-cyan/20 hover:border-phantom-cyan api-transition text-xs font-bold text-phantom-cyan px-3 py-1.5 uppercase tracking-wider shadow-none hover:shadow-[0_0_10px_rgba(165,243,252,0.2)]">
                            Claim
                        </button>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-500 font-mono">
                        <span>Next epoch in 4h 12m</span>
                    </div>
                </div>
            </div>

            {/* Active Positions Table */}
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

                <div className="overflow-hidden bg-black/60 border border-white/5">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">Asset Pair</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">Staked Amount</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">Expiry Countdown</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">
                                        <div className="flex items-center gap-1.5">
                                            APY
                                            <div className="relative group/info">
                                                <span className="material-symbols-outlined text-[12px] text-slate-600 group-hover/info:text-phantom-cyan cursor-help">info</span>
                                                <div className="absolute left-0 top-5 z-50 w-56 p-3 bg-black border border-phantom-cyan/30 shadow-2xl opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all duration-200 normal-case">
                                                    <p className="font-bold text-phantom-cyan text-xs mb-1 font-mono uppercase">APY</p>
                                                    <p className="text-white/60 text-xs font-mono">Annual Percentage Yield based on utilization.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest font-mono text-right">
                                        <div className="flex items-center gap-1.5 justify-end">
                                            Status
                                            <div className="relative group/info">
                                                <span className="material-symbols-outlined text-[12px] text-slate-600 group-hover/info:text-phantom-cyan cursor-help">info</span>
                                                <div className="absolute right-0 top-5 z-50 w-64 p-3 bg-black border border-phantom-cyan/30 shadow-2xl opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all duration-200 normal-case">
                                                    <div className="space-y-2 text-xs font-mono">
                                                        <div><span className="text-emerald-400 font-bold">Active</span><span className="text-white/60"> - Ready</span></div>
                                                        <div><span className="text-amber-400 font-bold">Expiring</span><span className="text-white/60"> - {`<`} 3h</span></div>
                                                        <div><span className="text-slate-400 font-bold">Expired</span><span className="text-white/60"> - Invalid</span></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest font-mono text-right">Action</th>
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
                                        <button
                                            onClick={() => setShowRevokeModal(true)}
                                            className="text-slate-400 hover:text-white transition-colors"
                                        >
                                            <span className="material-symbols-outlined">more_vert</span>
                                        </button>
                                    </td>
                                </tr>
                                {/* Row 2 */}
                                <tr className="group hover:bg-white/[0.02] transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex -space-x-2">
                                                <div className="h-8 w-8 rounded-full bg-slate-700 ring-2 ring-[#13131a] flex items-center justify-center text-[10px] font-bold text-white bg-gradient-to-br from-orange-500 to-yellow-500">WBTC</div>
                                                <div className="h-8 w-8 rounded-full bg-slate-700 ring-2 ring-[#13131a] flex items-center justify-center text-[10px] font-bold text-white bg-gradient-to-br from-yellow-400 to-orange-300">DAI</div>
                                            </div>
                                            <div>
                                                <div className="font-bold text-white">WBTC-DAI</div>
                                                <div className="text-xs text-slate-500">Curve</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-slate-300">
                                        0.50 <span className="text-xs text-slate-500">WBTC</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 font-mono text-amber-400">
                                            <span className="material-symbols-outlined text-base">timer</span>
                                            02h 11m 45s
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-primary font-bold">8.1%</td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                            </span>
                                            Expiring Soon
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
                    <div className="border-t border-white/5 bg-white/[0.02] px-6 py-3 flex items-center justify-between">
                        <span className="text-xs text-slate-500">Showing 1-3 of 12 positions</span>
                        <div className="flex gap-1">
                            <button disabled className="p-1 rounded hover:bg-white/10 text-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                <span className="material-symbols-outlined text-sm">chevron_left</span>
                            </button>
                            <button className="p-1 rounded hover:bg-white/10 text-slate-400 transition-colors">
                                <span className="material-symbols-outlined text-sm">chevron_right</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Revoke Modal */}
            {showRevokeModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0a0f]/80 backdrop-blur-sm">
                    <div className="glass-modal relative w-full max-w-md transform overflow-hidden rounded-2xl border border-red-500/30 p-1 shadow-2xl transition-all bg-[rgba(10,10,15,0.85)] backdrop-blur-2xl">
                        <div className="relative flex flex-col items-center p-6 sm:p-8">
                            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                                <span className="material-symbols-outlined text-4xl text-red-500 animate-pulse">warning</span>
                            </div>
                            <h3 className="mb-2 text-2xl font-bold tracking-tight text-center">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ef4444] to-[#a855f7]">Revoke Permit?</span>
                            </h3>
                            <p className="mb-8 text-center text-sm text-slate-400">
                                This action is irreversible. You are about to revoke a Ghost Permit, which will immediately cease liquidity provision.
                            </p>

                            <div className="mb-8 w-full rounded-xl border border-white/5 bg-white/[0.03] p-4 shadow-inner">
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Token Pair</span>
                                        <div className="flex items-center gap-2">
                                            <div className="flex -space-x-1.5">
                                                <div className="h-5 w-5 rounded-full bg-slate-700 ring-1 ring-[#13131a] flex items-center justify-center text-[6px] font-bold text-white bg-gradient-to-br from-blue-600 to-indigo-600">E</div>
                                                <div className="h-5 w-5 rounded-full bg-slate-700 ring-1 ring-[#13131a] flex items-center justify-center text-[6px] font-bold text-white bg-gradient-to-br from-blue-400 to-cyan-400">U</div>
                                            </div>
                                            <span className="font-mono text-sm font-bold text-white">ETH-USDC</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Amount</span>
                                        <span className="font-mono text-sm font-bold text-white">5.20 ETH</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Time Remaining</span>
                                        <span className="font-mono text-sm font-bold text-emerald-400">14h 22m 10s</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid w-full grid-cols-2 gap-4">
                                <button
                                    onClick={() => setShowRevokeModal(false)}
                                    className="flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => setShowRevokeModal(false)}
                                    className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-neon-danger transition-all hover:bg-red-500 hover:shadow-[0_0_20px_rgba(239,68,68,0.6)]"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:animate-[shimmer_1s_infinite]"></div>
                                    <span className="material-symbols-outlined mr-2 text-lg">delete_forever</span>
                                    Confirm Revoke
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
