"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { PalmWiseLogo } from "@/components/PalmWiseLogo";
import { PalmScanner } from "@/components/PalmScanner";
import { ReadingDisplay } from "@/components/ReadingDisplay";
import { JobStatusBar } from "@/components/JobStatusBar";
import { WalletStatus } from "@/components/WalletStatus";
import { Watermark } from "@/components/Watermark";
import { usePalmReading } from "@/hooks/usePalmReading";
import { useSenderLock } from "@/hooks/useSenderLock";
import { useRitualWallet } from "@/hooks/useRitualWallet";

export default function ScanPage() {
  const { isConnected } = useAccount();
  const { submitReading, status, reading, readingHash, txHash, error, failedAt, reset } =
    usePalmReading();
  const { isLocked } = useSenderLock();
  const { hasSufficientFunds } = useRitualWallet();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = useCallback(
    (f: File) => {
      setFile(f);
      const url = URL.createObjectURL(f);
      setPreview(url);
      reset();
    },
    [reset]
  );

  async function handleSubmit() {
    if (!file) return;
    await submitReading(file);
  }

  const isProcessing =
    status !== "idle" && status !== "complete" && status !== "failed";
  const canSubmit =
    isConnected && file !== null && !isProcessing && !isLocked && hasSufficientFunds;

  return (
    <main className="min-h-screen bg-black text-white">
      <Watermark />
      {/* Nav */}
      <nav className="border-b border-gray-900 px-6 py-4 flex items-center justify-between">
        <Link href="/">
          <PalmWiseLogo />
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/history"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            My Readings
          </Link>
          <ConnectButton />
        </div>
      </nav>

      <div className="max-w-xl mx-auto px-6 py-12 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Scan Your Palm</h1>
          <p className="text-gray-500 text-sm">
            Hold your dominant hand open, palm facing the camera. Good lighting
            helps.
          </p>
        </div>

        {!isConnected ? (
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-8 text-center">
            <p className="text-gray-400 mb-4">
              Connect your wallet to submit a reading
            </p>
            <ConnectButton />
          </div>
        ) : (
          <>
            <WalletStatus />

            <PalmScanner
              onFile={handleFile}
              disabled={isProcessing}
              preview={preview}
            />

            {isLocked && (
              <div className="text-xs text-yellow-400 text-center">
                A reading is already in progress from this wallet. Please wait.
              </div>
            )}

            {status !== "idle" && (
              <JobStatusBar
                status={status}
                error={error}
                failedAt={status === "failed" ? failedAt : null}
              />
            )}

            {status === "complete" && reading ? (
              <ReadingDisplay reading={reading} txHash={txHash} />
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                  canSubmit
                    ? "bg-[#19D184] text-black hover:bg-[#16c077]"
                    : "bg-gray-800 text-gray-600 cursor-not-allowed"
                }`}
              >
                {isProcessing
                  ? status === "analyzing"
                    ? "Analyzing palm…"
                    : status === "locking"
                    ? "Activating lock…"
                    : status === "submitting" || status === "committed"
                    ? "Submitting to Ritual…"
                    : status === "processing" || status === "settling"
                    ? "GLM thinking…"
                    : "Working…"
                  : file
                  ? "Get My Reading"
                  : "Select a Palm Photo First"}
              </button>
            )}

            {status === "complete" && readingHash && (
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    reset();
                    setFile(null);
                    setPreview(null);
                  }}
                  className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 text-sm hover:border-gray-500 transition-colors"
                >
                  New Reading
                </button>
                <Link
                  href="/history"
                  className="flex-1 py-3 rounded-xl bg-gray-800 text-white text-sm text-center hover:bg-gray-700 transition-colors"
                >
                  View History
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
