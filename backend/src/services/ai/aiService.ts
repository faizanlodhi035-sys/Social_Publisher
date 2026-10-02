import { z } from "zod";
import { envConfig } from "../../config/env.js";
import { getFirestoreDb, isFirebaseConfigured } from "../../firebase/admin.js";
import type { SocialPlatform } from "../../types/index.js";
import type { AIProvider } from "./aiProvider.js";
import { GeminiProvider } from "./geminiProvider.js";
import { MockAIProvider } from "./mockAIProvider.js";
import {
  AIValidationError,
  AIOutputParseError,
} from "./aiErrors.js";
import type {
  AICaptionRequest,
  AICaptionResult,
  AIRewriteRequest,
  AIRewriteResult,
  AIIdeasRequest,
  AIIdeasResult,
  AIHashtagsRequest,
  AIHashtagsResult,
  AIAdaptRequest,
  AIAdaptResult,
  AIHooksRequest,
  AIHooksResult,
  AIOperation,
  AIUsageRecord,
  AITone,
  AICaptionLength,
} from "./aiTypes.js";
import { buildCaptionPrompt } from "./prompts/captionPrompt.js";
import { buildRewritePrompt } from "./prompts/rewritePrompt.js";
import { buildIdeasPrompt } from "./prompts/ideasPrompt.js";
import { buildHashtagPrompt } from "./prompts/hashtagPrompt.js";
import { buildAdaptationPrompt } from "./prompts/adaptationPrompt.js";

// ============================================================================
// RUNTIME ZOD SCHEMAS FOR STRUCTURED GEMINI OUTPUTS
// ============================================================================

const captionOutputSchema = z.object({
  caption: z.string().min(1, "Caption cannot be empty"),
  title: z.string().optional(),
  cta: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
});

const rewriteOutputSchema = z.object({
  improvedCaption: z.string().min(1, "Improved caption cannot be empty"),
  explanation: z.string().optional(),
});

const ideaItemSchema = z.object({
  title: z.string().min(1),
  concept: z.string().min(1),
  hook: z.string().min(1),
  suggestedFormat: z.string().min(1),
});

const ideasOutputSchema = z.object({
  ideas: z.array(ideaItemSchema).min(1, "At least one idea must be generated"),
});

const hashtagsOutputSchema = z.object({
  hashtags: z.array(z.string()).min(1, "At least one hashtag must be returned"),
  groups: z
    .object({
      relevant: z.array(z.string()).optional(),
      niche: z.array(z.string()).optional(),
      trending: z.array(z.string()).optional(),
    })
    .optional(),
});

const adaptationOutputSchema = z.object({
  adaptedContent: z.string().min(1, "Adapted content cannot be empty"),
  explanation: z.string().optional(),
});

const hooksOutputSchema = z.object({
  hooks: z.array(z.string()).min(1, "At least one hook must be returned"),
});

// ============================================================================
// ALLOWED VALUE MATRICES
// ============================================================================

const ALLOWED_PLATFORMS: SocialPlatform[] = ["Instagram", "Facebook", "TikTok", "YouTube"];
const ALLOWED_TONES: AITone[] = ["professional", "casual", "friendly", "funny", "inspirational", "promotional"];
const ALLOWED_LENGTHS: AICaptionLength[] = ["short", "medium", "long"];

export class AIService {
  private provider: AIProvider;
  private configuredModel: string;

  constructor(customProvider?: AIProvider) {
    this.configuredModel = envConfig.GEMINI_MODEL || "gemini-2.5-flash";

    if (customProvider) {
      this.provider = customProvider;
    } else if (envConfig.AI_PROVIDER === "mock" || !envConfig.GEMINI_API_KEY) {
      this.provider = new MockAIProvider({ modelName: this.configuredModel });
      console.log(`[AIService] Running with MockAIProvider (model: ${this.configuredModel})`);
    } else {
      this.provider = new GeminiProvider({
        apiKey: envConfig.GEMINI_API_KEY,
        model: this.configuredModel,
        timeoutMs: envConfig.AI_TIMEOUT_MS || 25000,
      });
      console.log(`[AIService] Running with live GeminiProvider (model: ${this.configuredModel})`);
    }
  }

  /**
   * Override provider dynamically for tests or runtime adjustments
   */
  public setProvider(provider: AIProvider): void {
    this.provider = provider;
  }

  public getProvider(): AIProvider {
    return this.provider;
  }

  public getConfiguredModel(): string {
    return this.configuredModel;
  }

  public getStatus(): { provider: string; model: string } {
    return {
      provider: this.provider.name,
      model: this.configuredModel,
    };
  }

