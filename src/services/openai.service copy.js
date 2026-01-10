import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

/**
 * Force-load .env using absolute path (Windows-safe)
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../../.env")
});

if (!process.env.OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY NOT FOUND AFTER dotenv load");
  process.exit(1);
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function chat(messages) {
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    messages,
    temperature: 0.2
  });

  return response.choices[0].message.content;
}
