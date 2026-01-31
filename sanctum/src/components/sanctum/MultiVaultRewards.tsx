"use client";

import Link from "next/link";

export function MultiVaultRewards() {
    return (
        <div className="w-full max-w-[1440px] mx-auto p-6 md:p-8 lg:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Multiplier & Vaults (8 cols) */}
                <div className="lg:col-span-8 flex flex-col gap-8">

                    {/* Hero: Global Multiplier Card */}
                    <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-[#1a1023] p-6 md:p-8 shadow-[0_0_25px_-5px_rgba(140,37,244,0.4)] group">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none"></div>
                        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/20 text-primary border border-primary/20">Active Epoch</span>
                                    <span className="text-white/50 text-sm">Ends in 04h 23m</span>
                                </div>
                                <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/70">3.42x</span>
                                    <span className="text-2xl md:text-3xl text-white/40 font-normal ml-3">Global Boost</span>
                                </h1>
                                <p className="text-white/60 max-w-md text-sm md:text-base">Your liquidity positions are currently earning multiplied yields across all Sanctum vaults.</p>
                            </div>
                            {/* Timer Component */}
                            <div className="flex gap-3">
                                <div className="flex flex-col items-center gap-1">
                                    <div className="w-14 h-14 flex items-center justify-center rounded-lg bg-[#211834] border border-white/10 shadow-inner">
                                        <span className="text-xl font-bold font-mono text-white">04</span>
                                    </div>
                                    <span className="text-[10px] uppercase tracking-wider text-white/40">Hrs</span>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <div className="w-14 h-14 flex items-center justify-center rounded-lg bg-[#211834] border border-white/10 shadow-inner">
                                        <span className="text-xl font-bold font-mono text-white">23</span>
                                    </div>
                                    <span className="text-[10px] uppercase tracking-wider text-white/40">Min</span>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <div className="w-14 h-14 flex items-center justify-center rounded-lg bg-[#211834] border border-white/10 shadow-inner">
                                        <span className="text-xl font-bold font-mono text-primary">45</span>
                                    </div>
                                    <span className="text-[10px] uppercase tracking-wider text-white/40">Sec</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section Header */}
                    <div className="flex items-center justify-between pt-4">
                        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">grid_view</span>
                            Reward Vaults
                        </h2>
                        <button className="text-sm text-primary hover:text-white transition-colors flex items-center gap-1">
                            View Analytics <span className="material-symbols-outlined text-[16px]">arrow_outward</span>
                        </button>
                    </div>

                    {/* Vaults Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Card 1: EIDOLON */}
                        <div className="glass-panel rounded-xl p-6 group hover:border-primary/40 transition-all duration-300 relative overflow-hidden bg-[rgba(26,16,35,0.6)] backdrop-blur-xl border border-white/10">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-900/50 flex items-center justify-center border border-indigo-500/30">
                                        <span className="material-symbols-outlined text-indigo-400">diamond</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg leading-tight text-white">EIDOLON Vault</h3>
                                        <span className="text-xs text-green-400 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                            Accumulating
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold font-mono tracking-tight text-white">1,240.50</p>
                                    <p className="text-xs text-white/40">Pending EIDOLON</p>
                                </div>
                            </div>
                            <div className="h-24 w-full mb-6 relative">
                                {/* Simplified visual chart rep */}
                                <div className="w-full h-full bg-gradient-to-t from-primary/20 via-primary/5 to-transparent rounded-lg border-b border-primary/50"></div>
                            </div>
                            <button className="w-full py-3 rounded-lg bg-surface-dark border border-white/10 hover:border-primary hover:bg-primary/10 hover:text-primary transition-all font-bold text-sm text-white flex items-center justify-center gap-2 group-hover:shadow-[0_0_15px_rgba(140,37,244,0.2)]">
                                Claim Rewards
                                <span className="material-symbols-outlined text-[18px]">download</span>
                            </button>
                        </div>

                        {/* Card 2: wETH */}
                        <div className="glass-panel rounded-xl p-6 group hover:border-blue-500/40 transition-all duration-300 relative overflow-hidden bg-[rgba(26,16,35,0.6)] backdrop-blur-xl border border-white/10">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-blue-900/50 flex items-center justify-center border border-blue-500/30">
                                        <span className="material-symbols-outlined text-blue-400">currency_bitcoin</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg leading-tight text-white">wETH Vault</h3>
                                        <span className="text-xs text-green-400 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                            Accumulating
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold font-mono tracking-tight text-white">0.45</p>
                                    <p className="text-xs text-white/40">Pending ETH</p>
                                </div>
                            </div>
                            <div className="h-24 w-full mb-6 relative">
                                <div className="w-full h-full bg-gradient-to-t from-blue-500/20 via-blue-500/5 to-transparent rounded-lg border-b border-blue-500/50"></div>
                            </div>
                            <button className="w-full py-3 rounded-lg bg-surface-dark border border-white/10 hover:border-blue-500 hover:bg-blue-500/10 hover:text-blue-400 transition-all font-bold text-sm text-white flex items-center justify-center gap-2 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                                Claim Rewards
                                <span className="material-symbols-outlined text-[18px]">download</span>
                            </button>
                        </div>

                        {/* Card 3: USDC */}
                        <div className="glass-panel rounded-xl p-6 group hover:border-emerald-500/40 transition-all duration-300 relative overflow-hidden bg-[rgba(26,16,35,0.6)] backdrop-blur-xl border border-white/10">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-emerald-900/50 flex items-center justify-center border border-emerald-500/30">
                                        <span className="material-symbols-outlined text-emerald-400">attach_money</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg leading-tight text-white">USDC Vault</h3>
                                        <span className="text-xs text-green-400 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                            Accumulating
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold font-mono tracking-tight text-white">850.00</p>
                                    <p className="text-xs text-white/40">Pending USDC</p>
                                </div>
                            </div>
                            <div className="h-24 w-full mb-6 relative">
                                <div className="w-full h-full bg-gradient-to-t from-emerald-500/20 via-emerald-500/5 to-transparent rounded-lg border-b border-emerald-500/50"></div>
                            </div>
                            <button className="w-full py-3 rounded-lg bg-surface-dark border border-white/10 hover:border-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400 transition-all font-bold text-sm text-white flex items-center justify-center gap-2 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                                Claim Rewards
                                <span className="material-symbols-outlined text-[18px]">download</span>
                            </button>
                        </div>

                        {/* Card 4: Governance */}
                        <div className="glass-panel rounded-xl p-6 group hover:border-orange-500/40 transition-all duration-300 relative overflow-hidden bg-[rgba(26,16,35,0.6)] backdrop-blur-xl border border-white/10">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-orange-900/50 flex items-center justify-center border border-orange-500/30">
                                        <span className="material-symbols-outlined text-orange-400">layers</span>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg leading-tight text-white">Governance</h3>
                                        <span className="text-xs text-white/50 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[12px]">lock_clock</span>
                                            Vested
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold font-mono tracking-tight text-white">45.00</p>
                                    <p className="text-xs text-white/40">Pending veSAN</p>
                                </div>
                            </div>
                            <div className="h-24 w-full mb-6 relative">
                                <div className="w-full h-full bg-gradient-to-t from-orange-500/20 via-orange-500/5 to-transparent rounded-lg border-b border-orange-500/50"></div>
                            </div>
                            <button className="w-full py-3 rounded-lg bg-surface-dark border border-white/10 hover:border-orange-500 hover:bg-orange-500/10 hover:text-orange-400 transition-all font-bold text-sm text-white flex items-center justify-center gap-2 group-hover:shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                                Claim & Stake
                                <span className="material-symbols-outlined text-[18px]">lock</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column: History Panel (4 cols) */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    {/* History Container */}
                    <div className="glass-panel rounded-xl h-full min-h-[500px] flex flex-col border border-white/10 bg-[rgba(26,16,35,0.6)] backdrop-blur-xl">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <h3 className="font-bold text-lg text-white">Activity Log</h3>
                            <div className="flex gap-2">
                                <button className="p-1.5 hover:bg-white/5 rounded text-white/50 hover:text-white transition-colors">
                                    <span className="material-symbols-outlined text-[20px]">filter_list</span>
                                </button>
                                <button className="p-1.5 hover:bg-white/5 rounded text-white/50 hover:text-white transition-colors">
                                    <span className="material-symbols-outlined text-[20px]">refresh</span>
                                </button>
                            </div>
                        </div>

                        {/* Scrollable List */}
                        <div className="flex-1 overflow-y-auto p-2">
                            <ul className="space-y-1">
                                {/* List Item 1 */}
                                <li className="group flex flex-col gap-1.5 p-3 rounded hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-green-400 font-mono bg-green-900/20 px-1.5 py-0.5 rounded border border-green-500/20">CLAIMED</span>
                                        <span className="text-[10px] text-white/40 font-mono">12m ago</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-white">450.00 USDC</span>
                                        <span className="material-symbols-outlined text-[16px] text-white/20 group-hover:text-white transition-colors">open_in_new</span>
                                    </div>
                                    <div className="text-[10px] font-mono text-white/30 truncate">0x3a2...8b91</div>
                                </li>
                                {/* List Item 2 */}
                                <li className="group flex flex-col gap-1.5 p-3 rounded hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-primary font-mono bg-primary/20 px-1.5 py-0.5 rounded border border-primary/20">STAKED</span>
                                        <span className="text-[10px] text-white/40 font-mono">2h ago</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-white">1,000 EIDOLON</span>
                                        <span className="material-symbols-outlined text-[16px] text-white/20 group-hover:text-white transition-colors">open_in_new</span>
                                    </div>
                                    <div className="text-[10px] font-mono text-white/30 truncate">0x7f2...4c12</div>
                                </li>
                                {/* List Item 3 */}
                                <li className="group flex flex-col gap-1.5 p-3 rounded hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-green-400 font-mono bg-green-900/20 px-1.5 py-0.5 rounded border border-green-500/20">CLAIMED</span>
                                        <span className="text-[10px] text-white/40 font-mono">5h ago</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-white">0.12 wETH</span>
                                        <span className="material-symbols-outlined text-[16px] text-white/20 group-hover:text-white transition-colors">open_in_new</span>
                                    </div>
                                    <div className="text-[10px] font-mono text-white/30 truncate">0x1e9...2d44</div>
                                </li>
                            </ul>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-white/5">
                            <button className="w-full py-2.5 rounded bg-white/5 hover:bg-white/10 transition-colors text-xs font-mono text-white/60 hover:text-white">
                                View All on Explorer
                            </button>
                        </div>
                    </div>

                    {/* Mini Promo Card */}
                    <div className="glass-panel rounded-xl p-6 border border-primary/20 relative overflow-hidden group cursor-pointer bg-[rgba(26,16,35,0.6)] backdrop-blur-xl">
                        <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
                            <span className="material-symbols-outlined text-primary text-[40px]">rocket_launch</span>
                        </div>
                        <h4 className="font-bold text-white mb-2 relative z-10">Boost your APY</h4>
                        <p className="text-xs text-white/60 mb-4 relative z-10">Lock EIDOLON for 30 days to receive an additional 1.5x multiplier.</p>
                        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden relative z-10">
                            <div className="h-full bg-primary w-2/3"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
