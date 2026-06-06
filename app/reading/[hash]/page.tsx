"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ReadingDisplay } from "@/components/ReadingDisplay";
import { decodeReading, type PalmReading } from "@/lib/ritual/decodeReading";
import type { Hex } from "viem";

export default function ReadingPage({
  params,
}: {
  params: { hash: string };
}) {
  const { address } = useAccount();
  const [reading, setReading] = useState<PalmReading | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) return;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Fetch encrypted reading from Neon
        const res = await fetch(`/api/readings?address=${address}`);
        const data = await res.json() as { readings: Array<{ readingHash: string; encryptedReading: string; txHash?: string }> };
        const row = data.readings?.find(
          (r: { readingHash: string }) => r.readingHash === params.hash
        );
        if (!row) {
          setError("Reading not found for this wallet.");
          return;
        }

        setTxHash(row.txHash ?? null);

        // New readings store plain JSON; old Ritual readings are ECIES-encrypted.
        let decoded: PalmReading;
        try {
          const plain = JSON.parse(row.encryptedReading) as PalmReading;
          if (plain && typeof plain.archetype === "string") {
            decoded = plain;
          } else {
            throw new Error("not a plain reading");
          }
        } catch {
          // Fall back to ECIES decrypt for old Ritual-path readings
          const privKey = localStorage.getItem(
            `palmwise_privkey_${address}`
          ) as Hex | null;
          if (!privKey) {
            setError(
              "Decryption key not found. This reading can only be viewed on the device and browser it was created on."
            );
            return;
          }
          decoded = decodeReading(row.encryptedReading as Hex, privKey);
        }
        setReading(decoded);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load reading");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [address, params.hash]);

  return (
    <main className="min-h-screen bg-black text-white">
      <nav className="border-b border-gray-900 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold tracking-tight">
          <span className="text-[#19D184]">Palm</span>Wise AI
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/history"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            ← History
          </Link>
          <ConnectButton />
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">
        {!address ? (
          <div className="text-center py-20">
            <p className="text-gray-400 mb-4">Connect your wallet to view this reading</p>
            <ConnectButton />
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#19D184] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="rounded-xl bg-red-950/40 border border-red-800/40 p-6 text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <Link
              href="/scan"
              className="inline-block px-5 py-2.5 rounded-lg bg-[#19D184] text-black font-semibold text-sm"
            >
              Get a New Reading
            </Link>
          </div>
        ) : reading ? (
          <ReadingDisplay reading={reading} txHash={txHash} />
        ) : null}
      </div>
    </main>
  );
}
