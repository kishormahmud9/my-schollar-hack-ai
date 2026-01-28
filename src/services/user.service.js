import fetch from "node-fetch";

export async function getAllUsers() {
  const USER_API = process.env.USER_API_URL;

  if (!USER_API) {
    throw new Error("USER_API_URL not set in environment variables");
  }

  const res = await fetch(USER_API);

  if (!res.ok) {
    throw new Error("Failed to fetch users from backend");
  }

  const data = await res.json();
  const users = Array.isArray(data) ? data : data.data || [];

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
