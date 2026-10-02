import { GoogleGenAI } from "@google/genai";
import type { AIProvider } from "./aiProvider.js";
import type { AITextRequest, AITextResponse } from "./aiTypes.js";
import {
  AIProviderError,
  AISafetyBlockError,
  AITimeoutError,
} from "./aiErrors.js";

export interface GeminiProviderConfig {
  apiKey: string;
  model?: string;
  timeoutMs?: number;
}

export class GeminiProvider implements AIProvider {
  public readonly name = "GeminiProvider";
  private client: GoogleGenAI;
  private model: string;
  private defaultTimeoutMs: number;
  private apiKey: string;

  constructor(config: GeminiProviderConfig) {
    if (!config.apiKey || !config.apiKey.trim()) {
      throw new AIProviderError("Gemini API key is required but not configured.");
    }
    this.apiKey = config.apiKey.trim();
    this.model = config.model || "gemini-2.5-flash";
    this.defaultTimeoutMs = config.timeoutMs || 25000;
    this.client = new GoogleGenAI({ apiKey: this.apiKey });
  }

  public getModel(): string {
    return this.model;
  }

  public async generateText(request: AITextRequest): Promise<AITextResponse> {
    const startTime = Date.now();
    const timeoutMs = request.timeoutMs || this.defaultTimeoutMs;

    // Single controlled retry for transient errors
    let attempts = 0;
    const maxAttempts = 2;
    let lastError: unknown = null;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const responsePromise = this.callGeminiWithConfig(request);

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(new AITimeoutError(`Gemini request timed out after ${timeoutMs}ms.`));
          }, timeoutMs);
        });

        const response = await Promise.race([responsePromise, timeoutPromise]);
        const latencyMs = Date.now() - startTime;

        const candidate = (response as any).candidates?.[0];
        if (candidate?.finishReason === "SAFETY") {
          throw new AISafetyBlockError();
        }

        const text = response.text || candidate?.content?.parts?.[0]?.text || "";
        if (!text.trim()) {
          throw new AIProviderError("Empty response returned from Gemini model.");
        }

        const usageMetadata = (response as any).usageMetadata;

        return {
          text: text.trim(),
          model: this.model,
          latencyMs,
          tokenUsage: usageMetadata
            ? {
                promptTokens: usageMetadata.promptTokenCount,
                completionTokens: usageMetadata.candidatesTokenCount,
                totalTokens: usageMetadata.totalTokenCount,
              }
            : undefined,
        };
      } catch (err: any) {
        lastError = err;

        // If it's a timeout or safety block, don't retry
        if (err instanceof AITimeoutError || err instanceof AISafetyBlockError) {
          throw err;
        }

        // Only retry once on the first failure
        if (attempts < maxAttempts) {
          // Brief backoff before single retry (500ms)
          await new Promise((res) => setTimeout(res, 500));
          continue;
        }
      }
    }

    // Sanitize any error so that API keys or private tokens are NEVER leaked
    const rawMessage = (lastError as any)?.message || String(lastError);
    const sanitizedMessage = this.sanitizeErrorMessage(rawMessage);

    throw new AIProviderError(`Gemini AI service error: ${sanitizedMessage}`, {
      status: (lastError as any)?.status,
      code: (lastError as any)?.code,
    });
  }

  private async callGeminiWithConfig(request: AITextRequest): Promise<any> {
    const config: any = {
      temperature: request.temperature ?? 0.7,
      maxOutputTokens: request.maxOutputTokens ?? 1024,
    };

    if (request.responseMimeType) {
      config.responseMimeType = request.responseMimeType;
    }

    if (request.systemInstruction) {
      config.systemInstruction = request.systemInstruction;
    }

    return await this.client.models.generateContent({
      model: this.model,
      contents: request.prompt,
      config,
    });
  }

  private sanitizeErrorMessage(msg: string): string {
    let sanitized = msg;
    if (this.apiKey) {
      sanitized = sanitized.split(this.apiKey).join("[REDACTED_API_KEY]");
    }
    // Scrub potential key patterns
    sanitized = sanitized.replace(/key=[A-Za-z0-9_-]{20,}/g, "key=[REDACTED]");
    sanitized = sanitized.replace(/AIza[0-9A-Za-z-_]{35}/g, "[REDACTED_GEMINI_KEY]");
    return sanitized;
  }
}
