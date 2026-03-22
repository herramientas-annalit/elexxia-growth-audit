import { eq, desc, count, avg, like, and, SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, audits, auditResults, leadNotes, InsertAudit, InsertAuditResult, InsertLeadNote } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Audit queries
export async function createAudit(data: InsertAudit) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(audits).values(data);
  return result[0].insertId as number;
}

export async function updateAuditStatus(id: number, status: "pending" | "analyzing" | "completed" | "error") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(audits).set({ status }).where(eq(audits.id, id));
}

export async function createAuditResult(data: InsertAuditResult) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(auditResults).values(data);
  return result[0].insertId as number;
}

export async function getAuditById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const auditRows = await db.select().from(audits).where(eq(audits.id, id)).limit(1);
  if (auditRows.length === 0) return null;
  const resultRows = await db.select().from(auditResults).where(eq(auditResults.auditId, id)).limit(1);
  return { audit: auditRows[0], result: resultRows[0] || null };
}

export async function listAudits(limit = 50, offset = 0) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .select({
      audit: audits,
      result: auditResults,
    })
    .from(audits)
    .leftJoin(auditResults, eq(audits.id, auditResults.auditId))
    .orderBy(desc(audits.createdAt))
    .limit(limit)
    .offset(offset);
  return rows;
}

export async function getDashboardStats() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const totalRows = await db.select({ count: count() }).from(audits);
  const avgScoreRows = await db.select({ avg: avg(auditResults.overallScore) }).from(auditResults);
  const convertedRows = await db.select({ count: count() }).from(audits).where(eq(audits.convertedToClient, "yes"));
  return {
    totalAudits: totalRows[0]?.count ?? 0,
    avgScore: Math.round(Number(avgScoreRows[0]?.avg ?? 0)),
    convertedClients: convertedRows[0]?.count ?? 0,
  };
}

export async function updateAuditConversion(id: number, converted: "yes" | "no" | "in_progress", plan?: "local_300" | "acceleration_500" | "domination_1000") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(audits).set({ convertedToClient: converted, ...(plan ? { assignedPlan: plan } : {}) }).where(eq(audits.id, id));
}

// v2: Actualizar pipeline stage y campos de seguimiento
export async function updateAuditPipeline(
  id: number,
  data: {
    pipelineStage?: "new" | "contacted" | "proposal_sent" | "negotiation" | "closed_won" | "closed_lost";
    nextFollowUpAt?: Date | null;
    assignedTo?: string | null;
    dealValue?: number | null;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(audits).set(data).where(eq(audits.id, id));
}

// v2: Añadir nota a un lead
export async function addLeadNote(data: InsertLeadNote) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(leadNotes).values(data);
  return result[0].insertId as number;
}

// v2: Obtener notas de un lead
export async function getLeadNotes(auditId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(leadNotes).where(eq(leadNotes.auditId, auditId)).orderBy(desc(leadNotes.createdAt));
}

// v2: Listar auditorías con filtros
export async function listAuditsFiltered(opts: {
  limit?: number;
  offset?: number;
  sector?: string;
  city?: string;
  pipelineStage?: string;
  recommendedPlan?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions: SQL[] = [];
  if (opts.sector) conditions.push(like(audits.businessSector, `%${opts.sector}%`));
  if (opts.city) conditions.push(like(audits.businessCity, `%${opts.city}%`));
  if (opts.pipelineStage) conditions.push(eq(audits.pipelineStage, opts.pipelineStage as any));
  if (opts.recommendedPlan) conditions.push(eq(auditResults.recommendedPlan, opts.recommendedPlan as any));
  const query = db
    .select({ audit: audits, result: auditResults })
    .from(audits)
    .leftJoin(auditResults, eq(audits.id, auditResults.auditId))
    .orderBy(desc(audits.createdAt))
    .limit(opts.limit ?? 50)
    .offset(opts.offset ?? 0);
  if (conditions.length > 0) {
    return query.where(and(...conditions));
  }
  return query;
}

// v2: Obtener todos los leads para exportación CSV (sin paginación)
export async function getAllAuditsForExport() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select({ audit: audits, result: auditResults })
    .from(audits)
    .leftJoin(auditResults, eq(audits.id, auditResults.auditId))
    .orderBy(desc(audits.createdAt));
}

// v2: Actualizar auditoría con métricas de coste LLM y estado final
export async function updateAuditWithMetrics(
  id: number,
  data: {
    status: "pending" | "analyzing" | "completed" | "error";
    llmTokensUsed?: number;
    llmEstimatedCostEur?: number;
    llmGenerationMs?: number;
    generationError?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(audits).set({
    status: data.status,
    ...(data.llmTokensUsed !== undefined ? { llmTokensUsed: data.llmTokensUsed } : {}),
    ...(data.llmEstimatedCostEur !== undefined ? { llmEstimatedCostEur: data.llmEstimatedCostEur } : {}),
    ...(data.llmGenerationMs !== undefined ? { llmGenerationMs: data.llmGenerationMs } : {}),
    ...(data.generationError !== undefined ? { generationError: data.generationError } : {}),
  }).where(eq(audits.id, id));
}
