import express from "express";

import { scrapeAllScholarships } from "./utils/scraper.util.js";
import { getAllUsers } from "./services/user.service.js";
import { getScholarships } from "./services/scholarship.service.js";
import { recommendScholarships } from "./agent/recommendAgent.js";
import { tempDB } from "./utils/tempDatabase.js";
import { EssayRoutes } from "./routes/essay.routes.js";
import { compareRoutes } from "./routes/compare.routes.js";
import { loadKnowledgeText, chunkKnowledge } from "./services/rag/knowledge.loader.js";
import { embedTexts } from "./services/rag/embedder.js";
import { storeVectors } from "./services/rag/vector.store.js";
import dotenv from "dotenv";
dotenv.config();


const app = express();
app.use(express.json());

let ready = false;

/* Scrape ONLY once */
(async () => {
  await scrapeAllScholarships();
  ready = true;
})();
const PORT = process.env.PORT
/* Dynamic per-user recommendation */
app.get("/recommend/:userId", async (req, res) => {
  if (!ready) {
    return res.status(503).json({ error: "Scholarship data not ready" });
  }

  const users = await getAllUsers();
  const user = users.find(u => u.id === req.params.userId);
console.log('All users data >' , user)
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  let pool = getScholarships(user.level);

  if (!pool.length) {
    return res.status(404).json({
      error: `No scholarships available for level ${user.level}`
    });
  }

  const recommendations = await recommendScholarships(user, pool);

  res.json({
    userId: user.id,
    recommendations
  });
});

/* Optional: check scraping status */
app.get("/status", (req, res) => {
  res.json({
    ready,
    college: tempDB.college.length,
    university: tempDB.university.length
  });
});

// Essay Generation > 
app.use("/api/essay", EssayRoutes);
app.use("/test", express.static("test-ui"));

app.use("/api", compareRoutes);
app.use(express.static("test-ui"));

app.get('/', (req, res) => {
  return res.send('API is running...');
});

async function initializeEssayRAG() {
  console.log("Loading Essay RAG knowledge...");

  const rawText = loadKnowledgeText();
  const chunks = chunkKnowledge(rawText);
  const embeddings = await embedTexts(chunks);

  storeVectors(chunks, embeddings);

  console.log(`Essay RAG ready with ${chunks.length} rule chunks.`);
}

await initializeEssayRAG();


app.listen(PORT, () => {
  console.log(`Agent backend running on port ${PORT}`);
});
