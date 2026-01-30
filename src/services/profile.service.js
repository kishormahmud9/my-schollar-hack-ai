import fetch from "node-fetch";

export async function getUserProfile(userId) {
  const API_URL = process.env.USER_API_URL;

  if (!API_URL) {
    throw new Error("USER_API_URL not configured");
  }

  const res = await fetch(API_URL);

  if (!res.ok) {
    throw new Error(`User API failed with status ${res.status}`);
  }

  const raw = await res.json();

  // ✅ Normalize response shape safely
  let users;

  if (Array.isArray(raw)) {
    users = raw;
  } else if (Array.isArray(raw?.data)) {
    users = raw.data;
  } else if (Array.isArray(raw?.users)) {
    users = raw.users;
  } else if (typeof raw === "object" && raw !== null) {
    // Single user object case
    users = [raw];
  } else {
    throw new Error("User API returned unexpected format");
  }

  if (!users.length) {
    throw new Error("User list empty from API");
  }

  // Find matching user
  const user =
    users.find(u => String(u.id) === String(userId)) || users[0];

  // ✅ Safe field mapping
  return {
    name: user?.name || "",
    major: user?.major || "",
    careerGoal: user?.career_goal || "",
    achievement: user?.achievement || "",
    background: user?.background || "",
    challenges: user?.challenges || ""
  };
}
