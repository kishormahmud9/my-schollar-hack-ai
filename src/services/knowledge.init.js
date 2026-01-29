import { loadKnowledgeText, chunkKnowledge } from "./knowledge.loader.js";
import { embedTexts } from "./embedder.js";
import { storeVectors } from "./rag/vector.store.js";

export async function initializeKnowledge() {
  console.log("📚 Loading essay knowledge...");

  const raw = loadKnowledgeText();
  const chunks = chunkKnowledge(raw);
  const embeddings = await embedTexts(chunks);

  storeVectors(chunks, embeddings);

  console.log(`✅ Knowledge loaded: ${chunks.length} chunks embedded`);
}
