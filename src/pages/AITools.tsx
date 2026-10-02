import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { aiApi } from "../services/aiApi";
import {
  AlertCircle,
  Check,
  Copy,
  FileText,
  Hash,
  Lightbulb,
  RefreshCw,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";

import {
  FaFacebook,
  FaInstagram,
  FaTiktok,
  FaYoutube,
} from "react-icons/fa";

// ============================================================================
// TYPES & INTERFACES (Strict TypeScript, NO `any`)
// ============================================================================

export interface AIToolsNavigationState {
  initialCaption: string;
  selectedPlatform?: Platform;
  source: "ai-tools";
}

export type AITool = "caption" | "rewrite" | "ideas" | "hashtags";
export type Platform = "Instagram" | "Facebook" | "TikTok" | "YouTube";
export type Tone =
  | "professional"
  | "casual"
  | "friendly"
  | "funny"
  | "inspirational"
  | "promotional";
export type CaptionLength = "short" | "medium" | "long";
export type Language = "English" | "Urdu" | "Roman Urdu";
export type ContentStyle =
  | "educational"
  | "entertaining"
  | "promotional"
  | "storytelling"
  | "behind_the_scenes"
  | "engagement";

export interface ContentIdeaItem {
  id: string;
  title: string;
  description: string;
  hook: string;
  format: string;
}

export interface HashtagGroups {
  relevant: string[];
  niche: string[];
  trending: string[];
}

export const LANGUAGES: { id: Language; label: string; flag: string }[] = [
  { id: "English", label: "English", flag: "🇬🇧" },
  { id: "Urdu", label: "Urdu (اردو)", flag: "🇵🇰" },
  { id: "Roman Urdu", label: "Roman Urdu", flag: "🗣️" },
];

// ============================================================================
// PLATFORM & TONE CONFIGURATIONS
// ============================================================================

const PLATFORMS: {
  id: Platform;
  name: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  color: string;
  bgColor: string;
  borderColor: string;
}[] = [
  {
    id: "Instagram",
    name: "Instagram",
    icon: FaInstagram,
    color: "text-pink-600",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
  },
  {
    id: "Facebook",
    name: "Facebook",
    icon: FaFacebook,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  {
    id: "TikTok",
    name: "TikTok",
    icon: FaTiktok,
    color: "text-slate-900",
    bgColor: "bg-slate-100",
    borderColor: "border-slate-300",
  },
  {
    id: "YouTube",
    name: "YouTube",
    icon: FaYoutube,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
];

const TONES: { id: Tone; label: string; description: string }[] = [
  { id: "professional", label: "Professional", description: "Authoritative & polished" },
  { id: "casual", label: "Casual", description: "Relaxed & conversational" },
  { id: "friendly", label: "Friendly", description: "Warm & welcoming" },
  { id: "funny", label: "Funny", description: "Humorous & witty" },
  { id: "inspirational", label: "Inspirational", description: "Motivating & uplifting" },
  { id: "promotional", label: "Promotional", description: "Action-oriented & persuasive" },
];

const LENGTHS: { id: CaptionLength; label: string; description: string }[] = [
  { id: "short", label: "Short", description: "1-2 punchy sentences" },
  { id: "medium", label: "Medium", description: "Standard post length (3-5 sentences)" },
  { id: "long", label: "Long", description: "Detailed story & deep breakdown" },
];

const CONTENT_STYLES: { id: ContentStyle; label: string }[] = [
  { id: "educational", label: "Educational" },
  { id: "entertaining", label: "Entertaining" },
  { id: "promotional", label: "Promotional" },
  { id: "storytelling", label: "Storytelling" },
  { id: "behind_the_scenes", label: "Behind the Scenes" },
  { id: "engagement", label: "Engagement / Q&A" },
];

// ============================================================================
// SIMULATED AI GENERATION SERVICE (Isolated mock AI responses)
// ============================================================================

function generateMockCaption(
  topic: string,
  platform: Platform,
  tone: Tone,
  length: CaptionLength
): string {
  const cleanTopic = topic.trim() || "creating amazing content";

  let body = "";
  if (tone === "professional") {
    body = `In today's digital landscape, ${cleanTopic} requires strategic clarity and continuous optimization. By focusing on core value delivery, creators can build sustainable audience engagement. What strategies are driving your current workflow?`;
  } else if (tone === "funny") {
    body = `Me: I'm just going to spend 5 minutes on ${cleanTopic}...\n3 hours later: 👁️👄👁️\nIf you've ever felt personally attacked by your own productivity goals, drop a comment below so I know I'm not alone! 😂`;
  } else if (tone === "inspirational") {
    body = `Remember why you started with ${cleanTopic}. Small, consistent actions taken every single day compound into life-changing results. Don't let perfectionism hold back your progress. Keep going! ✨`;
  } else if (tone === "promotional") {
    body = `Ready to level up your ${cleanTopic}? 🚀 We just released our ultimate guide with step-by-step frameworks that get real results. Click the link in bio to claim your access before spots fill up!`;
  } else if (tone === "friendly") {
    body = `Hey friends! 👋 I wanted to share a quick thought on ${cleanTopic}. It's been a game changer for me lately, and I'd love to know what your take is! Let's chat in the comments below.`;
  } else {
    // casual
    body = `Just dropping in to talk about ${cleanTopic}! Honestly, keeping things simple has made such a huge difference for me. What are you guys working on today? 👇`;
  }

  if (length === "short") {
    body = body.split("\n")[0].split(". ")[0] + ". 🚀";
  } else if (length === "long") {
    body += `\n\nHere are 3 key takeaways to remember:\n1. Focus on consistency over complexity.\n2. Engage genuinely with your audience.\n3. Keep testing new ideas.\n\nSave this post for later so you don't forget! 📌`;
  }

  // Platform specific call to action & hashtags
  if (platform === "Instagram") {
    body += `\n\n. \n. \n#ContentCreation #${cleanTopic.replace(/\s+/g, "")} #CreatorEconomy #SocialMediaTips`;
  } else if (platform === "TikTok") {
    body += `\n\n#fyp #${cleanTopic.replace(/\s+/g, "")} #creativetips #viral`;
  } else if (platform === "YouTube") {
    body += `\n\n🔔 Subscribe to the channel for more deep dives into ${cleanTopic}!`;
  } else {
    body += `\n\nShare your thoughts in the comments below! 👇`;
  }

  return body;
}

function generateMockImprovement(
  text: string,
  platform: Platform,
  tone: Tone,
  actionType: "improve" | "rewrite"
): string {
  const clean = text.trim() || "Check out our latest update!";
  if (actionType === "rewrite") {
    return `✨ [Rewritten for ${platform.toUpperCase()} - ${tone.toUpperCase()}]\n\n${clean}\n\n💡 Pro tip: Optimized with active voice and stronger hook structure for maximum engagement.`;
  }
  return `🚀 [Enhanced for High Engagement]\n\n${clean}\n\n👉 Double tap if you agree & tag a friend who needs to see this today! #${platform}Tips`;
}

function generateMockIdeas(topic: string, platform: Platform, style: ContentStyle): ContentIdeaItem[] {
  const t = topic.trim() || "Productivity & Creation";
  const styleLabel = style.replace(/_/g, " ").toUpperCase();
  return [
    {
      id: "idea-1",
      title: `3 Common Mistakes People Make in ${t}`,
      description: `[${styleLabel}] Break down top pitfalls and offer practical quick fixes.`,
      hook: `"Stop doing ${t} the hard way! Here's what top creators do instead..."`,
      format: platform === "TikTok" || platform === "Instagram" ? "Short Video / Reel (30s)" : "Detailed Post / Video",
    },
    {
      id: "idea-2",
      title: `Behind the Scenes: How I Tackle ${t}`,
      description: "Show your actual step-by-step workflow with raw, authentic footage.",
      hook: `"Ever wondered how ${t} actually happens behind closed doors?"`,
      format: "Carousel / Vlog",
    },
    {
      id: "idea-3",
      title: `The Ultimate ${t} Checklist for Beginners`,
      description: "A high-value actionable list that encourages saves and bookmarks.",
      hook: `"Save this checklist before you start your next ${t} project!"`,
      format: "Infographic / Slide Post",
    },
    {
      id: "idea-4",
      title: `5 AI & Automation Tools for ${t}`,
      description: "Highlight modern tools that save time and increase output quality.",
      hook: `"These 5 tools feel like cheat codes for ${t} in 2026..."`,
      format: "Top 5 List / Short Reel",
    },
  ];
}

function generateMockHashtags(topic: string, platform: Platform): HashtagGroups {
  const tag = topic.trim().replace(/\s+/g, "").toLowerCase() || "contentcreator";
  return {
    relevant: [`#${tag}`, `#${tag}tips`, `#${tag}community`, `#${tag}life`, `#${tag}daily`],
    niche: [`#${tag}strategy`, `#${tag}hacks`, `#${tag}guide`, `#${tag}workflow`, `#${tag}secrets`],
    trending: [`#creatorlab`, `#socialpublisher`, `#contentstrategy`, `#viral${platform}`, `#growyourbrand`],
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AITools() {
  const navigate = useNavigate();

  const [activeTool, setActiveTool] = useState<AITool>("caption");
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>("Instagram");
  const [selectedTone, setSelectedTone] = useState<Tone>("casual");
  const [selectedLength, setSelectedLength] = useState<CaptionLength>("medium");
  const [selectedStyle, setSelectedStyle] = useState<ContentStyle>("educational");

  const [selectedLanguage, setSelectedLanguage] = useState<Language>("English");

  // Input states
  const [topicInput, setTopicInput] = useState("");
  const [textToImprove, setTextToImprove] = useState("");

  // Output states
  const [generatedCaption, setGeneratedCaption] = useState("");
  const [generatedRewrite, setGeneratedRewrite] = useState("");
  const [generatedIdeas, setGeneratedIdeas] = useState<ContentIdeaItem[]>([]);
  const [generatedHashtags, setGeneratedHashtags] = useState<HashtagGroups | null>(null);

  // Status states
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Navigation to CreatePost helper
  const handleUseInCreatePost = (text: string, platform?: Platform) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    navigate("/create-post", {
      state: {
        initialCaption: trimmed,
        selectedPlatform: platform ?? selectedPlatform,
        source: "ai-tools",
      } satisfies AIToolsNavigationState,
    });
  };

  // Copy helper with real clipboard fallback
  const handleCopy = (text: string, id: string = "main") => {
    if (!text) return;
    try {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Clear / Reset helper
  const handleClear = () => {
    setTopicInput("");
    setTextToImprove("");
    setGeneratedCaption("");
    setGeneratedRewrite("");
    setGeneratedIdeas([]);
    setGeneratedHashtags(null);
    setErrorMsg(null);
  };

  // Generate Action Handlers
  const handleGenerateCaption = async () => {
    if (!topicInput.trim()) {
      setErrorMsg("Please enter a topic or post description before generating.");
      return;
    }
    setErrorMsg(null);
    setIsGenerating(true);
    try {
      const res = await aiApi.generateCaption({
        topic: topicInput,
        platform: selectedPlatform,
        tone: selectedTone,
        length: selectedLength,
        language: selectedLanguage,
      });
      setGeneratedCaption(res.caption || res.text);
    } catch (err: any) {
      console.warn("Backend AI caption error, using helper fallback:", err);
      const fallback = generateMockCaption(
        topicInput,
        selectedPlatform,
        selectedTone,
        selectedLength
      );
      setGeneratedCaption(fallback);
      setErrorMsg(err.message || "Failed to contact AI service. Using fallback preview.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImproveRewrite = async (actionType: "improve" | "rewrite") => {
    if (!textToImprove.trim()) {
      setErrorMsg("Please enter existing caption text to improve or rewrite.");
      return;
    }
    setErrorMsg(null);
    setIsGenerating(true);
    try {
      const res = await aiApi.rewriteCaption({
        originalCaption: textToImprove,
        platform: selectedPlatform,
        tone: selectedTone,
        length: selectedLength,
        language: selectedLanguage,
        instructions:
          actionType === "rewrite"
            ? "Complete rewrite with stronger hooks and platform style"
            : "Improve engagement, rhythm, active voice, and clarity",
      });
      setGeneratedRewrite(res.improvedCaption || res.text);
    } catch (err: any) {
      console.warn("Backend AI rewrite error, using helper fallback:", err);
      const fallback = generateMockImprovement(
        textToImprove,
        selectedPlatform,
        selectedTone,
        actionType
      );
      setGeneratedRewrite(fallback);
      setErrorMsg(err.message || "Failed to contact AI service. Using fallback preview.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateIdeas = async () => {
    if (!topicInput.trim()) {
      setErrorMsg("Please enter a topic or niche to generate content ideas.");
      return;
    }
    setErrorMsg(null);
    setIsGenerating(true);
    try {
      const res = await aiApi.generateContentIdeas({
        topic: topicInput,
        platform: selectedPlatform,
        tone: selectedTone,
        count: 4,
        language: selectedLanguage,
        style: selectedStyle,
      });
      const mappedIdeas: ContentIdeaItem[] = res.ideas.map((item, idx) => ({
        id: item.id || `idea-${Date.now()}-${idx}`,
        title: item.title,
        description: item.concept,
        hook: item.hook,
        format: item.suggestedFormat,
      }));
      setGeneratedIdeas(mappedIdeas);
    } catch (err: any) {
      console.warn("Backend AI ideas error, using helper fallback:", err);
      const fallback = generateMockIdeas(topicInput, selectedPlatform, selectedStyle);
      setGeneratedIdeas(fallback);
      setErrorMsg(err.message || "Failed to contact AI service. Using fallback preview.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateHashtags = async () => {
    if (!topicInput.trim()) {
      setErrorMsg("Please enter a post topic to generate relevant hashtags.");
      return;
    }
    setErrorMsg(null);
    setIsGenerating(true);
    try {
      const res = await aiApi.generateHashtags({
        topic: topicInput,
        caption: textToImprove || undefined,
        platform: selectedPlatform,
        count: 15,
      });
      if (res.groups && res.groups.relevant && res.groups.relevant.length > 0) {
        setGeneratedHashtags({
          relevant: res.groups.relevant || [],
          niche: res.groups.niche || [],
          trending: res.groups.trending || [],
        });
      } else {
        const tags = res.hashtags;
        setGeneratedHashtags({
          relevant: tags.slice(0, 5),
          niche: tags.slice(5, 10),
          trending: tags.slice(10).length ? tags.slice(10) : tags.slice(0, 5),
        });
      }
    } catch (err: any) {
      console.warn("Backend AI hashtags error, using helper fallback:", err);
      const fallback = generateMockHashtags(topicInput, selectedPlatform);
      setGeneratedHashtags(fallback);
      setErrorMsg(err.message || "Failed to contact AI service. Using fallback preview.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ==================================================================== */}
      {/* HEADER                                                               */}
      {/* ==================================================================== */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">AI Tools</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
              <Sparkles size={13} />
              Assistant
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Create, improve and optimize your social media content with AI-powered tools.
          </p>
        </div>

        {/* Clear All Button */}
        <button
          onClick={handleClear}
          className="inline-flex items-center gap-1.5 self-start rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 sm:self-auto"
        >
          <RotateCcw size={14} />
          Reset All
        </button>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-medium text-amber-900">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-600" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-xs font-bold text-amber-700 underline hover:text-amber-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TOOL NAVIGATION TABS (4 Tools)                                      */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {/* Tab 1: Caption Generator */}
        <button
          onClick={() => {
            setActiveTool("caption");
            setErrorMsg(null);
          }}
          className={`flex items-center gap-2.5 rounded-2xl border p-4 text-left transition-all ${
            activeTool === "caption"
              ? "border-blue-600 bg-blue-50/70 text-blue-900 shadow-xs ring-1 ring-blue-600"
              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              activeTool === "caption" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            <Wand2 size={18} />
          </div>
          <div>
            <p className="text-xs font-bold">Caption Generator</p>
            <p className="text-[11px] text-slate-500">Draft new post copy</p>
          </div>
        </button>

        {/* Tab 2: Improve & Rewrite */}
        <button
          onClick={() => {
            setActiveTool("rewrite");
            setErrorMsg(null);
          }}
          className={`flex items-center gap-2.5 rounded-2xl border p-4 text-left transition-all ${
            activeTool === "rewrite"
              ? "border-blue-600 bg-blue-50/70 text-blue-900 shadow-xs ring-1 ring-blue-600"
              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              activeTool === "rewrite" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            <FileText size={18} />
          </div>
          <div>
            <p className="text-xs font-bold">Improve & Rewrite</p>
            <p className="text-[11px] text-slate-500">Refine existing copy</p>
          </div>
        </button>

        {/* Tab 3: Content Ideas */}
        <button
          onClick={() => {
            setActiveTool("ideas");
            setErrorMsg(null);
          }}
          className={`flex items-center gap-2.5 rounded-2xl border p-4 text-left transition-all ${
            activeTool === "ideas"
              ? "border-blue-600 bg-blue-50/70 text-blue-900 shadow-xs ring-1 ring-blue-600"
              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              activeTool === "ideas" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            <Lightbulb size={18} />
          </div>
          <div>
            <p className="text-xs font-bold">Content Ideas</p>
            <p className="text-[11px] text-slate-500">Generate creative angles</p>
          </div>
        </button>

        {/* Tab 4: Hashtag Generator */}
        <button
          onClick={() => {
            setActiveTool("hashtags");
            setErrorMsg(null);
          }}
          className={`flex items-center gap-2.5 rounded-2xl border p-4 text-left transition-all ${
            activeTool === "hashtags"
              ? "border-blue-600 bg-blue-50/70 text-blue-900 shadow-xs ring-1 ring-blue-600"
              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              activeTool === "hashtags" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            <Hash size={18} />
          </div>
          <div>
            <p className="text-xs font-bold">Hashtag Generator</p>
            <p className="text-[11px] text-slate-500">Discover viral tags</p>
          </div>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* COMMON PLATFORM SELECTOR BAR                                         */}
      {/* ==================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Target Platform:</span>
          {PLATFORMS.map((p) => {
            const Icon = p.icon;
            const isSelected = selectedPlatform === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPlatform(p.id)}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Icon size={14} className={isSelected ? "text-white" : p.color} />
                <span>{p.name}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Language:</span>
          {LANGUAGES.map((lang) => {
            const isSelected = selectedLanguage === lang.id;
            return (
              <button
                key={lang.id}
                onClick={() => setSelectedLanguage(lang.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span>{lang.flag}</span>
                <span>{lang.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* TOOL 1: CAPTION GENERATOR                                            */}
      {/* ==================================================================== */}
      {activeTool === "caption" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Controls Form */}
          <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <h3 className="text-base font-bold text-slate-900">Caption Controls</h3>

            {/* Topic Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Topic / Post Description
              </label>
              <textarea
                rows={4}
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="Describe what you want to post about (e.g. 5 AI productivity tools that save 20 hours a week)..."
                className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>

            {/* Tone Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tone of Voice
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {TONES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTone(t.id)}
                    className={`rounded-xl border p-2.5 text-left text-xs transition-all ${
                      selectedTone === t.id
                        ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <p className="font-bold">{t.label}</p>
                    <p
                      className={`text-[10px] ${
                        selectedTone === t.id ? "text-slate-300" : "text-slate-400"
                      }`}
                    >
                      {t.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Length Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Caption Length
              </label>
              <div className="grid grid-cols-3 gap-2">
                {LENGTHS.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setSelectedLength(l.id)}
                    className={`rounded-xl border p-2.5 text-center text-xs transition-all ${
                      selectedLength === l.id
                        ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <p className="font-bold">{l.label}</p>
                    <p
                      className={`text-[10px] ${
                        selectedLength === l.id ? "text-slate-300" : "text-slate-400"
                      }`}
                    >
                      {l.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleGenerateCaption}
                disabled={isGenerating}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Wand2 size={15} />
                    <span>Generate Caption</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Output Card */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Generated Result</h3>
                {generatedCaption && (
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                    Ready
                  </span>
                )}
              </div>

              {/* Output Content */}
              <div className="mt-4">
                {isGenerating ? (
                  <div className="space-y-3 py-6">
                    <div className="h-4 animate-pulse rounded bg-slate-100 w-3/4" />
                    <div className="h-4 animate-pulse rounded bg-slate-100 w-full" />
                    <div className="h-4 animate-pulse rounded bg-slate-100 w-5/6" />
                    <div className="h-4 animate-pulse rounded bg-slate-100 w-1/2" />
                  </div>
                ) : generatedCaption ? (
                  <div className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-xs font-normal text-slate-800 leading-relaxed border border-slate-200/60">
                    {generatedCaption}
                  </div>
                ) : (
                  /* EMPTY STATE */
                  <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                    <Sparkles size={36} className="text-slate-300 stroke-[1.5]" />
                    <p className="mt-3 text-xs font-semibold text-slate-600">
                      Your AI-generated caption will appear here
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400 max-w-xs">
                      Enter a topic on the left and click "Generate Caption" to draft copy.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Output Actions */}
            {generatedCaption && !isGenerating && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <button
                  onClick={handleGenerateCaption}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <RotateCcw size={14} />
                  Regenerate
                </button>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleCopy(generatedCaption, "caption")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {copiedId === "caption" ? (
                      <>
                        <Check size={14} className="text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleUseInCreatePost(generatedCaption)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
                  >
                    <Send size={14} />
                    <span>Use in Create Post</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TOOL 2: IMPROVE & REWRITE                                           */}
      {/* ==================================================================== */}
      {activeTool === "rewrite" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Form */}
          <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <h3 className="text-base font-bold text-slate-900">Original Content</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Paste existing caption or draft
              </label>
              <textarea
                rows={5}
                value={textToImprove}
                onChange={(e) => setTextToImprove(e.target.value)}
                placeholder="Paste your draft text here to enhance hook, tone, or active voice..."
                className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>

            {/* Tone Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Target Tone
              </label>
              <div className="grid grid-cols-3 gap-2">
                {TONES.slice(0, 6).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTone(t.id)}
                    className={`rounded-xl border p-2 text-center text-xs transition-all ${
                      selectedTone === t.id
                        ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <p className="font-bold">{t.label}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => handleImproveRewrite("improve")}
                disabled={isGenerating}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50"
              >
                {isGenerating ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : (
                  <Sparkles size={15} />
                )}
                <span>Improve Engagement</span>
              </button>

              <button
                onClick={() => handleImproveRewrite("rewrite")}
                disabled={isGenerating}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 shadow-xs hover:bg-slate-50 disabled:opacity-50"
              >
                <RotateCcw size={15} />
                <span>Complete Rewrite</span>
              </button>
            </div>
          </div>

          {/* Output Card */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Improved Version</h3>
              </div>

              <div className="mt-4">
                {isGenerating ? (
                  <div className="space-y-3 py-6">
                    <div className="h-4 animate-pulse rounded bg-slate-100 w-3/4" />
                    <div className="h-4 animate-pulse rounded bg-slate-100 w-full" />
                    <div className="h-4 animate-pulse rounded bg-slate-100 w-2/3" />
                  </div>
                ) : generatedRewrite ? (
                  <div className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-xs font-normal text-slate-800 leading-relaxed border border-slate-200/60">
                    {generatedRewrite}
                  </div>
                ) : (
                  /* EMPTY STATE */
                  <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                    <FileText size={36} className="text-slate-300 stroke-[1.5]" />
                    <p className="mt-3 text-xs font-semibold text-slate-600">
                      Your improved text will appear here
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400 max-w-xs">
                      Paste a draft on the left and select an action to enhance your copy.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {generatedRewrite && !isGenerating && (
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <button
                  onClick={() => setGeneratedRewrite("")}
                  className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  <Trash2 size={14} />
                  Clear Output
                </button>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleCopy(generatedRewrite, "rewrite")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {copiedId === "rewrite" ? (
                      <>
                        <Check size={14} className="text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleUseInCreatePost(generatedRewrite)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
                  >
                    <Send size={14} />
                    <span>Use in Create Post</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TOOL 3: CONTENT IDEAS                                                */}
      {/* ==================================================================== */}
      {activeTool === "ideas" && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">Content Angle & Niche</h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Niche / Topic Keyword
                </label>
                <input
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder="e.g. Video editing tips, Fitness routines, Tech gadgets..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Content Style
                </label>
                <select
                  value={selectedStyle}
                  onChange={(e) => setSelectedStyle(e.target.value as ContentStyle)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 focus:border-slate-900 focus:outline-none bg-white"
                >
                  {CONTENT_STYLES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerateIdeas}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50"
            >
              {isGenerating ? (
                <RefreshCw size={15} className="animate-spin" />
              ) : (
                <Lightbulb size={15} />
              )}
              <span>Generate Content Ideas</span>
            </button>
          </div>

          {/* Ideas Grid Output */}
          {isGenerating ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 p-4" />
              ))}
            </div>
          ) : generatedIdeas.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {generatedIdeas.map((idea) => (
                <div
                  key={idea.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-slate-300 hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                        {idea.format}
                      </span>
                      <button
                        onClick={() =>
                          handleCopy(`${idea.title}\n\nHook: ${idea.hook}\n\n${idea.description}`, idea.id)
                        }
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        title="Copy idea"
                      >
                        {copiedId === idea.id ? (
                          <Check size={14} className="text-emerald-600" />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </div>

                    <h4 className="mt-3 text-sm font-bold text-slate-900">{idea.title}</h4>
                    <p className="mt-1 text-xs text-slate-600">{idea.description}</p>
                    <div className="mt-3 rounded-lg bg-slate-50 p-2.5 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Suggested Hook:</p>
                      <p className="text-xs font-semibold text-slate-800 italic mt-0.5">{idea.hook}</p>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-3 flex justify-end">
                    <button
                      onClick={() => {
                        const ideaText = `${idea.title}\n\nHook: ${idea.hook}\n\n${idea.description}`;
                        handleUseInCreatePost(ideaText);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
                    >
                      <Send size={13} />
                      <span>Use in Create Post</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* EMPTY STATE */
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
              <Lightbulb size={40} className="text-slate-300 stroke-[1.5]" />
              <h3 className="mt-4 text-sm font-bold text-slate-900">No Content Ideas Generated Yet</h3>
              <p className="mt-1 max-w-sm text-xs text-slate-500">
                Enter your niche topic above and click "Generate Content Ideas" to get personalized video hooks and angles.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* TOOL 4: HASHTAG GENERATOR                                            */}
      {/* ==================================================================== */}
      {activeTool === "hashtags" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">Hashtag Discovery</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Topic Keyword
              </label>
              <input
                type="text"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="e.g. Travel, Fitness, AI tools, Photography..."
                className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>

            <button
              onClick={handleGenerateHashtags}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 disabled:opacity-50"
            >
              {isGenerating ? (
                <RefreshCw size={15} className="animate-spin" />
              ) : (
                <Hash size={15} />
              )}
              <span>Generate Hashtags</span>
            </button>
          </div>

          {/* Hashtag Groups Output */}
          {isGenerating ? (
            <div className="space-y-4">
              <div className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
              <div className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
            </div>
          ) : generatedHashtags ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Discovered Hashtags</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      const allTags = [
                        ...generatedHashtags.relevant,
                        ...generatedHashtags.niche,
                        ...generatedHashtags.trending,
                      ].join(" ");
                      handleCopy(allTags, "all-hashtags");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {copiedId === "all-hashtags" ? (
                      <>
                        <Check size={14} className="text-emerald-600" />
                        <span>All Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copy All Hashtags</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      const allTags = [
                        ...generatedHashtags.relevant,
                        ...generatedHashtags.niche,
                        ...generatedHashtags.trending,
                      ].join(" ");
                      handleUseInCreatePost(allTags);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700"
                  >
                    <Send size={14} />
                    <span>Use in Create Post</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* Relevant */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                    Relevant Tags
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {generatedHashtags.relevant.map((t, idx) => (
                      <span
                        key={idx}
                        className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Niche */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                    Niche & Targeted
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {generatedHashtags.niche.map((t, idx) => (
                      <span
                        key={idx}
                        className="rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Trending */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                    Trending Growth
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {generatedHashtags.trending.map((t, idx) => (
                      <span
                        key={idx}
                        className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* EMPTY STATE */
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs">
              <Hash size={40} className="text-slate-300 stroke-[1.5]" />
              <h3 className="mt-4 text-sm font-bold text-slate-900">No Hashtags Generated Yet</h3>
              <p className="mt-1 max-w-sm text-xs text-slate-500">
                Enter your topic keyword above and click "Generate Hashtags" to discover target tags.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
