import fetch from "node-fetch";

export async function getUserProfile(userId) {
  const res = await fetch(process.env.USER_API_URL);

  if (!res.ok) {
    throw new Error("Failed to fetch user profiles from API");
  }

  const users = await res.json();

  // Find user by id (fallback first user if not found)
  const user = users.find(u => String(u.id) === String(userId)) || users[0];

  return {
    name: user?.name || "",
    major: user?.major || "",
    careerGoal: user?.career_goal || "",
    achievement: user?.achievement || "",
    background: user?.background || "",
    challenges: user?.challenges || ""
  };
}
