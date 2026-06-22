/**
 * Splits text into overlapping chunks.
 *
 * Strategy:
 * 1. Split into sentences first (more natural boundaries than raw words)
 * 2. Group sentences until chunkSize words is reached
 * 3. Overlap by rolling back `overlap` words into the next chunk
 *
 * Defaults: 100 words per chunk, 20 word overlap
 * → better retrieval precision than 250/50 for short-to-medium docs
 */
export function chunkText(text, chunkSize = 100, overlap = 20) {
  // Normalize whitespace
  const normalized = text.replace(/\s+/g, " ").trim();

  // Split into sentences on . ! ? followed by space or end
  const sentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks = [];
  let currentWords = [];

  for (const sentence of sentences) {
    const sentenceWords = sentence.split(/\s+/);

    // If adding this sentence exceeds chunkSize, flush current chunk
    if (
      currentWords.length + sentenceWords.length > chunkSize &&
      currentWords.length > 0
    ) {
      chunks.push(currentWords.join(" "));

      // Roll back by `overlap` words for the next chunk
      currentWords = currentWords.slice(-overlap);
    }

    currentWords.push(...sentenceWords);
  }

  // Push whatever remains
  if (currentWords.length > 0) {
    chunks.push(currentWords.join(" "));
  }

  // Safety fallback: if the whole text is one giant sentence,
  // force-split it by words with the original sliding window
  if (chunks.length === 1 && chunks[0].split(/\s+/).length > chunkSize) {
    const words = chunks[0].split(/\s+/);
    const forced = [];
    let start = 0;
    while (start < words.length) {
      const end = Math.min(start + chunkSize, words.length);
      forced.push(words.slice(start, end).join(" "));
      start += chunkSize - overlap;
    }
    return forced;
  }

  return chunks;
}
