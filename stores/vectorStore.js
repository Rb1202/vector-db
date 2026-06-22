import BruteForce from "../algorithms/bruteForce.js";
import KDTree from "../algorithms/kdTree.js";
import HNSW from "../algorithms/hnsw.js";

import { getDistFn } from "../utils/distance.js";

class VectorStore {
  constructor(dims = null) {
    this.dims = dims;

    this.store = new Map();

    this.bruteForce = new BruteForce();

    this.kdTree = new KDTree(dims);

    this.hnsw = new HNSW(16, 200);

    this.nextId = 1;
  }

  insert(metadata, category, embedding, distFn = getDistFn("cosine")) {
    const item = {
      id: this.nextId++,
      metadata,
      category,
      embedding,
    };

    this.store.set(item.id, item);

    this.bruteForce.insert(item);

    this.kdTree.insert(item);

    this.hnsw.insert(item, distFn);

    return item.id;
  }

  remove(id) {
    if (!this.store.has(id)) {
      return false;
    }

    this.store.delete(id);

    this.bruteForce.remove(id);

    this.hnsw.remove(id);

    const remaining = Array.from(this.store.values());

    this.kdTree.rebuild(remaining);

    return true;
  }

  search(query, k, metric, algorithm) {
    const distFn = getDistFn(metric);

    const start = performance.now();

    let rawResults = [];

    switch (algorithm) {
      case "bruteforce":
        rawResults = this.bruteForce.knn(query, k, distFn);
        break;

      case "kdtree":
        rawResults = this.kdTree.knn(query, k, distFn);
        break;

      default:
        rawResults = this.hnsw.knn(query, k, 50, distFn);
    }

    const latencyUs = Math.floor((performance.now() - start) * 1000);

    const hits = [];

    for (const r of rawResults) {
      const item = this.store.get(r.id);

      if (!item) {
        continue;
      }

      hits.push({
        id: item.id,
        metadata: item.metadata,
        category: item.category,
        embedding: item.embedding,
        distance: r.distance,
      });
    }

    return {
      hits,
      latencyUs,
      algo: algorithm,
      metric,
    };
  }

  benchmark(query, k, metric) {
    const distFn = getDistFn(metric);

    const measure = (fn) => {
      const start = performance.now();

      fn();

      return Math.floor((performance.now() - start) * 1000);
    };

    return {
      bfUs: measure(() => this.bruteForce.knn(query, k, distFn)),

      kdUs: measure(() => this.kdTree.knn(query, k, distFn)),

      hnswUs: measure(() => this.hnsw.knn(query, k, 50, distFn)),

      n: this.store.size,
    };
  }

  getAll() {
    return Array.from(this.store.values());
  }

  getHNSWInfo() {
    return this.hnsw.getInfo();
  }

  size() {
    return this.store.size;
  }
}

export default VectorStore;
