import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { defineChain } from "viem";

// ─── Chain + registry config ──────────────────────────────────────────────────

const ritualChain = defineChain({
  id: 1979,
  name: "Ritual",
  nativeCurrency: { name: "RITUAL", symbol: "RITUAL", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.ritualfoundation.org"] } },
});

const TEE_REGISTRY = "0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F" as const;

// ─── Registry decoding ────────────────────────────────────────────────────────
//
// TEEServiceRegistry (EIP-1967 proxy) blocks getActiveExecutors(uint8) via eth_call.
// Selector 0x051ec670(uint256 capability) works and returns a dynamic array of structs.
//
// CAPABILITY MAPPING (verified against live RPC rejection messages):
//   0  = all executors (mixed: HttpCall, Llm, etc.) — DO NOT USE
//   1  = Llm  ← correct capability for LLM precompile (0x0802)
//   3+ = other capabilities (e.g. HttpCall)
//
// Struct layout per entry (32 bytes per word):
//   word 5:  TEE node identity address  ← NOT the executor (RPC rejects these)
//   word 6:  executor address           ← validated by the RPC on sendTransaction
//
// Evidence: RPC error "has capability HttpCall, required Llm" when using a cap-0
// executor. Cap-1 returns exactly one Llm executor at word-6.

function decodeExecutors(hexData: string): string[] {
  const raw = hexData.replace("0x", "");
  if (raw.length < 128) return [];

  // Word 1 = array length
  const count = parseInt(raw.substring(64, 128), 16);
  if (count === 0 || count > 100) return [];

  // Each element is 512 bytes (16 words). Offsets in word 2..count+1 point to
  // each element's start, relative to the start of the raw data (bytes).
  const STRUCT_BYTES = 512;
  const elementOffsets: number[] = [];
  for (let i = 0; i < count; i++) {
    const off = parseInt(raw.substring(128 + i * 64, 192 + i * 64), 16);
    elementOffsets.push(off);
  }

  const executors: string[] = [];
  for (const off of elementOffsets) {
    const hexOff = off * 2; // byte offset → hex-char offset
    if (hexOff + STRUCT_BYTES * 2 > raw.length) continue;

    // Word 6 (byte offset 192 within element) = executor address
    const word6 = raw.substring(hexOff + 6 * 64, hexOff + 7 * 64);
    if (word6.length !== 64) continue;

    // ABI-encoded address: left-padded with 12 zero bytes
    if (!word6.startsWith("000000000000000000000000")) continue;

    const addr = "0x" + word6.substring(24);
    if (addr === "0x0000000000000000000000000000000000000000") continue;

    executors.push(addr);
  }
  return executors;
}

// ─── Fallback: verified Llm-capability executor ──────────────────────────────
//
// From 0x051ec670(1) on TEEServiceRegistry, word-6 of the single returned struct.
// Capability 1 = Llm. This is the executor the RPC routes LLM precompile jobs to.

const FALLBACK_EXECUTORS = [
  "0xB42e435c4252A5a2E7440e37B609F00c61a0c91B",
];

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(_req: NextRequest) {
  let executor: string | undefined;

  try {
    const client = createPublicClient({
      chain: ritualChain,
      transport: http(),
    });

    // Capability 1 = Llm — only fetch executors for this specific capability.
    // Cap 0 = all executors (mixed capabilities including HttpCall) — must not use.
    const result = await client.call({
      to: TEE_REGISTRY,
      data: "0x051ec6700000000000000000000000000000000000000000000000000000000000000001",
    });

    const executors = decodeExecutors(result.data ?? "0x");
    if (executors.length > 0) {
      executor = executors[0];
    }
  } catch {
    // RPC unreachable — fall through to fallback
  }

  if (!executor) {
    executor = FALLBACK_EXECUTORS[0];
  }

  return NextResponse.json(
    { executor },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
