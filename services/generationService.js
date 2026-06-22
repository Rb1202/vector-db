const OLLAMA_BASE = "http://localhost:11434";

export async function generate(prompt) {
  const response = await fetch(`${OLLAMA_BASE}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3.2:1b",
      prompt,
      stream: false,
      options: {
        num_predict: 150, // max ~150 tokens ≈ 2-4 sentences
        temperature: 0.2, // low temp = more focused, less creative rambling
        top_p: 0.9,
      },
    }),
  });

  const data = await response.json();
  return data.response;
}
