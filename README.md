# 🚀 VectorMind - Custom Vector Database, Semantic Search & RAG Engine

VectorMind is a custom-built Vector Database and Retrieval-Augmented Generation (RAG) platform developed from scratch using JavaScript and Node.js. It supports semantic search over high-dimensional embeddings, multiple nearest-neighbor search algorithms, document ingestion, local LLM integration through Ollama, and interactive visualization of vector spaces.

---

## 📌 Features

### Vector Database

* Store and retrieve 768-dimensional vector embeddings
* Support for metadata and category-based organization
* Vector insertion, deletion, and retrieval APIs

### Similarity Search Algorithms

* Brute Force Search
* KD-Tree Search
* HNSW (Hierarchical Navigable Small World)

### Distance Metrics

* Cosine Similarity
* Euclidean Distance
* Manhattan Distance

### Retrieval-Augmented Generation (RAG)

* Document upload and ingestion
* Automatic text chunking
* Embedding generation using Ollama
* Semantic retrieval of relevant chunks
* Context-aware question answering

### Dashboard

* Interactive vector search interface
* Benchmark comparison of search algorithms
* HNSW graph statistics
* Document management system
* AI-powered Ask AI module

### Visualization

* PCA-based 2D projection of embeddings
* Semantic space exploration
* Query-to-document relationship visualization

---

## 🏗️ System Architecture

```text
Documents / Text
       │
       ▼
Embedding Generation (Ollama)
       │
       ▼
Vector Database
       │
       ▼
Similarity Search
(HNSW / KD-Tree / Brute Force)
       │
       ▼
Top-K Results
       │
       ▼
RAG Pipeline
       │
       ▼
LLM (Ollama)
       │
       ▼
Final Answer
```

---

## 🧠 Algorithms Implemented

| Algorithm   | Type               | Description                                                   |
| ----------- | ------------------ | ------------------------------------------------------------- |
| Brute Force | Exact Search       | Compares query with every vector                              |
| KD-Tree     | Exact Search       | Space partitioning tree for efficient nearest-neighbor search |
| HNSW        | Approximate Search | Graph-based high-performance vector retrieval                 |

---

## 📊 Benchmarking

VectorMind includes a benchmarking module that compares:

* Search latency
* Retrieval performance
* Algorithm efficiency

Algorithms Compared:

* HNSW
* KD-Tree
* Brute Force

Supported Metrics:

* Cosine Similarity
* Euclidean Distance
* Manhattan Distance

---

## 🤖 RAG Workflow

1. Upload documents
2. Chunk document into smaller passages
3. Generate embeddings using Ollama
4. Store embeddings in VectorMind
5. User asks a question
6. Retrieve top-K relevant chunks
7. Construct context-aware prompt
8. Generate answer using local LLM

---

## 🖥️ Tech Stack

### Backend

* Node.js
* Express.js
* JavaScript (ES Modules)

### AI / ML

* Ollama
* Nomic Embed Text
* Llama 3.2

### Algorithms

* HNSW
* KD-Tree
* Brute Force Search

### Frontend

* HTML
* CSS
* Vanilla JavaScript

### Visualization

* PCA Projection
* Canvas API

---

## 📂 Project Structure

```text
VectorMind/
│
├── server/
│   ├── algorithms/
│   │   ├── bruteForce.js
│   │   ├── kdTree.js
│   │   └── hnsw.js
│   │
│   ├── routes/
│   │   ├── vectorRoutes.js
│   │   ├── docRoutes.js
│   │   └── embedRoutes.js
│   │
│   ├── services/
│   │   ├── embeddingService.js
│   │   ├── ragService.js
│   │   └── documentService.js
│   │
│   ├── stores/
│   │   └── vectorStore.js
│   │
│   ├── utils/
│   │   └── distance.js
│   │
│   ├── public/
│   │   ├── index.html
│   │   ├── styles.css
│   │   └── app.js
│   │
│   └── server.js
│
├── package.json
├── README.md
└── .gitignore
```

---

## ⚙️ Installation

### Clone Repository

```bash
git clone https://github.com/your-username/VectorMind.git

cd VectorMind
```

### Install Dependencies

```bash
npm install
```

### Install Ollama

Download:

https://ollama.com/download

---

### Pull Models

Embedding Model:

```bash
ollama pull nomic-embed-text
```

LLM Model:

```bash
ollama pull llama3.2:1b
```

---

### Verify Models

```bash
ollama list
```

Expected Output:

```text
llama3.2:1b
nomic-embed-text
```

---

### Start Ollama

```bash
ollama serve
```

---

### Start Server

```bash
npm start
```

Server:

```text
http://localhost:8080
```

---

## 🔌 API Endpoints

### Embedding

```http
POST /embed
```

Generate embeddings for text.

---

### Search

```http
GET /search
```

Perform vector similarity search.

---

### Benchmark

```http
GET /benchmark
```

Compare search algorithms.

---

### HNSW Info

```http
GET /hnsw-info
```

Retrieve HNSW graph statistics.

---

### Documents

```http
POST /doc/insert
GET /doc/list
DELETE /doc/delete/:id
```

Document management operations.

---

### Ask AI

```http
POST /doc/ask
```

Context-aware question answering.

---

## 🎯 Learning Outcomes

This project demonstrates:

* Vector Database internals
* Approximate Nearest Neighbor Search
* Semantic Search Systems
* Retrieval-Augmented Generation
* Local LLM Deployment
* Embedding-Based Information Retrieval
* Backend System Design
* Algorithm Benchmarking

---

## 🚀 Future Improvements

* Persistent vector storage
* Metadata filtering
* Hybrid keyword + vector search
* Multi-user support
* Authentication & Authorization
* Distributed vector indexing
* Advanced HNSW tuning
* Multi-document collections

---

## 👨‍💻 Author

**Rushi Bedmutha**

Computer Engineering Graduate | Software Engineer

---

## ⭐ If you found this project useful

Give the repository a star and feel free to contribute.
