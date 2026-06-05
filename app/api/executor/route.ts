import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { defineChain } from "viem";
import { teeRegistryAbi } from "@/lib/ritual/abis";

// ─── Chain + registry config ──────────────────────────────────────────────────

const ritualChain = defineChain({
  id: 1979,
  name: "Ritual",
  nativeCurrency: { name: "RITUAL", symbol: "RITUAL", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.ritualfoundation.org"] } },
});

const TEE_REGISTRY = "0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F" as const;

// ─── Capability constants ─────────────────────────────────────────────────────
//   1 = LLM capability — matches the LLM precompile (0x0802)

const LLM_CAPABILITY = 1;

// ─── Fallback: verified Llm-capability executor ───────────────────────────────
//
// From 0x051ec670(1) on TEEServiceRegistry, word-6 of the single returned struct.
// Used when the RPC call to getServicesByCapability fails.

const FALLBACK_EXECUTOR = "0xB42e435c4252A5a2E7440e37B609F00c61a0c91B";

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest) {
  let executor: string | undefined;

  try {
    const client = createPublicClient({
      chain: ritualChain,
      transport: http(),
    });

    // Fetch all active nodes that have LLM capability (capability = 1, activeOnly = true)
    const services = await client.readContract({
      address: TEE_REGISTRY,
      abi: teeRegistryAbi,
      functionName: "getServicesByCapability",
      args: [LLM_CAPABILITY, true],
    });

    if (services.length === 0) {
      throw new Error("No active LLM executors returned by registry");
    }

    // Use the first active node's teeAddress as the executor
    executor = services[0].node.teeAddress;
  } catch {
    // getServicesByCapability not available on this proxy / RPC unreachable —
    // fall back to the raw-call decoder path
    executor = await fetchExecutorViaRawCall();
  }

  if (!executor) {
    executor = FALLBACK_EXECUTOR;
  }

  return NextResponse.json(
    { executor },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}

// ─── Raw-call fallback (0x051ec670) ──────────────────────────────────────────
//
// TEEServiceRegistry (EIP-1967 proxy) sometimes blocks standard eth_call for
// named functions. The internal selector 0x051ec670(uint256 capability) works
// on both proxy and implementation.
//
// Struct layout per entry (32 bytes per word):
//   word 5:  TEE node identity address  ← NOT the executor (RPC rejects these)
//   word 6:  executor address           ← validated by the RPC on sendTransaction

async function fetchExecutorViaRawCall(): Promise<string | undefined> {
  try {
    const client = createPublicClient({
      chain: ritualChain,
      transport: http(),
    });

    // Capability 1 = Llm — only fetch executors for this specific capability.
    const result = await client.call({
      to: TEE_REGISTRY,
      data: "0x051ec6700000000000000000000000000000000000000000000000000000000000000001",
    });

    const executors = decodeExecutors(result.data ?? "0x");
    return executors[0];
  } catch {
    return undefined;
  }
}

function decodeExecutors(hexData: string): string[] {
  const raw = hexData.replace("0x", "");
  if (raw.length < 128) return [];

  const count = parseInt(raw.substring(64, 128), 16);
  if (count === 0 || count > 100) return [];

  const elementOffsets: number[] = [];
  for (let i = 0; i < count; i++) {
    const off = parseInt(raw.substring(128 + i * 64, 192 + i * 64), 16);
    elementOffsets.push(off);
  }

  const executors: string[] = [];
  for (const off of elementOffsets) {
    const hexOff = off * 2;
    if (hexOff + 512 * 2 > raw.length) continue;

    // Word 6 (byte offset 192 within element) = executor address
    const word6 = raw.substring(hexOff + 6 * 64, hexOff + 7 * 64);
    if (word6.length !== 64) continue;
    if (!word6.startsWith("000000000000000000000000")) continue;

    const addr = "0x" + word6.substring(24);
    if (addr === "0x0000000000000000000000000000000000000000") continue;

    executors.push(addr);
  }
  return executors;
}
