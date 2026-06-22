import { embedText } from "./embeddingService.js";

import { demoTexts } from "../data/demoTexts.js";

export async function bootstrap(db) {
  console.log("Generating embeddings...");

  for (const item of demoTexts) {
    const embedding = await embedText(item.metadata);

    db.insert(item.metadata, item.category, embedding);

    console.log("Inserted:", item.metadata);
  }

  console.log("Bootstrap complete");
}
