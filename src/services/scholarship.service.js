import fetch from "node-fetch";

export async function getAllScholarships() {
  const SCHOLARSHIP_API = process.env.SCHOLARSHIP_AI_API_URL;

  if (!SCHOLARSHIP_API) {
    throw new Error("SCHOLARSHIP_AI_API_URL not set in environment variables");
  }

  const res = await fetch(SCHOLARSHIP_API);

  if (!res.ok) {
    throw new Error("Failed to fetch scholarships from backend AI endpoint");
  }

  const data = await res.json();

  return Array.isArray(data) ? data : data.data || [];
}
