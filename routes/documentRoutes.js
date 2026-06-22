import express from "express";

import { ollamaHealth, listModels } from "../services/ollamaClient.js";
import { embedText } from "../services/embeddingService.js";
import DocumentStore from "../stores/documentStore.js";
import { searchDocs, askDocs } from "../services/ragService.js";
import { chunkText } from "../services/chunkingService.js";
import { db } from "../server.js"; // VectorStore instance

const router = express.Router();

const docs = new DocumentStore();

/*
STATUS
*/
router.get("/status", async (req, res) => {
  try {
    const healthy = await ollamaHealth();

    const models = healthy ? await listModels() : [];

    res.json({
      ollamaAvailable: healthy,
      models,
      documentCount: docs.count(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/*
INSERT DOCUMENT
- Chunks the text, embeds each chunk
- Inserts each chunk into VectorStore (category "doc") so it appears on the scatter
- Saves the returned vector IDs on the doc for cleanup on delete
*/
router.post("/doc/insert", async (req, res) => {
  const { title, text } = req.body;

  if (!title || !text) {
    return res.status(400).json({ error: "title and text required" });
  }

  const chunks = chunkText(text);
  const embeddings = [];
  const chunkVectorIds = [];

  for (const chunk of chunks) {
    const embedding = await embedText(chunk);
    embeddings.push(embedding);

    // Insert into VectorStore so chunk appears as a dot on the scatter plot
    // metadata = chunk text so askAI can match hits by string
    const vectorId = db.insert(chunk, "doc", embedding);
    chunkVectorIds.push(vectorId);
  }

  const doc = docs.insert(title, text, chunks, embeddings, chunkVectorIds);

  res.json({
    id: doc.id,
    chunks: chunks.length,
  });
});

/*
SEARCH DOCUMENTS
*/
router.post("/doc/search", async (req, res) => {
  const { question } = req.body;

  const hits = await searchDocs(question, docs.list());

  res.json(hits);
});

/*
ASK AI (RAG)
*/
router.post("/doc/ask", async (req, res) => {
  const { question } = req.body;

  const result = await askDocs(question, docs.list());

  res.json(result);
});

/*
LIST DOCUMENTS
*/
router.get("/doc/list", (req, res) => {
  const result = docs.list().map((doc) => ({
    id: doc.id,
    title: doc.title,
    chunkCount: doc.chunks.length,
    createdAt: doc.createdAt,
  }));

  res.json(result);
});

/*
DELETE DOCUMENT
- Removes each chunk vector from VectorStore first
- Then removes the doc from DocumentStore
*/
router.delete("/doc/delete/:id", (req, res) => {
  const id = Number(req.params.id);
  const doc = docs.get(id);

  if (!doc) {
    return res.status(404).json({ ok: false, error: "Document not found" });
  }

  // Remove every chunk vector from the scatter / VectorStore
  (doc.chunkVectorIds || []).forEach((vid) => db.remove(vid));

  const ok = docs.delete(id);

  res.json({ ok });
});

export default router;
