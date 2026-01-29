import fs from "fs";
import path from "path";

const KNOWLEDGE_PATH = path.resolve("src/knowledge/essay_rules.txt");

export function loadKnowledgeText() {
  if (!fs.existsSync(KNOWLEDGE_PATH)) {
    throw new Error("Essay RAG knowledge file not found");
  }
  return fs.readFileSync(KNOWLEDGE_PATH, "utf8");
}

export function chunkKnowledge(text, maxChunkSize = 1000) {
  const paragraphs = text.split(/\n{2,}/);
  const chunks = [];

  let current = "";

  for (const para of paragraphs) {
    const cleanPara = para.trim();
    if (!cleanPara) continue;

    if (cleanPara.length > maxChunkSize) {
      for (let i = 0; i < cleanPara.length; i += maxChunkSize) {
        chunks.push(cleanPara.slice(i, i + maxChunkSize));
      }
      continue;
    }

    if ((current + cleanPara).length > maxChunkSize) {
      if (current.trim()) chunks.push(current.trim());
      current = cleanPara;
    } else {
      current += " " + cleanPara;
    }
  }

  if (current.trim()) chunks.push(current.trim());

  return chunks.filter(c => c.length > 20);
}
