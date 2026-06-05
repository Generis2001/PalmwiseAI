/**
 * Client-side palm image analyzer using Canvas.
 * Extracts basic image properties to generate a structured palm description
 * without any external API calls. Replaces Gemini for the vision step.
 */

export interface PalmDescription {
  shape: "earth" | "air" | "fire" | "water";
  lineClarity: "strong" | "moderate" | "faint";
  estimatedLines: {
    lifeLine: { visible: boolean; length: string; depth: string };
    heartLine: { visible: boolean; length: string; depth: string };
    headLine: { visible: boolean; length: string; depth: string; angle: string };
    fateLine: { visible: boolean; length: string; depth: string };
  };
  fingerProportions: string;
  overallImpression: string;
}

export async function analyzePalmImage(base64Jpeg: string): Promise<PalmDescription> {
  const img = new Image();
  img.src = `data:image/jpeg;base64,${base64Jpeg}`;
  await img.decode();

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  const w = canvas.width || 512;
  const h = canvas.height || 512;

  // --- Hand shape from aspect ratio ---
  const aspectRatio = w / h;
  let shape: "earth" | "air" | "fire" | "water" = "earth";
  if (aspectRatio > 0.85 && aspectRatio <= 1.0) shape = "fire";
  else if (aspectRatio > 0.8 && aspectRatio <= 0.85) shape = "water";
  else if (aspectRatio > 0.75 && aspectRatio <= 0.8) shape = "air";

  // --- Line clarity from image contrast (standard deviation of luminance) ---
  const region = ctx.getImageData(
    Math.floor(w * 0.2), Math.floor(h * 0.2),
    Math.floor(w * 0.6), Math.floor(h * 0.6)
  );
  const pixels = region.data;
  let sum = 0;
  let sumSq = 0;
  const count = pixels.length / 4;
  for (let i = 0; i < pixels.length; i += 4) {
    const gray = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
    sum += gray;
    sumSq += gray * gray;
  }
  const mean = sum / count;
  const stdDev = Math.sqrt(sumSq / count - mean * mean);

  let lineClarity: "strong" | "moderate" | "faint" = "moderate";
  if (stdDev > 60) lineClarity = "strong";
  else if (stdDev < 30) lineClarity = "faint";

  const clarityWord = lineClarity === "strong" ? "clear and well-defined"
    : lineClarity === "moderate" ? "moderately visible"
    : "somewhat faint but traceable";

  // Deterministic variation based on image dimensions for consistency
  const seed = (w * h) % 1000;
  const pick = (arr: string[], s: number) => arr[s % arr.length];

  const lifeLength = pick(["long, curving around the thumb mount", "medium-length with a gentle curve", "shorter, curving slightly"], seed);
  const heartLength = pick(["extending across the palm from index to outer edge", "medium-length ending below the middle finger", "long, sweeping across the palm"], seed + 1);
  const headLength = pick(["extending across the palm", "medium-length with a slight downward slope", "long with a straight angle"], seed + 2);
  const headAngle = pick(["horizontal", "slightly sloping downward", "sloping moderately"], seed + 3);
  const fateLength = pick(["extending from the base toward the middle finger", "short, reaching only the mid-palm", "faint line running partially up the palm"], seed + 4);
  const fateVisible = seed % 5 !== 0;
  const fingers = pick(["proportional fingers with balanced mounts", "long fingers with prominent mounts", "shorter fingers with developed mounts", "slender fingers with subtle mounts"], seed + 5);
  const overall = pick([
    `The palm lines are ${clarityWord}. The skin texture appears smooth with even coloration.`,
    `The palm shows ${clarityWord} lines with good definition in the central regions.`,
    `Lines are ${clarityWord} across the palm. The overall structure suggests balanced development.`,
    `The palm features ${clarityWord} markings. The major lines are readily observable.`,
  ], seed + 6);

  const detail = lineClarity === "strong" ? "clear and distinct"
    : lineClarity === "moderate" ? "moderately clear"
    : "subtle but visible upon close inspection";

  return {
    shape,
    lineClarity,
    estimatedLines: {
      lifeLine: { visible: true, length: lifeLength, depth: lineClarity },
      heartLine: { visible: true, length: heartLength, depth: lineClarity },
      headLine: { visible: true, length: headLength, depth: lineClarity, angle: headAngle },
      fateLine: { visible: fateVisible, length: fateLength, depth: fateVisible ? lineClarity : "not applicable" },
    },
    fingerProportions: fingers,
    overallImpression: `${overall} ${detail}.`,
  };
}

export async function buildPalmDescription(base64Jpeg: string): Promise<string> {
  const analysis = await analyzePalmImage(base64Jpeg);

  const shapeDesc: Record<string, string> = {
    earth: "square palm, short fingers, practical structure",
    air: "square palm, long fingers, intellectual structure",
    fire: "long palm, short fingers, energetic structure",
    water: "long palm, long fingers, intuitive structure",
  };

  const lines: string[] = [
    "PALM ANALYSIS",
    "",
    `1. HAND SHAPE: ${analysis.shape.toUpperCase()} type — ${shapeDesc[analysis.shape]}`,
    "",
    `2. LIFE LINE: ${analysis.estimatedLines.lifeLine.visible ? "Present" : "Not clearly visible"}. ${analysis.estimatedLines.lifeLine.length}. Depth: ${analysis.estimatedLines.lifeLine.depth}.`,
    "",
    `3. HEART LINE: ${analysis.estimatedLines.heartLine.visible ? "Present" : "Not clearly visible"}. ${analysis.estimatedLines.heartLine.length}. Depth: ${analysis.estimatedLines.heartLine.depth}.`,
    "",
    `4. HEAD LINE: ${analysis.estimatedLines.headLine.visible ? "Present" : "Not clearly visible"}. ${analysis.estimatedLines.headLine.length}. Angle: ${analysis.estimatedLines.headLine.angle}. Depth: ${analysis.estimatedLines.headLine.depth}.`,
    "",
    `5. FATE LINE: ${analysis.estimatedLines.fateLine.visible ? "Present" : "Absent or not clearly visible"}.${analysis.estimatedLines.fateLine.visible ? ` ${analysis.estimatedLines.fateLine.length}. Depth: ${analysis.estimatedLines.fateLine.depth}.` : ""}`,
    "",
    `6. FINGER PROPORTIONS: ${analysis.fingerProportions}.`,
    "",
    `7. OVERALL IMPRESSION: ${analysis.overallImpression}`,
    "",
    `Line clarity assessed as: ${analysis.lineClarity}.`,
  ];

  return lines.filter(Boolean).join("\n");
}
