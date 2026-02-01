"use client";

import React, { useState } from 'react';

export function RewardsPortal() {
    return (
        <div className="max-w-[1440px] mx-auto p-6 md:p-8 lg:p-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

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
                        <p className="text-white/60 max-w-md text-sm md:text-base">Your liquidity positions are currently earning multiplied yields across all Sanctum vaults.</p>
                    </div>
                    {/* Timer */}
                    <div className="flex gap-3">
                        <TimerBox value="04" label="Hrs" />
                        <TimerBox value="23" label="Min" />
                        <TimerBox value="45" label="Sec" isCyan />
                    </div>
                </div>
            </div>

            {/* Section Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2 font-display">
                    <span className="material-symbols-outlined text-cyan-400">grid_view</span>
                    Reward Vaults
                </h2>
                <button className="text-sm text-cyan-400 hover:text-white transition-colors flex items-center gap-1">
                    View Analytics <span className="material-symbols-outlined text-[16px]">arrow_outward</span>
                </button>
            </div>

            {/* Vaults Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
                <VaultCard
                    title="EIDOLON Vault"
                    amount="1,240.50"
                    symbol="Pending EIDOLON"
                    icon="diamond"
                    iconColor="text-indigo-400"
                    iconBg="bg-indigo-900/50"
                    strokeColor="#0dccf2"
                />
                <VaultCard
                    title="wETH Vault"
                    amount="0.45"
                    symbol="Pending ETH"
                    icon="currency_bitcoin"
                    iconColor="text-blue-400"
                    iconBg="bg-blue-900/50"
                    strokeColor="#3b82f6"
                />
                <VaultCard
                    title="USDC Vault"
                    amount="850.00"
                    symbol="Pending USDC"
                    icon="attach_money"
                    iconColor="text-emerald-400"
                    iconBg="bg-emerald-900/50"
                    strokeColor="#10b981"
                />
                <VaultCard
                    title="Governance"
                    amount="45.00"
                    symbol="Pending veSAN"
                    icon="layers"
                    iconColor="text-orange-400"
                    iconBg="bg-orange-900/50"
                    strokeColor="#f97316"
                    isStaking
                />
            </div>

            {/* History Panel */}
            <div className="w-full glass-panel rounded-xl flex flex-col border border-white/10 bg-white/[0.02]">
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <h3 className="font-bold text-lg text-white font-display">Activity Log</h3>
                    <div className="flex gap-2">
                        <button className="p-1.5 hover:bg-white/5 rounded text-white/50 hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-[20px]">filter_list</span>
                        </button>
                        <button className="p-1.5 hover:bg-white/5 rounded text-white/50 hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-[20px]">refresh</span>
                        </button>
                    </div>
                </div>

                <div className="p-2 space-y-1">
                    <HistoryItem label="CLAIMED" time="12m ago" amount="450.00 USDC" hash="0x3a2...8b91" color="green" />
                    <HistoryItem label="STAKED" time="2h ago" amount="1,000 EIDOLON" hash="0x7f2...4c12" color="cyan" />
                    <HistoryItem label="CLAIMED" time="5h ago" amount="0.12 wETH" hash="0x1e9...2d44" color="green" />
                </div>
                <div className="p-4 border-t border-white/5">
                    <button className="w-full py-2.5 rounded bg-white/5 hover:bg-white/10 transition-colors text-xs font-mono text-white/60 hover:text-white">
                        View All on Explorer
                    </button>
                </div>
            </div>

        </div>
    );
}

function TimerBox({ value, label, isCyan }: { value: string, label: string, isCyan?: boolean }) {
    return (
        <div className="flex flex-col items-center gap-1">
            <div className={`w-14 h-14 flex items-center justify-center rounded-lg bg-[#0a1016] border border-white/10 shadow-inner ${isCyan ? 'border-cyan-500/30' : ''}`}>
                <span className={`text-xl font-bold font-mono ${isCyan ? 'text-cyan-400' : 'text-white'}`}>{value}</span>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-white/40">{label}</span>
        </div>
    )
}

function VaultCard({ title, amount, symbol, icon, iconColor, iconBg, strokeColor, isStaking }: any) {
    return (
        <div className="rounded-xl p-6 bg-[#0a1016]/60 border border-white/5 hover:border-cyan-500/30 transition-all duration-300 relative overflow-hidden group">
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center border border-white/10`}>
                        <span className={`material-symbols-outlined ${iconColor}`}>{icon}</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-lg leading-tight text-white">{title}</h3>
                        <span className="text-xs text-green-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                            {isStaking ? 'Vested' : 'Accumulating'}
                        </span>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-bold font-mono tracking-tight text-white">{amount}</p>
                    <p className="text-xs text-white/40">{symbol}</p>
                </div>
            </div>
            {/* Simple SVG Chart */}
            <div className="h-24 w-full mb-6 relative opacity-80 group-hover:opacity-100 transition-opacity">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 200 60">
                    <path d="M0 50 C 20 40, 40 55, 60 35 S 100 20, 140 30 S 180 10, 200 5 V 60 H 0 Z" fill={strokeColor} fillOpacity="0.1" />
                    <path d="M0 50 C 20 40, 40 55, 60 35 S 100 20, 140 30 S 180 10, 200 5" fill="none" stroke={strokeColor} strokeWidth="2" />
                </svg>
            </div>
            <button className={`w-full py-3 rounded-lg bg-white/5 border border-white/10 ${isStaking ? 'hover:border-orange-500 hover:text-orange-400' : 'hover:border-cyan-500 hover:text-cyan-400'} hover:bg-white/10 transition-all font-bold text-sm flex items-center justify-center gap-2`}>
                {isStaking ? 'Claim & Stake' : 'Claim Rewards'}
                <span className="material-symbols-outlined text-[18px]">{isStaking ? 'lock' : 'download'}</span>
            </button>
        </div>
    )
}

function HistoryItem({ label, time, amount, hash, color }: any) {
    const colorClasses = {
        green: "text-green-400 bg-green-900/20 border-green-500/20",
        cyan: "text-cyan-400 bg-cyan-900/20 border-cyan-500/20",
        orange: "text-orange-400 bg-orange-900/20 border-orange-500/20"
    }[color as 'green' | 'cyan' | 'orange'] || "text-white bg-gray-500/20";

    return (
        <div className="group flex flex-col gap-1.5 p-3 rounded hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/5">
            <div className="flex items-center justify-between">
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${colorClasses}`}>{label}</span>
                <span className="text-[10px] text-white/40 font-mono">{time}</span>
            </div>
            <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">{amount}</span>
                <span className="material-symbols-outlined text-[16px] text-white/20 group-hover:text-white transition-colors">open_in_new</span>
            </div>
            <div className="text-[10px] font-mono text-white/30 truncate">{hash}</div>
        </div>
    )
}
