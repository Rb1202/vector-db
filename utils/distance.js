export function euclidean(a, b) {
  let s = 0;

  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }

  return Math.sqrt(s);
}

export function cosine(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }

  if (na < 1e-9 || nb < 1e-9) {
    return 1;
  }

  return 1 - dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function manhattan(a, b) {
  let s = 0;

  for (let i = 0; i < a.length; i++) {
    s += Math.abs(a[i] - b[i]);
  }

  return s;
}

export function getDistFn(metric) {
  if (metric === "cosine") {
    return cosine;
  }

  if (metric === "manhattan") {
    return manhattan;
  }

  return euclidean;
}