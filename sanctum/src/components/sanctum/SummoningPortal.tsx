"use client";

import { useState } from "react";
import { TokenSelector } from "@/components/sanctum/TokenSelector";
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

    console.log("🔍 APPROVAL DEBUG:", {
        token: tokenA.symbol,
        tokenAddr: tokenA.address,
        wethAddr: WETH_ADDRESS,
        isWETH,
        allowance: currentAllowance.toString(),
        required: requiredAmount.toString(),
        hasEnough: hasEnoughAllowance,
        sufficient: sufficientAllowance,
        userAddress: address
    });

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



    const handleSign = async () => {
        if (!isConnected) return;

        // map validity slider index to minutes
        const validityMap = [60, 1440, 10080, 43200]; // 1h, 24h, 7d, 30d
        const minutes = validityMap[validity] || 10080;

        // Use Native ETH address directly as requested
        const signingTokenA = tokenA.address;
        const signingTokenB = tokenB.address;

        let targetTickSpacing = showAdvanced ? parseInt(customTickSpacing) : 60; // Default
        let targetFee = showAdvanced ? parseInt(customFee) : 100; // Default (0.01%)
        let targetHook = showAdvanced ? customHookAddress : CONTRACTS.unichainSepolia.eidolonHook;

        const WETH_ADDR = TOKEN_MAP["WETH"].address;
        const EIETH_ADDR = TOKEN_MAP["eiETH"].address;

        const isWeth = signingTokenA.toLowerCase() === WETH_ADDR.toLowerCase() || signingTokenB.toLowerCase() === WETH_ADDR.toLowerCase();
        const isEieth = signingTokenA.toLowerCase() === EIETH_ADDR.toLowerCase() || signingTokenB.toLowerCase() === EIETH_ADDR.toLowerCase();

        if (!showAdvanced && isWeth && isEieth) {
            targetTickSpacing = POOLS.canonical.tickSpacing;
            targetFee = POOLS.canonical.fee;
        }

        // Calculate Pool ID properly (V4)
        const poolId = getPoolId(
            signingTokenA as `0x${string}`,
            signingTokenB as `0x${string}`,
            targetFee,
            targetTickSpacing,
            targetHook as `0x${string}`
        );

        console.log("Generated Pool Key ID:", poolId, "Tick:", targetTickSpacing);

        const ZERO_ADDRESS = TOKENS[0].address; // convention
        let permitToken = signingTokenA;
        if (permitToken === ZERO_ADDRESS) permitToken = WETH_ADDRESS;

        try {
            const result = await signPermit(
                permitToken as `0x${string}`,
                amount,
                poolId,
                liquidityMode === 'dual-sided',
                minutes,
                tokenA.decimals
            );

            if (result) {
                console.log("Permit Signed:", result.signature);

                // Save permit to local "Ghost State"
                addPosition({
                    tokenA: tokenA.symbol,
                    tokenB: tokenB.symbol,
                    amountA: amount,
                    amountB: liquidityMode === 'dual-sided' ? amountB : "0",
                    expiry: Number(result.deadline) * 1000, // Use EXACT deadline
                    signature: result.signature,
                    liquidityMode: liquidityMode,
                    nonce: result.nonce.toString(),
                    provider: address!, // Address is confirmed by isConnected common check
                    poolId: poolId,
                    fee: targetFee,
                    tickSpacing: targetTickSpacing,
                    hookAddress: targetHook

                });
                // Fix Vercel build type error (forced update)

                toast.success("Ghost Permit Summoned!", {
                    description: "Your liquidity authority has been signed.",
                });

                // Redirect to Dashboard to see the "Pending" permit
                router.push("/mirror");
            }
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to summon permit");
        }
    };

    return (
        <div className="w-full max-w-[560px] bg-void border border-border-dark/50 p-1 relative overflow-hidden animate-fade-in-up">
            {/* Top decorative glow line */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-phantom-cyan/50 to-transparent"></div>

            <div className="bg-black/40 p-4 md:p-8 relative backdrop-blur-md">
                {/* Header */}
                <div className="mb-8 text-center">
                    <div className="inline-flex items-center justify-center p-3 mb-4 border border-phantom-cyan/20 bg-phantom-cyan/5 shadow-[0_0_20px_-5px_rgba(165,243,252,0.3)]">
                        <div className="relative w-16 h-16">
                            <Image
                                src="/eye_of_god.png"
                                alt="Eye of God"
                                fill
                                className="object-contain filter brightness-110 drop-shadow-[0_0_8px_rgba(165,243,252,0.6)]"
                            />
                        </div>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-display font-bold text-white tracking-widest uppercase mb-2 drop-shadow-md">Summon Ghost Permit</h1>
                    <p className="text-text-muted text-sm font-mono">Authorize zero-TVL liquidity without locking assets.</p>
                </div>

                {/* Error Banner */}
                {signError && (
                    <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-200 text-sm">
                        <span className="material-symbols-outlined text-base">error</span>
                        {signError}
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════════════════════ */}
                {/* LIQUIDITY MODE SELECTION */}
                {/* ═══════════════════════════════════════════════════════════════════════════ */}
                <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-[18px]">layers</span>
                            <span className="text-sm font-medium text-white/90">Liquidity Mode</span>
                            {/* Info Button with Tooltip */}
                            <div className="relative group/info">
                                <button className="p-1 rounded-full hover:bg-white/10 transition-colors">
                                    <span className="material-symbols-outlined text-[16px] text-white/40 group-hover/info:text-primary">info</span>
                                </button>
                                {/* Collapsible Info Tooltip */}
                                <div className="absolute left-0 top-8 z-50 w-72 p-4 rounded-xl bg-[#1a1229] border border-primary/30 shadow-2xl opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all duration-200">
                                    <div className="space-y-3 text-xs">
                                        <div>
                                            <p className="font-bold text-primary mb-1">🔹 One-Sided Liquidity ({fees.singleSided}% Fee)</p>
                                            <p className="text-white/60">Provide just one token. Protocol fee is {fees.singleSided}%.</p>
                                        </div>
                                        <div className="border-t border-white/10 pt-3">
                                            <p className="font-bold text-purple-400 mb-1">🔷 Dual-Sided Liquidity ({fees.dualSided}% Fee)</p>
                                            <p className="text-white/60">Provide both tokens. Lower protocol fee of {fees.dualSided}%.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {membership.isMember && (
                            <span className="text-xs font-bold text-amber-400 border border-amber-400/30 px-2 py-0.5 rounded-full bg-amber-400/10">
                                MEMBER (0% FEE)
                            </span>
                        )}
                    </div>

                    {/* Mode Toggle Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            onClick={() => setLiquidityMode('one-sided')}
                            className={`py-3 px-4 text-sm font-bold uppercase tracking-wide transition-all duration-200 flex items-center justify-center gap-2 border
                                ${liquidityMode === 'one-sided'
                                    ? 'bg-phantom-cyan text-black border-phantom-cyan shadow-[0_0_10px_rgba(165,243,252,0.3)]'
                                    : 'bg-transparent text-slate-500 border-white/10 hover:border-white/20 hover:text-white'}`}
                        >
                            <span className="material-symbols-outlined text-[18px]">radio_button_checked</span>
                            One-Sided
                        </button>
                        <button
                            onClick={() => setLiquidityMode('dual-sided')}
                            className={`py-3 px-4 text-sm font-bold uppercase tracking-wide transition-all duration-200 flex items-center justify-center gap-2 border
                                ${liquidityMode === 'dual-sided'
                                    ? 'bg-phantom-cyan text-black border-phantom-cyan shadow-[0_0_10px_rgba(165,243,252,0.3)]'
                                    : 'bg-transparent text-slate-500 border-white/10 hover:border-white/20 hover:text-white'}`}
                        >
                            <span className="material-symbols-outlined text-[18px]">radio_button_checked</span>
                            Dual-Sided
                        </button>
                    </div>
                </div>

                {/* Asset Input Section */}
                <div className="space-y-6">
                    {/* Token Input Group - Primary Token */}
                    <div className="relative group/input">
                        <div className="flex justify-between items-center mb-2 px-1">
                            <label className="text-sm font-medium text-white/80">
                                {liquidityMode === 'dual-sided' ? 'First Asset' : 'Asset Amount'}
                            </label>

                            {/* Real Balance Display */}
                            <span className="text-xs font-mono text-text-muted">
                                Balance: {balanceA ? parseFloat(balanceA.formatted).toFixed(4) : "0.00"} {tokenA.symbol}
                            </span>
                        </div>
                        <div className="relative flex items-center bg-black border border-white/10 hover:border-white/20 focus-within:border-phantom-cyan focus-within:shadow-[0_0_10px_-2px_rgba(165,243,252,0.3)] transition-all duration-300">
                            {/* Input */}
                            <input
                                className="w-full bg-transparent border-none focus:ring-0 text-white font-mono text-xl md:text-3xl font-medium placeholder-white/20 p-5 pr-24 md:pr-32 caret-phantom-cyan"
                                placeholder="0.00"
                                type="text"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                            {/* Token Selector Pill */}
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <button
                                    onClick={() => setIsTokenSelectorOpen(true)}
                                    className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white pl-2 pr-3 py-1.5 border border-white/10 transition-colors"
                                >
                                    <div className="size-5 md:size-6 rounded-none bg-white/10 flex items-center justify-center overflow-hidden">
                                        <span className="text-[10px] md:text-xs font-bold text-white/80">{tokenA.symbol[0]}</span>
                                    </div>
                                    <span className="font-bold text-xs md:text-sm font-mono">{tokenA.symbol}</span>
                                    <span className="material-symbols-outlined text-lg text-white/50">expand_more</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Second Token Input - Only shown for Dual-Sided */}
                    {liquidityMode === 'dual-sided' && (
                        <div className="relative group/input animate-fade-in-up">
                            {/* Connector Icon */}
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10 p-1.5 rounded-full bg-[#1a1229] border border-primary/30">
                                <span className="material-symbols-outlined text-primary text-[18px]">add</span>
                            </div>

                            <div className="flex justify-between items-center mb-2 px-1">
                                <label className="text-sm font-medium text-white/80">Second Asset</label>
                                {/* Real Balance for Token B */}
                                <span className="text-xs font-mono text-text-muted">
                                    Balance: {balanceB ? parseFloat(balanceB.formatted).toFixed(4) : "0.00"} {tokenB.symbol}
                                </span>
                            </div>
                            <div className="relative flex items-center bg-surface-dark border border-purple-500/30 hover:border-purple-500/50 focus-within:border-purple-500/80 focus-within:shadow-[0_0_15px_-5px_#a855f7] rounded-xl transition-all duration-300">
                                {/* Input */}
                                <input
                                    className="w-full bg-transparent border-none focus:ring-0 text-white font-mono text-2xl md:text-3xl font-medium placeholder-white/20 p-5 pr-32 caret-purple-400"
                                    placeholder="0.00"
                                    type="text"
                                    value={amountB}
                                    onChange={(e) => setAmountB(e.target.value)}
                                />
                                {/* Token Selector Pill */}
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <button
                                        onClick={() => setIsSecondTokenSelectorOpen(true)}
                                        className="flex items-center gap-2 bg-[#2e2249] hover:bg-[#3a2c5b] text-white pl-2 pr-3 py-1.5 rounded-lg border border-white/5 transition-colors shadow-lg"
                                    >
                                        <div className="size-6 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                                            <span className="text-xs font-bold text-green-400">$</span>
                                        </div>
                                        <span className="font-bold text-sm">{tokenB.symbol}</span>
                                        <span className="material-symbols-outlined text-lg text-white/50">expand_more</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Validity Slider */}
                    <div className="p-5 rounded-xl bg-white/5 border border-white/5 mb-6">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2 text-white/90">
                                <span className="material-symbols-outlined text-primary text-[20px]">hourglass_top</span>
                                <span className="text-sm font-medium">Permit Validity</span>
                                {/* Info Tooltip */}
                                <div className="relative group/info">
                                    <span className="material-symbols-outlined text-[14px] text-white/40 group-hover/info:text-primary cursor-help">info</span>
                                    <div className="absolute left-0 top-6 z-50 w-56 p-3 rounded-xl bg-[#1a1229] border border-primary/30 shadow-2xl opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all duration-200">
                                        <p className="font-bold text-primary text-xs mb-1">Permit Validity</p>
                                        <p className="text-white/60 text-xs">How long your Ghost Permit stays active. Longer validity = less signing, but shorter = more control over your liquidity.</p>
                                    </div>
                                </div>
                            </div>
                            <span className="text-primary font-mono font-bold text-sm">
                                {['1 Hour', '24 Hours', '7 Days', '30 Days'][validity]}
                            </span>
                        </div>
                        <div className="relative w-full h-8 flex items-center">
                            <input
                                className="w-full z-10 accent-primary"
                                max="3"
                                min="0"
                                step="1"
                                type="range"
                                value={validity}
                                onChange={(e) => setValidity(Number(e.target.value))}
                            />
                            {/* Visual Track Background */}
                            <div className="absolute w-full flex justify-between px-[10px] pointer-events-none text-[10px] text-white/30 font-mono mt-8">
                                <span>1H</span>
                                <span>24H</span>
                                <span className="text-primary font-bold">7D</span>
                                <span>30D</span>
                            </div>
                        </div>
                    </div>

                    {/* Advanced Settings Toggle */}
                    <div className="pt-2">
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center gap-2 text-xs font-mono text-white/40 hover:text-primary transition-colors mb-4 group/toggle"
                        >
                            <span className={`material-symbols-outlined text-[16px] transition-transform duration-300 ${showAdvanced ? 'rotate-90' : ''}`}>
                                settings
                            </span>
                            <span>{showAdvanced ? "HIDE ADVANCED CONFIG" : "REVEAL ADVANCED CONFIG"}</span>
                        </button>

                        {showAdvanced && (
                            <div className="space-y-4 p-4 mb-4 border border-white/5 bg-white/[0.02] animate-fade-in-up">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-mono text-white/50 mb-1 uppercase tracking-wider">Pool Fee (BPS)</label>
                                        <input
                                            type="text"
                                            value={customFee}
                                            onChange={(e) => setCustomFee(e.target.value)}
                                            className="w-full bg-black border border-white/10 p-2 text-sm font-mono text-white focus:border-phantom-cyan focus:ring-0 outline-none"
                                            placeholder="3000"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-mono text-white/50 mb-1 uppercase tracking-wider">Tick Spacing</label>
                                        <input
                                            type="text"
                                            value={customTickSpacing}
                                            onChange={(e) => setCustomTickSpacing(e.target.value)}
                                            className="w-full bg-black border border-white/10 p-2 text-sm font-mono text-white focus:border-phantom-cyan focus:ring-0 outline-none"
                                            placeholder="200"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-mono text-white/50 mb-1 uppercase tracking-wider">Custom Hook Address</label>
                                    <input
                                        type="text"
                                        value={customHookAddress}
                                        onChange={(e) => setCustomHookAddress(e.target.value)}
                                        className="w-full bg-black border border-white/10 p-2 text-sm font-mono text-white focus:border-phantom-cyan focus:ring-0 outline-none"
                                        placeholder="0x..."
                                    />
                                    <p className="text-[9px] text-white/30 mt-1 font-mono italic">Defaults to primary EIDOLON_HOOK if unchanged.</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Transaction Summary Details */}
                    <div className="border-t border-white/10 pt-5 space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-text-muted">Protocol Fee</span>
                            <div className="flex items-center gap-1 font-mono text-white/90">
                                <span className={`${membership.isMember ? 'line-through text-white/40' : ''}`}>{currentFee}%</span>
                                {membership.isMember && <span className="text-amber-400 font-bold">0% (Member)</span>}
                            </div>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-text-muted">Nonce</span>
                            <span className="font-mono text-white/50">#4921</span>
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="mt-8">
                        {!sufficientAllowance ? (
                            <button
                                onClick={handleApprove}
                                disabled={isApprovePending}
                                className={`relative w-full group overflow-hidden transition-all duration-100 h-14
                                        bg-amber-400 hover:bg-amber-300 text-black font-bold uppercase tracking-widest shadow-[4px_4px_0px_#fff4] hover:translate-[2px]`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    {isApprovePending ? <span className="material-symbols-outlined animate-spin">refresh</span> : <span className="material-symbols-outlined">verified_user</span>}
                                    {isApprovePending ? "APPROVING PERMIT2..." : "APPROVE WETH (PERMIT2)"}
                                </div>
                            </button>
                        ) : (
                            <button
                                onClick={handleSign}
                                disabled={isSignPending}
                                className={`relative w-full group overflow-hidden transition-all duration-100 h-14
                                        ${!isConnected
                                        ? 'bg-white/5 hover:bg-white/10 border border-white/10 text-white/50'
                                        : 'bg-phantom-cyan hover:bg-phantom-cyan/90 text-black shadow-[4px_4px_0px_#fff4] hover:shadow-[2px_2px_0px_#fff4] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[4px] active:translate-y-[4px]'}`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    {isSignPending ? (
                                        <span className="material-symbols-outlined animate-spin">refresh</span>
                                    ) : (
                                        <span className="material-symbols-outlined">
                                            {!isConnected ? 'wallet' : 'fingerprint'}
                                        </span>
                                    )}
                                    <span className="text-base font-bold tracking-widest uppercase">
                                        {isSignPending ? 'SUMMONING...' : (!isConnected ? 'CONNECT WALLET' : 'SUMMON GHOST PERMIT')}
                                    </span>
                                </div>
                            </button>
                        )}
                    </div>

                    {/* DEBUGGER */}
                    <div className="mt-4 p-2 bg-black/50 text-[10px] font-mono text-gray-500 overflow-hidden break-all border border-white/10 rounded">
                        <p>DEBUG INFO:</p>
                        <p>Token: {tokenA.symbol}</p>
                        <p>Address: {tokenA.address}</p>
                        <p>WETH_ADDR: {WETH_ADDRESS}</p>
                        <p>IsWETH: {isWETH ? "TRUE" : "FALSE"}</p>
                        <p>Allowance: {currentAllowance.toString()} / {requiredAmount.toString()}</p>
                        <p>Sufficient: {sufficientAllowance ? "TRUE" : "FALSE"}</p>
                    </div>
                </div>
            </div>

            {/* Bottom decorative glow line */}
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>

            {/* Render Token Selector if open */}
            <TokenSelector
                isOpen={isTokenSelectorOpen}
                onClose={() => setIsTokenSelectorOpen(false)}
                onSelect={(token) => {
                    setTokenA(token);
                    setIsTokenSelectorOpen(false);
                }}
            />
            <TokenSelector
                isOpen={isSecondTokenSelectorOpen}
                onClose={() => setIsSecondTokenSelectorOpen(false)}
                onSelect={(token) => {
                    setTokenB(token);
                    setIsSecondTokenSelectorOpen(false);
                }}
            />
        </div>
    );
}
