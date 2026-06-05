"use client";

import { useRitualWallet } from "@/hooks/useRitualWallet";
import { useState } from "react";

export function WalletStatus() {
  const { balanceEth, deposit, hasSufficientFunds, refetchBalance } =
    useRitualWallet();
  const [depositing, setDepositing] = useState(false);

  async function handleDeposit() {
    setDepositing(true);
    try {
      await deposit("0.02", 5000n);
      await refetchBalance();
    } catch {
      // user rejected or failed
    } finally {
      setDepositing(false);
    }
  }

  return (
    <div
      className={`rounded-lg border px-4 py-3 flex items-center justify-between gap-4 text-sm ${
        hasSufficientFunds
          ? "border-[#19D184]/30 bg-[#19D184]/5"
          : "border-yellow-500/30 bg-yellow-500/5"
      }`}
    >
      <div>
        <span className="text-gray-400">RITUAL balance:</span>{" "}
        <span
          className={`font-mono font-semibold ${
            hasSufficientFunds ? "text-[#19D184]" : "text-yellow-400"
          }`}
        >
          {balanceEth.toFixed(4)} RITUAL
        </span>
      </div>
      {!hasSufficientFunds && (
        <button
          onClick={handleDeposit}
          disabled={depositing}
          className="px-3 py-1.5 rounded-md bg-yellow-500 text-black text-xs font-bold hover:bg-yellow-400 disabled:opacity-50 transition-colors"
        >
          {depositing ? "Depositing…" : "Deposit 0.02 RITUAL"}
        </button>
      )}
    </div>
  );
}
