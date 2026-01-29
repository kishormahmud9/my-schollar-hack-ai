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
import { getUserProfile } from "../services/profile.service.js";

export async function essayHandler(req, res) {
  try {
    /* ---------------- USER ID REQUIRED ---------------- */
    const PROFILE_ID = req.params.userId;

    if (!PROFILE_ID) {
      return res.status(400).json({ error: "userId is required" });
    }

    // Validate user profile exists (prevents fake ID usage)
    await getUserProfile(PROFILE_ID);

    /* ---------------- INPUT COLLECTION ---------------- */
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
          "Provide at least one of: prompt, audio, or document"
      });
    }

    /* ---------------- INTENT CHECK ---------------- */
    const intent = detectIntent(combined);
    if (intent !== "ESSAY") {
      return res.json({ intent, message: combined });
    }

    /* ---------------- ESSAY MEMORY PER USER ---------------- */
    const existing = getEssay(PROFILE_ID);
    let essay = existing || "";

    if (!existing) {
      essay = await generateEssay(combined, PROFILE_ID);
    } else {
      const incremental = [promptText, voiceText].filter(Boolean).join("\n\n");

      if (incremental) {
        essay = await updateEssay(essay, incremental);
      }

      if (documentText) {
        essay = await updateEssayFromDocument(essay, documentText);
      }
    }

    setEssay(PROFILE_ID, essay);

    return res.json({ intent: "ESSAY", essay });

  } catch (err) {
    console.error("Essay generation error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
