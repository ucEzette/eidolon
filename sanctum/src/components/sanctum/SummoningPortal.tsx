"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const TokenSelector = dynamic(() => import("@/components/sanctum/TokenSelector").then(mod => mod.TokenSelector), {
    ssr: false,
    loading: () => null
});
import { useGhostPermit } from "@/hooks/useGhostPermit";
import { useEidolonHook } from "@/hooks/useEidolonHook";
import { useAccount, useBalance } from "wagmi";
import { TOKENS, TOKEN_MAP, type Token } from "@/config/tokens";
import { getPoolId } from "@/utils/uniswap";
import { CONTRACTS, POOLS } from "@/config/web3";
import { toast } from "sonner";
import { type Address } from "viem";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useGhostPositions } from "@/hooks/useGhostPositions";
import { useCircleWallet } from "@/components/providers/CircleWalletProvider";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseAbi, maxUint256, parseUnits } from "viem";

type LiquidityMode = 'one-sided' | 'dual-sided';

export function SummoningPortal() {
    const [isTokenSelectorOpen, setIsTokenSelectorOpen] = useState(false);
    const [isSecondTokenSelectorOpen, setIsSecondTokenSelectorOpen] = useState(false);

    // State for selected tokens
    const [tokenA, setTokenA] = useState<Token>(TOKEN_MAP["ETH"] || TOKENS[0]);
    const [tokenB, setTokenB] = useState<Token>(TOKEN_MAP["USDC"] || TOKENS[2]); // Default to USDC if index shifted

    const [liquidityMode, setLiquidityMode] = useState<LiquidityMode>('one-sided');
    const [amount, setAmount] = useState<string>("5.0");
    const [amountB, setAmountB] = useState<string>("12500"); // Default for demo
    const [validity, setValidity] = useState<number>(3); // Index 0-3
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [customFee, setCustomFee] = useState<string>("3000"); // Standard 0.3%
    const [customTickSpacing, setCustomTickSpacing] = useState<string>("200"); // Standard for 0.3%
    const [customHookAddress, setCustomHookAddress] = useState<string>(CONTRACTS.unichainSepolia.eidolonHook);

    // Hooks
    const { signPermit, isPending: isSignPending, error: signError } = useGhostPermit();
    const { addPosition } = useGhostPositions();
    const { fees, membership } = useEidolonHook();

    // Wallet Connection - Unified
    const { address: wagmiAddress, isConnected: isWagmiConnected } = useAccount();
    const { address: circleAddress, isConnected: isCircleConnected } = useCircleWallet();

    const isConnected = isWagmiConnected || isCircleConnected;
    const address = isCircleConnected ? circleAddress : wagmiAddress;

    const router = useRouter();

    const currentFee = liquidityMode === 'dual-sided'
        ? (membership.isMember ? 0 : fees.dualSided)
        : (membership.isMember ? 0 : fees.singleSided);

    // Fetch Balances using Unified Address
    const { data: balanceA, error: errorA } = useBalance({
        address: address || undefined,
        token: tokenA.isNative ? undefined : tokenA.address,
    });

    const { data: balanceB, error: errorB } = useBalance({
        address: address || undefined,
        token: tokenB.isNative ? undefined : tokenB.address,
    });

    // Approval Logic for WETH
    const PERMIT2_ADDRESS = CONTRACTS.unichainSepolia.permit2;
    const WETH_ADDRESS = TOKEN_MAP["WETH"].address;
    const needsApproval = tokenA.address.toLowerCase() === WETH_ADDRESS.toLowerCase();

    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: tokenA.address as `0x${string}`,
        abi: parseAbi(["function allowance(address, address) view returns (uint256)"]),
        functionName: "allowance",
        args: [address as `0x${string}`, PERMIT2_ADDRESS],
        query: { enabled: !!address && needsApproval }
    });

    const { writeContractAsync: approveAsync, isPending: isApprovePending, data: approveHash } = useWriteContract();

    // Check if approved amount is sufficient
    const currentAllowance = allowance ?? 0n;
    const requiredAmount = BigInt(parseUnits(amount || "0", 18));
    const hasEnoughAllowance = currentAllowance >= requiredAmount;

    // Backup check using Symbol
    const isWETH = tokenA.symbol === "WETH" || tokenA.address.toLowerCase() === WETH_ADDRESS.toLowerCase();

    // Force needsApproval if symbol is WETH
    const actualNeedsApproval = isWETH;

    const sufficientAllowance = !actualNeedsApproval || hasEnoughAllowance;



    const handleApprove = async () => {
        try {
            await approveAsync({
                address: tokenA.address as `0x${string}`,
                abi: parseAbi(["function approve(address spender, uint256 amount) returns (bool)"]),
                functionName: "approve",
                args: [PERMIT2_ADDRESS, maxUint256]
            });
            toast.success("Approval Submitted", { description: "Waiting for confirmation..." });
            // Ideally wait for receipt here or let UI update automatically via refetch
        } catch (e: any) {
            toast.error("Approval Failed", { description: e.message });
        }
    };



    const getNormalizedPoolId = () => {
        const signingTokenA = tokenA.address;
        const signingTokenB = tokenB.address;

        let targetTickSpacing = showAdvanced ? parseInt(customTickSpacing) : 60;
        let targetFee = showAdvanced ? parseInt(customFee) : 100;
        let targetHook = showAdvanced ? customHookAddress : CONTRACTS.unichainSepolia.eidolonHook;

        const WETH_ADDR = TOKEN_MAP["WETH"].address;
        const EIETH_ADDR = TOKEN_MAP["eiETH"].address;

        const normalizeForPool = (addr: string) => {
            const ZERO = TOKENS[0].address;
            if (addr === ZERO) return WETH_ADDR;
            return addr;
        };

        const poolToken0 = normalizeForPool(signingTokenA);
        const poolToken1 = normalizeForPool(signingTokenB);

        // Sort for V4 canonical order
        const [c0, c1] = poolToken0.toLowerCase() < poolToken1.toLowerCase()
            ? [poolToken0, poolToken1]
            : [poolToken1, poolToken0];

        const isWeth = c0.toLowerCase() === WETH_ADDR.toLowerCase() || c1.toLowerCase() === WETH_ADDR.toLowerCase();
        const isEieth = c0.toLowerCase() === EIETH_ADDR.toLowerCase() || c1.toLowerCase() === EIETH_ADDR.toLowerCase();

        if (!showAdvanced && isWeth && isEieth) {
            targetTickSpacing = POOLS.canonical.tickSpacing;
            targetFee = POOLS.canonical.fee;
        }

        return getPoolId(
            c0 as `0x${string}`,
            c1 as `0x${string}`,
            targetFee,
            targetTickSpacing,
            targetHook as `0x${string}`
        );
    };

    const poolId = getNormalizedPoolId();

    const handleSign = async () => {
        if (!isConnected) return;

        const validityMap = [60, 1440, 10080, 43200];
        const minutes = validityMap[validity] || 10080;

        const signingTokenA = tokenA.address;
        const WETH_ADDR = TOKEN_MAP["WETH"].address;

        let targetTickSpacing = showAdvanced ? parseInt(customTickSpacing) : 60;
        let targetFee = showAdvanced ? parseInt(customFee) : 100;
        let targetHook = showAdvanced ? customHookAddress : CONTRACTS.unichainSepolia.eidolonHook;

        const currentPoolId = getNormalizedPoolId();

        const ZERO_ADDRESS = TOKENS[0].address;
        let permitToken = signingTokenA;
        if (permitToken === ZERO_ADDRESS) permitToken = WETH_ADDRESS;

        try {
            const result = await signPermit(
                permitToken as `0x${string}`,
                amount,
                currentPoolId as `0x${string}`,
                liquidityMode === 'dual-sided',
                minutes,
                tokenA.decimals
            );

            if (result) {
                addPosition({
                    tokenA: tokenA.symbol,
                    tokenB: tokenB.symbol,
                    amountA: amount,
                    amountB: liquidityMode === 'dual-sided' ? amountB : "0",
                    expiry: Number(result.deadline) * 1000,
                    signature: result.signature,
                    liquidityMode: liquidityMode,
                    nonce: result.nonce.toString(),
                    provider: address!,
                    poolId: currentPoolId as `0x${string}`,
                    fee: targetFee,
                    tickSpacing: targetTickSpacing,
                    hookAddress: targetHook
                });

                toast.success("Ghost Permit Summoned!", {
                    description: "Your liquidity authority has been signed.",
                });

                router.push("/mirror");
            }
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to summon permit");
        }
    };

    return (
        <div className="w-full max-w-[560px] bg-void border border-border-dark/50 p-1 relative overflow-hidden animate-fade-in-up">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-phantom-cyan/50 to-transparent"></div>
            <div className="bg-black/40 p-4 md:p-8 relative backdrop-blur-md">
                <div className="mb-6 md:mb-8 text-center px-2">
                    <div className="inline-flex items-center justify-center p-3 mb-4 border border-phantom-cyan/20 bg-phantom-cyan/5 shadow-[0_0_20px_-5px_rgba(165,243,252,0.3)]">
                        <div className="relative w-12 h-12 md:w-16 md:h-16">
                            <Image src="/eye_of_god.png" alt="Eye" fill className="object-contain filter brightness-110 drop-shadow-[0_0_8px_rgba(165,243,252,0.6)]" />
                        </div>
                    </div>
                    <h1 className="text-xl md:text-3xl font-display font-bold text-white tracking-widest uppercase mb-2 drop-shadow-md">Summon Ghost Permit</h1>
                    <p className="text-text-muted text-xs md:text-sm font-mono">Authorize zero-TVL liquidity without locking assets.</p>
                </div>

                {signError && (
                    <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-200 text-sm">
                        <span className="material-symbols-outlined text-base">error</span>
                        {signError}
                    </div>
                )}

                <div className="mb-6 p-3 md:p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-[18px]">layers</span>
                            <span className="text-xs md:text-sm font-medium text-white/90 uppercase tracking-tight md:tracking-normal">Liquidity Mode</span>
                        </div>
                        {membership.isMember && (
                            <span className="text-[10px] md:text-xs font-bold text-amber-400 border border-amber-400/30 px-2 py-0.5 rounded-full bg-amber-400/10">MEMBER (0%)</span>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setLiquidityMode('one-sided')} className={`py-2.5 md:py-3 px-2 md:px-4 text-[10px] md:text-sm font-bold uppercase tracking-wide transition-all duration-200 flex items-center justify-center gap-2 border ${liquidityMode === 'one-sided' ? 'bg-phantom-cyan text-black border-phantom-cyan shadow-[0_0_10px_rgba(165,243,252,0.3)]' : 'bg-transparent text-slate-500 border-white/10 hover:border-white/20 hover:text-white'}`}>
                            One-Sided
                        </button>
                        <button onClick={() => setLiquidityMode('dual-sided')} className={`py-2.5 md:py-3 px-2 md:px-4 text-[10px] md:text-sm font-bold uppercase tracking-wide transition-all duration-200 flex items-center justify-center gap-2 border ${liquidityMode === 'dual-sided' ? 'bg-phantom-cyan text-black border-phantom-cyan shadow-[0_0_10px_rgba(165,243,252,0.3)]' : 'bg-transparent text-slate-500 border-white/10 hover:border-white/20 hover:text-white'}`}>
                            Dual-Sided
                        </button>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="relative group/input">
                        <div className="flex justify-between items-center mb-2 px-1">
                            <label className="text-sm font-medium text-white/80">{liquidityMode === 'dual-sided' ? 'First Asset' : 'Asset Amount'}</label>
                            <span className="text-xs font-mono text-text-muted">Balance: {balanceA ? parseFloat(balanceA.formatted).toFixed(4) : "0.00"} {tokenA.symbol}</span>
                        </div>
                        <div className="relative flex items-center bg-black border border-white/10 hover:border-white/20 focus-within:border-phantom-cyan transition-all duration-300">
                            <input className="w-full bg-transparent border-none focus:ring-0 text-white font-mono text-xl md:text-3xl font-medium p-4 md:p-5 pr-24 md:pr-32" placeholder="0.00" type="text" value={amount} onChange={(e) => setAmount(e.target.value)} />
                            <div className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2">
                                <button onClick={() => setIsTokenSelectorOpen(true)} className="flex items-center gap-1 md:gap-2 bg-white/5 hover:bg-white/10 text-white pl-1.5 md:pl-2 pr-2 md:pr-3 py-1 md:py-1.5 border border-white/10">
                                    <span className="font-bold text-[10px] md:text-sm font-mono truncate">{tokenA.symbol}</span>
                                    <span className="material-symbols-outlined text-base md:text-lg text-white/50">expand_more</span>
                                </button>
                            </div>
                        </div>
                    </div>


                    {liquidityMode === 'dual-sided' && (
                        <div className="relative group/input animate-fade-in-up">
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10 p-1.5 rounded-full bg-[#1a1229] border border-primary/30">
                                <span className="material-symbols-outlined text-primary text-[18px]">add</span>
                            </div>
                            <div className="flex justify-between items-center mb-2 px-1">
                                <label className="text-sm font-medium text-white/80">Second Asset</label>
                                <span className="text-xs font-mono text-text-muted">Balance: {balanceB ? parseFloat(balanceB.formatted).toFixed(4) : "0.00"} {tokenB.symbol}</span>
                            </div>
                            <div className="relative flex items-center bg-surface-dark border border-purple-500/30 hover:border-purple-500/50 rounded-xl transition-all duration-300">
                                <input className="w-full bg-transparent border-none focus:ring-0 text-white font-mono text-2xl md:text-3xl font-medium p-5 pr-32" placeholder="0.00" type="text" value={amountB} onChange={(e) => setAmountB(e.target.value)} />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <button onClick={() => setIsSecondTokenSelectorOpen(true)} className="flex items-center gap-2 bg-[#2e2249] hover:bg-[#3a2c5b] text-white pl-2 pr-3 py-1.5 rounded-lg border border-white/5 transition-colors shadow-lg">
                                        <span className="font-bold text-sm">{tokenB.symbol}</span>
                                        <span className="material-symbols-outlined text-lg text-white/50">expand_more</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="p-5 rounded-xl bg-white/5 border border-white/5">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2 text-white/90">
                                <span className="material-symbols-outlined text-primary text-[20px]">hourglass_top</span>
                                <span className="text-sm font-medium">Permit Validity</span>
                            </div>
                            <span className="text-primary font-mono font-bold text-sm">{['1 Hour', '24 Hours', '7 Days', '30 Days'][validity]}</span>
                        </div>
                        <input className="w-full z-10 accent-primary" max="3" min="0" step="1" type="range" value={validity} onChange={(e) => setValidity(Number(e.target.value))} />
                    </div>

                    <div className="border-t border-white/10 pt-5 space-y-4">
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center gap-1.5 text-[10px] font-mono text-text-muted hover:text-white transition-colors uppercase tracking-wider group"
                        >
                            <span className={`material-symbols-outlined text-[14px] transition-transform duration-200 ${showAdvanced ? 'rotate-90' : ''}`}>chevron_right</span>
                            Advanced Parameters
                        </button>

                        {showAdvanced && (
                            <div className="space-y-4 pt-2 animate-fade-in">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-mono uppercase text-text-muted ml-0.5">Tick Spacing</label>
                                        <input
                                            type="text"
                                            value={customTickSpacing}
                                            onChange={(e) => setCustomTickSpacing(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 p-2 text-white font-mono text-xs focus:border-phantom-cyan transition-colors"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-mono uppercase text-text-muted ml-0.5">Pool Fee (BPS)</label>
                                        <input
                                            type="text"
                                            value={customFee}
                                            onChange={(e) => setCustomFee(e.target.value)}
                                            className="w-full bg-black/40 border border-white/10 p-2 text-white font-mono text-xs focus:border-phantom-cyan transition-colors"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-mono uppercase text-text-muted ml-0.5">Custom Hook Address</label>
                                    <input
                                        type="text"
                                        value={customHookAddress}
                                        onChange={(e) => setCustomHookAddress(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 p-2 text-white font-mono text-[10px] focus:border-phantom-cyan transition-colors"
                                    />
                                </div>

                                <div className="pt-2">
                                    <label className="text-[10px] font-mono uppercase text-text-muted ml-0.5">Pool ID (Debug)</label>
                                    <div className="mt-1 p-2 bg-black/60 border border-white/5 font-mono text-[9px] text-phantom-cyan break-all leading-tight">
                                        {poolId}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between items-center text-sm pt-1">
                            <span className="text-text-muted">Protocol Fee</span>
                            <span className="font-mono text-white/90">{membership.isMember ? '0% (Member)' : `${currentFee}%`}</span>
                        </div>
                    </div>

                    <div className="mt-8">
                        {!sufficientAllowance ? (
                            <button onClick={handleApprove} disabled={isApprovePending} className="relative w-full h-14 bg-amber-400 hover:bg-amber-300 text-black font-bold uppercase tracking-widest shadow-[4px_4px_0px_#fff4] transition-all">
                                {isApprovePending ? "APPROVING..." : "APPROVE WETH"}
                            </button>
                        ) : (
                            <button onClick={handleSign} disabled={isSignPending} className={`relative w-full h-14 font-bold uppercase tracking-widest transition-all ${!isConnected ? 'bg-white/5 text-white/50' : 'bg-phantom-cyan text-black shadow-[4px_4px_0px_#fff4]'}`}>
                                {isSignPending ? 'SUMMONING...' : (!isConnected ? 'CONNECT WALLET' : 'SUMMON GHOST PERMIT')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
            <TokenSelector isOpen={isTokenSelectorOpen} onClose={() => setIsTokenSelectorOpen(false)} onSelect={(token) => { setTokenA(token); setIsTokenSelectorOpen(false); }} />
            <TokenSelector isOpen={isSecondTokenSelectorOpen} onClose={() => setIsSecondTokenSelectorOpen(false)} onSelect={(token) => { setTokenB(token); setIsSecondTokenSelectorOpen(false); }} />
        </div>
    );
}
