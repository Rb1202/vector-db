import VectorStore from "../stores/vectorStore.js";
import { demoVectors } from "../data/demoVectors.js";

const db = new VectorStore(16);

for (const item of demoVectors) {
  db.insert(item.metadata, item.category, item.embedding);
}

console.log("Vector Count:", db.size());

const result = db.search(demoVectors[0].embedding, 5, "cosine", "hnsw");

console.log(result);
