import dotenv from "dotenv";
dotenv.config();

import express from "express";

import { scrapeAllScholarships } from "./utils/scraper.util.js";
import { getAllUsers } from "./services/user.service.js";
import { getAllScholarships } from "./services/scholarship.service.js";
import { recommendScholarships } from "./agent/recommendAgent.js";
import { EssayRoutes } from "./routes/essay.routes.js";
import { compareRoutes } from "./routes/compare.routes.js";
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());

/* 
   SCRAPER DATA PROVIDER API
 */
app.post("/api/scrape-sync", async (req, res) => {
  console.log("📡 Scrape endpoint hit");

  try {
    // Safety: never hang forever
    const scholarships = await Promise.race([
      scrapeAllScholarships(),
      new Promise(
        (resolve) => setTimeout(() => resolve([]), 30000), // 30s max
      ),
    ]);

    if (!Array.isArray(scholarships) || scholarships.length === 0) {
      console.log("⚠ Scraper returned empty or timed out");
      return res.status(500).json({
        success: false,
        error: "Scraper returned no data",
      });
    }

    console.log(`✅ Scraped ${scholarships.length} scholarships`);

    res.json({
      success: true,
      count: scholarships.length,
      data: scholarships,
    });
  } catch (err) {
    console.error("❌ Scraper error:", err.message);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

app.get("/api/ai/recommend-scholarships/:userId", async (req, res) => {
  try {
    console.log('req.params in recommendation > ' , req.params)
    console.log("Index.js hitting");
    const { userId } = req.params;

    const users = await getAllUsers();
    const user = users.find((u) => String(u.id) === String(userId));

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    // user data okey....
    const scholarships = await getAllScholarships();
    console.log("scholarships getting > done ✅", );
    if (!scholarships.length) {
      return res.status(404).json({
        error: "No scholarships available",
      });
    }

    const recommendations = await recommendScholarships(user, scholarships);
       console.log('RECOMMENDATION DATA >> done ✅' )
    res.json({
      message : "Scholarship recommendations generated successfully",
      userId: user.id,
      level: user.level,
      data : recommendations,
    });
  } catch (err) {
    console.error("Recommendation error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/* 
   AI SCHOLARSHIP RECOMMENDATION
   api/ai/recommend-scholarships
 */

/* 
   ESSAY + COMPARE AGENTS
 */
app.use("/api/essay", EssayRoutes);
app.use("/api", compareRoutes);

/* 
   SERVER START
 */

app.get("/", (req, res) => {
  res.send("My Scholar AI is running");
});

app.listen(PORT, () => {
  console.log("hi");
  console.log(`🚀 AI Agent service running on port ${PORT}`);
});
