import { decodeAbiParameters, parseAbiParameters, type Hex, type TransactionReceipt } from "viem";
import { eciesDecryptRaw } from "@/lib/ecies";

export interface PalmReading {
  archetype:
    | "The Builder"
    | "The Visionary"
    | "The Explorer"
    | "The Guardian"
    | "The Creator";
  archetype_description: string;
  personality_traits: string[];
  strengths: string[];
  challenges: string[];
  life_line: { description: string; quality: "strong" | "moderate" | "faint" };
  heart_line: { description: string; quality: "strong" | "moderate" | "faint" };
  head_line: { description: string; quality: "strong" | "moderate" | "faint" };
  fate_line: { description: string; present: boolean };
  hand_shape: "earth" | "air" | "fire" | "water";
  communication_style: string;
  leadership_tendency: string;
  daily_reflection: string;
  reading_summary: string;
}

export type RitualReceipt = TransactionReceipt & {
  spcCalls?: Array<{ input: Hex; output: Hex }>;
};

export function decodeReading(
  spcOutput: Hex,
  ephemeralPrivKey: Hex
): PalmReading {
  // Step 1: Unwrap the SPC async envelope: (bytes simmedInput, bytes actualOutput)
  const [, actualOutput] = decodeAbiParameters(
    parseAbiParameters("bytes, bytes"),
    spcOutput
  );

  // Step 2: Decode the LLM precompile response envelope:
  // (bool hasError, bytes completionData, bytes modelMetadata, string errorMessage, (string,string,string) updatedConvoHistory)
  const [hasError, completionData, , errorMessage] = decodeAbiParameters(
    parseAbiParameters("bool, bytes, bytes, string, (string, string, string)"),
    actualOutput as Hex
  );

  if (hasError) {
    throw new Error(`LLM precompile error: ${errorMessage}`);
  }

  // Step 3: completionData is ECIES-encrypted (because userPublicKey was set).
  // Decrypt to get the raw ABI-encoded CompletionData bytes.
  const completionBytes = completionData as unknown as Uint8Array;
  const completionHex = `0x${Buffer.from(completionBytes).toString("hex")}` as Hex;
  const decryptedHex = eciesDecryptRaw(ephemeralPrivKey, completionHex);

  // Step 4: Decode CompletionData ABI structure:
  // (string id, string object, uint256 created, string model,
  //  string systemFingerprint, string serviceTier,
  //  uint256 choicesCount, bytes[] choicesData, bytes usageData)
  const [, , , , , , choicesCount, choicesData] = decodeAbiParameters(
    parseAbiParameters(
      "string, string, uint256, string, string, string, uint256, bytes[], bytes"
    ),
    decryptedHex
  );

  if ((choicesCount as bigint) === 0n || (choicesData as readonly Hex[]).length === 0) {
    throw new Error("No choices in LLM completion");
  }

  // Step 5: Decode first choice:
  // (uint256 index, string finishReason, bytes messageData)
  const [, , messageData] = decodeAbiParameters(
    parseAbiParameters("uint256, string, bytes"),
    (choicesData as readonly Hex[])[0]
  );

  // Step 6: Decode message:
  // (string role, string content, string refusal, uint256 toolCallsCount, bytes[] toolCallsData)
  const [, content] = decodeAbiParameters(
    parseAbiParameters("string, string, string, uint256, bytes[]"),
    messageData as Hex
  );

  const rawContent = content as string;
  if (!rawContent) {
    throw new Error("Empty content from LLM completion");
  }

  // Strip <think>...</think> reasoning block (GLM-4.7-FP8 reasoning model artifact)
  const withoutThink = rawContent
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim();

  // Strip markdown code fences if present
  const cleaned = withoutThink
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

  return JSON.parse(cleaned) as PalmReading;
}
