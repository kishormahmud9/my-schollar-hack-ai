import OpenAI from "openai";

function getClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set. Check your .env file.");
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

export async function embedTexts(texts) {
  const cleanTexts = texts
    .filter(t => typeof t === "string")
    .map(t => t.trim())
    .filter(t => t.length > 0 && t.length < 2000); // hard guard

  if (!cleanTexts.length) {
    throw new Error("No valid texts for embedding");
  }

  const client = getClient();

  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: cleanTexts
  });

  return response.data.map(d => d.embedding);
}
