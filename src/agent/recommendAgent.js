import OpenAI from "openai";

/**
 * Filter out low-quality scholarships for higher education levels
 */
function isValidForLevel(s, level) {
  const t = (s.title || "").toLowerCase();
  // If user is MSC or PHD, exclude sweepstakes and "no essay" types
  if (level === "university" || level === "msc" || level === "phd") {
    return !(
      t.includes("no essay") ||
      t.includes("sweepstakes") ||
      t.includes("invite")
    );
  }
  return true;
}

/**
 * MAIN RECOMMENDATION AGENT
 */
export async function recommendScholarships(user, scholarships) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  // 1. Initial Level-Based Filter
  const filtered = scholarships.filter(s => isValidForLevel(s, user.level));

  // 2. Pre-filter by Interest (The "Speed Boost" logic)
  // We narrow down to the top 30 candidates so the AI has less to read/process
  const userInterests = (user.academicInterest || []).map(i => i.toLowerCase());
  const candidates = filtered
    .map(s => {
      let score = 0;
      const text = `${s.title} ${s.subject} ${s.description}`.toLowerCase();
      
      userInterests.forEach(interest => {
        if (text.includes(interest)) score += 10;
      });

      // Boost score if it matches the user's specific major
      if (user.major && text.includes(user.major.toLowerCase())) score += 20;
      
      return { ...s, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);

  // 3. AI JUDGMENT: Identify the best 10 IDs
  const prompt = `
You are a scholarship matching expert. Based on the user profile, select exactly 10 scholarships.

USER PROFILE:
- Name: ${user.name}
- Education Level: ${user.level}
- Major: ${user.major}
- Career Goals: ${user.careerGoal}
- Interests: ${userInterests.join(", ")}

CANDIDATES (List of IDs and Titles):
${candidates.map(c => `ID: ${c.id || c.scholarshipId} | Title: ${c.title}`).join("\n")}

STRICT RULES:
- Choose the 10 best matches.
- Return ONLY a JSON object with a key "selectedIds".
- Format: {"selectedIds": ["id1", "id2", ...]}
`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.1
  });

  const aiResult = JSON.parse(res.choices[0].message.content);
  const selectedIds = aiResult.selectedIds || [];

  // 4. MAP BACK TO STRICT JSON FORMAT
  // This ensures the response matches your required schema exactly
  const final10 = [];
  
  for (const id of selectedIds) {
    const found = filtered.find(s => String(s.id || s.scholarshipId) === String(id));
    
    if (found) {
      final10.push({
        scholarshipId: found.id || found.scholarshipId,
        title: found.title,
        type: found.type || "General",
        detailUrl: found.detailUrl || "",
        subject: found.subject || "General",
        provider: found.provider || "Scholarship DB",
        deadline: found.deadline || null,
        // FIX: Check explicitly for null/undefined so that 0 remains 0 and not null
        amount: (found.amount !== undefined && found.amount !== null) ? found.amount : null,
        description: found.description || ""
      });
    }
    
    // Safety check to return exactly 10 if AI selected more
    if (final10.length >= 10) break;
  }

  return final10;
}