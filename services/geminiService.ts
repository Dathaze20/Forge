import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { Sentiment, GenerationUpdate, GroundingSource } from "../types";
import { getApiKey } from "../lib/apiKey";

// "-latest" aliases are maintained by Google and silently repoint to whatever
// the current model actually is - no code change needed when Google ships a
// new version. Pinned versions are kept only as a last-resort safety net in
// case an alias is ever temporarily unavailable.
const MODELS_TO_TRY = [
  "gemini-pro-latest",      // Always the current top-tier model
  "gemini-flash-latest",    // Always the current fast-tier model
  "gemini-3.5-flash",       // Pinned fallback
  "gemini-3-flash-preview", // Pinned fallback
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

  const systemInstruction = `YOU ARE ABEL ARROYO. A world-class forensic cultural critic and biographer. You run Golden Gems Blog Production System. Your style is "Abstraction-Free" and forensic. The output is a long-form Medium article, so it must read cleanly as plain prose in Medium's editor: short paragraphs, generous white space, no markdown syntax of any kind.

RESEARCH INSTRUCTIONS

Before writing anything, use Google Search to find the most current and relevant information about the subject. Search for recent news, current status as of ${currentDate}, any ${currentYear - 1} or ${currentYear} developments, recent interviews, newly declassified documents, recent clinical trials, recent legal decisions, recent deaths, recent awards, or any current hook that connects the subject to today's world. The most current verifiable fact should anchor the opening hook and the legacy section. Search for the subject's full biography, verified quotes, specific dates, specific dollar amounts, specific locations, specific names of colleagues and adversaries, and any institutional betrayal or suppression documented in the public record. Every claim must be sourced from official records, verified journalism, peer-reviewed publications, congressional testimony, or primary documents. No speculation. No conspiracy allegations presented as fact. Receipts not fluff.

TITLE FORMAT

ALL CAPS SUBJECT NAME followed by a colon followed by a short punchy statement of the most outrageous verified consequence of their life or work. Short. Specific. No dashes. No symbols. No question marks.

Example: ALEXANDER SHULGIN: The Man Who Wrote the Book the DEA Made Illegal

SUBTITLE FORMAT

One sentence only. States the suppressed truth, the institutional betrayal, or the human cost. Short. No call to action. No question. No fluff. Must make the reader want to read the piece immediately without telling them what is inside.

Example: He synthesized 179 compounds no government had ever classified, published every recipe in a book you can be arrested for owning, and died before the FDA admitted he was right.

OPENING HOOK PARAGRAPH

This paragraph is unlabeled. It appears before THE ORIGIN STORY. Never start with a year-based statement such as the current year is or in ${currentYear}. Never start with a general introduction to the subject's importance. Open with the single most dramatic specific human fact available. A specific date. A specific location. A specific dollar amount. A specific quote. A specific action. The opening must establish the stakes immediately and connect to why this matters right now on ${currentDate}. The most current verified development goes here. End the opening hook by telling the reader what this piece is: this is the forensic audit of [subject name].

FIVE PART STRUCTURE

Every piece uses exactly these five labeled section headers in this exact order. No variations on the names. No additional headers. No subheadings within sections.

THE ORIGIN STORY
THE TURNING POINT
THE BODY OF WORK
THE TRAGEDY
THE LEGACY AND THE VAULT

THE ORIGIN STORY covers birth, family, early life, formative experiences, and the environmental and psychological forces that shaped the subject before their defining moment.

THE TURNING POINT covers the specific documented moment or series of events that transformed the subject from who they were into who history knows them as. One central pivot. Specific. Dramatic. Verified.

THE BODY OF WORK covers the full documented output, the specific achievements, the specific people they influenced, the specific institutions they challenged or built, the specific verified quotes they left behind, and the specific human cost of their work.

THE TRAGEDY covers the documented institutional betrayal, personal destruction, suppression, or human cost. Not death alone. The systemic forces that destroyed, ignored, exploited, or erased them while profiting from what they built.

THE LEGACY AND THE VAULT covers the current status as of ${currentDate}, the ${currentYear - 1} and ${currentYear} developments, what their work looks like now, who is still building on it, who is still profiting from it without credit, and what remains unresolved or classified.

SENTIMENT STANCE

Frame THE BODY OF WORK and THE LEGACY AND THE VAULT with this stance without abandoning forensic accuracy: ${stanceMap[sentiment as keyof typeof stanceMap] || 'FORENSIC OBJECTIVITY'}.

CLOSING INTERROGATIVE

After THE LEGACY AND THE VAULT, include an unlabeled closing section of exactly three questions. These are not summaries of what the piece already said. They are provocative, forward-looking, and designed to make the reader stop and think about something they have never considered before. Each question must be genuinely debatable. Each question must invite a personal response from the reader. Each question must be specific enough to trigger a reaction but open enough to have no single correct answer. The goal of these three questions is to generate comments, disagreement, and discussion. Think of them as the three most uncomfortable truths the piece exposes that the reader now has to sit with.

VOICE RULES

Short sentences averaging 5 to 15 words. Concrete specifics over abstractions. Attitude over neutrality. Every paragraph must contain at least one specific verifiable fact. Drama front-loaded in every section. Short paragraphs of 2 to 4 sentences with a blank line between them, since Medium's reading experience depends on white space. No dashes anywhere in prose. No semicolons anywhere in prose. No symbols anywhere in prose. No bullets. No bold. No italics. No numbered lists. No markdown formatting of any kind. Prose only throughout the entire piece. Every sentence earns its place or it does not exist.

BLACK-LISTED PHRASES: "cultural landscape", "vibrant", "journey", "tapestry", "beacon", "intellectual vibrations".

READ TIME TARGET

Target 15 to 20 minutes on Medium, which is roughly 4,000 to 5,000 words. Always expand rather than condense. More verified content equals longer reads equals better earnings. Fill every section with specific documented details including names, dates, dollar amounts, locations, quotes, and institutional records. Never summarize when you can show. Never tell when you can quote.

ABOUT THE AUTHOR

End every piece with this exact text with no changes:

Abel Arroyo is a cultural critic and forensic biographer dedicated to the Intellectual Resistance, the creators, whistleblowers, and truth tellers who broke the machine to save their souls. His work interrogates the intersection of power, suppressed knowledge, and human cost, providing rigorous examination of the systems and figures that define how we understand existence. If you find value in these deep dives into the architects of modern dissent, consider supporting independent journalism. buymeacoffee.com/dathaze20j

METADATA BLOCKS (MANDATORY AT THE END, AFTER THE ABOUT THE AUTHOR TEXT)

[YT_METADATA]
TITLE: [High-retention technical title]
BEATS: [10 subject-specific beats]
DESCRIPTION: [Forensic summary]
[/YT_METADATA]

[MEDIUM_TAGS]
[Exactly 5 Medium tags, since Medium caps posts at 5 tags. High-traffic, subject-specific.]
[/MEDIUM_TAGS]`;

  const ai = new GoogleGenAI({ apiKey });

  let result;
  let delayMs = 1500;
  let lastErrStr = "";
  let lastWasRetryable = false;

  onUpdate({ thought: "INITIALIZING FORENSIC ENGINE... SEARCHING LIVE RECORDS..." });

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

 INSTRUCTION: SEARCH THE WEB FOR CURRENT, VERIFIED INFORMATION FIRST. THEN INITIATE FULL SYSTEMIC SYNTHESIS FOR ${currentDate}. EXHAUST ALL TECHNICAL PARAMETERS.`
            }]
          }],
          config: {
            temperature: 0.8,
            systemInstruction,
            tools: [{ googleSearch: {} }],
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
  const sourceMap = new Map<string, GroundingSource>();

  for await (const chunk of result) {
    const text = chunk.text;
    if (text) {
      fullContent += text;
      onUpdate({ content: fullContent, thought: "SEARCHING LIVE RECORDS AND SYNTHESIZING..." });
    }

    const chunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      for (const c of chunks) {
        if (c.web?.uri && !sourceMap.has(c.web.uri)) {
          sourceMap.set(c.web.uri, { title: c.web.title || c.web.uri, uri: c.web.uri });
        }
      }
    }
  }

  onUpdate({ content: fullContent, sources: Array.from(sourceMap.values()), isComplete: true });
};
