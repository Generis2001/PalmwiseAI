"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { PalmWiseLogo } from "@/components/PalmWiseLogo";
import { Watermark } from "@/components/Watermark";
import type { Reading } from "@/lib/db/schema";

const ARCHETYPE_COLORS: Record<string, string> = {
  "The Builder": "#F59E0B",
  "The Visionary": "#8B5CF6",
  "The Explorer": "#3B82F6",
  "The Guardian": "#10B981",
  "The Creator": "#EC4899",
};

export default function HistoryPage() {
  const { address, isConnected } = useAccount();
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    fetch(`/api/readings?address=${address}`)
      .then((r) => r.json())
      .then((data: { readings: Reading[] }) => setReadings(data.readings ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [address]);

  return (
    <main className="min-h-screen bg-black text-white">
      <Watermark />
      <nav className="border-b border-gray-900 px-6 py-4 flex items-center justify-between">
        <Link href="/">
          <PalmWiseLogo />
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/scan"
            className="text-sm text-[#19D184] hover:text-white transition-colors"
          >
            + New Reading
          </Link>
          <ConnectButton />
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-8">My Readings</h1>

        {!isConnected ? (
          <div className="text-center py-20">
            <p className="text-gray-400 mb-4">
              Connect your wallet to see your reading history
            </p>
            <ConnectButton />
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#19D184] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : readings.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 mb-6">No readings yet.</p>
            <Link
              href="/scan"
              className="inline-block px-6 py-3 rounded-xl bg-[#19D184] text-black font-bold hover:bg-[#16c077] transition-colors"
            >
              Get Your First Reading
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {readings
              .slice()
              .reverse()
              .map((r) => {
                const color = r.archetype
                  ? ARCHETYPE_COLORS[r.archetype] ?? "#19D184"
                  : "#19D184";
                const date = new Date(r.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });
                return (
                  <Link
                    key={r.id}
                    href={`/reading/${r.readingHash}`}
                    className="flex items-center justify-between rounded-xl bg-gray-900 border border-gray-800 p-4 hover:border-gray-600 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {r.palmImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`data:image/jpeg;base64,${r.palmImage}`}
                          alt="palm"
                          className="w-12 h-12 rounded-lg object-cover border border-gray-700 flex-shrink-0"
                        />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-lg border border-gray-700 flex-shrink-0 flex items-center justify-center"
                          style={{ backgroundColor: `${color}15` }}
                        >
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-semibold" style={{ color }}>
                          {r.archetype ?? "Unknown Archetype"}
                        </div>
                        <div className="text-xs text-gray-600">{date}</div>
                      </div>
                    </div>
                    <span className="text-gray-600 text-sm">View →</span>
                  </Link>
                );
              })}
          </div>
        )}
      </div>
    </main>
  );
}
