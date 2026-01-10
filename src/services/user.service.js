import fetch from "node-fetch";

/*
LEVEL RULE (LOCK THIS):
- SSC / HSC → college
- Bachelor / Undergraduate → college
- Masters / MSc / PhD → university
*/

function normalizeLevel(education = "") {
  const e = education.toLowerCase();

  // college level
  if (
    e.includes("ssc") ||
    e.includes("hsc") ||
    e.includes("bachelor") ||
    e.includes("undergraduate") ||
    e.includes("bsc") ||
    e.includes("honours")
  ) {
    return "college";
  }

  // university level
  if (
    e.includes("master") ||
    e.includes("msc") ||
    e.includes("phd") ||
    e.includes("doctoral")
  ) {
    return "university";
  }

  // default SAFE fallback
  return "college";
}

export async function getAllUsers() {
  
  const res = await fetch(`${process.env.USER_API_BASE_URL}/api/user/all`);
  const payload = await res.json();

  const users = Array.isArray(payload)
    ? payload
    : payload.users || payload.data || [];

  return users.map(u => ({
    ...u,
    level: normalizeLevel(u.education || "")
  }));
}
