"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { useLocalStorage } from "usehooks-ts";

const TokenSelector = dynamic(() => import("@/components/sanctum/TokenSelector").then(mod => mod.TokenSelector), {
    ssr: false,
    loading: () => null
});
import { CONTRACTS, unichainSepolia, POOLS } from "@/config/web3";
import { parseUnits, erc20Abi } from 'viem';
import { toast } from "sonner";
import { useAccount, useReadContract, useWriteContract, useBalance, useReadContracts, useChainId, useSwitchChain, usePublicClient } from 'wagmi';
import { getPoolId, getSqrtPriceX96, getPoolStateSlot, getTokenByAddress, sqrtPriceToPrice } from "@/utils/uniswap";
import { parseAbi, hexToBigInt } from "viem";
import { useGhostPositions } from "@/hooks/useGhostPositions";
import { useGhostPermit } from "@/hooks/useGhostPermit";
import Link from "next/link";
import { TOKENS, TOKEN_MAP } from "@/config/tokens";

const POOL_MANAGER_ABI = parseAbi([
    "function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96) external payable returns (int24 tick)",
    "function extsload(bytes32 slot) external view returns (bytes32 value)",
    "function extsload(bytes32[] slots) external view returns (bytes32[] values)",
    "function swap((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, (bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96) params, bytes testSettings) external payable returns (int256 delta)"
]);

const EXECUTOR_ABI = parseAbi([
    "function execute((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, (bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96) params, bytes hookData, address recipient) external payable returns (int256 delta)"
]);


// Helper for Pool State Slot
// const POOLS_MAPPING_SLOT = 6n;

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

// Official Pools Defined Outside Component to prevent re-creation
// Official Pools Defined Outside Component to prevent re-creation
const OFFICIAL_POOL_KEYS = [
    {
        token0: TOKENS.find(t => t.symbol === "ETH")?.address || "0x0000000000000000000000000000000000000000",
        token1: TOKENS.find(t => t.symbol === "USDC")?.address || "0x31d0220469e10c4E71834a79b1f276d740d3768F",
        fee: 3000,
        tickSpacing: 60,
        hooks: CONTRACTS.unichainSepolia.eidolonHook
    },
    {
        token0: TOKENS.find(t => t.symbol === "ETH")?.address || "0x0000000000000000000000000000000000000000",
        token1: TOKENS.find(t => t.symbol === "eiETH")?.address || "0xe02eb159eb92dd0388ecdb33d0db0f8831091be6",
        fee: 3000,
        tickSpacing: 200,
        hooks: CONTRACTS.unichainSepolia.eidolonHook
    },
    {
        token0: TOKENS.find(t => t.symbol === "WETH")?.address || "0x4200000000000000000000000000000000000006",
        token1: TOKENS.find(t => t.symbol === "eiETH")?.address || "0xe02eb159eb92dd0388ecdb33d0db0f8831091be6",
        fee: 3000,
        tickSpacing: 200,
        hooks: CONTRACTS.unichainSepolia.eidolonHook
    }
];

