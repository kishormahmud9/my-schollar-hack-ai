import { chat } from "./openai.service.js";
import fs from "fs";

const systemPrompt = fs.readFileSync(
  "./src/prompts/essay.system.txt",
  "utf8"
);

// Create new essay (used by PROMPT)
export async function generateEssay(context) {
  return chat([
    { role: "system", content: systemPrompt },
    { role: "user", content: context }
  ]);
}

// Update essay using VOICE (incremental refinement)
export async function updateEssay(existingEssay, newContext) {
  return chat([
    {
      role: "system",
      content:
        "You are refining an existing academic essay. " +
        "Do NOT invent facts. Only integrate the new information. " +
        "Preserve tone and structure."
    },
    { role: "user", content: "Existing essay:\n" + existingEssay },
    { role: "user", content: "New input:\n" + newContext }
  ]);
}

// Update essay using DOCUMENT (reference-based merge)
export async function updateEssayFromDocument(existingEssay, documentText) {
  return chat([
    {
      role: "system",
      content:
        "You are updating an existing academic essay using a reference document.\n" +
        "Rules:\n" +
        "- Do NOT rewrite the essay from scratch\n" +
        "- Preserve structure, tone, and voice\n" +
        "- Only extract relevant facts from the document\n" +
        "- Integrate carefully without duplication\n" +
        "- Do NOT add assumptions or new facts"
    },
    { role: "user", content: "Current essay:\n" + existingEssay },
    { role: "user", content: "Reference document:\n" + documentText }
  ]);
}
