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

export async function POST(req: NextRequest) {
  try {
    const { base64Image } = await req.json();
    if (!base64Image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                  detail: "high",
                },
              },
              { type: "text", text: "Read this palm and return the JSON." },
            ],
          },
        ],
        max_tokens: 1500,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[read-palm] OpenAI error:", errText);
      return NextResponse.json({ error: "AI service error" }, { status: 500 });
    }

    const data = await response.json() as {
      choices?: Array<{ message: { content: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    const reading = JSON.parse(content) as PalmReading;
    return NextResponse.json({ reading });
  } catch (err) {
    console.error("[read-palm]", err);
    return NextResponse.json({ error: "Failed to read palm" }, { status: 500 });
  }
}
