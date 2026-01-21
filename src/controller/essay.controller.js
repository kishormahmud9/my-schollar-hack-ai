import { getEssay, setEssay } from "../services/essay.context.js";
import {
  generateEssay,
  updateEssay,
  updateEssayFromDocument
} from "../services/essay.service.js";
import { readDocument } from "../services/file.service.js";
import { detectIntent } from "../services/intent.service.js";
import { cleanText } from "../utils/text.cleaner.js";
import { transcribeAudio } from "../services/whisper.service.js";

// Simulated profile
const PROFILE_ID = "temp-profile";

export async function essayHandler(req, res) {
  const promptText = cleanText(req.body?.prompt || "");

  const audioFile = req.files?.audio?.[0];
  const docFile = req.files?.file?.[0];

  let voiceText = "";
  let documentText = "";

  if (audioFile?.path) {
    voiceText = cleanText(await transcribeAudio(audioFile.path));
  }

  if (docFile?.path) {
    documentText = cleanText(
      await readDocument(docFile.path, docFile.originalname)
    );
  }

  const combined = [promptText, voiceText, documentText]
    .filter(Boolean)
    .join("\n\n");

  if (!combined) {
    return res.status(400).json({
      error:
        "Provide at least one of: prompt (text), audio (file field 'audio'), document (file field 'file')"
    });
  }

  const intent = detectIntent(combined);
  if (intent !== "ESSAY") {
    return res.json({ intent, message: combined });
  }

  const existing = getEssay(PROFILE_ID);
  let essay = existing || "";

  if (!existing) {
    // New essay from whichever inputs we got
    essay = await generateEssay(combined);
  } else {
    // Update existing essay incrementally:
    // 1) merge prompt + voice style changes
    const incremental = [promptText, voiceText].filter(Boolean).join("\n\n");
    if (incremental) {
      essay = await updateEssay(essay, incremental);
    }
    // 2) merge document as a reference (facts)
    if (documentText) {
      essay = await updateEssayFromDocument(essay, documentText);
    }
  }

  setEssay(PROFILE_ID, essay);
  return res.json({ intent: "ESSAY", essay });
}
