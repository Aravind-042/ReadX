import { GoogleGenAI, Type, Modality } from "@google/genai";
import { CharacterProfile } from "../types";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateIllustration = async (prompt: string, style: string, characterProfile?: CharacterProfile): Promise<string> => {
  try {
    let fullPrompt = `${style} style illustration of: ${prompt}. Clean, high quality, digital art.`;
    if (characterProfile) {
      fullPrompt += ` The character, ${characterProfile.name}, should look like this: ${characterProfile.description}. Maintain visual consistency.`;
    }

    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: fullPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '16:9',
        },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    }
    throw new Error("No image generated");
  } catch (error) {
    console.error("Error generating illustration:", error);
    throw error;
  }
};

export const explainText = async (text: string): Promise<string> => {
  try {
    const prompt = `Explain the following text in a clear and concise way, as if you were a helpful teacher. Add vocabulary definitions if there are complex words. Text: "${text}"`;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error explaining text:", error);
    throw error;
  }
};

export const translateText = async (text: string, targetLanguage: string = "English"): Promise<string> => {
    try {
        const prompt = `Translate the following text to ${targetLanguage}. Text: "${text}"`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error translating text:", error);
        throw error;
    }
};

export const generateSpeech = async (text: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            throw new Error("No audio data returned from API.");
        }
        return base64Audio;
    } catch (error) {
        console.error("Error generating speech:", error);
        throw error;
    }
}

export const createSummaryAndFlashcard = async (text: string): Promise<{ summary: string; flashcard: { question: string; answer: string } }> => {
  try {
    const prompt = `Based on the following text, create a concise one-sentence summary and one flashcard with a question and an answer. Text: "${text}"`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            flashcard: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                answer: { type: Type.STRING },
              },
              required: ['question', 'answer']
            }
          },
          required: ['summary', 'flashcard']
        }
      }
    });
    
    const jsonStr = response.text.trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Error creating summary and flashcard:", error);
    throw error;
  }
};

export const answerQuestionWithContext = async (question: string, context: string) => {
    const prompt = `You are an AI assistant for a book reading app. Answer the user's question based ONLY on the provided context from the book. If the answer is not in the context, say "I can't find the answer to that in the book." Do not use any outside knowledge.
    
    Context from the book:
    ---
    ${context}
    ---
    
    User's Question: ${question}
    `;
    
    const response = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    
    return response;
};

export const analyzeParagraphForIllustration = async (paragraph: string): Promise<{ isVisuallySignificant: boolean; prompt: string; characterName: string | null; characterDescription: string | null; }> => {
  try {
    const prompt = `Analyze the following paragraph from a book. Determine if it describes a visually significant scene, character, or action that would be good to illustrate.
    - If it is NOT visually significant, return isVisuallySignificant as false.
    - If it IS visually significant, return isVisuallySignificant as true and create a concise, descriptive prompt for an image generation AI. The prompt should capture the scene, characters, actions, and mood.
    - Also, identify the main character's name in the scene. If no character is named, return null.
    - If a character is present, provide a brief, visually descriptive sentence about them based on the text.
    Paragraph: "${paragraph}"`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isVisuallySignificant: { type: Type.BOOLEAN },
            prompt: { type: Type.STRING, description: "The prompt for the image generator. Null if not significant." },
            characterName: { type: Type.STRING, description: "The name of the main character. Null if none." },
            characterDescription: { type: Type.STRING, description: "A visual description of the character. Null if none." }
          },
          required: ['isVisuallySignificant', 'prompt', 'characterName', 'characterDescription']
        }
      }
    });

    const jsonStr = response.text.trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Error analyzing paragraph:", error);
    // Return non-significant on error to prevent unwanted illustrations
    return { isVisuallySignificant: false, prompt: '', characterName: null, characterDescription: null };
  }
};