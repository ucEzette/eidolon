import React from 'react';
import { useGhostSession } from '@/hooks/useGhostSession';
import { toast } from 'sonner';
import { Loader2, Ghost, Clock } from 'lucide-react';
import { useAccount } from 'wagmi';
import { TOKENS } from '@/config/web3';

export function GhostSessionControl() {
    const { activateSession, isPending, sessionExpiry, clearSession } = useGhostSession();
    const { address } = useAccount();

    const handleActivate = async () => {
        try {
            // Activate for WETH (Main trading token)
            const result = await activateSession(TOKENS.WETH);
            if (!result) return;

            // Call Receptionist API
            await fetch('/api/receptionist/session/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(result)
            });

            toast.success("Session Activated", {
                description: `Ghost Liquidity enabled for 24 hours.`
            });

        } catch (e: any) {
            toast.error("Session Activation Failed", { description: e.message });
        }
    };

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
                            {isPending ? "SIGNING..." : "START 24H SESSION"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
