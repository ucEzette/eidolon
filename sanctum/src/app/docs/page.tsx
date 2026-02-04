"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/sanctum/Navbar";

export default function DocsPage() {
    const [activeSection, setActiveSection] = useState("introduction");

    // Scroll to section handling
    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: "smooth" });
            setActiveSection(id);
        }
    };

    return (
        <main className="min-h-screen bg-background-dark font-display relative overflow-hidden text-white selection:bg-primary/30">
            {/* Background Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none bg-aurora opacity-40"></div>
            <div className="fixed inset-0 z-0 pointer-events-none bg-noise mix-blend-overlay opacity-50"></div>

            <Navbar />

            <div className="relative z-10 flex pt-24 px-4 lg:px-8 max-w-[1400px] mx-auto min-h-screen gap-12">

                {/* Sidebar Navigation (Sticky) */}
                <aside className="hidden lg:block w-64 -shrink-0 sticky top-32 h-[calc(100vh-160px)] overflow-y-auto pr-4 border-r border-white/5">
                    <nav className="flex flex-col gap-8">
                        <div>
                            <h4 className="font-bold text-white/40 uppercase tracking-widest text-xs mb-4">Overview</h4>
                            <ul className="space-y-3 border-l border-white/5 pl-4">
                                <li>
                                    <button
                                        onClick={() => scrollToSection("introduction")}
                                        className={`text-sm transition-colors hover:text-white ${activeSection === "introduction" ? "text-primary font-bold" : "text-text-muted"}`}
                                    >
                                        Introduction
                                    </button>
                                </li>
                                <li>
                                    <button
                                        onClick={() => scrollToSection("core-innovation")}
                                        className={`text-sm transition-colors hover:text-white ${activeSection === "core-innovation" ? "text-primary font-bold" : "text-text-muted"}`}
                                    >
                                        Core Innovation
                                    </button>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-white/40 uppercase tracking-widest text-xs mb-4">Architecture</h4>
                            <ul className="space-y-3 border-l border-white/5 pl-4">
                                <li>
                                    <button
                                        onClick={() => scrollToSection("flash-flow")}
                                        className={`text-sm transition-colors hover:text-white ${activeSection === "flash-flow" ? "text-primary font-bold" : "text-text-muted"}`}
                                    >
                                        The Flash Flow
                                    </button>
                                </li>
                                <li>
                                    <button
                                        onClick={() => scrollToSection("components")}
                                        className={`text-sm transition-colors hover:text-white ${activeSection === "components" ? "text-primary font-bold" : "text-text-muted"}`}
                                    >
                                        Key Components
                                    </button>
                                </li>
                                <li>
                                    <button
                                        onClick={() => scrollToSection("schematics")}
                                        className={`text-sm transition-colors hover:text-white ${activeSection === "schematics" ? "text-primary font-bold" : "text-text-muted"}`}
                                    >
                                        Schematics
                                    </button>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-white/40 uppercase tracking-widest text-xs mb-4">Security</h4>
                            <ul className="space-y-3 border-l border-white/5 pl-4">
                                <li>
                                    <button
                                        onClick={() => scrollToSection("permit2-witness")}
                                        className={`text-sm transition-colors hover:text-white ${activeSection === "permit2-witness" ? "text-primary font-bold" : "text-text-muted"}`}
                                    >
                                        Permit2 Witness
                                    </button>
                                </li>
                                <li>
                                    <button
                                        onClick={() => scrollToSection("atomic-guard")}
                                        className={`text-sm transition-colors hover:text-white ${activeSection === "atomic-guard" ? "text-primary font-bold" : "text-text-muted"}`}
                                    >
                                        Atomic Guard
                                    </button>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-bold text-white/40 uppercase tracking-widest text-xs mb-4">Developers</h4>
                            <ul className="space-y-3 border-l border-white/5 pl-4">
                                <li>
                                    <button
                                        onClick={() => scrollToSection("integration")}
                                        className={`text-sm transition-colors hover:text-white ${activeSection === "integration" ? "text-primary font-bold" : "text-text-muted"}`}
                                    >
                                        Integration
                                    </button>
                                </li>
                                <li>
                                    <button
                                        onClick={() => scrollToSection("smart-contracts")}
                                        className={`text-sm transition-colors hover:text-white ${activeSection === "smart-contracts" ? "text-primary font-bold" : "text-text-muted"}`}
                                    >
                                        Smart Contracts
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </nav>
                </aside>

                {/* Main Content */}
                <div className="flex-1 max-w-4xl pb-32">

                    {/* Header */}
                    <div className="mb-16">
                        <h1 className="text-5xl md:text-6xl font-display font-bold bg-gradient-to-r from-white via-white to-text-muted bg-clip-text text-transparent mb-6">
                            Documentation
                        </h1>
                        <p className="text-xl text-text-muted font-light leading-relaxed max-w-2xl">
                            EIDOLON is the &quot;Undrainable Standard&quot; for decentralized finance, a radical reimagining of liquidity provision on Uniswap V4.
                        </p>
                    </div>

                    <div className="space-y-24">

                        {/* Introduction */}
                        <section id="introduction" className="space-y-6 scroll-mt-32">
                            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                                Introduction
                            </h2>
                            <div className="prose prose-invert prose-lg max-w-none text-text-muted/90">
                                <p>
                                    Traditional DEXs require users to deposit funds into smart contracts, creating massive &quot;honeypots&quot; (TVL) that attract hackers. In 2024 alone, billions were lost to contract exploits.
                                </p>
                                <p>
                                    Eidolon eliminates this risk entirely by introducing <strong>Ghost Liquidity</strong>. Instead of depositing tokens, users sign off-chain &quot;intents&quot; that authorize liquidity provision <em>only</em> for specific conditions. These funds remain safely in the user&apos;s self-custody wallet, completely inaccessible to hackers.
                                </p>
                                <div className="p-6 rounded-xl border border-primary/20 bg-primary/5 my-8">
                                    <h4 className="text-primary font-bold mb-2 flex items-center gap-2">
                                        <span className="material-symbols-outlined">verified_user</span>
                                        The Key Difference
                                    </h4>
                                    <p className="text-sm m-0">At rest, the Eidolon smart contract is empty. There is zero TVL to steal. We move DeFi from &quot;Trust Code&quot; to &quot;Trust Math&quot;.</p>
                                </div>
                            </div>
                        </section>

                        {/* Architecture */}
                        <section id="flash-flow" className="space-y-8 scroll-mt-32">
                            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                                <span className="text-accent">#</span> The Flash Flow
                            </h2>
                            <p className="text-lg text-text-muted">
                                This diagram illustrates the lifecycle of a single trade. Notice how funds are only present in the Hook for the brief duration of the transaction block.
                            </p>

                            {/* Diagram Container */}
                            {/* Interactive Diagram Container */}
                            <div className="w-full rounded-2xl border border-white/10 bg-[#050505] p-8 md:p-12 relative overflow-hidden">
                                {/* Background Grid & Glow */}
                                <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/5 blur-[100px] rounded-full"></div>

                                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6 md:gap-4">

                                    {/* Node 1: User */}
                                    <div className="flex flex-col items-center gap-4 group">
                                        <div className="w-20 h-20 rounded-2xl bg-[#0a0a0a] border border-white/10 flex items-center justify-center shadow-2xl relative z-10 group-hover:border-primary/50 transition-colors duration-500">
                                            <span className="material-symbols-outlined text-3xl text-white group-hover:text-primary transition-colors">account_balance_wallet</span>
                                            <div className="absolute -top-3 right-3 bg-primary/10 border border-primary/20 text-primary text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">MsgSender</div>
                                        </div>
                                        <div className="text-center">
                                            <h4 className="text-white font-bold text-sm">User Wallet</h4>
                                            <p className="text-xs text-text-muted mt-1">Signs Intent</p>
                                        </div>
                                    </div>

                                    {/* Arrow 1 */}
                                    <div className="flex-1 flex flex-col items-center justify-center gap-2">
                                        <div className="h-[2px] w-full bg-gradient-to-r from-white/5 via-white/20 to-white/5 relative hidden md:block">
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-[#050505] border border-white/10 rounded-full flex items-center justify-center z-10">
                                                <span className="material-symbols-outlined text-[10px] text-text-muted">key</span>
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-text-muted uppercase tracking-widest">Off-Chain</span>
                                        <span className="material-symbols-outlined text-white/20 md:hidden">arrow_downward</span>
                                    </div>

                                    {/* Node 2: Bot */}
                                    <div className="flex flex-col items-center gap-4 group">
                                        <div className="w-20 h-20 rounded-2xl bg-[#0a0a0a] border border-white/10 flex items-center justify-center shadow-2xl relative z-10 group-hover:border-accent/50 transition-colors duration-500">
                                            <span className="material-symbols-outlined text-3xl text-white group-hover:text-accent transition-colors">smart_toy</span>
                                        </div>
                                        <div className="text-center">
                                            <h4 className="text-white font-bold text-sm">Executor Bot</h4>
                                            <p className="text-xs text-text-muted mt-1">Pays Gas</p>
                                        </div>
                                    </div>

                                    {/* Arrow 2 */}
                                    <div className="flex-1 flex flex-col items-center justify-center gap-2">
                                        <div className="h-[2px] w-full bg-gradient-to-r from-accent/20 via-accent to-primary/20 relative hidden md:block">
                                            <div className="absolute top-0 right-0 -translate-y-[5px] translate-x-1">
                                                <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-accent border-b-[6px] border-b-transparent"></div>
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-accent uppercase tracking-widest font-bold">Transaction</span>
                                        <span className="material-symbols-outlined text-accent md:hidden">arrow_downward</span>
                                    </div>

                                    {/* Node 3: Hook */}
                                    <div className="flex flex-col items-center gap-4 group">
                                        <div className="w-24 h-24 rounded-2xl bg-[#0F172A] border border-primary flex flex-col items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.2)] relative z-10 overflow-hidden">
                                            <div className="absolute inset-0 bg-primary/10 animate-pulse"></div>
                                            <span className="material-symbols-outlined text-4xl text-primary relative z-10">webhook</span>
                                            <p className="text-[10px] font-mono text-primary/80 mt-1 relative z-10">EidolonHook</p>
                                        </div>
                                        <div className="text-center">
                                            <h4 className="text-white font-bold text-sm">Validation</h4>
                                            <p className="text-xs text-text-muted mt-1">JIT Liquidity</p>
                                        </div>
                                    </div>

                                    {/* Arrow 3 */}
                                    <div className="flex-1 flex flex-col items-center justify-center gap-2">
                                        <div className="h-[2px] w-full bg-gradient-to-r from-primary/20 via-primary to-white/5 relative hidden md:block"></div>
                                        <span className="text-[10px] text-primary uppercase tracking-widest">Swap</span>
                                        <span className="material-symbols-outlined text-primary md:hidden">arrow_downward</span>
                                    </div>

                                    {/* Node 4: Uniswap */}
                                    <div className="flex flex-col items-center gap-4 group">
                                        <div className="w-20 h-20 rounded-2xl bg-[#0a0a0a] border border-white/10 flex items-center justify-center shadow-2xl relative z-10 group-hover:border-pink-500/50 transition-colors duration-500">
                                            <span className="material-symbols-outlined text-3xl text-white group-hover:text-pink-500 transition-colors">swap_calls</span>
                                        </div>
                                        <div className="text-center">
                                            <h4 className="text-white font-bold text-sm">Uniswap V4</h4>
                                            <p className="text-xs text-text-muted mt-1">Execution</p>
                                        </div>
                                    </div>

                                </div>

                                {/* Flow Annotations */}
                                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-white/5 pt-8">
                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-xs font-mono text-white/50 border border-white/10">1</div>
                                        <div>
                                            <p className="text-white text-sm font-bold">Signature Verification</p>
                                            <p className="text-text-muted text-xs leading-relaxed mt-1">Hook verifies `Permit2 Witness` signature matches exact pool parameters.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-mono text-primary border border-primary/20">2</div>
                                        <div>
                                            <p className="text-white text-sm font-bold">JIT Materialization</p>
                                            <p className="text-text-muted text-xs leading-relaxed mt-1">Liquidity is pulled from user wallet ONLY for the exact duration of the swap.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center text-xs font-mono text-accent border border-accent/20">3</div>
                                        <div>
                                            <p className="text-white text-sm font-bold">Atomic Settlement</p>
                                            <p className="text-text-muted text-xs leading-relaxed mt-1">Principal + Yield works are returned to user in the same block. Zero TVL left behind.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                                <div className="p-6 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors">
                                    <h3 className="text-lg font-bold text-white mb-2">1. Authorize</h3>
                                    <p className="text-sm text-text-muted">Users sign a cryptographic intent via our Permit2 Witness system. No gas, no deposit.</p>
                                </div>
                                <div className="p-6 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors">
                                    <h3 className="text-lg font-bold text-white mb-2">2. Execute</h3>
                                    <p className="text-sm text-text-muted">When a trade comes in, our Executor Bot triggers the transaction and pays the gas.</p>
                                </div>
                                <div className="p-6 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors">
                                    <h3 className="text-lg font-bold text-white mb-2">3. Materialize</h3>
                                    <p className="text-sm text-text-muted">The Eidolon Hook validates the signature and "materializes" liquidity milliseconds before the swap.</p>
                                </div>
                                <div className="p-6 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors">
                                    <h3 className="text-lg font-bold text-white mb-2">4. Settle</h3>
                                    <p className="text-sm text-text-muted">The swap executes, fees are earned, and principal + profit is atomically returned in the same block.</p>
                                </div>
                            </div>
                        </section>

                        {/* Technical Schematics */}
                        <section id="schematics" className="space-y-8 scroll-mt-32">
                            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                                <span className="text-primary">#</span> Technical Schematics
                            </h2>
                            <p className="text-lg text-text-muted">
                                Detailed system architecture and data models for advanced integration.
                            </p>

                            <div className="grid grid-cols-1 gap-8">
                                {/* Architecture Diagram */}
                                <div className="rounded-2xl border border-white/10 bg-[#050505] overflow-hidden group">
                                    <div className="p-6 border-b border-white/5 bg-white/5">
                                        <h3 className="text-lg font-bold text-white">System Architecture</h3>
                                        <p className="text-sm text-text-muted mt-1">High-level view of the off-chain/on-chain interaction model.</p>
                                    </div>
                                    <div className="relative aspect-video w-full bg-[#020202] p-4">
                                        <Image
                                            src="/architecture-flow.png"
                                            alt="Eidolon System Architecture"
                                            fill
                                            className="object-contain"
                                            unoptimized
                                        />
                                    </div>
                                </div>

                                {/* Entity Diagram - REMOVED */}
                            </div>
                        </section>

                        {/* Security */}
                        <section id="permit2-witness" className="space-y-6 scroll-mt-32">
                            <h2 className="text-3xl font-bold text-white">Security Model</h2>

                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-xl font-bold text-primary mb-3">Permit2 Witness</h3>
                                    <p className="text-text-muted leading-relaxed">
                                        The primary vector for DeFi drains is &quot;approval abuse.&quot; Eidolon leverages <strong>Permit2 Witness</strong> signatures to solve this. Every signature is cryptographically bound to a specific `Witness` struct containing the `poolId` and the immutable `EidolonHook` address.
                                    </p>
                                    <p className="text-text-muted mt-2 italic">
                                        A signature intended for the ETH/USDC pool cannot be used to drain funds from any other pool.
                                    </p>
                                </div>

                                <div>
                                    <h3 className="text-xl font-bold text-accent mb-3" id="atomic-guard">Atomic Guard</h3>
                                    <p className="text-text-muted leading-relaxed">
                                        To prevent reentrancy attacks or logic errors, the `EidolonHook` implements a strict check:
                                    </p>
                                    <div className="mockup-code bg-black border border-white/10 mt-4 text-sm scale-90 -ml-6 lg:ml-0">
                                        <pre data-prefix=">"><code>require(currentBalance &gt;= initialBalance, "AtomicGuardViolation");</code></pre>
                                    </div>
                                    <p className="text-text-muted mt-2">
                                        If a swap would result in a user receiving less than they put in (principal loss), the entire transaction strictly reverts.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Integration */}
                        <section id="integration" className="space-y-6 scroll-mt-32">
                            <h2 className="text-3xl font-bold text-white">Integration & Tech Stack</h2>
                            <p className="text-text-muted">
                                Eidolon was built by fundamentally &quot;hacking&quot; the standard Liquidity Provision model on <strong>Uniswap V4</strong>.
                            </p>

                            <ul className="space-y-4 text-text-muted">
                                <li className="flex gap-4 items-start">
                                    <span className="material-symbols-outlined text-primary mt-1">code</span>
                                    <div>
                                        <strong className="text-white block">Uniswap V4 Hooks</strong>
                                        The core enabler. We used `beforeSwap` to pull liquidity Just-In-Time (JIT) and `afterSwap` to return it atomically.
                                    </div>
                                </li>
                                <li className="flex gap-4 items-start">
                                    <span className="material-symbols-outlined text-primary mt-1">memory</span>
                                    <div>
                                        <strong className="text-white block">Transient Storage (EIP-1153)</strong>
                                        Used via the &quot;Cancun&quot; EVM version on Unichain/Sei V2 to allow cheap, temporary storage slots for our JIT accounting.
                                    </div>
                                </li>
                                <li className="flex gap-4 items-start">
                                    <span className="material-symbols-outlined text-primary mt-1">terminal</span>
                                    <div>
                                        <strong className="text-white block">Foundry & Viem</strong>
                                        Fully typed end-to-end development environment for maximum safety and correctness.
                                    </div>
                                </li>
                            </ul>
                        </section>

                        {/* Footer Section */}
                        <div className="pt-24 pb-12 border-t border-white/10 text-center">
                            <p className="text-text-muted mb-4">Ready to try it out?</p>
                            <Link href="/">
                                <button className="btn btn-lg btn-primary font-display tracking-widest text-black rounded-full px-12">
                                    LAUNCH APP
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
