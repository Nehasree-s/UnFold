import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

app.get("/", (req, res) => {
  res.json({
    message: "UnFold API is running",
  });
});

app.post("/api/summarize", async (req, res) => {
  try {
    const { text, length = "medium" } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        error: "No document text was provided.",
      });
    }

    const lengthInstructions = {
      short:
        "Keep the summary concise, around 3-5 sentences.",
      medium:
        "Provide a balanced summary in around 1-2 paragraphs.",
      long:
        "Provide a detailed summary covering the major ideas and important supporting details.",
    };

    const prompt = `
You are UnFold, an intelligent document analysis assistant.

Analyze ONLY the document provided below.

Your job is not just to summarize it. Understand its structure, identify its central idea, and organize its important concepts into a useful mental model.

SUMMARY LENGTH:
${lengthInstructions[length] || lengthInstructions.medium}

Return ONLY valid JSON with exactly this structure:

{
  "summary": "A clear summary of the document.",
  "keyPoints": [
    "Important idea from the document",
    "Important idea from the document",
    "Important idea from the document"
  ],
  "improvementSuggestions": [
    "A document-specific clarity or structure observation",
    "A document-specific missing-context observation",
    "A document-specific area that could be explained better"
  ],
  "insightMap": [
    {
      "title": "What the document says",
      "description": "A short explanation of this perspective.",
      "points": [
        "Important concept from the document",
        "Another important concept",
        "Another important concept"
      ]
    },
    {
      "title": "What to watch",
      "description": "Important limitations, risks, assumptions, tensions, or concerns present in the document.",
      "points": [
        "Document-specific concern",
        "Document-specific limitation",
        "Document-specific assumption"
      ]
    },
    {
      "title": "What's missing",
      "description": "Areas where the document is unclear, incomplete, or could provide more context.",
      "points": [
        "Something the document does not clearly explain",
        "A concept that needs clarification",
        "A relationship between ideas that is not fully developed"
      ]
    }
  ]
}

IMPORTANT RULES:

1. Base EVERYTHING strictly on the provided document.
2. Do not invent facts, examples, statistics, studies, sources, or claims.
3. Do not recommend adding research.
4. Do not recommend adding statistics.
5. Do not recommend adding citations or references.
6. Do not recommend adding evidence.
7. Do not recommend adding case studies.
8. Do not create generic writing advice unrelated to this specific document.
9. "What the document says" must contain ideas actually present in the document.
10. "What to watch" should identify meaningful limitations, risks, assumptions, tensions, or concerns that are supported by the document.
11. "What's missing" should identify genuinely unclear or underdeveloped areas of the document.
12. If the document does not provide enough information to make a specific observation, say so rather than inventing one.
13. Keep every point concise and useful.
14. The three insightMap categories must be present even if some categories contain fewer points.
15. Return JSON only. Do not use markdown code fences.

DOCUMENT:
${text}
`;

    let response = null;
    let lastError = null;

    const models = [
      "gemini-3.5-flash-lite",
    ];

    for (const model of models) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(
            `Gemini attempt ${attempt} using ${model}...`
          );

          response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              responseMimeType: "application/json",
            },
          });

          if (response) {
            break;
          }
        } catch (error) {
          lastError = error;

          console.error(
            `Gemini attempt ${attempt} failed:`,
            error.message
          );

          if (error.status !== 503) {
            throw error;
          }

          await new Promise((resolve) =>
            setTimeout(resolve, attempt * 1500)
          );
        }
      }

      if (response) {
        break;
      }
    }

    if (!response) {
      throw lastError || new Error("Gemini did not return a response.");
    }

    let result;

    try {
      result = JSON.parse(response.text);
    } catch (parseError) {
      console.error(
        "Failed to parse Gemini JSON:",
        response.text
      );

      throw new Error(
        "Gemini returned an invalid response format."
      );
    }

    // ---------------------------------------------
    // Safety fallback for missing fields
    // ---------------------------------------------

    if (!result.summary) {
      result.summary =
        "A summary could not be generated for this document.";
    }

    if (!Array.isArray(result.keyPoints)) {
      result.keyPoints = [];
    }

    if (!Array.isArray(result.improvementSuggestions)) {
      result.improvementSuggestions = [];
    }

    if (!Array.isArray(result.insightMap)) {
      result.insightMap = [];
    }

    res.json(result);
  } catch (error) {
    console.error("Summarization error:", error);

    const statusCode =
      error.status === 503 ? 503 : 500;

    res.status(statusCode).json({
      error:
        error.status === 503
          ? "The AI service is temporarily busy. Please try again."
          : "Failed to generate the document summary.",
    });
  }
});

app.listen(PORT, () => {
  console.log(
    `UnFold server running on http://localhost:${PORT}`
  );
});