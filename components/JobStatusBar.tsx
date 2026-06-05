"use client";

import { type ReadingStatus } from "@/hooks/usePalmReading";

interface Props {
  status: ReadingStatus;
  error?: string | null;
  failedAt?: ReadingStatus | null;
}

const STEPS: { key: ReadingStatus; label: string }[] = [
  { key: "compressing", label: "Compressing" },
  { key: "analyzing", label: "AI Vision" },
  { key: "fetching-executor", label: "Executor" },
  { key: "submitting", label: "Submitting" },
  { key: "committed", label: "Committed" },
  { key: "processing", label: "On-chain AI" },
  { key: "settling", label: "Settling" },
  { key: "complete", label: "Complete" },
];

const ORDER: ReadingStatus[] = [
  "compressing",
  "analyzing",
  "fetching-executor",
  "submitting",
  "committed",
  "processing",
  "settling",
  "complete",
];

function stepIndex(s: ReadingStatus) {
  return ORDER.indexOf(s);
}

export function JobStatusBar({ status, error, failedAt }: Props) {
  if (status === "idle") return null;

  const currentIdx = stepIndex(status);
  const failed = status === "failed";
  const failedIdx = failed && failedAt ? stepIndex(failedAt) : -1;

  return (
    <div className="w-full rounded-xl bg-gray-900 border border-gray-800 p-4">
      <div className="flex items-center justify-between gap-1 flex-wrap">
        {STEPS.map((step, i) => {
          const done = failed ? failedIdx > i : currentIdx > i;
          const active = !failed && currentIdx === i;
          const isFail = failed && failedIdx === i;
          const isLast = i === STEPS.length - 1;

          return (
            <div key={step.key} className="flex items-center gap-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    done
                      ? "bg-[#19D184] text-black"
                      : active
                      ? "bg-[#19D184]/20 border-2 border-[#19D184] text-[#19D184] animate-pulse"
                      : isFail
                      ? "bg-red-500/20 border-2 border-red-500 text-red-400"
                      : "bg-gray-800 border border-gray-700 text-gray-600"
                  }`}
                >
                  {done ? "✓" : active ? "●" : i + 1}
                </div>
                <span
                  className={`text-[9px] mt-1 font-medium whitespace-nowrap ${
                    done || active ? "text-[#19D184]" : "text-gray-600"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={`h-px w-4 sm:w-6 mt-[-14px] transition-colors ${
                    done ? "bg-[#19D184]" : "bg-gray-800"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {failed && error && (
        <p className="mt-3 text-sm text-red-400 text-center">{error}</p>
      )}
    </div>
  );
}
