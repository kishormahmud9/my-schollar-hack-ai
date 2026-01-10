export function detectIntent(text) {
  if (!text || typeof text !== "string") return "CHAT";

  const t = text.trim().toLowerCase();
  if (["hi", "hello", "hey"].includes(t)) return "CHAT";

  return "ESSAY";
}
