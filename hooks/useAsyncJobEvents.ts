"use client";

import { useWatchContractEvent } from "wagmi";
import { asyncJobTrackerAbi } from "@/lib/ritual/abis";
import { ASYNC_JOB_TRACKER_ADDRESS } from "@/lib/ritual/addresses";

export type AsyncJobStatus =
  | "idle"
  | "submitting"
  | "committed"
  | "processing"
  | "settled"
  | "failed";

interface UseAsyncJobEventsOptions {
  userAddress?: `0x${string}`;
  onCommitted?: (jobId: `0x${string}`) => void;
  onSettled?: (jobId: `0x${string}`) => void;
  onFailed?: (jobId: `0x${string}`) => void;
  enabled?: boolean;
}

export function useAsyncJobEvents({
  userAddress,
  onCommitted,
  onSettled,
  onFailed,
  enabled = true,
}: UseAsyncJobEventsOptions) {
  // JobAdded fires when executor picks up the commitment → COMMITTED
  useWatchContractEvent({
    address: ASYNC_JOB_TRACKER_ADDRESS,
    abi: asyncJobTrackerAbi,
    eventName: "JobAdded",
    args: userAddress ? { sender: userAddress } : undefined,
    enabled: enabled && !!userAddress,
    onLogs(logs) {
      for (const log of logs) {
        const jobId = (log.args as { jobId?: `0x${string}` }).jobId;
        if (jobId) onCommitted?.(jobId);
      }
    },
  });

  // JobRemoved with completed=true fires when SPC result is settled
  useWatchContractEvent({
    address: ASYNC_JOB_TRACKER_ADDRESS,
    abi: asyncJobTrackerAbi,
    eventName: "JobRemoved",
    enabled: enabled && !!userAddress,
    onLogs(logs) {
      for (const log of logs) {
        const args = log.args as { jobId?: `0x${string}`; completed?: boolean };
        if (args.jobId) {
          if (args.completed) {
            onSettled?.(args.jobId);
          } else {
            onFailed?.(args.jobId);
          }
        }
      }
    },
  });
}
