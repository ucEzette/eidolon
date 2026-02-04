"use client";

import React, { useState, useMemo } from 'react';
import Image from "next/image";
import { TOKENS, type Token } from '@/config/tokens';
import { useAccount, useBalance, useReadContracts } from 'wagmi';
import { isAddress, type Address, erc20Abi } from "viem";

interface TokenSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (token: Token) => void;
}

export function TokenSelector({ isOpen, onClose, onSelect }: TokenSelectorProps) {
    const [search, setSearch] = useState("");
    const { address } = useAccount();

    const filteredTokens = useMemo(() => {
        return TOKENS.filter(t =>
            t.symbol.toLowerCase().includes(search.toLowerCase()) ||
            t.name.toLowerCase().includes(search.toLowerCase()) ||
            t.address.toLowerCase() === search.toLowerCase()
        );
    }, [search]);

    // Custom Token Logic
    const isSearchAddress = isAddress(search);
    const { data: tokenData, isLoading: isTokenLoading } = useReadContracts({
        contracts: [
            { address: search as Address, abi: erc20Abi, functionName: 'symbol' },
            { address: search as Address, abi: erc20Abi, functionName: 'name' },
            { address: search as Address, abi: erc20Abi, functionName: 'decimals' },
        ],
        query: {
            enabled: isSearchAddress && filteredTokens.length === 0 // Only fetch if not already in list
        }
    });

    const customToken: Token | null = useMemo(() => {
        if (!isSearchAddress || !tokenData || filteredTokens.length > 0) return null;

        const [symbol, name, decimals] = tokenData;

        if (symbol.status === 'success' && decimals.status === 'success') {
            return {
                symbol: symbol.result as string,
                name: name.status === 'success' ? name.result as string : "Imported Token",
                address: search as Address,
                decimals: decimals.result as number,
                logo: undefined, // No logo for custom
                isNative: false
            };
        }
        return null;
    }, [isSearchAddress, tokenData, search, filteredTokens.length]);


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0a0812]/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-[520px] rounded-[2rem] p-[1px] bg-gradient-to-br from-cyan-400 via-cyan-600 to-indigo-900 shadow-[0_0_40px_-10px_rgba(34,211,238,0.4)]">
                <div className="bg-[#02040a] relative flex h-[700px] w-full flex-col overflow-hidden rounded-[2rem]">

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
                        <h2 className="text-xl font-bold tracking-tight text-white font-display">Summon Asset</h2>
                        <button
                            onClick={onClose}
                            className="group flex h-8 w-8 items-center justify-center rounded-full bg-white/5 transition-colors hover:bg-white/10 text-white/70 hover:text-white"
                        >
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>

                    {/* Search */}
                    <div className="px-6 pt-6 pb-2">
                        <div className="relative group/search">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-cyan-200/50 group-focus-within/search:text-cyan-400 transition-colors">
                                <span className="material-symbols-outlined text-[20px]">search</span>
                            </div>
                            <input
                                className="w-full h-12 rounded-full bg-[#0a0812]/60 border border-white/10 pl-11 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50 focus:shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all duration-300 font-display"
                                placeholder="Search by name or paste address"
                                type="text"
                                autoFocus
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Trending */}
                    <div className="px-6 py-4">
                        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-white/40">Trending Vessels</p>
                        <div className="flex flex-wrap gap-2">
                            <TrendingChip symbol="ETH" change="+1.2%" isPositive />
                            <TrendingChip symbol="eiETH" change="+100%" isPositive />
                            <TrendingChip symbol="USDC" change="+0.01%" isPositive />
                        </div>
                    </div>

                    {/* Token List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-4 space-y-1">
                        {/* Standard Filtered Tokens */}
                        {filteredTokens.map((token) => (
                            <TokenRow
                                key={token.symbol}
                                token={token}
                                onSelect={() => onSelect(token)}
                            />
                        ))}

                        {/* Custom Token Logic */}
                        {isSearchAddress && filteredTokens.length === 0 && (
                            <div className="px-4 py-2">
                                {isTokenLoading ? (
                                    <div className="flex items-center gap-2 text-text-muted text-sm animate-pulse">
                                        <span className="material-symbols-outlined animate-spin">progress_activity</span>
                                        Scanning blockchain...
                                    </div>
                                ) : customToken ? (
                                    <>
                                        <p className="text-xs text-text-muted uppercase tracking-widest mb-2 px-2">Imported Token</p>
                                        <TokenRow token={customToken} onSelect={() => onSelect(customToken)} />
                                    </>
                                ) : (
                                    <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-center">
                                        <p className="text-rose-400 text-sm font-bold">Token Not Found</p>
                                        <p className="text-xs text-rose-400/60 mt-1">Address does not appear to be a valid ERC20.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {!isSearchAddress && filteredTokens.length === 0 && search.length > 0 && (
                            <div className="p-8 text-center text-text-muted">
                                <span className="material-symbols-outlined text-4xl mb-2 opacity-50">search_off</span>
                                <p>No tokens found</p>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}

function TrendingChip({ symbol, change, isPositive }: { symbol: string, change: string, isPositive?: boolean }) {
    return (
        <button className="group flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 border border-white/5 transition-all hover:bg-white/10 hover:border-cyan-400/50 hover:shadow-[0_0_10px_rgba(34,211,238,0.2)]">
            <span className="text-sm font-medium text-white">{symbol}</span>
            <span className={`font-mono text-xs flex items-center ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                <span className="material-symbols-outlined text-[10px] mr-0.5">
                    {isPositive ? 'arrow_upward' : 'arrow_downward'}
                </span>
                {change}
            </span>
        </button>
    )
}

function TokenRow({ token, onSelect }: { token: Token, onSelect: () => void }) {
    const { address } = useAccount();
    const { data: balance } = useBalance({
        address: address,
        token: token.address === "0x0000000000000000000000000000000000000000" ? undefined : token.address,
    });

    const addToWallet = async (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent selection when clicking add
        if (typeof window !== 'undefined' && (window as any).ethereum) {
            try {
                await (window as any).ethereum.request({
                    method: 'wallet_watchAsset',
                    params: {
                        type: 'ERC20',
                        options: {
                            address: token.address,
                            symbol: token.symbol,
                            decimals: token.decimals,
                            image: token.logo,
                        },
                    },
                });
            } catch (error) {
                console.error("Failed to add token to wallet:", error);
            }
        }
    };

    return (
        <div onClick={onSelect} className="group relative flex cursor-pointer items-center justify-between rounded-xl p-4 transition-all duration-300 hover:bg-white/5 border border-transparent hover:border-white/10">
            <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10 group-hover:border-cyan-400/50 transition-colors shadow-lg relative overflow-hidden">
                    {token.logo ? (
                        <Image src={token.logo} alt={token.symbol} fill className="object-cover" unoptimized />
                    ) : (
                        <span className="text-xs font-bold text-white/40">{token.symbol.slice(0, 2)}</span>
                    )}

                    {/* Add to Wallet Button (visible on hover) */}
                    {!token.isNative && (
                        <button
                            onClick={addToWallet}
                            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white/10 hover:bg-cyan-400 border border-black/50 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 hover:scale-110 z-10"
                            title="Add to Wallet"
                        >
                            <span className="material-symbols-outlined text-[10px] text-white">add</span>
                        </button>
                    )}
                </div>
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-white group-hover:text-cyan-200 transition-colors">{token.symbol}</span>
                        {token.type && <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-white/60">{token.type}</span>}
                    </div>
                    <span className="text-sm text-white/40 group-hover:text-white/60 transition-colors max-w-[150px] truncate">{token.name}</span>
                </div>
            </div>
            <div className="flex flex-col items-end gap-0.5">
                <span className="font-mono text-sm font-medium text-white group-hover:text-cyan-300 transition-colors">
                    {balance ? parseFloat(balance.formatted).toFixed(4) : "0.0000"}
                </span>
            </div>
        </div>
    )
}
