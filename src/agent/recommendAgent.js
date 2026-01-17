import OpenAI from "openai";

function safeParse(text) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

export async function recommendScholarships(user, scholarships) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  const prompt = `
You are an expert scholarship recommendation agent.

USER PROFILE ANALYSIS:
- Education: ${user.education}
- Major: ${user.major}
- GPA: ${user.gpa}
- Country: ${user.country}
- Financial Need: ${user.financialNeed}
- Interests: ${(user.interests || []).join(", ")}

YOUR TASK:
1. Analyze the user's academic strength, field, and need
2. Prioritize scholarships that BEST MATCH this profile
3. Avoid generic directories or listings
4. Prefer STEM, AI, Data Science, merit or need based opportunities
5. Assume the user is an undergraduate from Bangladesh

SCHOLARSHIPS (already level filtered):
${JSON.stringify(scholarships)}

STRICT RULES:
- Recommend EXACTLY 10 scholarships
- Choose ONLY from the given list
- Return RAW JSON ARRAY only
- No markdown, no explanation text

FORMAT:
[
  {
    "scholarshipId": "",
    "title": "",
    "type": "",
    "expiryDate": null,
    "reason": "Why this fits the user's profile"
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
