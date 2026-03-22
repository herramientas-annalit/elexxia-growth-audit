/**
 * Autenticación por contraseña simple (standalone, sin OAuth de Manus)
 * El acceso al dashboard requiere ADMIN_PASSWORD en las env vars.
 */
import { Express } from "express";
import { SignJWT } from "jose";
import { COOKIE_NAME } from "@shared/const";
import { ENV } from "./env";

export function registerOAuthRoutes(app: Express) {
  // Login con contraseña
  app.post('/api/auth/login', async (req, res) => {
    const { password } = req.body ?? {};
    if (!password || password !== ENV.adminPassword) {
      res.status(401).json({ error: 'Contraseña incorrecta' });
      return;
    }
    try {
      const secret = new TextEncoder().encode(ENV.cookieSecret);
      const jwt = await new SignJWT({
        openId: 'admin',
        role: 'admin',
        name: 'Admin Elexxia',
        email: ENV.adminEmail,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('7d')
        .sign(secret);

      res.cookie(COOKIE_NAME, jwt, {
        httpOnly: true,
        secure: ENV.isProduction,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      res.json({ success: true });
    } catch (e) {
      console.error('[Auth]', e);
      res.status(500).json({ error: 'Error interno' });
    }
  });

  // Ruta legacy /api/oauth/start — redirige al frontend donde hay formulario de login
  app.get('/api/oauth/start', (_req, res) => {
    res.redirect('/dashboard');
  });
}
