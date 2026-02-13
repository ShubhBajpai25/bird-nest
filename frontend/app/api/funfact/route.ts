import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

const modelConfig = {
  model: "gemini-2.5-flash",
  generationConfig: { responseMimeType: "application/json" },
};

export async function POST(req: NextRequest) {
  try {
    const { species } = await req.json();

    if (!species || typeof species !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'species' field" },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 }
      );
    }

    const model = genAI.getGenerativeModel(modelConfig);

    const prompt = `
    ### ROLE
    You are BirdNest's fun fact engine. You are a bird expert who loves sharing fascinating, lesser-known facts about birds.

    ### TASK
    Generate a single fun fact about the bird species: "${species}".
    The fun fact should be 2-4 sentences long, engaging, and surprising.
    It should be scientifically accurate and something most people wouldn't know.

    ### OUTPUT SPECIFICATION
    Return ONLY a JSON object. Do not include markdown code blocks.
    {
      "funFact": "Your 2-4 sentence fun fact here.",
      "species": "${species}"
    }

    ### NEGATIVE CONSTRAINTS
    - NO emojis.
    - NO introductory phrases like "Did you know" or "Fun fact:".
    - NO hallucinated or inaccurate information.
    - Keep it concise and punchy.
    `;

    const result = await model.generateContent(prompt);
    const text = result.response
      .text()
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const aiData = JSON.parse(text);

    return NextResponse.json({
      funFact: aiData.funFact,
      species: aiData.species,
    });
  } catch (error) {
    console.error("Gemini Fun Fact Error:", error);
    return NextResponse.json(
      { error: "Failed to generate fun fact." },
      { status: 500 }
    );
  }
}
