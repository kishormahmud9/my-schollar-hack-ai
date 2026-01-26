let VECTOR_STORE = [];

/**
 * Save embeddings with their source text
 */
export function storeVectors(chunks, embeddings) {
  if (chunks.length !== embeddings.length) {
    throw new Error("Chunks and embeddings length mismatch");
  }

  VECTOR_STORE = chunks.map((text, i) => ({
    text,
    vector: embeddings[i]
  }));
}

/**
 * Get current store
 */
export function getVectorStore() {
  return VECTOR_STORE;
}
