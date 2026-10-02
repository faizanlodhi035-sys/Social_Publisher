import type { AITextRequest, AITextResponse } from "./aiTypes.js";

/**
 * Clean provider abstraction interface for AI text generation.
 * Allows Gemini to be easily swapped with other providers (Claude, OpenAI, Local LLMs) or mock providers.
 */
export interface AIProvider {
  readonly name: string;
  generateText(request: AITextRequest): Promise<AITextResponse>;
}
