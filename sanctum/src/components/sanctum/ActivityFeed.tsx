import React from 'react';
import { useActivityHistory } from '@/hooks/useActivityHistory';

export function ActivityFeed() {
    const { events } = useActivityHistory();
    return (
        <aside className="w-full h-full glass-panel border-l border-white/5 flex flex-col shadow-2xl z-20 animate-in slide-in-from-right duration-500 bg-[#02040a]/80 backdrop-blur-xl">
            {/* Feed Header */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/5 bg-[#02040a]/30 sticky top-0 z-30">
                <div>
                    <h3 className="text-white text-base md:text-lg font-bold leading-tight tracking-tight flex items-center gap-2 font-display">
                        Sanctum Feed
                        <span className="flex h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse"></span>
                    </h3>
                    <p className="text-[10px] md:text-xs text-gray-400 mt-1 font-mono">Live interactions</p>
                </div>
                <div className="flex gap-2">
                    <button className="text-gray-400 hover:text-white transition-colors text-[10px] md:text-xs font-medium px-2 md:px-3 py-1 md:py-1.5 rounded bg-white/5 hover:bg-white/10 shrink-0">Mark read</button>
                    <button className="text-gray-400 hover:text-white transition-colors p-1 rounded-md hover:bg-white/10 xl:hidden">
                        <span className="material-symbols-outlined text-base md:text-lg">close</span>
                    </button>
                </div>
            </div>

            {/* Chips / Filters */}
            <div className="px-4 md:px-6 py-3 md:py-4 flex gap-2 md:gap-3 overflow-x-auto no-scrollbar border-b border-white/5 scrollbar-hide">
                <button className="flex h-7 md:h-8 shrink-0 items-center justify-center px-3 md:px-4 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[10px] md:text-xs font-bold tracking-wide shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                    All
                </button>
                <button className="flex h-7 md:h-8 shrink-0 items-center justify-center px-3 md:px-4 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white text-[10px] md:text-xs">
                    TX
                </button>
                <button className="flex h-7 md:h-8 shrink-0 items-center justify-center px-3 md:px-4 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white text-[10px] md:text-xs">
                    System
                </button>
            </div>

            {/* Feed List Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 md:space-y-4 custom-scrollbar">
                {events.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-600">
                        <span className="material-symbols-outlined text-4xl mb-2 opacity-20">inbox</span>
                        <p className="text-[10px] md:text-xs font-mono uppercase tracking-widest">No activity</p>
                    </div>
                ) : (
                    events.map((event) => (
                        <div key={event.hash} className="relative overflow-hidden rounded-xl p-3 md:p-4 flex gap-3 md:gap-4 group bg-white/5 border border-white/5 hover:border-cyan-500/30 transition-all">
                            <div className={`absolute left-0 top-0 bottom-0 w-0.5 md:w-1 bg-cyan-500/50`}></div>
                            <div className="shrink-0 pt-0.5">
                                <div className={`h-8 w-8 md:h-10 md:w-10 rounded-full flex items-center justify-center border bg-cyan-500/10 border-cyan-500/20`}>
                                    <span className={`material-symbols-outlined text-xs md:text-sm text-cyan-400`}>
                                        check_circle
                                    </span>
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-0.5 md:mb-1">
                                    <h4 className="text-white font-semibold text-xs md:text-sm truncate pr-2 font-display uppercase tracking-tight">{event.type}</h4>
                                    <span className="text-[8px] md:text-xs text-gray-500 font-mono">
                                        {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <p className="text-gray-400 text-[10px] md:text-xs leading-relaxed mb-2 line-clamp-2">
                                    {event.description || "Protocol interaction detected."}
                                </p>
                                {event.hash && (
                                    <div className="flex justify-end">
                                        <a
                                            href={`https://unichain-sepolia.blockscout.com/tx/${event.hash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-[9px] md:text-[11px] text-cyan-400 hover:text-white transition-colors group/link"
                                        >
                                            EXPLORER
                                            <span className="material-symbols-outlined text-[10px] md:text-[12px] group-hover/link:translate-x-0.5 transition-transform">open_in_new</span>
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Bottom Fade */}
            <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-[#02040a] to-transparent pointer-events-none"></div>
        </aside>
    );
}
