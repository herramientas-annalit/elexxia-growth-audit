# Elexxia Growth Audit — Guía de Despliegue Independiente

**Objetivo:** Ejecutar el proyecto completamente fuera de Manus en menos de 1 día laboral.  
**Audiencia:** CTO / DevOps  
**Nivel requerido:** Node.js intermedio, familiaridad con Docker o PaaS (Railway/Render)

---

## Índice

1. [Resumen del proceso (vista rápida)](#1-resumen-del-proceso-vista-rápida)
2. [Prerequisitos](#2-prerequisitos)
3. [Paso 1 — Exportar el código a GitHub](#3-paso-1--exportar-el-código-a-github)
4. [Paso 2 — Adaptar las dependencias de Manus](#4-paso-2--adaptar-las-dependencias-de-manus)
5. [Paso 3 — Base de datos MySQL](#5-paso-3--base-de-datos-mysql)
6. [Paso 4 — Autenticación OAuth independiente](#6-paso-4--autenticación-oauth-independiente)
7. [Paso 5 — LLM (OpenAI o alternativa)](#7-paso-5--llm-openai-o-alternativa)
8. [Paso 6 — Variables de entorno](#8-paso-6--variables-de-entorno)
9. [Paso 7 — Despliegue en Railway (recomendado)](#9-paso-7--despliegue-en-railway-recomendado)
10. [Paso 7b — Despliegue en Render](#10-paso-7b--despliegue-en-render)
11. [Paso 7c — Despliegue en VPS (Docker)](#11-paso-7c--despliegue-en-vps-docker)
12. [Paso 8 — Dominio personalizado y HTTPS](#12-paso-8--dominio-personalizado-y-https)
13. [Paso 9 — Verificación post-despliegue](#13-paso-9--verificación-post-despliegue)
14. [Troubleshooting común](#14-troubleshooting-común)
15. [Estimación de costes mensuales](#15-estimación-de-costes-mensuales)

---

## 1. Resumen del proceso (vista rápida)

```
Tiempo estimado total: 6-8 horas para un desarrollador con experiencia

HORA 1-2: Exportar código + adaptar dependencias Manus
HORA 3:   Configurar BD MySQL (PlanetScale o Railway MySQL)
HORA 4:   Configurar OAuth (Google OAuth o Auth0)
HORA 5:   Configurar LLM (OpenAI API)
HORA 6:   Variables de entorno + primer despliegue
HORA 7-8: Verificación, DNS y ajustes finales
```

---

## 2. Prerequisitos

Antes de empezar, asegúrate de tener:

| Herramienta | Versión mínima | Cómo instalar |
|---|---|---|
| Node.js | 22.x | [nodejs.org](https://nodejs.org) |
| pnpm | 10.x | `npm install -g pnpm` |
| Git | 2.x | [git-scm.com](https://git-scm.com) |
| GitHub CLI (opcional) | 2.x | [cli.github.com](https://cli.github.com) |

Cuentas necesarias:
- **GitHub** — para el repositorio de código
- **Railway** o **Render** — para el servidor (o un VPS propio)
- **PlanetScale**, **Railway MySQL**, o **Supabase** — para la base de datos MySQL
- **OpenAI** — para el LLM (o Anthropic, Groq, etc.)
- **Google Cloud Console** — para OAuth (o Auth0 como alternativa más sencilla)

---

## 3. Paso 1 — Exportar el código a GitHub

### Opción A: Desde la interfaz de Manus (más sencillo)

1. En el panel de Manus, ve a **Settings → GitHub**
2. Selecciona el owner y el nombre del repositorio
3. Haz clic en **Export to GitHub**
4. El repositorio se creará como privado con todo el código

### Opción B: Desde el ZIP descargado

Si has descargado el ZIP del proyecto:

```bash
# Descomprime el ZIP
unzip elexxia-growth-audit.zip -d elexxia-growth-audit
cd elexxia-growth-audit

# Inicializa git
git init
git add .
git commit -m "feat: initial commit — Elexxia Growth Audit v1.0"

# Crea el repositorio en GitHub (privado)
gh repo create elexxia-growth-audit --private --source=. --push

# O manualmente:
# 1. Crea el repo en github.com
# 2. git remote add origin https://github.com/TU_ORG/elexxia-growth-audit.git
# 3. git push -u origin main
```

---

## 4. Paso 2 — Adaptar las dependencias de Manus

El proyecto usa 4 servicios de Manus que necesitan ser reemplazados para funcionar de forma independiente. Todos están en `server/_core/`.

### 4.1 LLM — `server/_core/llm.ts`

**Situación actual:** Llama a la Forge API de Manus (proxy de OpenAI).

**Reemplazo:** Llamada directa a OpenAI API. Reemplaza el contenido de `server/_core/llm.ts`:

```typescript
// server/_core/llm.ts — Versión independiente con OpenAI
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function invokeLLM(params: {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  response_format?: { type: "json_schema"; json_schema: object };
}) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",  // o "gpt-4o" para mayor calidad
    messages: params.messages,
    response_format: params.response_format as any,
  });
  return response;
}
```

Instala la dependencia:
```bash
pnpm add openai
```

### 4.2 Notificaciones — `server/_core/notification.ts`

**Situación actual:** Usa la Notification API de Manus para enviar push al propietario.

**Reemplazo con Resend (email):**

```typescript
// server/_core/notification.ts — Versión independiente con Resend
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function notifyOwner(params: { title: string; content: string }) {
  try {
    await resend.emails.send({
      from: "audit@elexxia.es",
      to: process.env.OWNER_EMAIL!,
      subject: params.title,
      text: params.content,
    });
    return true;
  } catch (error) {
    console.error("[Notification] Failed to send email:", error);
    return false;
  }
}
```

```bash
pnpm add resend
```

**Alternativa con Slack webhook:**

```typescript
export async function notifyOwner(params: { title: string; content: string }) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return false;
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: `*${params.title}*\n${params.content}` }),
    });
    return true;
  } catch { return false; }
}
```

### 4.3 OAuth — `server/_core/oauth.ts`

**Situación actual:** Usa Manus OAuth como proveedor de identidad.

**Reemplazo con Google OAuth:**

Este es el cambio más complejo. Necesitas:

1. Crear un proyecto en [Google Cloud Console](https://console.cloud.google.com)
2. Habilitar la API de Google+ o Google Identity
3. Crear credenciales OAuth 2.0 (tipo "Web application")
4. Configurar las URIs de redirección autorizadas: `https://tu-dominio.com/api/oauth/callback`

Reemplaza `server/_core/oauth.ts`:

```typescript
// server/_core/oauth.ts — Google OAuth
import { Express } from "express";
import { SignJWT } from "jose";
import { upsertUser } from "../db";
import { ENV } from "./env";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const COOKIE_NAME = "session";

export function registerOAuthRoutes(app: Express) {
  // Ruta de inicio de OAuth
  app.get("/api/oauth/start", (req, res) => {
    const state = req.query.state as string || "/";
    const redirectUri = `${req.protocol}://${req.get("host")}/api/oauth/callback`;
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", GOOGLE_CLIENT_ID);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state);
    res.redirect(url.toString());
  });

  // Callback de OAuth
  app.get("/api/oauth/callback", async (req, res) => {
    const { code, state } = req.query as { code: string; state: string };
    const redirectUri = `${req.protocol}://${req.get("host")}/api/oauth/callback`;

    // Intercambiar code por tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code, client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri, grant_type: "authorization_code",
      }),
    });
    const tokens = await tokenRes.json();

    // Obtener perfil del usuario
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileRes.json();

    // Upsert usuario en BD
    await upsertUser({
      openId: profile.sub,
      name: profile.name,
      email: profile.email,
      loginMethod: "google",
      lastSignedIn: new Date(),
    });

    // Crear JWT de sesión
    const secret = new TextEncoder().encode(ENV.cookieSecret);
    const jwt = await new SignJWT({ openId: profile.sub })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(secret);

    res.cookie(COOKIE_NAME, jwt, {
      httpOnly: true, secure: ENV.isProduction,
      sameSite: "lax", maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Redirigir al frontend
    const returnPath = state || "/";
    res.redirect(returnPath.startsWith("/") ? returnPath : "/");
  });
}
```

Actualiza `client/src/const.ts` para generar la URL de login correcta:

```typescript
// client/src/const.ts
export function getLoginUrl(returnPath = "/dashboard") {
  return `/api/oauth/start?state=${encodeURIComponent(returnPath)}`;
}
```

**Alternativa más sencilla: Auth0**

Si no quieres implementar OAuth manualmente, Auth0 tiene un plan gratuito (7.500 usuarios activos/mes) y simplifica enormemente la integración. Consulta la [documentación de Auth0 para Express](https://auth0.com/docs/quickstart/webapp/express).

### 4.4 Variables de entorno — `server/_core/env.ts`

Actualiza el archivo para incluir las nuevas variables:

```typescript
// server/_core/env.ts — Versión independiente
export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // LLM
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  // OAuth Google
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  // Notificaciones
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  ownerEmail: process.env.OWNER_EMAIL ?? "",
};
```

---

## 5. Paso 3 — Base de datos MySQL

### Opción A: PlanetScale (recomendado, gratuito hasta 5GB)

1. Crea una cuenta en [planetscale.com](https://planetscale.com)
2. Crea una base de datos: `elexxia-audit`
3. Ve a **Connect** → selecciona **Node.js** → copia la connection string
4. El formato es: `mysql://usuario:password@host/dbname?ssl={"rejectUnauthorized":true}`

### Opción B: Railway MySQL (más sencillo si ya usas Railway)

1. En tu proyecto de Railway, añade el plugin **MySQL**
2. Railway genera automáticamente la variable `DATABASE_URL`

### Opción C: Supabase (PostgreSQL — requiere cambios)

Supabase usa PostgreSQL, no MySQL. Si quieres usarlo, necesitas cambiar el dialect en `drizzle.config.ts` de `"mysql"` a `"postgresql"` y actualizar los imports de Drizzle en `drizzle/schema.ts` (de `drizzle-orm/mysql-core` a `drizzle-orm/pg-core`). Es un cambio de 30 minutos pero requiere revisar todos los tipos.

### Ejecutar migraciones

Una vez tengas la `DATABASE_URL`, ejecuta las migraciones:

```bash
# Desde la raíz del proyecto
DATABASE_URL="mysql://..." pnpm db:push
```

Esto creará las 3 tablas: `users`, `audits`, `audit_results`.

---

## 6. Paso 4 — Autenticación OAuth independiente

Ver sección 4.3 para la implementación completa. Resumen de variables necesarias:

**Con Google OAuth:**
- `GOOGLE_CLIENT_ID` — desde Google Cloud Console
- `GOOGLE_CLIENT_SECRET` — desde Google Cloud Console
- URI de redirección autorizada: `https://tu-dominio.com/api/oauth/callback`

**Con Auth0:**
- `AUTH0_DOMAIN` — tu-tenant.auth0.com
- `AUTH0_CLIENT_ID`
- `AUTH0_CLIENT_SECRET`
- URI de callback: `https://tu-dominio.com/api/oauth/callback`

---

## 7. Paso 5 — LLM (OpenAI o alternativa)

### OpenAI (recomendado)

1. Crea una cuenta en [platform.openai.com](https://platform.openai.com)
2. Ve a **API Keys** → **Create new secret key**
3. Guarda la clave como `OPENAI_API_KEY`

**Modelos recomendados:**
- `gpt-4o-mini` — Más económico, suficiente para la mayoría de diagnósticos (~0.003€/auditoría)
- `gpt-4o` — Mayor calidad, más caro (~0.05€/auditoría)

### Alternativas

| Proveedor | Modelo | Coste aprox/auditoría | Notas |
|---|---|---|---|
| OpenAI | gpt-4o-mini | ~0.003€ | Recomendado |
| OpenAI | gpt-4o | ~0.05€ | Mayor calidad |
| Anthropic | claude-3-haiku | ~0.004€ | Buena alternativa |
| Groq | llama-3.1-70b | ~0.001€ | Muy rápido, gratuito hasta límite |
| Mistral | mistral-large | ~0.01€ | Buena opción europea (GDPR) |

Para usar Anthropic, modifica `server/_core/llm.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function invokeLLM(params: { messages: any[]; response_format?: any }) {
  const systemMsg = params.messages.find(m => m.role === "system")?.content ?? "";
  const userMsgs = params.messages.filter(m => m.role !== "system");
  const response = await client.messages.create({
    model: "claude-3-haiku-20240307",
    max_tokens: 4096,
    system: systemMsg,
    messages: userMsgs,
  });
  // Adaptar formato de respuesta para compatibilidad
  return {
    choices: [{
      message: {
        content: response.content[0].type === "text" ? response.content[0].text : null
      }
    }]
  };
}
```

---

## 8. Paso 6 — Variables de entorno

Crea un archivo `.env` en la raíz del proyecto (nunca lo subas a Git):

```bash
# .env — Versión independiente de Manus
# ⚠️ NUNCA subir este archivo a Git

# Base de datos
DATABASE_URL=mysql://usuario:password@host:3306/elexxia_audit

# Seguridad de sesiones
JWT_SECRET=genera-un-secreto-de-64-chars-aleatorios-aqui

# OAuth Google
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx

# LLM
OPENAI_API_KEY=sk-proj-xxxx

# Notificaciones
RESEND_API_KEY=re_xxxx
OWNER_EMAIL=tu@email.com

# Admin (el openId del usuario que será admin)
# Después del primer login, busca el openId en la tabla users
OWNER_OPEN_ID=google_sub_del_admin

# Entorno
NODE_ENV=production
PORT=3000
```

Para generar el `JWT_SECRET`:
```bash
openssl rand -hex 32
```

Asegúrate de añadir `.env` a `.gitignore`:
```bash
echo ".env" >> .gitignore
```

---

## 9. Paso 7 — Despliegue en Railway (recomendado)

Railway es la opción más sencilla. Tiene plan gratuito con 500 horas/mes y planes de pago desde 5$/mes.

### 9.1 Crear el proyecto en Railway

1. Ve a [railway.app](https://railway.app) y crea una cuenta
2. **New Project** → **Deploy from GitHub repo**
3. Selecciona el repositorio `elexxia-growth-audit`
4. Railway detectará automáticamente que es un proyecto Node.js

### 9.2 Configurar variables de entorno en Railway

En el panel de Railway → tu servicio → **Variables**:

```
DATABASE_URL=mysql://...
JWT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
OPENAI_API_KEY=...
RESEND_API_KEY=...
OWNER_EMAIL=...
OWNER_OPEN_ID=...
NODE_ENV=production
```

### 9.3 Configurar el comando de build y start

En Railway → **Settings** → **Build & Deploy**:

- **Build command:** `pnpm install && pnpm build`
- **Start command:** `pnpm start`

### 9.4 Añadir MySQL en Railway

1. En tu proyecto Railway → **New** → **Database** → **MySQL**
2. Railway crea el servicio MySQL y añade automáticamente `DATABASE_URL` a tu servicio

### 9.5 Ejecutar migraciones

Desde tu máquina local (con la DATABASE_URL de Railway):
```bash
DATABASE_URL="mysql://..." pnpm db:push
```

O desde la consola de Railway (si está disponible):
```bash
pnpm db:push
```

### 9.6 Dominio

Railway asigna un dominio automático tipo `elexxia-growth-audit.up.railway.app`. Para un dominio personalizado, ve a **Settings** → **Domains** → **Custom Domain**.

---

## 10. Paso 7b — Despliegue en Render

Render tiene un plan gratuito (con limitaciones de sleep) y planes de pago desde 7$/mes.

### render.yaml (Infrastructure as Code)

Crea este archivo en la raíz del proyecto:

```yaml
# render.yaml
services:
  - type: web
    name: elexxia-growth-audit
    env: node
    buildCommand: pnpm install && pnpm build
    startCommand: pnpm start
    healthCheckPath: /api/trpc/auth.me
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        sync: false
      - key: JWT_SECRET
        generateValue: true
      - key: GOOGLE_CLIENT_ID
        sync: false
      - key: GOOGLE_CLIENT_SECRET
        sync: false
      - key: OPENAI_API_KEY
        sync: false
      - key: RESEND_API_KEY
        sync: false
      - key: OWNER_EMAIL
        sync: false
      - key: OWNER_OPEN_ID
        sync: false
```

Conecta el repositorio GitHub en [render.com](https://render.com) y Render desplegará automáticamente.

---

## 11. Paso 7c — Despliegue en VPS (Docker)

Para máximo control, usa un VPS con Docker. Recomendado para producción seria.

### Dockerfile

Crea este archivo en la raíz del proyecto:

```dockerfile
# Dockerfile
FROM node:22-alpine AS builder

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# Imagen de producción
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

### docker-compose.yml

```yaml
# docker-compose.yml
version: "3.9"

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - RESEND_API_KEY=${RESEND_API_KEY}
      - OWNER_EMAIL=${OWNER_EMAIL}
      - OWNER_OPEN_ID=${OWNER_OPEN_ID}
      - NODE_ENV=production
    depends_on:
      - mysql
    restart: unless-stopped

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: elexxia_audit
      MYSQL_USER: elexxia
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - app
    restart: unless-stopped

volumes:
  mysql_data:
```

### nginx.conf

```nginx
server {
    listen 80;
    server_name audit.elexxia.es;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name audit.elexxia.es;

    ssl_certificate /etc/letsencrypt/live/audit.elexxia.es/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/audit.elexxia.es/privkey.pem;

    location / {
        proxy_pass http://app:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Comandos de despliegue en VPS

```bash
# En el VPS (Ubuntu 22.04)
# 1. Instalar Docker
curl -fsSL https://get.docker.com | sh

# 2. Clonar el repositorio
git clone https://github.com/TU_ORG/elexxia-growth-audit.git
cd elexxia-growth-audit

# 3. Crear .env con todas las variables
cp .env.example .env
nano .env  # Editar con los valores reales

# 4. Obtener certificado SSL con Let's Encrypt
apt install certbot
certbot certonly --standalone -d audit.elexxia.es

# 5. Construir y arrancar
docker-compose up -d --build

# 6. Ejecutar migraciones
docker-compose exec app node -e "
  const { drizzle } = require('drizzle-orm/mysql2');
  // O ejecutar desde local con DATABASE_URL del VPS
"
# Más sencillo: ejecutar desde local
DATABASE_URL="mysql://elexxia:pass@IP_VPS:3306/elexxia_audit" pnpm db:push

# 7. Ver logs
docker-compose logs -f app
```

---

## 12. Paso 8 — Dominio personalizado y HTTPS

### Configuración DNS

Añade estos registros en tu proveedor de DNS (Cloudflare, GoDaddy, etc.):

```
Tipo    Nombre              Valor
A       audit               IP_DE_TU_SERVIDOR
CNAME   www.audit           audit.elexxia.es
```

### HTTPS automático

- **Railway/Render:** HTTPS automático incluido, no requiere configuración
- **VPS:** Usa Certbot (Let's Encrypt) como se muestra en el paso anterior

### Actualizar URIs de redirección OAuth

Después de configurar el dominio, actualiza en Google Cloud Console:
- **Authorized redirect URIs:** `https://audit.elexxia.es/api/oauth/callback`

---

## 13. Paso 9 — Verificación post-despliegue

Ejecuta este checklist después del despliegue:

```
□ La landing page carga en https://audit.elexxia.es
□ El formulario de auditoría funciona (4 pasos)
□ El diagnóstico se genera correctamente (prueba con datos reales)
□ La página de resultados muestra todas las secciones
□ El botón "Exportar PDF" funciona
□ El login con Google funciona
□ El dashboard /dashboard es accesible tras login
□ La lista de auditorías aparece en el dashboard
□ Las estadísticas del dashboard son correctas
□ El propietario recibe email/notificación al llegar una auditoría
□ HTTPS funciona correctamente (sin warnings de certificado)
□ La redirección HTTP → HTTPS funciona
```

### Promover el primer usuario a admin

Después del primer login, busca el `openId` del usuario en la BD:

```sql
SELECT id, openId, name, email, role FROM users;
```

Actualiza el `OWNER_OPEN_ID` en las variables de entorno con el valor de `openId` del admin.

O promueve directamente en la BD:

```sql
UPDATE users SET role = 'admin' WHERE email = 'tu@email.com';
```

---

## 14. Troubleshooting común

### Error: "Database connection failed"

```bash
# Verifica que DATABASE_URL es correcta
node -e "
  const mysql = require('mysql2/promise');
  mysql.createConnection(process.env.DATABASE_URL)
    .then(c => { console.log('OK'); c.end(); })
    .catch(e => console.error('FAIL:', e.message));
"
```

Causas comunes:
- SSL requerido por el proveedor: añade `?ssl={"rejectUnauthorized":true}` a la URL
- Puerto bloqueado: verifica que el puerto 3306 está abierto en el firewall
- Credenciales incorrectas

### Error: "Invalid JWT" en el login

- Verifica que `JWT_SECRET` tiene al menos 32 caracteres
- Verifica que la cookie se está enviando (inspecciona las cookies en el navegador)
- En desarrollo local, asegúrate de que `NODE_ENV` no es `production` (afecta a `secure` en la cookie)

### Error: "OpenAI API error"

- Verifica que `OPENAI_API_KEY` es válida: `curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"`
- Verifica que tienes crédito en tu cuenta de OpenAI
- El modelo `gpt-4o-mini` requiere que la cuenta tenga al menos un pago realizado

### El diagnóstico tarda más de 30 segundos

El LLM puede tardar 10-30 segundos. Si el servidor tiene un timeout de 30s, la request fallará. Soluciones:
- Aumentar el timeout del servidor: `server.timeout = 120000;` en `server/_core/index.ts`
- Implementar procesamiento asíncrono (ver punto 12.2 de la documentación técnica)

### Error: "Cannot find module 'vite-plugin-manus-runtime'"

Este plugin es específico de Manus y no existe en npm público. Para despliegue independiente:

1. Elimina la importación de `vite.config.ts`:
```typescript
// Elimina esta línea:
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";

// Y esta de plugins:
// vitePluginManusRuntime()
```

2. El plugin solo añade funcionalidades de debug de Manus, no afecta a la funcionalidad principal.

---

## 15. Estimación de costes mensuales

Para un volumen de **100-500 auditorías/mes**:

| Servicio | Plan | Coste/mes |
|---|---|---|
| **Railway** (servidor) | Starter | 5$ |
| **Railway MySQL** (BD) | Starter | 5$ |
| **OpenAI** (LLM) | Pay-per-use | 1-15$ |
| **Resend** (emails) | Free (3.000 emails) | 0$ |
| **Dominio** (.es) | Anual | ~1$/mes |
| **Total estimado** | | **12-26$/mes** |

Para **500-2.000 auditorías/mes**:

| Servicio | Plan | Coste/mes |
|---|---|---|
| **Railway** (servidor) | Pro | 20$ |
| **PlanetScale** (BD) | Scaler | 29$ |
| **OpenAI** (LLM) | Pay-per-use | 15-100$ |
| **Resend** (emails) | Pro | 20$ |
| **Total estimado** | | **84-169$/mes** |

> El coste del LLM es el más variable. Con `gpt-4o-mini` (~0.003€/auditoría), 1.000 auditorías cuestan ~3€. Con `gpt-4o` (~0.05€/auditoría), 1.000 auditorías cuestan ~50€.

---

*Guía elaborada el 20 de marzo de 2026. Para soporte técnico en el proceso de migración, contactar con el equipo de ingeniería.*
