import { embedTexts } from "./embedder.js";
import { getVectorStore } from "./vector.store.js";

function cosineSimilarity(a, b) {
  let dot = 0.0;
  let normA = 0.0;
  let normB = 0.0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}


export async function retrieveRules(query, topK = 3) {
  const store = getVectorStore();

  if (!store.length) {
    throw new Error("Vector store is empty. Knowledge not loaded.");
  }

  const [queryVector] = await embedTexts([query]);

  const scored = store.map(item => ({
    text: item.text,
    score: cosineSimilarity(queryVector, item.vector)
  }));

  const topChunks = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(c => c.text);

  return topChunks.join("\n\n");
}
