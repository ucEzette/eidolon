"use client";

import Link from "next/link";

export function ActivityFeed() {
    return (
        <aside className="w-full lg:w-[480px] h-full glass-panel border-l border-glass-border flex flex-col shadow-2xl z-20 absolute right-0 top-[73px] bottom-0 animate-in slide-in-from-right duration-500 bg-[rgba(22,16,35,0.75)] backdrop-blur-xl">
            {/* Feed Header */}
            <div className="flex items-center justify-between p-6 border-b border-glass-border bg-background-dark/30 backdrop-blur-xl sticky top-0 z-30">
                <div>
                    <h3 className="text-white text-lg font-bold leading-tight tracking-tight flex items-center gap-2">
                        Sanctum Feed
                        <span className="flex h-2 w-2 rounded-full bg-neon-green shadow-[0_0_8px_#00ff9d] animate-pulse"></span>
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">Real-time protocol interactions</p>
                </div>
                <div className="flex gap-2">
                    <button className="text-gray-400 hover:text-white transition-colors text-xs font-medium px-3 py-1.5 rounded bg-white/5 hover:bg-white/10">Mark read</button>
                    <button className="text-gray-400 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
            </div>

            {/* Chips / Filters */}
            <div className="px-6 py-4 flex gap-3 overflow-x-auto no-scrollbar">
                <button className="flex h-8 shrink-0 items-center justify-center px-4 rounded-full bg-primary text-white text-xs font-bold tracking-wide shadow-[0_0_15px_rgba(137,90,246,0.4)] transition-transform active:scale-95">
                    All
                </button>
                <button className="flex h-8 shrink-0 items-center justify-center px-4 rounded-full bg-surface-dark border border-glass-border text-gray-400 hover:text-white hover:border-primary/50 text-xs font-medium transition-all active:scale-95">
                    Transactions
                </button>
                <button className="flex h-8 shrink-0 items-center justify-center px-4 rounded-full bg-surface-dark border border-glass-border text-gray-400 hover:text-white hover:border-primary/50 text-xs font-medium transition-all active:scale-95">
                    System
                </button>
                <button className="flex h-8 shrink-0 items-center justify-center px-4 rounded-full bg-surface-dark border border-glass-border text-gray-400 hover:text-white hover:border-primary/50 text-xs font-medium transition-all active:scale-95">
                    Alerts
                </button>
            </div>

            {/* Feed List Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                {/* Pending Item */}
                <div className="glass-card bg-white/[0.03] border border-white/5 bg-white/5 rounded-xl p-4 flex gap-4 group relative overflow-hidden hover:bg-white/[0.07] hover:border-primary/30 transition-all">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500/50"></div>
                    <div className="shrink-0 pt-1">
                        <div className="h-10 w-10 rounded-full bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                            <span className="material-symbols-outlined text-yellow-400 animate-spin">progress_activity</span>
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                            <h4 className="text-white font-semibold text-sm truncate pr-2">Position Settling</h4>
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

                {/* Success Item with Link */}
                <div className="glass-card bg-white/[0.03] border border-white/5 rounded-xl p-4 flex gap-4 group relative overflow-hidden hover:bg-white/[0.07] hover:border-neon-green/30 transition-all">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-neon-green/50"></div>
                    <div className="shrink-0 pt-1">
                        <div className="h-10 w-10 rounded-full bg-neon-green/10 flex items-center justify-center border border-neon-green/20">
                            <span className="material-symbols-outlined text-neon-green">check_circle</span>
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                            <h4 className="text-white font-semibold text-sm truncate pr-2">Rewards Claimed</h4>
                            <span className="text-xs text-gray-500">2 mins ago</span>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-neon-green text-sm font-bold">+ 450.00 USDC</span>
                        </div>
                        <div className="flex justify-end">
                            <a className="flex items-center gap-1 text-[11px] text-primary hover:text-white transition-colors group/link" href="#">
                                View on Explorer
                                <span className="material-symbols-outlined text-[12px] group-hover/link:translate-x-0.5 transition-transform">open_in_new</span>
                            </a>
                        </div>
                    </div>
                </div>

                {/* Failed Item */}
                <div className="glass-card rounded-xl p-4 flex gap-4 group relative overflow-hidden bg-red-500/5 hover:bg-red-500/10 border border-red-500/10">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-neon-red/50"></div>
                    <div className="shrink-0 pt-1">
                        <div className="h-10 w-10 rounded-full bg-neon-red/10 flex items-center justify-center border border-neon-red/20">
                            <span className="material-symbols-outlined text-neon-red">error</span>
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                            <h4 className="text-white font-semibold text-sm truncate pr-2">Swap Failed</h4>
                            <span className="text-xs text-gray-500">3 hours ago</span>
                        </div>
                        <p className="text-gray-400 text-xs leading-relaxed mb-2">Slippage tolerance exceeded (0.5%).</p>
                        <button className="text-[11px] font-bold text-neon-red hover:text-white border border-neon-red/30 rounded px-2 py-1 hover:bg-neon-red/20 transition-colors">
                            Retry Transaction
                        </button>
                    </div>
                </div>

                {/* Separator Date */}
                <div className="flex items-center gap-4 py-2">
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-gray-700 to-transparent"></div>
                    <span className="text-[10px] font-medium text-gray-500 uppercase tracking-widest">October 24</span>
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-gray-700 to-transparent"></div>
                </div>

                {/* Older Item */}
                <div className="glass-card bg-white/[0.03] border border-white/5 rounded-xl p-4 flex gap-4 group relative overflow-hidden opacity-75 hover:opacity-100 transition-all">
                    <div className="shrink-0 pt-1">
                        <div className="h-10 w-10 rounded-full bg-green-900/20 flex items-center justify-center border border-green-500/20">
                            <span className="material-symbols-outlined text-green-400">add_card</span>
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                            <h4 className="text-white font-semibold text-sm truncate pr-2">Liquidity Added</h4>
                            <span className="text-xs text-gray-500">2 days ago</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-300 text-sm">Pool Share: <span className="text-white font-mono font-bold">0.05%</span></span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Fade for Scroll */}
            <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-background-dark/90 to-transparent pointer-events-none"></div>

            {/* Footer */}
            <div className="p-4 border-t border-white/5">
                <button className="w-full py-2.5 rounded bg-white/5 hover:bg-white/10 transition-colors text-xs font-mono text-white/60 hover:text-white">
                    View All on Explorer
                </button>
            </div>
        </aside>
    );
}
