import { chat } from "./openai.service.js";
import fs from "fs";
import { retrieveRules } from "./rag/retriever.js";
import { getUserProfile } from "./profile.service.js";

const systemPrompt = fs.readFileSync(
  "./src/prompts/essay.system.txt",
  "utf8"
);

/* WORD LIMIT CONTROL */

function extractWordLimit(text, defaultLimit = 250) {
  const match = text.match(/(\d{2,4})\s*words?/i);
  if (!match) return defaultLimit;

  const value = parseInt(match[1], 10);
  if (value < 100) return 100;
  if (value > 1000) return 1000;

  return value;
}

function splitBudget(total) {
  return {
    intro: Math.round(total * 0.2),
    challenge: Math.round(total * 0.25),
    action: Math.round(total * 0.25),
    growth: Math.round(total * 0.15),
    goal: Math.round(total * 0.15)
  };
}

function enforceWordLimit(text, limit) {
  const words = text.split(/\s+/);
  if (words.length <= limit) return text;

  return words.slice(0, limit).join(" ").replace(/[.,;:!?]*$/, ".");
}

/* ESSAY GENERATION */

export async function generateEssay(userInput, userId) {
  const topic = userInput.slice(0, 300);

  const wordLimit = extractWordLimit(userInput, 250);
  const budget = splitBudget(wordLimit);

  const profile = await getUserProfile(userId);

  const profileText = `
Student Name: ${profile?.name || ""}
Major: ${profile?.major || ""}
Career Goal: ${profile?.careerGoal || ""}
Key Achievement: ${profile?.achievement || ""}
Background: ${profile?.background || ""}
Challenges: ${profile?.challenges || ""}
`;

  const introRules = await retrieveRules("How to write scholarship essay introduction with hook");
  const challengeRules = await retrieveRules("How to describe challenge with specific example");
  const actionRules = await retrieveRules("How to show actions taken and effort");
  const growthRules = await retrieveRules("How to show growth and personal development");
  const goalRules = await retrieveRules("How to connect essay to future goals and impact");

  const intro = await generateSection("INTRODUCTION", topic, profileText, introRules, budget.intro);
  const challenge = await generateSection("CHALLENGE", topic, profileText, challengeRules, budget.challenge);
  const action = await generateSection("ACTION", topic, profileText, actionRules, budget.action);
  const growth = await generateSection("GROWTH", topic, profileText, growthRules, budget.growth);
  const goal = await generateSection("FUTURE GOAL", topic, profileText, goalRules, budget.goal);

  const merged = [intro, challenge, action, growth, goal].join(" ");

  return enforceWordLimit(merged, wordLimit);
}

/* 🔥 HUMANIZED SECTION GENERATION (MAIN CHANGE) */

async function generateSection(sectionName, topic, profileText, rules, wordBudget) {
  return chat([
    {
      role: "system",
      content: `
You are writing the ${sectionName} of a scholarship essay.

IDENTITY MODE:
This essay must sound like a real student describing their own life.

STRICT FACT CONSTRAINT:
You may ONLY use information found in:
- Student profile
- User input
- Uploaded document
- Transcribed audio

If specific data (grades, awards, projects, numbers) is NOT provided,
DO NOT invent it.
DO NOT replace missing facts with generic academic success stories.

HUMANIZATION RULES:
- Write in first person
- Focus on reflection and perspective, not dramatic storytelling
- Explain how experiences influenced thinking or direction
- Keep tone professional but natural

AVOID:
- "I have always been passionate"
- Overly perfect achievements
- Resume-style skill lists
- Emotional exaggeration

If information is limited, write a grounded, honest, general reflection.

Limit to ${wordBudget} words.
`

    },
    {
      role: "user",
      content: `Student Profile:\n${profileText}\n\nEssay topic/context:\n${topic}\n\nWriting rules:\n${rules}`
    }
  ]);
}

/* EXISTING UPDATE LOGIC */

export async function updateEssay(existingEssay, newContext) {
  return chat([
    {
      role: "system",
      content:
        "You are refining an existing academic essay. Do NOT invent facts. Only integrate the new information. Preserve tone and structure."
    },
    { role: "user", content: "Existing essay:\n" + existingEssay },
    { role: "user", content: "New input:\n" + newContext }
  ]);
}

export async function updateEssayFromDocument(existingEssay, documentText) {
  return chat([
    {
      role: "system",
      content:
        "You are updating an existing academic essay using a reference document. Preserve structure and voice. Extract only relevant facts. Do not add assumptions."
    },
    { role: "user", content: "Current essay:\n" + existingEssay },
    { role: "user", content: "Reference document:\n" + documentText }
  ]);
}
