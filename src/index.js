import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { scrapeAllScholarships } from "./utils/scraper.util.js";
import { getAllUsers } from "./services/user.service.js";
import { getScholarships } from "./services/scholarship.service.js";
import { recommendScholarships } from "./agent/recommendAgent.js";
import { EssayRoutes } from "./routes/essay.routes.js";
import { compareRoutes } from "./routes/compare.routes.js";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

/* 🔥 Backend API from ENV */
const BACKEND_API = process.env.BACKEND_BULK_API;

if (!BACKEND_API) {
  console.error("BACKEND_BULK_API missing in .env");
  process.exit(1);
}


// =========================
// SCRAPER → BACKEND SYNC
// =========================
app.post("/api/scrape-sync", async (req, res) => {
  try {
    const scholarships = await scrapeAllScholarships();

    await fetch(BACKEND_API, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(scholarships )
});

    res.json({
      status: "Scraped and sent to backend",
      count: scholarships.length
    });

  } catch (err) {
    console.error("Scrape sync failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});


// =========================
// RECOMMENDATION ROUTE
// =========================
app.get("/recommend/:userId", async (req, res) => {
  try {
    const users = await getAllUsers();
    const user = users.find(u => String(u.id) === String(req.params.userId));

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const scholarships = await getScholarships(user.level);

    if (!scholarships.length) {
      return res.status(404).json({
        error: `No scholarships found for level ${user.level}`
      });
    }

    const recommendations = await recommendScholarships(user, scholarships);

    res.json({
      userId: user.id,
      recommendations
    });

  } catch (err) {
    console.error("Recommendation error:", err.message);
    res.status(500).json({ error: err.message });
  }
});


// =========================
// ESSAY + COMPARE
// =========================
app.use("/api/essay", EssayRoutes);
app.use("/api", compareRoutes);


// =========================
// SERVER START
// =========================
app.listen(PORT, () => {
  console.log(`Agent backend running on port ${PORT}`);
});
