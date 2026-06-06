import { GoogleGenAI } from "@google/genai";

export async function improveQuestion(draft: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `You help users write clearer questions for a live Q&A board.

Rewrite the draft below into one clear, concise question. Fix grammar and spelling. Keep the same meaning and intent. Output only the improved question — no quotes, labels, or explanation.

Draft:
${draft}`,
  });

  const improved = response.text?.trim();
  if (!improved) {
    throw new Error("AI returned an empty response");
  }

  return improved;
}
