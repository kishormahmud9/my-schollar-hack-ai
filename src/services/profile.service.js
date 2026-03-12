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

  // ✅ 1. Normalize response shape safely (Keep your original logic)
  let users;
  if (Array.isArray(raw)) {
    users = raw;
  } else if (Array.isArray(raw?.data)) {
    users = raw.data;
  } else if (Array.isArray(raw?.users)) {
    users = raw.users;
  } else if (typeof raw === "object" && raw !== null) {
    users = [raw];
  } else {
    throw new Error("User API returned unexpected format");
  }

  if (!users.length) {
    throw new Error("User list empty from API");
  }

  // ✅ 2. Find matching user
  const user = users.find(u => String(u.id) === String(userId));
  
  if (!user) {
    throw new Error(`User with ID ${userId} not found`);
  }

  // ✅ 3. Deeply map the fields to match your actual backend JSON
  const p = user.profile || {};
  
  return {
    id: user.id,
    name: user.name || "",
    // Dig into the nested objects for AI context
    level: p.education?.level || "college", 
    major: p.academicInterest?.intendedMajor || "General",
    academicInterest: p.academicInterest?.intendedMajor ? [p.academicInterest.intendedMajor] : [],
    careerGoal: p.academicInterest?.careerGoals || "",
    familyBackground: p.familyBackground?.familySituations || "",
    studentIdentity: p.diversityIdentity?.selfIdentification || "",
    workAndVolunteer: p.volunteerWork?.whatVolunteerWork || "",
    awardsAndChallenges: p.essaySpecificQuestions?.failureStory || "",
    uniqueExperience: p.uniqueExperience?.uniqueExperiences || ""
  };
}