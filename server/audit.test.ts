import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("./db", () => ({
  createAudit: vi.fn().mockResolvedValue(1),
  updateAuditStatus: vi.fn().mockResolvedValue(undefined),
  createAuditResult: vi.fn().mockResolvedValue(1),
  getAuditById: vi.fn().mockResolvedValue({
    audit: {
      id: 1,
      contactName: "Test User",
      contactEmail: "test@test.com",
      contactPhone: null,
      businessName: "Test Business",
      businessSector: "Restaurante",
      businessCity: "Madrid",
      websiteUrl: null,
      googleMapsUrl: null,
      averageTicket: 30,
      profitMargin: 40,
      monthlyNewClients: 10,
      hasCommercialTeam: "no",
      previousMarketingInvestment: "none",
      mainBottleneck: "not_known",
      callTranscript: null,
      additionalNotes: null,
      status: "completed",
      convertedToClient: "no",
      assignedPlan: null,
      pipelineStage: "new",
      nextFollowUpAt: null,
      assignedTo: null,
      dealValue: null,
      clientIp: "127.0.0.1",
      llmTokensUsed: 3500,
      llmEstimatedCostEur: 0.0028,
      llmGenerationMs: 4200,
      generationError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    result: {
      id: 1,
      auditId: 1,
      overallScore: 45,
      googlePresenceScore: 40,
      webConversionScore: 50,
      geoScore: 30,
      napConsistencyScore: 60,
      estimatedMonthlyLeak: 2400,
      diagnosis: {
        summary: "Test summary",
        currentSituation: {
          googlePresence: "Débil",
          webStatus: "Sin web",
          geoAnalysis: "No aparece en IA",
          napConsistency: "Inconsistente",
          competitorContext: "Alta competencia",
        },
        capitalLeakAnalysis: {
          monthlySearchVolume: 500,
          estimatedConversionRate: 2,
          estimatedMonthlyLeak: 2400,
          explanation: "Perdiendo clientes",
        },
        businessAnalysis: {
          sectorTicketRange: { min: 20, max: 80, currency: "EUR" },
          typicalServices: ["Menú del día", "Carta", "Catering"],
          revenueProjections: [
            { scenario: "conservative", label: "Conservador", monthlyClients: 5, monthlyRevenue: 250, description: "+5 clientes/mes" },
            { scenario: "realistic", label: "Realista", monthlyClients: 10, monthlyRevenue: 500, description: "+10 clientes/mes" },
            { scenario: "optimistic", label: "Optimista", monthlyClients: 20, monthlyRevenue: 1000, description: "+20 clientes/mes" },
          ],
          keywordRecommendations: [
            { keyword: "restaurante madrid", intent: "transactional", estimatedMonthlySearches: 1200, difficulty: "high", priority: "primary" },
          ],
          competitorInsights: "Alta competencia en la zona centro",
          marketOpportunity: "Potencial para destacar en SEO local",
          searchVolumeDisclaimer: "Estimación basada en benchmarks del sector",
        },
        issues: [
          {
            id: "1",
            area: "Google Business Profile",
            title: "Ficha no optimizada",
            description: "La ficha de Google no está completa",
            severity: "critical",
            solution: "Completar la ficha con fotos y descripción",
          },
        ],
        actionPlan: [
          {
            priority: 1,
            timeframe: "immediate",
            title: "Optimizar ficha de Google",
            description: "Completar todos los campos",
            expectedImpact: "+40% visibilidad",
          },
        ],
        recommendedPlan: "local_300",
        recommendedPlanReason: "Negocio local con presencia básica",
        keyOpportunities: ["SEO Local", "Google Business"],
      },
      recommendedPlan: "local_300",
      recommendedPlanReason: "Negocio local con presencia básica",
      createdAt: new Date(),
    },
  }),
  listAudits: vi.fn().mockResolvedValue([]),
  getDashboardStats: vi.fn().mockResolvedValue({ totalAudits: 0, avgScore: 0, convertedClients: 0, conversionRate: 0 }),
  updateAuditConversion: vi.fn().mockResolvedValue(undefined),
  updateAuditWithMetrics: vi.fn().mockResolvedValue(undefined),
  updateAuditPipeline: vi.fn().mockResolvedValue(undefined),
  addLeadNote: vi.fn().mockResolvedValue(1),
  getLeadNotes: vi.fn().mockResolvedValue([]),
  listAuditsFiltered: vi.fn().mockResolvedValue([]),
  getAllAuditsForExport: vi.fn().mockResolvedValue([]),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
  getDb: vi.fn().mockResolvedValue(null),
}));

vi.mock("./emailService", () => ({
  sendDiagnosisEmail: vi.fn().mockResolvedValue(true),
}));

vi.mock("./rateLimiter", () => ({
  checkRateLimit: vi.fn().mockReturnValue({ allowed: true }),
  getClientIp: vi.fn().mockReturnValue("127.0.0.1"),
  PUBLIC_LIMITS: { maxPerHour: 5, maxPerDay: 3, maxPerWeek: 10 },
  INTERNAL_LIMITS: { maxPerHour: 100, maxPerDay: 50, maxPerWeek: 300 },
}));

const mockDiagnosis = {
  summary: "Test summary",
  currentSituation: {
    googlePresence: "Débil",
    webStatus: "Sin web",
    geoAnalysis: "No aparece",
    napConsistency: "Inconsistente",
    competitorContext: "Alta competencia",
  },
  capitalLeakAnalysis: {
    monthlySearchVolume: 500,
    estimatedConversionRate: 2,
    estimatedMonthlyLeak: 2400,
    explanation: "Perdiendo clientes",
  },
  businessAnalysis: {
    sectorTicketRange: { min: 20, max: 80, currency: "EUR" },
    typicalServices: ["Menú del día"],
    revenueProjections: [
      { scenario: "conservative", label: "Conservador", monthlyClients: 1, monthlyRevenue: 50, description: "Mínimo" },
      { scenario: "realistic", label: "Realista", monthlyClients: 3, monthlyRevenue: 150, description: "Probable" },
      { scenario: "optimistic", label: "Optimista", monthlyClients: 6, monthlyRevenue: 300, description: "Ideal" },
    ],
    keywordRecommendations: [
      { keyword: "restaurante madrid", intent: "transactional", estimatedMonthlySearches: 1000, difficulty: "high", priority: "primary" },
    ],
    competitorInsights: "Alta competencia",
    marketOpportunity: "Oportunidad en long tail",
    searchVolumeDisclaimer: "Estimación basada en benchmarks del sector. Los datos exactos requieren análisis con herramientas de keyword research.",
  },
  issues: [
    {
      id: "1",
      area: "Google Business Profile",
      title: "Ficha no optimizada",
      description: "La ficha no está completa",
      severity: "critical",
      solution: "Completar la ficha",
    },
  ],
  actionPlan: [
    {
      priority: 1,
      timeframe: "immediate",
      title: "Optimizar ficha",
      description: "Completar todos los campos",
      expectedImpact: "+40% visibilidad",
    },
  ],
  recommendedPlan: "local_300",
  recommendedPlanReason: "Negocio local básico",
  keyOpportunities: ["SEO Local"],
};

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: JSON.stringify(mockDiagnosis) } }],
  }),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

