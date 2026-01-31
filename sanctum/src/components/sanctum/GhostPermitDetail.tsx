import { useState } from "react";

export const GhostPermitDetail = () => {
    return (
        <div className="w-full max-w-[1400px] mx-auto flex flex-col gap-6 text-white font-display">
            {/* Breadcrumbs */}
            <nav className="flex flex-wrap items-center gap-2 text-sm md:text-base">
                <a className="text-secondary hover:text-primary transition-colors" href="#">Sanctum</a>
                <span className="text-glass-border">/</span>
                <a className="text-secondary hover:text-primary transition-colors" href="#">Mirror</a>
                <span className="text-glass-border">/</span>
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-lg">verified_user</span>
                    <span className="text-white font-medium">Permit #8821</span>
                </div>
            </nav>

            {/* Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
                {/* LEFT PANE: Permit Core (4 cols) */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    <div className="bg-[#162a31]/40 backdrop-blur-md border border-[#315f68]/30 rounded-2xl p-6 md:p-8 flex flex-col h-full shadow-[0_0_10px_rgba(13,204,242,0.3)] relative overflow-hidden group">
                        {/* Decorative glow */}
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-700"></div>

                        <div className="flex justify-between items-start mb-8 relative z-10">
                            <div>
                                <h3 className="text-secondary text-sm font-medium tracking-wider uppercase mb-1">Permit Status</h3>
                                <div className="flex items-center gap-2">
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                                    </span>
                                    <p className="text-white text-2xl font-bold tracking-tight drop-shadow-[0_0_5px_rgba(13,204,242,0.5)]">ACTIVE</p>
                                </div>
                            </div>
                            <span className="material-symbols-outlined text-[#315f68]/40 text-4xl">hourglass_top</span>
                        </div>

                        {/* Timer */}
                        <div className="flex flex-col gap-6 flex-grow justify-center relative z-10">
                            <div className="grid grid-cols-4 gap-2 text-center">
                                <div className="flex flex-col gap-2">
                                    <div className="bg-[#101f22]/80 rounded-lg py-4 border border-[#315f68]/40">
                                        <span className="font-mono text-2xl md:text-3xl text-white font-bold">04</span>
                                    </div>
                                    <span className="text-secondary text-[10px] uppercase tracking-widest">Days</span>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className="bg-[#101f22]/80 rounded-lg py-4 border border-[#315f68]/40">
                                        <span className="font-mono text-2xl md:text-3xl text-white font-bold">12</span>
                                    </div>
                                    <span className="text-secondary text-[10px] uppercase tracking-widest">Hrs</span>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className="bg-[#101f22]/80 rounded-lg py-4 border border-[#315f68]/40">
                                        <span className="font-mono text-2xl md:text-3xl text-white font-bold">44</span>
                                    </div>
                                    <span className="text-secondary text-[10px] uppercase tracking-widest">Min</span>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className="bg-[#101f22]/80 rounded-lg py-4 border border-[#315f68]/40">
                                        <span className="font-mono text-2xl md:text-3xl text-primary font-bold animate-pulse">09</span>
                                    </div>
                                    <span className="text-secondary text-[10px] uppercase tracking-widest">Sec</span>
                                </div>
                            </div>
                        </div>

                        {/* Progress/Energy Bar */}
                        <div className="mt-8 relative z-10">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-secondary text-sm font-medium">Permit Energy</span>
                                {/* Info Tooltip */}
                                <div className="relative group/info">
                                    <span className="material-symbols-outlined text-[14px] text-secondary/50 group-hover/info:text-primary cursor-help">info</span>
                                    <div className="absolute left-0 top-6 z-50 w-56 p-3 rounded-xl bg-[#1a1229] border border-primary/30 shadow-2xl opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all duration-200">
                                        <p className="font-bold text-primary text-xs mb-1">Permit Energy</p>
                                        <p className="text-white/60 text-xs">Remaining validity percentage. When it reaches 0%, the permit expires and needs to be renewed to continue earning.</p>
                                    </div>
                                </div>
                                <span className="text-primary font-mono text-sm font-bold">65%</span>
                            </div>
                            <div className="h-3 w-full bg-[#101f22] rounded-full overflow-hidden border border-[#315f68]/40">
                                <div className="h-full bg-gradient-to-r from-cyan-600 to-primary w-[65%] rounded-full shadow-[0_0_10px_rgba(13,204,242,0.5)]"></div>
                            </div>
                            <p className="text-secondary/60 text-xs mt-3 text-right">Time until dissolution</p>
                        </div>
                    </div>
                </div>

                {/* RIGHT PANE: Analytics (8 cols) */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    <div className="bg-[#162a31]/40 backdrop-blur-md border border-[#315f68]/30 rounded-2xl p-6 md:p-8 flex flex-col h-full relative overflow-hidden">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-white text-lg font-bold tracking-tight flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">monitoring</span>
                                Position Analytics
                            </h3>
                            <button className="text-xs text-secondary hover:text-primary underline decoration-dotted underline-offset-4">View Detailed Report</button>
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
                            {/* Metric 1: Yield */}
                            <div className="bg-[#101f22]/40 rounded-xl p-5 border border-[#315f68]/40 flex flex-col justify-between group hover:border-primary/40 transition-colors">
                                <div>
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <p className="text-secondary text-xs uppercase tracking-wider font-semibold">Projected Yield</p>
                                        <div className="relative group/info">
                                            <span className="material-symbols-outlined text-[12px] text-secondary/50 group-hover/info:text-primary cursor-help">info</span>
                                            <div className="absolute left-0 top-5 z-50 w-52 p-3 rounded-xl bg-[#1a1229] border border-primary/30 shadow-2xl opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all duration-200 normal-case">
                                                <p className="font-bold text-primary text-xs mb-1">Projected Yield</p>
                                                <p className="text-white/60 text-xs">Expected annual return based on current trade volume and fee rates. Updates in real-time.</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-mono font-bold text-white group-hover:text-primary transition-colors">+14.2%</span>
                                        <span className="text-xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded">APY</span>
                                    </div>
                                </div>
                                {/* Sparkline SVG */}
                                <div className="h-16 w-full mt-4 relative">
                                    <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 40">
                                        <defs>
                                            <linearGradient id="grad1" x1="0%" x2="0%" y1="0%" y2="100%">
                                                <stop offset="0%" style={{ stopColor: '#0dccf2', stopOpacity: 0.2 }} />
                                                <stop offset="100%" style={{ stopColor: '#0dccf2', stopOpacity: 0 }} />
                                            </linearGradient>
                                        </defs>
                                        <path d="M0,35 Q20,30 40,25 T80,15 T100,5" fill="none" stroke="#0dccf2" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                                        <path d="M0,35 Q20,30 40,25 T80,15 T100,5 V40 H0 Z" fill="url(#grad1)" stroke="none" />
                                    </svg>
                                </div>
                            </div>

                            {/* Metric 2: Weight */}
                            <div className="bg-[#101f22]/40 rounded-xl p-5 border border-[#315f68]/40 flex flex-col justify-between group hover:border-primary/40 transition-colors">
                                <div>
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <p className="text-secondary text-xs uppercase tracking-wider font-semibold">Liq. Weight</p>
                                        <div className="relative group/info">
                                            <span className="material-symbols-outlined text-[12px] text-secondary/50 group-hover/info:text-primary cursor-help">info</span>
                                            <div className="absolute left-0 top-5 z-50 w-52 p-3 rounded-xl bg-[#1a1229] border border-primary/30 shadow-2xl opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all duration-200 normal-case">
                                                <p className="font-bold text-primary text-xs mb-1">Liquidity Weight</p>
                                                <p className="text-white/60 text-xs">Your share of the total liquidity pool, measured in virtual ETH (vETH). Higher weight = priority for trades.</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-mono font-bold text-white group-hover:text-primary transition-colors">2,400</span>
                                        <span className="text-xs font-mono text-white/50">vETH</span>
                                    </div>
                                </div>
                                {/* Sparkline SVG */}
                                <div className="h-16 w-full mt-4 relative">
                                    <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 40">
                                        <path d="M0,20 L30,20 L50,15 L70,20 L100,20" fill="none" stroke="#5d7f87" strokeDasharray="4 2" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                                    </svg>
                                </div>
                            </div>

                            {/* Metric 3: Health */}
                            <div className="bg-[#101f22]/40 rounded-xl p-5 border border-[#315f68]/40 flex flex-col justify-between group hover:border-primary/40 transition-colors">
                                <div>
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <p className="text-secondary text-xs uppercase tracking-wider font-semibold">Collateral Health</p>
                                        <div className="relative group/info">
                                            <span className="material-symbols-outlined text-[12px] text-secondary/50 group-hover/info:text-primary cursor-help">info</span>
                                            <div className="absolute left-0 top-5 z-50 w-56 p-3 rounded-xl bg-[#1a1229] border border-primary/30 shadow-2xl opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all duration-200 normal-case">
                                                <p className="font-bold text-primary text-xs mb-1">Collateral Health</p>
                                                <p className="text-white/60 text-xs">Safety score of your position. 100% = fully healthy. Below 80% indicates high utilization that may affect performance.</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-mono font-bold text-white group-hover:text-primary transition-colors">98.5</span>
                                        <span className="text-xs font-mono text-emerald-400">%</span>
                                    </div>
                                </div>
                                {/* Sparkline SVG */}
                                <div className="h-16 w-full mt-4 relative">
                                    <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 40">
                                        <path d="M0,25 Q25,28 50,22 T100,20" fill="none" stroke="#34d399" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Matrix (Bottom) */}
            <div className="w-full bg-[#162a31]/40 backdrop-blur-md border-t border-[#315f68]/30 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg mt-2">
                <div className="flex items-center gap-4">
                    <div className="bg-primary/10 rounded-full p-3 hidden md:block">
                        <span className="material-symbols-outlined text-primary">token</span>
                    </div>
                    <div>
                        <h4 className="text-white font-bold text-lg">Permit Operations</h4>
                        <p className="text-secondary text-sm">Manage lifecycle and collateral parameters</p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                    <button className="group flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-danger/30 text-danger hover:bg-danger/10 hover:border-danger font-mono text-sm font-bold transition-all duration-300 w-full sm:w-auto">
                        <span className="material-symbols-outlined text-[18px]">block</span>
                        Immediate Revocation
                    </button>
                    <button className="group flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-primary/30 bg-[#101f22]/50 text-white hover:bg-primary/10 hover:border-primary font-mono text-sm font-bold transition-all duration-300 w-full sm:w-auto">
                        <span className="material-symbols-outlined text-[18px] text-primary group-hover:text-white transition-colors">tune</span>
                        Adjust Collateral
                    </button>
                    <button className="relative overflow-hidden group flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-primary text-background-dark font-mono text-sm font-bold shadow-[0_0_20px_rgba(13,204,242,0.3)] hover:shadow-[0_0_30px_rgba(13,204,242,0.5)] transition-all duration-300 w-full sm:w-auto">
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        <span className="material-symbols-outlined text-[18px] relative z-10">update</span>
                        <span className="relative z-10">Extend Permit</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
