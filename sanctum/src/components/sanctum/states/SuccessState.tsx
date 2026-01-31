"use client";

import Link from "next/link";

export function SuccessState() {
    return (
        <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-background-light dark:bg-[#161023] font-display">
            {/* Background Effects (Aurora) */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                {/* Central Aurora Bloom */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 blur-[120px] rounded-full opacity-60 mix-blend-screen"></div>
                {/* Secondary Cyan Tint */}
                <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-eidolon-cyan/10 blur-[100px] rounded-full opacity-40 mix-blend-screen"></div>
            </div>

            {/* Main Content Area: Centered Modal */}
            <main className="relative z-20 flex-1 flex items-center justify-center p-4">
                {/* Success Modal Card (Ghost Permit Card) */}
                <div className="relative w-full max-w-[520px] overflow-hidden rounded-2xl bg-[#1e1433]/60 backdrop-blur-xl border border-white/10 shadow-[0_0_60px_-15px_rgba(99,37,244,0.3)] flex flex-col items-center">
                    {/* Decorative Top Border Gradient */}
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-eidolon-cyan/50 to-transparent"></div>

                    {/* Visual Centerpiece: Quantum Seal */}
                    <div className="relative w-full h-64 flex items-center justify-center mt-8 mb-2">
                        {/* Glow behind seal */}
                        <div className="absolute w-40 h-40 bg-eidolon-violet/30 blur-[50px] rounded-full"></div>
                        <div className="absolute w-32 h-32 bg-eidolon-cyan/20 blur-[40px] rounded-full mix-blend-screen"></div>

                        {/* Animated Rings */}
                        {/* Outer Ring Cyan */}
                        <div className="absolute w-48 h-48 rounded-full border border-eidolon-cyan/30 border-dashed opacity-80"></div>
                        {/* Middle Ring Violet */}
                        <div className="absolute w-36 h-36 rounded-full border-2 border-eidolon-violet/50 shadow-[0_0_15px_rgba(99,37,244,0.4)]"></div>
                        {/* Inner Hexagon shape approximation using rotation */}
                        <div className="absolute w-28 h-28 border border-white/10 bg-white/5 rotate-45 rounded-xl backdrop-blur-sm"></div>

                        {/* Pulsing Checkmark */}
                        <div className="relative z-10 flex items-center justify-center bg-[#161023] rounded-full p-4 border border-eidolon-cyan/50 shadow-[0_0_25px_rgba(0,240,255,0.4)]">
                            <span className="material-symbols-outlined text-5xl text-eidolon-cyan drop-shadow-[0_0_10px_rgba(0,240,255,0.8)]">check_circle</span>
                        </div>

                        {/* Decorative Particles */}
                        <div className="absolute top-10 left-20 w-1 h-1 bg-white rounded-full shadow-[0_0_5px_white]"></div>
                        <div className="absolute bottom-12 right-24 w-1.5 h-1.5 bg-eidolon-cyan rounded-full shadow-[0_0_5px_cyan]"></div>
                    </div>

                    {/* Text Content */}
                    <div className="flex flex-col items-center px-8 pb-8 w-full text-center">
                        {/* Headline */}
                        <h1 className="text-white text-2xl md:text-3xl font-bold leading-tight tracking-[0.15em] mb-3 drop-shadow-lg">
                            PERMIT SIGNED<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-eidolon-cyan to-white">SUCCESSFULLY</span>
                        </h1>

                        {/* Body Text */}
                        <p className="text-gray-400 text-sm md:text-base font-normal leading-relaxed max-w-sm mb-6">
                            Your liquidity position has been successfully encoded into the Sanctum. The ritual is complete.
                        </p>

                        {/* Transaction Hash Pill */}
                        <div className="flex items-center gap-2 bg-[#0d0915]/80 border border-white/5 rounded-full px-4 py-1.5 mb-8 hover:border-eidolon-cyan/30 transition-colors cursor-pointer group">
                            <span className="text-[#a290cb] text-xs font-mono tracking-wide group-hover:text-white transition-colors">Transaction Hash: 0x3f...8a2</span>
                            <span className="material-symbols-outlined text-[14px] text-[#a290cb] group-hover:text-eidolon-cyan transition-colors">content_copy</span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 w-full">
                            {/* Secondary Action: View on Explorer */}
                            <button className="flex-1 h-12 rounded-lg border border-eidolon-cyan/40 text-eidolon-cyan font-bold tracking-wider text-sm hover:bg-eidolon-cyan/10 hover:border-eidolon-cyan transition-all flex items-center justify-center gap-2 group">
                                <span>VIEW ON EXPLORER</span>
                                <span className="material-symbols-outlined text-[18px] group-hover:translate-x-0.5 transition-transform">open_in_new</span>
                            </button>

                            {/* Primary Action: Dashboard */}
                            <Link href="/mirror" className="flex-1">
                                <button className="w-full h-12 rounded-lg bg-primary hover:bg-[#501cd4] text-white font-bold tracking-wider text-sm shadow-[0_0_20px_-5px_rgba(99,37,244,0.6)] hover:shadow-[0_0_25px_-5px_rgba(99,37,244,0.8)] transition-all flex items-center justify-center gap-2">
                                    <span>RETURN TO DASHBOARD</span>
                                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
