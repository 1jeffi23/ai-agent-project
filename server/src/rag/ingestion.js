import fs from "fs/promises";
import crypto from "crypto";
import path from "path";
import pg from "pg";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env.js";
import { llm } from "../models/llm.js";

const { Pool } = pg;
const pool = new Pool({ connectionString: env.databaseUrl });
const ai = new GoogleGenAI({ apiKey: env.googleApiKey });

const BATCH_SIZE = 5;

function getFileHash(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

// Pure text extraction using pdfjs-dist (No canvas required)
async function extractTextFromPdf(filePath) {
  const data = await fs.readFile(filePath);
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(data) });
  const pdfDocument = await loadingTask.promise;
  let fullTextMarkdown = "";

  for (let i = 1; i <= pdfDocument.numPages; i++) {
    const page = await pdfDocument.getPage(i);
    const content = await page.getTextContent();
    
    // Extract text items and join them sequentially
    const pageText = content.items
      .map((item) => item.str)
      .join(" ");

    if (pageText.trim()) {
      fullTextMarkdown += `\n\n--- Page ${i} ---\n\n` + pageText;
    }
  }

  return fullTextMarkdown;
}

async function embedWithRetry(texts, retries = 5, delay = 5000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await ai.models.embedContent({
        model: 'gemini-embedding-001',
        contents: texts,
        config: {
          outputDimensionality: 3072, // Match your DB column or change DB to 3072
        },
      });
      
      // Add a safe 1-second pause after every successful batch to honor free tier limits
      await new Promise((res) => setTimeout(res, 1000));
      
      return response.embeddings.map(e => e.values);
    } catch (error) {
      if (error.status === "RESOURCE_EXHAUSTED" || error.code === 429) {
        console.warn(`Rate limit hit (429). Waiting ${delay / 1000}s before retry attempt ${attempt}/${retries}...`);
        await new Promise((res) => setTimeout(res, delay));
        delay *= 2; // Exponential backoff (e.g., 5s -> 10s -> 20s)
      } else {
        if (attempt === retries) throw error;
      }
    }
  }
  throw new Error("Max embedding retries reached due to rate limiting.");
}

export async function ingestDirectory(directoryPath) {
  const files = await fs.readdir(directoryPath);
  const pdfFiles = files.filter((f) => f.toLowerCase().endsWith(".pdf"));

  for (const file of pdfFiles) {
    const filePath = path.resolve(directoryPath, file);
    const filename = path.basename(filePath);
    const fileBuffer = await fs.readFile(filePath);
    const fileHash = getFileHash(fileBuffer);

    const existing = await pool.query(`SELECT * FROM rag_documents WHERE source = $1`, [filePath]);
    if (existing.rows.length > 0 && existing.rows[0].file_hash === fileHash) {
      console.log(`Skipped: ${filename} is unchanged.`);
      continue;
    }

    console.log(`Processing: ${filename}`);
    
   console.log(`Processing: ${filename}`);
    
    // Extract text directly without canvas
    const fullTextMarkdown = await extractTextFromPdf(filePath);

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const chunks = await splitter.createDocuments([fullTextMarkdown]);
    console.log(`Generated ${chunks.length} chunks.`);

    // Unconditionally clear any existing chunks for this file to prevent collision
    await pool.query(`DELETE FROM document_chunks WHERE source = $1`, [filePath]);

    let storedChunks = 0;

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const texts = batch.map((b) => b.pageContent);

      console.log(`Embedding batch ${i + 1}-${i + batch.length}...`);
      const vectors = await embedWithRetry(texts);

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        for (let j = 0; j < batch.length; j++) {
          await client.query(
            `INSERT INTO document_chunks (filename, source, file_hash, chunk_index, page_content, embedding)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [filename, filePath, fileHash, i + j, batch[j].pageContent, JSON.stringify(vectors[j])]
          );
        }
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
      storedChunks += batch.length;
    }

    await pool.query(
      `INSERT INTO rag_documents (filename, source, file_hash, chunk_count)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (source) DO UPDATE SET file_hash = EXCLUDED.file_hash, chunk_count = EXCLUDED.chunk_count, updated_at = NOW()`,
      [filename, filePath, fileHash, storedChunks]
    );

    console.log(`Successfully ingested: ${filename}`);
  }

  await pool.end();
}