import { z } from "zod";

const envSchema = z.object({
  NODE_ENV:      z.enum(["development", "production", "test"]).default("development"),
  PORT:          z.coerce.number().default(4000),
  DATABASE_URL:  z.string().default("postgres://meridian:meridian@localhost:5432/meridian"),
  JWT_SECRET:    z.string().min(32).default("CHANGE_THIS_IN_PRODUCTION_32_CHARS_MIN"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  CORS_ORIGINS:  z.string().default("http://localhost:5173"),
  LOG_LEVEL:     z.enum(["trace","debug","info","warn","error","fatal"]).default("info"),
  // Legacy: Meridian API token (kept for backward compat during migration)
  MERIDIAN_API_TOKEN: z.string().optional(),
  // Google Sheets export
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().optional(),
  GOOGLE_PRIVATE_KEY:           z.string().optional(),
  GOOGLE_SHEET_ID:              z.string().optional(),
  CHANNEL_CRED_SECRET:          z.string().optional(), // for migrating legacy encrypted passwords
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
