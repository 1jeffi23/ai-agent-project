import { embeddings } from "./embeddings.js";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { env } from "../config/env.js";

export async function createVectorStore() {
  return await PGVectorStore.initialize(embeddings, {
    postgresConnectionOptions: {
      connectionString: env.databaseUrl,
    },

    tableName: "rag_documents",

    columns: {
      idColumnName: "id",
      vectorColumnName: "vector",
      contentColumnName: "content",
      metadataColumnName: "metadata",
    },

    distanceStrategy: "cosine",
  });
}