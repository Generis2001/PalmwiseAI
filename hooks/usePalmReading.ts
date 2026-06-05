"use client";

import { useState, useCallback } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { encodeFunctionData } from "viem";
import { compressPalmImage } from "@/lib/imageUtils";
import { encodeLLMRequest } from "@/lib/ritual/encodeLLMRequest";
import { decodeReading, type PalmReading, type RitualReceipt } from "@/lib/ritual/decodeReading";
import { generateEphemeralKeypair } from "@/lib/ecies";
import { palmWiseAbi } from "@/lib/ritual/abis";
import { useRitualWrite } from "./useRitualWrite";

const PALMWISE_CONTRACT = process.env
  .NEXT_PUBLIC_PALMWISE_CONTRACT_ADDRESS as `0x${string}`;

export type ReadingStatus =
  | "idle"
  | "compressing"
  | "analyzing"
  | "fetching-executor"
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

  const [status, setStatus] = useState<ReadingStatus>("idle");
  const [reading, setReading] = useState<PalmReading | null>(null);
  const [readingHash, setReadingHash] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

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

        // Step 2: Analyze palm features with Gemini free vision API (off-chain)
        setStatus("analyzing");
        const analyzeRes = await fetch("/api/analyze-palm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64Image }),
        });
        if (!analyzeRes.ok) {
          const errData = await analyzeRes.json() as { error?: string };
          throw new Error(errData.error ?? "Palm analysis failed");
        }
        const { description } = await analyzeRes.json() as { description: string };

        // Step 3: Fetch active LLM executor from Ritual TEEServiceRegistry
        setStatus("fetching-executor");
        const execRes = await fetch("/api/executor");
        if (!execRes.ok) throw new Error("No active LLM executor available");
        const { executor, pubKey } = await execRes.json() as {
          executor: `0x${string}`;
          pubKey: `0x${string}`;
        };

        // Step 4: Generate ephemeral ECIES keypair — TEE will encrypt completionData to this
        const { publicKey: userPublicKey, privateKey: ephemeralPrivKey } =
          generateEphemeralKeypair();
        // Persist privKey so reading/[hash] page can decrypt even after navigation
        localStorage.setItem(`palmwise_privkey_${address}`, ephemeralPrivKey);

        // Step 5: Encode LLM precompile input (30-field ABI)
        // Gemini's palm description becomes the user prompt; GLM-4.7-FP8 generates the structured reading
        const llmInput = encodeLLMRequest({
          executor,
          userPublicKey,
          prompt: description,
        });

        // Suppress unused pubKey lint warning — pubKey is returned for potential future use
        void pubKey;

        // Step 6: Encode contract call and send transaction (bypasses eth_call simulation)
        setStatus("submitting");
        const calldata = encodeFunctionData({
          abi: palmWiseAbi,
          functionName: "submitReading",
          args: [llmInput],
        });
        void calldata; // calldata encoded for reference; writeAsync handles encoding

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
        if (!publicClient) throw new Error("No public client");
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
        const READING_CREATED_TOPIC =
          "0xb0c6d793f26ee4c46ae3a0c1b96bbcdf9a24d0c7dc6c46ff9d2b71c41abcdef1";
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
        setError(msg);
        setStatus("failed");
        throw err;
      }
    },
    [address, publicClient, writeAsync]
  );

  function reset() {
    setStatus("idle");
    setReading(null);
    setReadingHash(null);
    setTxHash(null);
    setError(null);
  }

  return { submitReading, status, reading, readingHash, txHash, error, reset };
}
