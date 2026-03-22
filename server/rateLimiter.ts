/**
 * Rate Limiter por IP — sin dependencias externas
 * Protege el endpoint audit.create contra abuso de créditos LLM
 *
 * Límites para modo público:
 *   - 3 auditorías por IP por día (24h)
 *   - 10 auditorías por IP por semana (7 días)
 *   - 5 auditorías por IP por hora
 */

interface IpRecord {
  hourly: { count: number; resetAt: number };
  daily: { count: number; resetAt: number };
  weekly: { count: number; resetAt: number };
}

const store = new Map<string, IpRecord>();

// Limpiar entradas expiradas cada 15 minutos para evitar memory leaks
setInterval(() => {
  const now = Date.now();
  Array.from(store.entries()).forEach(([ip, record]) => {
    if (
      record.hourly.resetAt < now &&
      record.daily.resetAt < now &&
      record.weekly.resetAt < now
    ) {
      store.delete(ip);
    }
  });
}, 15 * 60 * 1000);

export interface RateLimitConfig {
  maxPerHour: number;
  maxPerDay: number;
  maxPerWeek: number;
}

export const PUBLIC_LIMITS: RateLimitConfig = {
  maxPerHour: 5,
  maxPerDay: 3,
  maxPerWeek: 10,
};

export const INTERNAL_LIMITS: RateLimitConfig = {
  maxPerHour: 100,
  maxPerDay: 50,
  maxPerWeek: 300,
};

export function checkRateLimit(
  ip: string,
  config: RateLimitConfig = PUBLIC_LIMITS
): { allowed: boolean; reason?: string; retryAfterSeconds?: number } {
  const now = Date.now();
  const HOUR = 60 * 60 * 1000;
  const DAY = 24 * HOUR;
  const WEEK = 7 * DAY;

  let record = store.get(ip);

  if (!record) {
    record = {
      hourly: { count: 0, resetAt: now + HOUR },
      daily: { count: 0, resetAt: now + DAY },
      weekly: { count: 0, resetAt: now + WEEK },
    };
    store.set(ip, record);
  }

  // Resetear contadores expirados
  if (record.hourly.resetAt < now) {
    record.hourly = { count: 0, resetAt: now + HOUR };
  }
  if (record.daily.resetAt < now) {
    record.daily = { count: 0, resetAt: now + DAY };
  }
  if (record.weekly.resetAt < now) {
    record.weekly = { count: 0, resetAt: now + WEEK };
  }

  // Verificar límites
  if (record.hourly.count >= config.maxPerHour) {
    return {
      allowed: false,
      reason: `Has alcanzado el límite de ${config.maxPerHour} análisis por hora. Inténtalo de nuevo en ${Math.ceil((record.hourly.resetAt - now) / 60000)} minutos.`,
      retryAfterSeconds: Math.ceil((record.hourly.resetAt - now) / 1000),
    };
  }

  if (record.daily.count >= config.maxPerDay) {
    return {
      allowed: false,
      reason: `Has alcanzado el límite de ${config.maxPerDay} análisis por día. Inténtalo mañana.`,
      retryAfterSeconds: Math.ceil((record.daily.resetAt - now) / 1000),
    };
  }

  if (record.weekly.count >= config.maxPerWeek) {
    return {
      allowed: false,
      reason: `Has alcanzado el límite semanal de ${config.maxPerWeek} análisis. Inténtalo la próxima semana.`,
      retryAfterSeconds: Math.ceil((record.weekly.resetAt - now) / 1000),
    };
  }

  // Incrementar contadores
  record.hourly.count++;
  record.daily.count++;
  record.weekly.count++;

  return { allowed: true };
}

export function getClientIp(req: { headers: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } }): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0];
    return ip.trim();
  }
  return req.socket?.remoteAddress ?? "unknown";
}
