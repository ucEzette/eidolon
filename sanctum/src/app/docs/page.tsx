"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
                            <div className="w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-2xl relative group">
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    {/* Placeholder for the diagram image if we had one active, for now keeping it Clean CSS or text based representation */}
                                    <div className="p-8 text-center text-text-muted/50">
                                        <p className="font-mono text-sm">[Architecture Diagram Representation]</p>
                                        <div className="grid grid-cols-5 gap-4 mt-8 opacity-70">
                                            <div className="p-4 border border-white/10 rounded bg-white/5">User Wallet</div>
                                            <div className="flex items-center justify-center">→ (Sign) →</div>
                                            <div className="p-4 border border-primary/30 rounded bg-primary/10 text-primary">Permit2</div>
                                            <div className="flex items-center justify-center">→ (Hook) →</div>
                                            <div className="p-4 border border-accent/30 rounded bg-accent/10 text-accent">Uniswap V4</div>
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
