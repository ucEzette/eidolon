"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { TOKENS, type Token } from "@/config/tokens";
import { useLocalStorage } from "usehooks-ts";
import { TokenSelector } from "@/components/sanctum/TokenSelector";
import { CONTRACTS, unichainSepolia } from "@/config/web3";
import { formatUnits, parseUnits, encodeAbiParameters, keccak256, erc20Abi } from 'viem';
import { toast } from "sonner";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance, useReadContracts, useChainId, useSwitchChain } from 'wagmi';
import { getPoolId, getSqrtPriceX96, getPoolStateSlot, getTicksStateSlot, getTokenByAddress, sqrtPriceToPrice } from "@/utils/uniswap";
import { parseAbi, hexToBigInt, type Address } from "viem";
import { useGhostPositions } from "@/hooks/useGhostPositions";
import Link from "next/link";

const POOL_MANAGER_ABI = parseAbi([
    "function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96) external payable returns (int24 tick)",
    "function extsload(bytes32 slot) external view returns (bytes32 value)",
    "function extsload(bytes32[] slots) external view returns (bytes32[] values)",
    "function swap((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, (bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96) params, bytes testSettings) external payable returns (int256 delta)"
]);

const ROUTER_ABI = parseAbi([
    "function swap((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, (bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96) params, (bool takeClaims, bool settleUsingBurn) testSettings, bytes hookData) external payable returns (int256 delta)"
]);

// Helper for Pool State Slot
const POOLS_MAPPING_SLOT = 6n;


function truncateAddress(address: string) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}


const FEERATE_TO_TICKSPACING: Record<number, number> = {
    500: 10,
    3000: 60,
    10000: 200
};

interface Activity {
    id: string;
    type: 'INITIALIZE' | 'SWAP' | 'LIQUIDITY';
    description: string;
    hash: string;
    timestamp: number;
}

// Official Pools Defined Outside Component to prevent re-creation
const OFFICIAL_POOL_KEYS = [
    {
        token0: "0x0000000000000000000000000000000000000000", // ETH
        token1: "0x31d0220469e10c4E71834a79b1f276d740d3768F", // USDC
        fee: 3000,
        tickSpacing: 60,
        hooks: "0x97ed05d79F5D8C8a5B956e5d7B5272Ed903000c8"
    },
    {
        token0: "0x0000000000000000000000000000000000000000", // ETH
        token1: "0xe02eb159eb92dd0388ecdb33d0db0f8831091be6", // eiETH
        fee: 3000,
        tickSpacing: 60,
        hooks: "0x97ed05d79F5D8C8a5B956e5d7B5272Ed903000c8"
    }
];