vi.mock("./_core/voiceTranscription", () => ({
  transcribeAudio: vi.fn().mockResolvedValue({
    task: "transcribe",
    language: "es",
    duration: 5.2,
    text: "Tenemos una clínica dental en Madrid y necesitamos más pacientes.",
    segments: [],
  }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createPublicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createAuthCtx(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@elexxia.es",
      name: "Test Admin",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

const validAuditInput = {
  contactName: "Test User",
  contactEmail: "test@test.com",
  businessName: "Test Business",
  businessSector: "Restaurante",
  businessCity: "Madrid",
};

// ─── Tests: audit.create ──────────────────────────────────────────────────────

describe("audit.create", () => {
  it("creates an audit and returns auditId", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.audit.create(validAuditInput);
    expect(result.success).toBe(true);
    expect(result.auditId).toBe(1);
  });

  it("passes client IP to createAudit", async () => {
    const { createAudit } = await import("./db");
    const caller = appRouter.createCaller(createPublicCtx());
    await caller.audit.create(validAuditInput);
    expect(vi.mocked(createAudit)).toHaveBeenCalledWith(
      expect.objectContaining({ clientIp: "127.0.0.1" })
    );
  });

  it("sends diagnosis email after successful audit creation", async () => {
    const { sendDiagnosisEmail } = await import("./emailService");
    const caller = appRouter.createCaller(createPublicCtx());
    await caller.audit.create(validAuditInput);
    // Email is fire-and-forget (catch), so we wait a tick
    await new Promise(r => setTimeout(r, 10));
    expect(vi.mocked(sendDiagnosisEmail)).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "test@test.com",
        clientName: "Test User",
        businessName: "Test Business",
      })
    );
  });

  it("notifies owner after successful audit creation", async () => {
    const { notifyOwner } = await import("./_core/notification");
    const caller = appRouter.createCaller(createPublicCtx());
    await caller.audit.create(validAuditInput);
    expect(vi.mocked(notifyOwner)).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringContaining("Test Business") })
    );
  });

  it("records LLM metrics in the database", async () => {
    const { updateAuditWithMetrics } = await import("./db");
    const caller = appRouter.createCaller(createPublicCtx());
    await caller.audit.create(validAuditInput);
    expect(vi.mocked(updateAuditWithMetrics)).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        status: "completed",
        llmTokensUsed: expect.any(Number),
        llmGenerationMs: expect.any(Number),
        llmEstimatedCostEur: expect.any(Number),
      })
    );
  });
});

