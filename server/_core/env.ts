export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "dev-secret-change-in-production-32c",
  databaseUrl: process.env.DATABASE_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "admin",
  isProduction: process.env.NODE_ENV === "production",
  // LLM
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  // Admin dashboard
  adminPassword: process.env.ADMIN_PASSWORD ?? "elexxia2026",
  adminEmail: process.env.ADMIN_EMAIL ?? "admin@elexxia.es",
  // Email (Resend)
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "Elexxia <diagnostico@elexxia.com>",
  // Notificaciones Telegram
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  telegramOwnerChatId: process.env.TELEGRAM_OWNER_CHAT_ID ?? "",
};
