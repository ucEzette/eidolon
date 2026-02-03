"use client";

import { useState } from "react";
import { TOKENS, TOKEN_MAP, type Token } from "@/config/tokens";
import { TokenSelector } from "@/components/sanctum/TokenSelector";
import { CONTRACTS } from "@/config/web3";
import { toast } from "sonner";
import { useAccount, useWriteContract } from "wagmi";
import { getPoolId, getSqrtPriceX96 } from "@/utils/uniswap";
import { parseAbi } from "viem";

const POOL_MANAGER_ABI = parseAbi([
    "function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint160 sqrtPriceX96, bytes hookData) external payable returns (int24 tick)"
]);

// Mock list of "Official" Pools
const OFFICIAL_POOLS = [
    { tokenA: "ETH", tokenB: "USDC", fee: 3000, label: "Standard (0.3%)" },
    { tokenA: "ETH", tokenB: "USDC", fee: 500, label: "Stable (0.05%)" },
];

export function PoolManager() {
    const [isTokenAOpen, setIsTokenAOpen] = useState(false);
    const [isTokenBOpen, setIsTokenBOpen] = useState(false);

    // Default: ETH (Native) + USDC
    const [tokenA, setTokenA] = useState<Token>(TOKEN_MAP["ETH"]);
    const [tokenB, setTokenB] = useState<Token>(TOKEN_MAP["USDC"]);

    const [feeTier, setFeeTier] = useState<number>(3000);
    const [initialPrice, setInitialPrice] = useState<string>("3000"); // USDC per ETH

    const { isConnected } = useAccount();
    const { writeContractAsync, isPending } = useWriteContract();

    const handleInitialize = async () => {
        if (!isConnected) {
            toast.error("Please connect wallet");
            return;
        }

        try {
            // 1. Force Native ETH Logic
            // The Bot expects Native ETH (0x0...0). If user selected "WETH", swap it to "ETH" implicitly or warn?
            // Better: Swap the internal value used for initialization to Native ETH if it's WETH, or just ensure default is ETH.
            // If user explicitly picked WETH, they might want WETH pool. 
            // BUT for the "Fix Mismatch" goal, we want them to create the Native Pool.

            let currency0 = tokenA.address;
            let currency1 = tokenB.address;

            // Auto-fix: If one token is WETH, use ETH address instead for this specific 'Sanctum' Pool
            // because our bot logic hardcodes Native ETH for gas efficiency/handling.
            if (currency0 === TOKEN_MAP["WETH"].address) currency0 = TOKEN_MAP["ETH"].address;
            if (currency1 === TOKEN_MAP["WETH"].address) currency1 = TOKEN_MAP["ETH"].address;

            // 2. Sort Currencies (Uniswap Requirement)
            const [token0, token1] = currency0.toLowerCase() < currency1.toLowerCase()
                ? [currency0, currency1]
                : [currency1, currency0]; // Sorted

            // 3. Calculate SqrtPriceX96
            // We need to know which token is token0 to interpret the "Price".
            // User entered "Price of TokenB in terms of TokenA" (e.g. 3000 USDC per 1 ETH).
            // Usually UI assumes Base/Quote. Let's assume TokenA is Base, TokenB is Quote.
            // Price = TokenB / TokenA.

            // If TokenA (Base) became Token0: Price0 = amount1/amount0 = Price.
            // If TokenA (Base) became Token1: Price0 = amount1/amount0 = 1/Price.

            // Example: ETH (0) / USDC (1). TokenA=ETH.
            // Sorted: ETH (0), USDC (1).
            // TokenA is Token0. 
            // We want Price of ETH in USDC = 3000. 
            // Price0 = USDC / ETH = 3000. Correct.

            // Example: USDC (0) / ETH (1). (Hypothetically if USDC address < ETH address, which isn't true for 0x0...0)

            let priceVal = parseFloat(initialPrice);
            if (isNaN(priceVal) || priceVal <= 0) throw new Error("Invalid Price");

            // Adjust price if sorting flipped the pair relative to UI expectation
            if (tokenA.address.toLowerCase() !== token0.toLowerCase()) {
                // Formatting: User explicitly checks "Initial Price (USDC per ETH)". 
                // If TokenA=USDC, TokenB=ETH.
                // UI Label says: Price (ETH per USDC)? 
                // Let's rely on the label: "Initial Price ({tokenB} per {tokenA})"

                // If User inputs 3000 USDC per ETH.
                // TokenA = ETH, TokenB = USDC.
                // Sorted: Token0=ETH, Token1=USDC.
                // We need Price (Token1/Token0) = 3000. 

                // Logic check:
                // getSqrtPriceX96 takes (price, decimals0, decimals1).
                // It expects Price = Token1/Token0.

                // If TokenA == Token0, then UI Price (B per A) IS (1 per 0). Correct.
                // If TokenA == Token1, then UI Price (B per A) IS (0 per 1). Inverted.

                // If TokenA != Token0, it means TokenA is Token1. 
                // Price input is (Token0 per Token1).
                // We need (Token1 per Token0).
                priceVal = 1 / priceVal;
            }

            const token0Decimals = token0.toLowerCase() === tokenA.address.toLowerCase() ? tokenA.decimals : tokenB.decimals;
            const token1Decimals = token1.toLowerCase() === tokenA.address.toLowerCase() ? tokenA.decimals : tokenB.decimals;

            const sqrtPriceX96 = getSqrtPriceX96(priceVal, token0Decimals, token1Decimals);

            // 4. Construct PoolKey
            const poolKey = {
                currency0: token0,
                currency1: token1,
                fee: feeTier,
                tickSpacing: 60,
                hooks: CONTRACTS.unichainSepolia.eidolonHook
            };

            console.log("Initializing Pool:", { poolKey, sqrtPriceX96: sqrtPriceX96.toString() });

            // 5. Execute Transaction
            const hash = await writeContractAsync({
                address: CONTRACTS.unichainSepolia.poolManager,
                abi: POOL_MANAGER_ABI,
                functionName: 'initialize',
                args: [
                    poolKey,
                    sqrtPriceX96,
                    "0x" // No hook data needed for initialization in standard case? Or empty bytes.
                ],
                value: 0n // Initialization doesn't require sending ETH usually unless minting? V4 init is pure state.
            });

            toast.success("Transaction Sent!", {
                description: "Initializing Unichain Pool...",
                action: {
                    label: "View",
                    onClick: () => window.open(`https://sepolia.uniscan.xyz/tx/${hash}`, '_blank')
                }
            });

        } catch (err: any) {
            console.error(err);
            toast.error("Initialization Failed", {
                description: err.message || "Unknown error"
            });
        }
    };

    return (
        <div className="w-full h-full bg-void border border-white/5 p-1 relative overflow-hidden animate-fade-in-up delay-100 flex flex-col">
            <div className="bg-black/40 p-6 relative backdrop-blur-md flex-1">
                <h2 className="text-xl font-display font-bold text-white mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-phantom-cyan">water_drop</span>
                    Sanctum Pools
                </h2>

                {/* Existing Pools List */}
                <div className="space-y-3 mb-8">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Verified Pools</h3>
                    {OFFICIAL_POOLS.map((pool, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:border-phantom-cyan/30 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="flex -space-x-2">
                                    <div className="h-6 w-6 rounded-full bg-slate-700 flex items-center justify-center text-[8px] font-bold text-white border border-black">{pool.tokenA}</div>
                                    <div className="h-6 w-6 rounded-full bg-slate-700 flex items-center justify-center text-[8px] font-bold text-white border border-black">{pool.tokenB}</div>
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-white flex items-center gap-2">
                                        {pool.tokenA}/{pool.tokenB}
                                        <span className="text-[10px] bg-slate-800 px-1.5 rounded text-slate-400">{pool.fee / 10000}%</span>
                                    </div>
                                    <div className="text-[10px] text-phantom-cyan flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[10px]">webhook</span>
                                        Eidolon Hook
                                    </div>
                                </div>
                            </div>
                            <button className="text-xs font-medium text-slate-400 hover:text-white px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors">
                                View
                            </button>
                        </div>
                    ))}
                </div>

                {/* Create Pool Section */}
                <div className="space-y-4 pt-6 border-t border-white/10">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                        Initialize New Pool
                        <span className="text-[10px] text-slate-600 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">Advanced</span>
                    </h3>

                    {/* Token Selection */}
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => setIsTokenAOpen(true)} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg hover:border-white/30 transition-all">
                            <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-bold">{tokenA.symbol[0]}</div>
                                <span className="font-mono font-bold">{tokenA.symbol}</span>
                            </div>
                            <span className="material-symbols-outlined text-slate-500">expand_more</span>
                        </button>
                        <button onClick={() => setIsTokenBOpen(true)} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg hover:border-white/30 transition-all">
                            <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-cyan-500 flex items-center justify-center text-[10px] font-bold">{tokenB.symbol[0]}</div>
                                <span className="font-mono font-bold">{tokenB.symbol}</span>
                            </div>
                            <span className="material-symbols-outlined text-slate-500">expand_more</span>
                        </button>
                    </div>

                    {/* Fee Tier Selection */}
                    <div className="grid grid-cols-3 gap-2">
                        {[500, 3000, 10000].map((fee) => (
                            <button
                                key={fee}
                                onClick={() => setFeeTier(fee)}
                                className={`py-2 text-xs font-mono font-bold rounded border transition-all ${feeTier === fee
                                    ? 'bg-phantom-cyan/20 border-phantom-cyan text-phantom-cyan'
                                    : 'bg-transparent border-white/10 text-slate-500 hover:text-white'
                                    }`}
                            >
                                {fee / 10000}%
                            </button>
                        ))}
                    </div>

                    {/* Initial Price */}
                    <div className="space-y-1">
                        <label className="text-xs text-slate-500 font-medium ml-1">Initial Price ({tokenB.symbol} per {tokenA.symbol})</label>
                        <div className="relative group/input">
                            <input
                                type="text"
                                value={initialPrice}
                                onChange={(e) => setInitialPrice(e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 font-mono text-sm text-white focus:border-phantom-cyan focus:outline-none transition-colors"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleInitialize}
                        disabled={isPending}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-bold text-white uppercase tracking-wider hover:border-phantom-cyan/50 hover:text-phantom-cyan transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isPending ? 'Initializing...' : 'Initialize Pool'}
                    </button>
                </div>
            </div>

            <TokenSelector
                isOpen={isTokenAOpen}
                onClose={() => setIsTokenAOpen(false)}
                onSelect={(t) => { setTokenA(t); setIsTokenAOpen(false); }}
            />
            <TokenSelector
                isOpen={isTokenBOpen}
                onClose={() => setIsTokenBOpen(false)}
                onSelect={(t) => { setTokenB(t); setIsTokenBOpen(false); }}
            />
        </div>
    );
}
