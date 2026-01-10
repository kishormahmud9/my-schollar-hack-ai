import fs from "fs";
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

export async function transcribeAudio(filePath) {
  const fixedPath = filePath.endsWith(".webm")
    ? filePath
    : `${filePath}.webm`;

  if (!fs.existsSync(fixedPath)) {
    fs.renameSync(filePath, fixedPath);
  }

  const openai = getOpenAI();
  const res = await openai.audio.transcriptions.create({
    file: fs.createReadStream(fixedPath),
    model: "whisper-1"
  });

  return res.text;
}
