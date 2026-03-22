# Despliegue en Vercel — Elexxia Growth Audit

Tiempo estimado: **10 minutos**

---

## Paso 1 — Base de datos MySQL (gratis)

1. Ir a **https://tidbcloud.com** → crear cuenta gratis
2. Crear cluster → **Serverless** → nombre: `elexxia-audit`
3. Ir a **Connect** → seleccionar **General** → copiar la connection string
   - Formato: `mysql://usuario:password@host/elexxia_audit?ssl={"rejectUnauthorized":true}`
4. Guardar este valor como `DATABASE_URL`

---

## Paso 2 — Conectar GitHub con Vercel

1. Ir a **https://vercel.com** → New Project → Import Git Repository
2. Seleccionar `herramientas-annalit/elexxia-growth-audit`
3. En **Framework Preset** → seleccionar **Other**
4. Vercel detectará el `vercel.json` automáticamente

---

## Paso 3 — Variables de entorno en Vercel

En **Settings → Environment Variables**, añadir:

| Variable | Valor |
|----------|-------|
| `DATABASE_URL` | (del Paso 1) |
| `JWT_SECRET` | Clave aleatoria de 32+ caracteres |
| `OPENAI_API_KEY` | Tu API key de OpenAI |
| `ADMIN_PASSWORD` | Contraseña para acceder al dashboard |
| `ADMIN_EMAIL` | admin@elexxia.es |
| `TELEGRAM_BOT_TOKEN` | Token de tu bot de Telegram |
| `TELEGRAM_OWNER_CHAT_ID` | Tu chat ID de Telegram |
| `NODE_ENV` | `production` |
| `RESEND_API_KEY` | (opcional) Para emails al cliente |

---

## Paso 4 — Deploy

Hacer clic en **Deploy**. Vercel ejecutará:
```
pnpm install && pnpm run build:client
```
El frontend se sirve desde `client/dist/` y la API desde `api/index.ts`.

---

## Paso 5 — Migraciones de base de datos

Una vez desplegado, ejecutar las migraciones **una sola vez** desde tu terminal local:

```bash
# Clonar el repo
git clone https://github.com/herramientas-annalit/elexxia-growth-audit
cd elexxia-growth-audit

# Instalar deps
pnpm install

# Ejecutar migraciones
DATABASE_URL="tu-database-url" npx drizzle-kit push
```

Esto crea las tablas: `users`, `audits`, `audit_results`, `lead_notes`.

---

## Acceso al dashboard

Una vez desplegado, ir a `https://tu-app.vercel.app/dashboard`

- Ingresar la `ADMIN_PASSWORD` configurada en Vercel
- El formulario público está en `/auditoria`

---

## Notas

- **LLM timeout**: configurado a 60s en Vercel (suficiente para GPT-4o-mini)
- **Audio**: transcripción directa via OpenAI Whisper, sin S3
- **Notificaciones**: Telegram bot al llegar cada nueva auditoría
- **Email**: Resend (opcional) envía el informe al cliente automáticamente
