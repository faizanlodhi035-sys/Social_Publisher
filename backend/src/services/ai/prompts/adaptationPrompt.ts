import type { AIAdaptRequest } from "../aiTypes.js";

export function buildAdaptationPrompt(req: AIAdaptRequest): {
  systemInstruction: string;
  prompt: string;
} {
  const { sourcePlatform, targetPlatform } = req;
  const tone = req.tone || "casual";
  const length = req.length || "medium";
  const language = req.language || "English";

  const systemInstruction = `You are a cross-platform content repurposing expert.
Your job is to adapt a post originally crafted for ${sourcePlatform} so that it performs natively on ${targetPlatform}.
Key Rules:
1. Preserve the original message, value, and core intent completely. Do not fabricate facts.
2. Adapt the structure to ${targetPlatform}'s native style:
   - To TikTok: Convert to short-form hook-first video script or punchy text overlay.
   - To YouTube: Convert to descriptive, searchable video title + description with chapter-friendly breakdown.
   - To Instagram: Convert to aesthetically formatted caption with line breaks, visual emojis, and CTA.
   - To Facebook: Convert to conversational, community discussion style.
3. Language Directive: Keep the language consistent with ${language} (Urdu script for Urdu, Roman Urdu for Roman Urdu).
Output ONLY valid JSON adhering to the specified schema.`;

  const prompt = `Adapt the following content from ${sourcePlatform} to ${targetPlatform}.

[ORIGINAL CONTENT]
"""${req.originalContent}"""

[TARGET PARAMETERS]
Source Platform: ${sourcePlatform}
Target Platform: ${targetPlatform}
Tone: ${tone}
Length: ${length}
Language: ${language}

[REQUIRED JSON SCHEMA]
Return a single JSON object with this exact shape:
{
  "adaptedContent": "The repurposed content ready for publishing on the target platform",
  "explanation": "Brief explanation of how the format and tone were tailored for the target platform"
}`;

  return { systemInstruction, prompt };
}
