"use client";

import { useState } from "react";
import { TokenSelector } from "@/components/sanctum/TokenSelector";
import { useGhostPermit } from "@/hooks/useGhostPermit";
import { useEidolonHook } from "@/hooks/useEidolonHook";
import { useAccount } from "wagmi";

type LiquidityMode = 'one-sided' | 'dual-sided';

export function SummoningPortal() {
    const [isTokenSelectorOpen, setIsTokenSelectorOpen] = useState(false);
    const [isSecondTokenSelectorOpen, setIsSecondTokenSelectorOpen] = useState(false);
    const [liquidityMode, setLiquidityMode] = useState<LiquidityMode>('one-sided');
    const [amount, setAmount] = useState<string>("5.0");
    const [validity, setValidity] = useState<number>(3); // Index 0-3

    // Hooks
    const { signPermit, isPending, error: signError } = useGhostPermit();
    const { fees, membership } = useEidolonHook();
    const { address, isConnected } = useAccount();

    const currentFee = liquidityMode === 'dual-sided'
        ? (membership.isMember ? 0 : fees.dualSided)
        : (membership.isMember ? 0 : fees.singleSided);

    const handleSign = async () => {
        if (!isConnected) {
            // Logic to open connect modal usually handled by RainbowKit/WalletConnect button
            // utilizing ConnectButton or similar triggers
            return;
        }

        // map validity slider index to minutes
        const validityMap = [60, 1440, 10080, 43200]; // 1h, 24h, 7d, 30d
        const minutes = validityMap[validity] || 10080;

        // Dummy pool ID for demo (ETH/USDC)
        const poolId = "0x0000000000000000000000000000000000000000000000000000000000000000";
        const tokenAddress = "0x0000000000000000000000000000000000000000"; // ETH mock

        const result = await signPermit(
            tokenAddress,
            amount,
            poolId,
            liquidityMode === 'dual-sided',
            minutes
        );

        if (result) {
            console.log("Permit Signed:", result);
            // Handle success (e.g. show toast, redirect to dashboard)
        }
    };

    return (
        <div className="w-full max-w-[560px] glass-card rounded-2xl p-1 shadow-2xl shadow-primary/10 relative overflow-hidden animate-fade-in-up bg-[#161023]/60 backdrop-blur-xl border border-[#895af6]/15">
            {/* Top decorative glow line */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>

            <div className="bg-background-dark/40 rounded-xl p-8 backdrop-blur-sm relative">
                {/* Header */}
                <div className="mb-8 text-center">
                    <div className="inline-flex items-center justify-center p-3 mb-4 rounded-full bg-primary/10 border border-primary/20 shadow-[0_0_15px_-3px_rgba(137,90,246,0.3)]">
                        <span className="material-symbols-outlined text-primary text-2xl">pentagon</span>
                    </div>
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/70 tracking-tight mb-2">Summon Ghost Permit</h1>
                    <p className="text-text-muted text-sm">Authorize zero-TVL liquidity without locking assets.</p>
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
                            className={`py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2
                                ${liquidityMode === 'one-sided'
                                    ? 'bg-primary text-white shadow-[0_0_15px_-5px_#895af6]'
                                    : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'}`}
                        >
                            <span className="material-symbols-outlined text-[18px]">radio_button_checked</span>
                            One-Sided ({fees.singleSided}%)
                        </button>
                        <button
                            onClick={() => setLiquidityMode('dual-sided')}
                            className={`py-3 px-4 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2
                                ${liquidityMode === 'dual-sided'
                                    ? 'bg-gradient-to-r from-primary to-purple-500 text-white shadow-[0_0_15px_-5px_#895af6]'
                                    : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'}`}
                        >
                            <span className="material-symbols-outlined text-[18px]">radio_button_checked</span>
                            Dual-Sided ({fees.dualSided}%)
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
                            <span className="text-xs font-mono text-text-muted">Balance: 142.5 ETH</span>
                        </div>
                        <div className="relative flex items-center bg-surface-dark border border-border-dark hover:border-primary/40 focus-within:border-primary/80 focus-within:shadow-[0_0_15px_-5px_#895af6] rounded-xl transition-all duration-300">
                            {/* Input */}
                            <input
                                className="w-full bg-transparent border-none focus:ring-0 text-white font-mono text-3xl font-medium placeholder-white/20 p-5 pr-32 caret-primary"
                                placeholder="0.00"
                                type="text"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                            {/* Token Selector Pill */}
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <button
                                    onClick={() => setIsTokenSelectorOpen(true)}
                                    className="flex items-center gap-2 bg-[#2e2249] hover:bg-[#3a2c5b] text-white pl-2 pr-3 py-1.5 rounded-lg border border-white/5 transition-colors shadow-lg"
                                >
                                    <div className="size-6 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                                        <img alt="Ethereum logo" className="w-4 h-4" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCwND7wf2eTPp9JWfuDxhsMogxcpN-WI4C7CVmUkEIzesRJiwQLsOkTk6iDEK07NKRtEW9Qhx7EtR59x0BcyFsxwoXja9s0anHvC5EBn9s0yIaILG-5_EY-q5BOisYirItOYAmAR4J73ZmvpGxJRLnc9GWmarPt7Td0qPeIkaWGaRHEiZqwTlVjxOYjZzDO_PMBR12zUUkvyBLc4FpoIzMjBWTHpXcWrKWWMxymMQNgIOSEMSyf6fc36rp9ImnGcgetDkicnpKLeu0" />
                                    </div>
                                    <span className="font-bold text-sm">ETH</span>
                                    <span className="material-symbols-outlined text-lg text-white/50">expand_more</span>
                                </button>
                            </div>
                        </div>
                        {/* USD Value */}
                        {/* <div className="mt-2 px-1 flex justify-end">
                            <p className="text-text-muted text-xs font-mono">≈ $12,482.35 USD</p>
                        </div> */}
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
                                <span className="text-xs font-mono text-text-muted">Balance: 10,500 USDC</span>
                            </div>
                            <div className="relative flex items-center bg-surface-dark border border-purple-500/30 hover:border-purple-500/50 focus-within:border-purple-500/80 focus-within:shadow-[0_0_15px_-5px_#a855f7] rounded-xl transition-all duration-300">
                                {/* Input */}
                                <input
                                    className="w-full bg-transparent border-none focus:ring-0 text-white font-mono text-3xl font-medium placeholder-white/20 p-5 pr-32 caret-purple-400"
                                    placeholder="0.00"
                                    type="text"
                                    defaultValue="12,500"
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
                                        <span className="font-bold text-sm">USDC</span>
                                        <span className="material-symbols-outlined text-lg text-white/50">expand_more</span>
                                    </button>
                                </div>
                            </div>
                            {/* USD Value */}
                            {/* <div className="mt-2 px-1 flex justify-end">
                                <p className="text-text-muted text-xs font-mono">≈ $12,500.00 USD</p>
                            </div> */}
                        </div>
                    )}

                    {/* Validity Slider */}
                    <div className="p-5 rounded-xl bg-white/5 border border-white/5">
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
                    <button
                        onClick={handleSign}
                        disabled={isPending}
                        className={`relative w-full group overflow-hidden rounded-xl transition-all duration-300 h-14 shadow-neon shadow-primary/20
                            ${!isConnected ? 'bg-white/10 hover:bg-white/20' : 'bg-primary hover:bg-[#7c4df0]'}`}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
                        <div className="flex items-center justify-center gap-2">
                            {isPending ? (
                                <span className="material-symbols-outlined text-white animate-spin">refresh</span>
                            ) : (
                                <span className="material-symbols-outlined text-white animate-pulse">
                                    {!isConnected ? 'wallet' : 'fingerprint'}
                                </span>
                            )}
                            <span className="text-white text-base font-bold tracking-wide">
                                {isPending ? 'SIGNING...' : (!isConnected ? 'CONNECT WALLET' : 'SIGN GHOST PERMIT')}
                            </span>
                        </div>
                    </button>
                </div>
            </div>

            {/* Bottom decorative glow line */}
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>

            {/* Render Token Selector if open */}
            {isTokenSelectorOpen && <TokenSelector onClose={() => setIsTokenSelectorOpen(false)} />}
            {isSecondTokenSelectorOpen && <TokenSelector onClose={() => setIsSecondTokenSelectorOpen(false)} />}
        </div>
    );
}