  // ==========================================================================
  // 1. CAPTION GENERATION
  // ==========================================================================
  public async generateCaption(
    req: AICaptionRequest,
    userId = "system_user",
    workspaceId = "default-workspace"
  ): Promise<AICaptionResult> {
    const startTime = Date.now();
    const platform = this.validatePlatform(req.platform || "Instagram");
    const topic = this.validateTopic(req.topic);
    const tone = this.validateTone(req.tone);
    const length = this.validateLength(req.length);
    const language = req.language || "English";

    const { systemInstruction, prompt } = buildCaptionPrompt({
      ...req,
      topic,
      platform,
      tone,
      length,
      language,
    });

    let success = false;
    let tokensUsed: any;

    try {
      const response = await this.provider.generateText({
        systemInstruction,
        prompt,
        responseMimeType: "application/json",
        temperature: 0.7,
        maxOutputTokens: 1000,
      });

      tokensUsed = response.tokenUsage;
      const parsed = this.parseAndValidate(response.text, captionOutputSchema, "Caption");

      success = true;
      return {
        caption: parsed.caption,
        title: parsed.title,
        cta: parsed.cta,
        hashtags: parsed.hashtags,
        platform,
        language,
      };
    } finally {
      await this.recordAIUsage({
        userId,
        workspaceId,
        operation: "caption",
        platform,
        createdAt: startTime,
        success,
        latencyMs: Date.now() - startTime,
        model: this.configuredModel,
        tokens: tokensUsed
          ? {
              prompt: tokensUsed.promptTokens,
              completion: tokensUsed.completionTokens,
              total: tokensUsed.totalTokens,
            }
          : undefined,
      });
    }
  }

  // ==========================================================================
  // 2. IMPROVE / REWRITE
  // ==========================================================================
  public async rewriteCaption(
    req: AIRewriteRequest,
    userId = "system_user",
    workspaceId = "default-workspace"
  ): Promise<AIRewriteResult> {
    const startTime = Date.now();
    const platform = this.validatePlatform(req.platform || "Instagram");
    const originalCaption = this.validateOriginalCaption(req.originalCaption);
    const tone = this.validateTone(req.tone);
    const length = this.validateLength(req.length);

    const { systemInstruction, prompt } = buildRewritePrompt({
      ...req,
      originalCaption,
      platform,
      tone,
      length,
    });

    let success = false;
    let tokensUsed: any;

    try {
      const response = await this.provider.generateText({
        systemInstruction,
        prompt,
        responseMimeType: "application/json",
        temperature: 0.6,
        maxOutputTokens: 1000,
      });

      tokensUsed = response.tokenUsage;
      const parsed = this.parseAndValidate(response.text, rewriteOutputSchema, "Rewrite");

      success = true;
      return {
        improvedCaption: parsed.improvedCaption,
        explanation: parsed.explanation,
        platform,
      };
    } finally {
      await this.recordAIUsage({
        userId,
        workspaceId,
        operation: "rewrite",
        platform,
        createdAt: startTime,
        success,
        latencyMs: Date.now() - startTime,
        model: this.configuredModel,
        tokens: tokensUsed
          ? {
              prompt: tokensUsed.promptTokens,
              completion: tokensUsed.completionTokens,
              total: tokensUsed.totalTokens,
            }
          : undefined,
      });
    }
  }

  // ==========================================================================
  // 3. CONTENT IDEAS
  // ==========================================================================
  public async generateIdeas(
    req: AIIdeasRequest,
    userId = "system_user",
    workspaceId = "default-workspace"
  ): Promise<AIIdeasResult> {
    const startTime = Date.now();
    const platform = this.validatePlatform(req.platform || "Instagram");
    const topic = this.validateTopic(req.topic);
    const tone = this.validateTone(req.tone);
    const count = this.validateCount(req.count, 3, 10);

    const { systemInstruction, prompt } = buildIdeasPrompt({
      ...req,
      topic,
      platform,
      tone,
      count,
    });

    let success = false;
    let tokensUsed: any;

    try {
      const response = await this.provider.generateText({
        systemInstruction,
        prompt,
        responseMimeType: "application/json",
        temperature: 0.8,
        maxOutputTokens: 1200,
      });

      tokensUsed = response.tokenUsage;
      const parsed = this.parseAndValidate(response.text, ideasOutputSchema, "Ideas");

      // Attach unique item IDs for frontend keying
      const ideas = parsed.ideas.map((item, idx) => ({
        id: `idea_${Date.now()}_${idx}`,
        ...item,
      }));

      success = true;
      return {
        ideas,
        platform,
        topic,
      };
    } finally {
      await this.recordAIUsage({
        userId,
        workspaceId,
        operation: "ideas",
        platform,
        createdAt: startTime,
        success,
        latencyMs: Date.now() - startTime,
        model: this.configuredModel,
        tokens: tokensUsed
          ? {
              prompt: tokensUsed.promptTokens,
              completion: tokensUsed.completionTokens,
              total: tokensUsed.totalTokens,
            }
          : undefined,
      });
    }
  }

