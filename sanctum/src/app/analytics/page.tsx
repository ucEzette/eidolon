import { DeepAnalyticsHub } from "@/components/sanctum/DeepAnalyticsHub";
import { Navbar } from "@/components/sanctum/Navbar";

export default function AnalyticsPage() {
    return (
        <main className="min-h-screen bg-[#02040a] relative overflow-x-hidden">
            <Navbar />
            <div className="pt-20">
                <DeepAnalyticsHub />
            </div>
        </main>
    );
}
