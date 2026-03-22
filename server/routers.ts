import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "./_core/llm";
import { notifyOwner } from "./_core/notification";
import { sendDiagnosisEmail } from "./emailService";
import { transcribeAudio } from "./_core/voiceTranscription";
import {
  createAudit,
  updateAuditStatus,
  updateAuditWithMetrics,
  createAuditResult,
  getAuditById,
  listAudits,
  listAuditsFiltered,
  getAllAuditsForExport,
  getDashboardStats,
  updateAuditConversion,
  updateAuditPipeline,
  addLeadNote,
  getLeadNotes,
} from "./db";
import type { AudiDiagnosis } from "../drizzle/schema";
import { checkRateLimit, getClientIp, PUBLIC_LIMITS } from "./rateLimiter";

const auditInputSchema = z.object({
  // Contact
  contactName: z.string().min(2).max(150),
  contactEmail: z.string().email().max(254),
  contactPhone: z.string().max(30).optional(),
  // Business
  businessName: z.string().min(2).max(200),
  businessSector: z.string().min(2).max(100),
  businessCity: z.string().min(2).max(100),
  websiteUrl: z.string().max(500).optional(),
  googleMapsUrl: z.string().max(500).optional(),
  // Commercial
  averageTicket: z.number().min(0).max(1000000).optional(),
  profitMargin: z.number().min(0).max(100).optional(),
  monthlyNewClients: z.number().min(0).max(100000).optional(),
  hasCommercialTeam: z.enum(["yes", "no", "partial"]).optional(),
  previousMarketingInvestment: z.enum(["none", "less_500", "500_1000", "more_1000"]).optional(),
  mainBottleneck: z.enum(["not_known", "known_not_buying", "high_acquisition_cost"]).optional(),
  // Optional — límites para prevenir prompt injection
  callTranscript: z.string().max(6000).optional(),
  additionalNotes: z.string().max(1000).optional(),
});

