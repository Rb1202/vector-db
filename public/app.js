const API = "";

// ── Category colors resolved from CSS variables (canvas can't use var(--x)) ─
function resolveCSSColor(varName) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
}

const COL = {
  cs: resolveCSSColor("--cs"),
  math: resolveCSSColor("--math"),
  food: resolveCSSColor("--food"),
  sports: resolveCSSColor("--sports"),
  doc: resolveCSSColor("--green"), // document chunks → green
  default: resolveCSSColor("--green"),
};

// ── PCA scatter state ──────────────────────────────────────────────────────
let pcaPoints = []; // [{ x, y, item }]
let queryPt = null; // { x, y } — white star
let hitIds = new Set(); // ids of search hits (pulsing)
let hoverItem = null;
let pulse = 0;

// ── Active algorithm ───────────────────────────────────────────────────────
let currentAlgo = "hnsw";

function setAlgo(el) {
  document
    .querySelectorAll(".algo-btn")
    .forEach((b) => b.classList.remove("on"));
  el.classList.add("on");
  currentAlgo = el.dataset.algo;
}

// ── Tab switching ──────────────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.remove("on"));
  document
    .querySelectorAll(".tab-content")
    .forEach((c) => c.classList.remove("on"));
  document
    .querySelector(`.tab[onclick="switchTab('${name}')"]`)
    .classList.add("on");
  document.getElementById(`tab-${name}`).classList.add("on");
}

