export function validateUserProfile(user) {
  if (!user || typeof user !== "object") {
    throw new Error("Invalid user profile");
  }
  return true;
}
