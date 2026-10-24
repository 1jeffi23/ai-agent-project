
import { loadPdf } from "./loaders.js";

const docs = await loadPdf("./data/documents/rag-1.pdf");

console.log("Documents:", docs.length);

for (const doc of docs.slice(0, 10)) {
  console.log("\n---");
  console.log("Type:", doc.metadata?.category);
  console.log("Page:", doc.metadata?.page_number);
  console.log("Content:", doc.pageContent.slice(0, 300));
}