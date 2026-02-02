import OpenAI from "openai";

/* =========================
   LEVEL-BASED FILTER
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
   RESTORE ORIGINAL AMOUNT FORMAT
   (Prevents LLM from converting "$1,000" → 1000)
========================= */
function restoreAmountFormat(recommended, originalList) {
  const map = new Map(originalList.map(s => [s.title, s.amount ?? null]));
  return recommended.map(r => ({
    ...r,
    amount: map.has(r.title) ? map.get(r.title) : null
  }));
}

/* =========================
   MAIN AGENT FUNCTION
========================= */
export async function recommendScholarships(user, scholarships) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

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
- Reuse type, deadline, and amount EXACTLY as given
- DO NOT convert currency format
- If a value is null, keep it null
- Return RAW JSON ARRAY only
- No markdown, no explanation text

FORMAT (STRICT TYPES):
[
  {
    "scholarshipId": "string",
    "title": "string",
    "type": "string",
    "detailUrl": "string",
    "subject": "string",
    "provider": "string",
    "deadline": null or "string",
    "amount": null or "string",
    "description": "string"
  }
]
`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    messages: [{ role: "user", content: prompt }]
  });

  const aiResult = safeParse(res.choices[0].message.content);

  // 🔒 FINAL DATA GUARD
  return restoreAmountFormat(aiResult, filtered);
}
