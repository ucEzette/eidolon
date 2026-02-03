"use client";

import { Navbar } from "@/components/sanctum/Navbar";
import { SummoningPortal } from "@/components/sanctum/SummoningPortal";
import { PoolManager } from "@/components/sanctum/PoolManager";

// Force client-side rendering to avoid SSR issues with wagmi/viem
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="min-h-screen bg-background-dark font-display relative overflow-hidden">
      {/* Background Aurora Effect */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-aurora opacity-80"></div>
      <div className="fixed inset-0 z-0 pointer-events-none bg-noise mix-blend-overlay"></div>

      <Navbar />

      {/* Main Content: The Summoning Interface */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4 py-8 md:py-12">
        <div className="w-full max-w-[1200px] grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Left Column: Summoning Portal (Main Action) */}
          <div className="lg:col-span-7 flex flex-col items-center lg:items-end">
            <SummoningPortal />
          </div>

          {/* Right Column: Pool Manager (Context/Secondary) */}
          <div className="lg:col-span-5 flex flex-col items-center lg:items-start pt-8 lg:pt-0">
            {/* Visual Connector for Desktop */}
            <div className="hidden lg:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0 h-[80%] w-[1px] bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>

            <PoolManager />
          </div>
        </div>

        {/* Footer / Trust Badges */}
        <div className="mt-12 flex gap-6 opacity-40 hover:opacity-100 transition-opacity duration-300">
          {/* Audited by Trail of Bits removed */}
          <div className="flex items-center gap-2 text-white/60 text-xs font-mono">
            <span className="material-symbols-outlined text-[16px]">verified_user</span>
            EIP-712 Compliant
          </div>
        </div>
      </div>
    </main>
  );
}
