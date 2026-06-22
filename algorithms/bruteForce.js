export default class BruteForce {
  constructor() {
    this.items = [];
  }

  insert(item) {
    this.items.push(item);
  }

  remove(id) {
    this.items = this.items.filter((item) => item.id !== id);
  }

  knn(query, k, distFn) {
    const results = [];

    for (const item of this.items) {
      results.push({
        distance: distFn(query, item.embedding),
        id: item.id,
      });
    }

    results.sort((a, b) => a.distance - b.distance);

    return results.slice(0, k);
  }
}
