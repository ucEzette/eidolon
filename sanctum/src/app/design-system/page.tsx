"use client";

import { Navbar } from "@/components/sanctum/Navbar";
import { SummoningPortal } from "@/components/sanctum/SummoningPortal";
import { MirrorDashboard } from "@/components/sanctum/MirrorDashboard";
import { ActivityFeed } from "@/components/sanctum/ActivityFeed";
import { RewardsAccumulator } from "@/components/sanctum/RewardsAccumulator";
import { MultiVaultRewards } from "@/components/sanctum/MultiVaultRewards";
import { SuccessState } from "@/components/sanctum/states/SuccessState";
import { ErrorState } from "@/components/sanctum/states/ErrorState";
import { PendingState } from "@/components/sanctum/states/PendingState";
import { TokenSelector } from "@/components/sanctum/TokenSelector";
import { GhostPermitDetail } from "@/components/sanctum/GhostPermitDetail";
import { useState } from "react";

// Force client-side rendering to avoid SSR issues with wagmi/viem
export const dynamic = "force-dynamic";

export default function DesignSystem() {
    const [activeTab, setActiveTab] = useState("core");

    return (
        <div className="min-h-screen bg-background-dark text-white font-display">
            <Navbar />

            <div className="bg-surface-dark border-b border-white/5 sticky top-20 z-40">
                <div className="max-w-7xl mx-auto px-6 py-4 flex gap-4 overflow-x-auto">
                    <button onClick={() => setActiveTab("core")} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === "core" ? "bg-primary text-white" : "hover:bg-white/5 text-slate-400"}`}>Core Logic</button>
                    <button onClick={() => setActiveTab("rewards")} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === "rewards" ? "bg-primary text-white" : "hover:bg-white/5 text-slate-400"}`}>Rewards Systems</button>
                    <button onClick={() => setActiveTab("states")} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === "states" ? "bg-primary text-white" : "hover:bg-white/5 text-slate-400"}`}>Transaction States</button>
                    <button onClick={() => setActiveTab("modals")} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === "modals" ? "bg-primary text-white" : "hover:bg-white/5 text-slate-400"}`}>Modals & Overlays</button>
                    <button onClick={() => setActiveTab("permit")} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === "permit" ? "bg-primary text-white" : "hover:bg-white/5 text-slate-400"}`}>Permit Detail</button>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-6 py-12 space-y-24">

                {activeTab === "core" && (
                    <div className="space-y-12 animate-in fade-in">
                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-primary border-b border-primary/20 pb-2">Summoning Portal</h2>
                            <div className="flex justify-center bg-black/20 p-8 rounded-3xl border border-white/5">
                                <SummoningPortal />
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-primary border-b border-primary/20 pb-2">Mirror Dashboard</h2>
                            <div className="bg-black/20 p-4 rounded-3xl border border-white/5">
                                <MirrorDashboard />
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === "rewards" && (
                    <div className="space-y-12 animate-in fade-in">
                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-primary border-b border-primary/20 pb-2">Activity Feed</h2>
                            <div className="h-[600px] relative bg-black/20 rounded-3xl border border-white/5 overflow-hidden">
                                <ActivityFeed />
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-primary border-b border-primary/20 pb-2">Multi-Vault Rewards</h2>
                            <div className="bg-black/20 rounded-3xl border border-white/5 overflow-hidden">
                                <MultiVaultRewards />
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-primary border-b border-primary/20 pb-2">Infinite Accumulator</h2>
                            <div className="h-[800px] relative bg-black/20 rounded-3xl border border-white/5 overflow-hidden">
                                <RewardsAccumulator />
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === "states" && (
                    <div className="space-y-12 animate-in fade-in">
                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-emerald-400 border-b border-emerald-500/20 pb-2">Success State</h2>
                            <div className="h-[600px] relative bg-black/20 rounded-3xl border border-white/5 overflow-hidden">
                                <SuccessState />
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-violet-400 border-b border-violet-500/20 pb-2">Pending State</h2>
                            <div className="h-[600px] relative bg-black/20 rounded-3xl border border-white/5 overflow-hidden">
                                <PendingState />
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-red-500 border-b border-red-500/20 pb-2">Error State</h2>
                            <div className="h-[600px] relative bg-black/20 rounded-3xl border border-white/5 overflow-hidden">
                                <ErrorState />
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === "modals" && (
                    <div className="space-y-12 animate-in fade-in">
                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-primary border-b border-primary/20 pb-2">Token Selector</h2>
                            <div className="h-[800px] relative bg-black/20 rounded-3xl border border-white/5 overflow-hidden flex items-center justify-center">
                                <div className="absolute inset-0 bg-black/50 z-0"></div>
                                <TokenSelector onClose={() => { }} />
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === "permit" && (
                    <div className="space-y-12 animate-in fade-in">
                        <section className="space-y-4">
                            <h2 className="text-2xl font-bold text-primary border-b border-primary/20 pb-2">Ghost Permit Detail</h2>
                            <GhostPermitDetail />
                        </section>
                    </div>
                )}

            </main>
        </div>
    );
}
