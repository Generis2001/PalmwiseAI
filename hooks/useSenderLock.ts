"use client";

import { useReadContract } from "wagmi";
import { useAccount } from "wagmi";
import { asyncJobTrackerAbi } from "@/lib/ritual/abis";
import { ASYNC_JOB_TRACKER_ADDRESS } from "@/lib/ritual/addresses";

export function useSenderLock() {
  const { address } = useAccount();

  const { data: hasPendingJob, refetch } = useReadContract({
    address: ASYNC_JOB_TRACKER_ADDRESS,
    abi: asyncJobTrackerAbi,
    functionName: "hasPendingJobForSender",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 5_000,
    },
  });

  return {
    isLocked: !!hasPendingJob,
    refetch,
  };
}
