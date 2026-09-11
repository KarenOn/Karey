import "server-only";

/** Public signup stays closed unless production config explicitly enables it. */
export function isPublicSignupEnabled() {
  return process.env.PUBLIC_SIGNUP_ENABLED === "true";
}
