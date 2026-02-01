import { Navbar } from "@/components/sanctum/Navbar";
import { SummoningPortal } from "@/components/sanctum/SummoningPortal";

export default function SummonPage() {
    return (
        <main className="min-h-screen bg-[#02040a] relative overflow-x-hidden font-display">
            <Navbar />
            <div className="pt-20 flex justify-center items-center min-h-[calc(100vh-80px)]">
                <SummoningPortal />
            </div>
        </main>
    );
}
