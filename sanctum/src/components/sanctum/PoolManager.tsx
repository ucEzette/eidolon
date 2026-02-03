"use client";

import { useEffect, useState, useMemo } from "react";
import { TOKENS, TOKEN_MAP, type Token } from "@/config/tokens";
import { TokenSelector } from "@/components/sanctum/TokenSelector";
import { CONTRACTS } from "@/config/web3";
import { toast } from "sonner";
import { useAccount, useWriteContract, useReadContract, useReadContracts } from "wagmi";
import { getPoolId, getSqrtPriceX96 } from "@/utils/uniswap";
import { parseAbi, encodeAbiParameters, keccak256, hexToBigInt } from "viem";

const POOL_MANAGER_ABI = parseAbi([
    "function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96) external payable returns (int24 tick)",
    "function extsload(bytes32 slot) external view returns (bytes32 value)"
]);

// Helper to calculate storage slot for _pools[poolId] (Slot 6)
const POOL_STORAGE_SLOT = 6n;
function getPoolStateSlot(poolId: `0x${string}`) {
    return keccak256(encodeAbiParameters(
        [{ type: 'bytes32' }, { type: 'uint256' }],
        [poolId, POOL_STORAGE_SLOT]
    ));
}

function getTokenByAddress(address: string): Token | undefined {
    return TOKENS.find(t => t.address.toLowerCase() === address.toLowerCase());
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
    const { address } = useAccount();
    const [price, setPrice] = useState<string>("3000"); // Default ETH price
    const { writeContractAsync } = useWriteContract();
    const [isExpanded, setIsExpanded] = useState(false); // Collapsible state for table

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
            args: [slot]
        } as const;
    });

    const { data: officialPoolsStatus } = useReadContracts({
        contracts: officialPoolQueries
    });

    const handleInitialize = async () => {
        if (!price || isNaN(Number(price))) {
            toast.error("Invalid price");
            return;
        }

        try {
            const sqrtPriceX96 = getSqrtPriceX96(
                Number(price),
                poolConfig.token0 as `0x${string}`,
                poolConfig.token1 as `0x${string}`
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
        <div className="card w-full bg-base-200 shadow-xl mt-8 border border-base-300">
            <TokenSelector
                isOpen={!!selectorType}
                onClose={() => setSelectorType(null)}
                onSelect={(t) => {
                    if (selectorType === 'token0') setPoolConfig({ ...poolConfig, token0: t.address });
                    if (selectorType === 'token1') setPoolConfig({ ...poolConfig, token1: t.address });
                    setSelectorType(null);
                }}
            />

            <div className="card-body p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="card-title text-2xl">Pool Manager</h2>
                    <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        {isExpanded ? "Hide Pools" : "Show Pools"}
                    </button>
                </div>

                {/* Official Pools List - Collapsible */}
                {isExpanded && (
                    <div className="overflow-x-auto mb-8 bg-base-100 rounded-lg p-2">
                        <table className="table table-zebra w-full">
                            <thead>
                                <tr>
                                    <th>Pair</th>
                                    <th>Fee</th>
                                    <th>Hooks</th>
                                    <th>Status</th>
                                    <th className="text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
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
                                        <tr key={i} className={isSelected ? "bg-primary/20" : ""}>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <div className="avatar-group -space-x-4">
                                                        <div className="avatar w-8 h-8 ring-0">
                                                            {t0?.logo ? <img src={t0.logo} alt="T0" /> : <div className="bg-neutral text-neutral-content rounded-full w-8"></div>}
                                                        </div>
                                                        <div className="avatar w-8 h-8 ring-0">
                                                            {t1?.logo ? <img src={t1.logo} alt="T1" /> : <div className="bg-neutral text-neutral-content rounded-full w-8"></div>}
                                                        </div>
                                                    </div>
                                                    <span className="font-bold">{t0?.symbol}/{t1?.symbol}</span>
                                                </div>
                                            </td>
                                            <td>{(pool.fee / 10000).toFixed(2)}%</td>
                                            <td>
                                                <div className="tooltip" data-tip={pool.hooks}>
                                                    <span className="badge badge-ghost font-mono text-xs cursor-help">
                                                        {pool.hooks.slice(0, 6)}...{pool.hooks.slice(-4)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                {isLive ? (
                                                    <div className="badge badge-success badge-sm gap-2">
                                                        Active
                                                        <span className="text-xs opacity-75 hidden sm:inline">(${displayPrice})</span>
                                                    </div>
                                                ) : (
                                                    <div className="badge badge-error badge-sm">Uninitialized</div>
                                                )}
                                            </td>
                                            <td className="text-right">
                                                <button
                                                    className={`btn btn-xs ${isSelected ? "btn-disabled btn-primary" : "btn-outline"}`}
                                                    onClick={() => setPoolConfig(pool)}
                                                >
                                                    {isSelected ? "Selected" : "Select"}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="divider">Initialize Pool</div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column: Token Selection */}
                    <div className="card bg-base-100 p-4 rounded-box">
                        <label className="label font-bold text-lg">Pair Configuration</label>
                        <div className="flex flex-col gap-4">

                            {/* Token 0 */}
                            <div className="form-control">
                                <label className="label"><span className="label-text">Base Token</span></label>
                                <button
                                    className="btn btn-outline flex justify-between items-center"
                                    onClick={() => setSelectorType('token0')}
                                >
                                    <div className="flex items-center gap-2">
                                        {token0?.logo && <img src={token0.logo} className="w-6 h-6 rounded-full" />}
                                        <span>{token0?.symbol || "Select Token"}</span>
                                    </div>
                                    <span className="material-symbols-outlined">expand_more</span>
                                </button>
                            </div>

                            {/* Token 1 */}
                            <div className="form-control">
                                <label className="label"><span className="label-text">Quote Token</span></label>
                                <button
                                    className="btn btn-outline flex justify-between items-center"
                                    onClick={() => setSelectorType('token1')}
                                >
                                    <div className="flex items-center gap-2">
                                        {token1?.logo && <img src={token1.logo} className="w-6 h-6 rounded-full" />}
                                        <span>{token1?.symbol || "Select Token"}</span>
                                    </div>
                                    <span className="material-symbols-outlined">expand_more</span>
                                </button>
                            </div>

                            <div className="form-control mt-2">
                                <label className="label cursor-pointer justify-start gap-4 p-0">
                                    <span className="label-text font-bold">Hook Address</span>
                                    <span className="font-mono text-xs bg-base-200 p-2 rounded block whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">
                                        {poolConfig.hooks}
                                    </span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Pricing & Action */}
                    <div className="card bg-base-100 p-4 rounded-box">
                        <label className="label font-bold text-lg">Initialization</label>
                        <div className="flex flex-col gap-6 h-full">
                            <div className="form-control">
                                <label className="label">
                                    <span className="label-text">Initial Price (USDC per ETH)</span>
                                </label>
                                <div className="join w-full">
                                    <input
                                        type="text"
                                        placeholder="3000"
                                        className="input input-bordered join-item w-full"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        disabled={isPoolInitialized}
                                    />
                                    <span className="btn btn-static join-item bg-base-200">USDC</span>
                                </div>
                                <label className="label">
                                    <span className="label-text-alt">
                                        Status:
                                        <span className={`ml-2 font-bold ${isPoolInitialized ? "text-success" : "text-error"}`}>
                                            {isPoolInitialized ? "ACTIVE" : "UNINITIALIZED"}
                                        </span>
                                    </span>
                                </label>
                            </div>

                            <button
                                className={`btn w-full mt-auto ${isPoolInitialized ? "btn-success btn-outline" : "btn-primary"}`}
                                onClick={handleInitialize}
                                disabled={isPoolInitialized}
                            >
                                {isPoolInitialized ? "Pool Already Initialized" : "Initialize Pool"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
