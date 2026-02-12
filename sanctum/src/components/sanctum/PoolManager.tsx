"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { useLocalStorage } from "usehooks-ts";

const TokenSelector = dynamic(() => import("@/components/sanctum/TokenSelector").then(mod => mod.TokenSelector), {
    ssr: false,
    loading: () => null
});

import { CONTRACTS, unichainSepolia, POOLS, POOL_CONFIG } from "@/config/web3";
import { parseUnits, erc20Abi } from 'viem';
import { toast } from "sonner";
import { useAccount, useReadContract, useWriteContract, useBalance, useReadContracts, useChainId, useSwitchChain, usePublicClient, useWalletClient } from 'wagmi';
import { getPoolId, getSqrtPriceX96, getPoolStateSlot, getTokenByAddress, sqrtPriceToPrice, getAmountsForLiquidity } from "@/utils/uniswap";
import { parseAbi, hexToBigInt, formatUnits } from "viem";
import { useGhostPositions } from "@/hooks/useGhostPositions";
import { useGhostPermit } from "@/hooks/useGhostPermit";
import Link from "next/link";
import { TOKENS, TOKEN_MAP } from "@/config/tokens";
import { INITIALIZED_POOLS } from "@/config/web3";
import { useQuote } from "@/hooks/useQuote";

// Components
import { GhostSessionControl } from "./GhostSessionControl";
import { useGhostSession } from "@/hooks/useGhostSession";
import { ActivityFeed } from "./ActivityFeed";
import { MirrorDashboard } from "./MirrorDashboard";

const POOL_MANAGER_ABI = parseAbi([
    "function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96) external payable returns (int24 tick)",
    "function extsload(bytes32 slot) external view returns (bytes32 value)",
    "function extsload(bytes32[] slots) external view returns (bytes32[] values)",
    "function slot0(bytes32 id) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",
    "function swap((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, (bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96) params, bytes testSettings) external payable returns (int256 delta)"
]);

const EXECUTOR_ABI = parseAbi([
    "function execute((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, (bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96) params, bytes hookData, address recipient) external payable returns (int256 delta)",
    "function wrap() external payable",
    "function unwrap(uint256 amount) external"
]);

const LIQUIDITY_PROVIDER_ABI = parseAbi([
    "function addLiquidity((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, int24 tickLower, int24 tickUpper, uint256 amount0, uint256 amount1) external",
    "function removeLiquidity((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint128 liquidity, int24 tickLower, int24 tickUpper) external",
    "function userLiquidity(address provider, bytes32 poolId) external view returns (uint128)"
]);


function truncateAddress(address: string) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

interface Activity {
    id: string;
    type: 'INITIALIZE' | 'SWAP' | 'LIQUIDITY';
    description: string;
    hash: string;
    timestamp: number;
}

// Initialized Pools from config
const OFFICIAL_POOL_KEYS: Array<{
    token0: string;
    token1: string;
    fee: number;
    tickSpacing: number;
    hooks: string;
}> = INITIALIZED_POOLS.map(p => ({
    token0: p.token0,
    token1: p.token1,
    fee: p.fee,
    tickSpacing: p.tickSpacing,
    hooks: p.hook
}));

