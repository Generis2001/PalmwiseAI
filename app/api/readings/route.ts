import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { readings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// POST /api/readings — save a new reading
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userAddress, readingHash, encryptedReading, palmImage, txHash, blockNumber, archetype } =
      body;

    if (!userAddress || !readingHash || !encryptedReading) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await db
      .insert(readings)
      .values({
        userAddress: userAddress.toLowerCase(),
        readingHash,
        encryptedReading,
        palmImage: palmImage ?? null,
        txHash,
        blockNumber,
        archetype,
      })
      .returning();

    return NextResponse.json({ reading: result[0] }, { status: 201 });
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      err.message.includes("unique constraint")
    ) {
      return NextResponse.json({ error: "Reading already stored" }, { status: 409 });
    }
    console.error("[readings POST]", err);
    return NextResponse.json({ error: "Failed to store reading" }, { status: 500 });
  }
}

// GET /api/readings?address=0x...
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "address param required" }, { status: 400 });
  }

  try {
    const results = await db
      .select()
      .from(readings)
      .where(eq(readings.userAddress, address.toLowerCase()))
      .orderBy(readings.createdAt);

    return NextResponse.json({ readings: results });
  } catch (err) {
    console.error("[readings GET]", err);
    return NextResponse.json({ error: "Failed to fetch readings" }, { status: 500 });
  }
}

// GET /api/readings/[hash] — fetch single reading by hash
export async function getByHash(hash: string) {
  const result = await db
    .select()
    .from(readings)
    .where(eq(readings.readingHash, hash));
  return result[0] ?? null;
}
