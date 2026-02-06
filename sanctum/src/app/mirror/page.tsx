"use client";

import nextDynamic from "next/dynamic";
import { Navbar } from "@/components/sanctum/Navbar";
import { MirrorDashboard } from "@/components/sanctum/MirrorDashboard";

const ActivityFeed = nextDynamic(() => import("@/components/sanctum/ActivityFeed").then(mod => mod.ActivityFeed), {
    ssr: false,
    loading: () => <div className="animate-pulse bg-white/5 rounded-xl h-full w-full" />
});

// Force client-side rendering to avoid SSR issues with wagmi/viem
export const dynamic = "force-dynamic";

export default function MirrorPage() {
    return (
        <main className="min-h-screen bg-background-dark font-display relative overflow-hidden">
            {/* Background Aurora Effect */}
            <div className="fixed inset-0 z-0 pointer-events-none bg-aurora opacity-80"></div>
            <div className="fixed inset-0 z-0 pointer-events-none bg-noise mix-blend-overlay"></div>

            <Navbar />

            {/* Main Content */}
            <div className="relative z-10 py-10 flex max-w-[1600px] mx-auto">
                <div className="flex-1 min-w-0">
                    <MirrorDashboard />
                </div>
                {/* Activity Feed Sidebar (Desktop) */}
                <div className="hidden xl:block w-80 sticky top-24 h-[calc(100vh-8rem)] pr-6 pl-2">
                    <ActivityFeed />
                </div>
            </div>
        </main>
    );
}
