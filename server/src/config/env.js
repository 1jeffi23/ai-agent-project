import "dotenv/config";

if (!process.env.GOOGLE_API_KEY) {
  throw new Error("GOOGLE_API_KEY is missing");
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing");
}

export const env = {
  googleApiKey: process.env.GOOGLE_API_KEY,
  databaseUrl: process.env.DATABASE_URL,
};