// ── Embed helper ───────────────────────────────────────────────────────────
async function getEmbedding(text) {
  const res = await fetch(`${API}/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const data = await res.json();
  return data.embedding;
}

// ════════════════════════════════════════════════════════════
//  PCA MATH
// ════════════════════════════════════════════════════════════
function pca2D(embs) {
  const n = embs.length,
    d = embs[0].length;
  if (n < 2) return embs.map(() => [0, 0]);

  const mean = new Array(d).fill(0);
  for (const e of embs) for (let i = 0; i < d; i++) mean[i] += e[i] / n;
  const X = embs.map((e) => e.map((v, i) => v - mean[i]));

  function powerIter(X, excl) {
    let v = new Array(d).fill(0).map(() => Math.random() - 0.5);
    if (excl) {
      let dot = v.reduce((s, vi, i) => s + vi * excl[i], 0);
      v = v.map((vi, i) => vi - dot * excl[i]);
    }
    let nrm = Math.sqrt(v.reduce((s, vi) => s + vi * vi, 0));
    v = v.map((vi) => vi / nrm);
    for (let it = 0; it < 200; it++) {
      const Xv = X.map((xi) => xi.reduce((s, xij, j) => s + xij * v[j], 0));
      const nv = new Array(d).fill(0);
      for (let k = 0; k < n; k++)
        for (let j = 0; j < d; j++) nv[j] += X[k][j] * Xv[k];
      if (excl) {
        let dot = nv.reduce((s, vi, i) => s + vi * excl[i], 0);
        for (let i = 0; i < d; i++) nv[i] -= dot * excl[i];
      }
      nrm = Math.sqrt(nv.reduce((s, vi) => s + vi * vi, 0));
      if (nrm < 1e-10) break;
      const prev = v.slice();
      v = nv.map((vi) => vi / nrm);
      if (v.reduce((s, vi, i) => s + (vi - prev[i]) ** 2, 0) < 1e-12) break;
    }
    return v;
  }

  const pc1 = powerIter(X, null),
    pc2 = powerIter(X, pc1);
  return X.map((x) => [
    x.reduce((s, v, i) => s + v * pc1[i], 0),
    x.reduce((s, v, i) => s + v * pc2[i], 0),
  ]);
}

// Recompute pcaPoints from all items + optional query embedding
function rebuildPCA(items, queryEmbedding = null) {
  if (!items.length) {
    pcaPoints = [];
    queryPt = null;
    return;
  }

  const allEmbs = items.map((it) => it.embedding);
  if (queryEmbedding) allEmbs.push(queryEmbedding);

  const coords = pca2D(allEmbs);

  // Update bounds with padding
  const xs = coords.map((c) => c[0]),
    ys = coords.map((c) => c[1]);
  const padX = (Math.max(...xs) - Math.min(...xs)) * 0.15 || 1;
  const padY = (Math.max(...ys) - Math.min(...ys)) * 0.15 || 1;
  bounds = {
    minX: Math.min(...xs) - padX,
    maxX: Math.max(...xs) + padX,
    minY: Math.min(...ys) - padY,
    maxY: Math.max(...ys) + padY,
  };

  pcaPoints = items.map((item, i) => ({
    x: coords[i][0],
    y: coords[i][1],
    item,
  }));

  if (queryEmbedding) {
    const qc = coords[coords.length - 1];
    queryPt = { x: qc[0], y: qc[1] };
  }
}

// Fetch all vectors from backend and rebuild PCA
async function refreshScatter() {
  try {
    const res = await fetch(`${API}/items`);
    const items = await res.json();
    // Keep existing queryPt if we have one — reproject with query included
    rebuildPCA(items);
  } catch (err) {
    console.error("scatter refresh failed", err);
  }
}

// ════════════════════════════════════════════════════════════
//  SCATTER PLOT RENDERER
// ════════════════════════════════════════════════════════════
const sc = document.getElementById("scatter");
const ctx = sc.getContext("2d");
let bounds = { minX: -1, maxX: 1, minY: -1, maxY: 1 };

function resize() {
  const r = sc.parentElement.getBoundingClientRect();
  sc.width = r.width;
  sc.height = r.height;
}
window.addEventListener("resize", resize);
resize();

function w2c(wx, wy) {
  const P = 70,
    W = sc.width,
    H = sc.height;
  const rx = bounds.maxX - bounds.minX || 1;
  const ry = bounds.maxY - bounds.minY || 1;
  return [
    P + ((wx - bounds.minX) / rx) * (W - 2 * P),
    H - P - ((wy - bounds.minY) / ry) * (H - 2 * P),
  ];
}

function drawFrame() {
  ctx.clearRect(0, 0, sc.width, sc.height);
  ctx.fillStyle = "#07070f";
  ctx.fillRect(0, 0, sc.width, sc.height);

  // Grid
  ctx.strokeStyle = "#0e0e1e";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 8; i++) {
    const tx = 70 + (i / 8) * (sc.width - 140);
    const ty = 70 + (i / 8) * (sc.height - 140);
    ctx.beginPath();
    ctx.moveTo(tx, 70);
    ctx.lineTo(tx, sc.height - 70);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(70, ty);
    ctx.lineTo(sc.width - 70, ty);
    ctx.stroke();
  }

  // Axis labels
  ctx.fillStyle = "#1a1a38";
  ctx.font = "11px Fira Code,monospace";
  ctx.fillText("PC₁ →", sc.width / 2 - 40, sc.height - 18);
  ctx.save();
  ctx.translate(18, sc.height / 2 + 50);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("PC₂ →", 0, 0);
  ctx.restore();
  ctx.fillStyle = "#151530";
  ctx.font = "12px Fira Code,monospace";
  ctx.fillText("2D PCA Projection  ·  Semantic Space", 80, 28);

  // Lines from query to hits
  if (queryPt && hitIds.size > 0) {
    const [qx, qy] = w2c(queryPt.x, queryPt.y);
    for (const pt of pcaPoints) {
      if (!hitIds.has(pt.item.id)) continue;
      const [px, py] = w2c(pt.x, pt.y);
      ctx.strokeStyle = "rgba(108,99,255,0.18)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(qx, qy);
      ctx.lineTo(px, py);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Points
  for (const pt of pcaPoints) {
    const [cx, cy] = w2c(pt.x, pt.y);
    const col = COL[pt.item.category] || COL.default;
    const isHit = hitIds.has(pt.item.id),
      r = isHit ? 10 : 7;

    if (isHit) {
      const pr = r + 7 + Math.sin(pulse) * 3.5;
      ctx.beginPath();
      ctx.arc(cx, cy, pr, 0, 2 * Math.PI);
      ctx.strokeStyle = col + "55";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 3);
    grd.addColorStop(0, col + (isHit ? "bb" : "88"));
    grd.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.arc(cx, cy, r * 3, 0, 2 * Math.PI);
    ctx.fillStyle = grd;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.fillStyle = col;
    ctx.fill();

    if (hoverItem && hoverItem.id === pt.item.id) {
      ctx.beginPath();
      ctx.arc(cx, cy, r + 5, 0, 2 * Math.PI);
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // Query star
  if (queryPt) {
    const [qx, qy] = w2c(queryPt.x, queryPt.y);
    ctx.save();
    ctx.translate(qx, qy);
    ctx.shadowColor = "#fff";
    ctx.shadowBlur = 18;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      const rr = i % 2 === 0 ? 13 : 5;
      if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
    ctx.fillStyle = "#aaaacc";
    ctx.font = "10px Fira Code,monospace";
    ctx.fillText("query", qx + 16, qy + 4);
  }

  // Empty state
  if (!pcaPoints.length) {
    ctx.fillStyle = "#1a1a38";
    ctx.font = "13px Fira Code,monospace";
    ctx.textAlign = "center";
    ctx.fillText("Connecting to VectorDB…", sc.width / 2, sc.height / 2);
    ctx.textAlign = "left";
  }

  pulse += 0.05;
  requestAnimationFrame(drawFrame);
}

// Tooltip + hover
sc.addEventListener("mousemove", (e) => {
  const rect = sc.getBoundingClientRect();
  const mx = e.clientX - rect.left,
    my = e.clientY - rect.top;
  hoverItem = null;
  let best = 18;
  for (const pt of pcaPoints) {
    const [cx, cy] = w2c(pt.x, pt.y);
    const d = Math.hypot(mx - cx, my - cy);
    if (d < best) {
      best = d;
      hoverItem = pt.item;
    }
  }
  const tip = document.getElementById("tip");
  if (hoverItem) {
    const col = COL[hoverItem.category] || COL.default;
    tip.style.display = "block";
    tip.style.left = e.clientX + 14 + "px";
    tip.style.top = e.clientY - 8 + "px";
    tip.innerHTML = `<span style="color:${col}">[${hoverItem.category}]</span><br>${hoverItem.metadata}`;
  } else {
    tip.style.display = "none";
  }
});
sc.addEventListener("mouseleave", () => {
  hoverItem = null;
  document.getElementById("tip").style.display = "none";
});

// Kick off the render loop
drawFrame();

// ── Search ─────────────────────────────────────────────────────────────────
async function runSearch() {
  const queryText = document.getElementById("qInput").value;
  if (!queryText.trim()) {
    alert("Enter a query");
    return;
  }

  const metric = document.getElementById("metric").value;
  const k = document.getElementById("kSlider").value;

  const latBig = document.getElementById("latBig");
  const latSub = document.getElementById("latSub");
  latBig.textContent = "…";
  latSub.textContent = "Searching";

  try {
    const embedding = await getEmbedding(queryText);
    drawEmbeddingBars(embedding);

    const t0 = performance.now();
    const searchRes = await fetch(
      `${API}/search?v=${embedding.join(",")}&k=${k}&metric=${metric}&algo=${currentAlgo}`,
    );
    const elapsed = (performance.now() - t0).toFixed(1);
    const data = await searchRes.json();

    latBig.textContent = data.latencyUs
      ? `${(data.latencyUs / 1000).toFixed(2)} ms`
      : `${elapsed} ms`;
    latSub.textContent = `${currentAlgo.toUpperCase()} · ${metric} · top-${k}`;

    const results = data.results ?? [];
    const resultsDiv = document.getElementById("results");

    if (!results.length) {
      resultsDiv.innerHTML = `<div style="color:var(--muted);font-size:11px">No results found</div>`;
      hitIds = new Set();
      queryPt = null;
      return;
    }

    resultsDiv.innerHTML = results
      .map(
        (item) => `
        <div class="result-row">
          <span class="res-id">#${item.id}</span>
          <span class="res-meta">${item.metadata}</span>
          <span class="res-cat cat-${item.category}">${item.category}</span>
          <span class="res-score">${typeof item.distance === "number" ? item.distance.toFixed(4) : "—"}</span>
        </div>`,
      )
      .join("");

    // ── Update scatter: highlight hits and place query star ────────────────
    hitIds = new Set(results.map((r) => r.id));

    // Fetch all items fresh then reproject including the query point
    const itemsRes = await fetch(`${API}/items`);
    const allItems = await itemsRes.json();
    rebuildPCA(allItems, embedding); // query star placed inside rebuildPCA
  } catch (err) {
    console.error(err);
    latBig.textContent = "ERR";
    latSub.textContent = "Search failed";
  }
}

// ── Embedding bar visualisation ────────────────────────────────────────────
function drawEmbeddingBars(embedding) {
  const canvas = document.getElementById("vecCvs");
  if (!canvas) return;
  const ctx2 = canvas.getContext("2d");
  const W = (canvas.width = canvas.offsetWidth || 200);
  const H = canvas.height;
  ctx2.clearRect(0, 0, W, H);

  const slice = embedding.slice(0, 16);
  const max = Math.max(...slice.map(Math.abs)) || 1;
  const bw = W / slice.length;

  slice.forEach((val, i) => {
    const norm = val / max;
    const barH = Math.abs(norm) * (H / 2);
    const y = norm >= 0 ? H / 2 - barH : H / 2;
    ctx2.fillStyle = norm >= 0 ? "#7c6af7" : "#f76a6a";
    ctx2.fillRect(i * bw + 1, y, bw - 2, barH);
  });
}

// ── Add demo vector ────────────────────────────────────────────────────────
async function addVector() {
  const meta = document.getElementById("addMeta").value;
  const category = document.getElementById("addCat").value;
  if (!meta.trim()) {
    alert("Enter a description");
    return;
  }

  try {
    const embedding = await getEmbedding(meta);
    await fetch(`${API}/insert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embedding, metadata: meta, category }),
    });
    document.getElementById("addMeta").value = "";
    loadStats();
    await refreshScatter(); // reflect new point immediately
    alert("Vector inserted!");
  } catch (err) {
    console.error(err);
    alert("Insert failed");
  }
}

