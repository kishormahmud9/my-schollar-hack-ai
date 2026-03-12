import OpenAI from "openai";

let client = null;

function getOpenAI() {
  if (!client) {
    if (!process.env.OPENAI_API_KEY) {
       throw new Error("OPENAI_API_KEY is missing in .env");
    }
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return client;
}

export async function chat(messages) {
  const openai = getOpenAI();
  const res = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini", // Add fallback
    messages
  });
  return res.choices[0].message.content;
}