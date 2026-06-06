"use client";

import { useState, useCallback } from "react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { compressPalmImage } from "@/lib/imageUtils";
import { buildPalmDescription } from "@/lib/palmAnalyzer";
import { encodeLLMRequest } from "@/lib/ritual/encodeLLMRequest";
import { decodeReading, type PalmReading, type RitualReceipt } from "@/lib/ritual/decodeReading";
import { generateEphemeralKeypair } from "@/lib/ecies";
import { parseEther } from "viem";
import { palmWiseAbi, ritualWalletAbi } from "@/lib/ritual/abis";
import { RITUAL_WALLET_ADDRESS } from "@/lib/ritual/addresses";
import { useRitualWrite } from "./useRitualWrite";

type PublicClient = NonNullable<ReturnType<typeof usePublicClient>>;

const PALMWISE_CONTRACT = process.env
  .NEXT_PUBLIC_PALMWISE_CONTRACT_ADDRESS as `0x${string}`;

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

// Uses raw eth_getTransactionReceipt via the RPC proxy so Ritual-specific
// fields like spcCalls are preserved — viem's parser strips unknown fields.
async function rawReceipt(hash: string): Promise<RitualReceipt | null> {
  const res = await fetch("/api/rpc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_getTransactionReceipt",
      params: [hash],
      id: 1,
    }),
  });
  const data = (await res.json()) as { result?: RitualReceipt };
  return data.result ?? null;
}

async function pollForRitualReceipt(
  hash: `0x${string}`,
  intervalMs = 5_000,
  maxAttempts = 120
): Promise<RitualReceipt> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const receipt = await rawReceipt(hash);
      if (receipt?.spcCalls && receipt.spcCalls.length > 0) {
        return receipt;
      }
    } catch {
      // RPC hiccup — swallow and retry
    }
    await new Promise((res) => setTimeout(res, intervalMs));
  }
  throw new Error(
    "Your reading is still being processed on-chain. " +
      `Transaction ${hash} was submitted — check your history in a few minutes.`
  );
}

async function pollForReceipt(
  hash: `0x${string}`,
  intervalMs = 3_000,
  maxAttempts = 40
): Promise<void> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const receipt = await rawReceipt(hash);
      if (receipt) return;
    } catch {
      // swallow
    }
    await new Promise((res) => setTimeout(res, intervalMs));
  }
}

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
      if (!publicClient) throw new Error("No public client");
      setError(null);
      setReading(null);
      setReadingHash(null);

      let currentStep: ReadingStatus = "idle";
      try {
        // Step 1: Compress palm image to ≤512px JPEG
        setStatus("compressing");
        currentStep = "compressing";
        const base64Image = await compressPalmImage(file);

        // Step 2: Canvas-based palm analysis → text description for GLM
        setStatus("analyzing");
        currentStep = "analyzing";
        const description = await buildPalmDescription(base64Image);

        // Step 3: Fetch active LLM executor from Ritual TEEServiceRegistry
        setStatus("fetching-executor");
        currentStep = "fetching-executor";
        const execRes = await fetch("/api/executor");
        if (!execRes.ok) throw new Error("No active LLM executor available");
        const { executor } = (await execRes.json()) as { executor: `0x${string}` };

        // Step 4: Ensure RitualWallet lock covers the submission TTL
        const currentBlock = await publicClient.getBlockNumber();
        const lockUntil = (await publicClient.readContract({
          address: RITUAL_WALLET_ADDRESS,
          abi: ritualWalletAbi,
          functionName: "lockUntil",
          args: [address],
        })) as bigint;

        if (lockUntil <= currentBlock + 300n) {
          setStatus("locking");
          currentStep = "locking";
          const lockTx = await writeContractAsync({
            address: RITUAL_WALLET_ADDRESS,
            abi: ritualWalletAbi,
            functionName: "deposit",
            args: [LOCK_DURATION],
            value: parseEther("0.001"), // must be > 0 or lockUntil stays unchanged
          });
          await pollForReceipt(lockTx);
        }

        // Step 5: Ephemeral keypair — TEE encrypts response to userPublicKey
        const { publicKey: userPublicKey, privateKey: ephemeralPrivKey } =
          generateEphemeralKeypair();
        localStorage.setItem(`palmwise_privkey_${address}`, ephemeralPrivKey);

        // Step 6: Encode 30-field LLM precompile ABI
        const llmInput = encodeLLMRequest({ executor, userPublicKey, prompt: description });

        // Step 7: Submit tx — hash returned immediately, Phase 2 settles async
        setStatus("submitting");
        currentStep = "submitting";
        const hash = await writeAsync({
          address: PALMWISE_CONTRACT,
          abi: palmWiseAbi as never,
          functionName: "submitReading",
          args: [llmInput],
          gas: 3_000_000n,
        });
        setTxHash(hash);
        setStatus("committed");
        currentStep = "committed";

        // Step 8: Poll for Phase 2 — spcCalls populated = TEE settled
        setStatus("processing");
        currentStep = "processing";
        const ritualReceipt = await pollForRitualReceipt(hash);

        setStatus("settling");
        currentStep = "settling";
        const spcCalls = ritualReceipt.spcCalls;
        if (!spcCalls || spcCalls.length === 0) {
          throw new Error("No SPC result in receipt — LLM precompile may have failed");
        }

        // Step 9: Decrypt and parse reading
        const decoded = decodeReading(spcCalls[0].output, ephemeralPrivKey);
        setReading(decoded);

        // Extract on-chain hash from ReadingCreated event if available
        const READING_CREATED_TOPIC =
          "0x215c21c305c637e50dca2824eee5aad96446a1273047552aed48959e24833c77";
        const event = ritualReceipt.logs?.find(
          (log) => (log as { topics?: string[] }).topics?.[0] === READING_CREATED_TOPIC
        );
        const onChainHash = event
          ? (event as { topics: string[] }).topics[2]
          : null;

        // Always persist — use txHash as fallback if event log not exposed
        const savedHash = onChainHash ?? hash;
        setReadingHash(savedHash);
        await fetch("/api/readings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userAddress: address,
            readingHash: savedHash,
            encryptedReading: spcCalls[0].output,
            palmImage: base64Image,
            txHash: hash,
            blockNumber: Number(ritualReceipt.blockNumber),
            archetype: decoded.archetype,
          }),
        }).catch(() => {});

        setStatus("complete");
        return { reading: decoded, hash: savedHash, txHash: hash };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setFailedAt(currentStep);
        setError(msg);
        // Don't overwrite status if tx was already submitted — user needs context
        if (!txHash) {
          setStatus("failed");
        }
        throw err;
      }
    },
    [address, publicClient, writeAsync, writeContractAsync, txHash]
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