// Dynamic Pool Discovery - Support standard tiers
const POTENTIAL_TIERS = [
    { fee: 100, tickSpacing: 1 },    // 0.01%
    { fee: 500, tickSpacing: 10 },   // 0.05%
    { fee: 3000, tickSpacing: 60 },  // 0.3%
    { fee: 10000, tickSpacing: 200 }, // 1%
];

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function PoolManager() {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const { switchChain } = useSwitchChain();

    const [price, setPrice] = useState<string>("3000"); // Default Price
    const { writeContractAsync } = useWriteContract();
    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient();

    // Swap State
    const [swapAmount, setSwapAmount] = useState("1.0");
    const [zeroForOne, setZeroForOne] = useState(true);
    const [isDirectSwap, setIsDirectSwap] = useState(false);
    const [isSwapPending, setIsSwapPending] = useState(false);

    // Mounted check
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    // Selector State
    const [selectorType, setSelectorType] = useState<'token0' | 'token1' | 'input' | 'output' | null>(null);

    // Configuration
    const [poolConfig, setPoolConfig] = useState<{
        token0: string;
        token1: string;
        fee: number;
        tickSpacing: number;
        hooks: string;
    }>({
        token0: (TOKEN_MAP["WETH"].address.toLowerCase() < TOKEN_MAP["USDC"].address.toLowerCase() ? TOKEN_MAP["WETH"].address : TOKEN_MAP["USDC"].address),
        token1: (TOKEN_MAP["WETH"].address.toLowerCase() < TOKEN_MAP["USDC"].address.toLowerCase() ? TOKEN_MAP["USDC"].address : TOKEN_MAP["WETH"].address),
        fee: POOLS.canonical.fee,
        tickSpacing: POOLS.canonical.tickSpacing,
        hooks: CONTRACTS.unichainSepolia.eidolonHook
    });


    const isWrongNetwork = chainId !== unichainSepolia.id;

    // Invert Price State (Visual Only)
    const [invertPrice, setInvertPrice] = useState(false);

    // Helpers for visual ordering
    const tLeft = invertPrice ? getTokenByAddress(poolConfig.token1) : getTokenByAddress(poolConfig.token0);
    const tRight = invertPrice ? getTokenByAddress(poolConfig.token0) : getTokenByAddress(poolConfig.token1);

    useEffect(() => {
        if (isConnected && isWrongNetwork) {
            // Optional: Auto-switch prompt
        }
    }, [isConnected, isWrongNetwork, switchChain]);

    // NEW TABS STRUCTURE
    type PoolTab = 'list' | 'manage' | 'swap' | 'activity' | 'mirror';
    const [poolActiveTab, setPoolActiveTab] = useState<PoolTab>('list');

    // Seed/Init Input State
    const [seedAmount0, setSeedAmount0] = useState("");
    const [seedAmount1, setSeedAmount1] = useState("");
    const [isSeedPending, setIsSeedPending] = useState(false);

    // Price History State
    const [priceHistory, setPriceHistory] = useState<{ time: number, price: number }[]>([]);


    // Helper for ticks
    const getFullRangeTicks = (spacing: number) => {
        const MAX_TICK = 887272;
        const alignedMax = Math.floor(MAX_TICK / spacing) * spacing;
        const alignedMin = -alignedMax;
        return { lower: alignedMin, upper: alignedMax };
    };

    // Balances
    const { data: balance0 } = useBalance({ address: address, token: poolConfig.token0 === ZERO_ADDRESS ? undefined : poolConfig.token0 as `0x${string}` });
    const { data: balance1 } = useBalance({ address: address, token: poolConfig.token1 === ZERO_ADDRESS ? undefined : poolConfig.token1 as `0x${string}` });

    // Dedicated balances for Swap/Seed
    const inputBalance = zeroForOne ? balance0 : balance1;

    const handleSwitchNetwork = () => {
        if (switchChain) {
            switchChain({ chainId: unichainSepolia.id });
        }
    };


    // --- POOL ID & AUTO-DISCOVERY ---
    // Calculate current poolID
    const poolId = useMemo(() => {
        return getPoolId(
            poolConfig.token0 as `0x${string}`,
            poolConfig.token1 as `0x${string}`,
            poolConfig.fee,
            poolConfig.tickSpacing,
            poolConfig.hooks as `0x${string}`
        );
    }, [poolConfig]);

    // Check State (Initialized?)
    const poolStateSlot = useMemo(() => {
        return getPoolStateSlot(poolId);
    }, [poolId]);

    const { data: poolStateData, refetch: refetchPool } = useReadContract({
        address: CONTRACTS.unichainSepolia.poolManager as `0x${string}`,
        abi: POOL_MANAGER_ABI,
        functionName: 'extsload',
        args: poolStateSlot ? [poolStateSlot] : undefined,
        chainId: unichainSepolia.id,
        query: {
            enabled: !!poolStateSlot && !isWrongNetwork,
            refetchInterval: 5000,
        }
    });

    const isPoolInitialized = useMemo(() => {
        if (!poolStateData) return false;
        return hexToBigInt(poolStateData as `0x${string}`) !== 0n;
    }, [poolStateData]);

    const { data: slot0Data } = useReadContract({
        address: CONTRACTS.unichainSepolia.poolManager as `0x${string}`,
        abi: POOL_MANAGER_ABI,
        functionName: 'slot0',
        args: [poolId as `0x${string}`],
        chainId: unichainSepolia.id,
        query: {
            enabled: !!poolId && !isWrongNetwork,
            refetchInterval: 2000,
        }
    });



    // Auto-Discovery: If current is uninitialized, check variants
    const poolVariants = useMemo(() => {
        return POTENTIAL_TIERS.map((tier) => ({
            ...poolConfig,
            fee: tier.fee,
            tickSpacing: tier.tickSpacing
        }));
    }, [poolConfig.token0, poolConfig.token1, poolConfig.hooks]);

    const poolVariantIds = useMemo(() => {
        return poolVariants.map(variant => getPoolId(
            variant.token0 as `0x${string}`,
            variant.token1 as `0x${string}`,
            variant.fee,
            variant.tickSpacing,
            variant.hooks as `0x${string}`
        ));
    }, [poolVariants]);

    const { data: variantsData } = useReadContracts({
        contracts: poolVariantIds.map(id => ({
            address: CONTRACTS.unichainSepolia.poolManager as `0x${string}`,
            abi: POOL_MANAGER_ABI,
            functionName: 'extsload',
            args: getPoolStateSlot(id) ? [getPoolStateSlot(id)] : undefined
        })),
        query: {
            enabled: !isWrongNetwork && mounted,
            refetchInterval: 10000
        }
    });

    /* 
    // Auto-switch disabled to allow creating new pools with different fees
    useEffect(() => {
        if (!variantsData || variantsData.length === 0) return;
        if (isPoolInitialized) return; // Already active, don't switch

        // Find active variant
        const activeIndex = variantsData.findIndex(
            (v: any) => v && v.status === 'success' && v.result && hexToBigInt(v.result as `0x${string}`) > 0n
        );

        if (activeIndex !== -1) {
            const bestTier = POTENTIAL_TIERS[activeIndex];
            if (bestTier.fee !== poolConfig.fee) {
                console.log(`Auto-switching to active pool tier: ${bestTier.fee}`);
                setPoolConfig(prev => ({
                    ...prev,
                    fee: bestTier.fee,
                    tickSpacing: bestTier.tickSpacing
                }));
            }
        }
    }, [variantsData, isPoolInitialized]); // Removed dependency to prevent loop
    */


    // --- GHOST LIQUIDITY & USER LP ---
    const { positions: ghostPositions } = useGhostPositions();
    const poolGhostLiquidity = useMemo(() => {
        if (!poolConfig.token0 || !poolConfig.token1) return { total0: 0, total1: 0, count: 0 };
        const relevant = ghostPositions.filter(p => {
            return p.status === 'Active' && p.poolId === poolId;
        });
        let total0 = 0;
        let total1 = 0;
        relevant.forEach(p => {
            const pTokenA = TOKEN_MAP[p.tokenA]?.address || p.tokenA;
            const pTokenB = TOKEN_MAP[p.tokenB]?.address || p.tokenB;
            if (pTokenA.toLowerCase() === poolConfig.token0.toLowerCase()) total0 += Number(p.amountA);
            else if (pTokenA.toLowerCase() === poolConfig.token1.toLowerCase()) total1 += Number(p.amountA);

            if (p.liquidityMode === 'dual-sided') {
                if (pTokenB.toLowerCase() === poolConfig.token0.toLowerCase()) total0 += Number(p.amountB);
                else if (pTokenB.toLowerCase() === poolConfig.token1.toLowerCase()) total1 += Number(p.amountB);
            }
        });
        return { total0, total1, count: relevant.length };
    }, [ghostPositions, poolConfig, poolId]);

    const { data: userLiquidity, refetch: refetchUserLiquidity } = useReadContract({
        address: CONTRACTS.unichainSepolia.liquidityProvider,
        abi: LIQUIDITY_PROVIDER_ABI,
        functionName: "userLiquidity",
        args: [address!, poolId],
        query: { enabled: !!address && !!poolId }
    });

    const userPositionAmounts = useMemo(() => {
        if (!userLiquidity || !slot0Data) return null;

        const liquidity = userLiquidity as bigint;
        if (liquidity === 0n) return null;

        const [sqrtPriceX96] = slot0Data as [bigint, number, number, number];

        // Define locally if not available, or ensure it's available. 
        // Assuming getFullRangeTicks is available in scope.
        const { lower, upper } = getFullRangeTicks(poolConfig.tickSpacing);



        const { amount0, amount1 } = getAmountsForLiquidity(liquidity, sqrtPriceX96, lower, upper);



        return { amount0, amount1 };
    }, [userLiquidity, slot0Data, poolConfig.tickSpacing]);


    // --- TOKEN METADATA ---
    const { data: tokenMetadata } = useReadContracts({
        contracts: [
            { address: poolConfig.token0 === ZERO_ADDRESS ? undefined : poolConfig.token0 as `0x${string}`, abi: erc20Abi, functionName: 'decimals' },
            { address: poolConfig.token1 === ZERO_ADDRESS ? undefined : poolConfig.token1 as `0x${string}`, abi: erc20Abi, functionName: 'decimals' },
        ],
        query: { enabled: !isWrongNetwork && poolConfig.token0 !== ZERO_ADDRESS }
    });
    const decimals0 = poolConfig.token0 === ZERO_ADDRESS ? 18 : (tokenMetadata?.[0]?.result as number || 18);
    const decimals1 = poolConfig.token1 === ZERO_ADDRESS ? 18 : (tokenMetadata?.[1]?.result as number || 18);

    // Realtime Price History Updater
    useEffect(() => {
        if (slot0Data && mounted) {
            const [sqrtPriceX96] = slot0Data as [bigint, number, number, number];
            const currentPrice = Number(sqrtPriceToPrice(sqrtPriceX96, decimals0, decimals1));

            setPriceHistory(prev => {
                const now = Date.now();
                // Filter duplicates if price hasn't changed? No, keep time axis moving for "realtime" feel
                // Or only add if different? "Realtime" usually suggests tick-by-tick. 
                // Let's add every update but limit size.
                const newHistory = [...prev, { time: now, price: currentPrice }];
                return newHistory.slice(-50); // Keep last 50 points
            });
        }
    }, [slot0Data, decimals0, decimals1, mounted]);

    // --- LOCAL STORAGE ---
    const [customPools, setCustomPools] = useLocalStorage<typeof OFFICIAL_POOL_KEYS>('eidolon-custom-pools', []);

    // Combine for List
    const allPoolKeys = useMemo(() => {
        if (!mounted) return OFFICIAL_POOL_KEYS;
        const keys = [...OFFICIAL_POOL_KEYS];
        customPools.forEach(cp => {
            const exists = keys.some(k => k.token0 === cp.token0 && k.token1 === cp.token1 && k.fee === cp.fee);
            if (!exists) keys.push(cp);
        });
        return keys;
    }, [customPools, mounted]);

    // Batch Fetch Status for List
    const { data: poolsStatus } = useReadContracts({
        contracts: allPoolKeys.map(pk => {
            const pid = getPoolId(pk.token0 as `0x${string}`, pk.token1 as `0x${string}`, pk.fee, pk.tickSpacing, pk.hooks as `0x${string}`);
            const slot = getPoolStateSlot(pid);
            return {
                address: CONTRACTS.unichainSepolia.poolManager as `0x${string}`,
                abi: POOL_MANAGER_ABI,
                functionName: "extsload",
                args: slot ? [slot] : undefined,
                chainId: unichainSepolia.id
            } as const;
        }),
        query: { enabled: !isWrongNetwork }
    });


    // --- SWAP QUOTER ---
    const quoteParams = useMemo(() => {
        if (!swapAmount || isNaN(Number(swapAmount)) || Number(swapAmount) <= 0) return null;
        return {
            token0: poolConfig.token0,
            token1: poolConfig.token1,
            fee: poolConfig.fee,
            tickSpacing: poolConfig.tickSpacing,
            hooks: poolConfig.hooks,
            zeroForOne: zeroForOne,
            amountIn: swapAmount,
            decimalsIn: zeroForOne ? decimals0 : decimals1,
            decimalsOut: zeroForOne ? decimals1 : decimals0,
        };
    }, [swapAmount, poolConfig, zeroForOne, decimals0, decimals1]);

    const { amountOut: quoterOutput, error: quoteError, isLoading: isQuoteLoading } = useQuote(quoteParams);

    // Fallback Estimate Logic (Same as before, simplified for brevity in this view)
    // ... Use quoterOutput mainly.


    // --- ACTIONS ---

    const handleManagePool = async () => {
        if (!isConnected) { toast.error("Connect Wallet"); return; }
        if (!seedAmount0 && !seedAmount1 && isPoolInitialized) { toast.error("Enter amount to add"); return; }
        // if (!isPoolInitialized) { toast.error("Pool Must Be Initialized First"); return; } // Handled automatically now

        // Auto-Initialize if needed (Implicitly via button flow or explicit check)
        const initRequired = !isPoolInitialized;

        setIsSeedPending(true);
        const id = toast.loading("Processing...");

        try {
            if (!publicClient || !walletClient) throw new Error("Client not ready");

            // 1. Initialize if needed
            if (initRequired) {
                if (!price) throw new Error("Price required for initialization");

                toast.loading("Initializing Pool...", { id });
                let startPrice = Number(price);

                // Invert if user entered price in opposite direction
                if (invertPrice) {
                    startPrice = 1 / startPrice;
                }

                const sqrtPriceX96 = BigInt(getSqrtPriceX96(startPrice, decimals0, decimals1));
                const { request } = await publicClient.simulateContract({
                    address: CONTRACTS.unichainSepolia.poolManager as `0x${string}`,
                    abi: POOL_MANAGER_ABI,
                    functionName: 'initialize',
                    args: [
                        { ...poolConfig, currency0: poolConfig.token0 as `0x${string}`, currency1: poolConfig.token1 as `0x${string}`, hooks: poolConfig.hooks as `0x${string}` },
                        sqrtPriceX96
                    ],
                    account: address as `0x${string}`
                });
                const hash = await walletClient.writeContract(request);
                await publicClient.waitForTransactionReceipt({ hash: hash });
                toast.success("Pool Initialized!", { id });

                // Add to Custom Pools if not present
                const exists = allPoolKeys.some(k => k.token0 === poolConfig.token0 && k.token1 === poolConfig.token1 && k.fee === poolConfig.fee);
                if (!exists) {
                    setCustomPools(prev => [...prev, poolConfig]);
                }
            }

            // 2. Add Liquidity
            if (seedAmount0 || seedAmount1) {
                toast.loading("Adding Liquidity...", { id });
                const a0 = parseUnits(seedAmount0 || "0", decimals0);
                const a1 = parseUnits(seedAmount1 || "0", decimals1);

                // Approvals
                if (a0 > 0n && poolConfig.token0 !== ZERO_ADDRESS) {
                    const allow = await publicClient.readContract({
                        address: poolConfig.token0 as `0x${string}`,
                        abi: erc20Abi,
                        functionName: 'allowance',
                        args: [address as `0x${string}`, CONTRACTS.unichainSepolia.liquidityProvider as `0x${string}`]
                    });
                    if (allow < a0) {
                        toast.loading(`Approving ${truncateAddress(poolConfig.token0)}...`, { id });
                        const hash = await walletClient.writeContract({
                            address: poolConfig.token0 as `0x${string}`,
                            abi: erc20Abi,
                            functionName: 'approve',
                            args: [CONTRACTS.unichainSepolia.liquidityProvider as `0x${string}`, a0],
                            account: address
                        });
                        await publicClient.waitForTransactionReceipt({ hash });
                    }
                }

                if (a1 > 0n && poolConfig.token1 !== ZERO_ADDRESS) {
                    const allow = await publicClient.readContract({
                        address: poolConfig.token1 as `0x${string}`,
                        abi: erc20Abi,
                        functionName: 'allowance',
                        args: [address as `0x${string}`, CONTRACTS.unichainSepolia.liquidityProvider as `0x${string}`]
                    });
                    if (allow < a1) {
                        toast.loading(`Approving ${truncateAddress(poolConfig.token1)}...`, { id });
                        const hash = await walletClient.writeContract({
                            address: poolConfig.token1 as `0x${string}`,
                            abi: erc20Abi,
                            functionName: 'approve',
                            args: [CONTRACTS.unichainSepolia.liquidityProvider as `0x${string}`, a1],
                            account: address
                        });
                        await publicClient.waitForTransactionReceipt({ hash });
                    }
                }

                const { lower, upper } = getFullRangeTicks(poolConfig.tickSpacing);

                const { request } = await publicClient.simulateContract({
                    address: CONTRACTS.unichainSepolia.liquidityProvider,
                    abi: LIQUIDITY_PROVIDER_ABI,
                    functionName: 'addLiquidity',
                    args: [
                        { ...poolConfig, currency0: poolConfig.token0 as `0x${string}`, currency1: poolConfig.token1 as `0x${string}`, hooks: poolConfig.hooks as `0x${string}` },
                        lower, upper, a0, a1
                    ],
                    account: address as `0x${string}`
                });

                const hash = await walletClient.writeContract(request);
                await publicClient.waitForTransactionReceipt({ hash });
                toast.success("Liquidity Added!", { id });
                setSeedAmount0("");
                setSeedAmount1("");
                refetchUserLiquidity();
            } else {
                toast.dismiss(id);
            }
            refetchPool();

        } catch (e: any) {
            console.error(e);
            toast.error("Action Failed", { id, description: e.message || e });
        } finally {
            setIsSeedPending(false);
        }
    };

    const handleSwap = async () => {
        if (!isConnected || !address) {
            toast.error("Wallet not connected");
            return;
        }

        if (isWrongNetwork) {
            handleSwitchNetwork();
            return;
        }

        setIsSwapPending(true);

        try {
            const t0 = getTokenByAddress(poolConfig.token0);
            const t1 = getTokenByAddress(poolConfig.token1);
            const sym0 = t0?.symbol || truncateAddress(poolConfig.token0);
            const sym1 = t1?.symbol || truncateAddress(poolConfig.token1);

            const inputToken = zeroForOne ? poolConfig.token0 : poolConfig.token1;
            const inputSymbol = zeroForOne ? sym0 : sym1;
            const decimals = zeroForOne ? decimals0 : decimals1;

            const ETH_ADDR = TOKEN_MAP["ETH"]?.address || ZERO_ADDRESS;
            const WETH_ADDR = TOKEN_MAP["WETH"]?.address;

            let t0_calc = poolConfig.token0;
            let t1_calc = poolConfig.token1;

            if (t0_calc === ETH_ADDR) t0_calc = WETH_ADDR;
            if (t1_calc === ETH_ADDR) t1_calc = WETH_ADDR;

            const [swapC0, swapC1] = t0_calc.toLowerCase() < t1_calc.toLowerCase()
                ? [t0_calc, t1_calc]
                : [t1_calc, t0_calc];

            const poolId = getPoolId(
                swapC0 as `0x${string}`,
                swapC1 as `0x${string}`,
                poolConfig.fee,
                poolConfig.tickSpacing,
                poolConfig.hooks as `0x${string}`
            );

            const key = {
                currency0: swapC0 as `0x${string}`,
                currency1: swapC1 as `0x${string}`,
                fee: poolConfig.fee,
                tickSpacing: poolConfig.tickSpacing,
                hooks: poolConfig.hooks as `0x${string}`
            };

            let permitToken = inputToken;

            if (inputToken === ETH_ADDR) {
                permitToken = WETH_ADDR;
            }

            // --- SESSION-BASED INTENT MODE ---

            if (!sessionActive) {
                toast.error("Ghost Session Required", {
                    description: "Please start a Ghost Session to trade gaslessly.",
                });
                return;
            }

            const permitTokenAddr = (permitToken as string) === ETH_ADDR ? WETH_ADDR : permitToken;

            // Calculate expiry (30 mins validity for the intent)
            const intentExpiry = Date.now() + 30 * 60 * 1000;

            // Add Position (Intent) via Hook (Relayer)
            const { addPosition } = useGhostPositions(); // Importing here or lifting up? Lifting up is better.

            // Wait, I need to access addPosition from hook.
            // I'll assume useGhostPositions is available in scope or needs to be called.
            // Actually it is called at top level: const { positions: ghostPositions } = useGhostPositions();
            // I need to destructure addPosition there too.

        } catch (e: any) {
            console.error(e);
        } finally {
            setIsSwapPending(false);
        }
    };

    // Hooks for Intent-Based Swapping
    const { signPermit } = useGhostPermit();
    const { addPosition } = useGhostPositions();
    const { isSessionActive: sessionActive } = useGhostSession();

    // Re-bind handleSwap implementation properly to use these hooks
    // (Previous handleSwap block was truncated/pseudocode, fixing now)
    const handleSwapReal = async () => {
        if (!isConnected || !address) {
            toast.error("Wallet not connected");
            return;
        }
        setIsSwapPending(true);
        try {
            const t0 = getTokenByAddress(poolConfig.token0);
            const t1 = getTokenByAddress(poolConfig.token1);
            const inputToken = zeroForOne ? poolConfig.token0 : poolConfig.token1;
            const decimals = zeroForOne ? decimals0 : decimals1;

            const ETH_ADDR = TOKEN_MAP["ETH"]?.address || ZERO_ADDRESS;
            const WETH_ADDR = TOKEN_MAP["WETH"]?.address;

            // Normalize for Pool Key
            let c0 = poolConfig.token0 === ETH_ADDR ? WETH_ADDR : poolConfig.token0;
            let c1 = poolConfig.token1 === ETH_ADDR ? WETH_ADDR : poolConfig.token1;
            const [sorted0, sorted1] = c0.toLowerCase() < c1.toLowerCase() ? [c0, c1] : [c1, c0];

            const poolId = getPoolId(
                sorted0 as `0x${string}`,
                sorted1 as `0x${string}`,
                poolConfig.fee,
                poolConfig.tickSpacing,
                poolConfig.hooks as `0x${string}`
            );

            if (!sessionActive) {
                toast.error("Ghost Session Required");
                return;
            }

            // Create Intent
            addPosition({
                tokenA: inputToken === ETH_ADDR ? WETH_ADDR : inputToken,
                tokenB: zeroForOne ? (poolConfig.token1 === ETH_ADDR ? WETH_ADDR : poolConfig.token1) : (poolConfig.token0 === ETH_ADDR ? WETH_ADDR : poolConfig.token0),
                amountA: swapAmount,
                amountB: "0",
                expiry: Date.now() + 30 * 60 * 1000,
                signature: "0x", // Session Auth
                liquidityMode: 'one-sided',
                type: 'swap',
                nonce: crypto.randomUUID(),
                provider: address,
                poolId: poolId,
                fee: poolConfig.fee,
                tickSpacing: poolConfig.tickSpacing,
                hookAddress: poolConfig.hooks
            });

            toast.success("Swap Intent Submitted");
            setSwapAmount("");

        } catch (e: any) {
            console.error(e);
            toast.error("Swap Failed");
        } finally {
            setIsSwapPending(false);
        }
    };


    // Token Objects
    const token0 = getTokenByAddress(poolConfig.token0);
    const token1 = getTokenByAddress(poolConfig.token1);

    return (
        <div className="w-full mt-0 transition-all duration-500 ease-in-out border border-border-dark rounded-2xl overflow-hidden backdrop-blur-xl bg-card-dark shadow-glow shadow-primary/10">
            <TokenSelector
                isOpen={!!selectorType}
                onClose={() => setSelectorType(null)}
                onSelect={(t) => {
                    const addr = t.symbol === 'ETH' ? (TOKENS.find(tok => tok.symbol === 'WETH')?.address || t.address) : t.address;

                    let otherAddr = '';
                    if (selectorType === 'token0') otherAddr = poolConfig.token1;
                    else if (selectorType === 'token1') otherAddr = poolConfig.token0;
                    else if (selectorType === 'input') otherAddr = zeroForOne ? poolConfig.token1 : poolConfig.token0;
                    else if (selectorType === 'output') otherAddr = zeroForOne ? poolConfig.token0 : poolConfig.token1;

                    if (addr.toLowerCase() === otherAddr.toLowerCase()) {
                        setSelectorType(null);
                        return;
                    }

                    const [t0, t1] = addr.toLowerCase() < otherAddr.toLowerCase() ? [addr, otherAddr] : [otherAddr, addr];

                    setPoolConfig(prev => ({ ...prev, token0: t0, token1: t1 }));

                    // Handle Swap Direction logic (Only for Swap Tab interactions)
                    if (selectorType === 'input') {
                        // If selected becomes t0, zeroForOne=true (Input is 0)
                        setZeroForOne(addr.toLowerCase() === t0.toLowerCase());
                    } else if (selectorType === 'output') {
                        // If selected becomes t1, zeroForOne=true (Output is 1)
                        setZeroForOne(addr.toLowerCase() === t1.toLowerCase());
                    }

                    setSelectorType(null);
                }} />

            {/* HEADER & TABS */}
            <div className="p-4 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center bg-white/5 border-b border-white/5 gap-4 md:gap-0">
                <div>
                    <h2 className="text-xl md:text-3xl font-display bg-gradient-to-r from-phantom-cyan to-violet-400 bg-clip-text text-transparent drop-shadow-sm">
                        Pool Manager
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${isWrongNetwork ? 'bg-rose-500' : 'bg-green-500'} animate-pulse`}></span>
                        <p className="text-[10px] md:text-xs text-text-muted font-mono tracking-wider uppercase">
                            V4 • {isWrongNetwork ? "DISCONNECTED" : "Unichain"}
                        </p>
                    </div>
                </div>

                <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
                    {(['list', 'manage', 'swap', 'mirror', 'activity'] as PoolTab[]).map(tab => (
                        <button
                            key={tab}
                            className={`px-3 md:px-4 py-2 rounded-lg font-display tracking-widest text-[10px] md:text-sm transition-all border shrink-0 ${poolActiveTab === tab ? 'bg-primary/20 border-primary text-primary' : 'bg-transparent border-transparent text-text-muted hover:text-white hover:bg-white/5'}`}
                            onClick={() => setPoolActiveTab(tab)}
                        >
                            <span className="uppercase">{tab}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className="p-0">
                {/* LIST TAB */}
                {poolActiveTab === 'list' && (
                    <div className="p-6 animate-in fade-in slide-in-from-bottom-4">
                        <table className="table w-full">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/5 text-text-muted font-mono text-xs uppercase">
                                    <th className="py-4 pl-6">Pair</th>
                                    <th>Fee</th>
                                    <th>Status</th>
                                    <th className="text-right pr-6">Action</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {allPoolKeys.map((pool, i) => {
                                    const status = poolsStatus?.[i];
                                    const isLive = status?.status === "success" && hexToBigInt(status.result as `0x${string}`) !== 0n;
                                    if (!isLive) return null; // Filter Dead Pools

                                    const t0 = getTokenByAddress(pool.token0);
                                    const t1 = getTokenByAddress(pool.token1);
                                    return (
                                        <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="pl-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-bold text-white">{t0?.symbol}/{t1?.symbol}</span>
                                                </div>
                                            </td>
                                            <td className="font-mono">{(pool.fee / 10000).toFixed(2)}%</td>
                                            <td><span className="text-emerald-400 font-mono text-xs border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 rounded-full">ACTIVE</span></td>
                                            <td className="text-right pr-6">
                                                <button
                                                    className="btn btn-xs btn-outline font-mono text-primary hover:bg-primary hover:text-black"
                                                    onClick={() => { setPoolConfig(pool); setPoolActiveTab('manage'); }}
                                                >
                                                    MANAGE
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        <div className="mt-4 text-center">
                            <button className="text-xs text-text-muted hover:text-white underline" onClick={() => setPoolActiveTab('manage')}>
                                Create New Pool
                            </button>
                        </div>
                    </div>
                )}

                {/* MANAGE TAB (Merged Init & Seed) */}
                {poolActiveTab === 'manage' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 animate-in fade-in slide-in-from-bottom-4">
                        {/* Configuration Side */}
                        <div className="space-y-6">
                            <div className="bg-black/20 rounded-xl p-4 border border-white/10">
                                <h3 className="text-sm font-display text-text-muted uppercase tracking-widest mb-4">Configuration</h3>
                                <div className="space-y-4 mb-6">
                                    <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                                        <button onClick={() => setSelectorType(invertPrice ? 'token1' : 'token0')} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl hover:border-primary/50 transition-colors w-full">
                                            <div className="flex items-center gap-2">
                                                {/* <Image src={token0?.logoURI} ... /> */}
                                                <span className="font-bold text-white">{tLeft?.symbol}</span>
                                            </div>
                                            <span className="material-symbols-outlined text-text-muted">expand_more</span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                if (price && !isNaN(Number(price)) && Number(price) !== 0) {
                                                    // Invert the current price value with decent precision
                                                    const inverted = 1 / Number(price);
                                                    // Format to avoid scientific notation if possible, max 10 decimals
                                                    setPrice(parseFloat(inverted.toFixed(10)).toString());
                                                }
                                                setInvertPrice(!invertPrice);
                                            }}
                                            className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-text-muted transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-sm">swap_horiz</span>
                                        </button>

                                        <button onClick={() => setSelectorType(invertPrice ? 'token0' : 'token1')} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl hover:border-primary/50 transition-colors w-full">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-white">{tRight?.symbol}</span>
                                            </div>
                                            <span className="material-symbols-outlined text-text-muted">expand_more</span>
                                        </button>
                                    </div>

                                    {/* Fee Tier Selector */}
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-[10px] uppercase text-text-muted font-bold tracking-wider">Fee Tier</label>
                                            {/* Tick Spacing Tooltip */}
                                            <div className="group relative flex items-center gap-1 cursor-help">
                                                <span className="material-symbols-outlined text-[10px] text-text-muted">info</span>
                                                <span className="text-[10px] text-text-muted uppercase tracking-wider">Tick Spacing</span>
                                                <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-black border border-white/10 rounded-lg text-[10px] text-text-muted hidden group-hover:block z-10 shadow-xl">
                                                    Determines price granularity. Lower (10) = precise, Higher (200) = cheaper gas.
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-4 gap-2 mb-2">
                                            {[
                                                { fee: 500, spacing: 10, label: "0.05%" },
                                                { fee: 3000, spacing: 60, label: "0.30%" },
                                                { fee: 10000, spacing: 200, label: "1.00%" }
                                            ].map((tier) => (
                                                <button
                                                    key={tier.fee}
                                                    onClick={() => setPoolConfig({ ...poolConfig, fee: tier.fee, tickSpacing: tier.spacing })}
                                                    className={`p-2 rounded-lg border text-xs font-mono transition-all ${poolConfig.fee === tier.fee && poolConfig.tickSpacing === tier.spacing
                                                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                                                        : 'bg-white/5 border-white/10 text-text-muted hover:bg-white/10'
                                                        }`}
                                                >
                                                    {tier.label}
                                                </button>
                                            ))}
                                            <button
                                                onClick={() => {
                                                    // Set a custom flag or just clear standard fee to trigger custom input view?
                                                    // For now, let's just use a special fee value or just set it to current and let user edit
                                                    // But we need to know if we are in "custom" mode to show inputs.
                                                    // Let's deduce custom mode: if fee/spacing doesn't match a standard tier.
                                                    // Or just provide a toggle. Let's force a non-standard value to trigger inputs? No.
                                                    // Let's just default to 0.05% but show inputs if the user clicks "Custom".
                                                    // Correction: User wants to SELECT and CUSTOMIZE.
                                                    // I will add a "Custom" button that shows the inputs.
                                                    setPoolConfig({ ...poolConfig, fee: 0, tickSpacing: 0 }); // Reset or keep current?
                                                }}
                                                className={`p-2 rounded-lg border text-xs font-mono transition-all ${![500, 3000, 10000].includes(poolConfig.fee)
                                                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                                                    : 'bg-white/5 border-white/10 text-text-muted hover:bg-white/10'
                                                    }`}
                                            >
                                                Custom
                                            </button>
                                        </div>

                                        {/* Custom Inputs (only if non-standard fee) */}
                                        {![500, 3000, 10000].includes(poolConfig.fee) && (
                                            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                                <div>
                                                    <label className="text-[10px] uppercase text-text-muted block mb-1">Fee (micros)</label>
                                                    <input
                                                        type="number"
                                                        value={poolConfig.fee === 0 ? '' : poolConfig.fee}
                                                        onChange={(e) => setPoolConfig({ ...poolConfig, fee: Number(e.target.value) })}
                                                        placeholder="3000 = 0.3%"
                                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-2 font-mono text-sm text-white focus:border-emerald-500/50 outline-none transition-colors"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] uppercase text-text-muted block mb-1">Tick Spacing</label>
                                                    <input
                                                        type="number"
                                                        value={poolConfig.tickSpacing === 0 ? '' : poolConfig.tickSpacing}
                                                        onChange={(e) => setPoolConfig({ ...poolConfig, tickSpacing: Number(e.target.value) })}
                                                        placeholder="60"
                                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-2 font-mono text-sm text-white focus:border-emerald-500/50 outline-none transition-colors"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <label className="text-[10px] uppercase text-text-muted block mb-1">Hook</label>
                                    <input type="text" value={poolConfig.hooks} onChange={(e) => setPoolConfig({ ...poolConfig, hooks: e.target.value })} className="w-full bg-black/40 border border-white/10 rounded-lg p-2 font-mono text-xs text-white/60" />
                                </div>
                            </div>

                            {/* Status Indicator */}
                            <div className={`p-4 rounded-xl border ${isPoolInitialized ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'} flex items-center justify-between`}>
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-xl">{isPoolInitialized ? 'check_circle' : 'pending'}</span>
                                    <div>
                                        <h4 className="font-bold text-sm text-white">{isPoolInitialized ? 'Pool Active' : 'Not Initialized'}</h4>
                                        <p className="text-xs opacity-70">{isPoolInitialized ? 'Ready for trading & liquidity' : 'Initialize to start trading'}</p>
                                    </div>
                                </div>
                                {!isPoolInitialized && (
                                    <div className="text-right">
                                        <label className="text-[10px] uppercase block mb-1 text-emerald-400 font-bold">Start Price ({tRight?.symbol} per {tLeft?.symbol})</label>
                                        <input type="text" value={price} onChange={(e) => setPrice(e.target.value)} className="w-32 bg-black/40 border border-emerald-500/30 rounded p-1 font-mono text-right text-sm text-emerald-300" placeholder="0.0" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Price Chart & Info */}
                        <div className="bg-black/20 rounded-xl p-4 border border-white/10 space-y-4">
                            <h3 className="text-sm font-display text-text-muted uppercase tracking-widest">Market Status</h3>

                            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
                                <span className="text-xs text-text-muted uppercase tracking-wider">Current Price</span>
                                <div className="text-right">
                                    <span className="block font-mono font-bold text-lg text-white">
                                        {isPoolInitialized
                                            ? (priceHistory.length > 0 ? priceHistory[priceHistory.length - 1].price.toFixed(4) : "Loading...")
                                            : (price || "0")
                                        }
                                    </span>
                                    <span className="text-[10px] text-text-muted whitespace-nowrap">
                                        1 {token0?.symbol} = {isPoolInitialized
                                            ? (priceHistory.length > 0 ? priceHistory[priceHistory.length - 1].price.toFixed(4) : "-")
                                            : (price || "0")
                                        } {token1?.symbol}
                                    </span>
                                </div>
                            </div>

                            {isPoolInitialized && priceHistory.length > 1 && (
                                <div className="h-40 w-full mt-4">
                                    <SimplePriceChart data={priceHistory} color="#06b6d4" />
                                </div>
                            )}
                            {isPoolInitialized && priceHistory.length <= 1 && (
                                <div className="h-40 w-full flex items-center justify-center text-xs text-text-muted italic border border-dashed border-white/10 rounded-lg">
                                    Waiting for price updates...
                                </div>
                            )}
                        </div>


                        {/* Action Side (Seed/Add) */}
                        <div className="space-y-6">
                            <h3 className="text-sm font-display text-text-muted uppercase tracking-widest">Liquidity Provision</h3>

                            {/* User Position Display */}
                            {isPoolInitialized && (
                                <div className="bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs text-emerald-400 uppercase tracking-wider font-bold">Your Position</span>
                                        <span className="material-symbols-outlined text-emerald-500/50 text-sm">water_drop</span>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-mono text-emerald-300 font-bold">
                                            {userPositionAmounts
                                                ? (
                                                    <span className="text-lg">
                                                        {(() => {
                                                            const formatExact = (val: bigint, dec: number) => {
                                                                if (val === 0n) return "0";
                                                                let s = formatUnits(val, dec);
                                                                // Remove trailing zeros after decimal
                                                                if (s.includes(".")) {
                                                                    s = s.replace(/\.?0+$/, "");
                                                                }
                                                                return s;
                                                            };
                                                            return <>{formatExact(userPositionAmounts.amount0, decimals0)} {token0?.symbol} <span className="text-emerald-500/50 mx-2">+</span> {formatExact(userPositionAmounts.amount1, decimals1)} {token1?.symbol}</>;
                                                        })()}
                                                    </span>
                                                )
                                                : "0.00"
                                            }
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-emerald-500/50 mt-1">
                                        Base liquidity supplied to {token0?.symbol}/{token1?.symbol}
                                    </p>
                                </div>
                            )}

                            <div className="space-y-4">
                                {/* Swappable Seed Inputs */}
                                {(!invertPrice ? [
                                    { token: token0, amount: seedAmount0, setAmount: setSeedAmount0, bal: balance0 },
                                    { token: token1, amount: seedAmount1, setAmount: setSeedAmount1, bal: balance1 }
                                ] : [
                                    { token: token1, amount: seedAmount1, setAmount: setSeedAmount1, bal: balance1 },
                                    { token: token0, amount: seedAmount0, setAmount: setSeedAmount0, bal: balance0 }
                                ]).map((item, i) => (
                                    <div key={i} className="bg-white/5 p-4 rounded-xl border border-white/10 animate-in fade-in slide-in-from-right-2 duration-300">
                                        <div className="flex justify-between mb-2">
                                            <span className="text-xs text-text-muted">{item.token?.symbol} Amount</span>
                                            <span className="text-xs text-text-muted">Bal: {item.bal?.formatted ? Number(item.bal.formatted).toFixed(4) : '0.00'}</span>
                                        </div>
                                        <input type="text" value={item.amount} onChange={(e) => item.setAmount(e.target.value)} className="w-full bg-transparent text-xl font-mono outline-none" placeholder="0.0" />
                                    </div>
                                ))}

                                <button
                                    onClick={handleManagePool}
                                    disabled={isSeedPending}
                                    className={`w-full py-4 rounded-xl font-bold font-display tracking-widest transition-all ${!isPoolInitialized ? 'bg-amber-500 hover:bg-amber-400 text-black' : 'bg-primary hover:bg-cyan-300 text-black'}`}
                                >
                                    {isPoolInitialized
                                        ? (isSeedPending ? "PROCESSING..." : "ADD LIQUIDITY")
                                        : (isSeedPending ? "INITIALIZING..." : "INITIALIZE & SEED")
                                    }
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* SWAP TAB */}
                {poolActiveTab === 'swap' && (
                    <div className="p-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="max-w-md mx-auto">
                            <GhostSessionControl />
                            <div className="mt-6 space-y-1 bg-white/5 p-4 rounded-2xl border border-white/10 animate-in fade-in slide-in-from-bottom-2">
                                {/* Input Section */}
                                <div className="bg-black/20 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                    <div className="flex justify-between text-xs text-text-muted uppercase tracking-wider mb-2">Pay</div>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="text"
                                            value={swapAmount}
                                            onChange={(e) => setSwapAmount(e.target.value)}
                                            className="w-full bg-transparent text-3xl font-mono font-medium outline-none placeholder-white/20"
                                            placeholder="0.0"
                                        />
                                        <button
                                            onClick={() => setSelectorType('input')}
                                            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full border border-white/10 transition-all shrink-0"
                                        >
                                            <span className="font-bold text-lg">{(zeroForOne ? token0 : token1)?.symbol}</span>
                                            <span className="material-symbols-outlined text-sm">expand_more</span>
                                        </button>
                                    </div>
                                    <div className="text-right text-xs text-text-muted mt-2">
                                        Balance: {inputBalance?.formatted ? Number(inputBalance.formatted).toFixed(4) : '0.00'}
                                    </div>
                                </div>

                                {/* Swap Trigger */}
                                <div className="relative h-4">
                                    <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                                        <button onClick={() => setZeroForOne(!zeroForOne)} className="p-2 rounded-full bg-card-dark border border-white/10 hover:border-primary/50 text-primary transition-all shadow-xl">
                                            <span className="material-symbols-outlined text-sm">arrow_downward</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Output Section */}
                                <div className="bg-black/20 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                    <div className="flex justify-between text-xs text-text-muted uppercase tracking-wider mb-2">Receive</div>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-full text-3xl font-mono font-medium ${quoterOutput ? 'text-emerald-400' : 'text-text-muted'} ${isQuoteLoading ? 'animate-pulse' : ''}`}>
                                            {isQuoteLoading ? "..." : (quoterOutput ? Number(formatUnits(BigInt(quoterOutput), zeroForOne ? decimals1 : decimals0)).toFixed(6) : "0.00")}
                                        </div>
                                        <button
                                            onClick={() => setSelectorType('output')}
                                            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full border border-white/10 transition-all shrink-0"
                                        >
                                            <span className="font-bold text-lg">{(zeroForOne ? token1 : token0)?.symbol}</span>
                                            <span className="material-symbols-outlined text-sm">expand_more</span>
                                        </button>
                                    </div>
                                    <div className="text-right text-xs text-text-muted mt-2">
                                        {quoteError ? <span className="text-rose-500 text-[10px]">{quoteError}</span> : (quoterOutput ? "Estimated" : "Waiting for input")}
                                    </div>
                                </div>

                                <button onClick={handleSwapReal} className="w-full py-4 bg-primary hover:bg-cyan-300 text-black font-bold font-display tracking-widest rounded-xl mt-4 transition-all shadow-lg shadow-primary/20">
                                    {isSwapPending ? "SWAPPING..." : "SWAP NOW"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MIRROR TAB */}
                {poolActiveTab === 'mirror' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        <MirrorDashboard />
                    </div>
                )}

                {/* ACTIVITY TAB */}
                {poolActiveTab === 'activity' && (
                    <div className="h-[600px] animate-in fade-in slide-in-from-bottom-4">
                        <ActivityFeed />
                    </div>
                )}

            </div>
        </div>
    );
}

// Simple SVG Chart Component
function SimplePriceChart({ data, color }: { data: { time: number, price: number }[], color: string }) {
    if (data.length < 2) return null;

    const prices = data.map(d => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const range = maxPrice - minPrice || 1; // Avoid divide by zero

    // Dimensions
    const width = 100;
    const height = 100;
    const padding = 5;

    // Normalize
    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * (width - 2 * padding) + padding;
        // Invert Y (SVG 0 is top)
        const normalizedY = (d.price - minPrice) / range;
        const y = height - (normalizedY * (height - 2 * padding) + padding);
        return `${x},${y}`;
    }).join(" ");

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible preserve-3d">
            {/* Gradient Defs */}
            <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.5" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>

            {/* Area Fill */}
            <path
                d={`M ${points.split(" ")[0].split(",")[0]},${height} L ${points} L ${points.split(" ").slice(-1)[0].split(",")[0]},${height} Z`}
                fill="url(#chartGradient)"
                stroke="none"
            />

            {/* Line */}
            <polyline
                fill="none"
                stroke={color}
                strokeWidth="2"
                points={points}
                vectorEffect="non-scaling-stroke"
                className="drop-shadow-lg"
            />

            {/* Latest Price Dot */}
            <circle
                cx={points.split(" ").slice(-1)[0].split(",")[0]}
                cy={points.split(" ").slice(-1)[0].split(",")[1]}
                r="3"
                fill="white"
                className="animate-pulse"
            />
        </svg>
    );
}

// Export for dynamic import
export default PoolManager;
