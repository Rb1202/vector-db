import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import documentRoutes from "./routes/documentRoutes.js";
import vectorRoutes from "./routes/vectorRoutes.js";
import embeddingRoutes from "./routes/embeddingRoutes.js";
import VectorStore from "./stores/vectorStore.js";
import { bootstrap } from "./services/bootstrapVectors.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 8080;

export const db = new VectorStore();
await bootstrap(db);

app.use(cors());

app.use(
  express.json({
    limit: "10mb",
  }),
);

app.use(express.static(path.join(__dirname, "public")));
app.use("/", vectorRoutes);
app.use("/", documentRoutes);
app.use("/", embeddingRoutes);

app.listen(PORT, () => {
  console.log(`VectorDB running on http://localhost:${PORT}`);
});
