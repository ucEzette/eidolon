"use client";

import { useState } from "react";
import Image from "next/image";
import { useAccount, useConnect, useDisconnect, useBalance, useEnsName } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { useCircleWallet } from "@/components/providers/CircleWalletProvider";

// ... (rest of imports)

export function ConnectWallet() {
  // Wagmi hooks for traditional wallets (v2 API)
  const { address: wagmiAddress, isConnected: wagmiConnected, connector } = useAccount();
  const { connectors, connect, isPending: wagmiLoading } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();

  // FIX: Use current chain for balance or default to Unichain Sepolia if configured
  // Leaving baseSepolia for now as per existing code, but strictly this should be chain-aware
  const { data: balance } = useBalance({
    address: wagmiAddress,
    chainId: baseSepolia.id,
  });

  // Circle hooks for passkey wallets
  // ... (keep existing Circle hooks)
  const { address: circleAddress, isConnected: circleConnected, ...circleRest } = useCircleWallet();
  const {
    isConnecting: circleConnecting,
    username: circleUsername,
    registerPasskey,
    loginWithPasskey,
    disconnect: circleDisconnect,
    error: circleError
  } = circleRest;

  // Local state
  const [showMethods, setShowMethods] = useState(false);
  const [passkeyMode, setPasskeyMode] = useState<"register" | "login" | null>(null);
  const [passkeyUsername, setPasskeyUsername] = useState("");
  const [passkeyError, setPasskeyError] = useState<string | null>(null);

  // Unified connection state
  const isConnected = wagmiConnected || circleConnected;
  const address = circleConnected ? circleAddress : wagmiAddress;
  const isLoading = wagmiLoading || circleConnecting;

  // Resolution: ENS Name (Mainnet)
  const { data: ensName } = useEnsName({
    address: address || undefined,
    chainId: 1, // Always query ENS on Mainnet
  });

  // Handle passkey submission
  // ... (keep existing handlers)
  const handlePasskeySubmit = async () => {
    // ...
  };
  const handleDisconnect = () => {
    if (wagmiConnected) wagmiDisconnect();
    if (circleConnected) circleDisconnect();
  };

  // Connected state UI
  if (isConnected && address) {
    return (
      <div className="flex items-center gap-4">
        {/* Balance */}
        {balance && (
          <span className="text-sm text-gray-400 hidden md:inline">
            {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
          </span>
        )}

        {/* Address or ENS */}
        <div className="px-4 py-2 rounded-none bg-white/5 
                        border border-white/10 text-phantom-cyan font-mono text-sm tracking-tight
                        shadow-[2px_2px_0px_rgba(255,255,255,0.05)]">
          {ensName ? ensName : `${address.slice(0, 6)}...${address.slice(-4)}`}
        </div>

        {/* Disconnect Button */}
        <button
          onClick={handleDisconnect}
          className="px-3 py-2 rounded-lg text-gray-400 hover:text-red-400 
                     hover:bg-red-500/10 transition-all duration-300"
          title="Disconnect"
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

  // Passkey input modal
  if (passkeyMode) {
    return (
      <div className="relative">
        <div className="flex flex-col gap-3 p-4 bg-black/80 rounded-2xl border border-violet-500/30 shadow-2xl min-w-[280px]">
          <h3 className="text-sm font-bold text-white">
            {passkeyMode === "register" ? "Create Passkey Wallet" : "Login with Passkey"}
          </h3>

          <input
            type="text"
            placeholder="Enter username"
            value={passkeyUsername}
            onChange={(e) => setPasskeyUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handlePasskeySubmit()}
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white 
                       placeholder:text-gray-500 focus:outline-none focus:border-violet-500"
            autoFocus
          />

          {(passkeyError || circleError) && (
            <p className="text-xs text-red-400">{passkeyError || circleError?.message}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => { setPasskeyMode(null); setPasskeyError(null); }}
              className="flex-1 px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 
                         text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePasskeySubmit}
              disabled={isLoading}
              className="flex-1 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 
                         text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {isLoading ? "..." : passkeyMode === "register" ? "Register" : "Login"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Disconnected state - show connection options
  return (
    <div className="relative">
      <button
        onClick={() => setShowMethods(!showMethods)}
        disabled={isLoading}
        className="px-4 py-2 md:px-6 md:py-3 rounded-none border border-phantom-cyan/50
                   bg-phantom-cyan hover:bg-phantom-cyan/90
                   disabled:bg-gray-800 disabled:border-gray-700 disabled:text-gray-500
                   text-black font-bold tracking-wide uppercase
                   shadow-[4px_4px_0px_rgba(255,255,255,0.1)]
                   hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_rgba(255,255,255,0.1)]
                   active:translate-x-[4px] active:translate-y-[4px] active:shadow-none
                   transition-all duration-100 text-xs md:text-base"
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
              <span className="hidden md:inline">Enter The Sanctum</span>
              <span className="md:hidden">Connect</span>
            </>
          )}
        </span>
      </button>

      {/* Dropdown menu */}
      {showMethods && (
        <div className="absolute top-full right-0 mt-2 w-64 p-2 bg-black/90 rounded-2xl border border-violet-500/30 
                        shadow-2xl shadow-violet-500/10 backdrop-blur-xl z-50">
          <div className="text-xs text-gray-500 px-3 py-2 uppercase tracking-wider">Connect with</div>

          {/* Circle Passkey Options */}
          <button
            onClick={() => { setPasskeyMode("register"); setShowMethods(false); }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-violet-500/10 
                       text-white transition-colors group"
          >
            <div className="size-8 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 
                            flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[16px]">fingerprint</span>
            </div>
            <div className="text-left">
              <div className="text-sm font-medium">Create Passkey</div>
              <div className="text-xs text-gray-500">New smart wallet</div>
            </div>
          </button>

          <button
            onClick={() => { setPasskeyMode("login"); setShowMethods(false); }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-violet-500/10 
                       text-white transition-colors group"
          >
            <div className="size-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 
                            flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[16px]">passkey</span>
            </div>
            <div className="text-left">
              <div className="text-sm font-medium">Login with Passkey</div>
              <div className="text-xs text-gray-500">Existing wallet</div>
            </div>
          </button>

          <div className="h-px bg-white/10 my-2" />

          {/* Traditional Wallet Options (wagmi v2) */}
          {connectors
            .filter((c) => c.type !== 'walletConnect')
            .map((connector) => (
              <button
                key={connector.uid}
                onClick={() => {
                  if (circleConnected) circleDisconnect();
                  connect({ connector });
                  setShowMethods(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-violet-500/10 
                         text-white transition-colors group"
              >
                <div className="size-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 
                              flex items-center justify-center group-hover:scale-110 transition-transform">
                  {/* Dynamic Icon based on connector name */}
                  {connector.name.toLowerCase().includes('rabby') ? (
                    <Image src="https://rabby.io/assets/rabby-logo.png" alt="Rabby" width={20} height={20} className="w-5 h-5 object-contain" unoptimized />
                  ) : connector.name.toLowerCase().includes('metamask') ? (
                    <Image src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" width={20} height={20} className="w-5 h-5" unoptimized />
                  ) : connector.name.toLowerCase().includes('coinbase') ? (
                    <div className="w-5 h-5 rounded-full bg-[#0052FF] flex items-center justify-center text-white text-[10px] font-bold">C</div>
                  ) : connector.id === 'injected' ? (
                    <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-white text-[10px] font-bold">W</div>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 40 40" fill="none">
                      <path d="M20 40c11.046 0 20-8.954 20-20S31.046 0 20 0 0 8.954 0 20s8.954 20 20 20z" fill="#F6851B" />
                    </svg>
                  )}
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium">{connector.name === 'Injected' ? 'Browser Wallet' : connector.name}</div>
                  <div className="text-xs text-gray-500">
                    {connector.name === 'MetaMask' ? 'Popular' : 'Extension'}
                  </div>
                </div>
              </button>
            ))}

          {connectors.filter(c => c.type === 'walletConnect').map((connector) => (
            <button
              key={connector.uid}
              onClick={() => {
                if (circleConnected) circleDisconnect();
                connect({ connector });
                setShowMethods(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-violet-500/10 
                         text-white transition-colors group"
            >
              <div className="size-8 rounded-full bg-gradient-to-br from-blue-500 to-sky-400 
                              flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-4 h-4" viewBox="0 0 32 32" fill="white">
                  <path d="M9.58 11.28c3.55-3.48 9.29-3.48 12.84 0l.43.42a.44.44 0 0 1 0 .63l-1.46 1.43a.23.23 0 0 1-.32 0l-.59-.57a6.52 6.52 0 0 0-9.06 0l-.63.62a.23.23 0 0 1-.32 0l-1.46-1.43a.44.44 0 0 1 0-.63l.57-.47zm15.87 2.96 1.3 1.27a.44.44 0 0 1 0 .63l-5.85 5.73a.46.46 0 0 1-.64 0l-4.15-4.07a.12.12 0 0 0-.16 0l-4.15 4.07a.46.46 0 0 1-.64 0l-5.85-5.73a.44.44 0 0 1 0-.63l1.3-1.27a.46.46 0 0 1 .64 0l4.15 4.06c.04.05.12.05.16 0l4.15-4.06a.46.46 0 0 1 .64 0l4.15 4.06c.04.05.12.05.16 0l4.15-4.06a.46.46 0 0 1 .64 0z" />
                </svg>
              </div>
              <div className="text-left">
                <div className="text-sm font-medium">{connector.name}</div>
                <div className="text-xs text-gray-500">Mobile & desktop</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
