import type { AIHashtagsRequest } from "../aiTypes.js";

export function buildHashtagPrompt(req: AIHashtagsRequest): {
  systemInstruction: string;
  prompt: string;
} {
  const platform = req.platform || "Instagram";
  const count = Math.min(Math.max(req.count || 12, 3), 30);

  const systemInstruction = `You are a social media hashtag strategist for ${platform}.
Your goal is to suggest a balanced, relevant mix of hashtags.
Guidelines:
- Every hashtag must start with '#' without spaces or special characters.
- Categorize the tags into 3 balanced groups:
  1. "relevant": Directly related to the main topic.
  2. "niche": Targeted tags with high community intent.
  3. "trending": Broad industry tags currently seeing high engagement.
- Do not promise or guarantee algorithmic virality or follower numbers.
Output ONLY valid JSON adhering to the specified schema.`;

  const prompt = `Generate a set of approximately ${count} hashtags for ${platform}.

[INPUT DATA]
Topic: ${req.topic}
${req.caption ? `Post Caption Context: """${req.caption.slice(0, 300)}"""` : ""}
${req.keywords?.length ? `Keywords: ${req.keywords.join(", ")}` : ""}

[REQUIRED JSON SCHEMA]
Return a single JSON object with this exact shape:
{
  "hashtags": ["#tag1", "#tag2", "#tag3"],
  "groups": {
    "relevant": ["#tag1", "#tag2"],
    "niche": ["#tag3", "#tag4"],
    "trending": ["#tag5", "#tag6"]
  }
}`;

  return { systemInstruction, prompt };
}
