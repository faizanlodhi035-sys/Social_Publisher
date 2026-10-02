import type { AIRewriteRequest } from "../aiTypes.js";

export function buildRewritePrompt(req: AIRewriteRequest): {
  systemInstruction: string;
  prompt: string;
} {
  const platform = req.platform || "Instagram";
  const tone = req.tone || "casual";
  const length = req.length || "medium";
  const language = req.language || "English";

  const systemInstruction = `You are a professional social media editor and copy refiner.
Your task is to improve, rewrite, or polish the user's provided caption for ${platform}.
Core Directives:
1. Preserve the user's original core meaning, intent, and factual points. Do not invent new facts.
2. Upgrade clarity, engagement hook, readability, and platform resonance.
3. Language Directive:
   - If Language is "Urdu", write strictly in Urdu script.
   - If Language is "Roman Urdu", write in Roman Urdu (Latin script).
   - If Language is "English", output in English.
4. Output Requirement: Output ONLY valid JSON adhering to the specified schema.`;

  const prompt = `Rewrite and enhance this caption for ${platform}.

[INPUT CONTENT]
Original Text: """${req.originalCaption}"""

[PARAMETERS]
Target Platform: ${platform}
Desired Tone: ${tone}
Desired Length: ${length}
Language: ${language}
${req.instructions ? `Special Instructions: ${req.instructions}` : ""}

[REQUIRED JSON SCHEMA]
Return a single JSON object with this exact shape:
{
  "improvedCaption": "The refined and improved caption text ready to publish",
  "explanation": "Brief 1-2 sentence explanation of the specific improvements made"
}`;

  return { systemInstruction, prompt };
}
