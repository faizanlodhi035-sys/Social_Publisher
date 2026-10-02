import type { AIProvider } from "./aiProvider.js";
import type { AITextRequest, AITextResponse } from "./aiTypes.js";
import { AITimeoutError, AIProviderError } from "./aiErrors.js";

export interface MockAIProviderOptions {
  simulatedLatencyMs?: number;
  shouldFail?: boolean;
  shouldTimeout?: boolean;
  returnMalformedJson?: boolean;
  modelName?: string;
}

export class MockAIProvider implements AIProvider {
  public readonly name = "MockAIProvider";
  private options: MockAIProviderOptions;

  constructor(options: MockAIProviderOptions = {}) {
    this.options = {
      simulatedLatencyMs: 30,
      modelName: "gemini-mock-simulator",
      ...options,
    };
  }

  public setOptions(options: Partial<MockAIProviderOptions>): void {
    this.options = { ...this.options, ...options };
  }

  public async generateText(request: AITextRequest): Promise<AITextResponse> {
    const start = Date.now();

    if (this.options.simulatedLatencyMs) {
      await new Promise((resolve) => setTimeout(resolve, this.options.simulatedLatencyMs));
    }

    if (this.options.shouldTimeout) {
      throw new AITimeoutError("Mock provider simulated timeout.");
    }

    if (this.options.shouldFail) {
      throw new AIProviderError("Mock provider simulated failure.");
    }

    if (this.options.returnMalformedJson) {
      return {
        text: "{ unclosed_json: true, broken... ",
        model: this.options.modelName || "gemini-mock-simulator",
        latencyMs: Date.now() - start,
      };
    }

    const prompt = request.prompt;
    const isUrdu = prompt.includes("Urdu script") || prompt.includes("Language: Urdu");
    const isRomanUrdu = prompt.includes("Roman Urdu") || prompt.includes("Language: Roman Urdu");

    let responseJson: any;

    if (prompt.includes('"caption"') || prompt.includes("Caption Generation")) {
      let caption = "Unlock consistent growth with high-impact strategies tailored for your audience. Small daily habits create monumental results. What is your #1 strategy this week?";
      let title = "The Secret to Sustainable Growth";
      let cta = "Comment your thoughts below! 👇";

      if (isUrdu) {
        caption = "اپنی سوشل میڈیا گروتھ کو مستقل رکھیں اور بہترین نتائج حاصل کریں۔ آج ہی اپنی نئی حکمت عملی شروع کریں!";
        title = "سوشل میڈیا گروتھ کے رہنما اصول";
        cta = "نیچے کمنٹ میں اپنی رائے بتائیں! 👇";
      } else if (isRomanUrdu) {
        caption = "Apni audience ke sath consistent rehna hi asal kamyabi hai. Rozana choti choti koshish se bara result milta hai. Aapka is haftay ka sab se bara goal kya hai?";
        title = "Growth Ka Asaan Tareeqa";
        cta = "Comments mein apni raye zaroor share karein! 👇";
      }

      responseJson = {
        caption,
        title,
        cta,
        hashtags: ["#SocialPublisher", "#ContentStrategy", "#GrowthHacks", "#CreatorEconomy"],
      };
    } else if (prompt.includes('"improvedCaption"') || prompt.includes("Content Rewrite")) {
      let improvedCaption = "✨ Transformed for maximum engagement: Focus on delivering undeniable value first, and audience loyalty naturally follows. Double tap if this resonates!";
      let explanation = "Enhanced hook with active voice, structured readability, and clear conversational engagement CTA.";

      if (isUrdu) {
        improvedCaption = "✨ اعلیٰ اثر انگیز انداز: اپنے مواد کو سادہ اور دلچسپ بنائیں تاکہ دیکھنے والے خود بخود متوجہ ہوں۔";
        explanation = "بہتر الفاظ اور براہ راست رابطہ قائم کرنے والا انداز شامل کیا گیا ہے۔";
      } else if (isRomanUrdu) {
        improvedCaption = "✨ Behtar banaya gaya: Seedha aur asardar paighaam jo logon ko rukne aur engage hone par majboor karey.";
        explanation = "Alfaaz ko mazeed active aur hook ko mazboot kiya gaya hai.";
      }

      responseJson = {
        improvedCaption,
        explanation,
      };
    } else if (prompt.includes('"ideas"') || prompt.includes("Content Ideas")) {
      responseJson = {
        ideas: [
          {
            title: "3 Costly Mistakes Most Creators Make (And How to Fix Them)",
            concept: "Break down frequent pitfalls in content creation with actionable step-by-step corrections.",
            hook: "Stop scrolling if you're making these 3 common mistakes...",
            suggestedFormat: "Reel / Short Video (30s)",
          },
          {
            title: "Behind the Scenes: My Complete Daily Workflow",
            concept: "Demonstrate authenticity by walking through real production steps and tools used.",
            hook: "Ever wondered what goes into producing content every day?",
            suggestedFormat: "Carousel or Long-form Video",
          },
          {
            title: "The 2026 Checklist for High Engagement",
            concept: "Actionable checklist designed to encourage audience saves and bookmarks.",
            hook: "Save this checklist before posting your next update!",
            suggestedFormat: "Infographic Slide Post",
          },
        ],
      };
    } else if (prompt.includes('"hashtags"') || prompt.includes("Hashtags Generation")) {
      responseJson = {
        hashtags: [
          "#socialpublisher",
          "#contentcreator",
          "#digitalmarketing",
          "#socialmediatips",
          "#growthstrategy",
          "#creatorhacks",
          "#videomarketing",
          "#communityfirst",
          "#socialgrowth",
          "#brandstrategy",
        ],
        groups: {
          relevant: ["#socialpublisher", "#contentcreator", "#socialmediatips"],
          niche: ["#growthstrategy", "#creatorhacks", "#videomarketing"],
          trending: ["#digitalmarketing", "#communityfirst", "#socialgrowth"],
        },
      };
    } else if (prompt.includes('"adaptedContent"') || prompt.includes("Platform Adaptation")) {
      responseJson = {
        adaptedContent: "⚡ Adapted content tailored for the target platform audience dynamics, keeping the exact core value while optimizing length, tone, and call-to-action.",
        explanation: "Reframed the hook and formatted structure to suit target platform guidelines.",
      };
    } else if (prompt.includes('"hooks"') || prompt.includes("Video Hooks")) {
      responseJson = {
        hooks: [
          "Stop scrolling if you want to grow your reach in 2026!",
          "Nobody is talking about this game-changing trick...",
          "3 quick tips that completely changed my content strategy.",
          "You won't believe how simple this actually is.",
          "The one thing holding your audience growth back right now.",
        ],
      };
    } else {
      responseJson = {
        text: "Simulated AI generated output for social publisher.",
      };
    }

    return {
      text: JSON.stringify(responseJson, null, 2),
      model: this.options.modelName || "gemini-mock-simulator",
      latencyMs: Date.now() - start,
      tokenUsage: {
        promptTokens: 45,
        completionTokens: 85,
        totalTokens: 130,
      },
    };
  }
}
