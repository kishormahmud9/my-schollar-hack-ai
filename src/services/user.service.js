import fetch from "node-fetch";

export async function getAllUsers() {
  const res = await fetch(process.env.USER_API_URL);

  if (!res.ok) {
    throw new Error("Failed to fetch user profiles from backend");
  }

  const json = await res.json();

  const users = json.data || [];   // 🔥 FIX HERE

  return users.map(u => ({
    ...u,
    level: normalizeLevel(u.education || "")
  }));
}

function normalizeLevel(education = "") {
  const e = education.toLowerCase();

  if (
    e.includes("ssc") ||
    e.includes("hsc") ||
    e.includes("bachelor") ||
    e.includes("undergraduate") ||
    e.includes("bsc") ||
    e.includes("honours")
  ) return "college";

  if (
    e.includes("master") ||
    e.includes("msc") ||
    e.includes("phd") ||
    e.includes("doctoral")
  ) return "university";

  return "college";
}
