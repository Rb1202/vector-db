import { randomLevel } from "../utils/randomLevel.js";

class HNSWNode {
  constructor(item, level) {
    this.item = item;
    this.maxLyr = level;

    this.nbrs = [];

    for (let i = 0; i <= level; i++) {
      this.nbrs.push([]);
    }
  }
}

class HNSW {
  constructor(M = 16, efBuild = 200) {
    this.G = new Map();

    this.M = M;
    this.M0 = 2 * M;

    this.efBuild = efBuild;

    this.mL = 1.0 / Math.log(M);

    this.topLayer = -1;
    this.entryPt = -1;
  }

  searchLayer(query, ep, ef, layer, distFn) {
    const visited = new Set();

    const candidates = [];

    const found = [];

    const d0 = distFn(query, this.G.get(ep).item.embedding);

    visited.add(ep);

    candidates.push({
      distance: d0,
      id: ep,
    });

    found.push({
      distance: d0,
      id: ep,
    });

    while (candidates.length > 0) {
      candidates.sort((a, b) => a.distance - b.distance);

      const current = candidates.shift();

      found.sort((a, b) => b.distance - a.distance);

      if (found.length >= ef && current.distance > found[0].distance) {
        break;
      }

      const node = this.G.get(current.id);

      if (layer >= node.nbrs.length) {
        continue;
      }

      for (const nid of node.nbrs[layer]) {
        if (visited.has(nid)) {
          continue;
        }

        if (!this.G.has(nid)) {
          continue;
        }

        visited.add(nid);

        const nd = distFn(query, this.G.get(nid).item.embedding);

        if (found.length < ef || nd < found[0].distance) {
          candidates.push({
            distance: nd,
            id: nid,
          });

          found.push({
            distance: nd,
            id: nid,
          });

          if (found.length > ef) {
            found.sort((a, b) => b.distance - a.distance);

            found.shift();
          }
        }
      }
    }

    found.sort((a, b) => a.distance - b.distance);

    return found;
  }

  selectNbrs(candidates, maxM) {
    return candidates.slice(0, maxM).map((v) => v.id);
  }

  insert(item, distFn) {
    const id = item.id;

    const level = randomLevel(this.mL);

    this.G.set(id, new HNSWNode(item, level));

    if (this.entryPt === -1) {
      this.entryPt = id;
      this.topLayer = level;
      return;
    }

    let ep = this.entryPt;

    for (let lc = this.topLayer; lc > level; lc--) {
      const node = this.G.get(ep);

      if (lc < node.nbrs.length) {
        const W = this.searchLayer(item.embedding, ep, 1, lc, distFn);

        if (W.length) {
          ep = W[0].id;
        }
      }
    }

    for (let lc = Math.min(this.topLayer, level); lc >= 0; lc--) {
      const W = this.searchLayer(item.embedding, ep, this.efBuild, lc, distFn);

      const maxM = lc === 0 ? this.M0 : this.M;

      const selected = this.selectNbrs(W, maxM);

      this.G.get(id).nbrs[lc] = selected;

      for (const nid of selected) {
        if (!this.G.has(nid)) {
          continue;
        }

        const n = this.G.get(nid);

        while (n.nbrs.length <= lc) {
          n.nbrs.push([]);
        }

        n.nbrs[lc].push(id);

        if (n.nbrs[lc].length > maxM) {
          const distances = [];

          for (const c of n.nbrs[lc]) {
            if (this.G.has(c)) {
              distances.push({
                distance: distFn(
                  n.item.embedding,
                  this.G.get(c).item.embedding,
                ),
                id: c,
              });
            }
          }

          distances.sort((a, b) => a.distance - b.distance);

          n.nbrs[lc] = distances.slice(0, maxM).map((v) => v.id);
        }
      }

      if (W.length) {
        ep = W[0].id;
      }
    }

    if (level > this.topLayer) {
      this.topLayer = level;

      this.entryPt = id;
    }
  }

  knn(query, k, ef, distFn) {
    if (this.entryPt === -1) {
      return [];
    }

    let ep = this.entryPt;

    for (let lc = this.topLayer; lc > 0; lc--) {
      const node = this.G.get(ep);

      if (lc < node.nbrs.length) {
        const W = this.searchLayer(query, ep, 1, lc, distFn);

        if (W.length) {
          ep = W[0].id;
        }
      }
    }

    const W = this.searchLayer(query, ep, Math.max(ef, k), 0, distFn);

    return W.slice(0, k);
  }

  remove(id) {
    if (!this.G.has(id)) {
      return;
    }

    for (const [_, node] of this.G) {
      for (const layer of node.nbrs) {
        const idx = layer.indexOf(id);

        if (idx !== -1) {
          layer.splice(idx, 1);
        }
      }
    }

    if (this.entryPt === id) {
      this.entryPt = -1;

      for (const [nid] of this.G) {
        if (nid !== id) {
          this.entryPt = nid;
          break;
        }
      }
    }

    this.G.delete(id);
  }

  getInfo() {
    const nodes = [];
    const edges = [];

    const maxLayer = Math.max(this.topLayer + 1, 1);

    const nodesPerLayer = Array(maxLayer).fill(0);

    const edgesPerLayer = Array(maxLayer).fill(0);

    for (const [id, node] of this.G) {
      nodes.push({
        id,
        metadata: node.item.metadata,
        category: node.item.category,
        maxLyr: node.maxLyr,
      });

      for (let lc = 0; lc <= node.maxLyr; lc++) {
        nodesPerLayer[lc]++;

        for (const nid of node.nbrs[lc]) {
          if (id < nid) {
            edgesPerLayer[lc]++;

            edges.push({
              src: id,
              dst: nid,
              lyr: lc,
            });
          }
        }
      }
    }

    return {
      topLayer: this.topLayer,
      nodeCount: this.G.size,
      nodesPerLayer,
      edgesPerLayer,
      nodes,
      edges,
    };
  }

  size() {
    return this.G.size;
  }
}

export default HNSW;
