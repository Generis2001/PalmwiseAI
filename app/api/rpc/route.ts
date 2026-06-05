import { NextRequest, NextResponse } from "next/server";

const RPC_URL =
  process.env.RITUAL_RPC_URL ?? "https://rpc.ritualfoundation.org";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
