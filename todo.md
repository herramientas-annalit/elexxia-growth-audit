# Elexxia Growth Audit - TODO

## Backend & Database
- [x] Schema: tabla `audits` con todos los campos del formulario y resultados
- [x] Schema: tabla `audit_results` con el JSON del informe de IA
- [x] DB push y migraciones
- [x] tRPC procedure: `audit.create` (crea auditoría y lanza análisis IA)
- [x] tRPC procedure: `audit.getById` (obtiene auditoría con resultados)
- [x] tRPC procedure: `audit.list` (lista para dashboard)
- [x] tRPC procedure: `audit.dashboardStats` (métricas para dashboard)
- [x] tRPC procedure: `audit.updateConversion` (actualizar estado de conversión)
- [x] Motor de análisis IA: prompt estructurado con JSON schema para diagnóstico
- [x] Notificación al owner cuando se crea una nueva auditoría

## Frontend - Formulario de Auditoría
- [x] Página de inicio pública con CTA a formulario
- [x] Formulario multi-paso (4 pasos): datos básicos, presencia digital, contexto comercial, contexto adicional
- [x] Paso 1: nombre negocio, sector, ciudad, URL web, Google Maps link
- [x] Paso 2: ticket medio, margen, clientes/mes actuales, inversión previa marketing
- [x] Paso 3: equipo comercial, cuello de botella
- [x] Paso 4: transcripción llamada (opcional), notas adicionales
- [x] Validación de formulario con Zod
- [x] Estado de carga con animación mientras IA analiza

## Frontend - Informe de Diagnóstico
- [x] Puntuación general circular (0-100) con color según rango
- [x] Sección: Radiografía Actual del negocio
- [x] Sección: Análisis GEO (presencia en ChatGPT/Perplexity)
- [x] Sección: Estimación de fuga de capital mensual
- [x] Sección: Problemas detectados con severidad (crítico/alto/medio/bajo)
- [x] Sección: Plan de acción 30 días
- [x] Sección: Recomendación de plan Elexxia (300€/500€/1000€)
- [ ] Botón de descarga PDF del informe completo (pendiente)

## Frontend - Dashboard Equipo Elexxia
- [x] Ruta protegida /dashboard (solo autenticados)
- [x] Tabla de auditorías realizadas con estado y puntuación
- [x] Métricas: total auditorías, puntuación media, clientes convertidos, tasa conversión
- [x] Vista detalle de cada auditoría (enlace a /resultado/:id)

## Diseño & Branding
- [x] Paleta de colores Elexxia (#0066FF, #6B46C1, dark bg)
- [x] Tipografía moderna (Inter/Space Grotesk)
- [x] Tema oscuro con acentos de color corporativo
- [x] Diseño responsive mobile-first

## Tests
- [x] Test: procedure audit.create
- [x] Test: procedure audit.getById
- [x] Test: procedure audit.dashboardStats
- [x] Test: auth.logout

## Pendiente (v2)
- [ ] Generación de PDF del informe con branding Elexxia
- [ ] Filtros avanzados en el dashboard
- [ ] Indicador de conversión editable desde el dashboard

## Mejoras Motor IA (v2)
- [x] Reescribir prompt maestro con diagnóstico profundo por sector, ciudad y contexto
- [x] Garantizar diagnóstico completo incluso con datos mínimos (solo nombre/sector/ciudad)
- [x] Añadir análisis de competencia por sector en el prompt
- [x] Añadir estimación de volumen de búsquedas por sector/ciudad en el prompt
- [x] Mejorar pantalla de resultados para mostrar todo el contenido generado

## Mejoras v3 (feedback post-prueba real)
- [x] Corregir scores para que sean coherentes con datos reales (sin web=0-10, sin GBP=0-10)
- [x] Calibrar fuga de capital para ser realista (no inflar expectativas)
- [x] Añadir sección "Análisis de Negocio y Mercado" al schema y prompt IA
- [x] Añadir palabras clave recomendadas (3-5 keywords) al diagnóstico
- [x] Añadir proyección realista de ingresos al diagnóstico
- [x] Implementar PDF con colores de marca (CSS @media print)
- [x] Añadir disclaimer de transparencia en volumen de búsquedas

## Sprint v2 — Seguridad crítica
- [x] Rate limiting por IP (máx 3/día, 10/semana, 5/hora)
- [x] Validación estricta de inputs con límites de caracteres
- [x] Roles admin: solo role=admin accede al dashboard
- [x] Timeout LLM 90s + log de errores en BD
- [x] Métricas de coste LLM (tokens, €, ms) en BD

## Sprint v2 — Estructura BD y Dashboard avanzado
- [x] Schema: añadir campos de pipeline en `audits` (pipelineStage, nextFollowUpAt, assignedTo, dealValue)
- [x] Schema: añadir tabla `lead_notes` para historial de notas por lead
- [x] DB push con nuevos campos (ya estaban aplicados desde sprint anterior)
- [x] tRPC: procedure para actualizar pipeline stage
- [x] tRPC: procedure para añadir/listar notas de un lead
- [x] Dashboard: columna de pipeline stage editable (Nuevo → Contactado → Propuesta → Cerrado/Perdido)
- [x] Dashboard: filtros por sector, ciudad, plan recomendado y estado pipeline
- [x] Dashboard: exportación CSV de todos los leads
- [x] Dashboard: columna de fuga de capital mensual por lead

## Sprint Seguridad + Audio + Email (22 marzo 2026)

- [x] Rate limiting real en server/rateLimiter.ts (máx 3/día, 10/semana por IP)
- [x] Integrar rate limiting en procedure audit.create
- [x] Validación .max() en todos los campos de texto libre del auditInputSchema
- [x] Timeout LLM 90s con Promise.race
- [x] Registro real de métricas LLM (tokens, coste, ms) en BD tras cada auditoría
- [x] Botón de audio en formulario público (MediaRecorder API nativa)
- [x] Endpoint tRPC transcribeAudio para transcribir audio vía Whisper
- [x] Inserción automática del texto transcrito en el campo de transcripción del formulario
- [x] Envío de email al cliente con el informe de diagnóstico vía Resend
- [x] sendDiagnosisEmail integrado en audit.create (fire-and-forget, no bloquea respuesta)
- [x] Tests actualizados para cubrir rate limiting y transcripción
