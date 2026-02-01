import { RewardsPortal } from "@/components/sanctum/RewardsPortal";
import { Navbar } from "@/components/sanctum/Navbar";

export default function RewardsPage() {
    return (
        <main className="min-h-screen bg-[#02040a] relative overflow-x-hidden">
            <Navbar />
            <div className="pt-20">
                <RewardsPortal />
            </div>
        </main>
    );
}
