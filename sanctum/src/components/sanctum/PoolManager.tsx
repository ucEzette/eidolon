"use client";

import { useEffect, useState, useMemo } from "react";
import { TOKENS, type Token } from "@/config/tokens";
import { TokenSelector } from "@/components/sanctum/TokenSelector";
import { CONTRACTS, unichainSepolia } from "@/config/web3";
import { toast } from "sonner";
import { useAccount, useWriteContract, useReadContract, useReadContracts, useChainId, useSwitchChain } from "wagmi";
import { getPoolId, getSqrtPriceX96 } from "@/utils/uniswap";
import { parseAbi, encodeAbiParameters, keccak256, hexToBigInt, type Address } from "viem";

const POOL_MANAGER_ABI = parseAbi([
    "function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96) external payable returns (int24 tick)",
    "function extsload(bytes32 slot) external view returns (bytes32 value)"
]);

// Helper to calculate storage slot for _pools[poolId] (Slot 6)
const POOL_STORAGE_SLOT = 6n;
function getPoolStateSlot(poolId: Address) {
    return keccak256(encodeAbiParameters(
        [{ type: 'bytes32' }, { type: 'uint256' }],
        [poolId, POOL_STORAGE_SLOT]
    ));
}

function getTokenByAddress(address: string): Token | undefined {
    return TOKENS.find(t => t.address.toLowerCase() === address.toLowerCase());
}

function truncateAddress(address: string) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function sqrtPriceToPrice(sqrtPriceX96: bigint, decimals0: number, decimals1: number): string {
    const priceX96 = sqrtPriceX96 * sqrtPriceX96;
    const shift = 1n << 192n;
    const PRICE_PRECISION = 1000000n;
    const numerator = priceX96 * PRICE_PRECISION;
    const ratio = numerator / shift;

    // Adjust for decimals: Ratio * 10^(d0 - d1)
    const decimalDiff = BigInt(decimals0 - decimals1);
    let adjusted = ratio;
    if (decimalDiff > 0n) {
        adjusted = ratio * (10n ** decimalDiff);
    } else if (decimalDiff < 0n) {
        adjusted = ratio / (10n ** (-decimalDiff));
    }

    return (Number(adjusted) / Number(PRICE_PRECISION)).toFixed(2);
}

