// import { detectIntent } from "../services/intent.service.js";
// import { generateEssay, updateEssay } from "../services/essay.service.js";
// import { transcribeAudio } from "../services/whisper.service.js";
// import { readDocument } from "../services/file.service.js";
// import { cleanText } from "../utils/text.cleaner.js";
// import { getEssay, setEssay } from "../services/essay.context.js";

import { getEssay, setEssay } from "../services/essay.context.js";
import { generateEssay, updateEssay } from "../services/essay.service.js";
import { readDocument } from "../services/file.service.js";
import { detectIntent } from "../services/intent.service.js";
import { cleanText } from "../utils/text.cleaner.js";

// Simulated profile
const PROFILE_ID = "temp-profile";

export async function promptEssay(req, res) {
  const cleaned = cleanText(req.body.prompt || "");
  const intent = detectIntent(cleaned);

  if (intent !== "ESSAY") {
    return res.json({ intent, message: cleaned });
  }

  const essay = await generateEssay(cleaned);
  setEssay(PROFILE_ID, essay);

  return res.json({ intent, essay });
}

export async function voiceEssay(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: "Audio file missing" });
  }

  const text = cleanText(await transcribeAudio(req.file.path));
  const existing = getEssay(PROFILE_ID);

  const essay = existing
    ? await updateEssay(existing, text)
    : await generateEssay(text);

  setEssay(PROFILE_ID, essay);
  return res.json({ intent: "ESSAY", essay });
}

export async function documentEssay(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: "Document file missing" });
  }

  const text = cleanText(
    await readDocument(req.file.path, req.file.originalname)
  );

  const existing = getEssay(PROFILE_ID);
  const essay = existing
    ? await updateEssay(existing, text)
    : await generateEssay(text);

  setEssay(PROFILE_ID, essay);
  return res.json({ intent: "ESSAY", essay });
}
