import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { env } from "../config/env.js";

export const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: env.googleApiKey,
  model: "gemini-embedding-001",
});