"use client";

import React from 'react';

export function DeepAnalyticsHub() {
    return (
        <div className="max-w-[1440px] mx-auto p-6 md:p-8 lg:p-12 space-y-6 animate-in fade-in zoom-in-95 duration-500">

            {/* Breadcrumbs */}
            <nav className="flex flex-wrap items-center gap-2 text-sm md:text-base mb-2">
                <span className="text-cyan-400 hover:text-white transition-colors cursor-pointer">Sanctum</span>
                <span className="text-white/20">/</span>
                <span className="text-white font-medium">Analytics Hub</span>
            </nav>

            {/* Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">

                {/* LEFT PANE: Protocol Health (4 cols) */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    <div className="glass-panel rounded-2xl p-6 md:p-8 flex flex-col h-full shadow-[0_0_20px_rgba(6,182,212,0.1)] relative overflow-hidden group border border-cyan-500/20 bg-[#02040a]/80">
                        {/* Decorative glow */}
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl group-hover:bg-cyan-500/20 transition-all duration-700"></div>

                        <div className="flex justify-between items-start mb-8 relative z-10">
                            <div>
                                <h3 className="text-cyan-400 text-sm font-medium tracking-wider uppercase mb-1">System Status</h3>
                                <div className="flex items-center gap-2">
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                                    </span>
                                    <p className="text-white text-2xl font-bold tracking-tight shadow-neon-text">OPERATIONAL</p>
                                </div>
                            </div>
                            <span className="material-symbols-outlined text-cyan-500/40 text-4xl">hub</span>
                        </div>

                        {/* Metrics */}
                        <div className="flex flex-col gap-6 flex-grow justify-center relative z-10">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-white/60 text-sm">Uptime (24h)</span>
                                    <span className="text-white font-mono font-bold">100%</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-white/60 text-sm">Block Latency</span>
                                    <span className="text-emerald-400 font-mono font-bold">12ms</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-white/60 text-sm">Active Nodes</span>
                                    <span className="text-cyan-400 font-mono font-bold">42</span>
                                </div>
                            </div>
                        </div>

                        {/* Energy Bar / Load */}
                        <div className="mt-8 relative z-10">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-cyan-400 text-sm font-medium">Network Load</span>
                                <span className="text-cyan-500 font-mono text-sm font-bold">65%</span>
                            </div>
                            <div className="h-3 w-full bg-[#101f22] rounded-full overflow-hidden border border-white/5">
                                <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 w-[65%] rounded-full shadow-[0_0_10px_rgba(34,211,238,0.5)]"></div>
                            </div>
                            <p className="text-white/40 text-xs mt-3 text-right">Capacity remaining: 35%</p>
                        </div>
                    </div>
                </div>

                {/* RIGHT PANE: Deep Metrics (8 cols) */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    <div className="glass-panel rounded-2xl p-6 md:p-8 flex flex-col h-full relative overflow-hidden bg-[#02040a]/60 border border-white/10">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-white text-lg font-bold tracking-tight flex items-center gap-2">
                                <span className="material-symbols-outlined text-cyan-400">monitoring</span>
                                Protocol Analytics
                            </h3>
                            <button className="text-xs text-cyan-400 hover:text-white underline decoration-dotted underline-offset-4">Export CSV</button>
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">

                            {/* Metric 1: TVL */}
                            <AnalyticsCard
                                label="Total Value Locked"
                                value="$4.2M"
                                unit="+14.2%"
                                unitColor="text-emerald-400"
                                chartPath="M0,35 Q20,30 40,25 T80,15 T100,5"
                                fillId="grad1"
                                color="#0dccf2"
                            />

                            {/* Metric 2: Volume */}
                            <AnalyticsCard
                                label="24h Volume"
                                value="2,400"
                                unit="ETH"
                                unitColor="text-white/50"
                                chartPath="M0,20 L30,20 L50,15 L70,20 L100,20"
                                fillId="none" // Line only
                                color="#5d7f87"
                                strokeDash="4 2"
                            />

                            {/* Metric 3: Fees */}
                            <AnalyticsCard
                                label="Protocol Fees"
                                value="98.5"
                                unit="ETH"
                                unitColor="text-emerald-400"
                                chartPath="M0,25 Q25,28 50,22 T100,20"
                                fillId="none"
                                color="#34d399"
                            />

                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}

function AnalyticsCard({ label, value, unit, unitColor, chartPath, fillId, color, strokeDash }: any) {
    return (
        <div className="bg-[#101f22]/40 rounded-xl p-5 border border-white/5 flex flex-col justify-between group hover:border-cyan-500/40 transition-colors">
            <div>
                <p className="text-cyan-400 text-xs uppercase tracking-wider font-semibold mb-2">{label}</p>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-mono font-bold text-white group-hover:text-cyan-400 transition-colors">{value}</span>
                    <span className={`text-xs font-mono ${unitColor}`}>{unit}</span>
                </div>
            </div>
            {/* Sparkline SVG */}
            <div className="h-16 w-full mt-4 relative">
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 40">
                    <defs>
                        {fillId === 'grad1' && (
                            <linearGradient id="grad1" x1="0%" x2="0%" y1="0%" y2="100%">
                                <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.2 }}></stop>
                                <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }}></stop>
                            </linearGradient>
                        )}
                    </defs>
                    <path d={chartPath} fill="none" stroke={color} strokeWidth="2" strokeDasharray={strokeDash} vectorEffect="non-scaling-stroke"></path>
                    {fillId === 'grad1' && (
                        <path d={`${chartPath} V40 H0 Z`} fill="url(#grad1)" stroke="none"></path>
                    )}
                </svg>
            </div>
        </div>
    )
}
