import React from 'react';

export function ActivityFeed() {
    return (
        <aside className="w-full h-full glass-panel border-l border-white/5 flex flex-col shadow-2xl z-20 animate-in slide-in-from-right duration-500 bg-[#02040a]/80 backdrop-blur-xl">
            {/* Feed Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#02040a]/30 sticky top-0 z-30">
                <div>
                    <h3 className="text-white text-lg font-bold leading-tight tracking-tight flex items-center gap-2 font-display">
                        Sanctum Feed
                        <span className="flex h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse"></span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 font-mono">Real-time protocol interactions</p>
                </div>
                <div className="flex gap-2">
                    <button className="text-gray-400 hover:text-white transition-colors text-xs font-medium px-3 py-1.5 rounded bg-white/5 hover:bg-white/10">Mark read</button>
                    <button className="text-gray-400 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
            </div>

            {/* Chips / Filters */}
            <div className="px-6 py-4 flex gap-3 overflow-x-auto no-scrollbar border-b border-white/5">
                <button className="flex h-8 shrink-0 items-center justify-center px-4 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold tracking-wide shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-transform active:scale-95">
                    All
                </button>
                <button className="flex h-8 shrink-0 items-center justify-center px-4 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-cyan-500/50 text-xs font-medium transition-all active:scale-95">
                    Transactions
                </button>
                <button className="flex h-8 shrink-0 items-center justify-center px-4 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-cyan-500/50 text-xs font-medium transition-all active:scale-95">
                    System
                </button>
                <button className="flex h-8 shrink-0 items-center justify-center px-4 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-cyan-500/50 text-xs font-medium transition-all active:scale-95">
                    Alerts
                </button>
            </div>

            {/* Feed List Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">

                {/* Pending Item */}
                <div className="relative overflow-hidden rounded-xl p-4 flex gap-4 group bg-white/5 border border-white/5 hover:border-yellow-500/30 transition-all">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500/50"></div>
                    <div className="shrink-0 pt-1">
                        <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                            <span className="material-symbols-outlined text-yellow-400 animate-spin text-sm">progress_activity</span>
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                            <h4 className="text-white font-semibold text-sm truncate pr-2 font-display">Position Settling</h4>
                            <span className="text-[10px] text-yellow-400 font-mono bg-yellow-400/10 px-1.5 py-0.5 rounded border border-yellow-400/20">PENDING</span>
                        </div>
                        <p className="text-gray-400 text-xs leading-relaxed mb-2">Rebalancing pool weights for ETH-USDC pair.</p>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-500 font-mono">Tx: 0x82...9a</span>
                            <span className="h-1 w-1 rounded-full bg-gray-700"></span>
                            <span className="text-[10px] text-gray-500">Processing...</span>
                        </div>
                    </div>
                </div>

                {/* Success Item */}
                <div className="relative overflow-hidden rounded-xl p-4 flex gap-4 group bg-white/5 border border-white/5 hover:border-cyan-500/30 transition-all">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500/50"></div>
                    <div className="shrink-0 pt-1">
                        <div className="h-10 w-10 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                            <span className="material-symbols-outlined text-cyan-400 text-sm">check_circle</span>
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                            <h4 className="text-white font-semibold text-sm truncate pr-2 font-display">Rewards Claimed</h4>
                            <span className="text-xs text-gray-500 font-mono">2 mins ago</span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-cyan-400 text-sm font-bold font-mono">+ 450.00 USDC</span>
                        </div>
                        <div className="flex justify-end">
                            <a className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-white transition-colors group/link" href="#">
                                View on Explorer
                                <span className="material-symbols-outlined text-[12px] group-hover/link:translate-x-0.5 transition-transform">open_in_new</span>
                            </a>
                        </div>
                    </div>
                </div>

                {/* Info Item */}
                <div className="relative overflow-hidden rounded-xl p-4 flex gap-4 group bg-white/5 border border-white/5 hover:border-indigo-500/30 transition-all">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500/50"></div>
                    <div className="shrink-0 pt-1">
                        <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                            <span className="material-symbols-outlined text-indigo-400 text-sm">draw</span>
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                            <h4 className="text-white font-semibold text-sm truncate pr-2 font-display">Permit Signed</h4>
                            <span className="text-xs text-gray-500 font-mono">1 hour ago</span>
                        </div>
                        <p className="text-gray-400 text-xs leading-relaxed">Gasless approval for USDC spend limit granted.</p>
                    </div>
                </div>

                {/* Failed Item */}
                <div className="relative overflow-hidden rounded-xl p-4 flex gap-4 group bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 transition-all">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500/50"></div>
                    <div className="shrink-0 pt-1">
                        <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                            <span className="material-symbols-outlined text-red-500 text-sm">error</span>
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                            <h4 className="text-white font-semibold text-sm truncate pr-2 font-display">Swap Failed</h4>
                            <span className="text-xs text-gray-500 font-mono">3 hours ago</span>
                        </div>
                        <p className="text-gray-400 text-xs leading-relaxed mb-2">Slippage tolerance exceeded (0.5%).</p>
                        <button className="text-[11px] font-bold text-red-400 hover:text-white border border-red-500/30 rounded px-2 py-1 hover:bg-red-500/20 transition-colors">
                            Retry Transaction
                        </button>
                    </div>
                </div>

                {/* Separator */}
                <div className="flex items-center gap-4 py-2">
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-gray-700 to-transparent"></div>
                    <span className="text-[10px] font-medium text-gray-500 uppercase tracking-widest font-mono">October 24</span>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-gray-700 to-transparent"></div>
                </div>

                {/* Older Item */}
                <div className="relative overflow-hidden rounded-xl p-4 flex gap-4 group bg-white/5 border border-white/5 opacity-60 hover:opacity-100 transition-all">
                    <div className="shrink-0 pt-1">
                        <div className="h-10 w-10 rounded-full bg-emerald-900/20 flex items-center justify-center border border-emerald-500/20">
                            <span className="material-symbols-outlined text-emerald-400 text-sm">add_card</span>
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                            <h4 className="text-white font-semibold text-sm truncate pr-2 font-display">Liquidity Added</h4>
                            <span className="text-xs text-gray-500 font-mono">2 days ago</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-300 text-sm">Pool Share: <span className="text-white font-mono font-bold">0.05%</span></span>
                        </div>
                    </div>
                </div>

            </div>

            {/* Bottom Fade */}
            <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-[#02040a] to-transparent pointer-events-none"></div>
        </aside>
    );
}
