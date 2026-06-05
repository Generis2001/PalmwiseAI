"use client";

import { useState, useCallback } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { compressPalmImage } from "@/lib/imageUtils";
import { buildPalmDescription } from "@/lib/palmAnalyzer";
import { encodeLLMRequest } from "@/lib/ritual/encodeLLMRequest";
import { decodeReading, type PalmReading, type RitualReceipt } from "@/lib/ritual/decodeReading";
import { generateEphemeralKeypair } from "@/lib/ecies";
import { palmWiseAbi, ritualWalletAbi } from "@/lib/ritual/abis";
import { RITUAL_WALLET_ADDRESS } from "@/lib/ritual/addresses";
import { useRitualWrite } from "./useRitualWrite";

const PALMWISE_CONTRACT = process.env
  .NEXT_PUBLIC_PALMWISE_CONTRACT_ADDRESS as `0x${string}`;

// How many blocks ahead the lock must extend past the TTL.
// TTL in the LLM request is 300 blocks; we lock for 100k blocks (~14 hrs).
const LOCK_DURATION = 100_000n;

export type ReadingStatus =
  | "idle"
  | "compressing"
  | "analyzing"
  | "fetching-executor"
  | "locking"
  | "submitting"
  | "committed"
  | "processing"
  | "settling"
  | "complete"
  | "failed";

export function usePalmReading() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeAsync } = useRitualWrite();
  const { writeContractAsync } = useWriteContract();

  const [status, setStatus] = useState<ReadingStatus>("idle");
  const [reading, setReading] = useState<PalmReading | null>(null);
  const [readingHash, setReadingHash] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [failedAt, setFailedAt] = useState<ReadingStatus | null>(null);

  const submitReading = useCallback(
    async (file: File) => {
      if (!address) throw new Error("Wallet not connected");
      setError(null);
      setReading(null);
      setReadingHash(null);

      try {
        // Step 1: Compress palm image to ≤512px JPEG
        setStatus("compressing");
        const base64Image = await compressPalmImage(file);

        // Step 2: Analyze palm features using client-side Canvas analysis (no API calls)
        setStatus("analyzing");
        const description = await buildPalmDescription(base64Image);

        // Step 3: Fetch active LLM executor from Ritual TEEServiceRegistry
        setStatus("fetching-executor");
        const execRes = await fetch("/api/executor");
        if (!execRes.ok) throw new Error("No active LLM executor available");
        const { executor } = await execRes.json() as {
          executor: `0x${string}`;
        };

        // Step 4: Ensure RitualWallet lock is active.
        // The Ritual RPC rejects async payloads when lockUntil <= currentBlock + ttl.
        // If lock is missing or expired, call deposit(LOCK_DURATION) with 0 value
        // (this only extends the lock; no additional ETH is sent).
        if (!publicClient) throw new Error("No public client");
        const currentBlock = await publicClient.getBlockNumber();
        const lockUntil = await publicClient.readContract({
          address: RITUAL_WALLET_ADDRESS,
          abi: ritualWalletAbi,
          functionName: "lockUntil",
          args: [address],
        });
        // Require lock to extend at least 300 blocks (the LLM request TTL) past now
        if (lockUntil <= currentBlock + 300n) {
          setStatus("locking");
          const lockTx = await writeContractAsync({
            address: RITUAL_WALLET_ADDRESS,
            abi: ritualWalletAbi,
            functionName: "deposit",
            args: [LOCK_DURATION],
            value: 0n,
          });
          await publicClient.waitForTransactionReceipt({ hash: lockTx });
        }

        const { publicKey: userPublicKey, privateKey: ephemeralPrivKey } =
          generateEphemeralKeypair();
        // Persist privKey so reading/[hash] page can decrypt even after navigation
        localStorage.setItem(`palmwise_privkey_${address}`, ephemeralPrivKey);

        // Step 5: Encode LLM precompile input (30-field ABI)
        // Canvas-analyzed palm description becomes the user prompt; GLM-4.7-FP8 generates the structured reading
        const llmInput = encodeLLMRequest({
          executor,
          userPublicKey,
          prompt: description,
        });

        // Step 6: Send transaction (bypasses eth_call simulation via useRitualWrite)
        setStatus("submitting");
        const hash = await writeAsync({
          address: PALMWISE_CONTRACT,
          abi: palmWiseAbi as never,
          functionName: "submitReading",
          args: [llmInput],
          gas: 3_000_000n,
        });
        setTxHash(hash);
        setStatus("committed");

        // Step 7: Wait for receipt and extract spcCalls result
        setStatus("processing");
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        setStatus("settling");
        const ritualReceipt = receipt as unknown as RitualReceipt;
        const spcCalls = ritualReceipt.spcCalls;
        if (!spcCalls || spcCalls.length === 0) {
          throw new Error("No SPC result in receipt — LLM precompile may have failed");
        }

        // Step 8: Decode and decrypt the reading
        const decoded = decodeReading(spcCalls[0].output, ephemeralPrivKey);
        setReading(decoded);

        // Derive the hash from the on-chain ReadingCreated event
        // keccak256("ReadingCreated(address,bytes32,uint256)")
        // keccak256("ReadingCreated(address,bytes32,uint256)")
      const READING_CREATED_TOPIC =
        "0x215c21c305c637e50dca2824eee5aad96446a1273047552aed48959e24833c77";
        const event = receipt.logs.find((log) =>
          (log as { topics?: string[] }).topics?.[0] === READING_CREATED_TOPIC
        );
        const onChainHash = event
          ? (event as { topics: string[] }).topics[2]
          : null;

        if (onChainHash) {
          setReadingHash(onChainHash);
          // Step 9: Persist encrypted reading to Neon
          await fetch("/api/readings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userAddress: address,
              readingHash: onChainHash,
              encryptedReading: spcCalls[0].output,
              txHash: hash,
              blockNumber: Number(receipt.blockNumber),
              archetype: decoded.archetype,
            }),
          });
        }

        setStatus("complete");
        return { reading: decoded, hash: onChainHash, txHash: hash };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setFailedAt(status);
        setError(msg);
        setStatus("failed");
        throw err;
      }
    },
    [address, publicClient, writeAsync, writeContractAsync]
  );

  function reset() {
    setStatus("idle");
    setReading(null);
    setReadingHash(null);
    setTxHash(null);
    setError(null);
    setFailedAt(null);
  }

  return { submitReading, status, reading, readingHash, txHash, error, failedAt, reset };
}
