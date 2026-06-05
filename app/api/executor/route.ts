import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { ritualChain } from "@/lib/ritual/chain";
import { teeRegistryAbi } from "@/lib/ritual/abis";
import { TEE_SERVICE_REGISTRY_ADDRESS } from "@/lib/ritual/addresses";

// Use server-side RPC (not proxied) for executor lookups
const serverClient = createPublicClient({
  chain: ritualChain,
  transport: http(process.env.RITUAL_RPC_URL ?? "https://rpc.ritualfoundation.org"),
});

export async function GET(_req: NextRequest) {
  try {
    // Capability 1 = LLM (GLM-4.7-FP8 via Ritual TEE)
    const executors = (await serverClient.readContract({
      address: TEE_SERVICE_REGISTRY_ADDRESS,
      abi: teeRegistryAbi,
      functionName: "getActiveExecutors",
      args: [1],
    })) as `0x${string}`[];

    if (!executors || executors.length === 0) {
      return NextResponse.json({ error: "No active executors" }, { status: 503 });
    }

    const executor = executors[0];
    const pubKey = (await serverClient.readContract({
      address: TEE_SERVICE_REGISTRY_ADDRESS,
      abi: teeRegistryAbi,
      functionName: "getExecutorPublicKey",
      args: [executor],
    })) as `0x${string}`;

    return NextResponse.json({ executor, pubKey });
  } catch (err) {
    console.error("[executor] fetch failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch executor" },
      { status: 500 }
    );
  }
}
