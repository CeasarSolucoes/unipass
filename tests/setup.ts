import { config } from "dotenv";

// .env.local vence, .env é fallback — mesma precedência do Next.
config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });
