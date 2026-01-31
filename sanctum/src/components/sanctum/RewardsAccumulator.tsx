"use client";

import Link from "next/link";

export function RewardsAccumulator() {
    return (
        <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#0a0510] font-display text-white">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(140,37,244,0.15)_0%,rgba(10,5,16,1)_70%)]"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-[120px] animate-[pulse_4s_ease-in-out_infinite]"></div>
            </div>

            {/* Main Content */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-center w-full px-4 py-8">
                <div className="w-full max-w-5xl flex flex-col items-center gap-12">
                    <div className="text-center space-y-2 mb-4">
                        <h1 className="text-white tracking-tight text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60">Infinite Accumulator</h1>
                        <p className="text-white/40 text-sm font-light">Real-time yield aggregation across all connected nodes</p>
                    </div>

                    {/* The Accumulator Assembly */}
                    <div className="relative flex items-center justify-center w-[500px] h-[500px] md:w-[600px] md:h-[600px]">
                        {/* Orbitals (Source Nodes) */}

                        {/* Top Left */}
                        <div className="absolute top-[10%] left-[10%] z-20 animate-[float_6s_ease-in-out_infinite]">
                            <div className="glass-panel w-32 h-32 rounded-full flex flex-col items-center justify-center text-center p-3 relative group cursor-pointer hover:scale-105 transition-transform duration-500 border border-white/10 shadow-[0_0_20px_rgba(140,37,244,0.2)]">
                                <div className="absolute inset-0 bg-accent/5 rounded-full blur-xl group-hover:bg-accent/10 transition-colors"></div>
                                <span className="material-symbols-outlined text-accent/80 text-2xl mb-1">psychology</span>
                                <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Ghost Permit</p>
                                <p className="text-white font-mono text-sm group-hover:text-accent transition-colors">$4,200.00</p>
                            </div>
                        </div>

                        {/* Top Right */}
                        <div className="absolute top-[15%] right-[10%] z-20 animate-[float_6s_ease-in-out_3s_infinite]">
                            <div className="glass-panel w-28 h-28 rounded-full flex flex-col items-center justify-center text-center p-3 relative group cursor-pointer hover:scale-105 transition-transform duration-500 border border-white/10 shadow-[0_0_20px_rgba(140,37,244,0.2)]">
                                <div className="absolute inset-0 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-colors"></div>
                                <span className="material-symbols-outlined text-primary/80 text-2xl mb-1">layers</span>
                                <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Staking V2</p>
                                <p className="text-white font-mono text-sm group-hover:text-primary transition-colors">$3,150.20</p>
                            </div>
                        </div>

                        {/* Bottom Left */}
                        <div className="absolute bottom-[15%] left-[15%] z-20 animate-[float_6s_ease-in-out_3s_infinite]">
                            <div className="glass-panel w-24 h-24 rounded-full flex flex-col items-center justify-center text-center p-2 relative group cursor-pointer hover:scale-105 transition-transform duration-500 border border-white/10 shadow-[0_0_20px_rgba(140,37,244,0.2)]">
                                <div className="absolute inset-0 bg-green-500/5 rounded-full blur-xl group-hover:bg-green-500/10 transition-colors"></div>
                                <span className="material-symbols-outlined text-green-400/80 text-xl mb-1">water_drop</span>
                                <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold">LP Pool C</p>
                                <p className="text-white font-mono text-xs group-hover:text-green-400 transition-colors">$1,050.00</p>
                            </div>
                        </div>

                        {/* Bottom Right */}
                        <div className="absolute bottom-[10%] right-[15%] z-20 animate-[float_6s_ease-in-out_infinite]">
                            <div className="glass-panel w-32 h-32 rounded-full flex flex-col items-center justify-center text-center p-3 relative group cursor-pointer hover:scale-105 transition-transform duration-500 border border-white/10 shadow-[0_0_20px_rgba(140,37,244,0.2)]">
                                <div className="absolute inset-0 bg-purple-500/5 rounded-full blur-xl group-hover:bg-purple-500/10 transition-colors"></div>
                                <span className="material-symbols-outlined text-purple-400/80 text-2xl mb-1">hub</span>
                                <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Ref Node</p>
                                <p className="text-white font-mono text-sm group-hover:text-purple-400 transition-colors">$4,050.12</p>
                            </div>
                        </div>

                        {/* Central Gauge */}
                        <div className="relative w-[320px] h-[320px] md:w-[380px] md:h-[380px] rounded-full glass-panel flex items-center justify-center z-10 overflow-hidden shadow-[0_0_50px_rgba(140,37,244,0.15)] border border-white/10 bg-[rgba(26,16,35,0.4)] backdrop-blur-xl">
                            {/* Liquid Fill Level (approx 75%) */}
                            <div className="absolute bottom-0 left-0 w-full h-[75%] transition-all duration-1000 bg-gradient-to-b from-[rgba(0,240,255,0.2)] to-[rgba(0,240,255,0.05)] shadow-[0_0_40px_rgba(0,240,255,0.2)] after:content-[''] after:absolute after:-top-1/2 after:-left-1/2 after:w-[200%] after:h-[200%] after:bg-[radial-gradient(circle,rgba(0,240,255,0.4)_0%,transparent_60%)] after:animate-pulse after:opacity-30"></div>

                            {/* Inner Content */}
                            <div className="relative z-20 flex flex-col items-center gap-2">
                                <p className="text-accent text-xs font-bold tracking-[0.2em] uppercase mb-2">Total Claimable</p>
                                <h2 className="text-5xl md:text-6xl font-bold text-white font-mono tracking-tighter drop-shadow-[0_0_10px_rgba(0,240,255,0.5)]">
                                    12,450<span className="text-white/50 text-3xl">.32</span>
                                </h2>
                                <div className="flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-black/20 backdrop-blur-sm border border-white/5">
                                    <span className="material-symbols-outlined text-green-400 text-sm">trending_up</span>
                                    <span className="text-green-400 text-xs font-mono font-medium">+12.4% yield boost</span>
                                </div>
                            </div>

                            {/* Decorative Gauge Ring SVG */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none rotate-[-90deg]" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" fill="none" r="48" stroke="rgba(255,255,255,0.05)" strokeWidth="1"></circle>
                                {/* Progress Arc */}
                                <circle className="opacity-50" cx="50" cy="50" fill="none" r="48" stroke="#00f0ff" strokeDasharray="301.59" strokeDashoffset="75" strokeLinecap="round" strokeWidth="1"></circle>
                                {/* Ticks */}
                                <line stroke="rgba(255,255,255,0.2)" strokeWidth="1" x1="50" x2="50" y1="2" y2="6"></line>
                                <line stroke="rgba(255,255,255,0.2)" strokeWidth="1" x1="50" x2="50" y1="94" y2="98"></line>
                                <line stroke="rgba(255,255,255,0.2)" strokeWidth="1" x1="2" x2="6" y1="50" y2="50"></line>
                                <line stroke="rgba(255,255,255,0.2)" strokeWidth="1" x1="94" x2="98" y1="50" y2="50"></line>
                            </svg>
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="w-full max-w-md relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary via-accent to-primary rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                        <button className="relative w-full flex items-center justify-center gap-3 h-14 rounded-full bg-surface-dark border border-primary/50 text-white font-bold tracking-wider hover:bg-surface-dark/80 transition-all overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                            <span className="material-symbols-outlined text-accent animate-pulse">diamond</span>
                            <span>HARVEST ALL REWARDS</span>
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
