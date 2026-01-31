"use client";

import { useState } from "react";
import { useAccount, useSignTypedData, useNetwork } from "wagmi";
import { parseUnits, type Address } from "viem";
import { baseSepolia } from "wagmi/chains";
import { CONTRACTS, PERMIT2_DOMAIN } from "@/config/web3";

// ═══════════════════════════════════════════════════════════════════════════════
// EIP-712 TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

const PERMIT_WITNESS_TRANSFER_FROM_TYPES = {
    PermitWitnessTransferFrom: [
        { name: "permitted", type: "TokenPermissions" },
        { name: "spender", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
        { name: "witness", type: "EidolonWitness" },
    ],
    TokenPermissions: [
        { name: "token", type: "address" },
        { name: "amount", type: "uint256" },
    ],
    EidolonWitness: [
        { name: "poolId", type: "bytes32" },
        { name: "hook", type: "address" },
    ],
} as const;

export interface SignedGhostPermit {
    token: Address;
    amount: bigint;
    nonce: bigint;
    deadline: bigint;
    poolId: `0x${string}`;
    hook: Address;
    signature: `0x${string}`;
    provider: Address;
}

interface SummoningPortalProps {
    onPermitSigned?: (permit: SignedGhostPermit) => void;
}

export function SummoningPortal({ onPermitSigned }: SummoningPortalProps) {
    const { address, isConnected } = useAccount();
    const { chain } = useNetwork();
    const { signTypedDataAsync, isLoading: isPending } = useSignTypedData();

    // Form state
    // Defaulting to WETH on Base Sepolia for demo
    const [token] = useState<string>("0x4200000000000000000000000000000000000006");
    const [amount, setAmount] = useState<string>("5.0");
    const [validityDays, setValidityDays] = useState<number>(3);

    // Hardcoded for demo UI parity with Stitch design
    const poolId = "0x0000000000000000000000000000000000000000000000000000000000000000";

    // Result state
    const [signedPermit, setSignedPermit] = useState<SignedGhostPermit | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSign = async () => {
        if (!address || !amount) {
            setError("Please connect wallet and enter amount");
            return;
        }

        try {
            setError(null);
            const nonce = BigInt(Date.now());
            const deadline = BigInt(Math.floor(Date.now() / 1000) + validityDays * 24 * 60 * 60);
            const parsedAmount = parseUnits(amount, 18);

            const signature = await signTypedDataAsync({
                domain: {
                    name: PERMIT2_DOMAIN.name,
                    chainId: chain?.id || baseSepolia.id,
                    verifyingContract: PERMIT2_DOMAIN.verifyingContract,
                },
                types: PERMIT_WITNESS_TRANSFER_FROM_TYPES,
                primaryType: "PermitWitnessTransferFrom",
                message: {
                    permitted: {
                        token: token as Address,
                        amount: parsedAmount,
                    },
                    spender: CONTRACTS.baseSepolia.eidolonHook,
                    nonce,
                    deadline,
                    witness: {
                        poolId: poolId as `0x${string}`,
                        hook: CONTRACTS.baseSepolia.eidolonHook,
                    },
                },
            });

            const permit: SignedGhostPermit = {
                token: token as Address,
                amount: parsedAmount,
                nonce,
                deadline,
                poolId: poolId as `0x${string}`,
                hook: CONTRACTS.baseSepolia.eidolonHook,
                signature: signature as `0x${string}`,
                provider: address,
            };

            setSignedPermit(permit);
            onPermitSigned?.(permit);
        } catch (err) {
            console.error("Signing failed:", err);
            setError(err instanceof Error ? err.message : "Signing failed");
        }
    };

    return (
        <div className="w-full max-w-[560px] glass-card rounded-2xl p-1 shadow-2xl shadow-primary/10 relative overflow-hidden animate-fade-in-up mx-auto">
            {/* Top decorative glow line */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>

            <div className="bg-background-dark/40 rounded-xl p-8 backdrop-blur-sm relative">
                {/* Header */}
                <div className="mb-8 text-center">
                    <div className="inline-flex items-center justify-center p-3 mb-4 rounded-full bg-primary/10 border border-primary/20 shadow-[0_0_15px_-3px_rgba(137,90,246,0.3)]">
                        <span className="material-symbols-outlined text-primary text-2xl">pentagon</span>
                    </div>
                    <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/70 tracking-tight mb-2">
                        Summon Ghost Permit
                    </h1>
                    <p className="text-text-muted text-sm">Authorize zero-TVL liquidity without locking assets.</p>
                </div>

                {/* Asset Input Section */}
                <div className="space-y-6">
                    {/* Token Input Group */}
                    <div className="relative group/input">
                        <div className="flex justify-between items-center mb-2 px-1">
                            <label className="text-sm font-medium text-white/80">Asset Amount</label>
                            <span className="text-xs font-mono text-text-muted">Balance: 142.5 ETH</span>
                        </div>

                        <div className={`relative flex items-center bg-surface-dark border ${error ? 'border-red-500/50' : 'border-border-dark'} hover:border-primary/40 focus-within:border-primary/80 focus-within:shadow-[0_0_15px_-5px_#895af6] rounded-xl transition-all duration-300`}>
                            <input
                                className="w-full bg-transparent border-none focus:ring-0 text-white font-mono text-3xl font-medium placeholder-white/20 p-5 pr-32 caret-primary outline-none"
                                placeholder="0.00"
                                type="text"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />

                            {/* Token Selector Pill */}
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <button className="flex items-center gap-2 bg-[#2e2249] hover:bg-[#3a2c5b] text-white pl-2 pr-3 py-1.5 rounded-lg border border-white/5 transition-colors shadow-lg">
                                    <div className="size-6 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
                                        {/* Placeholder Logic for Icon */}
                                        <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                                    </div>
                                    <span className="font-bold text-sm">ETH</span>
                                    <span className="material-symbols-outlined text-lg text-white/50">expand_more</span>
                                </button>
                            </div>
                        </div>

                        {/* USD Value */}
                        <div className="mt-2 px-1 flex justify-end">
                            <p className="text-text-muted text-xs font-mono">≈ ${(parseFloat(amount || "0") * 2496.47).toFixed(2)} USD</p>
                        </div>
                    </div>

                    {/* Validity Slider */}
                    <div className="p-5 rounded-xl bg-white/5 border border-white/5">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2 text-white/90">
                                <span className="material-symbols-outlined text-primary text-[20px]">hourglass_top</span>
                                <span className="text-sm font-medium">Permit Validity</span>
                            </div>
                            <span className="text-primary font-mono font-bold text-sm">{validityDays} Days</span>
                        </div>

                        <div className="relative w-full h-8 flex items-center">
                            <input
                                className="w-full z-10 accent-primary cursor-pointer"
                                max="30"
                                min="1"
                                step="1"
                                type="range"
                                value={validityDays}
                                onChange={(e) => setValidityDays(parseInt(e.target.value))}
                            />
                            {/* Visual Track Labels */}
                            <div className="absolute w-full flex justify-between px-[2px] pointer-events-none text-[10px] text-white/30 font-mono mt-8">
                                <span>1D</span>
                                <span>30D</span>
                            </div>
                        </div>
                    </div>

                    {/* Transaction Summary Details */}
                    <div className="border-t border-white/10 pt-5 space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-text-muted">Network Fee</span>
                            <div className="flex items-center gap-1 font-mono text-white/90">
                                <span className="material-symbols-outlined text-xs">local_gas_station</span>
                                <span>$0.00</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-text-muted">Nonce</span>
                            <span className="font-mono text-white/50">#{(Date.now() % 1000).toString().padStart(3, '0')}</span>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm text-center">
                            {error}
                        </div>
                    )}

                    {/* Success Message */}
                    {signedPermit && (
                        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-300 text-sm text-center break-all">
                            Signature: {signedPermit.signature.slice(0, 20)}...
                        </div>
                    )}

                    {/* Action Button */}
                    {!isConnected ? (
                        <button disabled className="relative w-full h-14 rounded-xl bg-gray-700 text-white/50 font-bold cursor-not-allowed">
                            Connect Wallet Required
                        </button>
                    ) : (
                        <button
                            onClick={handleSign}
                            disabled={isPending}
                            className="relative w-full group overflow-hidden rounded-xl bg-primary hover:bg-[#7c4df0] transition-all duration-300 h-14 shadow-neon shadow-primary/20 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
                            <div className="flex items-center justify-center gap-2">
                                {isPending ? (
                                    <span className="material-symbols-outlined text-white animate-spin">refresh</span>
                                ) : (
                                    <span className="material-symbols-outlined text-white animate-pulse">fingerprint</span>
                                )}
                                <span className="text-white text-base font-bold tracking-wide">
                                    {isPending ? "SIGNING..." : "SIGN GHOST PERMIT"}
                                </span>
                            </div>
                        </button>
                    )}
                </div>
            </div>

            {/* Bottom decorative glow line */}
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
        </div>
    );
}
