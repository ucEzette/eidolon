"use client";

import { useState } from "react";

export function TokenSelector({ onClose }: { onClose: () => void }) {
    const [search, setSearch] = useState("");

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background-dark/80 backdrop-blur-sm">
            {/* Abstract Background Elements */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-primary/20 blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-cyan-500/10 blur-[120px]"></div>
                {/* Grid Pattern Overlay */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-150 contrast-150"></div>
            </div>

            {/* Modal Wrapper (Gradient Border) */}
            <div className="relative z-10 w-full max-w-[520px] rounded-[2rem] p-[1px] bg-gradient-to-br from-cyan-400 via-primary to-violet-900 shadow-[0_0_40px_-10px_rgba(116,61,245,0.4)] transition-all duration-500 hover:shadow-[0_0_60px_-10px_rgba(34,211,238,0.3)]">
                {/* Modal Content (Glass) */}
                <div className="glass-panel relative flex h-[700px] w-full flex-col overflow-hidden rounded-[2rem] bg-[rgba(21,16,34,0.85)] backdrop-blur-2xl">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
                        <h2 className="text-xl font-bold tracking-tight text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">Summon Asset</h2>
                        <button
                            onClick={onClose}
                            className="group flex h-8 w-8 items-center justify-center rounded-full bg-white/5 transition-colors hover:bg-white/10 text-white/70 hover:text-white"
                        >
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>

                    {/* Search Section */}
                    <div className="px-6 pt-6 pb-2">
                        <div className="relative group/search">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-cyan-200/50 group-focus-within/search:text-cyan-400 transition-colors">
                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>search</span>
                            </div>
                            <input
                                className="w-full h-12 rounded-full bg-[#0a0812]/60 border border-white/10 pl-11 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/50 focus:shadow-[0_0_15px_rgba(34,211,238,0.2)] transition-all duration-300 font-display"
                                placeholder="Search by name or paste address"
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Trending Chips */}
                    <div className="px-6 py-4">
                        <p className="mb-3 text-xs font-medium uppercase tracking-widest text-white/40">Trending Vessels</p>
                        <div className="flex flex-wrap gap-2">
                            {/* Chip 1 */}
                            <button className="group flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 border border-white/5 transition-all hover:bg-white/10 hover:border-primary/50 hover:shadow-[0_0_10px_rgba(116,61,245,0.2)]">
                                <div className="h-5 w-5 rounded-full bg-center bg-cover" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBJeUfpxn9sf1OQKlqBKsk6CQdbIWbHJ6Di51IstLpgFKvo7TFy1OBhFhAUKfVmyjfv68E29y-yKe1HuAhs_OPYQdBFeyudzO2QXk5KQElKSNVHdPK3ssiKLbhy2hwJzMUcALqtJTVMW6EugFvhDkIOdDMjqvJcHSIThcn407ht_KhGXb6P1ReOS--0-kGFkVqLxMYI5NvqEBs_Jia4HhXOfEFYnbHrXET0mA5_66SIRRW1nYPbH6cYjxkXPWZBDDQp5Ppenezd9aY')" }}></div>
                                <span className="text-sm font-medium text-white">ETH</span>
                                <span className="font-mono text-xs text-green-400 flex items-center">
                                    <span className="material-symbols-outlined text-[10px] mr-0.5">arrow_upward</span>1.2%
                                </span>
                            </button>
                            {/* Chip 2 */}
                            <button className="group flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 border border-white/5 transition-all hover:bg-white/10 hover:border-cyan-400/50 hover:shadow-[0_0_10px_rgba(34,211,238,0.2)]">
                                <div className="h-5 w-5 rounded-full bg-center bg-cover" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBj4ALQseLz_1wJKqngn9rT3lNOzwxWTvfRDEQ6v2IcbfgM7wjpnMoXVRD4Ymm16uxQBkElJ2v3eImLCob_Y7exuDXeWy-vogP3ccK6nWQkByKSfVlfcpf4VlRqqpZVg18JvFPQnYdmWKisiSPhaKetJvTIhexpdiv0LS-Oo1Tqi4G8qkrYuCKXZcKLuSxafimyJBC_qcEG8z6nQPibA1eT1gXwHbzbq9QzWNhZoPEWUSjisIHGTAajk2yqMdUlHKRSE3ztclfA1cM')" }}></div>
                                <span className="text-sm font-medium text-white">USDC</span>
                                <span className="font-mono text-xs text-green-400 flex items-center">
                                    <span className="material-symbols-outlined text-[10px] mr-0.5">arrow_upward</span>0.01%
                                </span>
                            </button>
                            {/* Chip 3 */}
                            <button className="group flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 border border-white/5 transition-all hover:bg-white/10 hover:border-pink-500/50 hover:shadow-[0_0_10px_rgba(236,72,153,0.2)]">
                                <div className="h-5 w-5 rounded-full bg-center bg-cover" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuB5W91zOXFXRhggoT-BusU1JOlAbGH8ePTZRGA8hnSI1k-eYLf0ro1sf3iIDnQRc2Zbu63NLOdj2XNqnesdRCOXcxFzNvZ5k4LjLrTwUFEMAlwwwvSJ_1skgYKVKRTxZUl8Z0QWt1EvjxupVZuJK3uLvoLKuuOT-xVZe3-nJ8qVkUB6gU0vFd9qMLv4TxohvofP7FQKKjz4cYjGjNTk2OS5cdU60mOVZI12dc3K7KJioTS7yiuTZsAqG2P7OK7xwZenpZAAJ02AVMU')" }}></div>
                                <span className="text-sm font-medium text-white">OP</span>
                                <span className="font-mono text-xs text-red-400 flex items-center">
                                    <span className="material-symbols-outlined text-[10px] mr-0.5">arrow_downward</span>2.4%
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Token List */}
                    <div className="flex-1 overflow-y-auto px-2 pb-4">
                        <div className="flex flex-col gap-1">
                            {/* List Item 1: ETH */}
                            <div className="group relative flex cursor-pointer items-center justify-between rounded-xl p-4 transition-all duration-300 hover:bg-gradient-to-r hover:from-primary/10 hover:to-cyan-400/5 hover:border-white/5 border border-transparent">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <div className="h-10 w-10 rounded-full bg-zinc-800 bg-cover bg-center shadow-lg ring-1 ring-white/10 group-hover:ring-primary/50 transition-all" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuC_a30ir7I_PaWVHlB3sk-V126yTQBWCqdrnEcNbvOYBRkk_dmgqhgdtDW41p_d0MOXTJwzxhvh3qROyexVo0QYZQZmULXo6yBo03TCXsnsRL3GkAh5rpJnUoYIql459IfLAe_xUzrbmT6qeog3-ILnWrWTuPidXEWDZY86qV2xUMSUEDCG5vPVdwE-kwvR5iz7XKe6khLsTUYbnIUnQtvlHreMKuC-Jpgqjh_Xqk88WtwhfO653RFFkZPxcTIvxid0Vsc8U536u5g')" }}></div>
                                        <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-900 ring-2 ring-[#151022]">
                                            <div className="h-full w-full rounded-full bg-center bg-cover" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDK5-ElfzPYA5iAnjELoCqnG17SU4XOUSEz0z7gT5Ejadb0dtMgLFeJyapKYr96B-ugD8A-LLZTpTsTsitBiEMS1B_0bFrWb1yArluPlGPkYrnF7vOn9P8ocAd-INNOyu_eGWhh9lL47_KsiaxEn8KT0to4UfDf6PB_oh-D8oDQuQ2vvO5iyf4G2sOUqG-u5QVAwpc2YcKsoCPQHWqOAO4MVOau9MV5Phtk9Zj6lyD0kLs-heFmpI-YvOwBee246c9da2zcePKeFOE')" }}></div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="text-base font-bold text-white group-hover:text-cyan-200 transition-colors">ETH</span>
                                            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-white/60">LAYER 1</span>
                                        </div>
                                        <span className="text-sm text-white/40 group-hover:text-white/60 transition-colors">Ethereum</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-0.5">
                                    <span className="font-mono text-sm font-medium text-white group-hover:text-cyan-300 transition-colors drop-shadow-[0_0_5px_rgba(34,211,238,0.3)]">14.0532</span>
                                    <span className="font-mono text-xs text-white/40 group-hover:text-white/60">$24,203.44</span>
                                </div>
                            </div>
                            {/* List Item 2: USDC */}
                            <div className="group relative flex cursor-pointer items-center justify-between rounded-xl p-4 transition-all duration-300 hover:bg-gradient-to-r hover:from-primary/10 hover:to-cyan-400/5 hover:border-white/5 border border-transparent">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <div className="h-10 w-10 rounded-full bg-zinc-800 bg-cover bg-center shadow-lg ring-1 ring-white/10 group-hover:ring-cyan-400/50 transition-all" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBiqYhAl6t4j8sA8TFPDk_HuQFZ68clqdYwGxiRsqAmf-babk414b_vZ4fN6gF_R9sAwBTHPAmmBasfDVcdZb3IDWfY9gZ8FFrNIuLFLp3XrdGpHl0NqtZSTczCQpWei_RE_1jnkV1tWyyJkoSu284zhkaHImFc-iDXgy_I1jNsNJv8m4GRHQ3yim4FDlvasthr-zjw4VEWUIStjcKKa58FRVTXKSlt0pxY1yO6Y065aTIyx2So5HhijOXt4fsUM_IFGYyb_9q57oQ')" }}></div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-base font-bold text-white group-hover:text-cyan-200 transition-colors">USDC</span>
                                        <span className="text-sm text-white/40 group-hover:text-white/60 transition-colors">USD Coin</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-0.5">
                                    <span className="font-mono text-sm font-medium text-white group-hover:text-cyan-300 transition-colors">2,400.00</span>
                                    <span className="font-mono text-xs text-white/40 group-hover:text-white/60">$2,400.00</span>
                                </div>
                            </div>
                            {/* List Item 3: ARB */}
                            <div className="group relative flex cursor-pointer items-center justify-between rounded-xl p-4 transition-all duration-300 hover:bg-gradient-to-r hover:from-primary/10 hover:to-cyan-400/5 hover:border-white/5 border border-transparent">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <div className="h-10 w-10 rounded-full bg-zinc-800 bg-cover bg-center shadow-lg ring-1 ring-white/10 group-hover:ring-cyan-400/50 transition-all" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCG9F6BedmjDzqk4s4QvKh7IEADxWY1nyEaQKid6L60-X6LhHSyU3vfRdOjipvXocVw_g1a6d2DJAga5yKczhJqr9C5W17jHRckp_PIInsSVpuN7q67lZdABE03STYhLbMWU1zRr1qCh9AoU0z4ZwUynvqDyNmnzK98jaO57lTsrYhRDderIIy4S38VrwFWWcmoDywVjuHy__cVoYzeaL5dwTi56slovNoc-N_fDlQo9BYEmT0iT8YEm3JkCxPxr_dzoXXrZ-5ENgs')" }}></div>
                                        <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-900 ring-2 ring-[#151022]">
                                            <div className="h-full w-full rounded-full bg-center bg-cover" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDTM7U35KDSF6Nvj9eUwQiS866JfkrlwzxsR5176IJ1PFflhO_Ltvc3N5nOoDmaUaieD4bzFW7vagG_-EDUckrLE_JSos3uXKVXOj0xy6Tlkeq_Ze1NogyCDTZfUFwXNY6nN-KN-k-dAVVfEauKu0IzTPFAm2Igju1VGeLX3zWs24MH89darjBJnqakM_SwTdbW28hfRteG9wJNXnyXs4kreJ2PzkUMeRkbK1BB_bH5jbadGutwv5tPhkP5pXfoIcj0v9zNe_6-oKw')" }}></div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="text-base font-bold text-white group-hover:text-cyan-200 transition-colors">ARB</span>
                                            <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary border border-primary/20">L2</span>
                                        </div>
                                        <span className="text-sm text-white/40 group-hover:text-white/60 transition-colors">Arbitrum</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-0.5">
                                    <span className="font-mono text-sm font-medium text-white group-hover:text-cyan-300 transition-colors">5,230.50</span>
                                    <span className="font-mono text-xs text-white/40 group-hover:text-white/60">$6,119.68</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Gradient Fade */}
                    <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#151022] to-transparent"></div>
                </div>
            </div>
        </div>
    );
}