// ── Benchmark ──────────────────────────────────────────────────────────────
async function runBenchmark() {
  const queryText = document.getElementById("qInput").value.trim();
  if (!queryText) {
    alert("Enter a query in the search box first");
    return;
  }

  const benchSec = document.getElementById("benchSec");
  const benchBars = document.getElementById("benchBars");

  switchTab("search");
  if (benchSec) benchSec.style.display = "";
  if (benchBars)
    benchBars.innerHTML = `<p style="color:var(--muted);font-size:11px">Running benchmark…</p>`;

  try {
    const embedding = await getEmbedding(queryText);
    const metric = document.getElementById("metric").value;

    const res = await fetch(
      `${API}/benchmark?v=${embedding.join(",")}&metric=${metric}`,
    );
    const data = await res.json();

    if (benchBars) {
      benchBars.innerHTML = `
        <p>🔴 Brute Force: <strong>${data.bruteforceUs} μs</strong></p>
        <p>🟡 KD-Tree:&nbsp;&nbsp;&nbsp;&nbsp;<strong>${data.kdtreeUs} μs</strong></p>
        <p>🟢 HNSW:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong>${data.hnswUs} μs</strong></p>
        <p style="color:var(--muted);font-size:11px">Vectors: ${data.itemCount}</p>
      `;
    }
  } catch (err) {
    console.error(err);
    if (benchBars)
      benchBars.innerHTML = `<p style="color:red;font-size:11px">Benchmark failed — check console</p>`;
  }
}

