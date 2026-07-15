import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { Sentiment, GenerationUpdate } from "../types";
import { getApiKey } from "../lib/apiKey";

const MODELS_TO_TRY = [
  "gemini-3.5-flash",       // Primary modern stable flash model
  "gemini-3-flash-preview", // Developer preview flash model
  "gemini-flash-latest",    // General alias fallback
];

const MAX_ATTEMPTS_PER_MODEL = 3;

export const generateBlogPost = async (
  notes: string,
  sentiment: Sentiment,
  onUpdate: GenerationUpdate
): Promise<void> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Add your Gemini API key in Settings first.");
  }

  const now = new Date();
  const currentDate = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const currentYear = now.getFullYear();

  const stanceMap = {
    FOR: 'DEFENSIVE AND HONORIFIC (STILL FORENSIC)',
    AGAINST: 'CRITICAL AND DECONSTRUCTIVE (STILL FORENSIC)',
  };

  const systemInstruction = `YOU ARE ABEL ARROYO. A world-class forensic cultural critic and biographer. You run Golden Gems. Your style is "Abstraction-Free" and forensic.

**THE ABEL ARROYO OPERATING PROTOCOL**:

1. **REAL SOURCES ONLY**: Every person, document, organization, date, dollar figure, and statistic MUST be verifiable. NO hallucinations. NO invented programs, protocols, files, or data sets. If it cannot be sourced, it does NOT exist.
2. **NO FABRICATED TECHNICAL DOCUMENTS**: Do not invent classified files, internal servers, leaked datasets, or proprietary algorithms. Name real documents only.
3. **VOICE STANDARDS**: Short sentences averaging 5 to 15 words. NO sentence over 25 words. NO abstractions. NO adjectives without a factual anchor. Attitude over neutrality.
4. **CHRONOLOGICAL ANCHOR**: Today is ${currentDate}, ${currentYear}. References to "now" or "today" must anchor to this date.
5. **LENGTH**: Target 4,500 to 5,000 words minimum (18-20 minute read). Expand verified details; do NOT condense.
6. **FORMATTING**: STRICTLY NO MARKDOWN. No bold, no italics, no bullet points, no numbered lists. Use standard punctuation only. Section headers in ALL CAPS only.
7. **NO GEOGRAPHY FRAMING**: Do not use location-based psychological framing unless the location was genuinely formative.
8. **NEVER INVENT QUOTES**: If the subject said something, name where they said it. Otherwise, paraphrase and attribute generally.

**EXACT ARCHITECTURAL STRUCTURE**:

- [UNLABELED HOOK]: Drama front-loaded. Opens with a provocative technical statement or specific scale. No header. Credit the original document or source (e.g., documentary) if building from it.
- THE ORIGIN STORY: Formative experience and early shaping.
- THE TURNING POINT: The specific decision or discovery that set the trajectory.
- THE BODY OF WORK: Forensic audit of labor. Concrete specifics, named documents, real numbers, real dates.
- THE TRAGEDY: The cost to the subject and the collective.
- THE LEGACY AND THE VAULT: Current status in ${currentYear}. What the evidence means now.
- [UNLABELED EXIT]: One or two closing interrogative questions that do not resolve.
- About the Author: Written in third person. "Abel Arroyo is a cultural critic and forensic biographer... Support: buymeacoffee.com/dathaze20j"

**METADATA BLOCKS (MANDATORY AT THE END)**:
[YT_METADATA]
TITLE: [High-retention technical title]
BEATS: [10 subject-specific beats]
DESCRIPTION: [Forensic summary]
[/YT_METADATA]

[MEDIUM_TAGS]
[5 high-traffic tags with follower counts]
[/MEDIUM_TAGS]

**BLACK-LISTED PHRASES**: "cultural landscape", "vibrant", "journey", "tapestry", "beacon", "intellectual vibrations".`;

  const ai = new GoogleGenAI({ apiKey });

  let result;
  let delayMs = 1500;
  let lastErrStr = "";
  let lastWasRetryable = false;

  onUpdate({ thought: "INITIALIZING FORENSIC ENGINE... MAPPING DOSSIER NODES..." });

  for (const currentModel of MODELS_TO_TRY) {
    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_MODEL; attempt++) {
      try {
        result = await ai.models.generateContentStream({
          model: currentModel,
          contents: [{
            role: 'user',
            parts: [{
              text: `[HYPER-DENSITY VOLUMETRIC SCALING ACTIVE]
 [SUBJECT-LOCK ENABLED]

 DOSSIER DATA:
 ${notes}

 SENTIMENT STANCE: ${stanceMap[sentiment as keyof typeof stanceMap] || 'FORENSIC OBJECTIVITY'}

 INSTRUCTION: INITIATE FULL SYSTEMIC SYNTHESIS FOR ${currentDate}. EXHAUST ALL TECHNICAL PARAMETERS.`
            }]
          }],
          config: {
            temperature: 0.8,
            systemInstruction,
            ...(currentModel.startsWith("gemini-3") ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
          },
        });
        break;
      } catch (err: any) {
        const errStr = err?.message || String(err);
        console.warn(`[Forge System] Attempt ${attempt + 1} for model ${currentModel} failed:`, errStr);

        const isRetryable = errStr.includes("503") ||
          errStr.includes("UNAVAILABLE") ||
          errStr.includes("429") ||
          errStr.includes("RESOURCE_EXHAUSTED") ||
          errStr.includes("quota");

        lastErrStr = errStr;
        lastWasRetryable = isRetryable;

        if (isRetryable && attempt < MAX_ATTEMPTS_PER_MODEL - 1) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          delayMs *= 2;
        } else {
          break;
        }
      }
    }
    if (result) break;
  }

  if (!result) {
    if (lastErrStr.includes("API_KEY_INVALID") || lastErrStr.includes("API key not valid")) {
      throw new Error("Your Gemini API key is invalid. Check it in Settings.");
    }
    if (!lastWasRetryable && lastErrStr) {
      throw new Error(`Gemini request failed: ${lastErrStr}`);
    }
    throw new Error("All active Gemini models are currently experiencing extremely high demand. Please try again in 30-60 seconds.");
  }

  let fullContent = "";
  for await (const chunk of result) {
    const text = chunk.text;
    if (text) {
      fullContent += text;
      onUpdate({ content: fullContent, thought: "PROCESSING NEURAL PATHWAYS..." });
    }
  }

  onUpdate({ content: fullContent, isComplete: true });
};
