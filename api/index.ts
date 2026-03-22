/**
 * Vercel serverless entry point
 * Rutas: /api/* → este archivo | /* → client/dist (estático)
 */
import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import multer from "multer";

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Audio: transcripción directa con OpenAI Whisper (sin S3)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 16 * 1024 * 1024 },
  fileFilter: (_req: any, file: any, cb: any) => {
    if (file.mimetype.startsWith("audio/")) cb(null, true);
    else cb(new Error("Formato de audio no soportado"));
  },
});

app.post("/api/transcribe-audio", upload.single("file"), async (req: any, res: any) => {
  try {
    if (!req.file) { res.status(400).json({ error: "No se recibió ningún archivo" }); return; }
    const { default: OpenAI, toFile } = await import("openai");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const ext = req.file.mimetype.includes("webm") ? "webm" : req.file.mimetype.includes("mp4") ? "mp4" : "mp3";
    const audioFile = await toFile(req.file.buffer, `audio.${ext}`, { type: req.file.mimetype });
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "es",
      prompt: "Transcripción sobre un negocio local y su presencia digital en España",
    });
    res.json({ text: transcription.text, success: true });
  } catch (e) {
    console.error("[Transcribe]", e);
    res.status(500).json({ error: "Error al transcribir el audio" });
  }
});

registerOAuthRoutes(app);

app.use(
  "/api/trpc",
  createExpressMiddleware({ router: appRouter, createContext })
);

export default app;
