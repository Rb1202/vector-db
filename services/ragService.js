import { embedText } from "./embeddingService.js";

import { generate } from "./generationService.js";

function cosine(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }

  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export async function searchDocs(question, docs, k = 5) {
  const qEmbedding = await embedText(question);

  const matches = [];

  for (const doc of docs) {
    for (let i = 0; i < doc.chunks.length; i++) {
      matches.push({
        title: doc.title,
        chunk: doc.chunks[i],
        score: cosine(qEmbedding, doc.embeddings[i]),
      });
    }
  }

  matches.sort((a, b) => b.score - a.score);

  return matches.slice(0, k);
}

export async function askDocs(question, docs) {
  const topChunks = await searchDocs(question, docs);

  const context = topChunks.map((c) => c.chunk).join("\n\n");

  const hasContext = context.trim().length > 0;

  const prompt = hasContext
    ? `You are a precise assistant. Answer ONLY using the context below. Be concise (2-4 sentences max). Do not add outside knowledge.

Context:
${context}

Question: ${question}
Answer:`
    : `Answer this question concisely in 2-3 sentences: ${question}
Answer:`;

  const answer = await generate(prompt);

  return { answer, context: topChunks };
}
