"use client";

import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { ritualChain } from "@/lib/ritual/chain";

export function ChainGuard() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  if (!isConnected || chainId === ritualChain.id) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="max-w-sm w-full rounded-xl bg-gray-900 border border-gray-800 p-6 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
          <span className="text-yellow-400 text-xl font-bold">!</span>
        </div>
        <h2 className="text-lg font-bold text-white">Wrong Network</h2>
        <p className="text-sm text-gray-400 leading-relaxed">
          PalmWise AI runs on{" "}
          <span className="text-[#19D184] font-semibold">Ritual Chain</span>{" "}
          (Chain ID 1979). Switch to continue.
        </p>
        <button
          onClick={() => switchChain({ chainId: ritualChain.id })}
          className="w-full py-3 rounded-xl bg-[#19D184] text-black font-bold text-sm hover:bg-[#16c077] transition-colors"
        >
          Switch to Ritual Chain
        </button>
        <p className="text-xs text-gray-600">
          If the chain isn&apos;t in your wallet yet, your wallet will prompt
          you to add it automatically.
        </p>
      </div>
    </div>
  );
}
