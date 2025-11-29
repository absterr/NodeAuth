import { config } from "dotenv";
import { z } from "zod";

config({ path: ".env.local" });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(8080),
  APP_ORIGIN: z.url(),
  DATABASE_URL: z.url(),
  EMAIL_FROM: z.string(),
  RESEND_API_KEY: z.string(),
  SALT_ROUNDS: z.number().default(10),
  JWT_ACCESS_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string()
});

const env = envSchema.parse(process.env);

// SAFELY MUTATE process.env
for (const [key, value] of Object.entries(env)) {
  process.env[key] = String(value);
}

declare global {
  namespace NodeJS {
    interface ProcessEnv extends z.infer<typeof envSchema> {}
  }
}

export default env;
