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

// Polls getTransactionReceipt every intervalMs until a settled Ritual receipt
// (one with spcCalls) is found, or maxAttempts is exhausted.
// RPC errors are swallowed silently so a flaky node never kills the flow.
async function pollForRitualReceipt(
  client: PublicClient,
  hash: `0x${string}`,
  intervalMs = 5_000,
  maxAttempts = 120  // 10 minutes at 5s intervals
): Promise<RitualReceipt> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const receipt = await client.getTransactionReceipt({ hash });
      if (receipt) {
        const ritual = receipt as unknown as RitualReceipt;
        // spcCalls present means Phase 2 (TEE settlement) is complete
        if (ritual.spcCalls && ritual.spcCalls.length > 0) {
          return ritual;
        }
        // Receipt exists but Phase 2 not settled yet — keep polling
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

// Polls until a basic receipt exists (for non-async txs like the lock deposit).
async function pollForReceipt(
  client: PublicClient,
  hash: `0x${string}`,
  intervalMs = 3_000,
  maxAttempts = 40  // 2 minutes
): Promise<void> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const receipt = await client.getTransactionReceipt({ hash });
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

      try {
        // Step 1: Compress palm image to ≤512px JPEG
        setStatus("compressing");
        const base64Image = await compressPalmImage(file);

        // Step 2: Analyze palm features using client-side Canvas analysis
        setStatus("analyzing");
        const description = await buildPalmDescription(base64Image);

        // Step 3: Fetch active LLM executor from Ritual TEEServiceRegistry
        setStatus("fetching-executor");
        const execRes = await fetch("/api/executor");
        if (!execRes.ok) throw new Error("No active LLM executor available");
        const { executor } = await execRes.json() as { executor: `0x${string}` };

        // Step 4: Ensure RitualWallet lock is active before submission.
        // The Ritual RPC rejects async payloads when lockUntil <= currentBlock + ttl.
        const currentBlock = await publicClient.getBlockNumber();
        const lockUntil = await publicClient.readContract({
          address: RITUAL_WALLET_ADDRESS,
          abi: ritualWalletAbi,
          functionName: "lockUntil",
          args: [address],
        });
        if (lockUntil <= currentBlock + 300n) {
          setStatus("locking");
          const lockTx = await writeContractAsync({
            address: RITUAL_WALLET_ADDRESS,
            abi: ritualWalletAbi,
            functionName: "deposit",
            args: [LOCK_DURATION],
            value: parseEther("0.001"),
          });
          await pollForReceipt(publicClient, lockTx);
        }

        // Step 5: Generate ephemeral keypair — TEE encrypts result to userPublicKey
        const { publicKey: userPublicKey, privateKey: ephemeralPrivKey } =
          generateEphemeralKeypair();
        localStorage.setItem(`palmwise_privkey_${address}`, ephemeralPrivKey);

        // Step 6: Encode LLM precompile input (30-field ABI)
        const llmInput = encodeLLMRequest({ executor, userPublicKey, prompt: description });

        // Step 7: Send transaction — immediately returns hash, does NOT wait for receipt.
        // Ritual async settlement can take 2-5+ minutes; we poll manually below.
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

        // Step 8: Poll for receipt manually — never fails due to RPC timeout.
        // getTransactionReceipt errors are swallowed; only spcCalls signals completion.
        setStatus("processing");
        const ritualReceipt = await pollForRitualReceipt(publicClient, hash);

        setStatus("settling");
        const spcCalls = ritualReceipt.spcCalls;
        if (!spcCalls || spcCalls.length === 0) {
          throw new Error("No SPC result in receipt — LLM precompile may have failed");
        }

        // Step 9: Decode and decrypt the reading
        const decoded = decodeReading(spcCalls[0].output, ephemeralPrivKey);
        setReading(decoded);

        const READING_CREATED_TOPIC =
          "0x215c21c305c637e50dca2824eee5aad96446a1273047552aed48959e24833c77";
        const event = ritualReceipt.logs?.find((log) =>
          (log as { topics?: string[] }).topics?.[0] === READING_CREATED_TOPIC
        );
        const onChainHash = event
          ? (event as { topics: string[] }).topics[2]
          : null;

        // Always persist — use on-chain hash if found, fall back to txHash so the
        // record is always created regardless of whether Ritual exposes event logs.
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
        }).catch(() => {}); // best-effort — don't let a DB error abort the reading display

        setStatus("complete");
        return { reading: decoded, hash: savedHash, txHash: hash };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setFailedAt(status);
        setError(msg);
        // Do not mark as failed if we already have a txHash — tx was submitted
        // and is still processing on-chain. Keep status as-is so user sees context.
        if (!txHash) {
          setStatus("failed");
        }
        throw err;
      }
    },
    [address, publicClient, writeAsync, writeContractAsync, status, txHash]
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
