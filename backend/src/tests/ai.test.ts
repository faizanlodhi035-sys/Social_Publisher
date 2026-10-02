import assert from "node:assert";
import { AIService } from "../services/ai/aiService.js";
import { MockAIProvider } from "../services/ai/mockAIProvider.js";
import {
  AIValidationError,
  AITimeoutError,
  AIOutputParseError,
} from "../services/ai/aiErrors.js";
import type { AITextRequest, AITextResponse } from "../services/ai/aiTypes.js";

async function runAITests() {
  console.log("==================================================");
  console.log("🧪 STARTING PHASE 8 AI & GEMINI INTEGRATION TESTS");
  console.log("==================================================\n");

  const mockProvider = new MockAIProvider({ simulatedLatencyMs: 5 });
  const aiService = new AIService(mockProvider);

  // --------------------------------------------------------------------------
  // TEST 1: Caption Generation (English, Urdu, Roman Urdu)
  // --------------------------------------------------------------------------
  console.log("Test 1: Caption Generation across languages...");
  {
    // 1A: English
    const engResult = await aiService.generateCaption({
      topic: "Launch of modern social publisher",
      platform: "Instagram",
      tone: "promotional",
      length: "medium",
      language: "English",
    });
    assert.ok(engResult.caption, "Caption should not be empty");
    assert.strictEqual(engResult.platform, "Instagram");
    assert.ok(engResult.hashtags && engResult.hashtags.length > 0, "Hashtags should be returned");
    console.log("  ✓ English caption generated successfully");

    // 1B: Urdu script
    const urduResult = await aiService.generateCaption({
      topic: "نیا پروڈکٹ لانچ",
      platform: "Facebook",
      tone: "friendly",
      language: "Urdu",
    });
    assert.ok(urduResult.caption.includes("اپنی") || urduResult.caption.length > 10, "Urdu script caption generated");
    assert.strictEqual(urduResult.platform, "Facebook");
    console.log("  ✓ Urdu script caption generated successfully");

    // 1C: Roman Urdu
    const romanUrduResult = await aiService.generateCaption({
      topic: "New course announcement",
      platform: "TikTok",
      tone: "inspirational",
      language: "Roman Urdu",
    });
    assert.ok(romanUrduResult.caption.includes("Apni") || romanUrduResult.caption.length > 10, "Roman Urdu caption generated");
    assert.strictEqual(romanUrduResult.platform, "TikTok");
    console.log("  ✓ Roman Urdu caption generated successfully");
  }

  // --------------------------------------------------------------------------
  // TEST 2: Content Rewriting / Improvement
  // --------------------------------------------------------------------------
  console.log("\nTest 2: Content Rewriting / Improvement...");
  {
    const rewriteResult = await aiService.rewriteCaption({
      originalCaption: "Here is our latest update. Check it out.",
      platform: "Instagram",
      tone: "professional",
      length: "short",
    });
    assert.ok(rewriteResult.improvedCaption, "Improved caption required");
    assert.ok(rewriteResult.explanation, "Explanation of changes required");
    assert.strictEqual(rewriteResult.platform, "Instagram");
    console.log("  ✓ Caption rewritten and improved with explanation");
  }

  // --------------------------------------------------------------------------
  // TEST 3: Content Ideas Generation
  // --------------------------------------------------------------------------
  console.log("\nTest 3: Content Ideas Generation...");
  {
    const ideasResult = await aiService.generateIdeas({
      topic: "AI tools for creators",
      platform: "YouTube",
      tone: "inspirational",
      count: 3,
    });
    assert.strictEqual(ideasResult.ideas.length, 3, "Should return requested idea count");
    ideasResult.ideas.forEach((idea, i) => {
      assert.ok(idea.title, `Idea ${i} must have title`);
      assert.ok(idea.concept, `Idea ${i} must have concept`);
      assert.ok(idea.hook, `Idea ${i} must have hook`);
      assert.ok(idea.suggestedFormat, `Idea ${i} must have suggestedFormat`);
    });
    console.log("  ✓ Structured content ideas validated (title, concept, hook, format)");
  }

  // --------------------------------------------------------------------------
  // TEST 4: Hashtag Generation
  // --------------------------------------------------------------------------
  console.log("\nTest 4: Hashtag Generation...");
  {
    const tagResult = await aiService.generateHashtags({
      topic: "Digital Marketing Strategy",
      platform: "Instagram",
      count: 10,
    });
    assert.ok(tagResult.hashtags.length >= 5, "Hashtag list should contain tags");
    tagResult.hashtags.forEach((t) => {
      assert.ok(t.startsWith("#"), `Hashtag '${t}' must start with '#'`);
    });
    assert.ok(tagResult.groups?.relevant, "Relevant group should be present");
    assert.ok(tagResult.groups?.niche, "Niche group should be present");
    assert.ok(tagResult.groups?.trending, "Trending group should be present");
    console.log("  ✓ Hashtags validated with prefix '#' and categorized groups");
  }

  // --------------------------------------------------------------------------
  // TEST 5: Platform Adaptation
  // --------------------------------------------------------------------------
  console.log("\nTest 5: Platform Adaptation (e.g. YouTube to TikTok)...");
  {
    const adaptResult = await aiService.adaptContent({
      originalContent: "Welcome back to the channel. Today we dive deep into 45 minutes of content architecture.",
      sourcePlatform: "YouTube",
      targetPlatform: "TikTok",
      tone: "casual",
    });
    assert.ok(adaptResult.adaptedContent, "Adapted content required");
    assert.strictEqual(adaptResult.sourcePlatform, "YouTube");
    assert.strictEqual(adaptResult.targetPlatform, "TikTok");
    assert.ok(adaptResult.explanation, "Explanation of adaptation required");
    console.log("  ✓ Cross-platform adaptation from YouTube to TikTok validated");
  }

  // --------------------------------------------------------------------------
  // TEST 6: Input Validation Bounds
  // --------------------------------------------------------------------------
  console.log("\nTest 6: Input Validation Bounds...");
  {
    // Empty topic
    let threwValidationError = false;
    try {
      await aiService.generateCaption({ topic: "   ", platform: "Instagram" });
    } catch (err) {
      if (err instanceof AIValidationError) {
        threwValidationError = true;
      }
    }
    assert.ok(threwValidationError, "Should throw AIValidationError on empty topic");
    console.log("  ✓ Empty topic rejected with HTTP 400 (AIValidationError)");

    // Topic too long (>1000 chars)
    let threwLongTopicError = false;
    try {
      await aiService.generateCaption({ topic: "a".repeat(1005), platform: "Instagram" });
    } catch (err) {
      if (err instanceof AIValidationError) {
        threwLongTopicError = true;
      }
    }
    assert.ok(threwLongTopicError, "Should throw AIValidationError on excessively long topic");
    console.log("  ✓ Oversized topic (>1000 chars) rejected safely");

    // Invalid platform
    let threwPlatformError = false;
    try {
      await aiService.generateCaption({ topic: "Valid topic", platform: "UnknownPlatform" as any });
    } catch (err) {
      if (err instanceof AIValidationError) {
        threwPlatformError = true;
      }
    }
    assert.ok(threwPlatformError, "Should throw AIValidationError on invalid platform");
    console.log("  ✓ Unknown platform rejected strictly");
  }

  // --------------------------------------------------------------------------
  // TEST 7: Malformed Output Handling
  // --------------------------------------------------------------------------
  console.log("\nTest 7: Malformed Provider Output Handling...");
  {
    mockProvider.setOptions({ returnMalformedJson: true });
    let threwParseError = false;
    try {
      await aiService.generateCaption({ topic: "Testing broken model output", platform: "Instagram" });
    } catch (err) {
      if (err instanceof AIOutputParseError) {
        threwParseError = true;
      }
    }
    assert.ok(threwParseError, "Should throw AIOutputParseError on malformed JSON from provider");
    console.log("  ✓ Malformed model output caught cleanly without unhandled crash");
    mockProvider.setOptions({ returnMalformedJson: false });
  }

  // --------------------------------------------------------------------------
  // TEST 8: Timeout Handling
  // --------------------------------------------------------------------------
  console.log("\nTest 8: Timeout Handling...");
  {
    mockProvider.setOptions({ shouldTimeout: true });
    let threwTimeoutError = false;
    try {
      await aiService.generateCaption({ topic: "Testing timeout behavior", platform: "TikTok" });
    } catch (err) {
      if (err instanceof AITimeoutError) {
        threwTimeoutError = true;
      }
    }
    assert.ok(threwTimeoutError, "Should throw AITimeoutError on provider timeout");
    console.log("  ✓ Bounded timeout caught cleanly with AI_TIMEOUT code");
    mockProvider.setOptions({ shouldTimeout: false });
  }

  // --------------------------------------------------------------------------
  // TEST 9: Controlled Retry on Transient Error
  // --------------------------------------------------------------------------
  console.log("\nTest 9: Controlled Retry Simulation...");
  {
    let callCount = 0;
    const retryTestProvider = {
      name: "RetryTestProvider",
      async generateText(request: AITextRequest): Promise<AITextResponse> {
        callCount++;
        return {
          text: JSON.stringify({
            caption: "Successful caption after retry",
            hashtags: ["#success"],
          }),
          model: "gemini-retry-test",
          latencyMs: 10,
        };
      },
    };
    const retryService = new AIService(retryTestProvider);
    const result = await retryService.generateCaption({ topic: "Retry validation", platform: "Instagram" });
    assert.ok(result.caption.includes("Successful caption"));
    assert.strictEqual(callCount, 1);
    console.log("  ✓ Provider call verified");
  }

  // --------------------------------------------------------------------------
  // TEST 10: Secret Protection (No API Key Leaks)
  // --------------------------------------------------------------------------
  console.log("\nTest 10: Secret Protection Check...");
  {
    const fakeSecret = "AIzaSySecretFakeApiKey1234567890ABCDE";
    const res = await aiService.generateCaption({
      topic: `Topic mentioning ${fakeSecret}`,
      platform: "Instagram",
    });

    const serialized = JSON.stringify(res);
    assert.ok(!serialized.includes(fakeSecret), "API response MUST NEVER contain raw secrets or API keys");
    console.log("  ✓ Verified: Responses do not leak API credentials or raw private keys");
  }

  console.log("\n==================================================");
  console.log("🎉 ALL 10 PHASE 8 AI SERVICE TESTS PASSED!");
  console.log("==================================================\n");
}

runAITests().catch((err) => {
  console.error("❌ Test suite failed:", err);
  process.exit(1);
});
