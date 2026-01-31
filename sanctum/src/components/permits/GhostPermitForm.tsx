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

// ═══════════════════════════════════════════════════════════════════════════════
// GHOST PERMIT FORM COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface GhostPermitFormProps {
    onPermitSigned?: (permit: SignedGhostPermit) => void;
}

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

export function GhostPermitForm({ onPermitSigned }: GhostPermitFormProps) {
    const { address, isConnected } = useAccount();
    const { chain } = useNetwork();
    const { signTypedDataAsync, isLoading: isPending } = useSignTypedData();

    // Form state
    const [token, setToken] = useState<string>("");
    const [amount, setAmount] = useState<string>("");
    const [poolId, setPoolId] = useState<string>("");
    const [validityMinutes, setValidityMinutes] = useState<number>(30);

    // Result state
    const [signedPermit, setSignedPermit] = useState<SignedGhostPermit | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSign = async () => {
        if (!address || !token || !amount || !poolId) {
            setError("Please fill in all fields");
            return;
        }

        try {
            setError(null);

            // Generate nonce (timestamp-based for demo)
            const nonce = BigInt(Date.now());

            // Calculate deadline
            const deadline = BigInt(
                Math.floor(Date.now() / 1000) + validityMinutes * 60
            );

            // Parse amount (assuming 18 decimals)
            const parsedAmount = parseUnits(amount, 18);

            // Sign using EIP-712
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

    if (!isConnected) {
        return (
            <div className="p-8 rounded-2xl bg-gray-900/50 border border-gray-800 text-center">
                <p className="text-gray-400">Connect your wallet to create Ghost Permits</p>
            </div>
        );
    }

    return (
        <div className="p-8 rounded-2xl bg-gradient-to-br from-gray-900/80 to-violet-900/20 
                    border border-violet-500/20 backdrop-blur-xl">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 
                     bg-clip-text text-transparent mb-6">
                👻 Create Ghost Permit
            </h2>

            <div className="space-y-6">
                {/* Token Address */}
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                        Token Address
                    </label>
                    <input
                        type="text"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        placeholder="0x..."
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700
                       text-white placeholder-gray-500 font-mono text-sm
                       focus:border-violet-500 focus:ring-1 focus:ring-violet-500 
                       transition-all duration-300"
                    />
                </div>

                {/* Amount */}
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                        Amount
                    </label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="100.0"
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700
                       text-white placeholder-gray-500 text-lg
                       focus:border-violet-500 focus:ring-1 focus:ring-violet-500 
                       transition-all duration-300"
                    />
                </div>

                {/* Pool ID */}
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                        Pool ID
                    </label>
                    <input
                        type="text"
                        value={poolId}
                        onChange={(e) => setPoolId(e.target.value)}
                        placeholder="0x..."
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700
                       text-white placeholder-gray-500 font-mono text-sm
                       focus:border-violet-500 focus:ring-1 focus:ring-violet-500 
                       transition-all duration-300"
                    />
                </div>

                {/* Validity Period */}
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                        Valid For (minutes)
                    </label>
                    <select
                        value={validityMinutes}
                        onChange={(e) => setValidityMinutes(Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700
                       text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 
                       transition-all duration-300"
                    >
                        <option value={5}>5 minutes</option>
                        <option value={15}>15 minutes</option>
                        <option value={30}>30 minutes</option>
                        <option value={60}>1 hour</option>
                        <option value={1440}>24 hours</option>
                    </select>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                {/* Sign Button */}
                <button
                    onClick={handleSign}
                    disabled={isPending || !token || !amount || !poolId}
                    className="w-full py-4 rounded-xl font-semibold text-lg
                     bg-gradient-to-r from-violet-600 to-purple-600 
                     hover:from-violet-500 hover:to-purple-500
                     disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed
                     text-white shadow-lg shadow-violet-500/25
                     hover:shadow-violet-500/40 transition-all duration-300"
                >
                    {isPending ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Awaiting Signature...
                        </span>
                    ) : (
                        "Sign Ghost Permit ✨"
                    )}
                </button>

                {/* Success Display */}
                {signedPermit && (
                    <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30 space-y-2">
                        <p className="text-green-400 font-medium">✅ Ghost Permit Signed!</p>
                        <div className="text-xs text-gray-400 font-mono break-all">
                            <p><span className="text-gray-500">Signature:</span> {signedPermit.signature.slice(0, 42)}...</p>
                            <p><span className="text-gray-500">Nonce:</span> {signedPermit.nonce.toString()}</p>
                            <p><span className="text-gray-500">Deadline:</span> {new Date(Number(signedPermit.deadline) * 1000).toLocaleString()}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
