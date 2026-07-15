import { Sentiment, GenerationUpdate, GroundingSource } from "../types";

export const generateBlogPost = async (
  notes: string, 
  sentiment: Sentiment,
  onUpdate: GenerationUpdate
): Promise<void> => {
  try {
    const now = new Date();
    const currentDate = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const currentYear = now.getFullYear();

    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        notes,
        sentiment,
        currentDate,
        currentYear,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to connect to the neural forge");
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    let fullContent = "";
    let fullThought = "INITIALIZING FORENSIC ENGINE... MAPPING DOSSIER NODES...";
    const decoder = new TextDecoder();

    onUpdate({ thought: fullThought });

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            continue;
          }
          
          let parsed: any;
          try {
            parsed = JSON.parse(data);
          } catch (jsonErr) {
            console.error("Error parsing stream chunk JSON:", jsonErr);
            continue;
          }

          if (parsed.error) {
            throw new Error(parsed.error);
          }

          if (parsed.content) {
            fullContent += parsed.content;
          }
          if (parsed.thought) {
            fullThought = parsed.thought;
          }

          onUpdate({
            content: fullContent,
            thought: fullThought,
          });
        }
      }
    }

    // Final processing for metadata
    const ytSection = fullContent.match(/\[YT_METADATA\]([\s\S]*?)\[\/YT_METADATA\]/);
    const medTags = fullContent.match(/\[MEDIUM_TAGS\]([\s\S]*?)\[\/MEDIUM_TAGS\]/);
    const cleanContent = fullContent.split(/\[YT_METADATA\]|\[MEDIUM_TAGS\]/)[0].trim();

    let ytTitle = "";
    let ytDesc = "";
    if (ytSection) {
      const lines = ytSection[1].trim().split('\n');
      ytTitle = lines.find(line => line.toLowerCase().startsWith('title:'))?.replace(/^title:\s*/i, '') || "";
      ytDesc = lines.filter(line => !line.toLowerCase().startsWith('title:')).join('\n').trim();
    }

    onUpdate({
      content: cleanContent,
      thought: fullThought,
      youtubeMetadata: {
        title: ytTitle,
        description: ytDesc,
        tags: ""
      },
      mediumMetadata: {
        tags: medTags ? medTags[1].trim().split('\n').map(t => t.trim()) : []
      },
      isComplete: true
    });

  } catch (error) {
    console.error("Neural Forge Error:", error);
    throw error;
  }
};
