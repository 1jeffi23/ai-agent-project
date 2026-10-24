import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

import { env } from "../config/env.js";

export const llm = new ChatGoogleGenerativeAI({
  model: "gemini-3.6-flash",
  apiKey: env.googleApiKey,
  temperature: 0,
});