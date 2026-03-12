import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { scrapeAllScholarships } from "./utils/scraper.util.js";
import { getAllUsers } from "./services/user.service.js";
import { getAllScholarships } from "./services/scholarship.service.js";
import { recommendScholarships } from "./agent/recommendAgent.js";
import { EssayRoutes } from "./routes/essay.routes.js";
import { compareRoutes } from "./routes/compare.routes.js";
import { initializeKnowledge } from "./services/knowledge.init.js";

const PORT = process.env.PORT || 3000;
const app = express();

// Middleware
app.use(express.json());

/* =============================================
   1. SCHOLARSHIP RECOMMENDATION (UPDATED)
   - Uses Parallel Fetching for speed
   - Uses Hybrid Agent logic for efficiency
   ============================================= */
app.get("/api/ai/recommend-scholarships/:userId", async (req, res) => {
  console.log(`🎯 Recommendation request for user: ${req.params.userId}`);
  
  try {
    const { userId } = req.params;

    // RUN IN PARALLEL: Fetches users and scholarships at the same time
    const [users, scholarships] = await Promise.all([
      getAllUsers(),
      getAllScholarships()
    ]);

    // Find the specific user
    const user = users.find(u => String(u.id) === String(userId));
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: "User not found in the database" 
      });
    }

    if (!scholarships || scholarships.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: "No scholarships available to recommend" 
      });
    }

    // RECOMMEND: Trigger the optimized AI Agent
    const recommendations = await recommendScholarships(user, scholarships);

    res.json({
      success: true,
      message: "Scholarship recommendations generated successfully",
      userId: user.id,
      count: recommendations.length,
      data: recommendations 
    });

  } catch (err) {
    console.error("❌ Recommendation error:", err.message);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

/* =============================================
   2. SCRAPER API
   ============================================= */
app.post("/api/scrape-sync", async (req, res) => {
  console.log("📡 Manual scrape-sync triggered");
  try {
    const scholarships = await scrapeAllScholarships();
    res.json({
      success: true,
      count: scholarships.length,
      data: scholarships,
    });
  } catch (err) {
    console.error("❌ Scraper error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* =============================================
   3. ESSAY & COMPARE AGENTS
   ============================================= */
app.use("/api/essay", EssayRoutes);
app.use("/api", compareRoutes);

app.get("/", (req, res) => {
  res.send("My Scholar AI Agent Service is running 🚀");
});

/* =============================================
   4. SERVER STARTUP & RAG INIT
   ============================================= */
app.listen(PORT, () => {
  console.log(`-----------------------------------------------`);
  console.log(`🚀 Server is listening on port ${PORT}`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/`);
  console.log(`-----------------------------------------------`);
});

// Initialize Knowledge Base (RAG) in the background so it doesn't block startup
(async () => {
  try {
    console.log("📚 Initializing essay knowledge base...");
    await initializeKnowledge();
    console.log("✅ Essay RAG system is ready.");
  } catch (err) {
    console.error("⚠️ RAG Initialization failed:", err.message);
    console.log("👉 The server is still running, but essay generation may be limited.");
  }
})();