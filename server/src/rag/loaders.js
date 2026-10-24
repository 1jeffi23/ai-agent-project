import fs from "fs/promises";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { Document } from "@langchain/core/documents";

export async function loadPdf(filePath) {
  const data = await fs.readFile(filePath);

  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(data),
  }).promise;

  const documents = [];

  for (
    let pageNumber = 1;
    pageNumber <= pdf.numPages;
    pageNumber++
  ) {
    const page = await pdf.getPage(pageNumber);

    const content =
      await page.getTextContent();

    const text = content.items
      .map((item) => item.str)
      .join(" ")
      .trim();

    if (!text) continue;

    documents.push(
      new Document({
        pageContent: text,
        metadata: {
          source: filePath,
          page: pageNumber,
        },
      })
    );
  }

  return documents;
}