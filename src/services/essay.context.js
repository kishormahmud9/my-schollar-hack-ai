// Temporary in-memory essay store
// Replace with database later

const essayStore = new Map();

export function getEssay(profileId) {
  return essayStore.get(profileId) || null;
}

export function setEssay(profileId, essay) {
  essayStore.set(profileId, essay);
}

export function clearEssay(profileId) {
  essayStore.delete(profileId);
}
