import React, { useState } from 'react';
import { useGhostSession } from '@/hooks/useGhostSession';
import { toast } from 'sonner';
import { Loader2, Ghost, Clock, CheckCircle2 } from 'lucide-react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { TOKENS, CONTRACTS } from '@/config/web3';
import { parseAbi } from 'viem';

// ABI for EidolonHook.activateSession
const HOOK_ABI = parseAbi([
    'function activateSession((((address,uint160,uint48,uint48),address,uint256),bytes) calldata params) external',
    // Note: The function signature in Solidity takes (PermitSingle, bytes).
    // Wagmi/Viem might handle the struct tuple flattening.
    // Correct Signature: activateSession(( (address,uint160,uint48,uint48), address, uint256 ), bytes)
    'function activateSession(((address token, uint160 amount, uint48 expiration, uint48 nonce) details, address spender, uint256 sigDeadline) permit, bytes signature) external'
]);

export function GhostSessionControl() {
    const { activateSession: signSession, isPending: isSigning, sessionExpiry, clearSession } = useGhostSession();
    const { address } = useAccount();
    const [isActivating, setIsActivating] = useState(false);

    const { writeContractAsync } = useWriteContract();

    const handleActivate = async () => {
        if (!address) return;
        setIsActivating(true);

        try {
            // 1. Sign the Permit (Off-chain)
            toast.loading("Signing Session Permit...", { id: "session-toast" });
            const signedData = await signSession(TOKENS.WETH);

            if (!signedData) {
                toast.dismiss("session-toast");
                setIsActivating(false);
                return;
            }

            // 2. Submit Transaction (On-chain)
            // We must call activateSession so the Hook calls PERMIT2.permit() and sets storage.
            // CAUTION: msg.sender must be the signer (User).
            toast.loading("Activating On-Chain Session...", { id: "session-toast" });

            const hash = await writeContractAsync({
                address: CONTRACTS.unichainSepolia.eidolonHook,
                abi: HOOK_ABI,
                functionName: 'activateSession',
                args: [
                    // PermitSingle struct
                    {
                        details: {
                            token: signedData.permit.details.token,
                            amount: signedData.permit.details.amount,
                            expiration: signedData.permit.details.expiration,
                            nonce: signedData.permit.details.nonce,
                        },
                        spender: signedData.permit.spender,
                        sigDeadline: signedData.permit.sigDeadline,
                    },
                    // Signature
                    signedData.signature
                ]
            });

            toast.loading("Waiting for Confirmation...", { id: "session-toast" });

            // 3. Notify Backend (Fire & Forget, but ensures Redis is synced)
            // The backend mostly uses this for "sensing" intention, though it can also read on-chain events.
            await fetch('/api/receptionist/session/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(signedData)
            });

            toast.success("Session Activated Successfully!", {
                id: "session-toast",
                description: `Ghost Liquidity enabled for 24 hours. Tx: ${hash.slice(0, 6)}...`
            });

        } catch (e: any) {
            console.error(e);
            toast.error("Activation Failed", {
                id: "session-toast",
                description: e.message || "Failed to activate session."
            });
        } finally {
            setIsActivating(false);
        }
    };

    const isPending = isSigning || isActivating;

    const timeLeft = sessionExpiry ? Math.max(0, sessionExpiry - Math.floor(Date.now() / 1000)) : 0;
    const hours = Math.floor(timeLeft / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);

    return (
        <div className="w-full bg-slate-900/50 border border-slate-800/50 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-slate-800/50 flex items-center gap-2">
                <Ghost className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-display tracking-wider text-slate-100 uppercase">Ghost Session</h3>
            </div>
            <div className="p-4">
                {timeLeft > 0 ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-emerald-400 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
                            <Clock className="w-4 h-4 animate-pulse" />
                            <span className="font-mono text-xs">
                                EXPIRES IN: <span className="font-bold text-white">{hours}H {minutes}M</span>
                            </span>
                        </div>
                        <button
                            className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-lg text-xs font-mono transition-colors uppercase tracking-widest"
                            onClick={clearSession}
                        >
                            Deactivate Session
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Enable <span className="text-purple-400 font-bold">Ghost Liquidity</span> to trade with 0 gas fees and instant execution via MEV-protected intents.
                        </p>
                        <button
                            onClick={handleActivate}
                            disabled={isPending || !address}
                            className={`w-full py-3 rounded-xl font-bold font-display tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-2
                                ${isPending || !address
                                    ? "bg-white/5 text-white/20 cursor-not-allowed"
                                    : "bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_-5px_rgba(147,51,234,0.5)]"
                                }`
                            }
                        >
                            {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                            {isPending ? "ACTIVATING..." : "START 24H SESSION"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
