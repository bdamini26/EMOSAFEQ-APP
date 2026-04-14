import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface SituationAssessment {
  emotion: string;
  threatLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  assessment: string;
  recommendation: string;
}

export async function analyzeSituation(
  trigger: string,
  locationContext: string,
  audioDescription?: string
): Promise<SituationAssessment> {
  try {
    const prompt = `
      Analyze the following emergency situation for a personal safety app called EMOSAFEQ.
      Trigger: ${trigger}
      Location Context: ${locationContext}
      ${audioDescription ? `Audio Context: ${audioDescription}` : ''}

      Based on this, assess the likely emotion of the user, the threat level, and provide a brief assessment and recommendation for responders or the user's trusted contacts.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            emotion: { type: Type.STRING, description: "The likely emotion of the user (e.g., Panic, Fear, Distress, Calm but cautious)" },
            threatLevel: { type: Type.STRING, enum: ["Low", "Medium", "High", "Critical"], description: "The assessed threat level" },
            assessment: { type: Type.STRING, description: "A brief summary of the situation" },
            recommendation: { type: Type.STRING, description: "What the contacts should do immediately" }
          },
          required: ["emotion", "threatLevel", "assessment", "recommendation"]
        }
      }
    });

    return JSON.parse(response.text.trim());
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return {
      emotion: "Unknown",
      threatLevel: "High",
      assessment: "Emergency trigger received. Unable to perform detailed AI analysis at this time.",
      recommendation: "Contact the user immediately and check their location."
    };
  }
}
