import { GoogleGenAI, Type } from "@google/genai";
import { EmotionResult } from "../types";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    // API Key is assumed to be available in process.env.API_KEY
    // In a real build environment this would be injected.
    // For this demo, we assume the environment is set up correctly.
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async analyzeAudioEmotion(audioBlob: Blob): Promise<EmotionResult> {
    try {
      // 1. Convert Blob to Base64
      const base64Audio = await this.blobToBase64(audioBlob);

      // 2. Prepare the model
      // Using gemini-2.5-flash-latest for low latency
      const modelId = "gemini-2.5-flash-latest";

      // 3. Define the response schema
      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          emotion: {
            type: Type.STRING,
            description: "The primary emotion detected (e.g., 愤怒, 焦虑, 兴奋, 悲伤, 恐惧, 中性).",
          },
          emoji: {
            type: Type.STRING,
            description: "A single emoji representing the emotion.",
          },
          animal: {
            type: Type.STRING,
            description: "An animal that best matches the vocal tone and intensity (e.g., Lion, Cat, Bird, Wolf).",
          },
          animalEmoji: {
             type: Type.STRING,
             description: "A single emoji representing the matched animal.",
          },
          advice: {
            type: Type.STRING,
            description: "A very short, 3-5 word calming advice.",
          },
        },
        required: ["emotion", "emoji", "animal", "animalEmoji", "advice"],
      };

      // 4. Call the API
      const response = await this.ai.models.generateContent({
        model: modelId,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: audioBlob.type || "audio/webm",
                data: base64Audio,
              },
            },
            {
              text: "Analyze the audio. Match the vocal tone, pitch, and volume to a spirit animal. E.g. Loud roar -> Lion/Tiger. High pitch scream -> Eagle/Monkey. Low grumble -> Bear. Quiet whisper -> Mouse/Cat.",
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        },
      });

      // 5. Parse result
      const text = response.text;
      if (!text) throw new Error("No response from AI");
      
      return JSON.parse(text) as EmotionResult;

    } catch (error) {
      console.error("Gemini Analysis Failed:", error);
      // Fallback
      return {
        emotion: "未知",
        emoji: "🤔",
        animal: "未知生物",
        animalEmoji: "🦕",
        advice: "深呼吸，慢慢来"
      };
    }
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:audio/webm;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

export const geminiService = new GeminiService();