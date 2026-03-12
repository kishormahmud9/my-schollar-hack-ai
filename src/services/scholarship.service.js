import axios from "axios";

let cachedScholarships = null;
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 30; // Cache for 30 minutes

export async function getAllScholarships() {
  const now = Date.now();
  
  // Return cache if it's fresh
  if (cachedScholarships && (now - lastFetchTime < CACHE_DURATION)) {
    console.log("⚡ Using cached scholarships");
    return cachedScholarships;
  }

  const API_URL = process.env.SCHOLARSHIP_AI_API_URL || "https://api.myscholarhack.net/api/essay-recommendation/scholarships/all/for-ai";

  try {
    console.log("📡 Fetching scholarships from DB...");
    const response = await axios.get(API_URL);
    const data = response.data;
    
    // The API might return { data: [...] } or just [...]
    cachedScholarships = Array.isArray(data) ? data : data.data || [];
    lastFetchTime = now;
    
    console.log(`✅ Loaded ${cachedScholarships.length} scholarships from DB`);
    return cachedScholarships;
  } catch (error) {
    console.error("❌ Failed to fetch scholarships:", error.message);
    return cachedScholarships || []; // Fallback to old cache if API is down
  }
}