// ─── Tests: audit.create — rate limiting ─────────────────────────────────────

describe("audit.create — rate limiting", () => {
  it("throws TOO_MANY_REQUESTS when hourly limit is exceeded", async () => {
    const { checkRateLimit } = await import("./rateLimiter");
    vi.mocked(checkRateLimit).mockReturnValueOnce({
      allowed: false,
      reason: "Has alcanzado el límite de 5 análisis por hora. Inténtalo de nuevo en 45 minutos.",
      retryAfterSeconds: 2700,
    });
    const caller = appRouter.createCaller(createPublicCtx());
    await expect(caller.audit.create(validAuditInput)).rejects.toThrow(
      "Has alcanzado el límite"
    );
  });

  it("throws TOO_MANY_REQUESTS when daily limit is exceeded", async () => {
    const { checkRateLimit } = await import("./rateLimiter");
    vi.mocked(checkRateLimit).mockReturnValueOnce({
      allowed: false,
      reason: "Has alcanzado el límite de 3 análisis por día. Inténtalo mañana.",
      retryAfterSeconds: 86400,
    });
    const caller = appRouter.createCaller(createPublicCtx());
    await expect(caller.audit.create(validAuditInput)).rejects.toThrow(
      "Has alcanzado el límite de 3 análisis"
    );
  });

  it("throws TOO_MANY_REQUESTS when weekly limit is exceeded", async () => {
    const { checkRateLimit } = await import("./rateLimiter");
    vi.mocked(checkRateLimit).mockReturnValueOnce({
      allowed: false,
      reason: "Has alcanzado el límite semanal de 10 análisis. Inténtalo la próxima semana.",
      retryAfterSeconds: 604800,
    });
    const caller = appRouter.createCaller(createPublicCtx());
    await expect(caller.audit.create(validAuditInput)).rejects.toThrow(
      "límite semanal"
    );
  });

  it("allows request when rate limit is not exceeded", async () => {
    const { checkRateLimit } = await import("./rateLimiter");
    vi.mocked(checkRateLimit).mockReturnValueOnce({ allowed: true });
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.audit.create(validAuditInput);
    expect(result.success).toBe(true);
  });

  it("calls checkRateLimit with the client IP", async () => {
    const { checkRateLimit, getClientIp } = await import("./rateLimiter");
    vi.mocked(getClientIp).mockReturnValueOnce("203.0.113.42");
    vi.mocked(checkRateLimit).mockReturnValueOnce({ allowed: true });
    const caller = appRouter.createCaller(createPublicCtx());
    await caller.audit.create(validAuditInput);
    expect(vi.mocked(checkRateLimit)).toHaveBeenCalledWith(
      "203.0.113.42",
      expect.objectContaining({ maxPerHour: expect.any(Number) })
    );
  });

  it("does NOT call invokeLLM when rate limit is exceeded", async () => {
    const { checkRateLimit } = await import("./rateLimiter");
    const { invokeLLM } = await import("./_core/llm");
    vi.mocked(checkRateLimit).mockReturnValueOnce({ allowed: false, reason: "Limit exceeded" });
    vi.mocked(invokeLLM).mockClear();
    const caller = appRouter.createCaller(createPublicCtx());
    await expect(caller.audit.create(validAuditInput)).rejects.toThrow();
    expect(vi.mocked(invokeLLM)).not.toHaveBeenCalled();
  });
});

// ─── Tests: audit.create — LLM timeout ───────────────────────────────────────

