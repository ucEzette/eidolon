"use client";

import Link from "next/link";

export function ErrorState() {
    return (
        <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-background-light dark:bg-background-dark font-display antialiased">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-noise opacity-30 pointer-events-none"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent opacity-20 pointer-events-none"></div>
            <div className="scanline absolute w-full h-[1px] bg-red-500/30 z-10 animate-[scanline_6s_linear_infinite] opacity-30"></div>

            {/* Random Glitch Lines Background */}
            <div className="absolute top-1/4 left-0 w-full h-[1px] bg-primary/20 blur-[1px]"></div>
            <div className="absolute bottom-1/3 left-0 w-full h-[2px] bg-cyan-500/10 blur-[2px]"></div>

            {/* Main Content Area */}
            <main className="relative flex-1 flex items-center justify-center p-4">
                {/* Central Glass Card */}
                <div className="glass-panel border-glitch rounded-xl p-8 md:p-12 max-w-lg w-full relative overflow-hidden flex flex-col items-center text-center z-10 mx-auto transform transition-all hover:scale-[1.01] duration-500 bg-[rgba(26,11,11,0.6)] border border-red-500/20 shadow-[0_0_30px_rgba(242,13,13,0.1)]">
                    {/* Fragmented Icon Area */}
                    <div className="relative w-24 h-24 mb-8 flex items-center justify-center">
                        {/* Main X */}
                        <span className="material-symbols-outlined text-[80px] text-primary absolute z-10 drop-shadow-[0_0_20px_rgba(242,13,13,0.6)]">close</span>
                        {/* Glitch Clones */}
                        <span className="material-symbols-outlined text-[80px] text-cyan-400 absolute opacity-40 animate-pulse" style={{ left: "52%", top: "48%", clipPath: "polygon(0 0, 100% 0, 100% 30%, 0 30%)" }}>close</span>
                        <span className="material-symbols-outlined text-[80px] text-primary absolute opacity-40 animate-bounce" style={{ left: "48%", top: "52%", clipPath: "polygon(0 70%, 100% 70%, 100% 100%, 0 100%)" }}>close</span>

                        {/* Geometric Shards */}
                        <div className="absolute w-12 h-1 bg-primary rotate-45 top-0 right-0 shadow-[0_0_15px_#f20d0d]"></div>
                        <div className="absolute w-8 h-0.5 bg-primary -rotate-12 bottom-0 left-0 shadow-[0_0_10px_#f20d0d]"></div>
                    </div>

                    {/* Glitch Headline */}
                    <h2 className="glitch-text text-3xl md:text-4xl font-bold text-white mb-2 tracking-wide relative after:content-[attr(data-text)] before:content-[attr(data-text)]" data-text="SYNCHRONIZATION BREACH">
                        SYNCHRONIZATION BREACH
                    </h2>

                    {/* Subtext */}
                    <p className="text-gray-400 text-base md:text-lg mb-8 max-w-md leading-relaxed">
                        The protocol connection was severed. Liquidity state invalid.
                    </p>

                    {/* Technical Error Log */}
                    <div className="w-full bg-black/40 border border-white/10 rounded p-4 mb-8 text-left font-mono text-xs md:text-sm relative overflow-hidden group">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/50"></div>
                        <div className="text-primary/80 mb-1 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[14px]">warning</span>
                            <span>SYSTEM_ALERT_LEVEL_5</span>
                        </div>
                        <p className="text-white/70">
                            <span className="text-gray-500">&gt;&gt;</span> INIT_ROLLBACK_SEQUENCE<br />
                            <span className="text-gray-500">&gt;&gt;</span> DETECTING_ANOMALY...<br />
                            <span className="text-primary font-bold animate-pulse">&gt;&gt; Error 0x402: Gas limit exceeded</span><span className="blink-cursor w-2 h-4 bg-primary inline-block align-middle ml-1 animate-[blink_1s_step-end_infinite]"></span>
                        </p>
                        {/* Subtle scanline in terminal */}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent opacity-10 pointer-events-none translate-y-[-100%] animate-[scanline_3s_linear_infinite]"></div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                        {/* Primary Button */}
                        <button onClick={() => window.location.reload()} className="relative group overflow-hidden bg-primary/10 border border-primary hover:bg-primary hover:text-white text-primary transition-all duration-300 rounded px-8 py-3 font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(242,13,13,0.3)] hover:shadow-[0_0_25px_rgba(242,13,13,0.6)]">
                            <span className="material-symbols-outlined text-lg group-hover:rotate-180 transition-transform duration-500">refresh</span>
                            Attempt Re-Summon
                            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"></div>
                        </button>

                        {/* Secondary Button */}
                        <Link href="/" className="text-gray-500 hover:text-white transition-colors px-6 py-3 font-medium text-sm flex items-center justify-center gap-2 hover:bg-white/5 rounded border border-transparent hover:border-white/10">
                            <span className="material-symbols-outlined text-lg">close</span>
                            Dismiss
                        </Link>
                    </div>

                    {/* Decorative corner markers */}
                    <div className="absolute top-2 left-2 w-2 h-2 border-l border-t border-primary/40"></div>
                    <div className="absolute top-2 right-2 w-2 h-2 border-r border-t border-primary/40"></div>
                    <div className="absolute bottom-2 left-2 w-2 h-2 border-l border-b border-primary/40"></div>
                    <div className="absolute bottom-2 right-2 w-2 h-2 border-r border-b border-primary/40"></div>
                </div>
            </main>
        </div>
    );
}
