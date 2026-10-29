/** Allowed platform values for `apps.platforms` (validated in the app layer with zod). Own module so client
 * components can import it without pulling in the Drizzle schema. */
export const PLATFORMS = ["web", "ios", "android", "desktop", "telegram", "discord"] as const;
