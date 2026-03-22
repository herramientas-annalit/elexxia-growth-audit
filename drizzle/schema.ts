import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, float } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const audits = mysqlTable("audits", {
  id: int("id").autoincrement().primaryKey(),
  // Contact info
  contactName: varchar("contactName", { length: 255 }).notNull(),
  contactEmail: varchar("contactEmail", { length: 320 }).notNull(),
  contactPhone: varchar("contactPhone", { length: 50 }),
  // Business info
  businessName: varchar("businessName", { length: 255 }).notNull(),
  businessSector: varchar("businessSector", { length: 255 }).notNull(),
  businessCity: varchar("businessCity", { length: 255 }).notNull(),
  websiteUrl: varchar("websiteUrl", { length: 500 }),
  googleMapsUrl: varchar("googleMapsUrl", { length: 500 }),
  // Commercial data
  averageTicket: float("averageTicket"),
  profitMargin: float("profitMargin"),
  monthlyNewClients: int("monthlyNewClients"),
  hasCommercialTeam: mysqlEnum("hasCommercialTeam", ["yes", "no", "partial"]),
  previousMarketingInvestment: mysqlEnum("previousMarketingInvestment", ["none", "less_500", "500_1000", "more_1000"]),
  mainBottleneck: mysqlEnum("mainBottleneck", ["not_known", "known_not_buying", "high_acquisition_cost"]),
  // Optional inputs
  callTranscript: text("callTranscript"),
  additionalNotes: text("additionalNotes"),
  // Status
  status: mysqlEnum("status", ["pending", "analyzing", "completed", "error"]).default("pending").notNull(),
  // Conversion tracking
  convertedToClient: mysqlEnum("convertedToClient", ["yes", "no", "in_progress"]).default("no"),
  assignedPlan: mysqlEnum("assignedPlan", ["local_300", "acceleration_500", "domination_1000"]),
  // Pipeline CRM
  pipelineStage: mysqlEnum("pipelineStage", ["new", "contacted", "proposal_sent", "negotiation", "closed_won", "closed_lost"]).default("new"),
  nextFollowUpAt: timestamp("nextFollowUpAt"),
  assignedTo: varchar("assignedTo", { length: 255 }),
  dealValue: float("dealValue"),
  // Security & tracking (v2)
  clientIp: varchar("clientIp", { length: 64 }),
  // LLM metrics (v2)
  llmTokensUsed: int("llmTokensUsed"),
  llmEstimatedCostEur: float("llmEstimatedCostEur"),
  llmGenerationMs: int("llmGenerationMs"),
  generationError: text("generationError"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Audit = typeof audits.$inferSelect;
export type InsertAudit = typeof audits.$inferInsert;

export const auditResults = mysqlTable("audit_results", {
  id: int("id").autoincrement().primaryKey(),
  auditId: int("auditId").notNull(),
  // Overall score
  overallScore: int("overallScore").notNull(),
  // Subscores
  googlePresenceScore: int("googlePresenceScore"),
  webConversionScore: int("webConversionScore"),
  geoScore: int("geoScore"),
  napConsistencyScore: int("napConsistencyScore"),
  // Capital leak estimation
  estimatedMonthlyLeak: float("estimatedMonthlyLeak"),
  // Full diagnosis JSON
  diagnosis: json("diagnosis").$type<AudiDiagnosis>().notNull(),
  // Recommended plan
  recommendedPlan: mysqlEnum("recommendedPlan", ["local_300", "acceleration_500", "domination_1000"]).notNull(),
  recommendedPlanReason: text("recommendedPlanReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditResult = typeof auditResults.$inferSelect;
export type InsertAuditResult = typeof auditResults.$inferInsert;

// Tabla de notas por lead (historial de interacciones del equipo comercial)
export const leadNotes = mysqlTable("lead_notes", {
  id: int("id").autoincrement().primaryKey(),
  auditId: int("auditId").notNull(),
  authorName: varchar("authorName", { length: 255 }).notNull(),
  content: text("content").notNull(),
  noteType: mysqlEnum("noteType", ["call", "email", "whatsapp", "meeting", "internal"]).default("internal"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LeadNote = typeof leadNotes.$inferSelect;
export type InsertLeadNote = typeof leadNotes.$inferInsert;

// TypeScript types for the JSON diagnosis field
export type IssueSeverity = "critical" | "high" | "medium" | "low";

export interface AuditIssue {
  id: string;
  area: string;
  title: string;
  description: string;
  severity: IssueSeverity;
  solution: string;
}

export interface ActionItem {
  priority: number;
  timeframe: "immediate" | "week_1" | "month_1";
  title: string;
  description: string;
  expectedImpact: string;
}

export interface KeywordRecommendation {
  keyword: string;
  intent: "transactional" | "informational" | "navigational";
  estimatedMonthlySearches: number;
  difficulty: "low" | "medium" | "high";
  priority: "primary" | "secondary";
}

export interface RevenueProjection {
  scenario: "conservative" | "realistic" | "optimistic";
  label: string;
  monthlyClients: number;
  monthlyRevenue: number;
  description: string;
}

export interface BusinessAnalysis {
  sectorTicketRange: { min: number; max: number; currency: string };
  typicalServices: string[];
  revenueProjections: RevenueProjection[];
  keywordRecommendations: KeywordRecommendation[];
  competitorInsights: string;
  marketOpportunity: string;
  searchVolumeDisclaimer: string;
}

export interface AudiDiagnosis {
  summary: string;
  currentSituation: {
    googlePresence: string;
    webStatus: string;
    geoAnalysis: string;
    napConsistency: string;
    competitorContext: string;
  };
  capitalLeakAnalysis: {
    monthlySearchVolume: number;
    estimatedConversionRate: number;
    estimatedMonthlyLeak: number;
    explanation: string;
  };
  businessAnalysis: BusinessAnalysis;
  issues: AuditIssue[];
  actionPlan: ActionItem[];
  recommendedPlan: "local_300" | "acceleration_500" | "domination_1000";
  recommendedPlanReason: string;
  keyOpportunities: string[];
}
