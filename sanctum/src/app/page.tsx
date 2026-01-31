import { ConnectWallet } from "@/components/wallet/ConnectWallet";
import { GhostPermitForm } from "@/components/permits/GhostPermitForm";

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-gray-950/80 border-b border-violet-500/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 
                            flex items-center justify-center text-xl font-bold shadow-lg shadow-violet-500/30">
              Ξ
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 
                             bg-clip-text text-transparent">
              EIDOLON
            </span>
          </div>
          <ConnectWallet />
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Animated background glow */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] 
                            bg-violet-500/10 rounded-full blur-3xl animate-pulse" />
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-violet-400 
                             bg-clip-text text-transparent">
              Zero-TVL Liquidity
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-400 mb-4">
            The <span className="text-violet-400">Quantum Realm</span> of DeFi
          </p>
          
          <p className="text-gray-500 max-w-2xl mx-auto mb-12">
            Provide liquidity without locking capital. Your tokens stay in your wallet
            until the exact moment they&apos;re needed — then return with fees, atomically.
          </p>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            <FeatureCard
              icon="👻"
              title="Ghost Permits"
              description="Sign off-chain authorizations that materialize liquidity only when matched"
            />
            <FeatureCard
              icon="⚡"
              title="Atomic Settlement"
              description="Funds never leave your wallet until the swap completes successfully"
            />
            <FeatureCard
              icon="🛡️"
              title="MEV Protection"
              description="Context-bound signatures prevent front-running and replay attacks"
            />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="px-6 pb-20">
        <div className="max-w-2xl mx-auto">
          <GhostPermitForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">
            © 2024 EIDOLON Protocol. Built for the Uniswap Hook-a-Thon.
          </p>
          <div className="flex items-center gap-6">
            <a href="https://github.com" className="text-gray-500 hover:text-violet-400 transition-colors">
              GitHub
            </a>
            <a href="https://docs.uniswap.org/contracts/v4/overview" className="text-gray-500 hover:text-violet-400 transition-colors">
              Uniswap v4 Docs
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800 
                    hover:border-violet-500/30 transition-all duration-300 group">
      <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  );
}
