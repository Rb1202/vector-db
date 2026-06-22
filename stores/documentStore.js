class DocumentStore {
  constructor() {
    this.documents = [];
    this.nextId = 1;
  }

  // chunkVectorIds: array of VectorStore IDs for each chunk
  insert(title, text, chunks, embeddings, chunkVectorIds = []) {
    const doc = {
      id: this.nextId++,
      title,
      text,
      chunks,
      embeddings,
      chunkVectorIds, // ← needed so delete can remove vectors too
      createdAt: new Date(),
    };

    this.documents.push(doc);

    return doc;
  }

  list() {
    return this.documents;
  }

  get(id) {
    return this.documents.find((d) => d.id === id);
  }

  delete(id) {
    const idx = this.documents.findIndex((d) => d.id === id);

    if (idx === -1) {
      return false;
    }

    this.documents.splice(idx, 1);

    return true;
  }

  count() {
    return this.documents.length;
  }
}

export default DocumentStore;
