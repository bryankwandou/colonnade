"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Wallet } from "lucide-react";

export function WalletPill() {
  const { publicKey, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();

  if (publicKey) {
    const key = publicKey.toBase58();
    return (
      <button
        onClick={() => void disconnect()}
        title={`${key} — click to disconnect`}
        className="inline-flex items-center gap-2 rounded-lg border border-brass-400/35 bg-brass-400/12 px-3 py-1.5 font-mono text-[0.75rem] text-brass-300 transition hover:border-brass-400/60"
      >
        <span className="size-1.5 rounded-full bg-verdigris-400" />
        {key.slice(0, 4)}…{key.slice(-4)}
      </button>
    );
  }

  return (
    <button
      onClick={() => setVisible(true)}
      disabled={connecting}
      className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/4 px-3 py-1.5 text-[0.8rem] text-stone-200 transition hover:border-white/25 hover:text-stone-50 disabled:opacity-60"
    >
      <Wallet className="size-3.5" />
      <span className="hidden sm:inline">{connecting ? "Connecting" : "Connect"}</span>
    </button>
  );
}
