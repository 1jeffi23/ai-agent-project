import { ChatPromptTemplate } from "@langchain/core/prompts";
import { llm } from "../models/llm.js";
import { createRetriever } from "./retriever.js";


const prompt = ChatPromptTemplate.fromTemplate(`
You are a research assistant.

Answer the user's question using only the provided context.

If the answer cannot be found in the context, say that you don't have enough information.

Context:
{context}

Question:
{question}
`);

export async function askRag(question) {
  const retriever = await createRetriever();

  const documents = await retriever.invoke(question);

const context = documents
  .map((document) => document.pageContent)
  .join("\n\n");

  const messages = await prompt.formatMessages({
    context,
    question,
  });

  const response = await llm.invoke(messages);

  const answer = Array.isArray(response.content)
    ? response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("")
    : response.content;

  return {
    answer,
    sources: rerankedDocuments,
  };
}