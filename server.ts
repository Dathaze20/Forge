import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import cors from "cors";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // Gemini API Proxy Route
  app.post("/api/generate", async (req: express.Request, res: express.Response) => {
    console.log("Generate request received:", req.body);
    const { notes, sentiment, currentDate, currentYear } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY missing");
      return res.status(500).json({ error: "GEMINI_API_KEY is not set on the server. Please add it to your Settings > Secrets." });
    }

    try {
      const stanceMap = {
        'FOR': 'DEFENSIVE AND HONORIFIC (STILL FORENSIC)',
        'AGAINST': 'CRITICAL AND DECONSTRUCTIVE (STILL FORENSIC)'
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

      // Attempt generation with a resilient fallback and retry flow to handle 503 capacity issues
      let result;
      let attempt = 0;
      const maxAttempts = 3;
      let delayMs = 1500;
      let lastErrStr = "";
      let lastWasRetryable = false;

      const modelsToTry = [
        "gemini-3.5-flash",        // Primary modern stable flash model
        "gemini-3-flash-preview",  // Developer preview flash model
        "gemini-flash-latest"      // General alias fallback
      ];

      for (let mIndex = 0; mIndex < modelsToTry.length; mIndex++) {
        const currentModel = modelsToTry[mIndex];
        attempt = 0;
        
        while (attempt < maxAttempts) {
          try {
            console.log(`[Forge System] Attempting synthesis with model ${currentModel} (Attempt ${attempt + 1}/${maxAttempts})...`);
            
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
                systemInstruction: systemInstruction,
                ...(currentModel.startsWith("gemini-3") ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {})
              },
            });
            
            if (result) break;
          } catch (err: any) {
            attempt++;
            const errStr = err?.message || String(err);
            console.warn(`[Forge System] Attempt ${attempt} for model ${currentModel} failed:`, errStr);

            const isRetryable = errStr.includes("503") ||
                               errStr.includes("UNAVAILABLE") ||
                               errStr.includes("429") ||
                               errStr.includes("RESOURCE_EXHAUSTED") ||
                               errStr.includes("quota");

            lastErrStr = errStr;
            lastWasRetryable = isRetryable;

            if (isRetryable && attempt < maxAttempts) {
              console.log(`[Forge System] Retrying in ${delayMs}ms due to service load...`);
              await new Promise(resolve => setTimeout(resolve, delayMs));
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
          throw new Error("Your Gemini API key is invalid. Check GEMINI_API_KEY in your server settings.");
        }
        if (!lastWasRetryable && lastErrStr) {
          throw new Error(`Gemini request failed: ${lastErrStr}`);
        }
        throw new Error("All active Gemini models are currently experiencing extremely high demand. Please try again in 30-60 seconds.");
      }

      // Set headers only after successful stream acquisition
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      for await (const chunk of result) {
        const text = chunk.text;
        const response = {
          content: text,
          thought: "PROCESSING NEURAL PATHWAYS..."
        };
        res.write(`data: ${JSON.stringify(response)}\n\n`);
      }

      res.write('data: [DONE]\n\n');
      res.end();

    } catch (error) {
      console.error("Gemini Proxy Error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate content";
      
      if (res.headersSent) {
        // Since headers are already sent, stream the error payload gracefully instead of crashing due to header mutation
        const responseObject = {
          content: `\n\n[SYSTEM ERROR]: THE NEURAL FORGE EXPERIENCED AN ANOMALY.\n\n${errorMessage}\n\nPlease try again in a moment.`,
          error: errorMessage,
          thought: "NEURAL PATHS SEVERED."
        };
        try {
          res.write(`data: ${JSON.stringify(responseObject)}\n\n`);
          res.end();
        } catch (writeErr) {
          console.error("Failed to write stream error payload:", writeErr);
        }
      } else {
        res.status(500).json({ error: errorMessage });
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: express.Request, res: express.Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
