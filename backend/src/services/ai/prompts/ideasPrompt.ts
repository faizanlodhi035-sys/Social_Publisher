import type { AIIdeasRequest } from "../aiTypes.js";

export function buildIdeasPrompt(req: AIIdeasRequest): {
  systemInstruction: string;
  prompt: string;
} {
  const platform = req.platform || "Instagram";
  const tone = req.tone || "casual";
  const count = Math.min(Math.max(req.count || 3, 1), 10);
  const language = req.language || "English";

  const systemInstruction = `You are a viral social media strategist and content planner.
Your goal is to brainstorm distinct, creative, high-performing content ideas for ${platform}.
Each idea must feature:
- A catchy title
- A clear core concept
- A compelling first 3-second hook
- A practical suggested format (e.g. 30s Reel, Carousel, Story Breakdown, Tutorial, Q&A)
Follow language requirements (English, Urdu script, or Roman Urdu as requested).
Output ONLY valid JSON adhering to the specified schema.`;

  const prompt = `Generate exactly ${count} social media content ideas for ${platform}.

[PARAMETERS]
Platform: ${platform}
Topic / Niche: ${req.topic}
Tone: ${tone}
Number of Ideas: ${count}
Language: ${language}
${req.audience ? `Target Audience: ${req.audience}` : ""}
${req.style ? `Content Style: ${req.style}` : ""}

[REQUIRED JSON SCHEMA]
Return a single JSON object with this exact shape:
{
  "ideas": [
    {
      "title": "Short creative title of the post idea",
      "concept": "1-2 sentence breakdown of the idea concept",
      "hook": "The exact attention-grabbing opening line or hook to say or display",
      "suggestedFormat": "e.g. 30s Short Reel / 5-Slide Carousel / Tutorial Post"
    }
  ]
}`;

  return { systemInstruction, prompt };
}
