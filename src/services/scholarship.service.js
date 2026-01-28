import fetch from "node-fetch";

const BASE_URL = process.env.BACKEND_BASE_URL;

export async function getScholarships(level) {
  try {
    const res = await fetch(`${BASE_URL}/scholarships?level=${level}`);

    if (!res.ok) {
      throw new Error("Failed to fetch scholarships from backend");
    }

    const data = await res.json();

    return Array.isArray(data) ? data : data.data || [];
  } catch (err) {
    console.error("Scholarship service error:", err.message);
    return [];
  }
}