  // ==========================================================================
  // 4. HASHTAG GENERATOR
  // ==========================================================================
  public async generateHashtags(
    req: AIHashtagsRequest,
    userId = "system_user",
    workspaceId = "default-workspace"
  ): Promise<AIHashtagsResult> {
    const startTime = Date.now();
    const platform = this.validatePlatform(req.platform || "Instagram");
    const topic = this.validateTopic(req.topic);
    const count = this.validateCount(req.count, 12, 30);

    const { systemInstruction, prompt } = buildHashtagPrompt({
      ...req,
      topic,
      platform,
      count,
    });

    let success = false;
    let tokensUsed: any;

    try {
      const response = await this.provider.generateText({
        systemInstruction,
        prompt,
        responseMimeType: "application/json",
        temperature: 0.6,
        maxOutputTokens: 800,
      });

      tokensUsed = response.tokenUsage;
      const parsed = this.parseAndValidate(response.text, hashtagsOutputSchema, "Hashtags");

      // Normalize all hashtags to begin with '#'
      const sanitizedHashtags = parsed.hashtags.map((h) =>
        h.startsWith("#") ? h : `#${h.replace(/\s+/g, "")}`
      );

      success = true;
      return {
        hashtags: sanitizedHashtags,
        groups: parsed.groups,
        platform,
      };
    } finally {
      await this.recordAIUsage({
        userId,
        workspaceId,
        operation: "hashtags",
        platform,
        createdAt: startTime,
        success,
        latencyMs: Date.now() - startTime,
        model: this.configuredModel,
        tokens: tokensUsed
          ? {
              prompt: tokensUsed.promptTokens,
              completion: tokensUsed.completionTokens,
              total: tokensUsed.totalTokens,
            }
          : undefined,
      });
    }
  }

  // ==========================================================================
  // 5. PLATFORM ADAPTATION
  // ==========================================================================
  public async adaptContent(
    req: AIAdaptRequest,
    userId = "system_user",
    workspaceId = "default-workspace"
  ): Promise<AIAdaptResult> {
    const startTime = Date.now();
    const sourcePlatform = this.validatePlatform(req.sourcePlatform);
    const targetPlatform = this.validatePlatform(req.targetPlatform);

    if (!req.originalContent || !req.originalContent.trim()) {
      throw new AIValidationError("Original content is required for adaptation.");
    }
    if (req.originalContent.length > 5000) {
      throw new AIValidationError("Original content cannot exceed 5000 characters.");
    }

    const { systemInstruction, prompt } = buildAdaptationPrompt({
      ...req,
      sourcePlatform,
      targetPlatform,
    });

    let success = false;
    let tokensUsed: any;

    try {
      const response = await this.provider.generateText({
        systemInstruction,
        prompt,
        responseMimeType: "application/json",
        temperature: 0.7,
        maxOutputTokens: 1000,
      });

      tokensUsed = response.tokenUsage;
      const parsed = this.parseAndValidate(response.text, adaptationOutputSchema, "Adaptation");

      success = true;
      return {
        adaptedContent: parsed.adaptedContent,
        sourcePlatform,
        targetPlatform,
        explanation: parsed.explanation,
      };
    } finally {
      await this.recordAIUsage({
        userId,
        workspaceId,
        operation: "adapt",
        platform: targetPlatform,
        createdAt: startTime,
        success,
        latencyMs: Date.now() - startTime,
        model: this.configuredModel,
        tokens: tokensUsed
          ? {
              prompt: tokensUsed.promptTokens,
              completion: tokensUsed.completionTokens,
              total: tokensUsed.totalTokens,
            }
          : undefined,
      });
    }
  }

  // ==========================================================================
  // 6. REEL HOOKS (Backward compatibility)
  // ==========================================================================
  public async generateHooks(
    req: AIHooksRequest,
    userId = "system_user",
    workspaceId = "default-workspace"
  ): Promise<AIHooksResult> {
    const startTime = Date.now();
    const platform = this.validatePlatform(req.platform || "TikTok");
    const topic = this.validateTopic(req.topic);
    const count = this.validateCount(req.count, 5, 10);

    const systemInstruction = `You are a viral short-form video creator. Generate ${count} attention-grabbing video hooks for ${platform}. Output JSON.`;
    const prompt = `Topic: "${topic}". Return JSON in format: {"hooks": ["Hook 1...", "Hook 2..."]}`;

    let success = false;
    let tokensUsed: any;

    try {
      const response = await this.provider.generateText({
        systemInstruction,
        prompt,
        responseMimeType: "application/json",
        temperature: 0.8,
        maxOutputTokens: 600,
      });

      tokensUsed = response.tokenUsage;
      const parsed = this.parseAndValidate(response.text, hooksOutputSchema, "Hooks");

      success = true;
      return {
        hooks: parsed.hooks,
        platform,
      };
    } finally {
      await this.recordAIUsage({
        userId,
        workspaceId,
        operation: "hooks",
        platform,
        createdAt: startTime,
        success,
        latencyMs: Date.now() - startTime,
        model: this.configuredModel,
        tokens: tokensUsed
          ? {
              prompt: tokensUsed.promptTokens,
              completion: tokensUsed.completionTokens,
              total: tokensUsed.totalTokens,
            }
          : undefined,
      });
    }
  }

