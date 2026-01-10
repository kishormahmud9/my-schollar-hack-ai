import OpenAI from "openai";

let client = null;

function getOpenAI() {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return client;
}

export async function chat(messages) {
  const openai = getOpenAI();

  const res = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL,
    messages
  });

  return res.choices[0].message.content;
}
