"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useEidolonHook } from "@/hooks/useEidolonHook";
import Link from "next/link";
import { TokenSelector } from "@/components/sanctum/TokenSelector";
import { useGhostPositions } from "@/hooks/useGhostPositions";
import { useRevokePermit } from "@/hooks/useRevokePermit";
import { toast } from "sonner";

import { useAccount, useReadContracts, useWriteContract, usePublicClient, useWalletClient } from "wagmi";
import { CONTRACTS, INITIALIZED_POOLS, POOLS } from "@/config/web3";
import EidolonHookABI from "@/abi/EidolonHook.json";
import { formatUnits, parseAbi, hexToBigInt } from "viem";
import { TOKENS, TOKEN_MAP } from "@/config/tokens";
import { useLocalStorage } from "usehooks-ts";
import { getPoolId, getTokenByAddress } from "@/utils/uniswap";

const LIQUIDITY_PROVIDER_ABI = parseAbi([
    "function removeLiquidity((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint128 liquidity, int24 tickLower, int24 tickUpper) external",
    "function userLiquidity(address provider, bytes32 poolId) external view returns (uint128)"
]);

function truncateAddress(address: string) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function MirrorDashboard() {
    const [showRevokeModal, setShowRevokeModal] = useState(false);
    const [selectedPosition, setSelectedPosition] = useState<any>(null); // Unified Position Type
    const [showTokenSelector, setShowTokenSelector] = useState(false);
    const { fees, membership } = useEidolonHook();
    const { positions: ghostPositions, revokePosition } = useGhostPositions(); // Ghost
    const { revokePermit, isPending: isRevoking } = useRevokePermit();
    const { address, isConnected } = useAccount();
    const [now, setNow] = useState(() => Date.now());

    // Standard LP State
    const { writeContractAsync } = useWriteContract();
    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient();
    const [isRemoving, setIsRemoving] = useState(false);
    const [customPools] = useLocalStorage<any[]>('eidolon-custom-pools', []);

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    // 1. Fetch Real Accumulated Rewards (ETH, USDC, eiETH)
    const rewardTokens = [
        TOKEN_MAP["ETH"]?.address || "0x0000000000000000000000000000000000000000",
        TOKEN_MAP["USDC"]?.address || "0x31d0220469e10c4E71834a79b1f276d740d3768F",
        TOKEN_MAP["eiETH"]?.address || "0xe02eb159eb92dd0388ecdb33d0db0f8831091be6"
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

    const earnings = {
        ETH: earningsData?.[0]?.result ? Number(formatUnits(earningsData[0].result as bigint, 18)) : 0,
        USDC: earningsData?.[1]?.result ? Number(formatUnits(earningsData[1].result as bigint, 6)) : 0,
        eiETH: earningsData?.[2]?.result ? Number(formatUnits(earningsData[2].result as bigint, 18)) : 0,
    };

    const rewardsDisplay = [
        earnings.ETH > 0 ? `${earnings.ETH.toFixed(4)} ETH` : null,
        earnings.USDC > 0 ? `${earnings.USDC.toFixed(2)} USDC` : null,
        earnings.eiETH > 0 ? `${earnings.eiETH.toFixed(4)} eiETH` : null
    ].filter(Boolean).join(" + ") || "0.00";

    // 2. Ghost Positions Processing
    const userGhostPositions = useMemo(() => {
        if (!isConnected || !address || !Array.isArray(ghostPositions)) return [];
        return ghostPositions.filter(p => p && p.provider && typeof p.provider === 'string' && p.provider.toLowerCase() === address.toLowerCase() && p.status === 'Active')
            .map(p => ({ ...p, isGhost: true, id: p.id || p.nonce }));
    }, [ghostPositions, address, isConnected]);

    // 3. Standard LP Discovery & Fetching
    const allKnownPools = useMemo(() => {
        // Normalize
        const initials = INITIALIZED_POOLS.map(p => ({
            token0: p.token0,
            token1: p.token1,
            fee: p.fee,
            tickSpacing: p.tickSpacing,
            hooks: p.hook
        }));
        // Merge custom
        const merged = [...initials];
        customPools.forEach(cp => {
            if (!merged.some(m => m.token0 === cp.token0 && m.token1 === cp.token1 && m.fee === cp.fee)) {
                merged.push(cp);
            }
        });
        return merged;
    }, [customPools]);

    const { data: lpData } = useReadContracts({
        contracts: allKnownPools.map(pool => {
            const pid = getPoolId(pool.token0 as `0x${string}`, pool.token1 as `0x${string}`, pool.fee, pool.tickSpacing, pool.hooks as `0x${string}`);
            return {
                address: CONTRACTS.unichainSepolia.liquidityProvider,
                abi: LIQUIDITY_PROVIDER_ABI,
                functionName: 'userLiquidity',
                args: [address!, pid],
                chainId: 1301
            } as const;
        }),
        query: { enabled: !!address && allKnownPools.length > 0, refetchInterval: 10000 }
    });

    const standardPositions = useMemo(() => {
        if (!lpData) return [];
        const positions: any[] = [];
        lpData.forEach((res, idx) => {
            if (res && res.status === 'success' && res.result && (res.result as bigint) > 0n) {
                const pool = allKnownPools[idx];
                const t0 = getTokenByAddress(pool.token0);
                const t1 = getTokenByAddress(pool.token1);
                positions.push({
                    id: `std-${idx}`,
                    isGhost: false,
                    tokenA: t0?.symbol || truncateAddress(pool.token0),
                    tokenB: t1?.symbol || truncateAddress(pool.token1),
                    amountA: "Liquidity",
                    amountB: "Position",
                    liquidity: res.result,
                    poolConfig: pool,
                    expiry: 0, // No expiry
                    status: 'Active',
                    type: 'standard_lp'
                });
            }
        });
        return positions;
    }, [lpData, allKnownPools]);

    // Combined Positions
    const activePositions = useMemo(() => [...userGhostPositions, ...standardPositions], [userGhostPositions, standardPositions]);

    const userTier = membership.isMember ? "Pro Member" : "Standard User";
    const feeTier = membership.isMember ? "0%" : `${fees.dualSided}%`;

    // Handlers
    const handleActionClick = (pos: any) => {
        setSelectedPosition(pos);
        setShowRevokeModal(true);
    };

    const confirmAction = async () => {
        if (!selectedPosition) return;

        try {
            if (selectedPosition.isGhost) {
                // REVOKE GHOST
                let txHash = undefined;
                if (selectedPosition.nonce) {
                    txHash = await revokePermit(selectedPosition.nonce);
                    toast.success("Permit revoked on-chain successfully");
                }
                revokePosition(selectedPosition.id, txHash);
            } else {
                // REMOVE STANDARD LP
                setIsRemoving(true);
                const pool = selectedPosition.poolConfig;
                // Full Range implied for simplified UI? PoolManager used getFullRangeTicks. 
                // We must use the SAME ticks used to Add. 
                // Assumption: User added full range. If not, removal might fail or stick.
                // For this demo, we assume Full Range (std strategy).

                const getFullRangeTicks = (spacing: number) => {
                    const MAX_TICK = 887272;
                    const alignedMax = Math.floor(MAX_TICK / spacing) * spacing;
                    const alignedMin = -alignedMax;
                    return { lower: alignedMin, upper: alignedMax };
                };
                const { lower, upper } = getFullRangeTicks(pool.tickSpacing);

                if (!publicClient || !walletClient) throw new Error("Client not ready");

                const { request } = await publicClient.simulateContract({
                    address: CONTRACTS.unichainSepolia.liquidityProvider,
                    abi: LIQUIDITY_PROVIDER_ABI,
                    functionName: 'removeLiquidity',
                    args: [
                        { ...pool, currency0: pool.token0, currency1: pool.token1, hooks: pool.hooks },
                        selectedPosition.liquidity, // Remove All
                        lower, upper
                    ],
                    account: address as `0x${string}`
                });
                const hash = await walletClient.writeContract(request);
                await publicClient.waitForTransactionReceipt({ hash });
                toast.success("Liquidity Removed Successfully");
            }

            setShowRevokeModal(false);
            setSelectedPosition(null);
        } catch (error: any) {
            console.error("Action Failed:", error);
            toast.error("Action Failed", { description: error.message || "Unknown error" });
        } finally {
            setIsRemoving(false);
        }
    };

    return (
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 md:px-6 lg:px-8">
            <TokenSelector
                isOpen={showTokenSelector}
                onClose={() => setShowTokenSelector(false)}
                onSelect={(token: any) => { setShowTokenSelector(false); }}
            />

            {/* Top Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                {/* Virtual TVL */}
                <div className="relative overflow-visible p-4 md:p-6 group bg-black border border-white/10 hover:border-phantom-cyan/50 transition-all">
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute -right-10 -top-10 h-32 w-32 bg-phantom-cyan/5 blur-3xl transition-all group-hover:bg-phantom-cyan/10"></div>
                    </div>
                    <div className="relative z-10 flex items-center justify-between mb-2 md:mb-4">
                        <div className="flex items-center gap-2">
                            <p className="text-slate-500 text-[10px] md:text-sm font-bold uppercase tracking-widest">Virtual TVL</p>
                            <span className="material-symbols-outlined text-xs text-slate-600">info</span>
                        </div>
                        <span className="material-symbols-outlined text-slate-600 group-hover:text-phantom-cyan transition-colors text-base md:text-lg">query_stats</span>
                    </div>
                    <div className="relative z-10 flex items-baseline gap-2 md:gap-3">
                        <h3 className="text-2xl md:text-3xl font-bold text-white font-mono tracking-tighter">$4,203,192<span className="text-slate-600 text-lg md:text-xl">.00</span></h3>
                    </div>
                </div>

                {/* Account Status */}
                <div className="relative overflow-visible p-4 md:p-6 group bg-black border border-white/10 hover:border-signal-cyan/50 transition-all">
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute -right-10 -top-10 h-32 w-32 bg-secondary/5 blur-3xl transition-all group-hover:bg-secondary/10"></div>
                    </div>
                    <div className="relative z-10 flex items-center justify-between mb-2 md:mb-4">
                        <div className="flex items-center gap-2">
                            <p className="text-slate-500 text-[10px] md:text-sm font-bold uppercase tracking-widest">Tier</p>
                            <span className="material-symbols-outlined text-xs text-slate-600">info</span>
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

                {/* Rewards */}
                <div className="relative overflow-visible p-4 md:p-6 group border border-phantom-cyan/30 bg-black hover:border-phantom-cyan/60 transition-all">
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute -right-10 -top-10 h-32 w-32 bg-phantom-cyan/10 blur-3xl transition-all group-hover:bg-phantom-cyan/20"></div>
                    </div>
                    <div className="relative z-10 flex items-center justify-between mb-2 md:mb-4">
                        <div className="flex items-center gap-2">
                            <p className="text-phantom-cyan text-[10px] md:text-sm font-bold uppercase tracking-widest">Rewards</p>
                            <span className="material-symbols-outlined text-xs text-phantom-cyan/60">info</span>
                        </div>
                        <span className="material-symbols-outlined text-phantom-cyan text-base md:text-lg">savings</span>
                    </div>
                    <div className="relative z-10 flex items-baseline justify-between w-full">
                        <h3 className="text-lg md:text-xl font-bold text-white font-mono tracking-tighter truncate" title={rewardsDisplay}>
                            {rewardsDisplay}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Positions Table */}
            <div className="flex flex-col gap-4">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-1 gap-4 md:gap-0">
                    <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">view_list</span>
                        Portfolio
                    </h2>
                    <div className="flex gap-2">
                        <button className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                            <span className="material-symbols-outlined">refresh</span>
                        </button>
                    </div>
                </div>

                <div className="overflow-hidden bg-black/60 border border-white/5 rounded-xl">
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">Asset Pair</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">Type</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">Liquidity / Amount</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest font-mono text-center">Expiry</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest font-mono text-center">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest font-mono text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-sm">
                                {activePositions.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-mono">
                                            Void of active Positions.
                                        </td>
                                    </tr>
                                ) : (
                                    activePositions.map((pos) => (
                                        <PositionRow key={pos.id} pos={pos} now={now} onRevoke={handleActionClick} />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {/* Mobile View Omitted for Brevity but should follow same pattern */}
                    <div className="md:hidden divide-y divide-white/5">
                        {activePositions.map((pos) => (
                            <PositionCard key={pos.id} pos={pos} now={now} onRevoke={handleActionClick} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Action Modal */}
            {showRevokeModal && selectedPosition && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0a0f]/80 backdrop-blur-sm">
                    <div className="glass-modal relative w-full max-w-md transform overflow-hidden rounded-2xl border border-red-500/30 p-1 shadow-2xl transition-all bg-[rgba(10,10,15,0.85)] backdrop-blur-2xl">
                        <div className="relative flex flex-col items-center p-6 sm:p-8">
                            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                                <span className="material-symbols-outlined text-4xl text-red-500 animate-pulse">warning</span>
                            </div>
                            <h3 className="mb-2 text-2xl font-bold tracking-tight text-center">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ef4444] to-[#a855f7]">
                                    {selectedPosition.isGhost ? "Revoke Permit?" : "Remove Liquidity?"}
                                </span>
                            </h3>
                            <p className="mb-8 text-center text-sm text-slate-400">
                                {selectedPosition.isGhost
                                    ? "This action is irreversible. You are about to revoke a Ghost Permit."
                                    : "This will remove your liquidity from the pool and return assets to your wallet."
                                }
                            </p>

                            <div className="grid w-full grid-cols-2 gap-4">
                                <button
                                    onClick={() => setShowRevokeModal(false)}
                                    className="flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmAction}
                                    disabled={isRevoking || isRemoving}
                                    className="group relative flex items-center justify-center overflow-hidden rounded-lg bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-neon-danger transition-all hover:bg-red-500 hover:shadow-[0_0_20px_rgba(239,68,68,0.6)] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {(isRevoking || isRemoving) ? (
                                        <span className="flex items-center gap-2">
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Processing...
                                        </span>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined mr-2 text-lg">delete_forever</span>
                                            Same
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
    const timeLeft = pos.expiry ? Math.max(0, pos.expiry - now) : 0;
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const isExpired = pos.expiry > 0 && timeLeft <= 0;

    return (
        <tr className="group hover:bg-white/[0.02] transition-colors">
            <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                    <div>
                        <div className="font-bold text-white flex items-center gap-2">
                            {pos.tokenA}-{pos.tokenB}
                        </div>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4">
                <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded border font-bold ${pos.isGhost ? 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10' : 'text-purple-300 border-purple-500/30 bg-purple-500/10'}`}>
                    {pos.isGhost ? (pos.type === 'swap' ? 'Ghost Swap' : 'Ghost LP') : 'Standard LP'}
                </span>
            </td>
            <td className="px-6 py-4 font-mono text-slate-300">
                <div className="flex flex-col">
                    <span>{pos.amountA} <span className="text-xs text-slate-500">{pos.tokenA}</span></span>
                    {pos.isGhost && pos.liquidityMode === 'dual-sided' && <span>{pos.amountB} <span className="text-xs text-slate-500">{pos.tokenB}</span></span>}
                    {!pos.isGhost && <span className="text-[10px] text-slate-500">(Raw Liquidity: {Number(pos.liquidity).toString()})</span>}
                </div>
            </td>
            <td className="px-6 py-4 text-center">
                {pos.isGhost ? (
                    <div className={`inline-flex items-center gap-1.5 font-mono text-xs ${isExpired ? 'text-red-400' : 'text-emerald-400'}`}>
                        {isExpired ? "Expired" : `${hours}h ${minutes}m`}
                    </div>
                ) : (
                    <span className="text-xs text-slate-500">Permanent</span>
                )}
            </td>
            <td className="px-6 py-4 text-center">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${isExpired ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                    {isExpired ? "OFFLINE" : "ACTIVE"}
                </span>
            </td>
            <td className="px-6 py-4 text-right">
                <button onClick={() => onRevoke(pos)} className="p-2 text-slate-500 hover:text-red-400 transition-colors">
                    <span className="material-symbols-outlined text-lg">{pos.isGhost ? 'delete' : 'remove_circle'}</span>
                </button>
            </td>
        </tr>
    );
});

PositionRow.displayName = 'PositionRow';

const PositionCard = React.memo(({ pos, now, onRevoke }: { pos: any, now: number, onRevoke: (pos: any) => void }) => {
    return (
        <div className="p-4 flex flex-col gap-4">
            <div className="flex justify-between">
                <div className="font-bold text-white">{pos.tokenA}-{pos.tokenB}</div>
                <div className="text-xs text-slate-400">{pos.isGhost ? 'GHOST' : 'STD LP'}</div>
            </div>
            <button onClick={() => onRevoke(pos)} className="w-full py-2 bg-red-500/10 text-red-400 rounded">
                {pos.isGhost ? 'Revoke' : 'Remove'}
            </button>
        </div>
    )
});
PositionCard.displayName = 'PositionCard';
