"use client";

import { Navbar } from "@/components/sanctum/Navbar";
import { MirrorDashboard } from "@/components/sanctum/MirrorDashboard";

export default function MirrorPage() {
    return (
        <main className="min-h-screen bg-background-dark font-display relative overflow-hidden">
            {/* Background Aurora Effect */}
            <div className="fixed inset-0 z-0 pointer-events-none bg-aurora opacity-80"></div>
            <div className="fixed inset-0 z-0 pointer-events-none bg-noise mix-blend-overlay"></div>

            <Navbar />

            {/* Main Content */}
            <div className="relative z-10 py-10">
                <MirrorDashboard />
            </div>
        </main>
    );
}
