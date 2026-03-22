import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import path from "path";
import fs from "fs";
import os from "os";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import multer from "multer";
import { ENV } from "./env";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Endpoint para subir audio y transcribir con OpenAI Whisper
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 16 * 1024 * 1024 }, // 16MB máximo
    fileFilter: (_req, file, cb) => {
      const allowed = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a'];
      if (allowed.includes(file.mimetype) || file.mimetype.startsWith('audio/')) {
        cb(null, true);
      } else {
        cb(new Error('Formato de audio no soportado'));
      }
    },
  });

  app.post('/api/transcribe-audio', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) { res.status(400).json({ error: 'No se recibió ningún archivo' }); return; }
      const OpenAI = (await import('openai')).default;
      const { toFile } = await import('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const ext = req.file.mimetype.includes('webm') ? 'webm' : req.file.mimetype.includes('mp4') ? 'mp4' : 'mp3';
      const audioFile = await toFile(req.file.buffer, `audio.${ext}`, { type: req.file.mimetype });
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile, model: 'whisper-1', language: 'es',
        prompt: 'Transcripción sobre un negocio local y su presencia digital en España',
      });
      res.json({ text: transcription.text, success: true });
    } catch (error) {
      console.error('[Transcribe Audio]', error);
      res.status(500).json({ error: 'Error al transcribir el audio' });
    }
  });

  // Servir archivos temporales
  app.get('/api/temp-files/:filename', (req, res) => {
    const filename = path.basename(req.params.filename);
    const filepath = path.join(os.tmpdir(), 'elexxia-uploads', filename);
    if (!fs.existsSync(filepath)) {
      res.status(404).json({ error: 'File not found' });
      return;
    }
    res.sendFile(filepath);
  });

  // Login route
  registerOAuthRoutes(app);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
