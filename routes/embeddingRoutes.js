import express from "express";
import { embedText } from "../services/embeddingService.js";

const router = express.Router();

router.post("/embed", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({
        error: "text required",
      });
    }

    const embedding = await embedText(text);

    res.json({
      embedding,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

export default router;
