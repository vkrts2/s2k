import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Geçersiz istek: 'prompt' gerekli." }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Sunucu yapılandırma hatası: GOOGLE_API_KEY tanımlı değil." }, { status: 500 });
    }

    const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const result = await model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }] });
    const text = result.response.text();

    return NextResponse.json({ text });
  } catch (err: any) {
    console.error("/api/chat error", err);
    return NextResponse.json({ error: "İstek işlenirken bir hata oluştu." }, { status: 500 });
  }
}
