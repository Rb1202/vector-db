class KDNode {
  constructor(item) {
    this.item = item;
    this.left = null;
    this.right = null;
  }
}

class KDTree {
  constructor(dims) {
    this.root = null;
    this.dims = dims;
  }

  insert(item) {
    this.root = this._insert(this.root, item, 0);
  }

  _insert(node, item, depth) {
    if (!node) {
      return new KDNode(item);
    }

    const axis = depth % this.dims;

    if (item.embedding[axis] < node.item.embedding[axis]) {
      node.left = this._insert(node.left, item, depth + 1);
    } else {
      node.right = this._insert(node.right, item, depth + 1);
    }

    return node;
  }

  rebuild(items) {
    this.root = null;

    for (const item of items) {
      this.insert(item);
    }
  }

  knn(query, k, distFn) {
    const heap = [];

    const search = (node, depth) => {
      if (!node) {
        return;
      }

      const distance = distFn(query, node.item.embedding);

      if (heap.length < k) {
        heap.push({
          distance,
          id: node.item.id,
        });

        heap.sort((a, b) => b.distance - a.distance);
      } else if (distance < heap[0].distance) {
        heap[0] = {
          distance,
          id: node.item.id,
        };

        heap.sort((a, b) => b.distance - a.distance);
      }

      const axis = depth % this.dims;

      const diff = query[axis] - node.item.embedding[axis];

      const closer = diff < 0 ? node.left : node.right;

      const farther = diff < 0 ? node.right : node.left;

      search(closer, depth + 1);

      if (heap.length < k || Math.abs(diff) < heap[0].distance) {
        search(farther, depth + 1);
      }
    };

    search(this.root, 0);

    heap.sort((a, b) => a.distance - b.distance);

    return heap;
  }
}

export default KDTree;
