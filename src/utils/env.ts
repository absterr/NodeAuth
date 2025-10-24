import { config } from "dotenv";
import { z } from "zod";

config({ path: ".env.local" });

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.url(),
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
