import { GoogleGenAI, Type } from "@google/genai";
import { StudyBuddyResponse, Flashcard, MCQQuestion, ShortQuestion } from "../types";

const SYSTEM_INSTRUCTION = `You are "Study Buddy", an AI-powered study assistant created by Social Drive.
Your job is to help students learn from images of handwritten notes, textbooks, diagrams, PDF documents, or pasted text.

1. CONTENT EXTRACTION: Accurately read and understand all provided material.
2. CLEAN & STRUCTURED NOTES: Rewrite into clean headings and bullet points.
3. FLASHCARD GENERATION: Suitable for exams/revision.
4. EXAM QUESTIONS: MCQs and Short Answers.
5. DIAGRAM EXPLANATION: If present (in images), explain parts and common mistakes.
6. STUDENT-FRIENDLY STYLE: Simple, clear language.

Return response STRICTLY in JSON. Do NOT include markdown. Do NOT include extra commentary. Do NOT mention Google or Gemini.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    clean_notes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          heading: { type: Type.STRING },
          points: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["heading", "points"]
      }
    },
    flashcards: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          front: { type: Type.STRING },
          back: { type: Type.STRING }
        },
        required: ["front", "back"]
      }
    },
    exam_questions: {
      type: Type.OBJECT,
      properties: {
        mcq: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correct_answer: { type: Type.STRING }
            },
            required: ["question", "options", "correct_answer"]
          }
        },
        short: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              answer: { type: Type.STRING }
            },
            required: ["question", "answer"]
          }
        }
      },
      required: ["mcq", "short"]
    },
    diagram_explanation: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          diagram_title: { type: Type.STRING },
          explanation: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["diagram_title", "explanation"]
      }
    }
  },
  required: ["title", "clean_notes", "flashcards", "exam_questions", "diagram_explanation"]
};

// Helper function to safely get the API key from environment
function getAIInstance() {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === 'undefined') {
    throw new Error("API Key is missing. Make sure you have added 'API_KEY' to your Netlify environment variables and deployed via GitHub.");
  }
  return new GoogleGenAI({ apiKey });
}

export async function processStudyMaterial(base64Data: string, mimeType: string): Promise<StudyBuddyResponse> {
  const ai = getAIInstance();
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { data: base64Data, mimeType } },
        { text: "Analyze this study material and generate structured notes, flashcards, and exam questions as requested." }
      ]
    },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  
  try {
    const raw = JSON.parse(text);
    return {
      ...raw,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    } as StudyBuddyResponse;
  } catch (e) {
    console.error("Failed to parse JSON", text);
    throw new Error("Failed to parse AI response");
  }
}

export async function processTextMaterial(pastedText: string): Promise<StudyBuddyResponse> {
  const ai = getAIInstance();
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { text: `Analyze the following study material and generate structured notes, flashcards, and exam questions:\n\n${pastedText}` }
      ]
    },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  
  try {
    const raw = JSON.parse(text);
    return {
      ...raw,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    } as StudyBuddyResponse;
  } catch (e) {
    console.error("Failed to parse JSON", text);
    throw new Error("Failed to parse AI response");
  }
}

export async function generateMoreContent(
  base64Data: string | null, 
  mimeType: string | null, 
  pastedText: string | null,
  type: 'flashcards' | 'exam_questions' | 'mcq_only',
  existingItems: any[]
): Promise<any> {
  const ai = getAIInstance();
  
  const existingSummary = existingItems.map(item => item.front || item.question).join(", ");
  
  let prompt = "";
  if (type === 'flashcards') {
    prompt = `Based on the provided material, generate 5 NEW and UNIQUE flashcards. Do NOT repeat these existing ones: ${existingSummary}. Return ONLY an array of flashcard objects: [{front: "", back: ""}]`;
  } else if (type === 'mcq_only') {
    prompt = `Based on the provided material, generate 5 NEW and UNIQUE Multiple Choice Questions (MCQs). Do NOT repeat these existing ones: ${existingSummary}. Return ONLY an object with an mcq array: {mcq: [{question: "", options: [], correct_answer: ""}]}`;
  } else {
    prompt = `Based on the provided material, generate 3 NEW MCQs and 2 NEW short answer questions. Do NOT repeat these existing ones: ${existingSummary}. Return ONLY an object: {mcq: [{question: "", options: [], correct_answer: ""}], short: [{question: "", answer: ""}]}`;
  }

  const parts: any[] = [{ text: prompt }];
  if (base64Data && mimeType) {
    parts.unshift({ inlineData: { data: base64Data, mimeType } });
  } else if (pastedText) {
    parts.unshift({ text: `Context material:\n${pastedText}` });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts },
    config: {
      systemInstruction: "You are a helpful study assistant. Return ONLY valid JSON as requested.",
      responseMimeType: "application/json"
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  return JSON.parse(text);
}