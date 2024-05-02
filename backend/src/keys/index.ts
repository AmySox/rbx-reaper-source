// =====================
// SECTION | CONFIG
// =====================
import * as dotenv from 'dotenv';

dotenv.config();
// =====================!SECTION

// =====================
// SECTION | KEYS
// =====================
export const isProd = process.env.NODE_ENV === 'production';
export const mongoUri = process.env.MONGO_URI!;
export const sentryDsn = process.env.SENTRY_DSN!;
export const secretToken = process.env.SECRET_TOKEN!;
export const randomOrgApiKey = process.env.RANDOM_ORG_API_KEY!;
export const redisUrl = process.env.REDIS_URL!;
export const bunnyAccessKey = process.env.BUNNY_ACCESS_KEY!;
// =====================!SECTION
