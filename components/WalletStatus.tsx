"use client";

import { useRitualWallet } from "@/hooks/useRitualWallet";
import { useState } from "react";

export function WalletStatus() {
  const {
    balanceEth,
    hasBalance,
    hasActiveLock,
    lockUntil,
    currentBlock,
    deposit,
    extendLock,
    refetchBalance,
  } = useRitualWallet();
  const [depositing, setDepositing] = useState(false);
  const [locking, setLocking] = useState(false);

  const LOCK_DURATION = 100_000n;

  async function handleDeposit() {
    setDepositing(true);
    try {
      await deposit("0.4", LOCK_DURATION);
      await refetchBalance();
    } catch {
      // user rejected or failed
    } finally {
      setDepositing(false);
    }
  }

  async function handleExtendLock() {
    setLocking(true);
    try {
      await extendLock(LOCK_DURATION);
      await refetchBalance();
    } catch {
      // user rejected or failed
    } finally {
      setLocking(false);
    }
  }

  const locksAtBlock = lockUntil ? Number(lockUntil) : 0;
  const currentBlockNum = currentBlock ? Number(currentBlock) : 0;
  const blocksLeft = Math.max(0, locksAtBlock - currentBlockNum);

  if (!hasBalance) {
    return (
      <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 flex items-center justify-between gap-4 text-sm">
        <div>
          <span className="text-gray-400">RITUAL balance:</span>{" "}
          <span className="font-mono font-semibold text-yellow-400">
            {balanceEth.toFixed(4)} RITUAL
          </span>
          <p className="text-xs text-yellow-500/80 mt-0.5">
            Deposit to enable readings
          </p>
        </div>
        <button
          onClick={handleDeposit}
          disabled={depositing}
          className="px-3 py-1.5 rounded-md bg-yellow-500 text-black text-xs font-bold hover:bg-yellow-400 disabled:opacity-50 transition-colors"
        >
          {depositing ? "Depositing…" : "Deposit 0.4 RITUAL"}
        </button>
      </div>
    );
  }

  if (!hasActiveLock) {
    return (
      <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 px-4 py-3 flex items-center justify-between gap-4 text-sm">
        <div>
          <span className="text-gray-400">RITUAL balance:</span>{" "}
          <span className="font-mono font-semibold text-[#19D184]">
            {balanceEth.toFixed(4)} RITUAL
          </span>
          <p className="text-xs text-orange-400/80 mt-0.5">
            Lock expired — activate to avoid submission errors
          </p>
        </div>
        <button
          onClick={handleExtendLock}
          disabled={locking}
          className="px-3 py-1.5 rounded-md bg-orange-500 text-black text-xs font-bold hover:bg-orange-400 disabled:opacity-50 transition-colors"
        >
          {locking ? "Activating…" : "Activate Lock"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#19D184]/30 bg-[#19D184]/5 px-4 py-3 flex items-center justify-between gap-4 text-sm">
      <div>
        <span className="text-gray-400">RITUAL balance:</span>{" "}
        <span className="font-mono font-semibold text-[#19D184]">
          {balanceEth.toFixed(4)} RITUAL
        </span>
        {blocksLeft > 0 && (
          <p className="text-xs text-gray-500 mt-0.5">
            Lock active · {blocksLeft.toLocaleString()} blocks remaining
          </p>
        )}
      </div>
    </div>
  );
}
