export const ENV = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  // Secret for signing session cookies. Required in production.
  cookieSecret: process.env.JWT_SECRET ?? "",
  // Optional password gate. When unset the app runs in single-user open mode.
  appPassword: process.env.APP_PASSWORD ?? "",
  // Anthropic API for AI food-photo analysis.
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8",
  isProduction: process.env.NODE_ENV === "production",
};
