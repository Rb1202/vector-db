const OLLAMA_BASE = "http://localhost:11434";

export async function embedText(text) {
  const response = await fetch(`${OLLAMA_BASE}/api/embeddings`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      model: "nomic-embed-text",
      prompt: text,
    }),
  });

  const data = await response.json();

  return data.embedding;
}
