"use client";

import { useAccount, useConnect, useDisconnect, useBalance, useNetwork } from "wagmi";
import { baseSepolia } from "wagmi/chains";

// ═══════════════════════════════════════════════════════════════════════════════
// CONNECT WALLET BUTTON
// ═══════════════════════════════════════════════════════════════════════════════

export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();
  const { connectors, connect, isLoading } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({
    address,
    chainId: baseSepolia.id,
  });

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-4">
        {/* Network Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm text-violet-300">
            {chain?.name || "Unknown"}
          </span>
        </div>

        {/* Balance */}
        {balance && (
          <span className="text-sm text-gray-400">
            {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
          </span>
        )}

        {/* Address */}
        <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600/20 to-purple-600/20 
                        border border-violet-500/30 text-violet-200 font-mono text-sm">
          {address.slice(0, 6)}...{address.slice(-4)}
        </div>

        {/* Disconnect Button */}
        <button
          onClick={() => disconnect()}
          className="px-3 py-2 rounded-lg text-gray-400 hover:text-red-400 
                     hover:bg-red-500/10 transition-all duration-300"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="relative group">
      <button
        onClick={() => {
          // Connect with injected wallet (MetaMask, etc.)
          const injectedConnector = connectors.find(c => c.id === 'injected');
          if (injectedConnector) {
            connect({ connector: injectedConnector });
          }
        }}
        disabled={isLoading}
        className="px-6 py-3 rounded-xl overflow-hidden
                   bg-gradient-to-r from-violet-600 to-purple-600 
                   hover:from-violet-500 hover:to-purple-500
                   disabled:from-gray-600 disabled:to-gray-700
                   text-white font-semibold shadow-lg shadow-violet-500/25
                   hover:shadow-violet-500/40 transition-all duration-300"
      >
        <span className="flex items-center gap-2">
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Connecting...
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
              </svg>
              Enter The Sanctum
            </>
          )}
        </span>
      </button>
    </div>
  );
}
