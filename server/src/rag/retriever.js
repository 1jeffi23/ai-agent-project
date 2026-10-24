import { ContextualCompressionRetriever } from "@langchain/classic/retrievers/contextual_compression";
import { LLMChainExtractor } from "@langchain/classic/retrievers/document_compressors/chain_extract";
import { createVectorStore } from "./vector-store.js";
import { reranker } from "./reranker.js";
import { llm } from "../models/llm.js";

export async function createRetriever() {
  const vectorStore = await createVectorStore();

  const mmrRetriever = vectorStore.asRetriever({
    searchType: "mmr",
    searchKwargs: {
      k: 10,
      fetchK: 20,
      lambda: 0.5,
    },
  });

  const compressor = LLMChainExtractor.fromLLM(llm);

  const rerankedRetriever = new ContextualCompressionRetriever({
    baseRetriever: mmrRetriever,
    baseCompressor: reranker,
  });

  return new ContextualCompressionRetriever({
    baseRetriever: rerankedRetriever,
    baseCompressor: compressor,
  });
}