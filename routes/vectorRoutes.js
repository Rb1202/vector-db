import express from "express";

import { db } from "../server.js";

const router = express.Router();

function parseVec(v) {
  return v
    .split(",")
    .map(Number)
    .filter((n) => !isNaN(n));
}

/*
GET /items
*/
router.get("/items", (req, res) => {
  res.json(db.getAll());
});

/*
POST /insert
*/
router.post("/insert", (req, res) => {
  const { metadata, category, embedding } = req.body;

  if (!metadata || !category || !Array.isArray(embedding) || !embedding.length) {
    return res.status(400).json({
      error: "invalid body",
    });
  }

  const id = db.insert(metadata, category, embedding);

  res.json({ id });
});

/*
DELETE /delete/:id
*/
router.delete("/delete/:id", (req, res) => {
  const id = Number(req.params.id);

  const ok = db.remove(id);

  res.json({ ok });
});

/*
GET /search
*/
router.get("/search", (req, res) => {
  const { v, k = 5, metric = "cosine", algo = "hnsw" } = req.query;

  const query = parseVec(v);

  if (!query.length) {
    return res.status(400).json({
      error: `need ${DIMS}D vector`,
    });
  }

  const result = db.search(query, Number(k), metric, algo);

  res.json({
    results: result.hits,
    latencyUs: result.latencyUs,
    algo: result.algo,
    metric: result.metric,
  });
});

/*
GET /benchmark
*/
router.get("/benchmark", (req, res) => {
  const { v, k = 5, metric = "cosine" } = req.query;

  const query = parseVec(v);

  if (!query.length) {
    return res.status(400).json({
      error: `need ${DIMS}D vector`,
    });
  }

  const bench = db.benchmark(query, Number(k), metric);

  res.json({
    bruteforceUs: bench.bfUs,

    kdtreeUs: bench.kdUs,

    hnswUs: bench.hnswUs,

    itemCount: bench.n,
  });
});

/*
GET /hnsw-info
*/
router.get("/hnsw-info", (req, res) => {
  const info = db.getHNSWInfo();

  res.json({
    topLayer: info.topLayer,
    nodeCount: info.nodeCount,
    nodesPerLayer: info.nodesPerLayer,
    edgesPerLayer: info.edgesPerLayer,
  });
});

/*
GET /stats
*/
router.get("/stats", (req, res) => {
  const items = db.getAll();

  res.json({
    count: db.size(),

    dims: items.length > 0 ? items[0].embedding.length : 0,

    algorithms: ["bruteforce", "kdtree", "hnsw"],

    metrics: ["euclidean", "cosine", "manhattan"],
  });
});

export default router;
