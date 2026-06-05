"use client";

import { useSendTransaction, usePublicClient } from "wagmi";
import { encodeFunctionData } from "viem";
import type { Abi } from "viem";

// Wraps useSendTransaction to bypass eth_call simulation.
// writeContractAsync simulates via eth_call which reverts on SPC precompile addresses.
// Use this hook for any contract function that calls an async precompile.
export function useRitualWrite() {
  const { sendTransactionAsync, isPending, error } = useSendTransaction();
  const publicClient = usePublicClient();

  async function writeAsync({
    address,
    abi,
    functionName,
    args,
    gas,
  }: {
    address: `0x${string}`;
    abi: Abi;
    functionName: string;
    args: unknown[];
    gas?: bigint;
  }): Promise<`0x${string}`> {
    const data = encodeFunctionData({ abi, functionName, args } as Parameters<typeof encodeFunctionData>[0]);
    const hash = await sendTransactionAsync({
      to: address,
      data,
      gas: gas ?? 3_000_000n,
    });
    return hash;
  }

  async function waitForReceipt(hash: `0x${string}`) {
    if (!publicClient) throw new Error("No public client");
    return publicClient.waitForTransactionReceipt({ hash });
  }

  return { writeAsync, waitForReceipt, isPending, error };
}
