import { tempDB } from "../utils/tempDatabase.js";

export function getScholarships(userLevel) {
  if (userLevel === "college") {
    return tempDB.college.filter(s => s.level === "college");
  }

  if (userLevel === "university") {
    return tempDB.university.filter(s => s.level === "university");
  }

  return [];
}
