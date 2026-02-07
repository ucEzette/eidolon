"use client";

import React, { useState, useEffect } from "react";
import { useEidolonHook } from "@/hooks/useEidolonHook";
import Link from "next/link";
import { TokenSelector } from "@/components/sanctum/TokenSelector";
import { useGhostPositions } from "@/hooks/useGhostPositions";
import { useRevokePermit } from "@/hooks/useRevokePermit";
import { toast } from "sonner";

import { useAccount, useReadContracts } from "wagmi";
import { CONTRACTS } from "@/config/web3";
import EidolonHookABI from "@/abi/EidolonHook.json";
import { formatUnits } from "viem";
import { TOKENS } from "@/config/tokens";

export function MirrorDashboard() {
    const [showRevokeModal, setShowRevokeModal] = useState(false);
    const [selectedPosition, setSelectedPosition] = useState<any>(null);
    const [showTokenSelector, setShowTokenSelector] = useState(false);
    const { fees, membership } = useEidolonHook();
    const { positions, revokePosition } = useGhostPositions();
    const { revokePermit, isPending: isRevoking } = useRevokePermit();
    const { address, isConnected } = useAccount();
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    // 1. Fetch Real Accumulated Rewards (ETH, USDC, eiETH)
    // We check the 'lifetimeEarnings' mapping for the connected user
    const rewardTokens = [
        "0x0000000000000000000000000000000000000000", // ETH
        "0x31d0220469e10c4E71834a79b1f276d740d3768F", // USDC
        "0xe02eb159eb92dd0388ecdb33d0db0f8831091be6"  // eiETH
    ];

    const { data: earningsData } = useReadContracts({
        contracts: rewardTokens.map(token => ({
            address: CONTRACTS.unichainSepolia.eidolonHook,
            abi: EidolonHookABI as any,
            functionName: "lifetimeEarnings",
            args: [address, token],
            chainId: 1301
        })),
        query: {
            refetchInterval: 5000,
            enabled: !!address
        }
    });

    // Calculate Total Earnings (Naive Sum for Demo)
    const earnings = {
        ETH: earningsData?.[0]?.result ? Number(formatUnits(earningsData[0].result as bigint, 18)) : 0,
        USDC: earningsData?.[1]?.result ? Number(formatUnits(earningsData[1].result as bigint, 6)) : 0,
        eiETH: earningsData?.[2]?.result ? Number(formatUnits(earningsData[2].result as bigint, 18)) : 0,
    };

    // Display string: e.g., "0.05 ETH + 20 USDC"
    const rewardsDisplay = [
        earnings.ETH > 0 ? `${earnings.ETH.toFixed(4)} ETH` : null,
        earnings.USDC > 0 ? `${earnings.USDC.toFixed(2)} USDC` : null,
        earnings.eiETH > 0 ? `${earnings.eiETH.toFixed(4)} eiETH` : null
    ].filter(Boolean).join(" + ") || "0.00";

    const userPositions = isConnected && address && Array.isArray(positions)
        ? positions.filter(p => p && p.provider && typeof p.provider === 'string' && p.provider.toLowerCase() === address.toLowerCase())
        : [];

    const activePositions = Array.isArray(userPositions)
        ? userPositions.filter(p => p && p.status === 'Active')
        : [];
    const totalPoints = activePositions.length * 100 + (membership?.isMember ? 500 : 0);

    // ... (keep existing variables)

    const handleRevokeClick = (pos: any) => {
        setSelectedPosition(pos);
        setShowRevokeModal(true);
    };

    const confirmRevoke = async () => {
        if (selectedPosition) {
            try {
                let txHash = undefined;
                if (selectedPosition.nonce) {
                    txHash = await revokePermit(selectedPosition.nonce);
                    toast.success("Permit revoked on-chain successfully");
                } else {
                    console.warn("No nonce found for position, removing locally only");
                }

                revokePosition(selectedPosition.id, txHash);
                setShowRevokeModal(false);
                setSelectedPosition(null);
            } catch (error) {
                console.error("Failed to revoke:", error);
                toast.error("Failed to revoke permit");
            }
        }
    };

    // ... inside Modal Button ...

    <button
        onClick={confirmRevoke}
        disabled={isRevoking}
        className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-neon-danger transition-all hover:bg-red-500 hover:shadow-[0_0_20px_rgba(239,68,68,0.6)] disabled:opacity-50 disabled:cursor-not-allowed"
    >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:animate-[shimmer_1s_infinite]"></div>
        {isRevoking ? (
            <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Revoking...
            </span>
        ) : (
            <>
                <span className="material-symbols-outlined mr-2 text-lg">delete_forever</span>
                Confirm Revoke
            </>
        )}
    </button>

    // Helper for modal time display
    const getModalTimeLeft = () => {
        if (!selectedPosition) return "";
        const timeLeft = Math.max(0, selectedPosition.expiry - now);
        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        return timeLeft <= 0 ? "Expired" : `${hours}h ${minutes}m`;
    };

    // Helper for modal time display moved up, clean render block follows
    // In a real app, this would query the contract or an indexer for actual earnings
    const userTier = membership.isMember ? "Pro Member" : "Standard User";
    const feeTier = membership.isMember ? "0%" : `${fees.dualSided}%`;

    return (
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 md:px-6 lg:px-8">
            <TokenSelector
                isOpen={showTokenSelector}
                onClose={() => setShowTokenSelector(false)}
                onSelect={(token: any) => {
                    setShowTokenSelector(false);
                }}
            />

            {/* Top Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                {/* Card 1: Virtual TVL */}
                <div className="relative overflow-visible p-4 md:p-6 group bg-black border border-white/10 hover:border-phantom-cyan/50 transition-all">
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute -right-10 -top-10 h-32 w-32 bg-phantom-cyan/5 blur-3xl transition-all group-hover:bg-phantom-cyan/10"></div>
                    </div>
                    <div className="relative z-10 flex items-center justify-between mb-2 md:mb-4">
                        <div className="flex items-center gap-2">
                            <p className="text-slate-500 text-[10px] md:text-sm font-bold uppercase tracking-widest">Virtual TVL</p>
                            {/* Info Tooltip */}
                            <div className="relative group/info">
                                <button className="p-0.5 hover:bg-white/10 transition-colors">
                                    <span className="material-symbols-outlined text-[12px] md:text-[14px] text-slate-600 group-hover/info:text-phantom-cyan">info</span>
                                </button>
                                <div className="absolute left-0 top-6 z-50 w-64 p-3 bg-black border border-phantom-cyan/30 shadow-2xl opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all duration-200">
                                    <p className="font-bold text-phantom-cyan text-xs mb-1 font-mono uppercase">Virtual TVL</p>
                                    <p className="text-white/60 text-xs font-mono">Total value of all Ghost Permits. "Phantom" liquidity.</p>
                                </div>
                            </div>
                        </div>
                        <span className="material-symbols-outlined text-slate-600 group-hover:text-phantom-cyan transition-colors text-base md:text-lg">query_stats</span>
                    </div>
                    <div className="relative z-10 flex items-baseline gap-2 md:gap-3">
                        <h3 className="text-2xl md:text-3xl font-bold text-white font-mono tracking-tighter">$4,203,192<span className="text-slate-600 text-lg md:text-xl">.00</span></h3>
                    </div>
                    <div className="relative z-10 mt-1 md:mt-2 flex items-center gap-1.5 text-[10px] md:text-xs font-medium text-emerald-500 font-mono">
                        <span className="material-symbols-outlined text-xs md:text-sm">trending_up</span>
                        <span>+1.2% (24h)</span>
                    </div>
                </div>

                {/* Card 2: Account Status */}
                <div className="relative overflow-visible p-4 md:p-6 group bg-black border border-white/10 hover:border-signal-cyan/50 transition-all">
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute -right-10 -top-10 h-32 w-32 bg-secondary/5 blur-3xl transition-all group-hover:bg-secondary/10"></div>
                    </div>
                    <div className="relative z-10 flex items-center justify-between mb-2 md:mb-4">
                        <div className="flex items-center gap-2">
                            <p className="text-slate-500 text-[10px] md:text-sm font-bold uppercase tracking-widest">Tier</p>
                            <div className="relative group/info">
                                <button className="p-0.5 hover:bg-white/10 transition-colors">
                                    <span className="material-symbols-outlined text-[12px] md:text-[14px] text-slate-600 group-hover/info:text-secondary">info</span>
                                </button>
                                <div className="absolute left-0 top-6 z-50 w-64 p-3 bg-black border border-secondary/30 shadow-2xl opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all duration-200">
                                    <p className="font-bold text-secondary text-xs mb-1 font-mono uppercase">Membership</p>
                                    <p className="text-white/60 text-xs font-mono">{membership.isMember ? "Active membership." : "Standard user."}</p>
                                </div>
                            </div>
                        </div>
                        <span className="material-symbols-outlined text-slate-600 group-hover:text-secondary transition-colors text-base md:text-lg">badge</span>
                    </div>
                    <div className="relative z-10 flex items-baseline gap-2 md:gap-3">
                        <h3 className="text-xl md:text-2xl font-bold text-white font-mono tracking-tighter truncate">{userTier}</h3>
                        <span className={`px-1.5 md:px-2 py-0.5 text-[8px] md:text-xs font-bold uppercase tracking-wider border ${membership.isMember ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                            {membership.isMember ? 'Active' : 'Basic'}
                        </span>
                    </div>
                    <div className="relative z-10 mt-1 md:mt-2 flex items-center gap-1.5 text-[10px] md:text-xs font-medium text-slate-500 font-mono">
                        <span>Fee Rate: <span className="text-white">{feeTier}</span></span>
                    </div>
                </div>

                {/* Card 3: Your Rewards */}
                <div className="relative overflow-visible p-4 md:p-6 group border border-phantom-cyan/30 bg-black hover:border-phantom-cyan/60 transition-all">
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute -right-10 -top-10 h-32 w-32 bg-phantom-cyan/10 blur-3xl transition-all group-hover:bg-phantom-cyan/20"></div>
                    </div>
                    <div className="relative z-10 flex items-center justify-between mb-2 md:mb-4">
                        <div className="flex items-center gap-2">
                            <p className="text-phantom-cyan text-[10px] md:text-sm font-bold uppercase tracking-widest">Rewards</p>
                            <div className="relative group/info">
                                <button className="p-0.5 hover:bg-white/10 transition-colors">
                                    <span className="material-symbols-outlined text-[12px] md:text-[14px] text-phantom-cyan/60 group-hover/info:text-phantom-cyan">info</span>
                                </button>
                                <div className="absolute left-0 top-6 z-50 w-64 p-3 bg-black border border-phantom-cyan/30 shadow-2xl opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all duration-200">
                                    <p className="font-bold text-phantom-cyan text-xs mb-1 font-mono uppercase">Realized Fees</p>
                                    <p className="text-white/60 text-xs font-mono">Accumulated fees paid directly to your wallet.</p>
                                </div>
                            </div>
                        </div>
                        <span className="material-symbols-outlined text-phantom-cyan text-base md:text-lg">savings</span>
                    </div>
                    <div className="relative z-10 flex items-baseline justify-between w-full">
                        <h3 className="text-lg md:text-xl font-bold text-white font-mono tracking-tighter truncate" title={rewardsDisplay}>
                            {rewardsDisplay}
                        </h3>
                    </div>
                    <div className="mt-1 md:mt-2 flex items-center gap-1.5 text-[10px] md:text-xs font-medium text-slate-500 font-mono">
                        <span>Auto-compound: ON</span>
                    </div>
                </div>
            </div>

            {/* Active Positions Table */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-1 gap-4 md:gap-0">
                    <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">view_list</span>
                        Active Mirror Positions
                    </h2>
                    <div className="flex gap-2">
                        <Link
                            href="/summon"
                            className="flex items-center gap-2 px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 hover:text-white border border-cyan-500/30 rounded-lg transition-colors font-medium text-sm"
                        >
                            <span className="material-symbols-outlined text-lg">add_circle</span>
                            Summon
                        </Link>
                        <button className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                            <span className="material-symbols-outlined">filter_list</span>
                        </button>
                        <button className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                            <span className="material-symbols-outlined">refresh</span>
                        </button>
                    </div>
                </div>

                {/* Sync Status Info */}
                <div className="mx-1 mb-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-start md:items-center gap-2 text-emerald-200 text-xs md:text-sm animate-in fade-in duration-700">
                    <span className="material-symbols-outlined text-base md:text-lg shrink-0">cloud_sync</span>
                    <p>
                        <strong>Ghost Network Active:</strong> Your permits are securely synced to the Relayer and visible across all authorized devices.
                    </p>
                </div>

                <div className="overflow-hidden bg-black/60 border border-white/5 rounded-xl">
                    {/* Desktop View: Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">Asset Pair</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">Type</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">Liquidity</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest font-mono text-center">Expiry</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest font-mono text-center">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest font-mono text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-sm">
                                {activePositions.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-mono">
                                            Void of active Mirror Positions.
                                        </td>
                                    </tr>
                                ) : (
                                    activePositions.map((pos) => (
                                        <PositionRow key={pos.id} pos={pos} now={now} onRevoke={handleRevokeClick} />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile View: Cards */}
                    <div className="md:hidden divide-y divide-white/5">
                        {activePositions.length === 0 ? (
                            <div className="px-6 py-12 text-center text-slate-500 font-mono text-sm">
                                No active Mirror Positions.
                            </div>
                        ) : (
                            activePositions.map((pos) => (
                                <PositionCard key={pos.id} pos={pos} now={now} onRevoke={handleRevokeClick} />
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Revoke Modal */}
            {/* Revoke Modal */}
            {showRevokeModal && selectedPosition && (
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
                                                <div className="h-5 w-5 rounded-full bg-slate-700 ring-1 ring-[#13131a] flex items-center justify-center text-[6px] font-bold text-white bg-gradient-to-br from-blue-600 to-indigo-600">{selectedPosition.tokenA[0]}</div>
                                                <div className="h-5 w-5 rounded-full bg-slate-700 ring-1 ring-[#13131a] flex items-center justify-center text-[6px] font-bold text-white bg-gradient-to-br from-blue-400 to-cyan-400">{selectedPosition.tokenB[0]}</div>
                                            </div>
                                            <span className="font-mono text-sm font-bold text-white">{selectedPosition.tokenA}-{selectedPosition.tokenB}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                                        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Liquidity</span>
                                        <div className="flex flex-col items-end">
                                            <span className="font-mono text-sm font-bold text-white">{selectedPosition.amountA} {selectedPosition.tokenA}</span>
                                            {selectedPosition.liquidityMode === 'dual-sided' && (
                                                <span className="font-mono text-xs text-slate-400">{selectedPosition.amountB} {selectedPosition.tokenB}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Time Remaining</span>
                                        <span className="font-mono text-sm font-bold text-emerald-400">{getModalTimeLeft()}</span>
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
                                    onClick={confirmRevoke}
                                    disabled={isRevoking}
                                    className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-neon-danger transition-all hover:bg-red-500 hover:shadow-[0_0_20px_rgba(239,68,68,0.6)] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:animate-[shimmer_1s_infinite]"></div>
                                    {isRevoking ? (
                                        <span className="flex items-center gap-2">
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Revoking...
                                        </span>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined mr-2 text-lg">delete_forever</span>
                                            Confirm Revoke
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const PositionRow = React.memo(({ pos, now, onRevoke }: { pos: any, now: number, onRevoke: (pos: any) => void }) => {
    const timeLeft = Math.max(0, pos.expiry - now);
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const isExpired = timeLeft <= 0;
    const isExpiringSoon = timeLeft < 3 * 60 * 60 * 1000 && !isExpired;
    const isDual = pos.liquidityMode === 'dual-sided';

    return (
        <tr className="group hover:bg-white/[0.02] transition-colors">
            <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                        <div className="h-8 w-8 rounded-full bg-slate-700 ring-2 ring-[#13131a] flex items-center justify-center text-[10px] font-bold text-white bg-gradient-to-br from-blue-600 to-indigo-600">{pos.tokenA?.[0]}</div>
                        <div className="h-8 w-8 rounded-full bg-slate-700 ring-2 ring-[#13131a] flex items-center justify-center text-[10px] font-bold text-white bg-gradient-to-br from-blue-400 to-cyan-400">{pos.tokenB?.[0]}</div>
                    </div>
                    <div>
                        <div className="font-bold text-white flex items-center gap-2">
                            {pos.tokenA}-{pos.tokenB}
                        </div>
                        <div className="text-xs text-slate-500">Unichain Sepolia</div>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4">
                <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded border font-bold ${pos.type === 'swap' ? 'text-amber-300 border-amber-500/30 bg-amber-500/10' : 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10'}`}>
                    {pos.type === 'swap' ? 'Swap Intent' : (isDual ? 'LP (Dual)' : 'LP (Single)')}
                </span>
            </td>
            <td className="px-6 py-4 font-mono text-slate-300">
                <div className="flex flex-col">
                    <span>{pos.amountA} <span className="text-xs text-slate-500">{pos.tokenA}</span></span>
                    {isDual && <span>{pos.amountB} <span className="text-xs text-slate-500">{pos.tokenB}</span></span>}
                </div>
            </td>
            <td className="px-6 py-4 text-center">
                <div className={`inline-flex items-center gap-1.5 font-mono text-xs ${isExpired ? 'text-red-400' : (isExpiringSoon ? 'text-amber-400' : 'text-emerald-400')}`}>
                    {isExpired ? "Expired" : `${hours}h ${minutes}m`}
                </div>
            </td>
            <td className="px-6 py-4 text-center">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${isExpired ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                    {isExpired ? "OFFLINE" : "ACTIVE"}
                </span>
            </td>
            <td className="px-6 py-4 text-right">
                <button onClick={() => onRevoke(pos)} className="p-2 text-slate-500 hover:text-red-400 transition-colors">
                    <span className="material-symbols-outlined text-lg">delete</span>
                </button>
            </td>
        </tr>
    );
});