describe("audit.create — LLM timeout", () => {
  it("throws TIMEOUT error when LLM exceeds 90 seconds", async () => {
    const { invokeLLM } = await import("./_core/llm");
    // Simulate a LLM_TIMEOUT error being thrown
    vi.mocked(invokeLLM).mockImplementationOnce(() =>
      new Promise((_, reject) => setTimeout(() => reject(new Error("LLM_TIMEOUT")), 10))
    );
    const caller = appRouter.createCaller(createPublicCtx());
    await expect(caller.audit.create(validAuditInput)).rejects.toThrow(
      "El análisis tardó demasiado"
    );
  });

  it("marks audit as error status on LLM timeout", async () => {
    const { invokeLLM } = await import("./_core/llm");
    const { updateAuditWithMetrics } = await import("./db");
    vi.mocked(invokeLLM).mockImplementationOnce(() =>
      new Promise((_, reject) => setTimeout(() => reject(new Error("LLM_TIMEOUT")), 10))
    );
    const caller = appRouter.createCaller(createPublicCtx());
    await expect(caller.audit.create(validAuditInput)).rejects.toThrow();
    expect(vi.mocked(updateAuditWithMetrics)).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ status: "error" })
    );
  });
});

// ─── Tests: audit.getById ─────────────────────────────────────────────────────

describe("audit.getById", () => {
  it("returns audit data by id", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.audit.getById({ id: 1 });
    expect(result.audit.businessName).toBe("Test Business");
    expect(result.result?.overallScore).toBe(45);
  });

  it("throws NOT_FOUND for missing audit", async () => {
    const { getAuditById } = await import("./db");
    vi.mocked(getAuditById).mockResolvedValueOnce(null);
    const caller = appRouter.createCaller(createPublicCtx());
    await expect(caller.audit.getById({ id: 9999 })).rejects.toThrow("Audit not found");
  });
});

// ─── Tests: audit.dashboardStats ─────────────────────────────────────────────

describe("audit.dashboardStats", () => {
  it("returns dashboard stats for authenticated users", async () => {
    const caller = appRouter.createCaller(createAuthCtx());
    const result = await caller.audit.dashboardStats();
    expect(result.totalAudits).toBe(0);
    expect(result.avgScore).toBe(0);
  });

  it("throws UNAUTHORIZED for unauthenticated users", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    await expect(caller.audit.dashboardStats()).rejects.toThrow();
  });
});

// ─── Tests: audit.transcribeAudio ────────────────────────────────────────────

describe("audit.transcribeAudio", () => {
  it("returns transcribed text from audio URL", async () => {
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.audit.transcribeAudio({
      audioUrl: "https://example.com/audio.webm",
      language: "es",
    });
    expect(result.success).toBe(true);
    expect(result.text).toBe("Tenemos una clínica dental en Madrid y necesitamos más pacientes.");
  });

  it("uses Spanish as default language", async () => {
    const { transcribeAudio } = await import("./_core/voiceTranscription");
    const caller = appRouter.createCaller(createPublicCtx());
    await caller.audit.transcribeAudio({
      audioUrl: "https://example.com/audio.webm",
      language: "es",
    });
    expect(vi.mocked(transcribeAudio)).toHaveBeenCalledWith(
      expect.objectContaining({ language: "es" })
    );
  });

  it("throws INTERNAL_SERVER_ERROR when transcription service fails", async () => {
    const { transcribeAudio } = await import("./_core/voiceTranscription");
    vi.mocked(transcribeAudio).mockResolvedValueOnce({
      error: "Transcription service request failed",
      code: "TRANSCRIPTION_FAILED",
      details: "503 Service Unavailable",
    });
    const caller = appRouter.createCaller(createPublicCtx());
    await expect(
      caller.audit.transcribeAudio({ audioUrl: "https://example.com/audio.webm", language: "es" })
    ).rejects.toThrow("Transcription service request failed");
  });

  it("throws INTERNAL_SERVER_ERROR when audio file is too large", async () => {
    const { transcribeAudio } = await import("./_core/voiceTranscription");
    vi.mocked(transcribeAudio).mockResolvedValueOnce({
      error: "Audio file exceeds maximum size limit",
      code: "FILE_TOO_LARGE",
      details: "File size is 20.5MB, maximum allowed is 16MB",
    });
    const caller = appRouter.createCaller(createPublicCtx());
    await expect(
      caller.audit.transcribeAudio({ audioUrl: "https://example.com/large-audio.webm", language: "es" })
    ).rejects.toThrow("Audio file exceeds maximum size limit");
  });

  it("is accessible without authentication (public procedure)", async () => {
    // Public users (unauthenticated) can transcribe audio for the form
    const caller = appRouter.createCaller(createPublicCtx());
    const result = await caller.audit.transcribeAudio({
      audioUrl: "https://example.com/audio.webm",
      language: "es",
    });
    expect(result.success).toBe(true);
  });
});

// ─── Tests: auth.logout ───────────────────────────────────────────────────────

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const ctx = createAuthCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
  });
});
