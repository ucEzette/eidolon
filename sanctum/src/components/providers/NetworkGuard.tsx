"use client";

import { useEffect, useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { unichainSepolia } from "@/config/web3";

export function NetworkGuard({ children }: { children: React.ReactNode }) {
    const { chain, isConnected } = useAccount();
    const { switchChain, isPending, error: switchError } = useSwitchChain();
    const [isWrongNetwork, setIsWrongNetwork] = useState(false);

    useEffect(() => {
        if (isConnected && chain && chain.id !== unichainSepolia.id) {
            setIsWrongNetwork(true);
            // Attempt auto-switch once on detection
            // We catch the error here to prevent unhandled promise rejections, 
            // but the main error handling is in the manual button for better UX
            switchChain({ chainId: unichainSepolia.id });
        } else {
            setIsWrongNetwork(false);
        }
    }, [isConnected, chain, switchChain]);

    const handleSwitch = async () => {
        try {
            switchChain({ chainId: unichainSepolia.id });
        } catch (error: any) {
            console.error("Switch failed, attempting to add chain...", error);
            // Fallback: If switch fails, try to add the chain manually (standard EIP-3085)
            // This catches cases where wagmi's auto-add might fail or not trigger
            if (typeof window !== 'undefined' && (window as any).ethereum) {
                try {
                    await (window as any).ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: `0x${unichainSepolia.id.toString(16)}`,
                            chainName: unichainSepolia.name,
                            nativeCurrency: unichainSepolia.nativeCurrency,
                            rpcUrls: unichainSepolia.rpcUrls.default.http,
                            blockExplorerUrls: [unichainSepolia.blockExplorers?.default.url],
                        }],
                    });
                } catch (addError) {
                    console.error("Failed to add network manually:", addError);
                }
            }
        }
    };

    // Manual fallback function for the "Add Network" link
    const handleManualAdd = async () => {
        if (typeof window !== 'undefined' && (window as any).ethereum) {
            try {
                await (window as any).ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: `0x${unichainSepolia.id.toString(16)}`,
                        chainName: unichainSepolia.name,
                        nativeCurrency: unichainSepolia.nativeCurrency,
                        rpcUrls: unichainSepolia.rpcUrls.default.http,
                        blockExplorerUrls: [unichainSepolia.blockExplorers?.default.url],
                    }],
                });
            } catch (error) {
                console.error("Manual add failed:", error);
            }
        }
    };

    if (isWrongNetwork) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
                <div className="max-w-md w-full mx-4 p-8 rounded-2xl border border-red-500/30 bg-[#0a0a0f] shadow-[0_0_50px_-10px_rgba(239,68,68,0.3)] text-center relative overflow-hidden">
                    {/* Decorative Elements */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>
                    <div className="absolute -right-10 -top-10 h-32 w-32 bg-red-500/10 blur-3xl"></div>

                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                            <span className="material-symbols-outlined text-3xl text-red-500">wifi_off</span>
                        </div>

                        <h2 className="text-2xl font-bold text-white mb-2 font-display">Wrong Network</h2>
                        <p className="text-slate-400 mb-6 text-sm leading-relaxed">
                            You are connected to <span className="text-white font-mono">{chain?.name || "Unknown Network"}</span>.
                            <br />
                            Eidolon requires <span className="text-phantom-cyan font-bold">Unichain Sepolia</span>.
                        </p>

                        {switchError && (
                            <div className="text-red-400 text-xs mb-4 font-mono bg-red-950/30 p-2 rounded text-left w-full overflow-hidden">
                                <span className="font-bold block mb-1">Error Details:</span>
                                {switchError.message.slice(0, 100)}...
                            </div>
                        )}

                        <div className="w-full space-y-3">
                            <button
                                onClick={handleSwitch}
                                disabled={isPending}
                                className="w-full py-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold tracking-wide transition-all shadow-neon-danger flex items-center justify-center gap-2 group"
                            >
                                {isPending ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        Switching...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined group-hover:rotate-180 transition-transform duration-500">sync</span>
                                        Switch Network
                                    </>
                                )}
                            </button>

                            <button
                                onClick={handleManualAdd}
                                className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-mono transition-colors underline decoration-slate-600 hover:decoration-white underline-offset-4"
                            >
                                Not seeing the prompt? Click to Add Network
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
