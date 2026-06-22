import dotenv from "dotenv";

dotenv.config();

export default {
  port: process.env.PORT,
  ollamaBase: process.env.OLLAMA_BASE,
  embedModel: process.env.EMBED_MODEL,
  genModel: process.env.GEN_MODEL,
};