PositionRow.displayName = 'PositionRow';

const PositionCard = React.memo(({ pos, now, onRevoke }: { pos: any, now: number, onRevoke: (pos: any) => void }) => {
    const timeLeft = Math.max(0, pos.expiry - now);
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const isExpired = timeLeft <= 0;
    const isDual = pos.liquidityMode === 'dual-sided';

    return (
        <div className="p-4 flex flex-col gap-4">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <div className="flex -space-x-1.5">
                        <div className="h-7 w-7 rounded-full bg-slate-700 ring-2 ring-[#0a0a0f] flex items-center justify-center text-[8px] font-bold text-white bg-gradient-to-br from-blue-600 to-indigo-600">{pos.tokenA?.[0]}</div>
                        <div className="h-7 w-7 rounded-full bg-slate-700 ring-2 ring-[#0a0a0f] flex items-center justify-center text-[8px] font-bold text-white bg-gradient-to-br from-blue-400 to-cyan-400">{pos.tokenB?.[0]}</div>
                    </div>
                    <div>
                        <div className="text-sm font-bold text-white">{pos.tokenA}-{pos.tokenB}</div>
                        <div className={`text-[10px] uppercase tracking-wider font-bold ${pos.type === 'swap' ? 'text-amber-400' : 'text-slate-500'}`}>
                            {pos.type === 'swap' ? 'Swap Intent' : (isDual ? 'Dual Sided LP' : 'Single Sided LP')}
                        </div>
                    </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${isExpired ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                    {isExpired ? 'OFFLINE' : 'ACTIVE'}
                </span>
            </div>
            <div className="grid grid-cols-2 gap-4 bg-white/5 rounded-lg p-3">
                <div>
                    <div className="text-[10px] text-slate-500 uppercase mb-1">Liquidity</div>
                    <div className="text-xs font-mono text-white truncate">{pos.amountA} {pos.tokenA}</div>
                    {isDual && <div className="text-xs font-mono text-white truncate">{pos.amountB} {pos.tokenB}</div>}
                </div>
                <div className="text-right">
                    <div className="text-[10px] text-slate-500 uppercase mb-1">Expires In</div>
                    <div className={`text-xs font-mono font-bold ${isExpired ? 'text-red-400' : 'text-emerald-400'}`}>
                        {isExpired ? 'Now' : `${hours}h ${minutes}m`}
                    </div>
                </div>
            </div>
            <button
                onClick={() => onRevoke(pos)}
                className="w-full py-2.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 font-bold text-xs flex items-center justify-center gap-2 active:bg-red-500/20 transition-all"
            >
                <span className="material-symbols-outlined text-sm">delete</span>
                REVOKE PERMIT
            </button>
        </div>
    );
});

PositionCard.displayName = 'PositionCard';
