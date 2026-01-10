import fs from "fs";
import path from "path";
import { chat } from "./openai.service.js";

const systemPrompt = fs.readFileSync(
  path.resolve("src/prompts/compare.system.txt"),
  "utf8"
);

export async function compareEssays(essayA, essayB) {
  const response = await chat([
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `
ESSAY A:
${essayA}

ESSAY B:
${essayB}
`
    }
  ]);

  return JSON.parse(response);
}