  // ==========================================================================
  // PARSING & RUNTIME VALIDATION
  // ==========================================================================
  private parseAndValidate<T>(rawText: string, schema: z.ZodSchema<T>, operationLabel: string): T {
    let parsedJson: any;

    try {
      // Find JSON block if model returned markdown codeblocks (e.g. ```json ... ```)
      const cleaned = rawText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/, "")
        .replace(/\s*```$/, "")
        .trim();

      const jsonMatch = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      parsedJson = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
    } catch (parseErr) {
      throw new AIOutputParseError(
        `Failed to parse ${operationLabel} response as valid JSON from model.`,
        { rawPreview: rawText.slice(0, 150) }
      );
    }

    const validation = schema.safeParse(parsedJson);
    if (!validation.success) {
      throw new AIOutputParseError(
        `AI output validation failed for ${operationLabel}.`,
        validation.error.flatten()
      );
    }

    return validation.data;
  }

  // ==========================================================================
  // INPUT VALIDATIONS
  // ==========================================================================
  private validateTopic(topic?: string): string {
    if (!topic || typeof topic !== "string" || !topic.trim()) {
      throw new AIValidationError("Topic or concept description is required.");
    }
    const clean = topic.trim();
    if (clean.length > 1000) {
      throw new AIValidationError("Topic cannot exceed 1000 characters.");
    }
    return clean;
  }

  private validateOriginalCaption(caption?: string): string {
    if (!caption || typeof caption !== "string" || !caption.trim()) {
      throw new AIValidationError("Original caption text is required to improve or rewrite.");
    }
    const clean = caption.trim();
    if (clean.length > 5000) {
      throw new AIValidationError("Original caption cannot exceed 5000 characters.");
    }
    return clean;
  }

  private validatePlatform(platform?: string): SocialPlatform {
    if (!platform) return "Instagram";
    if (!ALLOWED_PLATFORMS.includes(platform as SocialPlatform)) {
      throw new AIValidationError(
        `Platform '${platform}' is invalid. Allowed: ${ALLOWED_PLATFORMS.join(", ")}`
      );
    }
    return platform as SocialPlatform;
  }

  private validateTone(tone?: string): AITone {
    if (!tone) return "casual";
    if (!ALLOWED_TONES.includes(tone as AITone)) {
      return "casual";
    }
    return tone as AITone;
  }

  private validateLength(length?: string): AICaptionLength {
    if (!length) return "medium";
    if (!ALLOWED_LENGTHS.includes(length as AICaptionLength)) {
      return "medium";
    }
    return length as AICaptionLength;
  }

  private validateCount(count?: number, fallback = 3, max = 20): number {
    if (count === undefined || count === null || isNaN(count)) return fallback;
    const bounded = Math.round(count);
    return Math.min(Math.max(bounded, 1), max);
  }

  // ==========================================================================
  // FIRESTORE USAGE TRACKING
  // ==========================================================================
  private async recordAIUsage(record: Omit<AIUsageRecord, "id">): Promise<void> {
    const db = getFirestoreDb();
    if (!db || !isFirebaseConfigured()) return;

    try {
      const usageId = `usage_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const docData: any = {
        id: usageId,
        userId: record.userId,
        workspaceId: record.workspaceId,
        operation: record.operation,
        platform: record.platform,
        createdAt: record.createdAt,
        success: record.success,
        latencyMs: record.latencyMs,
        model: record.model,
      };
      if (record.tokens) {
        docData.tokens = record.tokens;
      }
      if (record.error) {
        docData.error = record.error;
      }

      await db
        .collection("workspaces")
        .doc(record.workspaceId || "default-workspace")
        .collection("aiUsage")
        .doc(usageId)
        .set(docData);
    } catch (err) {
      // Non-blocking log
      console.warn("[AIService] Firestore usage record failed:", (err as any)?.message || err);
    }
  }
}

export const aiService = new AIService();
