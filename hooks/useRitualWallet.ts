"use client";

import { useReadContract, useWriteContract } from "wagmi";
import { useAccount } from "wagmi";
import { parseEther } from "viem";
import { ritualWalletAbi } from "@/lib/ritual/abis";
import { RITUAL_WALLET_ADDRESS } from "@/lib/ritual/addresses";

export function useRitualWallet() {
  const { address } = useAccount();

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: RITUAL_WALLET_ADDRESS,
    abi: ritualWalletAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 10_000 },
  });

  const { data: lockUntil } = useReadContract({
    address: RITUAL_WALLET_ADDRESS,
    abi: ritualWalletAbi,
    functionName: "lockUntil",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 10_000 },
  });

  const { writeContractAsync } = useWriteContract();

  async function deposit(amountEth: string, lockDurationBlocks: bigint) {
    return writeContractAsync({
      address: RITUAL_WALLET_ADDRESS,
      abi: ritualWalletAbi,
      functionName: "deposit",
      args: [lockDurationBlocks],
      value: parseEther(amountEth),
    });
  }

  const balanceEth = balance ? Number(balance) / 1e18 : 0;
  const hasSufficientFunds = balanceEth >= 0.02;

  return { balance, balanceEth, lockUntil, deposit, hasSufficientFunds, refetchBalance };
}
