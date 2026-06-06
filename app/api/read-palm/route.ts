import { NextRequest, NextResponse } from "next/server";
import type { PalmReading } from "@/lib/ritual/decodeReading";

const SYSTEM_PROMPT =
  "You are an expert palmist and AI archetype analyst. The user has uploaded a photo of their palm. " +
  "Study the palm lines, hand shape, finger proportions, and overall features visible in the image. " +
  "Return a JSON object ONLY — no markdown, no explanation, just raw JSON. " +
  "The JSON must exactly match this structure: " +
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

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  error?: { message: string };
};

export async function POST(req: NextRequest) {
  try {
    const { base64Image } = await req.json();
    if (!base64Image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [
            {
              parts: [
                { inlineData: { mimeType: "image/jpeg", data: base64Image } },
                { text: "Read this palm and return the JSON." },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 1500,
            temperature: 0.7,
          },
        }),
      }
    );

    const data = (await response.json()) as GeminiResponse;

    if (!response.ok || data.error) {
      console.error("[read-palm] Gemini error:", data.error?.message ?? response.status);
      return NextResponse.json({ error: "AI service error" }, { status: 500 });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    // Strip any accidental markdown fences
    const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/, "").trim();
    const reading = JSON.parse(cleaned) as PalmReading;
    return NextResponse.json({ reading });
  } catch (err) {
    console.error("[read-palm]", err);
    return NextResponse.json({ error: "Failed to read palm" }, { status: 500 });
  }
}
