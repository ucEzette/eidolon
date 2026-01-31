"use client";

export function PendingState() {
    return (
        <div className="relative flex h-screen w-full flex-col group/design-root bg-background-dark text-white font-display overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none aurora-bg z-0 animate-pulse bg-[radial-gradient(circle_at_50%_50%,rgba(116,61,245,0.15)_0%,rgba(5,3,10,0)_60%)]"></div>
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-secondary/5 blur-[120px] rounded-full pointer-events-none"></div>

            {/* Main Content */}
            <main className="relative z-10 flex flex-1 flex-col items-center justify-center w-full px-4 overflow-hidden">
                {/* Quantum Loader Animation Wrapper */}
                <div className="relative w-[300px] h-[300px] md:w-[400px] md:h-[400px] flex items-center justify-center perspective-[1000px] mb-8 md:mb-12">
                    {/* Core Glow */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full blur-[8px] animate-[breathe_3s_ease-in-out_infinite] shadow-[0_0_60px_rgba(116,61,245,0.6)] bg-[radial-gradient(circle,rgba(0,243,255,0.8)_0%,rgba(116,61,245,0.4)_40%,transparent_70%)]"></div>
                    </div>
                    {/* Swirling Particles Simulation (Inner) */}
                    <div className="absolute w-28 h-28 md:w-40 md:h-40 rounded-full border border-secondary/20 animate-[spin_8s_linear_infinite]">
                        <div className="absolute top-0 left-1/2 w-1 h-1 bg-secondary rounded-full shadow-[0_0_10px_#00f3ff]"></div>
                        <div className="absolute bottom-0 left-1/2 w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_10px_#743df5]"></div>
                    </div>
                    {/* Swirling Particles Simulation (Outer) */}
                    <div className="absolute w-36 h-36 md:w-52 md:h-52 rounded-full border border-primary/10 animate-[spin_12s_linear_infinite_reverse]">
                        <div className="absolute top-1/2 right-0 w-2 h-2 bg-primary rounded-full blur-[1px]"></div>
                        <div className="absolute top-1/2 left-0 w-1 h-1 bg-white rounded-full blur-[1px]"></div>
                    </div>
                    {/* Orbital Ring 1 (X-Axis) */}
                    <div className="absolute w-48 h-48 md:w-64 md:h-64 rounded-full border-[1px] border-secondary/40 shadow-[0_0_15px_rgba(0,243,255,0.2)] animate-[orbit1_4s_linear_infinite]"></div>
                    {/* Orbital Ring 2 (Y-Axis) */}
                    <div className="absolute w-56 h-56 md:w-72 md:h-72 rounded-full border-[1px] border-primary/40 shadow-[0_0_15px_rgba(116,61,245,0.2)] animate-[orbit2_5s_linear_infinite]"></div>
                    {/* Orbital Ring 3 (Diagonal) */}
                    <div className="absolute w-64 h-64 md:w-80 md:h-80 rounded-full border-[1px] border-white/10 animate-[orbit3_6s_linear_infinite]">
                        <div className="absolute top-0 left-1/2 w-2 h-2 bg-white rounded-full shadow-[0_0_10px_white]"></div>
                    </div>
                </div>

                {/* Status Card */}
                <div className="glass-panel bg-[rgba(22,16,35,0.4)] backdrop-blur-xl border border-white/5 shadow-[0_0_40px_rgba(116,61,245,0.1)] rounded-2xl p-6 md:p-8 flex flex-col items-center max-w-lg w-full animate-[float_6s_ease-in-out_infinite]">
                    <h1 className="text-2xl md:text-3xl font-bold text-center text-white mb-3 tracking-tight">
                        Synchronizing with the Sanctum...
                    </h1>
                    <div className="flex items-center gap-2 mb-6 bg-surface-dark/50 px-4 py-1.5 rounded-full border border-white/5">
                        <div className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-secondary"></span>
                        </div>
                        <p className="text-secondary/90 text-sm font-medium tracking-wide uppercase">Awaiting Block Confirmation</p>
                    </div>

                    {/* Transaction Hash (ListItem Style) */}
                    <div className="w-full bg-[#0a0510]/80 rounded-xl border border-white/5 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 gap-3">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="flex items-center justify-center shrink-0 size-8 rounded-lg bg-primary/20 text-primary">
                                    <span className="material-symbols-outlined text-[18px]">link</span>
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[10px] uppercase text-white/40 font-bold tracking-wider mb-0.5">Transaction ID</span>
                                    <p className="text-white/90 text-sm font-mono truncate tracking-wide">0x3a7f8b2c9d1e4f...9f2</p>
                                </div>
                            </div>
                            <button className="shrink-0 flex items-center justify-center size-8 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors" title="Copy Hash">
                                <span className="material-symbols-outlined text-[18px]">content_copy</span>
                            </button>
                        </div>
                        {/* Fake Progress Bar */}
                        <div className="h-0.5 w-full bg-white/5">
                            <div className="h-full bg-gradient-to-r from-secondary to-primary w-2/3 animate-pulse"></div>
                        </div>
                    </div>

                    <div className="mt-4 flex gap-6 text-xs text-white/30 uppercase tracking-widest">
                        <span>Gas: 15 Gwei</span>
                        <span>•</span>
                        <span>Nonce: 42</span>
                        <span>•</span>
                        <span>Est: ~12s</span>
                    </div>
                </div>
            </main>
        </div>
    );
}