// ── HNSW graph layers ──────────────────────────────────────────────────────
async function loadHNSW() {
  try {
    const res = await fetch(`${API}/hnsw-info`);
    const data = await res.json();

    document.getElementById("layers").innerHTML = `
      <div class="stat-card"><h4>Total Nodes</h4><p>${data.nodeCount}</p></div>
      <div class="stat-card"><h4>Top Layer</h4><p>${data.topLayer}</p></div>
      <div class="stat-card"><h4>Nodes Per Layer</h4><p>${data.nodesPerLayer.join(", ")}</p></div>
      <div class="stat-card"><h4>Edges Per Layer</h4><p>${data.edgesPerLayer.join(", ")}</p></div>
    `;
  } catch (err) {
    console.error(err);
    document.getElementById("layers").innerHTML =
      `<div style="color:var(--muted);font-size:11px">Failed to load HNSW info</div>`;
  }
}

// ── Insert document (RAG) ──────────────────────────────────────────────────
async function insertDocument() {
  const title = document.getElementById("docTitle").value;
  const text = document.getElementById("docText").value;
  const status = document.getElementById("insertStatus");

  if (!title || !text) {
    alert("Title and document text are required");
    return;
  }

  const btn = document.getElementById("insertDocBtn");
  btn.disabled = true;
  if (status) status.textContent = "Embedding & inserting…";

  try {
    const res = await fetch(`${API}/doc/insert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, text }),
    });
    const data = await res.json();

    document.getElementById("docTitle").value = "";
    document.getElementById("docText").value = "";
    if (status) status.textContent = `✓ Inserted ${data.chunks} chunk(s)`;

    loadDocuments();
    await refreshScatter(); // doc chunks land in vectorStore too
  } catch (err) {
    console.error(err);
    if (status) status.textContent = "Insert failed";
  } finally {
    btn.disabled = false;
  }
}

// ── List documents ─────────────────────────────────────────────────────────
async function loadDocuments() {
  try {
    const res = await fetch(`${API}/doc/list`);
    const docs = await res.json();

    const container = document.getElementById("docList");
    const countLabel = document.getElementById("docCountLabel");
    if (countLabel) countLabel.textContent = docs.length;

    if (!docs.length) {
      container.innerHTML = `<div style="color:var(--muted);font-size:11px">No documents yet. Insert some above.</div>`;
      return;
    }

    container.innerHTML = docs
      .map(
        (doc) => `
        <div class="doc-card">
          <h4>${doc.title}</h4>
          <p>Chunks: ${doc.chunkCount}</p>
          <button onclick="deleteDocument(${doc.id})">Delete</button>
        </div>`,
      )
      .join("");
  } catch (err) {
    console.error(err);
  }
}

window.deleteDocument = async function (id) {
  await fetch(`${API}/doc/delete/${id}`, { method: "DELETE" });
  loadDocuments();
  await refreshScatter();
};

// ── Ask AI (RAG) ───────────────────────────────────────────────────────────
async function askAI() {
  const question = document.getElementById("ragQuestion").value;
  if (!question.trim()) {
    alert("Enter a question");
    return;
  }

  const k = document.getElementById("ragK")?.value ?? 3;
  const btn = document.getElementById("askBtn");
  const chatHistory = document.getElementById("chatHistory");

  btn.disabled = true;
  chatHistory.innerHTML = `<div style="color:var(--muted);font-size:11px">Thinking…</div>`;

  try {
    // 1. Embed the question immediately → place query star on scatter
    const qEmbedding = await getEmbedding(question);

    let allItems = [];
    try {
      const itemsRes = await fetch(`${API}/items`);
      const itemsText = await itemsRes.text();
      allItems = itemsText.trim() ? JSON.parse(itemsText) : [];
    } catch (e) {
      console.warn("Could not fetch /items for scatter:", e.message);
    }

    hitIds = new Set(); // clear old hits while thinking
    rebuildPCA(allItems, qEmbedding);

    // 2. Ask the backend
    const res = await fetch(`${API}/doc/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, k: Number(k) }),
    });

    const raw = await res.text();
    if (!raw.trim()) {
      chatHistory.innerHTML = `<div style="color:var(--muted);font-size:11px">
        The LLM returned an empty response — Ollama may still be loading the model.<br>
        Try again in a few seconds.
      </div>`;
      return;
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      console.error("Bad JSON from /doc/ask:", raw);
      chatHistory.innerHTML = `<div style="color:var(--muted);font-size:11px">
        Server returned invalid JSON — check your terminal for errors.
        <details><summary>Raw response</summary><pre>${raw.slice(0, 500)}</pre></details>
      </div>`;
      return;
    }

    if (data.error) {
      chatHistory.innerHTML = `<div style="color:var(--muted);font-size:11px">Error: ${data.error}</div>`;
      return;
    }

    // 3. Match returned context chunks to vector store items so we can pulse them.
    //    The doc/ask response returns { title, chunk, score } — we match by chunk text
    //    against item.metadata (doc chunks are inserted with chunk text as metadata).
    const contextChunks = new Set(
      (data.context || []).map((c) => c.chunk.trim()),
    );
    hitIds = new Set(
      allItems
        .filter((it) => contextChunks.has((it.metadata || "").trim()))
        .map((it) => it.id),
    );

    // Rebuild with hits now known so pulse starts immediately
    rebuildPCA(allItems, qEmbedding);

    chatHistory.innerHTML = `
      <h3>Answer</h3>
      <p>${data.answer}</p>
      <h3>Retrieved Context</h3>
      ${(data.context || [])
        .map(
          (c) => `
          <div class="context-card">
            <strong>${c.title}</strong>
            <p>${c.chunk}</p>
            <small>Similarity: ${c.score.toFixed(3)}</small>
          </div>`,
        )
        .join("")}
    `;
  } catch (err) {
    console.error(err);
    chatHistory.innerHTML = `<div style="color:var(--muted);font-size:11px">Request failed</div>`;
  } finally {
    btn.disabled = false;
    document.getElementById("ragQuestion").focus();
  }
}

