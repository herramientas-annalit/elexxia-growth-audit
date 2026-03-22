# Elexxia Growth Audit — Documentación Técnica Completa

**Versión:** 1.0 (checkpoint `6a985956`)  
**Fecha:** Marzo 2026  
**Destinatario:** CTO / Equipo de Ingeniería  
**Clasificación:** Confidencial — Uso Interno

---

## Índice

1. [Visión General del Proyecto](#1-visión-general-del-proyecto)
2. [Stack Tecnológico Completo](#2-stack-tecnológico-completo)
3. [Arquitectura del Sistema](#3-arquitectura-del-sistema)
4. [Estructura de Directorios](#4-estructura-de-directorios)
5. [Schema de Base de Datos](#5-schema-de-base-de-datos)
6. [API — Procedimientos tRPC](#6-api--procedimientos-trpc)
7. [Motor de Diagnóstico IA](#7-motor-de-diagnóstico-ia)
8. [Variables de Entorno](#8-variables-de-entorno)
9. [Autenticación y Sesiones](#9-autenticación-y-sesiones)
10. [Frontend — Rutas y Páginas](#10-frontend--rutas-y-páginas)
11. [Tests](#11-tests)
12. [Puntos de Mejora Técnica](#12-puntos-de-mejora-técnica)
13. [Roadmap Técnico Priorizado](#13-roadmap-técnico-priorizado)

---

## 1. Visión General del Proyecto

**Elexxia Growth Audit** es una aplicación web full-stack que automatiza la generación de diagnósticos digitales para negocios locales en España. El flujo completo es:

1. Un lead rellena un formulario público con datos de su negocio (nombre, sector, ciudad, web, GBP, datos comerciales).
2. El servidor invoca un LLM (modelo de lenguaje grande) con un prompt maestro que contiene benchmarks reales por sector.
3. El LLM devuelve un JSON estructurado con el diagnóstico completo (scores, análisis de situación, fuga de capital, keywords, plan de acción, plan recomendado).
4. El resultado se persiste en base de datos MySQL y se muestra al lead en una página de resultados visual.
5. El equipo comercial accede a un dashboard protegido para ver todos los leads, estadísticas y actualizar el estado de conversión.
6. El propietario recibe una notificación push en tiempo real cada vez que llega una nueva auditoría.

La aplicación está diseñada para ser un **activo de captación de leads** (el diagnóstico gratuito es el gancho) y una **herramienta de apoyo comercial** (el dashboard permite gestionar el pipeline).

---

## 2. Stack Tecnológico Completo

| Capa | Tecnología | Versión | Propósito |
|---|---|---|---|
| **Runtime** | Node.js | 22.x | Servidor de aplicación |
| **Lenguaje** | TypeScript | 5.9.3 | Tipado estático end-to-end |
| **Framework servidor** | Express | 4.21.x | HTTP server, middleware |
| **API layer** | tRPC | 11.6.x | RPC type-safe sin REST manual |
| **Serialización** | SuperJSON | 1.13.x | Serializa `Date`, `Map`, `Set` correctamente |
| **ORM** | Drizzle ORM | 0.44.x | Query builder type-safe para MySQL |
| **Base de datos** | MySQL / TiDB | 8.x | Almacenamiento relacional |
| **Driver MySQL** | mysql2 | 3.15.x | Conexión nativa a MySQL |
| **Migraciones** | Drizzle Kit | 0.31.x | Generación y ejecución de migraciones |
| **Framework frontend** | React | 19.2.x | UI reactiva |
| **Router frontend** | Wouter | 3.3.x | Routing ligero (alternativa a React Router) |
| **Estado servidor** | TanStack Query | 5.90.x | Cache, loading states, invalidación |
| **Componentes UI** | shadcn/ui + Radix UI | latest | Componentes accesibles sin estilo propio |
| **CSS** | Tailwind CSS | 4.1.x | Utility-first CSS |
| **Animaciones** | Framer Motion | 12.x | Animaciones declarativas |
| **Formularios** | React Hook Form + Zod | 7.x + 4.x | Validación type-safe |
| **Iconos** | Lucide React | 0.453.x | Librería de iconos SVG |
| **Bundler** | Vite | 7.1.x | Dev server + build |
| **Transpilación servidor** | tsx + esbuild | 4.x + 0.25.x | Transpila TS en dev, bundle en prod |
| **LLM** | Manus Forge API | — | Proxy a modelo de lenguaje (OpenAI-compatible) |
| **Almacenamiento ficheros** | AWS S3 (via Manus) | SDK v3 | Almacenamiento de assets |
| **Autenticación** | Manus OAuth 2.0 | — | SSO con plataforma Manus |
| **Sesiones** | JWT (jose) | 6.1.x | Tokens firmados en cookie HTTP-only |
| **Notificaciones** | Manus Notification API | — | Push al propietario |
| **Tests** | Vitest | 2.1.x | Unit tests |
| **Gestor de paquetes** | pnpm | 10.4.x | Instalación rápida con lockfile |

---

## 3. Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTE (Browser)                        │
│  React 19 + Wouter + TanStack Query + tRPC Client               │
│                                                                  │
│  /              → Home.tsx (landing + CTA)                      │
│  /auditoria     → Auditoria.tsx (formulario multi-paso)         │
│  /resultado/:id → Resultado.tsx (informe diagnóstico)           │
│  /dashboard     → Dashboard.tsx (panel admin protegido)         │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP (tRPC over JSON-RPC)
                           │ POST /api/trpc/<procedure>
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    SERVIDOR (Express 4)                          │
│                                                                  │
│  server/_core/index.ts  → Arranque Express, puerto dinámico     │
│  server/_core/oauth.ts  → Rutas OAuth (/api/oauth/callback)     │
│  server/_core/context.ts→ Contexto tRPC (user, req, res)        │
│  server/_core/trpc.ts   → publicProcedure / protectedProcedure  │
│  server/routers.ts      → Todos los procedimientos de negocio   │
│  server/db.ts           → Helpers de base de datos              │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              MOTOR IA (generateAuditDiagnosis)           │    │
│  │  systemPrompt: benchmarks por sector (12 sectores)       │    │
│  │  userPrompt: datos del negocio + instrucciones           │    │
│  │  response_format: JSON Schema estricto                   │    │
│  │  → invokeLLM() → Manus Forge API                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              calculateScores()                           │    │
│  │  Lógica determinista basada en presencia de activos      │    │
│  │  (web, GBP) + severidad de problemas detectados          │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────┬──────────────────────────┬───────────────────────────┘
           │                          │
           ▼                          ▼
┌──────────────────┐        ┌─────────────────────────────────────┐
│  MySQL / TiDB    │        │  Servicios Externos (Manus Platform) │
│                  │        │                                      │
│  users           │        │  - Forge API (LLM)                  │
│  audits          │        │  - OAuth Server                     │
│  audit_results   │        │  - Notification API                 │
│                  │        │  - S3 Storage                       │
└──────────────────┘        └─────────────────────────────────────┘
```

### Flujo de datos de una auditoría

```
1. Usuario rellena formulario → POST /api/trpc/audit.create
2. Servidor crea registro en `audits` con status="analyzing"
3. Servidor llama a generateAuditDiagnosis(input)
   a. Construye systemPrompt + userPrompt
   b. Llama a invokeLLM() con response_format JSON Schema
   c. Parsea la respuesta JSON
4. Servidor llama a calculateScores(diagnosis, input)
   a. Determina base scores según presencia de web/GBP
   b. Descuenta puntos según severidad de problemas detectados
5. Servidor guarda resultado en `audit_results`
6. Servidor actualiza `audits.status` = "completed"
7. Servidor envía notificación al propietario (notifyOwner)
8. Servidor devuelve { auditId, success: true }
9. Cliente redirige a /resultado/:auditId
10. Cliente hace GET /api/trpc/audit.getById?id=:auditId
11. Servidor devuelve audit + audit_results
12. Cliente renderiza la página de resultados
```

---

## 4. Estructura de Directorios

```
elexxia-growth-audit/
├── client/                          # Frontend React
│   ├── index.html                   # Entry point HTML
│   ├── public/                      # Assets estáticos (solo config)
│   └── src/
│       ├── App.tsx                  # Router principal (Wouter)
│       ├── main.tsx                 # Punto de entrada React + providers
│       ├── index.css                # Estilos globales + Tailwind + @media print
│       ├── const.ts                 # Constantes frontend (getLoginUrl)
│       ├── pages/
│       │   ├── Home.tsx             # Landing page con CTA
│       │   ├── Auditoria.tsx        # Formulario multi-paso (4 pasos)
│       │   ├── Resultado.tsx        # Informe de diagnóstico completo
│       │   ├── Dashboard.tsx        # Panel admin (protegido por auth)
│       │   └── NotFound.tsx         # 404
│       ├── components/
│       │   ├── ui/                  # Componentes shadcn/ui (40+ componentes)
│       │   ├── DashboardLayout.tsx  # Layout con sidebar para admin
│       │   ├── ErrorBoundary.tsx    # Error boundary React
│       │   └── ...
│       ├── contexts/
│       │   └── ThemeContext.tsx     # Dark/light mode
│       ├── hooks/
│       │   ├── useMobile.tsx        # Detecta si es móvil
│       │   └── ...
│       └── lib/
│           ├── trpc.ts              # Cliente tRPC + TanStack Query
│           └── utils.ts             # cn() para clsx + tailwind-merge
│
├── server/
│   ├── _core/                       # Infraestructura (NO tocar)
│   │   ├── index.ts                 # Arranque Express + puerto dinámico
│   │   ├── context.ts               # Contexto tRPC (user, req, res)
│   │   ├── trpc.ts                  # Instancia tRPC + middlewares
│   │   ├── oauth.ts                 # Rutas OAuth callback
│   │   ├── cookies.ts               # Opciones de cookie (secure, sameSite)
│   │   ├── env.ts                   # Variables de entorno tipadas
│   │   ├── llm.ts                   # Helper invokeLLM()
│   │   ├── notification.ts          # Helper notifyOwner()
│   │   ├── imageGeneration.ts       # Helper generateImage()
│   │   ├── voiceTranscription.ts    # Helper transcribeAudio()
│   │   ├── map.ts                   # Helper Google Maps proxy
│   │   ├── dataApi.ts               # Helper Data API
│   │   ├── sdk.ts                   # SDK Manus
│   │   ├── systemRouter.ts          # Router sistema (notifyOwner mutation)
│   │   └── vite.ts                  # Integración Vite dev server
│   ├── routers.ts                   # ⭐ TODOS los procedimientos de negocio
│   ├── db.ts                        # ⭐ Helpers de base de datos
│   ├── storage.ts                   # Helpers S3 (storagePut, storageGet)
│   ├── audit.test.ts                # Tests de auditoría
│   └── auth.logout.test.ts          # Tests de auth
│
├── drizzle/
│   ├── schema.ts                    # ⭐ Schema de BD + tipos TypeScript
│   ├── relations.ts                 # Relaciones Drizzle
│   ├── 0000_next_bruce_banner.sql   # Migración inicial
│   ├── 0001_noisy_tyger_tiger.sql   # Migración v2 (businessAnalysis)
│   └── meta/                        # Snapshots de migraciones
│
├── shared/
│   ├── const.ts                     # COOKIE_NAME y otras constantes compartidas
│   └── types.ts                     # Tipos compartidos frontend/backend
│
├── package.json                     # Dependencias + scripts
├── tsconfig.json                    # Configuración TypeScript
├── vite.config.ts                   # Configuración Vite + plugins
├── drizzle.config.ts                # Configuración Drizzle Kit
├── vitest.config.ts                 # Configuración Vitest
├── components.json                  # Configuración shadcn/ui
└── todo.md                          # Historial de features implementadas
```

---

## 5. Schema de Base de Datos

La base de datos es **MySQL 8.x** (compatible con TiDB). Hay 3 tablas principales.

### Tabla `users`

Almacena los usuarios autenticados vía OAuth. El campo `role` distingue entre usuarios normales y administradores.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | INT AUTO_INCREMENT PK | Identificador interno |
| `openId` | VARCHAR(64) UNIQUE | Identificador del proveedor OAuth |
| `name` | TEXT | Nombre del usuario |
| `email` | VARCHAR(320) | Email |
| `loginMethod` | VARCHAR(64) | Método de login (e.g., "manus") |
| `role` | ENUM('user','admin') | Rol. Default: 'user'. El `OWNER_OPEN_ID` se promueve a 'admin' automáticamente |
| `createdAt` | TIMESTAMP | Fecha de creación |
| `updatedAt` | TIMESTAMP | Última actualización (auto) |
| `lastSignedIn` | TIMESTAMP | Último inicio de sesión |

### Tabla `audits`

Almacena cada solicitud de auditoría recibida. Contiene todos los datos del formulario y metadatos comerciales.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | INT AUTO_INCREMENT PK | Identificador de la auditoría |
| `contactName` | VARCHAR(255) | Nombre del contacto |
| `contactEmail` | VARCHAR(320) | Email del contacto |
| `contactPhone` | VARCHAR(50) | Teléfono (opcional) |
| `businessName` | VARCHAR(255) | Nombre del negocio |
| `businessSector` | VARCHAR(255) | Sector (texto libre) |
| `businessCity` | VARCHAR(255) | Ciudad |
| `websiteUrl` | VARCHAR(500) | URL de la web (opcional) |
| `googleMapsUrl` | VARCHAR(500) | URL de Google Maps/GBP (opcional) |
| `averageTicket` | FLOAT | Ticket medio en € (opcional) |
| `profitMargin` | FLOAT | Margen de beneficio en % (opcional) |
| `monthlyNewClients` | INT | Nuevos clientes/mes por internet (opcional) |
| `hasCommercialTeam` | ENUM('yes','no','partial') | ¿Tiene equipo comercial? |
| `previousMarketingInvestment` | ENUM('none','less_500','500_1000','more_1000') | Inversión previa en marketing |
| `mainBottleneck` | ENUM('not_known','known_not_buying','high_acquisition_cost') | Principal cuello de botella |
| `callTranscript` | TEXT | Transcripción de llamada comercial (opcional) |
| `additionalNotes` | TEXT | Notas adicionales (opcional) |
| `status` | ENUM('pending','analyzing','completed','error') | Estado del procesamiento |
| `convertedToClient` | ENUM('yes','no','in_progress') | Estado de conversión comercial |
| `assignedPlan` | ENUM('local_300','acceleration_500','domination_1000') | Plan asignado |
| `createdAt` | TIMESTAMP | Fecha de creación |
| `updatedAt` | TIMESTAMP | Última actualización (auto) |

### Tabla `audit_results`

Almacena el resultado generado por el motor IA para cada auditoría. La columna `diagnosis` es un JSON con toda la estructura del diagnóstico.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | INT AUTO_INCREMENT PK | Identificador del resultado |
| `auditId` | INT FK → audits.id | Referencia a la auditoría |
| `overallScore` | INT | Puntuación global (0-100) |
| `googlePresenceScore` | INT | Score Google Business Profile (0-100) |
| `webConversionScore` | INT | Score web y conversión (0-100) |
| `geoScore` | INT | Score visibilidad GEO/IA (0-100) |
| `napConsistencyScore` | INT | Score coherencia NAP y directorios (0-100) |
| `estimatedMonthlyLeak` | FLOAT | Fuga de capital estimada en €/mes |
| `diagnosis` | JSON | Diagnóstico completo (ver estructura abajo) |
| `recommendedPlan` | ENUM('local_300','acceleration_500','domination_1000') | Plan recomendado |
| `recommendedPlanReason` | TEXT | Justificación del plan recomendado |
| `createdAt` | TIMESTAMP | Fecha de creación |

### Estructura del JSON `diagnosis`

```typescript
interface AudiDiagnosis {
  summary: string;                    // Resumen ejecutivo personalizado
  currentSituation: {
    googlePresence: string;           // Análisis detallado del GBP
    webStatus: string;                // Estado de la web
    geoAnalysis: string;              // Visibilidad en IAs generativas
    napConsistency: string;           // Coherencia NAP y directorios
    competitorContext: string;        // Contexto competitivo local
  };
  capitalLeakAnalysis: {
    monthlySearchVolume: number;      // Búsquedas/mes estimadas
    estimatedConversionRate: number;  // Tasa de conversión estimada (%)
    estimatedMonthlyLeak: number;     // Fuga de capital en €/mes
    explanation: string;              // Explicación del cálculo
  };
  businessAnalysis: {
    sectorTicketRange: {
      min: number; max: number; currency: string;
    };
    typicalServices: string[];        // Servicios típicos del sector
    revenueProjections: Array<{
      scenario: "conservative"|"realistic"|"optimistic";
      label: string;
      monthlyClients: number;
      monthlyRevenue: number;
      description: string;
    }>;
    keywordRecommendations: Array<{
      keyword: string;
      intent: "transactional"|"informational"|"navigational";
      estimatedMonthlySearches: number;
      difficulty: "low"|"medium"|"high";
      priority: "primary"|"secondary";
    }>;
    competitorInsights: string;       // Lo que hacen los competidores
    marketOpportunity: string;        // Oportunidad de mercado
    searchVolumeDisclaimer: string;   // Disclaimer de transparencia
  };
  issues: Array<{
    id: string;
    area: string;                     // Área técnica (SEO Local, GEO, etc.)
    title: string;
    description: string;
    severity: "critical"|"high"|"medium"|"low";
    solution: string;
  }>;
  actionPlan: Array<{
    priority: number;
    timeframe: "immediate"|"week_1"|"month_1";
    title: string;
    description: string;
    expectedImpact: string;
  }>;
  recommendedPlan: "local_300"|"acceleration_500"|"domination_1000";
  recommendedPlanReason: string;
  keyOpportunities: string[];
}
```

---

## 6. API — Procedimientos tRPC

Todos los endpoints están bajo `/api/trpc/<namespace>.<procedure>`. El protocolo es HTTP POST con body JSON.

### Namespace `auth`

| Procedimiento | Tipo | Auth | Descripción |
|---|---|---|---|
| `auth.me` | query | Pública | Devuelve el usuario autenticado o `null` |
| `auth.logout` | mutation | Pública | Limpia la cookie de sesión |

### Namespace `audit`

| Procedimiento | Tipo | Auth | Descripción |
|---|---|---|---|
| `audit.create` | mutation | Pública | Crea una auditoría y genera el diagnóstico IA |
| `audit.getById` | query | Pública | Obtiene auditoría + resultado por ID |
| `audit.list` | query | **Protegida** | Lista todas las auditorías (dashboard) |
| `audit.dashboardStats` | query | **Protegida** | Estadísticas globales (total, avg score, convertidos) |
| `audit.updateConversion` | mutation | **Protegida** | Actualiza estado de conversión y plan asignado |

### Namespace `system`

| Procedimiento | Tipo | Auth | Descripción |
|---|---|---|---|
| `system.notifyOwner` | mutation | **Protegida** | Envía notificación push al propietario |

### Input de `audit.create`

```typescript
{
  // Contacto (obligatorio)
  contactName: string;        // min 2 chars
  contactEmail: string;       // email válido
  contactPhone?: string;

  // Negocio (obligatorio)
  businessName: string;       // min 2 chars
  businessSector: string;     // min 2 chars
  businessCity: string;       // min 2 chars
  websiteUrl?: string;
  googleMapsUrl?: string;

  // Datos comerciales (opcionales, mejoran el diagnóstico)
  averageTicket?: number;
  profitMargin?: number;      // 0-100
  monthlyNewClients?: number;
  hasCommercialTeam?: "yes"|"no"|"partial";
  previousMarketingInvestment?: "none"|"less_500"|"500_1000"|"more_1000";
  mainBottleneck?: "not_known"|"known_not_buying"|"high_acquisition_cost";

  // Contexto adicional (opcional, mejora mucho el diagnóstico)
  callTranscript?: string;    // Transcripción de llamada comercial
  additionalNotes?: string;
}
```

### Rutas OAuth (no tRPC)

| Ruta | Método | Descripción |
|---|---|---|
| `/api/oauth/callback` | GET | Callback OAuth. Intercambia `code` por token, crea sesión JWT |

---

## 7. Motor de Diagnóstico IA

### Función `generateAuditDiagnosis(input)`

Ubicación: `server/routers.ts` (líneas 43-309)

El motor IA es el núcleo del producto. Funciona en dos pasos:

**Paso 1 — Construcción del prompt:**

El `systemPrompt` contiene:
- Definición del rol (experto en marketing digital local España, 10 años de experiencia)
- Descripción de los 3 planes de Elexxia con precios y características
- **5 reglas críticas** que el modelo debe respetar:
  1. Scores coherentes con la realidad (sin web → score 5-15, no 70-80)
  2. Fuga de capital realista y conservadora (metodología de cálculo en 5 pasos)
  3. Análisis de negocio honesto (proyecciones conservadoras para micropymes)
  4. Transparencia en volúmenes de búsqueda (siempre incluir disclaimer)
  5. Problemas específicos y técnicos (no genéricos)
- **Base de conocimiento de 12 sectores** con benchmarks reales de España: búsquedas/mes, ticket medio, margen, keywords principales, clientes realistas con SEO.

El `userPrompt` contiene:
- Datos del negocio (nombre, sector, ciudad, web, GBP)
- Datos comerciales (ticket, margen, clientes, equipo, inversión previa, cuello de botella)
- Transcripción de llamada (si existe, primeros 4.000 caracteres)
- Instrucciones específicas para este negocio concreto

**Paso 2 — Llamada al LLM con JSON Schema:**

Se usa `response_format: { type: "json_schema" }` para forzar al modelo a devolver un JSON estructurado que cumple exactamente el schema de `AudiDiagnosis`. Esto elimina el parsing frágil y garantiza que la respuesta siempre tiene todos los campos requeridos.

### Función `calculateScores(diagnosis, input)`

Ubicación: `server/routers.ts` (líneas 311-350)

Esta función es **determinista** (no usa IA) y calcula los 4 subscores y el score global:

```
Base scores según activos digitales:
- hasGoogleMaps → googleBase = 70 (tiene GBP) | 15 (sin GBP)
- hasWebsite    → webBase    = 70 (tiene web)  | 15 (sin web)
- ambos         → geoBase    = 50 | uno solo = 25 | ninguno = 10
- ambos         → napBase    = 60 | uno solo = 30 | ninguno = 15

Descuento por problemas:
- critical: -25 puntos
- high:     -15 puntos
- medium:    -8 puntos
- low:       -3 puntos

Score final = max(5, min(90, baseScore - descuento))

overallScore = googlePresence×0.3 + webConversion×0.3 + geo×0.2 + nap×0.2
```

---

## 8. Variables de Entorno

Todas las variables se inyectan automáticamente en el entorno de Manus. Para despliegue independiente, deben configurarse manualmente.

| Variable | Obligatoria | Descripción | Cómo obtenerla |
|---|---|---|---|
| `DATABASE_URL` | ✅ | Connection string MySQL. Formato: `mysql://user:pass@host:port/dbname` | Proveedor de BD (PlanetScale, Railway, etc.) |
| `JWT_SECRET` | ✅ | Secreto para firmar cookies de sesión JWT. Mínimo 32 chars aleatorios | `openssl rand -hex 32` |
| `VITE_APP_ID` | ✅ | ID de la aplicación OAuth | Panel de Manus o proveedor OAuth propio |
| `OAUTH_SERVER_URL` | ✅ | URL base del servidor OAuth (backend) | `https://api.manus.im` en Manus |
| `VITE_OAUTH_PORTAL_URL` | ✅ | URL del portal de login OAuth (frontend) | `https://manus.im` en Manus |
| `OWNER_OPEN_ID` | ✅ | OpenID del propietario (se promueve a admin automáticamente) | ID del usuario en el proveedor OAuth |
| `OWNER_NAME` | ⬜ | Nombre del propietario (para notificaciones) | Texto libre |
| `BUILT_IN_FORGE_API_URL` | ✅ | URL de la API del LLM (OpenAI-compatible) | `https://api.manus.im/forge` en Manus |
| `BUILT_IN_FORGE_API_KEY` | ✅ | API Key para el LLM (server-side) | Panel de Manus o clave OpenAI propia |
| `VITE_FRONTEND_FORGE_API_URL` | ⬜ | URL del LLM para frontend (si se usa desde cliente) | Igual que `BUILT_IN_FORGE_API_URL` |
| `VITE_FRONTEND_FORGE_API_KEY` | ⬜ | API Key para frontend | Clave con permisos limitados |
| `VITE_ANALYTICS_ENDPOINT` | ⬜ | Endpoint de analytics (Umami, etc.) | Opcional |
| `VITE_ANALYTICS_WEBSITE_ID` | ⬜ | ID del sitio en analytics | Opcional |

> **Nota de seguridad:** Las variables con prefijo `VITE_` son visibles en el bundle del cliente. Nunca pongas claves secretas en variables `VITE_`. El `BUILT_IN_FORGE_API_KEY` (sin prefijo VITE) solo se usa en servidor.

---

## 9. Autenticación y Sesiones

El sistema usa **OAuth 2.0** con Manus como proveedor de identidad. El flujo es:

```
1. Frontend genera URL de login con getLoginUrl(returnPath)
   → Incluye origin + returnPath en el parámetro state
   
2. Usuario se autentica en el portal OAuth (manus.im)

3. OAuth redirige a /api/oauth/callback?code=...&state=...

4. Servidor intercambia code por token de usuario
   → Llama a OAUTH_SERVER_URL para obtener perfil del usuario
   
5. Servidor hace upsert del usuario en la tabla users
   → Si openId === OWNER_OPEN_ID, asigna role='admin'
   
6. Servidor crea JWT firmado con JWT_SECRET
   → Contiene: userId, openId, role, exp (7 días)
   
7. Servidor setea cookie HTTP-only con el JWT
   → secure: true en producción
   → sameSite: 'lax'
   
8. Servidor redirige al frontend (origin extraído del state)

9. En cada request a /api/trpc:
   → context.ts lee la cookie, verifica el JWT
   → Inyecta ctx.user si el token es válido
   
10. protectedProcedure verifica ctx.user !== null
    → Lanza TRPCError UNAUTHORIZED si no hay sesión
```

**Para despliegue independiente:** Necesitarás implementar tu propio proveedor OAuth (Google, GitHub, etc.) o usar un servicio como Auth0, Clerk o NextAuth. La lógica de `server/_core/oauth.ts` deberá adaptarse.

---

## 10. Frontend — Rutas y Páginas

| Ruta | Componente | Auth | Descripción |
|---|---|---|---|
| `/` | `Home.tsx` | Pública | Landing page con hero, stats, cómo funciona, planes y CTA |
| `/auditoria` | `Auditoria.tsx` | Pública | Formulario de 4 pasos: datos negocio → datos comerciales → contexto → envío |
| `/resultado/:id` | `Resultado.tsx` | Pública | Informe completo del diagnóstico con todas las secciones |
| `/dashboard` | `Dashboard.tsx` | **Requiere auth** | Panel admin con lista de leads, estadísticas y gestión de conversión |
| `*` | `NotFound.tsx` | Pública | 404 |

### Página `Resultado.tsx` — Secciones del informe

El informe de diagnóstico está compuesto por las siguientes secciones, en orden:

1. **Hero** — Score global (gauge animado), nombre del negocio, sector/ciudad, resumen ejecutivo, badges de problemas críticos
2. **4 Subscores** — Grid de 4 tarjetas: Ficha Google, Presencia Web, Visibilidad GEO, Coherencia NAP
3. **Fuga de Capital** — Estimación mensual en €, búsquedas/mes, tasa de conversión, número de problemas
4. **Análisis de Negocio y Mercado** — Ticket medio del sector, servicios típicos, proyección de ingresos (3 escenarios), tabla de keywords recomendadas, insights de competidores, oportunidad de mercado
5. **Análisis de Situación Actual** — 5 dimensiones: Google, Web, GEO, NAP, Competidores
6. **Problemas Detectados** — Lista ordenada por severidad con solución para cada uno
7. **Plan de Acción 30 días** — Acciones priorizadas con timeframe e impacto esperado
8. **Oportunidades Clave** — Grid de ventajas competitivas
9. **Plan Recomendado** — Tarjeta con el plan Elexxia más adecuado, precio, features y justificación
10. **CTA Final** — Llamada a la acción para agendar llamada

---

## 11. Tests

Los tests están en `server/*.test.ts` y se ejecutan con `pnpm test` (Vitest).

| Archivo | Descripción |
|---|---|
| `server/auth.logout.test.ts` | Test de referencia: verifica que el logout limpia la cookie correctamente |
| `server/audit.test.ts` | Tests de los helpers de base de datos y validación de input |

**Cobertura actual:** Básica. Ver sección de mejoras para ampliar.

---

## 12. Puntos de Mejora Técnica

Esta sección documenta las deudas técnicas y áreas de mejora identificadas, ordenadas por impacto.

### Crítico (bloquea escala)

**12.1 Autenticación independiente de Manus**

Actualmente el sistema depende 100% de Manus OAuth y la Forge API (LLM). Para ser completamente independiente:
- Reemplazar `server/_core/oauth.ts` con un proveedor estándar (Google OAuth, Auth0, Clerk)
- Reemplazar `invokeLLM()` en `server/_core/llm.ts` con llamadas directas a OpenAI API o Anthropic
- Reemplazar `notifyOwner()` con un servicio de email (Resend, SendGrid) o webhook a Slack/WhatsApp

**12.2 Procesamiento asíncrono del diagnóstico**

Actualmente el diagnóstico se genera de forma **síncrona** en la misma request HTTP. Si el LLM tarda más de 30 segundos (posible en servidores lentos), la request puede timeout. La solución correcta es:
- Crear la auditoría con `status="pending"` y devolver el `auditId` inmediatamente
- Procesar el diagnóstico en background (worker, queue, o simplemente `setImmediate`)
- El frontend hace polling a `audit.getById` hasta que `status === "completed"`
- Esto ya está parcialmente implementado (el status existe en el schema) pero el procesamiento sigue siendo síncrono

**12.3 Rate limiting**

No hay rate limiting en el endpoint `audit.create`. Un actor malicioso podría generar miles de auditorías y consumir todo el crédito del LLM. Implementar:
- `express-rate-limit` por IP (máx. 5 auditorías/hora por IP)
- Validación de email real (verificación o captcha)

### Alto (mejora significativa)

**12.4 Exportación PDF de calidad**

El PDF actual usa `window.print()` del navegador, que tiene limitaciones (no todos los navegadores respetan `print-color-adjust: exact`). Para un PDF de calidad profesional:
- Usar **Puppeteer** en el servidor para renderizar la página y generar PDF
- O usar **React-PDF** para generar el PDF con una plantilla dedicada
- El PDF debería guardarse en S3 y ser descargable con un enlace permanente

**12.5 Gestión de errores del LLM**

Si el LLM devuelve un JSON inválido o incompleto, el sistema marca la auditoría como "error" pero no hay mecanismo de reintento. Implementar:
- Retry automático (máx. 3 intentos) con backoff exponencial
- Fallback a un diagnóstico genérico si los 3 intentos fallan
- Alertas al equipo cuando hay errores frecuentes

**12.6 Paginación real en el dashboard**

La lista de auditorías tiene paginación básica (`limit/offset`) pero la UI no la implementa. Con volumen alto de leads, cargar 50 registros de golpe es ineficiente. Implementar paginación con cursor o infinite scroll.

**12.7 Búsqueda y filtros en el dashboard**

El dashboard no tiene filtros por sector, ciudad, plan recomendado, estado de conversión o rango de fechas. Esencial para el equipo comercial cuando hay más de 50 leads.

### Medio (mejora de experiencia)

**12.8 Campo de transcripción visible en el formulario**

El backend procesa `callTranscript` pero el formulario no tiene un campo visible para pegarlo. Añadir un campo de texto en el paso 3 del formulario ("¿Tienes notas de una llamada previa?") mejoraría significativamente la calidad del diagnóstico.

**12.9 Envío del informe por email**

Actualmente el lead tiene que guardar la URL del resultado. Implementar envío automático del informe por email (con Resend o SendGrid) al completar la auditoría.

**12.10 Webhook a CRM**

Añadir un webhook configurable que envíe los datos de cada nueva auditoría a un CRM externo (HubSpot, Pipedrive, Salesforce) o a un canal de Slack/WhatsApp para el equipo comercial.

**12.11 Caché de diagnósticos similares**

Si dos negocios del mismo sector y ciudad solicitan diagnósticos en el mismo día, el LLM generará respuestas muy similares. Implementar un caché básico (Redis o en memoria) para reducir costes del LLM.

**12.12 Internacionalización (i18n)**

El sistema está completamente en español. Si se quiere expandir a otros mercados, implementar i18n con `react-i18next`.

### Bajo (deuda técnica)

**12.13 Cobertura de tests insuficiente**

Solo hay 2 archivos de test. Añadir tests para:
- `generateAuditDiagnosis()` con mocks del LLM
- `calculateScores()` con casos extremos
- Todos los procedimientos tRPC protegidos
- Validación del schema Zod con inputs inválidos

**12.14 Logging estructurado**

No hay logging estructurado en producción. Implementar `pino` o `winston` con niveles de log y exportación a un servicio de observabilidad (Datadog, Sentry).

**12.15 Migraciones de BD en producción**

El comando `pnpm db:push` ejecuta `drizzle-kit generate && drizzle-kit migrate`. En producción, las migraciones deberían ejecutarse de forma controlada, no automática. Implementar un proceso de migración explícito en el CI/CD.

---

## 13. Roadmap Técnico Priorizado

El siguiente roadmap está diseñado para que el equipo pueda ejecutarlo en sprints de 2 semanas, ordenado por impacto en el negocio.

| Sprint | Feature | Impacto | Esfuerzo |
|---|---|---|---|
| **Sprint 1** | Procesamiento asíncrono (12.2) + Rate limiting (12.3) | Crítico para escala | 3 días |
| **Sprint 1** | Campo transcripción en formulario (12.8) | Alto (mejora diagnóstico) | 0.5 días |
| **Sprint 2** | Exportación PDF con Puppeteer (12.4) | Alto (activo comercial) | 3 días |
| **Sprint 2** | Envío informe por email (12.9) | Alto (retención leads) | 2 días |
| **Sprint 3** | Filtros y búsqueda en dashboard (12.7) | Alto (eficiencia comercial) | 3 días |
| **Sprint 3** | Webhook a CRM/Slack (12.10) | Alto (integración pipeline) | 2 días |
| **Sprint 4** | Autenticación independiente (12.1) | Crítico para independencia | 5 días |
| **Sprint 4** | Retry LLM + alertas de error (12.5) | Alto (fiabilidad) | 2 días |
| **Sprint 5** | Tests completos (12.13) | Medio (calidad) | 4 días |
| **Sprint 5** | Logging estructurado + Sentry (12.14) | Medio (observabilidad) | 2 días |
| **Sprint 6** | Caché de diagnósticos (12.11) | Medio (reducción costes) | 3 días |
| **Sprint 6** | Paginación real dashboard (12.6) | Medio (escala) | 1 día |

---

*Documento generado el 20 de marzo de 2026. Para preguntas técnicas, contactar con el equipo de ingeniería.*
