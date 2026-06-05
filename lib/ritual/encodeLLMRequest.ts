import {
  encodeAbiParameters,
  parseAbiParameters,
  type Address,
  type Hex,
} from "viem";

// LLM precompile (0x0802) — 30-field ABI (exact field order matters)
// Model: zai-org/GLM-4.7-FP8 (free, no API key, runs in Ritual TEE)
// Temperature is scaled ×1000 (700 = 0.7 temperature)
// convoHistory field 29 is REQUIRED — ('','','') means no persistent history

export function encodeLLMRequest(params: {
  executor: Address;
  userPublicKey: Hex;  // 65-byte uncompressed secp256k1; TEE encrypts completionData to this
  prompt: string;      // palm feature description from Gemini
  ttl?: bigint;
}): Hex {
  const ttl = params.ttl ?? 300n;

  const systemPrompt =
    "You are an expert palmist and AI archetype analyst. Analyze the palm features described and return a JSON object ONLY — no markdown, no explanation, just raw JSON. The JSON must exactly match this structure: " +
    '{"archetype":"The Builder"|"The Visionary"|"The Explorer"|"The Guardian"|"The Creator",' +
    '"archetype_description":"one sentence",' +
    '"personality_traits":["trait1","trait2","trait3","trait4","trait5"],' +
    '"strengths":["s1","s2","s3"],' +
    '"challenges":["c1","c2"],' +
    '"life_line":{"description":"string","quality":"strong"|"moderate"|"faint"},' +
    '"heart_line":{"description":"string","quality":"strong"|"moderate"|"faint"},' +
    '"head_line":{"description":"string","quality":"strong"|"moderate"|"faint"},' +
    '"fate_line":{"description":"string","present":true|false},' +
    '"hand_shape":"earth"|"air"|"fire"|"water",' +
    '"communication_style":"one sentence",' +
    '"leadership_tendency":"one sentence",' +
    '"daily_reflection":"max 20 words",' +
    '"reading_summary":"2-3 sentence narrative"}';

  const messagesJson = JSON.stringify([
    { role: "system", content: systemPrompt },
    { role: "user", content: params.prompt },
  ]);

  // Exact 30-field ABI layout from ritual-dapp-llm skill:
  // address, bytes[], uint256, bytes[], bytes,
  // string, string, int256, string, bool, int256, string, string,
  // uint256, bool, int256, string, bytes, int256, string, string, bool,
  // int256, bytes, bytes, int256, int256, string, bool,
  // (string,string,string)
  const encoded = encodeAbiParameters(
    parseAbiParameters(
      [
        "address, bytes[], uint256, bytes[], bytes,",
        "string, string, int256, string, bool, int256, string, string,",
        "uint256, bool, int256, string, bytes, int256, string, string, bool,",
        "int256, bytes, bytes, int256, int256, string, bool,",
        "(string, string, string)",
      ].join("")
    ),
    [
      params.executor,        // 0:  executor
      [],                     // 1:  encryptedSecrets
      ttl,                    // 2:  ttl
      [],                     // 3:  secretSignatures
      params.userPublicKey,   // 4:  userPublicKey (TEE encrypts completionData to this)
      messagesJson,           // 5:  messagesJson (JSON array of {role, content})
      "zai-org/GLM-4.7-FP8", // 6:  model
      0n,                     // 7:  frequencyPenalty (int256)
      "",                     // 8:  logitBiasJson
      false,                  // 9:  logprobs
      4096n,                  // 10: maxCompletionTokens (int256, ≥4096 for GLM reasoning model)
      "",                     // 11: metadataJson
      "",                     // 12: modalitiesJson
      1n,                     // 13: n (uint256)
      true,                   // 14: parallelToolCalls
      0n,                     // 15: presencePenalty (int256)
      "medium",               // 16: reasoningEffort
      "0x" as Hex,            // 17: responseFormatData (bytes)
      -1n,                    // 18: seed (int256, -1 = null)
      "auto",                 // 19: serviceTier
      "",                     // 20: stopJson
      false,                  // 21: stream
      700n,                   // 22: temperature (int256, 0.7 × 1000)
      "0x" as Hex,            // 23: toolChoiceData (bytes)
      "0x" as Hex,            // 24: toolsData (bytes)
      -1n,                    // 25: topLogprobs (int256, -1 = null)
      1000n,                  // 26: topP (int256, 1.0 × 1000)
      "",                     // 27: user
      false,                  // 28: piiEnabled
      ["", "", ""],           // 29: convoHistory StorageRef — ('','','') = no persistent history
    ]
  );

  return encoded;
}