// ── Stats ──────────────────────────────────────────────────────────────────
async function loadStats() {
  try {
    const res = await fetch(`${API}/stats`);
    const data = await res.json();
    const statsLabel = document.getElementById("statsLabel");
    if (statsLabel)
      statsLabel.textContent = `${data.count} vectors · ${data.dims}D`;
  } catch (err) {
    console.error("Stats load failed", err);
  }
}

// ── Ollama status ──────────────────────────────────────────────────────────
async function checkOllama() {
  const badge = document.getElementById("ollamaBadge");
  const statusDiv = document.getElementById("ollamaStatus");

  try {
    const res = await fetch("http://localhost:11434/api/tags");
    const data = await res.json();
    const models = (data.models || []).map((m) => m.name);

    const hasEmbed = models.some((m) => m.includes("nomic-embed-text"));
    const hasLLM = models.some((m) => m.includes("llama3.2"));

    if (badge) badge.textContent = "OLLAMA ✓";
    if (statusDiv)
      statusDiv.innerHTML = `
      Ollama is running ✓<br>
      <small style="color:var(--muted)">
        nomic-embed-text: ${hasEmbed ? "✓ loaded" : "✗ not found — run: ollama pull nomic-embed-text"}<br>
        llama3.2:1b: ${hasLLM ? "✓ loaded" : "✗ not found — run: ollama pull llama3.2:1b"}
      </small>
    `;
  } catch {
    if (badge) badge.textContent = "OLLAMA ✗";
    if (statusDiv)
      statusDiv.textContent = "Ollama not reachable — run: ollama serve";
  }
}

// ── Init ───────────────────────────────────────────────────────────────────
loadStats();
loadDocuments();
loadHNSW();
checkOllama();
refreshScatter(); // initial PCA projection of all vectors
