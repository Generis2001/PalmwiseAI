"use client";

import { useReadContract, useWriteContract, useBlockNumber } from "wagmi";
import { useAccount } from "wagmi";
import { parseEther } from "viem";
import { ritualWalletAbi } from "@/lib/ritual/abis";
import { RITUAL_WALLET_ADDRESS } from "@/lib/ritual/addresses";

// Minimum required lock ahead-of-current-block for a submission to succeed.
// The RPC rejects if lockUntil < (currentBlock + LOCK_BUFFER).
const LOCK_BUFFER = 50_000n; // ~50k blocks of headroom

export function useRitualWallet() {
  const { address } = useAccount();

  const { data: currentBlock } = useBlockNumber({
    chainId: 1979,
    watch: true,
    query: { refetchInterval: 10_000 },
  });

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: RITUAL_WALLET_ADDRESS,
    abi: ritualWalletAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 10_000 },
  });

  const { data: lockUntil, refetch: refetchLock } = useReadContract({
    address: RITUAL_WALLET_ADDRESS,
    abi: ritualWalletAbi,
    functionName: "lockUntil",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 10_000 },
  });

  const { writeContractAsync } = useWriteContract();

  async function deposit(amountEth: string, lockDurationBlocks: bigint) {
    const tx = await writeContractAsync({
      address: RITUAL_WALLET_ADDRESS,
      abi: ritualWalletAbi,
      functionName: "deposit",
      args: [lockDurationBlocks],
      value: parseEther(amountEth),
    });
    return tx;
  }

  // Extend the lock on an existing deposit (no ETH needed, just re-lock)
  async function extendLock(lockDurationBlocks: bigint) {
    return writeContractAsync({
      address: RITUAL_WALLET_ADDRESS,
      abi: ritualWalletAbi,
      functionName: "deposit",
      args: [lockDurationBlocks],
      value: 0n,
    });
  }

  const balanceEth = balance ? Number(balance) / 1e18 : 0;
  const hasBalance = balanceEth >= 0.4;

  // Lock is valid if lockUntil > currentBlock + LOCK_BUFFER
  const hasActiveLock =
    lockUntil !== undefined &&
    currentBlock !== undefined &&
    lockUntil > currentBlock + LOCK_BUFFER;

  // Both conditions must be met to allow a reading submission
  const hasSufficientFunds = hasBalance && hasActiveLock;

  async function refetchAll() {
    await Promise.all([refetchBalance(), refetchLock()]);
  }

  return {
    balance,
    balanceEth,
    lockUntil,
    currentBlock,
    hasBalance,
    hasActiveLock,
    hasSufficientFunds,
    deposit,
    extendLock,
    refetchBalance: refetchAll,
  };
}
