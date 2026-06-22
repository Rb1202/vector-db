const OLLAMA_BASE = "http://localhost:11434";

export async function ollamaHealth() {
  try {
    const response = await fetch(`${OLLAMA_BASE}/api/tags`);

    return response.ok;
  } catch {
    return false;
  }
}

export async function listModels() {
  const response = await fetch(`${OLLAMA_BASE}/api/tags`);

  const data = await response.json();

  return data.models || [];
}
