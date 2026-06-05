import { NextRequest, NextResponse } from "next/server";

// Known active executor on Ritual Chain (chain ID 1979)
// TEEServiceRegistry (0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F) is a proxy
// that cannot be read via eth_call — using known active address instead.
// GLM-4.7-FP8 is free, so pubKey isn't needed (no API key encryption).
const EXECUTOR = "0x8ad2eaf18f12ce08d36bbdadaaf8c78f4f6f7a42";

export async function GET(_req: NextRequest) {
  return NextResponse.json({ executor: EXECUTOR, pubKey: "0x" });
}