// Dynamic Pool Discovery Constants
const POTENTIAL_FEES = [500, 3000, 10000];
const POTENTIAL_TICKS = [10, 60, 200];

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
    const [isDirectSwap, setIsDirectSwap] = useState(false);
    const [isSwapPending, setIsSwapPending] = useState(false);
    const publicClient = usePublicClient();

    // Mounted check for hydration safety
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    // Selector State
    const [selectorType, setSelectorType] = useState<'token0' | 'token1' | null>(null);

    // Configuration
    const [poolConfig, setPoolConfig] = useState<{
        token0: string;
        token1: string;
        fee: number;
        tickSpacing: number;
        hooks: string;
    }>({
        token0: TOKENS.find(t => t.symbol === "ETH")?.address || "0x0000000000000000000000000000000000000000",
        token1: TOKENS.find(t => t.symbol === "USDC")?.address || "0x31d0220469e10c4E71834a79b1f276d740d3768F",
        fee: POOLS.canonical.fee,
        tickSpacing: POOLS.canonical.tickSpacing,
        hooks: CONTRACTS.unichainSepolia.eidolonHook
    });

    // Constants for address checking
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

    // Auto-Set logic removed to give users full liberty.
    /*
    useEffect(() => { ... })
    */

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

    // Batch fetch state for all variants (Using extsload at Slot 6 because getSlot0 is broken)
    const { } = useReadContract({
        address: CONTRACTS.unichainSepolia.poolManager as `0x${string}`,
        abi: POOL_MANAGER_ABI,
        functionName: 'extsload',
        args: [poolVariantIds.map(pid => getPoolStateSlot(pid) || "0x0000000000000000000000000000000000000000000000000000000000000000")],
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
            // Dictionary check for address normalization
            const pTokenA = TOKEN_MAP[p.tokenA]?.address || p.tokenA;
            const pTokenB = TOKEN_MAP[p.tokenB]?.address || p.tokenB;

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

        return { total0, total1, count: relevant.length };
    }, [ghostPositions, poolConfig, poolId]);

    // FETCH TOKEN METADATA DYNAMICALLY
    const { data: tokenMetadata } = useReadContracts({
        contracts: [
            { address: poolConfig.token0 === ZERO_ADDRESS ? undefined : poolConfig.token0 as `0x${string}`, abi: erc20Abi, functionName: 'decimals' },
            { address: poolConfig.token1 === ZERO_ADDRESS ? undefined : poolConfig.token1 as `0x${string}`, abi: erc20Abi, functionName: 'decimals' },
            // Add symbols later if needed for display, but decimals are critical for protection
        ],
        query: {
            enabled: !isWrongNetwork && poolConfig.token0 !== ZERO_ADDRESS && poolConfig.token1 !== ZERO_ADDRESS,
            staleTime: 60000,
        }
    });

    const decimals0 = poolConfig.token0 === ZERO_ADDRESS ? 18 : (tokenMetadata?.[0]?.result as number || 18);
    const decimals1 = poolConfig.token1 === ZERO_ADDRESS ? 18 : (tokenMetadata?.[1]?.result as number || 18);

    // 4. Read Pool State using extsload (Slot 6) because getSlot0 is broken
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
            refetchInterval: 5000,
            retry: false
        }
    });

    const isPoolInitialized = useMemo(() => {
        if (!poolStateData) return false;
        return hexToBigInt(poolStateData as `0x${string}`) !== 0n;
    }, [poolStateData]);

    // Local Storage for User-Imported Pools & Activity
    const [customPools, setCustomPools] = useLocalStorage<typeof OFFICIAL_POOL_KEYS>('eidolon-custom-pools', []);
    const [activities, setActivities] = useLocalStorage<Activity[]>('eidolon-activity-log', []);

    // Combine Official + Custom (Memoized)
    const allPoolKeys = useMemo(() => {
        if (!mounted) return OFFICIAL_POOL_KEYS;

        const keys = [...OFFICIAL_POOL_KEYS];
        customPools.forEach((cp) => {
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

        const hasGridPool = !!poolStateData;

        // Parse `extsload` data:
        // Value is a hex string (bytes32). 
        // Slot0 structure: [tick (24)][protocolFee (24)][lpFee (24)][sqrtPriceX96 (160)]
        // Lowest 160 bits are sqrtPriceX96.
        // extsload returns a single value if array length 1? No, logic above sends [slot], returns value.
        // Wait, ABI: `function extsload(bytes32 slot) external view returns (bytes32 value)`
        // useReadContract return type depends on ABI.

        let sqrtPriceX96 = 0n;
        if (poolStateData) {
            const val = hexToBigInt(poolStateData as `0x${string}`);
            sqrtPriceX96 = val & ((1n << 160n) - 1n);
        }






        // HYBRID QUOTER LOGIC:
        // If On-Chain is 0, check Ghost Liquidity OR if we have a manually set Price
        const isEffectivelyZero = sqrtPriceX96 < (1n << 64n);

        if (isEffectivelyZero) {
            // Check if we have active spirits (Ghost Liquidity)
            const hasSpirits = poolGhostLiquidity.count > 0;
            const validPrice = price && !isNaN(Number(price));

            if (hasSpirits || validPrice) {
                // If we have spirits but no price, default to 1 (Parity) for estimation 
                // OR ideally we'd calculate weighted avg price from spirits, but for now 1 is safer than 0.
                // If user entered price, use that.
                const virtualPrice = validPrice ? Number(price) : 1;

                try {
                    sqrtPriceX96 = BigInt(getSqrtPriceX96(virtualPrice, decimals0, decimals1));
                } catch (e) {
                    console.error("Ghost Quoter Calc Error", e);
                }
            }
        }

        // Re-evaluate check after potential fallback calculation
        if (sqrtPriceX96 < (1n << 64n)) {

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
        } catch (e) {
            console.error("EstimatedOutput: Calculation error", e);
            return null;
        }

        let out = 0;

        // isInputC0 means "Is the input token the canonical token0?"
        const canonical0Addr = poolConfig.token0.toLowerCase() < poolConfig.token1.toLowerCase() ? poolConfig.token0 : poolConfig.token1;
        const inputAddr = zeroForOne ? poolConfig.token0 : poolConfig.token1;
        const isInputC0 = inputAddr.toLowerCase() === canonical0Addr.toLowerCase();



        if (isInputC0) {
            out = amountIn * Number(priceC0inC1);
        } else {
            const p = Number(priceC0inC1);
            if (p === 0) {
                return null;
            }
            out = amountIn / p;
        }



        return out.toLocaleString('en-US', { maximumFractionDigits: 6 });
    }, [poolStateData, swapAmount, zeroForOne, poolConfig.token0, poolConfig.token1, poolGhostLiquidity, price, decimals0, decimals1]);

    const handleInitialize = async () => {
        if (!isConnected || !address) {
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
            setCustomPools(prev => [...prev, {
                ...poolConfig,
                token0: poolConfig.token0 as `0x${string}`,
                token1: poolConfig.token1 as `0x${string}`,
                hooks: poolConfig.hooks as `0x${string}`
            }]);

            setTimeout(() => { refetchPool(); }, 5000);

        } catch (e: unknown) {
            console.error(e);
            const message = e instanceof Error ? e.message : "Initialization Failed";
            toast.error("Initialization Failed", { description: message });
        }
    };

    const token0 = getTokenByAddress(poolConfig.token0);
    const token1 = getTokenByAddress(poolConfig.token1);

    // Hooks for Intent-Based Swapping
    const { signPermit } = useGhostPermit();
    const { addPosition } = useGhostPositions();

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

            // Determine Input Token
            // If zeroForOne (Token0 -> Token1), we are selling Token0.
            const inputToken = zeroForOne ? poolConfig.token0 : poolConfig.token1;
            const inputSymbol = zeroForOne ? sym0 : sym1;
            const decimals = zeroForOne ? decimals0 : decimals1;

            // HANDLE ETH -> WETH for Pool ID & Permit
            // Permit2 does NOT support native ETH. We must sign for WETH.
            // Executor will treat ETH intents as WETH permits.
            // IMPORTANT: The PoolID we sign must match the PoolID the bot executes against (which is WETH/USDC)

            // Config constants derived dynamically
            const ETH_ADDR = TOKEN_MAP["ETH"]?.address || "0x0000000000000000000000000000000000000000";
            const WETH_ADDR = TOKEN_MAP["WETH"]?.address || "0x4200000000000000000000000000000000000006";

            let t0_calc = poolConfig.token0;
            let t1_calc = poolConfig.token1;

            if (t0_calc === ETH_ADDR) t0_calc = WETH_ADDR;
            if (t1_calc === ETH_ADDR) t1_calc = WETH_ADDR;

            // Canonical Sorting for WETH-normalized addresses
            const [c0, c1] = t0_calc.toLowerCase() < t1_calc.toLowerCase()
                ? [t0_calc, t1_calc]
                : [t1_calc, t0_calc];

            // Calculate PoolID using WETH
            const poolId = getPoolId(
                c0 as `0x${string}`,
                c1 as `0x${string}`,
                poolConfig.fee,
                poolConfig.tickSpacing,
                poolConfig.hooks as `0x${string}`
            );

            const key = {
                currency0: c0 as `0x${string}`,
                currency1: c1 as `0x${string}`,
                fee: poolConfig.fee,
                tickSpacing: poolConfig.tickSpacing,
                hooks: poolConfig.hooks as `0x${string}`
            };

            console.log("Generated Pool Key ID for Swap (Normalized to WETH):", poolId);

            let permitToken = inputToken;
            let permitSymbol = inputSymbol;



            if (inputToken === ETH_ADDR) {
                permitToken = WETH_ADDR;
                permitSymbol = "WETH"; // Ensure relayer gets "WETH"
            }

            // --- DIRECT EXECUTION MODE ---
            if (isDirectSwap) {
                // 1. Check Allowance
                // Using permitToken (WETH) because Executor calls transferFrom on it
                const amountRaw = parseUnits(swapAmount, decimals);

                if (publicClient) {
                    const allowance = await publicClient.readContract({
                        address: permitToken as `0x${string}`,
                        abi: erc20Abi,
                        functionName: 'allowance',
                        args: [address, CONTRACTS.unichainSepolia.executor as `0x${string}`]
                    });

                    if (allowance < amountRaw) {
                        toast.info(`Approving ${permitSymbol} for Executor...`);
                        await writeContractAsync({
                            address: permitToken as `0x${string}`,
                            abi: erc20Abi,
                            functionName: 'approve',
                            args: [CONTRACTS.unichainSepolia.executor as `0x${string}`, amountRaw]
                        });
                        toast.success("Approval Sent", { description: "Waiting for confirmation..." });
                        // Ideally we wait for receipt here, but let's just proceed or let user click again if it fails
                        // For better UX, we should wait.
                        // Simple wait
                        await new Promise(r => setTimeout(r, 4000));
                    }
                }

                // 2. Execute
                const MIN_SQRT_PRICE = 4295128739n + 1n;
                const MAX_SQRT_PRICE = 1461446703485210103287273052203988822378723970342n - 1n;

                const params = {
                    zeroForOne: zeroForOne,
                    amountSpecified: amountRaw * -1n, // Exact Input = Negative
                    sqrtPriceLimitX96: zeroForOne ? MIN_SQRT_PRICE : MAX_SQRT_PRICE
                };

                const hash = await writeContractAsync({
                    address: CONTRACTS.unichainSepolia.executor as `0x${string}`,
                    abi: EXECUTOR_ABI,
                    functionName: 'execute',
                    args: [key, params, "0x", address] // '0x' hookData, recipient = user
                });

                const shortHash = `${hash.slice(0, 6)}...`;
                toast.success("Direct Swap Executed", {
                    description: `Tx: ${shortHash}. Check Explorer.`
                });

                // Add Activity
                const newActivity: Activity = {
                    id: crypto.randomUUID(),
                    type: 'SWAP',
                    description: `Direct Swap: ${swapAmount} ${inputSymbol}`,
                    hash: hash,
                    timestamp: Date.now()
                };
                setActivities(prev => [newActivity, ...prev]);

                setIsSwapPending(false);
                return;
            } // --- END DIRECT MODE ---

            // Map Native ETH to WETH for signing (Permit2/Hook requirement)
            const tokenToSign = (permitToken as string) === ETH_ADDR
                ? WETH_ADDR as `0x${string}` // WETH on Unichain Sepolia
                : permitToken as `0x${string}`;

            const result = await signPermit(
                tokenToSign,
                swapAmount,
                poolId,
                false, // One-sided liquidity (User just wants to swap, effectively providing 1-sided to the pool temporarily)
                30,    // 30 minutes validity
                decimals
            );

            if (!result) return; // User rejected or failed

            // 3. Post Intent to Relayer
            // The Bot will pick this up, see it matches the pool, and execute the swap
            // In a real JIT Swap, the Bot basically "fills" this order.

            addPosition({
                tokenA: permitToken, // Use Full Address
                tokenB: zeroForOne ? poolConfig.token1 : poolConfig.token0, // Target (Output)
                amountA: swapAmount,
                amountB: "0",
                expiry: Number(result.deadline) * 1000, // Use EXACT deadline from signature
                signature: result.signature,
                liquidityMode: 'one-sided', // Swaps are inherently one-sided inputs
                nonce: result.nonce.toString(),
                provider: address,
                poolId: poolId,
                fee: poolConfig.fee,
                tickSpacing: poolConfig.tickSpacing,
                hookAddress: poolConfig.hooks
            });

            toast.success("Swap Intent Submitted", {
                description: `Bot will execute swap: ${swapAmount} ${inputSymbol} -> ${zeroForOne ? sym1 : sym0}`
            });

            // Add Activity
            const newActivity: Activity = {
                id: crypto.randomUUID(),
                type: 'SWAP',
                description: `Intent: Swap ${swapAmount} ${inputSymbol}`,
                hash: "Pending...", // Bot will provide hash
                timestamp: Date.now()
            };
            setActivities(prev => [newActivity, ...prev]);

        } catch (e: unknown) {
            console.error(e);
            const message = e instanceof Error ? e.message : "Unknown error";
            toast.error("Swap Failed", { description: message });
        } finally {
            setIsSwapPending(false);
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
                    <h2 className="text-xl md:text-3xl font-display bg-gradient-to-r from-phantom-cyan to-violet-400 bg-clip-text text-transparent drop-shadow-sm">
                        Pool Manager
                    </h2>
                    <div className="flex items-center gap-2 mt-1 md:mt-2">
                        <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${isWrongNetwork ? 'bg-rose-500' : 'bg-green-500'} animate-pulse`}></span>
                        <p className="text-[10px] md:text-xs text-text-muted font-mono tracking-wider uppercase">
                            V4 • {isWrongNetwork ? <span className="text-rose-400 font-bold underline decoration-rose-500/30">DISCONNECTED</span> : "Unichain"}
                        </p>
                    </div>
                </div>

                {/* Tabs moved to Header for better Landscape use - Now with horizontal scroll on mobile */}
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide -mx-2 px-2 md:mx-0 md:px-0">
                    {mounted && customPools.length > 0 && (
                        <button
                            className="px-3 py-2 rounded-lg font-mono text-[10px] md:text-xs text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-all flex items-center gap-2 shrink-0"
                            onClick={() => {
                                if (confirm("Clear all custom pools?")) {
                                    setCustomPools([]);
                                    toast.success("Custom pools cleared");
                                }
                            }}
                        >
                            <span className="material-symbols-outlined text-[16px] md:text-sm">delete_sweep</span>
                            <span className="hidden sm:inline">CLEAR CUSTOM</span>
                        </button>
                    )}
                    <button
                        className={`px-3 md:px-4 py-2 rounded-lg font-display tracking-widest text-[10px] md:text-sm transition-all duration-300 border shrink-0 ${activeTab === 'list' ? 'bg-primary/20 border-primary text-primary' : 'bg-transparent border-transparent text-text-muted hover:text-white hover:bg-white/5'}`}
                        onClick={() => setActiveTab('list')}
                    >
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-base md:text-lg">list</span>
                            POOLS
                        </div>
                    </button>
                    <button
                        className={`px-3 md:px-4 py-2 rounded-lg font-display tracking-widest text-[10px] md:text-sm transition-all duration-300 border shrink-0 ${activeTab === 'create' ? 'bg-accent/20 border-accent text-accent' : 'bg-transparent border-transparent text-text-muted hover:text-white hover:bg-white/5'}`}
                        onClick={() => setActiveTab('create')}
                    >
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-base md:text-lg">add_circle</span>
                            INIT
                        </div>
                    </button>
                    <button
                        className={`px-3 md:px-4 py-2 rounded-lg font-display tracking-widest text-[10px] md:text-sm transition-all duration-300 border shrink-0 ${activeTab === 'swap' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-transparent border-transparent text-text-muted hover:text-white hover:bg-white/5'}`}
                        onClick={() => setActiveTab('swap')}
                    >
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-base md:text-lg">swap_horiz</span>
                            SWAP
                        </div>
                    </button>
                    <button
                        className={`px-3 md:px-4 py-2 rounded-lg font-display tracking-widest text-[10px] md:text-sm transition-all duration-300 border shrink-0 ${activeTab === 'activity' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-transparent border-transparent text-text-muted hover:text-white hover:bg-white/5'}`}
                        onClick={() => setActiveTab('activity')}
                    >
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-base md:text-lg">history</span>
                            LOG
                            {mounted && activities.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>}
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
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Desktop Table View */}
                                <div className="hidden md:block overflow-hidden rounded-xl border border-border-dark bg-black/20">
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

                                                const symbol0 = t0?.symbol || truncateAddress(pool.token0);
                                                const symbol1 = t1?.symbol || truncateAddress(pool.token1);

                                                let displayPrice = "-";
                                                if (isLive) {
                                                    const val = hexToBigInt(rawValue as `0x${string}`);
                                                    const sqrtP = val & ((1n << 160n) - 1n);
                                                    const d0 = t0?.decimals || 18;
                                                    const d1 = t1?.decimals || 18;
                                                    displayPrice = sqrtPriceToPrice(sqrtP, d0, d1);
                                                }

                                                const isSelected = pool.token0.toLowerCase() === poolConfig.token0.toLowerCase() &&
                                                    pool.token1.toLowerCase() === poolConfig.token1.toLowerCase() &&
                                                    pool.fee === poolConfig.fee;

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

                                {/* Mobile Card View */}
                                <div className="md:hidden space-y-4">
                                    {allPoolKeys.map((pool, i) => {
                                        const status = poolsStatus?.[i];
                                        const rawValue = (status && status.status === "success") ? status.result : "0x00";
                                        const isLive = hexToBigInt(rawValue as `0x${string}`) !== 0n;

                                        const t0 = getTokenByAddress(pool.token0);
                                        const t1 = getTokenByAddress(pool.token1);

                                        const symbol0 = t0?.symbol || truncateAddress(pool.token0);
                                        const symbol1 = t1?.symbol || truncateAddress(pool.token1);

                                        const isSelected = pool.token0.toLowerCase() === poolConfig.token0.toLowerCase() &&
                                            pool.token1.toLowerCase() === poolConfig.token1.toLowerCase() &&
                                            pool.fee === poolConfig.fee;

                                        const isCustom = i >= OFFICIAL_POOL_KEYS.length;
                                        const customIndex = i - OFFICIAL_POOL_KEYS.length;

                                        return (
                                            <div key={i} className={`p-4 rounded-xl border transition-all ${isSelected ? "border-primary bg-primary/5 shadow-[0_0_15px_-5px_rgba(165,243,252,0.2)]" : "border-white/5 bg-white/5"}`}
                                                onClick={() => {
                                                    setPoolConfig(pool);
                                                    setActiveTab('create');
                                                }}>
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex -space-x-2">
                                                            <div className="w-8 h-8 rounded-full border-2 border-background-dark bg-neutral-800 flex items-center justify-center overflow-hidden relative">
                                                                {t0?.logo ? <Image src={t0.logo} alt="T0" fill className="object-cover" unoptimized /> : <div className="bg-neutral w-full h-full"></div>}
                                                            </div>
                                                            <div className="w-8 h-8 rounded-full border-2 border-background-dark bg-neutral-800 flex items-center justify-center overflow-hidden relative">
                                                                {t1?.logo ? <Image src={t1.logo} alt="T1" fill className="object-cover" unoptimized /> : <div className="bg-neutral w-full h-full"></div>}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-white font-display tracking-tight">{symbol0}/{symbol1}</h4>
                                                            <p className="text-[10px] text-text-muted font-mono">Fee: {(pool.fee / 10000).toFixed(2)}%</p>
                                                        </div>
                                                    </div>
                                                    {isLive ? (
                                                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold font-mono border border-emerald-500/20">LIVE</span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded bg-white/5 text-text-muted text-[10px] font-mono">DEAD</span>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded border border-white/5 overflow-hidden">
                                                        <span className="material-symbols-outlined text-[14px] text-primary">webhook</span>
                                                        <span className="text-[10px] text-text-muted font-mono truncate">{truncateAddress(pool.hooks)}</span>
                                                    </div>
                                                    <div className="flex gap-2 shrink-0">
                                                        {isCustom && (
                                                            <button
                                                                className="size-8 rounded bg-rose-500/10 text-rose-500 flex items-center justify-center"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    removeCustomPool(customIndex);
                                                                }}
                                                            >
                                                                <span className="material-symbols-outlined text-sm">delete</span>
                                                            </button>
                                                        )}
                                                        <button className={`h-8 px-4 rounded font-mono text-[10px] ${isSelected ? "bg-primary text-black font-bold" : "bg-white/10 text-white"}`}>
                                                            {isSelected ? "ACTIVE" : "SELECT"}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Tab Content: Initialize */}
                        {activeTab === 'create' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Left Column: Configuration */}
                                <div className="border border-border-dark p-4 md:p-6 rounded-2xl bg-black/20">

                                    {/* Ghost Liquidity Indicator */}
                                    <div className="mb-6 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between gap-3 overflow-hidden">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                                                <span className="text-xl">👻</span>
                                            </div>
                                            <div className="overflow-hidden">
                                                <h4 className="text-purple-300 font-display text-[10px] md:text-sm tracking-widest uppercase">INVISIBLE DEPTH</h4>
                                                <p className="text-[10px] text-purple-400/60 font-mono truncate">
                                                    {poolGhostLiquidity.count} Active Spirits
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="text-white font-mono font-bold text-[10px] md:text-sm">
                                                {poolGhostLiquidity.total0 > 0 && <span>{poolGhostLiquidity.total0.toFixed(2)}</span>}
                                                {poolGhostLiquidity.total0 > 0 && poolGhostLiquidity.total1 > 0 && <span className="mx-1">+</span>}
                                                {poolGhostLiquidity.total1 > 0 && <span>{poolGhostLiquidity.total1.toFixed(2)}</span>}
                                                {poolGhostLiquidity.total0 === 0 && poolGhostLiquidity.total1 === 0 && (
                                                    <span className="opacity-50 italic text-[10px]">Empty</span>
                                                )}
                                            </div>
                                            <div className="text-[8px] md:text-[10px] text-purple-400/50 uppercase tracking-widest">
                                                Available Depth
                                            </div>
                                        </div>
                                    </div>

                                    {/* Re-Summon Prompt */}
                                    {poolGhostLiquidity.count === 0 && (
                                        <div className="mb-6 -mt-4 text-center animate-pulse">
                                            <Link href="/summon" className="text-[10px] md:text-xs text-secondary hover:text-secondary-highlight underline font-mono">
                                                Need more spirits? Summon here →
                                            </Link>
                                        </div>
                                    )}

                                    <label className="text-[10px] md:text-sm font-display text-text-muted tracking-[0.2em] uppercase mb-4 md:mb-6 block">Pool Configuration</label>
                                    <div className="flex flex-col gap-4 md:gap-6">

                                        {/* Token Selection Row */}
                                        <div className="grid grid-cols-2 gap-3 md:gap-4">
                                            <div>
                                                <span className="text-[10px] text-text-muted font-mono mb-1 md:mb-2 block uppercase">Token 0</span>
                                                <button
                                                    className="w-full flex items-center justify-between px-2 md:px-3 py-2 md:py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/50 transition-all group"
                                                    onClick={() => setSelectorType('token0')}
                                                >
                                                    <div className="flex items-center gap-1.5 md:gap-2 overflow-hidden">
                                                        {token0?.logo && <Image src={token0.logo} alt={token0.symbol} width={18} height={18} className="rounded-full shrink-0" unoptimized />}
                                                        <span className="font-bold text-white group-hover:text-primary transition-colors text-xs md:text-sm truncate">{token0?.symbol || "T0"}</span>
                                                    </div>
                                                    <span className="material-symbols-outlined text-text-muted text-base md:text-lg shrink-0">expand_more</span>
                                                </button>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-text-muted font-mono mb-1 md:mb-2 block uppercase">Token 1</span>
                                                <button
                                                    className="w-full flex items-center justify-between px-2 md:px-3 py-2 md:py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/50 transition-all group"
                                                    onClick={() => setSelectorType('token1')}
                                                >
                                                    <div className="flex items-center gap-1.5 md:gap-2 overflow-hidden">
                                                        {token1?.logo && <Image src={token1.logo} alt={token1.symbol} width={18} height={18} className="rounded-full shrink-0" unoptimized />}
                                                        <span className="font-bold text-white group-hover:text-primary transition-colors text-xs md:text-sm truncate">{token1?.symbol || "T1"}</span>
                                                    </div>
                                                    <span className="material-symbols-outlined text-text-muted text-base md:text-lg shrink-0">expand_more</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Hook Information & Input */}
                                        <div className="relative p-4 md:p-5 rounded-xl border border-primary/20 bg-primary/5 overflow-hidden group">
                                            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            <div className="relative z-10 text-center">
                                                <label className="text-[10px] font-bold text-primary flex items-center justify-center gap-2 mb-2 md:mb-3 font-display tracking-widest uppercase">
                                                    <span className="material-symbols-outlined text-xs">webhook</span>
                                                    Hook Address
                                                </label>
                                                <input
                                                    type="text"
                                                    value={poolConfig.hooks}
                                                    onChange={(e) => setPoolConfig({ ...poolConfig, hooks: e.target.value })}
                                                    className="w-full bg-black/40 border border-white/10 p-2 rounded font-mono text-[10px] text-white focus:border-primary focus:ring-0 outline-none text-center"
                                                    placeholder="0x..."
                                                />
                                            </div>
                                        </div>

                                        {/* Custom Fee & Tick Spacing Inputs */}
                                        <div className="grid grid-cols-2 gap-3 md:gap-4 border-t border-white/5 pt-4 md:pt-5">
                                            <div>
                                                <label className="text-[8px] md:text-[10px] font-mono text-text-muted mb-1 md:mb-2 block uppercase tracking-wider">Fee (BPS)</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={poolConfig.fee}
                                                        onChange={(e) => setPoolConfig({ ...poolConfig, fee: Number(e.target.value) })}
                                                        className="w-full bg-black/40 border border-white/10 p-2 md:p-3 rounded-xl font-mono text-xs md:text-sm text-white focus:border-primary outline-none"
                                                        placeholder="3000"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[8px] md:text-[10px] font-mono text-text-muted mb-1 md:mb-2 block uppercase tracking-wider">Tick Spacing</label>
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        value={poolConfig.tickSpacing}
                                                        onChange={(e) => setPoolConfig({ ...poolConfig, tickSpacing: Number(e.target.value) })}
                                                        className="w-full bg-black/40 border border-white/10 p-2 md:p-3 rounded-xl font-mono text-xs md:text-sm text-white focus:border-primary outline-none"
                                                        placeholder="60"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Initialization Action */}
                                <div className="relative flex flex-col justify-between p-4 md:p-6 rounded-2xl border border-border-dark bg-gradient-to-b from-white/5 to-transparent">
                                    <div>
                                        <label className="text-[10px] md:text-sm font-display text-text-muted tracking-[0.2em] uppercase mb-4 md:mb-6 block">Initialization</label>

                                        <div className="space-y-4">
                                            <label className="block">
                                                <div className="flex justify-between mb-2">
                                                    <span className="text-[10px] font-mono text-text-muted">Start Price</span>
                                                    <span className="text-[10px] font-mono text-primary truncate ml-2">1 {token0?.symbol || "T0"} = {Number(price).toFixed(2)}</span>
                                                </div>
                                                <div className="relative group">
                                                    <input
                                                        type="text"
                                                        placeholder="0.0"
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 md:py-4 font-mono text-lg md:text-xl text-white outline-none focus:border-primary/50 transition-all placeholder:text-white/20"
                                                        value={price}
                                                        onChange={(e) => setPrice(e.target.value)}
                                                        disabled={isPoolInitialized}
                                                    />
                                                </div>
                                            </label>

                                            <div className={`flex items-center justify-between p-3 md:p-4 rounded-xl border transition-colors ${isPoolInitialized ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/5 border-white/5'}`}>
                                                <span className="text-[10px] font-mono text-text-muted">Status</span>
                                                {isPoolInitialized ? (
                                                    <div className="flex items-center gap-1 text-emerald-400 font-bold font-display tracking-wider text-xs">
                                                        <span className="material-symbols-outlined text-base">check_circle</span>
                                                        ACTIVE
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 text-text-muted/60 font-mono text-[10px]">
                                                        <span className="material-symbols-outlined text-base">pending</span>
                                                        EMPTY
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 md:mt-8">
                                        <button
                                            className={`w-full relative overflow-hidden group py-3 md:py-4 rounded-xl font-bold font-display tracking-widest transition-all text-xs md:text-sm ${isPoolInitialized
                                                ? "border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 cursor-default"
                                                : !isConnected ? "bg-white/10 text-white cursor-not-allowed"
                                                    : "bg-primary text-black hover:shadow-[0_0_25px_-5px_rgba(165,243,252,0.5)] active:scale-[0.98]"}`}
                                            onClick={handleInitialize}
                                            disabled={isPoolInitialized}
                                        >
                                            {isPoolInitialized ? "POOL STARTED" : (isConnected ? "INITIALIZE" : "CONNECT")}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab Content: Swap */}
                        {activeTab === 'swap' && (
                            <div className="p-4 md:p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <h3 className="text-lg md:text-xl font-display text-emerald-400 mb-2 md:mb-4 tracking-widest uppercase">Test Pool Hooks</h3>
                                <p className="text-xs md:text-sm text-text-muted mb-4 md:mb-6">
                                    Perform a test swap directly against this Pool Key. Guarantees your <span className="text-primary font-mono">EidolonHook</span> runs.
                                </p>

                                <div className="space-y-4 md:space-y-6 max-w-md mx-auto">
                                    {/* Input Field */}
                                    <div className="bg-black/40 p-3 md:p-4 rounded-xl border border-white/10">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] md:text-xs font-medium text-white/60">Amount In</span>
                                            {inputBalance && (
                                                <div className="text-[10px] md:text-xs text-text-muted flex items-center gap-2">
                                                    <span>Bal: {Number(inputBalance.formatted).toFixed(3)}</span>
                                                    <button
                                                        className="text-primary hover:text-white transition-colors uppercase font-bold text-[10px]"
                                                        onClick={() => setSwapAmount(inputBalance.formatted)}
                                                    >
                                                        Max
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 md:gap-3">
                                            <input
                                                type="text"
                                                value={swapAmount}
                                                onChange={(e) => setSwapAmount(e.target.value)}
                                                className="w-full bg-transparent text-xl md:text-2xl font-mono text-white outline-none placeholder:text-white/20"
                                                placeholder="0.0"
                                            />
                                            <button
                                                onClick={() => setSelectorType(zeroForOne ? 'token0' : 'token1')}
                                                className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 transition-all group shrink-0"
                                            >
                                                {(zeroForOne ? token0 : token1)?.logo && (
                                                    <Image
                                                        src={(zeroForOne ? token0 : token1)?.logo as string}
                                                        alt="T"
                                                        width={16}
                                                        height={16}
                                                        className="rounded-full md:w-[20px] md:h-[20px]"
                                                        unoptimized
                                                    />
                                                )}
                                                <span className="font-bold text-white text-xs md:text-sm">
                                                    {zeroForOne ? token0?.symbol : token1?.symbol}
                                                </span>
                                                <span className="material-symbols-outlined text-xs md:text-sm opacity-60 group-hover:rotate-180 transition-transform">expand_more</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Swap Direction Toggle */}
                                    <div className="flex justify-center -my-2 relative z-10">
                                        <button
                                            onClick={() => setZeroForOne(!zeroForOne)}
                                            className="p-1.5 md:p-2 rounded-full bg-[#0a0a0f] hover:bg-white/10 border border-white/10 transition-colors shadow-xl"
                                        >
                                            <span className="material-symbols-outlined text-white/80 text-base md:text-lg">swap_vert</span>
                                        </button>
                                    </div>

                                    {/* Output Field (Estimated) */}
                                    <div className="bg-black/40 p-3 md:p-4 rounded-xl border border-white/10 opacity-60">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] md:text-xs font-medium text-white/60">Estimated Out</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="text-xl md:text-2xl font-mono text-white/50 truncate">
                                                {estimatedOutput ? (
                                                    <span className="text-emerald-400">~{estimatedOutput}</span>
                                                ) : (
                                                    <span className="animate-pulse">?</span>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => setSelectorType(zeroForOne ? 'token1' : 'token0')}
                                                className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all group shrink-0"
                                            >
                                                {(zeroForOne ? token1 : token0)?.logo && (
                                                    <Image
                                                        src={(zeroForOne ? token1 : token0)?.logo as string}
                                                        alt="T"
                                                        width={16}
                                                        height={16}
                                                        className="rounded-full md:w-[20px] md:h-[20px]"
                                                        unoptimized
                                                    />
                                                )}
                                                <span className="font-bold text-white text-xs md:text-sm">
                                                    {zeroForOne ? token1?.symbol : token0?.symbol}
                                                </span>
                                                <span className="material-symbols-outlined text-xs md:text-sm opacity-60 group-hover:rotate-180 transition-transform">expand_more</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between my-4 md:my-6 px-1">
                                    <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest">
                                        GASLESS OPTION
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-bold ${isDirectSwap ? "text-text-muted" : "text-emerald-400"}`}>INTENT</span>
                                        <input
                                            type="checkbox"
                                            className="toggle toggle-success toggle-xs"
                                            checked={isDirectSwap}
                                            onChange={(e) => setIsDirectSwap(e.target.checked)}
                                        />
                                        <span className={`text-[10px] font-bold ${isDirectSwap ? "text-emerald-400" : "text-text-muted"}`}>DIRECT</span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleSwap}
                                    disabled={isSwapPending}
                                    className={`w-full py-3 md:py-4 font-bold font-display tracking-[0.2em] rounded-xl transition-all text-xs md:text-sm
                                        ${isSwapPending ? "bg-white/10 text-white/50 cursor-not-allowed" :
                                            isDirectSwap ? "bg-blue-500 hover:bg-blue-400 text-black shadow-[0_4px_20px_rgba(59,130,246,0.3)]" :
                                                "bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_4px_20px_rgba(16,185,129,0.3)]"
                                        }`}
                                >
                                    {isSwapPending ? "PROCESSING..." : (isDirectSwap ? "EXECUTE SWAP" : "SIGN INTENT")}
                                </button>
                            </div>
                        )}

                        {/* Tab Content: Activity Log */}
                        {activeTab === 'activity' && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[300px]">
                                {mounted && activities.length > 0 ? (
                                    <div className="space-y-2 md:space-y-3">
                                        {activities.map((activity) => (
                                            <a
                                                key={activity.id}
                                                href={`https://unichain-sepolia.blockscout.com/tx/${activity.hash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block p-3 md:p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-primary/20 transition-all group"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="flex items-center gap-2 md:gap-3">
                                                        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center border border-white/10 shrink-0 ${activity.type === 'INITIALIZE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-primary/10 text-primary'}`}>
                                                            <span className="material-symbols-outlined text-base md:text-lg">
                                                                {activity.type === 'INITIALIZE' ? 'rocket_launch' : 'swap_horiz'}
                                                            </span>
                                                        </div>
                                                        <div className="overflow-hidden">
                                                            <div className="font-bold text-white text-[10px] md:text-sm group-hover:text-primary transition-colors uppercase tracking-tight md:tracking-normal truncate">
                                                                {activity.description}
                                                            </div>
                                                            <div className="text-[8px] md:text-xs text-text-muted font-mono mt-0.5 md:mt-1">
                                                                {new Date(activity.timestamp).toLocaleString()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-[8px] md:text-xs font-mono text-text-muted group-hover:text-white transition-colors shrink-0">
                                                        <span className="hidden sm:inline">EXPLORER</span>
                                                        <span className="material-symbols-outlined text-xs md:text-sm">open_in_new</span>
                                                    </div>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 md:py-20 text-text-muted opacity-50">
                                        <span className="material-symbols-outlined text-4xl md:text-5xl mb-4">history_toggle_off</span>
                                        <p className="font-display tracking-[0.2em] uppercase text-[10px] md:text-sm">Void of Action</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