export function PoolManager() {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const { switchChain } = useSwitchChain();

    const [price, setPrice] = useState<string>("3000"); // Default ETH price
    const { writeContractAsync } = useWriteContract();

    // Removed isExpanded state - Always visible
    const [activeTab, setActiveTab] = useState<'list' | 'create' | 'swap' | 'activity'>('list'); // Tab state

    // Swap State
    const [swapAmount, setSwapAmount] = useState("1.0");
    const [zeroForOne, setZeroForOne] = useState(true);

    // Mounted check for hydration safety
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    // Selector State
    const [selectorType, setSelectorType] = useState<'token0' | 'token1' | null>(null);

    // Configuration
    const [poolConfig, setPoolConfig] = useState({
        token0: "0x0000000000000000000000000000000000000000", // ETH (Native)
        token1: "0x31d0220469e10c4E71834a79b1f276d740d3768F", // USDC
        fee: 3000, // 0.3% Fee (Updated Default)
        tickSpacing: 60, // 60 Ticks
        hooks: "0x97ed05d79F5D8C8a5B956e5d7B5272Ed903000c8"
    });

    // Network Check & Auto-Switch
    const isWrongNetwork = chainId !== unichainSepolia.id;

    useEffect(() => {
        if (isConnected && isWrongNetwork) {
            // Optional: Auto-switch logic
        }
    }, [isConnected, isWrongNetwork, switchChain]);

    const handleSwitchNetwork = () => {
        if (switchChain) {
            switchChain({ chainId: unichainSepolia.id });
        }
    };


    // Dynamic Pool Discovery
    const POTENTIAL_FEES = [500, 3000, 10000];
    const POTENTIAL_TICKS = [10, 60, 200];

    // Check which pool config is actually initialized
    const poolVariants = useMemo(() => {
        return POTENTIAL_FEES.map((fee, i) => ({
            ...poolConfig,
            fee,
            tickSpacing: POTENTIAL_TICKS[i] // Simply mapping indices 1:1 for now (3000->60, 10000->200)
        }));
    }, [poolConfig]);

    const poolVariantIds = useMemo(() => {
        return poolVariants.map(variant => getPoolId(
            variant.token0 as `0x${string}`,
            variant.token1 as `0x${string}`,
            variant.fee,
            variant.tickSpacing,
            variant.hooks as `0x${string}`
        ));
    }, [poolVariants]);

    // Batch fetch state for all variants
    const { data: variantStates } = useReadContract({
        address: CONTRACTS.unichainSepolia.poolManager as `0x${string}`,
        abi: POOL_MANAGER_ABI,
        functionName: 'extsload',
        args: [poolVariantIds.map(pid => getPoolStateSlot(pid)!)], // Fetch all slots
        chainId: unichainSepolia.id,
        query: {
            enabled: !isWrongNetwork,
            refetchInterval: 10000
        }
    });

    // Auto-Select Logic Removed to allow manual override
    // useEffect(() => { ... })

    // Current Active Pool ID (derived from auto-updated config)
    const poolId = useMemo(() => {
        return getPoolId(
            poolConfig.token0 as `0x${string}`,
            poolConfig.token1 as `0x${string}`,
            poolConfig.fee,
            poolConfig.tickSpacing,
            poolConfig.hooks as `0x${string}`
        );
    }, [poolConfig]);

    // Ghost Liquidity (Off-Chain Intents)
    const { positions: ghostPositions } = useGhostPositions();

    const poolGhostLiquidity = useMemo(() => {
        // console.log("DEBUG: Calculating Ghost Liquidity for Pool:", poolId);
        // console.log("DEBUG: All Ghost Positions:", ghostPositions);

        if (!poolConfig.token0 || !poolConfig.token1) return { total0: 0, total1: 0, count: 0 };

        const relevant = ghostPositions.filter(p => {
            const match = p.status === 'Active' && p.poolId === poolId;
            // if (!match) console.log("DEBUG: Validation Failed for", p.id, p.status, p.poolId, poolId);
            return match;
        });

        // console.log("DEBUG: Relevant Positions Found:", relevant.length);

        let total0 = 0;
        let total1 = 0;

        relevant.forEach(p => {
            // We need to map p.tokenA/B to poolConfig.token0/1 (Case Insensitive)
            const pTokenA = p.tokenA === "ETH" ? "0x0000000000000000000000000000000000000000" :
                (p.tokenA === "USDC" ? "0x31d0220469e10c4E71834a79b1f276d740d3768F" :
                    (p.tokenA === "eiETH" ? "0xe02eb159eb92dd0388ecdb33d0db0f8831091be6" : p.tokenA));

            const pTokenB = p.tokenB === "ETH" ? "0x0000000000000000000000000000000000000000" :
                (p.tokenB === "USDC" ? "0x31d0220469e10c4E71834a79b1f276d740d3768F" :
                    (p.tokenB === "eiETH" ? "0xe02eb159eb92dd0388ecdb33d0db0f8831091be6" : p.tokenB));

            if (pTokenA.toLowerCase() === poolConfig.token0.toLowerCase()) {
                total0 += Number(p.amountA);
            } else if (pTokenA.toLowerCase() === poolConfig.token1.toLowerCase()) {
                total1 += Number(p.amountA);
            }

            if (p.liquidityMode === 'dual-sided') {
                if (pTokenB.toLowerCase() === poolConfig.token0.toLowerCase()) {
                    total0 += Number(p.amountB);
                } else if (pTokenB.toLowerCase() === poolConfig.token1.toLowerCase()) {
                    total1 += Number(p.amountB);
                }
            }
        });

        console.log("DEBUG: Pool Ghost Liquidity Result:", { total0, total1, count: relevant.length });
        return { total0, total1, count: relevant.length };
    }, [ghostPositions, poolConfig, poolId]);

    // FETCH TOKEN METADATA DYNAMICALLY
    const { data: tokenMetadata } = useReadContracts({
        contracts: [
            { address: poolConfig.token0 === "0x0000000000000000000000000000000000000000" ? undefined : poolConfig.token0 as `0x${string}`, abi: erc20Abi, functionName: 'decimals' },
            { address: poolConfig.token1 === "0x0000000000000000000000000000000000000000" ? undefined : poolConfig.token1 as `0x${string}`, abi: erc20Abi, functionName: 'decimals' },
            // Add symbols later if needed for display, but decimals are critical for math
        ],
        query: {
            enabled: !isWrongNetwork && poolConfig.token0 !== "0x0000000000000000000000000000000000000000" && poolConfig.token1 !== "0x0000000000000000000000000000000000000000",
            staleTime: 60000,
        }
    });

    const decimals0 = poolConfig.token0 === "0x0000000000000000000000000000000000000000" ? 18 : (tokenMetadata?.[0]?.result as number || 18);
    const decimals1 = poolConfig.token1 === "0x0000000000000000000000000000000000000000" ? 18 : (tokenMetadata?.[1]?.result as number || 18);

    // 4. Read Pool State (Slot0) for Active Pool
    const poolStateSlot = useMemo(() => {
        return getPoolStateSlot(poolId);
    }, [poolId]);

    const { data: poolStateData, refetch: refetchPool } = useReadContract({
        address: CONTRACTS.unichainSepolia.poolManager as `0x${string}`,
        abi: POOL_MANAGER_ABI,
        functionName: 'extsload',
        args: poolStateSlot ? [poolStateSlot] : undefined,
        chainId: unichainSepolia.id, // Explicitly query correct chain
        query: {
            enabled: !!poolStateSlot && !isWrongNetwork,
            refetchInterval: 5000
        }
    });

    const isPoolInitialized = useMemo(() => {
        if (!poolStateData) return false;
        return hexToBigInt(poolStateData) !== 0n;
    }, [poolStateData]);

    // Local Storage for User-Imported Pools & Activity
    const [customPools, setCustomPools] = useLocalStorage<typeof OFFICIAL_POOL_KEYS>('eidolon-custom-pools', []);
    const [activities, setActivities] = useLocalStorage<Activity[]>('eidolon-activity-log', []);

    // Combine Official + Custom (Memoized)
    const allPoolKeys = useMemo(() => {
        if (!mounted) return OFFICIAL_POOL_KEYS;

        const keys = [...OFFICIAL_POOL_KEYS];
        customPools.forEach((cp: any) => {
            const exists = keys.some(k =>
                (k.token0 === cp.token0 && k.token1 === cp.token1 && k.fee === cp.fee) ||
                (k.token0 === cp.token1 && k.token1 === cp.token0 && k.fee === cp.fee)
            );
            if (!exists) keys.push(cp);
        });
        return keys;
    }, [customPools, mounted]);

    const removeCustomPool = (indexInCustom: number) => {
        const newCustom = [...customPools];
        newCustom.splice(indexInCustom, 1);
        setCustomPools(newCustom);
        toast.success("Pool Removed from List");
    };

    // Prepare queries for all pools
    const allPoolQueries = useMemo(() => {
        return allPoolKeys.map(pk => {
            const pid = getPoolId(pk.token0 as `0x${string}`, pk.token1 as `0x${string}`, pk.fee, pk.tickSpacing, pk.hooks as `0x${string}`);

            const poolStateSlot = getPoolStateSlot(pid);

            return {
                address: CONTRACTS.unichainSepolia.poolManager as `0x${string}`,
                abi: POOL_MANAGER_ABI,
                functionName: "extsload",
                args: poolStateSlot ? [poolStateSlot] : undefined,
                chainId: unichainSepolia.id
            } as const;
        });
    }, [allPoolKeys]);

    const { data: poolsStatus } = useReadContracts({
        contracts: allPoolQueries,
        query: {
            enabled: !isWrongNetwork
        }
    });

    // Fetch Balances
    const { data: balance0 } = useBalance({ address: address, token: poolConfig.token0 === "0x0000000000000000000000000000000000000000" ? undefined : poolConfig.token0 as `0x${string}` });
    const { data: balance1 } = useBalance({ address: address, token: poolConfig.token1 === "0x0000000000000000000000000000000000000000" ? undefined : poolConfig.token1 as `0x${string}` });

    const inputBalance = zeroForOne ? balance0 : balance1;

    // Estimation Logic for Test Swap
    const estimatedOutput = useMemo(() => {
        if (!swapAmount || isNaN(Number(swapAmount))) return null;

        // Log everything for debugging
        const hasGridPool = !!poolStateData;
        console.log("EstimatedOutput DEBUG: Start", {
            poolStateData,
            hasGridPool,
            poolGhostLiquidity,
            swapAmount,
            decimals0,
            decimals1,
            manualPrice: price
        });

        const val = BigInt(!poolStateData ? 0 : poolStateData as string);
        let sqrtPriceX96 = val & ((1n << 160n) - 1n);

        console.log("EstimatedOutput DEBUG: Initial sqrtPriceX96", sqrtPriceX96.toString());

        // HYBRID QUOTER LOGIC:
        // If On-Chain is 0 (or close to MIN_SQRT_PRICE), check Ghost Liquidity OR if we have a manually set Price
        // 1n << 64n is a safe lower bound for reasonable prices (approx 10^-10)
        // The debug log showed 4295128740 which is ~2^32 (MIN_SQRT_PRICE)
        const isEffectivelyZero = sqrtPriceX96 < (1n << 64n);

        if (isEffectivelyZero) {
            // Check if we have active spirits (Ghost Liquidity)
            const hasSpirits = poolGhostLiquidity.count > 0;
            const validPrice = price && !isNaN(Number(price));

            console.log("EstimatedOutput DEBUG: Zero Price Detected. Checking Fallbacks:", { hasSpirits, validPrice });

            if (hasSpirits || validPrice) {
                // If we have spirits but no price, default to 1 (Parity) for estimation 
                // OR ideally we'd calculate weighted avg price from spirits, but for now 1 is safer than 0.
                // If user entered price, use that.
                const virtualPrice = validPrice ? Number(price) : 1;

                console.log("EstimatedOutput DEBUG: Using Virtual Price Fallback", virtualPrice);

                try {
                    sqrtPriceX96 = BigInt(getSqrtPriceX96(virtualPrice, decimals0, decimals1));
                    console.log("EstimatedOutput DEBUG: Calculated Virtual sqrtPriceX96", sqrtPriceX96.toString());
                } catch (e) {
                    console.error("Ghost Quoter Calc Error", e);
                }
            }
        }

        // Re-evaluate check after potential fallback calculation
        if (sqrtPriceX96 < (1n << 64n)) {
            console.log("EstimatedOutput: sqrtPriceX96 is effectively 0 and no Ghost Liquidity found.");
            return null;
        }

        const amountIn = Number(swapAmount);

        // Canonical Sorting to match PoolKey
        // Use addresses for sorting
        const [c0Decimals, c1Decimals] = poolConfig.token0.toLowerCase() < poolConfig.token1.toLowerCase()
            ? [decimals0, decimals1]
            : [decimals1, decimals0];

        let priceC0inC1;
        try {
            priceC0inC1 = sqrtPriceToPrice(sqrtPriceX96, c0Decimals, c1Decimals);
            console.log("EstimatedOutput DEBUG: Price C0 in C1", priceC0inC1);
        } catch (e) {
            console.error("EstimatedOutput: Calculation error", e);
            return null;
        }

        let out = 0;

        // isInputC0 means "Is the input token the canonical token0?"
        const canonical0Addr = poolConfig.token0.toLowerCase() < poolConfig.token1.toLowerCase() ? poolConfig.token0 : poolConfig.token1;
        const inputAddr = zeroForOne ? poolConfig.token0 : poolConfig.token1;
        const isInputC0 = inputAddr.toLowerCase() === canonical0Addr.toLowerCase();

        console.log("EstimatedOutput DEBUG: Direction", { isInputC0, amountIn, priceC0inC1 });

        if (isInputC0) {
            out = amountIn * Number(priceC0inC1);
        } else {
            const p = Number(priceC0inC1);
            if (p === 0) {
                console.log("EstimatedOutput DEBUG: Price is 0, cannot divide");
                return null;
            }
            out = amountIn / p;
        }

        console.log("EstimatedOutput DEBUG: Final Output", out);

        return out.toLocaleString('en-US', { maximumFractionDigits: 6 });
    }, [poolStateData, swapAmount, zeroForOne, poolConfig.token0, poolConfig.token1, poolGhostLiquidity, price, decimals0, decimals1]);

    const handleInitialize = async () => {
        if (!isConnected) {
            toast.error("Wallet not connected", { description: "Please connect your wallet to initialize a pool." });
            return;
        }

        if (isWrongNetwork) {
            handleSwitchNetwork();
            return;
        }

        if (!price || isNaN(Number(price))) {
            toast.error("Invalid price");
            return;
        }

        try {
            // Remove check for t0/t1 to allow custom tokens
            // if (!t0 || !t1) { ... }

            // Use dynamic decimals
            const sqrtPriceX96 = getSqrtPriceX96(
                Number(price),
                decimals0,
                decimals1
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

            const hash = await writeContractAsync({
                address: CONTRACTS.unichainSepolia.poolManager as `0x${string}`,
                abi: POOL_MANAGER_ABI,
                functionName: "initialize",
                args: [key, sqrtPriceX96],
            });

            toast.success("Transaction Sent", { description: "Initializing Pool..." });

            const t0 = getTokenByAddress(poolConfig.token0);
            const t1 = getTokenByAddress(poolConfig.token1);
            const sym0 = t0?.symbol || truncateAddress(poolConfig.token0);
            const sym1 = t1?.symbol || truncateAddress(poolConfig.token1);

            // Add to Activity Log
            const newActivity: Activity = {
                id: crypto.randomUUID(),
                type: 'INITIALIZE',
                description: `Initialized ${sym0}/${sym1} (${(poolConfig.fee / 10000)}%)`,
                hash: hash,
                timestamp: Date.now()
            };
            setActivities(prev => [newActivity, ...prev]);

            // Save to Local Storage as Custom Pool
            setCustomPools(prev => [...prev, poolConfig]);

            setTimeout(() => { refetchPool(); }, 5000);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
            console.error(e);
            toast.error("Initialization Failed", { description: e.shortMessage || e.message || "Unknown error" });
        }
    };

    const token0 = getTokenByAddress(poolConfig.token0);
    const token1 = getTokenByAddress(poolConfig.token1);

    const handleSwap = async () => {
        if (!isConnected) {
            toast.error("Wallet not connected");
            return;
        }

        if (isWrongNetwork) {
            handleSwitchNetwork();
            return;
        }

        try {
            const t0 = getTokenByAddress(poolConfig.token0);
            const t1 = getTokenByAddress(poolConfig.token1);
            const sym0 = t0?.symbol || truncateAddress(poolConfig.token0);
            const sym1 = t1?.symbol || truncateAddress(poolConfig.token1);

            // Construct Key
            const [c0, c1] = poolConfig.token0.toLowerCase() < poolConfig.token1.toLowerCase()
                ? [poolConfig.token0, poolConfig.token1]
                : [poolConfig.token1, poolConfig.token0];

            // Adjust zeroForOne based on canonical ordering
            const isT0Currency0 = poolConfig.token0.toLowerCase() === c0.toLowerCase();
            const actualZeroForOne = isT0Currency0 ? zeroForOne : !zeroForOne;

            const key = {
                currency0: c0 as `0x${string}`,
                currency1: c1 as `0x${string}`,
                fee: poolConfig.fee,
                tickSpacing: poolConfig.tickSpacing,
                hooks: poolConfig.hooks as `0x${string}`
            };

            const amountWei = BigInt(Math.floor(Number(swapAmount) * (10 ** (zeroForOne ? decimals0 : decimals1))));
            // Negative amountSpecified means Exact Input
            const amountSpecified = -amountWei;

            // Price Limits (No limit)
            const MIN_SQRT_PRICE = 4295128739n;
            const MAX_SQRT_PRICE = 1461446703485210103287273052203988822378723970342n;
            const sqrtPriceLimitX96 = actualZeroForOne ? MIN_SQRT_PRICE + 1n : MAX_SQRT_PRICE - 1n;

            const params = {
                zeroForOne: actualZeroForOne,
                amountSpecified,
                sqrtPriceLimitX96
            };

            const testSettings = {
                takeClaims: false,
                settleUsingBurn: false
            };

            // @ts-ignore
            const hash = await writeContractAsync({
                address: CONTRACTS.unichainSepolia.router as `0x${string}`, // PoolSwapTest
                abi: ROUTER_ABI,
                functionName: "swap",
                args: [key, params, testSettings, "0x"],
                value: actualZeroForOne && c0 === "0x0000000000000000000000000000000000000000" ? amountWei : 0n // Send ETH if paying in ETH
            });

            toast.success("Swap Sent", { description: `Swapping ${swapAmount} ${zeroForOne ? sym0 : sym1}` });

            // Add Activity
            const newActivity: Activity = {
                id: crypto.randomUUID(),
                type: 'SWAP',
                description: `Swapped ${swapAmount} ${zeroForOne ? sym0 : sym1} for ${zeroForOne ? sym1 : sym0}`,
                hash: hash,
                timestamp: Date.now()
            };
            setActivities(prev => [newActivity, ...prev]);

        } catch (e: any) {
            console.error(e);
            toast.error("Swap Failed", { description: e.shortMessage || e.message });
        }
    };

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
                    {mounted && customPools.length > 0 && (
                        <button
                            className="px-3 py-2 rounded-lg font-mono text-xs text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-all flex items-center gap-2"
                            onClick={() => {
                                if (confirm("Clear all custom pools?")) {
                                    setCustomPools([]);
                                    toast.success("Custom pools cleared");
                                }
                            }}
                        >
                            <span className="material-symbols-outlined text-sm">delete_sweep</span>
                            CLEAR CUSTOM
                        </button>
                    )}
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
                    <button
                        className={`px-4 py-2 rounded-lg font-display tracking-widest text-sm transition-all duration-300 border ${activeTab === 'create' ? 'bg-accent/20 border-accent text-accent' : 'bg-transparent border-transparent text-text-muted hover:text-white hover:bg-white/5'}`}
                        onClick={() => setActiveTab('create')}
                    >
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">add_circle</span>
                            INITIALIZE
                        </div>
                    </button>
                    <button
                        className={`px-4 py-2 rounded-lg font-display tracking-widest text-sm transition-all duration-300 border ${activeTab === 'swap' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-transparent border-transparent text-text-muted hover:text-white hover:bg-white/5'}`}
                        onClick={() => setActiveTab('swap')}
                    >
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">swap_horiz</span>
                            TEST SWAP
                        </div>
                    </button>
                    <button
                        className={`px-4 py-2 rounded-lg font-display tracking-widest text-sm transition-all duration-300 border ${activeTab === 'activity' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-transparent border-transparent text-text-muted hover:text-white hover:bg-white/5'}`}
                        onClick={() => setActiveTab('activity')}
                    >
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">history</span>
                            ACTIVITY
                            {mounted && activities.length > 0 && <span className="w-2 h-2 rounded-full bg-indigo-500"></span>}
                        </div>
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="p-6">

                {/* Check Network State */}
                {isWrongNetwork && isConnected ? (
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
                                        {allPoolKeys.map((pool, i) => {
                                            const status = poolsStatus?.[i];
                                            const rawValue = (status && status.status === "success") ? status.result : "0x00";
                                            const isLive = hexToBigInt(rawValue as `0x${string}`) !== 0n;

                                            const t0 = getTokenByAddress(pool.token0);
                                            const t1 = getTokenByAddress(pool.token1);

                                            // Fallback for unknown tokens (imported)
                                            const symbol0 = t0?.symbol || truncateAddress(pool.token0);
                                            const symbol1 = t1?.symbol || truncateAddress(pool.token1);

                                            let displayPrice = "-";
                                            if (isLive) {
                                                const val = hexToBigInt(rawValue as `0x${string}`);
                                                const sqrtP = val & ((1n << 160n) - 1n);
                                                // Default decimals if unknown
                                                const d0 = t0?.decimals || 18;
                                                const d1 = t1?.decimals || 18;
                                                displayPrice = sqrtPriceToPrice(sqrtP, d0, d1);
                                            }

                                            const isSelected = pool.token0.toLowerCase() === poolConfig.token0.toLowerCase() &&
                                                pool.token1.toLowerCase() === poolConfig.token1.toLowerCase() &&
                                                pool.fee === poolConfig.fee;

                                            // Check if it's a custom pool to allow removal
                                            const isCustom = i >= OFFICIAL_POOL_KEYS.length;
                                            const customIndex = i - OFFICIAL_POOL_KEYS.length;

                                            return (
                                                <tr key={i} className={`border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors group ${isSelected ? "bg-primary/5" : ""}`}>
                                                    <td className="pl-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex -space-x-3">
                                                                <div className="w-8 h-8 rounded-full border-2 border-background-dark bg-neutral-800 flex items-center justify-center overflow-hidden relative">
                                                                    {t0?.logo ? <Image src={t0.logo} alt="T0" fill className="object-cover" unoptimized /> : <div className="bg-neutral w-full h-full"></div>}
                                                                </div>
                                                                <div className="w-8 h-8 rounded-full border-2 border-background-dark bg-neutral-800 flex items-center justify-center overflow-hidden relative">
                                                                    {t1?.logo ? <Image src={t1.logo} alt="T1" fill className="object-cover" unoptimized /> : <div className="bg-neutral w-full h-full"></div>}
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-white font-display tracking-wide">{symbol0}/{symbol1}</span>
                                                                <span className="text-[10px] text-text-muted font-mono">{t0?.address.slice(0, 4)}.../{t1?.address.slice(0, 4)}...</span>
                                                            </div>
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
                                                        <div className="flex justify-end gap-2">
                                                            {isCustom && (
                                                                <button
                                                                    className="btn btn-xs btn-ghost btn-square text-text-muted hover:text-rose-500"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        removeCustomPool(customIndex);
                                                                    }}
                                                                    title="Remove from list"
                                                                >
                                                                    <span className="material-symbols-outlined text-sm">delete</span>
                                                                </button>
                                                            )}
                                                            <button
                                                                className={`btn btn-xs font-mono h-8 min-h-0 rounded border-white/10 hover:border-primary hover:text-primary ${isSelected ? "btn-primary text-black hover:text-black no-animation" : "btn-ghost text-text-muted"}`}
                                                                onClick={() => {
                                                                    setPoolConfig(pool);
                                                                    setActiveTab('create');
                                                                }}
                                                            >
                                                                {isSelected ? "SELECTED" : "MANAGE"}
                                                            </button>
                                                        </div>
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

                                    {/* Ghost Liquidity Indicator */}
                                    <div className="mb-6 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                                                <span className="text-xl">👻</span>
                                            </div>
                                            <div>
                                                <h4 className="text-purple-300 font-display text-sm tracking-wider">INVISIBLE LIQUIDITY</h4>
                                                <p className="text-xs text-purple-400/60 font-mono">
                                                    {poolGhostLiquidity.count} Active Spirits Waiting
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-white font-mono font-bold text-sm">
                                                {poolGhostLiquidity.total0 > 0 && <span>{poolGhostLiquidity.total0.toFixed(4)} {token0?.symbol}</span>}
                                                {poolGhostLiquidity.total0 > 0 && poolGhostLiquidity.total1 > 0 && <span className="mx-2">+</span>}
                                                {poolGhostLiquidity.total1 > 0 && <span>{poolGhostLiquidity.total1.toFixed(4)} {token1?.symbol}</span>}
                                                {poolGhostLiquidity.total0 === 0 && poolGhostLiquidity.total1 === 0 && (
                                                    <span className="opacity-50 italic text-xs">
                                                        {price ? `(Last: ${price})` : "0.0000"}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-purple-400/50 uppercase tracking-widest">
                                                {poolGhostLiquidity.count === 0 && price ? "Liquidity Consumed" : "Available Virtual Depth"}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Re-Summon Prompt */}
                                    {poolGhostLiquidity.count === 0 && (
                                        <div className="mb-6 -mt-4 text-center animate-pulse">
                                            <Link href="/summon" className="text-xs text-secondary hover:text-secondary-highlight underline font-mono">
                                                Need more spirits? Summon here →
                                            </Link>
                                        </div>
                                    )}

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
                                                        {token0?.logo && <Image src={token0.logo} alt={token0.symbol} width={20} height={20} className="rounded-full shrink-0" unoptimized />}
                                                        <span className="font-bold text-white group-hover:text-primary transition-colors truncate">{token0?.symbol || truncateAddress(poolConfig.token0)}</span>
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
                                                        {token1?.logo && <Image src={token1.logo} alt={token1.symbol} width={20} height={20} className="rounded-full shrink-0" unoptimized />}
                                                        <span className="font-bold text-white group-hover:text-primary transition-colors truncate">{token1?.symbol || truncateAddress(poolConfig.token1)}</span>
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

                                        {/* Fee Tier Display (Now Editable) */}
                                        <div className="flex justify-between items-center px-2 py-3 border-t border-white/5">
                                            <span className="text-sm font-mono text-text-muted">Fee Tier</span>
                                            <select
                                                className="px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs font-mono text-white outline-none focus:border-primary/50 cursor-pointer appearance-none text-right"
                                                value={poolConfig.fee}
                                                onChange={(e) => {
                                                    const newFee = Number(e.target.value);
                                                    setPoolConfig({
                                                        ...poolConfig,
                                                        fee: newFee,
                                                        tickSpacing: FEERATE_TO_TICKSPACING[newFee] || 60
                                                    });
                                                }}
                                            >
                                                <option value={500}>0.05%</option>
                                                <option value={3000}>0.30%</option>
                                                <option value={10000}>1.00%</option>
                                            </select>
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
                                                    <span className="text-xs font-mono text-primary truncate ml-2">1 {token0?.symbol || "T0"} = {price} {token1?.symbol || "T1"}</span>
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
                                                        {token1?.symbol || "T1"}
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
                                                : !isConnected ? "bg-white/10 text-white cursor-not-allowed"
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
                                            ) : !isConnected ? (
                                                <span className="flex items-center justify-center gap-3">
                                                    CONNECT WALLET
                                                    <span className="material-symbols-outlined">account_balance_wallet</span>
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

                        {/* Tab Content: Swap */}
                        {activeTab === 'swap' && (
                            <div className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h3 className="text-xl font-display text-emerald-400 mb-4 tracking-widest uppercase">Test Pool Hooks</h3>
                                <p className="text-sm text-text-muted mb-6">
                                    Perform a test swap directly against this specific Pool Key. This guarantees your <span className="text-primary font-mono">EidolonHook</span> logic is executed, unlike generic DEX routers.
                                </p>

                                <div className="space-y-6 max-w-md mx-auto">
                                    {/* Input Field */}
                                    <div className="bg-black/40 p-4 rounded-xl border border-white/10">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-medium text-white/60">Amount In</span>
                                            {inputBalance && (
                                                <div className="text-xs text-text-muted flex items-center gap-2">
                                                    <span>Balance: {Number(inputBalance.formatted).toFixed(4)}</span>
                                                    <button
                                                        className="text-primary hover:text-white transition-colors uppercase font-bold text-[10px]"
                                                        onClick={() => setSwapAmount(inputBalance.formatted)}
                                                    >
                                                        Max
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="text"
                                                value={swapAmount}
                                                onChange={(e) => setSwapAmount(e.target.value)}
                                                className="w-full bg-transparent text-2xl font-mono text-white outline-none placeholder:text-white/20"
                                                placeholder="0.0"
                                            />
                                            <button
                                                onClick={() => {
                                                    console.log("Setting selector type for input token");
                                                    setSelectorType(zeroForOne ? 'token0' : 'token1');
                                                }}
                                                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 transition-all group"
                                            >
                                                {(zeroForOne ? token0 : token1)?.logo && (
                                                    <Image
                                                        src={(zeroForOne ? token0 : token1)?.logo!}
                                                        alt="T"
                                                        width={20}
                                                        height={20}
                                                        className="rounded-full"
                                                        unoptimized
                                                    />
                                                )}
                                                <span className="font-bold text-white text-sm">
                                                    {zeroForOne ? token0?.symbol : token1?.symbol}
                                                </span>
                                                <span className="material-symbols-outlined text-sm opacity-60 group-hover:rotate-180 transition-transform">expand_more</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Swap Direction Toggle */}
                                    <div className="flex justify-center">
                                        <button
                                            onClick={() => setZeroForOne(!zeroForOne)}
                                            className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-white/80">arrow_downward</span>
                                        </button>
                                    </div>

                                    {/* Output Field (Estimated) */}
                                    <div className="bg-black/40 p-4 rounded-xl border border-white/10 opacity-60">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-medium text-white/60">To (Estimated)</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="text-2xl font-mono text-white/50">
                                                {estimatedOutput ? (
                                                    <span className="text-emerald-400">~{estimatedOutput}</span>
                                                ) : (
                                                    <span className="animate-pulse">?</span>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => {
                                                    console.log("Setting selector type for output token");
                                                    setSelectorType(zeroForOne ? 'token1' : 'token0');
                                                }}
                                                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all group opacity-80 hover:opacity-100"
                                            >
                                                {(zeroForOne ? token1 : token0)?.logo && (
                                                    <Image
                                                        src={(zeroForOne ? token1 : token0)?.logo!}
                                                        alt="T"
                                                        width={20}
                                                        height={20}
                                                        className="rounded-full"
                                                        unoptimized
                                                    />
                                                )}
                                                <span className="font-bold text-white text-sm">
                                                    {zeroForOne ? token1?.symbol : token0?.symbol}
                                                </span>
                                                <span className="material-symbols-outlined text-sm opacity-60 group-hover:rotate-180 transition-transform">expand_more</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleSwap}
                                    className="w-full py-4 mt-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold font-display tracking-widest rounded-xl transition-all shadow-glow hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                                >
                                    SWAP VIA EIDOLON ROUTER
                                </button>
                            </div>
                        )}

                        {/* Tab Content: Activity Log */}
                        {activeTab === 'activity' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[300px]">
                                {mounted && activities.length > 0 ? (
                                    <div className="space-y-3">
                                        {activities.map((activity) => (
                                            <a
                                                key={activity.id}
                                                href={`https://unichain-sepolia.blockscout.com/tx/${activity.hash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-primary/20 transition-all group"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border border-white/10 ${activity.type === 'INITIALIZE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-primary/10 text-primary'}`}>
                                                            <span className="material-symbols-outlined">
                                                                {activity.type === 'INITIALIZE' ? 'rocket_launch' : 'swap_horiz'}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-white text-sm group-hover:text-primary transition-colors">
                                                                {activity.description}
                                                            </div>
                                                            <div className="text-xs text-text-muted font-mono mt-1">
                                                                {new Date(activity.timestamp).toLocaleString()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-xs font-mono text-text-muted group-hover:text-white transition-colors">
                                                        View on Explorer
                                                        <span className="material-symbols-outlined text-sm">open_in_new</span>
                                                    </div>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 text-text-muted opacity-50">
                                        <span className="material-symbols-outlined text-5xl mb-4">history_toggle_off</span>
                                        <p className="font-display tracking-widest uppercase text-sm">No Activity Recorded</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div >
    );
}