export function PoolManager() {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const { switchChain } = useSwitchChain();

    const [price, setPrice] = useState<string>("3000"); // Default ETH price
    const { writeContractAsync } = useWriteContract();

    // Removed isExpanded state - Always visible
    const [activeTab, setActiveTab] = useState<'list' | 'create'>('list'); // Tab state

    // Selector State
    const [selectorType, setSelectorType] = useState<'token0' | 'token1' | null>(null);

    // Configuration
    const [poolConfig, setPoolConfig] = useState({
        token0: "0x0000000000000000000000000000000000000000", // ETH (Native)
        token1: "0x31d0220469e10c4E71834a79b1f276d740d3768F", // USDC
        fee: 3000,
        tickSpacing: 60,
        hooks: "0x2eb9Bc212868Ca74c0f9191B3a27990e0dfa80C8"
    });

    // Network Check & Auto-Switch
    const isWrongNetwork = chainId !== unichainSepolia.id;

    useEffect(() => {
        if (isConnected && isWrongNetwork && switchChain) {
            // Optional: Auto-switch logic
        }
    }, [isConnected, isWrongNetwork, switchChain]);

    const handleSwitchNetwork = () => {
        if (switchChain) {
            switchChain({ chainId: unichainSepolia.id });
        }
    };

    const poolId = useMemo(() => {
        return getPoolId(
            poolConfig.token0 as `0x${string}`,
            poolConfig.token1 as `0x${string}`,
            poolConfig.fee,
            poolConfig.tickSpacing,
            poolConfig.hooks as `0x${string}`
        );
    }, [poolConfig]);

    const poolStateSlot = useMemo(() => getPoolStateSlot(poolId), [poolId]);

    // Check if pool exists by reading storage
    const { data: poolStateData, refetch: refetchPool } = useReadContract({
        address: CONTRACTS.unichainSepolia.poolManager as `0x${string}`,
        abi: POOL_MANAGER_ABI,
        functionName: "extsload",
        args: [poolStateSlot],
        chainId: unichainSepolia.id, // Explicitly query correct chain
        query: {
            enabled: !isWrongNetwork
        }
    });

    const isPoolInitialized = useMemo(() => {
        if (!poolStateData) return false;
        return hexToBigInt(poolStateData) !== 0n;
    }, [poolStateData]);

    // Also get list of Official Pools to display status
    const officialPoolKeys = [
        {
            token0: "0x0000000000000000000000000000000000000000", // ETH
            token1: "0x31d0220469e10c4E71834a79b1f276d740d3768F", // USDC
            fee: 3000,
            tickSpacing: 60,
            hooks: "0x2eb9Bc212868Ca74c0f9191B3a27990e0dfa80C8"
        }
    ];

    const officialPoolQueries = officialPoolKeys.map(pk => {
        const pid = getPoolId(pk.token0 as `0x${string}`, pk.token1 as `0x${string}`, pk.fee, pk.tickSpacing, pk.hooks as `0x${string}`);
        const slot = getPoolStateSlot(pid);
        return {
            address: CONTRACTS.unichainSepolia.poolManager as `0x${string}`,
            abi: POOL_MANAGER_ABI,
            functionName: "extsload",
            args: [slot],
            chainId: unichainSepolia.id // Explicitly query correct chain
        } as const;
    });

    const { data: officialPoolsStatus } = useReadContracts({
        contracts: officialPoolQueries,
        query: {
            enabled: !isWrongNetwork
        }
    });

    const handleInitialize = async () => {
        if (isWrongNetwork) {
            handleSwitchNetwork();
            return;
        }

        if (!price || isNaN(Number(price))) {
            toast.error("Invalid price");
            return;
        }

        try {
            const t0 = getTokenByAddress(poolConfig.token0);
            const t1 = getTokenByAddress(poolConfig.token1);

            if (!t0 || !t1) {
                toast.error("Invalid token selection");
                return;
            }

            const sqrtPriceX96 = getSqrtPriceX96(
                Number(price),
                t0.decimals,
                t1.decimals
            );

            // Construct Key
            const [c0, c1] = poolConfig.token0.toLowerCase() < poolConfig.token1.toLowerCase()
                ? [poolConfig.token0, poolConfig.token1]
                : [poolConfig.token1, poolConfig.token0];

            const key = {
                currency0: c0 as `0x${string}`,
                currency1: c1 as `0x${string}`,
                fee: poolConfig.fee,
                tickSpacing: poolConfig.tickSpacing,
                hooks: poolConfig.hooks as `0x${string}`
            };

            const tx = await writeContractAsync({
                address: CONTRACTS.unichainSepolia.poolManager as `0x${string}`,
                abi: POOL_MANAGER_ABI,
                functionName: "initialize",
                args: [key, sqrtPriceX96],
            });

            toast.success("Transaction Sent", { description: "Initializing Pool..." });
            setTimeout(() => { refetchPool(); }, 5000);

        } catch (e: any) {
            console.error(e);
            toast.error("Initialization Failed", { description: e.shortMessage || e.message || "Unknown error" });
        }
    };

    const token0 = getTokenByAddress(poolConfig.token0);
    const token1 = getTokenByAddress(poolConfig.token1);

    return (
        <div className="w-full mt-0 transition-all duration-500 ease-in-out border border-border-dark rounded-2xl overflow-hidden backdrop-blur-xl bg-card-dark shadow-glow shadow-primary/10">
            <TokenSelector
                isOpen={!!selectorType}
                onClose={() => setSelectorType(null)}
                onSelect={(t) => {
                    if (selectorType === 'token0') setPoolConfig({ ...poolConfig, token0: t.address });
                    if (selectorType === 'token1') setPoolConfig({ ...poolConfig, token1: t.address });
                    setSelectorType(null);
                }}
            />

            {/* Header (No longer collapsible) */}
            <div className="p-6 flex justify-between items-center bg-white/5 border-b border-white/5">
                <div>
                    <h2 className="text-3xl font-display bg-gradient-to-r from-phantom-cyan to-violet-400 bg-clip-text text-transparent drop-shadow-sm">
                        Pool Manager
                    </h2>
                    <div className="flex items-center gap-2 mt-2">
                        <span className={`w-2 h-2 rounded-full ${isWrongNetwork ? 'bg-rose-500' : 'bg-green-500'} animate-pulse`}></span>
                        <p className="text-xs text-text-muted font-mono tracking-wider uppercase">
                            Uniswap V4 • {isWrongNetwork ? <span className="text-rose-400 font-bold">WRONG NETWORK</span> : "Unichain Sepolia"}
                        </p>
                    </div>
                </div>

                {/* Tabs moved to Header for better Landscape use */}
                <div className="flex gap-2">
                    <button
                        className={`px-4 py-2 rounded-lg font-display tracking-widest text-sm transition-all duration-300 border ${activeTab === 'list' ? 'bg-primary/20 border-primary text-primary' : 'bg-transparent border-transparent text-text-muted hover:text-white hover:bg-white/5'}`}
                        onClick={() => setActiveTab('list')}
                    >
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">list</span>
                            ACTIVE POOLS
                        </div>
                    </button>
                    <button
                        className={`px-4 py-2 rounded-lg font-display tracking-widest text-sm transition-all duration-300 border ${activeTab === 'create' ? 'bg-accent/20 border-accent text-accent' : 'bg-transparent border-transparent text-text-muted hover:text-white hover:bg-white/5'}`}
                        onClick={() => setActiveTab('create')}
                    >
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">add_circle</span>
                            INITIALIZE
                        </div>
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="p-6">

                {/* Check Network State */}
                {isWrongNetwork ? (
                    <div className="p-12 border border-rose-500/30 bg-rose-500/5 rounded-xl flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95">
                        <span className="material-symbols-outlined text-5xl text-rose-500 mb-4">network_check</span>
                        <h3 className="text-2xl font-display text-white mb-2">Wrong Network Detected</h3>
                        <p className="text-text-muted mb-8 max-w-md text-lg">
                            To manage pools on Eidolon, you must be connected to the <span className="text-primary font-bold">Unichain Sepolia</span> network.
                        </p>
                        <button
                            className="btn btn-lg bg-rose-500 hover:bg-rose-600 text-white border-0 font-display tracking-wider"
                            onClick={handleSwitchNetwork}
                        >
                            SWITCH TO UNICHAIN
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Tab Content: List */}
                        {activeTab === 'list' && (
                            <div className="overflow-hidden rounded-xl border border-border-dark bg-black/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <table className="table w-full">
                                    <thead>
                                        <tr className="border-b border-white/5 bg-white/5 text-text-muted font-mono text-xs uppercase tracking-wider">
                                            <th className="py-4 pl-6">Pair</th>
                                            <th>Fee</th>
                                            <th>Hooks</th>
                                            <th>Status</th>
                                            <th className="text-right pr-6">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {officialPoolKeys.map((pool, i) => {
                                            const status = officialPoolsStatus?.[i];
                                            const rawValue = (status && status.status === "success") ? status.result : "0x00";
                                            const isLive = hexToBigInt(rawValue as `0x${string}`) !== 0n;

                                            const t0 = getTokenByAddress(pool.token0);
                                            const t1 = getTokenByAddress(pool.token1);

                                            let displayPrice = "-";
                                            if (isLive) {
                                                const val = hexToBigInt(rawValue as `0x${string}`);
                                                const sqrtP = val & ((1n << 160n) - 1n);
                                                displayPrice = sqrtPriceToPrice(sqrtP, 18, 6);
                                            }

                                            const isSelected = pool.token0.toLowerCase() === poolConfig.token0.toLowerCase() &&
                                                pool.token1.toLowerCase() === poolConfig.token1.toLowerCase() &&
                                                pool.fee === poolConfig.fee;

                                            return (
                                                <tr key={i} className={`border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors group ${isSelected ? "bg-primary/5" : ""}`}>
                                                    <td className="pl-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex -space-x-3">
                                                                <div className="w-8 h-8 rounded-full border-2 border-background-dark bg-neutral-800 flex items-center justify-center overflow-hidden">
                                                                    {t0?.logo ? <img src={t0.logo} alt="T0" /> : <div className="bg-neutral w-full h-full"></div>}
                                                                </div>
                                                                <div className="w-8 h-8 rounded-full border-2 border-background-dark bg-neutral-800 flex items-center justify-center overflow-hidden">
                                                                    {t1?.logo ? <img src={t1.logo} alt="T1" /> : <div className="bg-neutral w-full h-full"></div>}
                                                                </div>
                                                            </div>
                                                            <span className="font-bold text-white font-display tracking-wide">{t0?.symbol}/{t1?.symbol}</span>
                                                        </div>
                                                    </td>
                                                    <td className="font-mono text-text-muted">{(pool.fee / 10000).toFixed(2)}%</td>
                                                    <td>
                                                        <div className="tooltip tooltip-right font-mono" data-tip={pool.hooks}>
                                                            <span className="px-2 py-1 rounded bg-white/10 text-xs text-text-muted group-hover:text-white transition-colors cursor-help">
                                                                {truncateAddress(pool.hooks)}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        {isLive ? (
                                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold font-mono">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                                ACTIVE
                                                                <span className="opacity-60 font-normal ml-1">(${displayPrice})</span>
                                                            </div>
                                                        ) : (
                                                            <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-800/50 border border-white/5 text-slate-400 text-xs font-mono">
                                                                UNINITIALIZED
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="text-right pr-6">
                                                        <button
                                                            className={`btn btn-xs font-mono h-8 min-h-0 rounded border-white/10 hover:border-primary hover:text-primary ${isSelected ? "btn-primary text-black hover:text-black no-animation" : "btn-ghost text-text-muted"}`}
                                                            onClick={() => {
                                                                setPoolConfig(pool);
                                                                setActiveTab('create');
                                                            }}
                                                        >
                                                            {isSelected ? "SELECTED" : "MANAGE"}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Tab Content: Initialize */}
                        {activeTab === 'create' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Left Column: Configuration */}
                                <div className="border border-border-dark p-6 rounded-2xl bg-black/20">
                                    <label className="text-sm font-display text-text-muted tracking-[0.2em] uppercase mb-6 block">Pool Configuration</label>
                                    <div className="flex flex-col gap-6">

                                        {/* Token Selection Row */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <span className="text-xs text-text-muted font-mono mb-2 block">Token 0</span>
                                                <button
                                                    className="w-full flex items-center justify-between px-3 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/50 transition-all group"
                                                    onClick={() => setSelectorType('token0')}
                                                >
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        {token0?.logo && <img src={token0.logo} className="w-5 h-5 rounded-full shrink-0" />}
                                                        <span className="font-bold text-white group-hover:text-primary transition-colors truncate">{token0?.symbol || "Select"}</span>
                                                    </div>
                                                    <span className="material-symbols-outlined text-text-muted text-lg shrink-0">expand_more</span>
                                                </button>
                                            </div>
                                            <div>
                                                <span className="text-xs text-text-muted font-mono mb-2 block">Token 1</span>
                                                <button
                                                    className="w-full flex items-center justify-between px-3 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/50 transition-all group"
                                                    onClick={() => setSelectorType('token1')}
                                                >
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        {token1?.logo && <img src={token1.logo} className="w-5 h-5 rounded-full shrink-0" />}
                                                        <span className="font-bold text-white group-hover:text-primary transition-colors truncate">{token1?.symbol || "Select"}</span>
                                                    </div>
                                                    <span className="material-symbols-outlined text-text-muted text-lg shrink-0">expand_more</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Hook Information */}
                                        <div className="relative p-5 rounded-xl border border-primary/20 bg-primary/5 overflow-hidden group">
                                            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            <div className="relative z-10 text-center">
                                                <label className="text-xs font-bold text-primary flex items-center justify-center gap-2 mb-3 font-display tracking-widest uppercase">
                                                    <span className="material-symbols-outlined text-sm">webhook</span>
                                                    Hook Contract
                                                </label>
                                                <div className="font-mono text-xs text-text-muted bg-black/40 border border-white/5 p-2 rounded flex items-center justify-center gap-2 hover:text-white transition-colors cursor-copy"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(poolConfig.hooks);
                                                        toast.success("Copied Address");
                                                    }}>
                                                    {truncateAddress(poolConfig.hooks)}
                                                    <span className="material-symbols-outlined text-[10px] opacity-50">content_copy</span>
                                                </div>
                                                <div className="text-[10px] text-center mt-3 text-primary/60 font-mono">
                                                    Eidolon Ghost Hook (Points + KYC + TTL)
                                                </div>
                                            </div>
                                        </div>

                                        {/* Fee Tier Display */}
                                        <div className="flex justify-between items-center px-2 py-3 border-t border-white/5">
                                            <span className="text-sm font-mono text-text-muted">Fee Tier</span>
                                            <span className="px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs font-mono text-white">
                                                {poolConfig.fee / 10000}%
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Initialization Action */}
                                <div className="relative flex flex-col justify-between p-6 rounded-2xl border border-border-dark bg-gradient-to-b from-white/5 to-transparent">
                                    <div>
                                        <label className="text-sm font-display text-text-muted tracking-[0.2em] uppercase mb-6 block">Initialization</label>

                                        <div className="space-y-4">
                                            <label className="block">
                                                <div className="flex justify-between mb-2">
                                                    <span className="text-xs font-mono text-text-muted">Starting Price</span>
                                                    <span className="text-xs font-mono text-primary truncate ml-2">1 {token0?.symbol} = {price} {token1?.symbol}</span>
                                                </div>
                                                <div className="relative group">
                                                    <input
                                                        type="text"
                                                        placeholder="0.0"
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-4 font-mono text-xl text-white outline-none focus:border-primary/50 focus:shadow-[0_0_15px_-5px_rgba(165,243,252,0.3)] transition-all placeholder:text-white/20"
                                                        value={price}
                                                        onChange={(e) => setPrice(e.target.value)}
                                                        disabled={isPoolInitialized}
                                                    />
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-white/10 text-xs font-mono text-text-muted pointer-events-none">
                                                        {token1?.symbol}
                                                    </div>
                                                </div>
                                            </label>

                                            <div className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${isPoolInitialized ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/5 border-white/5'}`}>
                                                <span className="text-xs font-mono text-text-muted">Current Status</span>
                                                {isPoolInitialized ? (
                                                    <div className="flex items-center gap-2 text-emerald-400 font-bold font-display tracking-wider text-sm">
                                                        <span className="material-symbols-outlined text-lg">check_circle</span>
                                                        INITIALIZED
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-text-muted/60 font-mono text-xs">
                                                        <span className="material-symbols-outlined text-lg">pending</span>
                                                        NOT FOUND
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-8">
                                        <button
                                            className={`w-full relative overflow-hidden group py-4 rounded-xl font-bold font-display tracking-widest transition-all ${isPoolInitialized
                                                ? "border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 cursor-default"
                                                : "bg-primary text-black hover:shadow-[0_0_25px_-5px_rgba(165,243,252,0.5)] active:scale-[0.98]"}`}
                                            onClick={handleInitialize}
                                            disabled={isPoolInitialized}
                                        >
                                            {isPoolInitialized ? (
                                                <span className="flex flex-col items-center gap-1">
                                                    <span className="flex items-center gap-2">
                                                        POOL ACTIVE
                                                        <span className="material-symbols-outlined">arrow_upward</span>
                                                    </span>
                                                    <span className="text-[10px] opacity-60 font-mono font-normal normal-case">
                                                        Add Liquidity via Summoning Portal
                                                    </span>
                                                </span>
                                            ) : (
                                                <span className="flex items-center justify-center gap-3">
                                                    INITIALIZE POOL
                                                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">rocket_launch</span>
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
