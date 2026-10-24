import {createAgent} from "langchain"
import { llm } from "../models/llm.js"
import { webSearchTool } from "../tools/web-search.tools.js"
export const researchAgent = createAgent({
    model: llm,
    tools: [webSearchTool],
    systemPrompt:  "You are a research assistant. Use web search when current or external information is needed. Provide a clear, accurate and concise answer based on the information you find.",
});