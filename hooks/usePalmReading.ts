"use client";

import { useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { compressPalmImage } from "@/lib/imageUtils";
import type { PalmReading } from "@/lib/ritual/decodeReading";

export type ReadingStatus =
  | "idle"
  | "compressing"
  | "reading"
  | "saving"
  | "complete"
  | "failed";

export function usePalmReading() {
  const { address } = useAccount();

  const [status, setStatus] = useState<ReadingStatus>("idle");
  const [reading, setReading] = useState<PalmReading | null>(null);
  const [readingHash, setReadingHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [failedAt, setFailedAt] = useState<ReadingStatus | null>(null);

  const submitReading = useCallback(
    async (file: File) => {
      if (!address) throw new Error("Wallet not connected");
      setError(null);
      setReading(null);
      setReadingHash(null);

      let currentStep: ReadingStatus = "idle";
      try {
        setStatus("compressing");
        currentStep = "compressing";
        const base64Image = await compressPalmImage(file);

        setStatus("reading");
        currentStep = "reading";
        const res = await fetch("/api/read-palm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ base64Image }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "AI service error" }));
          throw new Error((err as { error?: string }).error ?? "Failed to read palm");
        }
        const { reading: decoded } = (await res.json()) as { reading: PalmReading };
        setReading(decoded);

        setStatus("saving");
        currentStep = "saving";
        const savedHash = `${address.toLowerCase()}-${Date.now()}`;
        setReadingHash(savedHash);
        await fetch("/api/readings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userAddress: address,
            readingHash: savedHash,
            encryptedReading: JSON.stringify(decoded),
            palmImage: base64Image,
            txHash: null,
            blockNumber: null,
            archetype: decoded.archetype,
          }),
        }).catch(() => {});

        setStatus("complete");
        return { reading: decoded, hash: savedHash, txHash: null as string | null };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        setFailedAt(currentStep);
        setError(msg);
        setStatus("failed");
        throw err;
      }
    },
    [address]
  );

  function reset() {
    setStatus("idle");
    setReading(null);
    setReadingHash(null);
    setError(null);
    setFailedAt(null);
  }

  return {
    submitReading,
    status,
    reading,
    readingHash,
    txHash: null as string | null,
    error,
    failedAt,
    reset,
  };
}
