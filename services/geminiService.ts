import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';

// Initialize only if key exists, otherwise we handle it gracefully in the app
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const getGeminiReply = async (userMessage: string): Promise<string> => {
  if (!ai) {
    return "Gemini API Key is missing. Please configure encryption keys and check settings.";
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userMessage,
      config: {
        systemInstruction: "You are a helpful assistant inside a secure messaging app. Keep your replies concise and conversational, like a text message."
      }
    });

    return response.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I'm having trouble connecting right now.";
  }
};