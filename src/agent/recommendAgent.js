import OpenAI from "openai";

/* =========================
   LEVEL-BASED FILTER (ADDED)
========================= */

function isValidForLevel(s, level) {
  const t = s.title.toLowerCase();
  if (level === "msc" || level === "phd") {
    return !(
      t.includes("no essay") ||
      t.includes("sweepstakes") ||
      t.includes("invite")
    );
  }
  return true;
}

/* =========================
   SAFE JSON PARSER
========================= */

function safeParse(text) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

/* =========================
   MAIN AGENT FUNCTION
========================= */

export async function recommendScholarships(user, scholarships) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  /* 🔹 APPLY LEVEL FILTER (ONLY CHANGE IN LOGIC) */
  const filtered = scholarships.filter(s =>
    isValidForLevel(s, user.level)
  );

  const prompt = `
You are an expert scholarship recommendation agent.

USER PROFILE:
- Education Level: ${user.level}
- Academic Interests: ${(user.academicInterest || []).join(", ")}
- Country: ${user.country || "Not specified"}
- Financial Background: ${user.familyBackground || "Not specified"}
- Student Identity: ${user.studentIdentity || "Not specified"}
- Work & Volunteering: ${user.workAndVolunteer || "Not specified"}
- Awards & Challenges: ${user.awardsAndChallenges || "Not specified"}
- Unique Experience: ${user.uniqueExperience || "Not specified"}

SCHOLARSHIPS (already filtered by level):
${JSON.stringify(filtered)}

STRICT RULES:
- Recommend EXACTLY 10 scholarships
- Choose ONLY from the provided list
- DO NOT invent type, deadline, or amount
- Reuse type, deadline, and amount exactly as given
- If a value is null, keep it null
- Return RAW JSON ARRAY only
- No markdown, no explanation text

FORMAT:
[
  {
    "scholarshipId": "",
    "title": "",
    "type": "",
    "deadline": null,
    "amount": null,
    "description": ""
  }
]
`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.25,
    messages: [{ role: "user", content: prompt }]
  });

  return safeParse(res.choices[0].message.content);
}
