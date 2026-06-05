import { NextRequest, NextResponse } from "next/server";

// Gemini free vision API — analyzes a palm image and returns a text description
// of palm features for the Ritual LLM precompile to interpret

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

const ANALYSIS_PROMPT = `You are an expert palmist. Analyze this palm image and provide a detailed, precise description of the following features. Be specific about what you actually observe — line depth, length, curvature, breaks, branches, color, and hand proportions.

Describe:
1. LIFE LINE: length, depth (deep/moderate/faint), curvature, any breaks or branches, where it starts and ends
2. HEART LINE: length, depth, curvature, branches at the end, starting point (index vs middle finger)
3. HEAD LINE: length, depth, angle (sloping/horizontal), any forks or islands
4. FATE LINE: present or absent, if present: length, depth, where it starts, any breaks
5. HAND SHAPE: overall shape — square/rectangular with short fingers (earth), square/rectangular with long fingers (air), long palm with short fingers (fire), long palm with long fingers (water)
6. FINGER PROPORTIONS: relative length of fingers, any notable mounts (raised pads at finger bases)
7. OVERALL IMPRESSION: dominant features, unusual markings, general quality of the lines

Be objective and specific. If the image is unclear or a feature is not visible, state that explicitly.`;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 }
      );
    }

    const body = await req.json() as { image: string }; // base64 JPEG, no data URL prefix
    if (!body.image) {
      return NextResponse.json({ error: "Missing image" }, { status: 400 });
    }

    const geminiBody = {
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: body.image,
              },
            },
            {
              text: ANALYSIS_PROMPT,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1024,
      },
    };

    let res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
    });

    // On 429, wait for the rate limit window to reset before retrying once
    // Free tier: 15 requests per minute (rolling window)
    if (res.status === 429) {
      const delay = 60 * 1000; // wait a full minute for window reset
      await new Promise((r) => setTimeout(r, delay));
      res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiBody),
      });
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error("Gemini API error:", errText);
      const msg = res.status === 429
        ? "Gemini rate limit hit — wait a moment and try again"
        : `Gemini API error: ${res.status}`;
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    const data = await res.json() as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const description =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!description) {
      return NextResponse.json(
        { error: "Empty response from Gemini" },
        { status: 502 }
      );
    }

    return NextResponse.json({ description });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