async function generateAuditDiagnosis(input: z.infer<typeof auditInputSchema>): Promise<AudiDiagnosis> {
  const investmentMap: Record<string, string> = {
    none: "Sin inversión previa en marketing digital",
    less_500: "Menos de 500€/mes en marketing digital",
    "500_1000": "Entre 500€ y 1.000€/mes en marketing digital",
    more_1000: "Más de 1.000€/mes en marketing digital",
  };
  const bottleneckMap: Record<string, string> = {
    not_known: "No me conocen — problema de visibilidad y captación",
    known_not_buying: "Me conocen pero no compran — problema de conversión y propuesta de valor",
    high_acquisition_cost: "Cierro ventas pero el coste de captación es muy alto — problema de eficiencia y ROI",
  };
  const teamMap: Record<string, string> = {
    yes: "Tiene equipo comercial dedicado",
    no: "Sin equipo comercial, lo gestiona el propietario directamente",
    partial: "Equipo comercial parcial o en proceso de formación",
  };

  const hasWebsite = !!(input.websiteUrl && input.websiteUrl.trim().length > 5);
  const hasGoogleMaps = !!(input.googleMapsUrl && input.googleMapsUrl.trim().length > 5);
  const hasTicket = !!(input.averageTicket && input.averageTicket > 0);
  const hasTranscript = !!(input.callTranscript && input.callTranscript.trim().length > 50);

  const systemPrompt = `Eres el motor de análisis estratégico de Elexxia, una agencia de marketing digital especializada en negocios locales en España. Tienes más de 10 años de experiencia auditando negocios locales y conoces en profundidad el SEO local, GEO (Generative Engine Optimization), Google Ads local, Meta Ads, y el mercado de negocios locales en España.

PLANES DE ELEXXIA:
- Plan Visibilidad Local (300€/mes): Web profesional gratis + SEO local completo (GBP, NAP, Schema, GEO básico). Para negocios sin presencia digital o con presencia muy deficiente. Compromiso 6 meses.
- Plan Aceleración de Leads (500€/mes): Todo lo anterior + Google Ads gestionado. Para negocios que necesitan leads inmediatos además de la base orgánica.
- Plan Dominio de Mercado (1.000€/mes): Todo lo anterior + Meta Ads + GEO avanzado + omnicanal. Para negocios con equipo comercial consolidado.

═══════════════════════════════════════════════════════
REGLAS CRÍTICAS — LEE ESTO ANTES DE GENERAR EL DIAGNÓSTICO
═══════════════════════════════════════════════════════

### REGLA 1: SCORES COHERENTES CON LA REALIDAD
Los scores DEBEN reflejar la situación real del negocio. NO inventes scores altos para negocios sin presencia digital.

LÓGICA DE SCORES:
- googlePresenceScore: Si NO tiene GBP verificado → entre 5 y 15. Si tiene GBP pero sin optimizar → 20-40. Si tiene GBP optimizado → 50-80.
- webConversionScore: Si NO tiene web profesional → entre 5 y 15. Si tiene web básica/casera → 20-40. Si tiene web optimizada → 50-80.
- geoScore: Si no tiene web ni GBP ni structured data → entre 3 y 10. Si tiene presencia básica → 15-30. Si tiene contenido de autoridad → 40-70.
- napConsistencyScore: Si no tiene web ni GBP → entre 5 y 15 (no hay fuente de verdad). Si tiene presencia parcial → 20-45.
- overallScore: Promedio ponderado de los anteriores. Para negocios sin presencia digital, el overall NUNCA debe superar 25.

### REGLA 2: FUGA DE CAPITAL REALISTA Y HONESTA
La estimación de fuga de capital debe ser CONSERVADORA y REALISTA. NO exageres.

METODOLOGÍA DE CÁLCULO HONESTA:
1. Estima el volumen de búsquedas mensual para las keywords principales del sector en la ciudad (sé conservador).
2. Aplica una tasa de click-through del 3-5% (solo los primeros resultados reciben clicks).
3. De esos clicks, aplica una tasa de conversión a lead del 5-10%.
4. De esos leads, aplica una tasa de cierre del 20-40% según el sector.
5. Multiplica por el ticket medio REAL del sector (no el máximo posible).
6. Para negocios que empiezan o micropymes: el escenario realista es 1-3 clientes/mes adicionales, no 7-10.
7. SIEMPRE incluye un disclaimer de que son estimaciones basadas en benchmarks del sector, no datos exactos.

### REGLA 3: ANÁLISIS DE NEGOCIO HONESTO Y ÚTIL
La sección businessAnalysis debe ser REALISTA y ÚTIL para el empresario.

Para las proyecciones de ingresos:
- Escenario conservador: 1 cliente/mes adicional (lo que se puede conseguir en los primeros 3 meses con SEO local básico)
- Escenario realista: 2-3 clientes/mes (a los 6 meses con SEO + GBP optimizado)
- Escenario optimista: 4-6 clientes/mes (a los 12 meses con estrategia completa)
- Para micropymes/autónomos que empiezan: el escenario conservador es el más relevante

Para las keywords: recomienda 3-5 keywords REALES y específicas para el sector y ciudad. Incluye keywords transaccionales (alta intención de compra) como prioridad.

### REGLA 4: VOLUMEN DE BÚSQUEDAS — TRANSPARENCIA
Los volúmenes de búsqueda son ESTIMACIONES basadas en benchmarks del sector, no datos exactos de herramientas como SEMrush o Ahrefs. Siempre incluye el disclaimer: "Estimación basada en benchmarks del sector. Los datos exactos requieren análisis con herramientas de keyword research."

### REGLA 5: PROBLEMAS ESPECÍFICOS Y TÉCNICOS
Identifica entre 6 y 8 problemas. Sé específico y técnico. Ejemplos de buena descripción:
- BUENO: "El Google Business Profile no tiene categoría secundaria configurada, no tiene publicaciones en los últimos 30 días, y las fotos tienen más de 6 meses de antigüedad."
- MALO: "Falta optimización en Google"

CONOCIMIENTO DE SECTORES (benchmarks reales España):
- ABOGADO LABORALISTA: Búsquedas locales 200-500/mes ciudad mediana. Ticket: 500-3.000€ (honorarios + comisión). Margen: 60-80%. Keywords: "abogado laboralista [ciudad]", "despido improcedente [ciudad]", "ERE [ciudad]", "abogado laboral barato [ciudad]". Competencia media-alta. Clientes realistas con SEO: 1-3/mes.
- CLÍNICA DENTAL: Búsquedas 500-2.000/mes. Ticket: 800-3.000€. Margen: 40-60%. Keywords: "dentista [ciudad]", "clínica dental [ciudad]", "implantes dentales [ciudad]". Clientes realistas: 3-8/mes.
- CLÍNICA ESTÉTICA: Búsquedas 300-1.500/mes. Ticket: 200-800€. Margen: 50-70%. Keywords: "botox [ciudad]", "relleno labios [ciudad]", "medicina estética [ciudad]". Clientes realistas: 5-15/mes.
- FONTANERO/ELECTRICISTA: Búsquedas 200-800/mes. Ticket: 150-500€. Margen: 40-60%. Keywords: "fontanero urgente [ciudad]", "electricista [ciudad]", "fontanero 24h [ciudad]". Clientes realistas: 5-15/mes.
- PSICÓLOGO/TERAPEUTA: Búsquedas 200-700/mes. Ticket: 60-120€/sesión. Margen: 70-85%. Keywords: "psicólogo [ciudad]", "terapia ansiedad [ciudad]", "psicólogo online [ciudad]". Clientes realistas: 3-8/mes.
- FISIOTERAPEUTA: Búsquedas 300-1.000/mes. Ticket: 50-80€. Margen: 60-75%. Keywords: "fisioterapeuta [ciudad]", "fisio lesiones deportivas [ciudad]", "osteopata [ciudad]". Clientes realistas: 5-15/mes.
- RESTAURANTE/BAR: Búsquedas 500-3.000/mes. Ticket: 25-80€. Margen: 20-35%. Keywords: "restaurante [ciudad]", "restaurante [tipo cocina] [ciudad]", "donde comer [ciudad]". Clientes realistas: 20-60/mes.
- ACADEMIA/FORMACIÓN: Búsquedas 200-800/mes. Ticket: 300-2.000€/curso. Margen: 50-70%. Keywords: "academia [materia] [ciudad]", "clases particulares [ciudad]", "preparar [oposición] [ciudad]". Clientes realistas: 3-8/mes.
- INMOBILIARIA: Búsquedas 400-1.500/mes. Ticket: 5.000-20.000€ comisión. Margen: variable. Keywords: "inmobiliaria [ciudad]", "pisos en venta [ciudad]", "alquiler [ciudad]". Clientes realistas: 1-3/mes.
- TALLER MECÁNICO: Búsquedas 300-1.000/mes. Ticket: 200-800€. Margen: 40-55%. Keywords: "taller mecánico [ciudad]", "revisión coche [ciudad]", "ITV [ciudad]". Clientes realistas: 5-15/mes.
- PELUQUERÍA/BARBERÍA: Búsquedas 200-800/mes. Ticket: 30-100€. Margen: 50-65%. Keywords: "peluquería [ciudad]", "barbería [ciudad]", "corte pelo [ciudad]". Clientes realistas: 10-30/mes.
- GIMNASIO/FITNESS: Búsquedas 300-1.000/mes. Ticket: 40-80€/mes. Margen: 40-60%. Keywords: "gimnasio [ciudad]", "gym cerca de mí [ciudad]", "entrenador personal [ciudad]". Clientes realistas: 5-15/mes.

Responde ÚNICAMENTE con el JSON válido según el schema proporcionado, sin ningún texto adicional.`;

  const userPrompt = `Genera un diagnóstico digital COMPLETO, HONESTO y ACCIONABLE para este negocio local. Sé específico, técnico y realista. No exageres ni infles expectativas.

═══════════════════════════════════════
DATOS DEL NEGOCIO
═══════════════════════════════════════
Nombre: ${input.businessName}
Sector: ${input.businessSector}
Ciudad: ${input.businessCity}
Tiene web: ${hasWebsite ? `SÍ — URL: ${input.websiteUrl}` : "NO TIENE WEB PROFESIONAL"}
Tiene Google Maps/GBP: ${hasGoogleMaps ? `SÍ — URL: ${input.googleMapsUrl}` : "NO TIENE GOOGLE BUSINESS PROFILE VERIFICADO"}

═══════════════════════════════════════
DATOS COMERCIALES
═══════════════════════════════════════
Ticket medio: ${hasTicket ? `${input.averageTicket}€` : "No especificado — usa benchmark del sector"}
Margen: ${input.profitMargin ? `${input.profitMargin}%` : "No especificado — usa benchmark del sector"}
Clientes nuevos/mes por internet: ${input.monthlyNewClients !== undefined ? input.monthlyNewClients : "No especificado"}
Equipo comercial: ${input.hasCommercialTeam ? teamMap[input.hasCommercialTeam] : "No especificado"}
Inversión previa marketing: ${input.previousMarketingInvestment ? investmentMap[input.previousMarketingInvestment] : "No especificado"}
Cuello de botella: ${input.mainBottleneck ? bottleneckMap[input.mainBottleneck] : "No especificado"}

${hasTranscript ? `═══════════════════════════════════════
TRANSCRIPCIÓN DE LLAMADA COMERCIAL
(Extrae información clave: situación actual, necesidades, objeciones, contexto del negocio)
═══════════════════════════════════════
${input.callTranscript!.substring(0, 4000)}` : ""}
${input.additionalNotes ? `\n═══════════════════════════════════════\nNOTAS ADICIONALES\n═══════════════════════════════════════\n${input.additionalNotes}` : ""}

═══════════════════════════════════════
INSTRUCCIONES ESPECÍFICAS
═══════════════════════════════════════
1. SCORES: Asigna scores COHERENTES con la situación real. ${!hasWebsite ? "SIN WEB = webConversionScore entre 5-15." : ""} ${!hasGoogleMaps ? "SIN GBP = googlePresenceScore entre 5-15." : ""} ${!hasWebsite && !hasGoogleMaps ? "SIN PRESENCIA DIGITAL = geoScore entre 3-10, napConsistencyScore entre 5-15, overallScore entre 8-20." : ""}

2. FUGA DE CAPITAL: Sé conservador y realista. Para ${input.businessSector} en ${input.businessCity}, calcula cuántos clientes adicionales podría conseguir con una buena presencia digital. No exageres. El escenario realista para un negocio que empieza es 1-3 clientes/mes adicionales.

3. ANÁLISIS DE NEGOCIO: Incluye el rango de ticket medio real del sector, los servicios típicos, proyecciones realistas (conservadora/realista/optimista), y 3-5 keywords específicas para "${input.businessSector}" en "${input.businessCity}".

4. PROBLEMAS: Identifica exactamente los problemas técnicos más probables para este negocio. Sé específico y técnico.

5. PLAN DE ACCIÓN: Acciones concretas que Elexxia ejecutaría en los primeros 30 días.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "audit_diagnosis",
        strict: true,
        schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            currentSituation: {
              type: "object",
              properties: {
                googlePresence: { type: "string" },
                webStatus: { type: "string" },
                geoAnalysis: { type: "string" },
                napConsistency: { type: "string" },
                competitorContext: { type: "string" },
              },
              required: ["googlePresence", "webStatus", "geoAnalysis", "napConsistency", "competitorContext"],
              additionalProperties: false,
            },
            capitalLeakAnalysis: {
              type: "object",
              properties: {
                monthlySearchVolume: { type: "number" },
                estimatedConversionRate: { type: "number" },
                estimatedMonthlyLeak: { type: "number" },
                explanation: { type: "string" },
              },
              required: ["monthlySearchVolume", "estimatedConversionRate", "estimatedMonthlyLeak", "explanation"],
              additionalProperties: false,
            },
            businessAnalysis: {
              type: "object",
              properties: {
                sectorTicketRange: {
                  type: "object",
                  properties: {
                    min: { type: "number" },
                    max: { type: "number" },
                    currency: { type: "string" },
                  },
                  required: ["min", "max", "currency"],
                  additionalProperties: false,
                },
                typicalServices: { type: "array", items: { type: "string" } },
                revenueProjections: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      scenario: { type: "string", enum: ["conservative", "realistic", "optimistic"] },
                      label: { type: "string" },
                      monthlyClients: { type: "number" },
                      monthlyRevenue: { type: "number" },
                      description: { type: "string" },
                    },
                    required: ["scenario", "label", "monthlyClients", "monthlyRevenue", "description"],
                    additionalProperties: false,
                  },
                },
                keywordRecommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      keyword: { type: "string" },
                      intent: { type: "string", enum: ["transactional", "informational", "navigational"] },
                      estimatedMonthlySearches: { type: "number" },
                      difficulty: { type: "string", enum: ["low", "medium", "high"] },
                      priority: { type: "string", enum: ["primary", "secondary"] },
                    },
                    required: ["keyword", "intent", "estimatedMonthlySearches", "difficulty", "priority"],
                    additionalProperties: false,
                  },
                },
                competitorInsights: { type: "string" },
                marketOpportunity: { type: "string" },
                searchVolumeDisclaimer: { type: "string" },
              },
              required: ["sectorTicketRange", "typicalServices", "revenueProjections", "keywordRecommendations", "competitorInsights", "marketOpportunity", "searchVolumeDisclaimer"],
              additionalProperties: false,
            },
            issues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  area: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" },
                  severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
                  solution: { type: "string" },
                },
                required: ["id", "area", "title", "description", "severity", "solution"],
                additionalProperties: false,
              },
            },
            actionPlan: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  priority: { type: "number" },
                  timeframe: { type: "string", enum: ["immediate", "week_1", "month_1"] },
                  title: { type: "string" },
                  description: { type: "string" },
                  expectedImpact: { type: "string" },
                },
                required: ["priority", "timeframe", "title", "description", "expectedImpact"],
                additionalProperties: false,
              },
            },
            recommendedPlan: { type: "string", enum: ["local_300", "acceleration_500", "domination_1000"] },
            recommendedPlanReason: { type: "string" },
            keyOpportunities: { type: "array", items: { type: "string" } },
          },
          required: ["summary", "currentSituation", "capitalLeakAnalysis", "businessAnalysis", "issues", "actionPlan", "recommendedPlan", "recommendedPlanReason", "keyOpportunities"],
          additionalProperties: false,
        },
      },
    },
  });

  const rawContent = response.choices[0]?.message?.content;
  const content = typeof rawContent === 'string' ? rawContent : null;
  if (!content) throw new Error("No response from AI");
  return JSON.parse(content) as AudiDiagnosis;
}

function calculateScores(diagnosis: AudiDiagnosis, input: z.infer<typeof auditInputSchema>) {
  // Use the scores from the AI diagnosis issues, but also factor in the actual data availability
  const hasWebsite = !!(input.websiteUrl && input.websiteUrl.trim().length > 5);
  const hasGoogleMaps = !!(input.googleMapsUrl && input.googleMapsUrl.trim().length > 5);

  const issues = diagnosis.issues;

  const scoreFromIssues = (issueList: typeof issues, baseScore: number) => {
    const d = issueList.reduce((acc, i) => acc + (i.severity === "critical" ? 25 : i.severity === "high" ? 15 : i.severity === "medium" ? 8 : 3), 0);
    return Math.max(5, Math.min(90, baseScore - d));
  };

  const googleIssues = issues.filter(i => i.area.includes("Google") || i.area.includes("GBP") || i.area.includes("Reseñas"));
  const webIssues = issues.filter(i => i.area.includes("Web") || i.area.includes("Conversión") || i.area.includes("Landing") || i.area.includes("Presencia Digital"));
  const geoIssues = issues.filter(i => i.area.includes("GEO") || i.area.includes("Schema") || i.area.includes("IA") || i.area.includes("LLM"));
  const napIssues = issues.filter(i => i.area.includes("NAP") || i.area.includes("Directorios") || i.area.includes("Citas") || i.area.includes("Consistencia"));

  // Base scores depend on whether they have the basic assets
  const googleBase = hasGoogleMaps ? 70 : 15;
  const webBase = hasWebsite ? 70 : 15;
  const geoBase = (hasWebsite && hasGoogleMaps) ? 50 : hasWebsite || hasGoogleMaps ? 25 : 10;
  const napBase = (hasWebsite && hasGoogleMaps) ? 60 : hasWebsite || hasGoogleMaps ? 30 : 15;

  const googlePresenceScore = scoreFromIssues(googleIssues, googleBase);
  const webConversionScore = scoreFromIssues(webIssues, webBase);
  const geoScore = scoreFromIssues(geoIssues, geoBase);
  const napConsistencyScore = scoreFromIssues(napIssues, napBase);

  const overallScore = Math.round(
    (googlePresenceScore * 0.3 + webConversionScore * 0.3 + geoScore * 0.2 + napConsistencyScore * 0.2)
  );

  return {
    overallScore: Math.max(5, Math.min(90, overallScore)),
    googlePresenceScore,
    webConversionScore,
    geoScore,
    napConsistencyScore,
  };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  audit: router({
    create: publicProcedure
      .input(auditInputSchema)
      .mutation(async ({ input, ctx }) => {
        // 1. Rate limiting por IP
        const clientIp = getClientIp(ctx.req as any);
        const rateLimitResult = checkRateLimit(clientIp, PUBLIC_LIMITS);
        if (!rateLimitResult.allowed) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: rateLimitResult.reason ?? "Demasiadas solicitudes. Inténtalo más tarde.",
          });
        }

        const auditId = await createAudit({
          ...input,
          status: "analyzing",
          clientIp,
        });

        const startTime = Date.now();
        try {
          // 2. Timeout de 90 segundos para la llamada al LLM
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("LLM_TIMEOUT")), 90_000)
          );
          const diagnosis = await Promise.race([
            generateAuditDiagnosis(input),
            timeoutPromise,
          ]) as AudiDiagnosis;

          const scores = calculateScores(diagnosis, input);
          const generationMs = Date.now() - startTime;
          // Estimación conservadora: ~1500 tokens de entrada + ~2000 de salida
          const estimatedTokens = 3500;
          const estimatedCostEur = parseFloat((estimatedTokens * 0.0000008).toFixed(6));

          await createAuditResult({
            auditId,
            overallScore: scores.overallScore,
            googlePresenceScore: scores.googlePresenceScore,
            webConversionScore: scores.webConversionScore,
            geoScore: scores.geoScore,
            napConsistencyScore: scores.napConsistencyScore,
            estimatedMonthlyLeak: diagnosis.capitalLeakAnalysis.estimatedMonthlyLeak,
            diagnosis,
            recommendedPlan: diagnosis.recommendedPlan,
            recommendedPlanReason: diagnosis.recommendedPlanReason,
          });

          // 3. Registrar métricas reales en BD
          await updateAuditWithMetrics(auditId, {
            status: "completed",
            llmTokensUsed: estimatedTokens,
            llmGenerationMs: generationMs,
            llmEstimatedCostEur: estimatedCostEur,
          });

          // status ya actualizado con métricas arriba

           await notifyOwner({
            title: `🔍 Nueva auditoría: ${input.businessName}`,
            content: `${input.contactName} (${input.contactEmail}) — ${input.businessSector} en ${input.businessCity}\n\nPuntuación: ${scores.overallScore}/100\nFuga de capital: ${diagnosis.capitalLeakAnalysis.estimatedMonthlyLeak}€/mes\nPlan recomendado: ${diagnosis.recommendedPlan}\nProblemas críticos: ${diagnosis.issues.filter(i => i.severity === 'critical').length}\nTiempo de generación: ${generationMs}ms`,
          });
          // Enviar email al cliente con el informe (no bloquea la respuesta)
          const planNames: Record<string, string> = {
            local_300: "Plan Visibilidad Local",
            acceleration_500: "Plan Aceleración de Leads",
            domination_1000: "Plan Dominio de Mercado",
          };
          const planPrices: Record<string, string> = {
            local_300: "300€",
            acceleration_500: "500€",
            domination_1000: "1.000€",
          };
          const auditUrl = `/resultado/${auditId}`;
          sendDiagnosisEmail({
            to: input.contactEmail,
            clientName: input.contactName,
            businessName: input.businessName,
            sector: input.businessSector,
            city: input.businessCity,
            overallScore: scores.overallScore,
            capitalLeakMonthly: diagnosis.capitalLeakAnalysis.estimatedMonthlyLeak,
            capitalLeakAnnual: diagnosis.capitalLeakAnalysis.estimatedMonthlyLeak * 12,
            executiveSummary: diagnosis.summary,
            recommendedPlan: planNames[diagnosis.recommendedPlan] ?? diagnosis.recommendedPlan,
            recommendedPlanPrice: planPrices[diagnosis.recommendedPlan] ?? "",
            auditUrl,
          }).catch(err => console.error('[Email] Error silencioso:', err));
          return { auditId, success: true };
        } catch (error) {
          const generationMs = Date.now() - startTime;
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          await updateAuditWithMetrics(auditId, {
            status: "error",
            llmGenerationMs: generationMs,
            generationError: errorMsg,
          });
          if (errorMsg === "LLM_TIMEOUT") {
            throw new TRPCError({ code: "TIMEOUT", message: "El análisis tardó demasiado. Por favor, inténtalo de nuevo." });
          }
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error generando el diagnóstico. Por favor, inténtalo de nuevo." });
        }
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const data = await getAuditById(input.id);
        if (!data) throw new TRPCError({ code: "NOT_FOUND", message: "Audit not found" });
        return data;
      }),

    list: protectedProcedure
      .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }).optional())
      .query(async ({ input }) => {
        return listAudits(input?.limit, input?.offset);
      }),

    dashboardStats: protectedProcedure.query(async () => {
      return getDashboardStats();
    }),

    updateConversion: protectedProcedure
      .input(z.object({
        id: z.number(),
        converted: z.enum(["yes", "no", "in_progress"]),
        plan: z.enum(["local_300", "acceleration_500", "domination_1000"]).optional(),
      }))
      .mutation(async ({ input }) => {
        await updateAuditConversion(input.id, input.converted, input.plan);
        return { success: true };
      }),

    // v2: Actualizar pipeline stage y seguimiento
    updatePipeline: protectedProcedure
      .input(z.object({
        id: z.number(),
        pipelineStage: z.enum(["new", "contacted", "proposal_sent", "negotiation", "closed_won", "closed_lost"]).optional(),
        nextFollowUpAt: z.string().datetime().optional().nullable(),
        assignedTo: z.string().max(255).optional().nullable(),
        dealValue: z.number().min(0).optional().nullable(),
      }))
      .mutation(async ({ input }) => {
        const { id, nextFollowUpAt, ...rest } = input;
        const parsedDate: Date | null | undefined =
          nextFollowUpAt === null ? null :
          nextFollowUpAt === undefined ? undefined :
          new Date(nextFollowUpAt);
        await updateAuditPipeline(id, {
          ...rest,
          nextFollowUpAt: parsedDate,
        });
        return { success: true };
      }),

    // v2: Listar con filtros
    listFiltered: protectedProcedure
      .input(z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
        sector: z.string().optional(),
        city: z.string().optional(),
        pipelineStage: z.string().optional(),
        recommendedPlan: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return listAuditsFiltered(input ?? {});
      }),

    // v2: Exportar todos los leads como datos para CSV
    exportAll: protectedProcedure.query(async () => {
      const rows = await getAllAuditsForExport();
      return rows.map(({ audit, result }) => ({
        id: audit.id,
        fecha: audit.createdAt.toISOString().split('T')[0],
        nombre_contacto: audit.contactName,
        email: audit.contactEmail,
        telefono: audit.contactPhone ?? '',
        negocio: audit.businessName,
        sector: audit.businessSector,
        ciudad: audit.businessCity,
        web: audit.websiteUrl ?? '',
        google_maps: audit.googleMapsUrl ?? '',
        ticket_medio: audit.averageTicket ?? '',
        margen: audit.profitMargin ?? '',
        clientes_mes: audit.monthlyNewClients ?? '',
        equipo_comercial: audit.hasCommercialTeam ?? '',
        inversion_previa: audit.previousMarketingInvestment ?? '',
        cuello_botella: audit.mainBottleneck ?? '',
        estado: audit.status,
        pipeline: audit.pipelineStage ?? 'new',
        proximo_seguimiento: audit.nextFollowUpAt?.toISOString().split('T')[0] ?? '',
        asignado_a: audit.assignedTo ?? '',
        valor_deal: audit.dealValue ?? '',
        convertido: audit.convertedToClient ?? 'no',
        plan_asignado: audit.assignedPlan ?? '',
        puntuacion: result?.overallScore ?? '',
        plan_recomendado: result?.recommendedPlan ?? '',
        fuga_capital_mes: result?.estimatedMonthlyLeak ?? '',
        tiempo_generacion_ms: audit.llmGenerationMs ?? '',
        coste_llm_eur: audit.llmEstimatedCostEur ?? '',
      }));
    }),

    // v2: Añadir nota a un lead
    addNote: protectedProcedure
      .input(z.object({
        auditId: z.number(),
        content: z.string().min(1).max(2000),
        noteType: z.enum(["call", "email", "whatsapp", "meeting", "internal"]).default("internal"),
        authorName: z.string().min(1).max(255),
      }))
      .mutation(async ({ input }) => {
        const noteId = await addLeadNote(input);
        return { noteId, success: true };
      }),

    // v2: Obtener notas de un lead
    getNotes: protectedProcedure
      .input(z.object({ auditId: z.number() }))
      .query(async ({ input }) => {
        return getLeadNotes(input.auditId);
      }),

    // Transcribir audio a texto para el campo de transcripción del formulario
    transcribeAudio: publicProcedure
      .input(z.object({
        audioUrl: z.string().url(),
        language: z.string().default("es"),
      }))
      .mutation(async ({ input }) => {
        const result = await transcribeAudio({
            audioUrl: input.audioUrl,
            language: input.language,
            prompt: "Transcripción de audio sobre un negocio local y su presencia digital",
          });
          // TranscriptionError tiene campo 'error', WhisperResponse tiene campo 'text'
          if ('error' in result) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: result.error ?? "No se pudo transcribir el audio. Por favor, inténtalo de nuevo.",
            });
          }
          return { text: result.text, success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
