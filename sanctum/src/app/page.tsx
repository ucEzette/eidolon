"use client";

import { Navbar } from "@/components/sanctum/Navbar";
import { SummoningPortal } from "@/components/sanctum/SummoningPortal";

export default function Home() {
  return (
    <main className="min-h-screen bg-background-dark font-display relative overflow-hidden">
      {/* Background Aurora Effect */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-aurora opacity-80"></div>
      <div className="fixed inset-0 z-0 pointer-events-none bg-noise mix-blend-overlay"></div>

      <Navbar />

      {/* Main Content: The Summoning Interface */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 py-12">
        <SummoningPortal />

        {/* Footer / Trust Badges */}
        <div className="mt-8 flex gap-6 opacity-40 hover:opacity-100 transition-opacity duration-300">
          <div className="flex items-center gap-2 text-white/60 text-xs font-mono">
            <span className="material-symbols-outlined text-[16px]">lock</span>
            Audited by Trail of Bits
          </div>
          <div className="flex items-center gap-2 text-white/60 text-xs font-mono">
            <span className="material-symbols-outlined text-[16px]">verified_user</span>
            EIP-712 Compliant
          </div>
        </div>
      </div>
    </main>
  );
}
