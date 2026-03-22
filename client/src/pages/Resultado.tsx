import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, AlertTriangle, CheckCircle, XCircle, Info,
  TrendingDown, TrendingUp, Brain, Target, Zap, Download,
  MapPin, Globe, Star, Shield, BarChart3, Loader2,
  Clock, Lightbulb, Search, Building2, Phone, DollarSign,
  Key, Users, TrendingUp as TrendUp, ChevronRight, Info as InfoIcon
} from "lucide-react";
import type { AudiDiagnosis, AuditIssue, ActionItem, BusinessAnalysis, KeywordRecommendation, RevenueProjection } from "../../../drizzle/schema";

const SEVERITY_CONFIG = {
  critical: { label: "Crítico", color: "#FF3B3B", bg: "rgba(255,59,59,0.08)", border: "rgba(255,59,59,0.25)", icon: XCircle, order: 0 },
  high: { label: "Alto", color: "#FF8C00", bg: "rgba(255,140,0,0.08)", border: "rgba(255,140,0,0.25)", icon: AlertTriangle, order: 1 },
  medium: { label: "Medio", color: "#FFD700", bg: "rgba(255,215,0,0.06)", border: "rgba(255,215,0,0.2)", icon: Info, order: 2 },
  low: { label: "Bajo", color: "#00C851", bg: "rgba(0,200,81,0.06)", border: "rgba(0,200,81,0.2)", icon: CheckCircle, order: 3 },
};

const TIMEFRAME_CONFIG = {
  immediate: { label: "Inmediato", color: "#FF3B3B", bg: "rgba(255,59,59,0.12)" },
  week_1: { label: "Semana 1", color: "#FF8C00", bg: "rgba(255,140,0,0.12)" },
  month_1: { label: "Mes 1", color: "#0066FF", bg: "rgba(0,102,255,0.12)" },
};

const PLAN_CONFIG = {
  local_300: {
    name: "Plan Visibilidad Local",
    price: "300€/mes",
    color: "#0066FF",
    gradient: "linear-gradient(135deg, #0066FF, #3385FF)",
    features: [
      "Web profesional incluida (gratis)",
      "Ficha Google Business Profile optimizada",
      "SEO Local completo + Schema Markup",
      "Citaciones NAP en 30+ directorios",
      "GEO básico (ChatGPT/Perplexity)",
      "Gestión y respuesta de reseñas",
      "Informe mensual de resultados",
    ],
  },
  acceleration_500: {
    name: "Plan Aceleración de Leads",
    price: "500€/mes",
    color: "#6B46C1",
    gradient: "linear-gradient(135deg, #6B46C1, #9B59B6)",
    features: [
      "Todo lo del Plan Visibilidad Local",
      "Google Ads Search gestionado",
      "Landing pages de conversión",
      "Extensiones de llamada y ubicación",
      "Optimización continua CPC/CPL",
      "Análisis de keywords competidores",
      "Reunión mensual de estrategia",
    ],
  },
  domination_1000: {
    name: "Plan Dominio de Mercado",
    price: "1.000€/mes",
    color: "#FF6B35",
    gradient: "linear-gradient(135deg, #FF6B35, #FF8C00)",
    features: [
      "Todo lo del Plan Aceleración",
      "Meta Ads (Facebook + Instagram)",
      "Estrategia omnicanal completa",
      "GEO avanzado para IA generativa",
      "Retargeting y audiencias personalizadas",
      "Analítica avanzada (ROAS/CPA/LTV)",
      "Responsable de cuenta dedicado",
    ],
  },
};

function ScoreGauge({ score, size = "lg" }: { score: number; size?: "sm" | "lg" }) {
  const color = score >= 70 ? "#00C851" : score >= 40 ? "#FFD700" : "#FF3B3B";
  const label = score >= 70 ? "Buena" : score >= 40 ? "Mejorable" : "Crítica";
  const r = size === "lg" ? 54 : 36;
  const dim = size === "lg" ? 120 : 80;
  const sw = size === "lg" ? 10 : 7;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className={`relative ${size === "lg" ? "w-36 h-36" : "w-20 h-20"}`}>
        <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${dim} ${dim}`}>
          <circle cx={dim / 2} cy={dim / 2} r={r} fill="none" stroke="#1A1A3A" strokeWidth={sw} />
          <circle
            cx={dim / 2} cy={dim / 2} r={r} fill="none"
            stroke={color} strokeWidth={sw}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${color}60)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-black text-white ${size === "lg" ? "text-4xl" : "text-xl"}`}
            style={{ fontFamily: "'Space Grotesk', sans-serif", color }}>{score}</span>
          <span className={`${size === "lg" ? "text-xs" : "text-[10px]"} text-gray-400`}>/100</span>
        </div>
      </div>
      {size === "lg" && <span className="text-sm font-medium mt-2" style={{ color }}>{label}</span>}
    </div>
  );
}

function SectionTitle({ icon: Icon, title, subtitle, color = "#0066FF" }: { icon: any; title: string; subtitle?: string; color?: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <h2 className="text-xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h2>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: "#8888AA" }}>{subtitle}</p>}
      </div>
    </div>
  );
}

export default function Resultado() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const { data: audit, isLoading, error } = trpc.audit.getById.useQuery(
    { id: Number(id) },
    {
      enabled: !!id,
      refetchInterval: (data) => {
        if (!data) return 3000;
        const s = (data as any)?.audit?.status;
        return (s === "pending" || s === "analyzing") ? 2000 : false;
      }
    }
  );

  const auditData = audit?.audit;
  const resultData = audit?.result;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#080818" }}>
        <div className="text-center">
          <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ background: "rgba(0,102,255,0.15)", border: "2px solid rgba(0,102,255,0.4)" }}>
            <Brain className="w-10 h-10 animate-pulse" style={{ color: "#3385FF" }} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Cargando diagnóstico...</h3>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#080818" }}>
        <div className="text-center p-8">
          <XCircle className="w-12 h-12 mx-auto mb-4" style={{ color: "#FF3B3B" }} />
          <h3 className="text-xl font-bold text-white mb-2">Error al cargar el diagnóstico</h3>
          <Button onClick={() => navigate("/")} style={{ background: "linear-gradient(135deg, #0066FF, #6B46C1)", border: "none" }}>
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  if (!auditData || auditData.status === "pending" || auditData.status === "analyzing") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#080818" }}>
        <div className="text-center p-10 rounded-2xl max-w-sm" style={{ background: "#0F0F24", border: "1px solid #1A1A3A" }}>
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full animate-ping" style={{ background: "rgba(0,102,255,0.2)" }} />
            <div className="relative w-full h-full rounded-full flex items-center justify-center" style={{ background: "rgba(0,102,255,0.15)", border: "2px solid rgba(0,102,255,0.4)" }}>
              <Brain className="w-9 h-9" style={{ color: "#3385FF" }} />
            </div>
          </div>
          <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Analizando tu negocio</h3>
          <p className="text-sm mb-4" style={{ color: "#8888AA" }}>La IA está generando tu diagnóstico personalizado...</p>
          <div className="space-y-2 text-left">
            {["Analizando presencia en Google...", "Evaluando visibilidad GEO...", "Calculando fuga de capital...", "Generando plan de acción..."].map((step, i) => (
              <div key={i} className="flex items-center gap-2 text-xs" style={{ color: "#6666AA" }}>
                <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" style={{ color: "#3385FF" }} />
                {step}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!resultData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#080818" }}>
        <div className="text-center p-8">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4" style={{ color: "#FF8C00" }} />
          <h3 className="text-xl font-bold text-white mb-2">Diagnóstico no disponible</h3>
          <p className="text-sm mb-4" style={{ color: "#8888AA" }}>Hubo un problema al generar el análisis. Por favor, inténtalo de nuevo.</p>
          <Button onClick={() => navigate("/")} style={{ background: "linear-gradient(135deg, #0066FF, #6B46C1)", border: "none" }}>
            Nueva auditoría
          </Button>
        </div>
      </div>
    );
  }

  const result = resultData as any;
  const diagnosis = result.diagnosis as AudiDiagnosis;
  const planConfig = PLAN_CONFIG[result.recommendedPlan as keyof typeof PLAN_CONFIG];

  // Sort issues by severity
  const sortedIssues = [...(diagnosis.issues || [])].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
  });

  const criticalCount = sortedIssues.filter(i => i.severity === "critical").length;
  const highCount = sortedIssues.filter(i => i.severity === "high").length;

  return (
    <div className="min-h-screen" style={{ background: "#080818" }}>
      {/* Header */}
      <header className="border-b sticky top-0 z-10" style={{ borderColor: "#1A1A3A", background: "rgba(8,8,24,0.95)", backdropFilter: "blur(12px)" }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm transition-colors hover:text-white" style={{ color: "#8888AA" }}>
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Inicio</span>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0066FF, #6B46C1)" }}>
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Diagnóstico Elexxia</span>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => window.print()}
            style={{ background: "rgba(0,102,255,0.12)", border: "1px solid rgba(0,102,255,0.3)", color: "#3385FF" }}
          >
            <Download className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Exportar PDF</span>
            <span className="sm:hidden">PDF</span>
          </Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

        {/* ── HERO: Puntuación + Resumen ── */}
        <div className="mb-8 p-6 sm:p-8 rounded-2xl" style={{ background: "linear-gradient(135deg, rgba(0,102,255,0.08), rgba(107,70,193,0.08))", border: "1px solid rgba(0,102,255,0.2)" }}>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
            <ScoreGauge score={result.overallScore} />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge style={{ background: "rgba(0,102,255,0.2)", color: "#3385FF", border: "1px solid rgba(0,102,255,0.3)" }}>
                  Diagnóstico Digital Completo
                </Badge>
                {criticalCount > 0 && (
                  <Badge style={{ background: "rgba(255,59,59,0.15)", color: "#FF3B3B", border: "1px solid rgba(255,59,59,0.3)" }}>
                    {criticalCount} problema{criticalCount > 1 ? "s" : ""} crítico{criticalCount > 1 ? "s" : ""}
                  </Badge>
                )}
                <span className="text-xs" style={{ color: "#6666AA" }}>{new Date(auditData.createdAt).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {auditData.businessName}
              </h1>
              <p className="text-sm mb-4" style={{ color: "#8888AA" }}>
                {auditData.businessSector} · {auditData.businessCity}
              </p>
              <p className="text-sm sm:text-base leading-relaxed" style={{ color: "#CCCCEE" }}>
                {diagnosis.summary}
              </p>
            </div>
          </div>
        </div>

        {/* ── SCORES: 4 dimensiones ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Ficha Google", score: result.googlePresenceScore, icon: MapPin, color: "#0066FF", desc: "Google Business Profile" },
            { label: "Presencia Web", score: result.webConversionScore, icon: Globe, color: "#6B46C1", desc: "Web y conversión" },
            { label: "Visibilidad GEO", score: result.geoScore, icon: Brain, color: "#00C851", desc: "ChatGPT / Perplexity" },
            { label: "Coherencia NAP", score: result.napConsistencyScore, icon: Shield, color: "#FFD700", desc: "Directorios y citas" },
          ].map((item) => {
            const Icon = item.icon;
            const s = item.score ?? 0;
            const scoreColor = s >= 70 ? "#00C851" : s >= 40 ? "#FFD700" : "#FF3B3B";
            return (
              <div key={item.label} className="p-4 rounded-xl text-center" style={{ background: "#0F0F24", border: "1px solid #1A1A3A" }}>
                <Icon className="w-5 h-5 mx-auto mb-2" style={{ color: item.color }} />
                <div className="text-2xl font-black mb-0.5" style={{ color: scoreColor, fontFamily: "'Space Grotesk', sans-serif" }}>{s}</div>
                <div className="text-xs font-medium text-white mb-0.5">{item.label}</div>
                <div className="text-[10px] mb-2" style={{ color: "#6666AA" }}>{item.desc}</div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#1A1A3A" }}>
                  <div className="h-full rounded-full" style={{ width: `${s}%`, background: scoreColor, boxShadow: `0 0 6px ${scoreColor}60` }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* ── FUGA DE CAPITAL ── */}
        {diagnosis.capitalLeakAnalysis && (
          <div className="mb-8 p-6 rounded-2xl" style={{ background: "rgba(255,59,59,0.05)", border: "1px solid rgba(255,59,59,0.2)" }}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,59,59,0.15)" }}>
                <TrendingDown className="w-6 h-6" style={{ color: "#FF3B3B" }} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Estimación de Fuga de Capital Mensual
                </h3>
                <div className="flex flex-wrap items-baseline gap-4 mb-3">
                  <span className="text-3xl sm:text-4xl font-black" style={{ color: "#FF3B3B", fontFamily: "'Space Grotesk', sans-serif" }}>
                    -{diagnosis.capitalLeakAnalysis.estimatedMonthlyLeak.toLocaleString("es-ES")}€/mes
                  </span>
                  <span className="text-sm" style={{ color: "#FF8C00" }}>
                    ≈ -{(diagnosis.capitalLeakAnalysis.estimatedMonthlyLeak * 12).toLocaleString("es-ES")}€/año
                  </span>
                </div>
                <p className="text-sm leading-relaxed mb-4" style={{ color: "#CCCCEE" }}>
                  {diagnosis.capitalLeakAnalysis.explanation}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg text-center" style={{ background: "rgba(255,59,59,0.08)", border: "1px solid rgba(255,59,59,0.15)" }}>
                    <div className="text-xl font-bold" style={{ color: "#FF8C00", fontFamily: "'Space Grotesk', sans-serif" }}>
                      {diagnosis.capitalLeakAnalysis.monthlySearchVolume.toLocaleString("es-ES")}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "#8888AA" }}>Búsquedas/mes en tu zona</div>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ background: "rgba(255,59,59,0.08)", border: "1px solid rgba(255,59,59,0.15)" }}>
                    <div className="text-xl font-bold" style={{ color: "#FF8C00", fontFamily: "'Space Grotesk', sans-serif" }}>
                      {diagnosis.capitalLeakAnalysis.estimatedConversionRate}%
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "#8888AA" }}>Tasa de conversión estimada</div>
                  </div>
                  <div className="p-3 rounded-lg text-center col-span-2 sm:col-span-1" style={{ background: "rgba(255,59,59,0.08)", border: "1px solid rgba(255,59,59,0.15)" }}>
                    <div className="text-xl font-bold" style={{ color: "#FF3B3B", fontFamily: "'Space Grotesk', sans-serif" }}>
                      {criticalCount + highCount}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "#8888AA" }}>Problemas críticos/altos</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ANÁLISIS DE NEGOCIO Y MERCADO ── */}
        {diagnosis.businessAnalysis && (
          <div className="mb-8">
            <SectionTitle icon={Building2} title="Análisis de Negocio y Mercado" subtitle="Métricas del sector y proyección de ingresos realista" color="#00C851" />
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              {/* Ticket medio del sector */}
              <div className="p-5 rounded-xl" style={{ background: "#0F0F24", border: "1px solid #1A1A3A" }}>
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-4 h-4" style={{ color: "#00C851" }} />
                  <span className="text-sm font-semibold text-white">Ticket Medio del Sector</span>
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-2xl font-black" style={{ color: "#00C851", fontFamily: "'Space Grotesk', sans-serif" }}>
                    {diagnosis.businessAnalysis.sectorTicketRange.min.toLocaleString("es-ES")}€ – {diagnosis.businessAnalysis.sectorTicketRange.max.toLocaleString("es-ES")}€
                  </span>
                </div>
                <p className="text-xs mb-3" style={{ color: "#6666AA" }}>Rango habitual en el sector para {auditData.businessSector}</p>
                {diagnosis.businessAnalysis.typicalServices && diagnosis.businessAnalysis.typicalServices.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold mb-2" style={{ color: "#8888AA" }}>Servicios típicos del sector:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {diagnosis.businessAnalysis.typicalServices.slice(0, 5).map((s: string, i: number) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(0,200,81,0.08)", color: "#00C851", border: "1px solid rgba(0,200,81,0.2)" }}>{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Proyección de ingresos */}
              <div className="p-5 rounded-xl" style={{ background: "#0F0F24", border: "1px solid #1A1A3A" }}>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4" style={{ color: "#0066FF" }} />
                  <span className="text-sm font-semibold text-white">Proyección de Ingresos</span>
                </div>
                <p className="text-xs mb-3" style={{ color: "#6666AA" }}>Clientes adicionales estimados con presencia digital optimizada</p>
                <div className="space-y-2">
                  {(diagnosis.businessAnalysis.revenueProjections || []).map((proj: RevenueProjection, i: number) => {
                    const colors = { conservative: "#6666AA", realistic: "#0066FF", optimistic: "#00C851" };
                    const labels = { conservative: "Conservador", realistic: "Realista", optimistic: "Optimista" };
                    const c = colors[proj.scenario] || "#6666AA";
                    return (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: `${c}10`, border: `1px solid ${c}25` }}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: c }} />
                          <span className="text-xs font-medium" style={{ color: c }}>{labels[proj.scenario] || proj.label}</span>
                          <span className="text-xs" style={{ color: "#6666AA" }}>· {proj.monthlyClients} cliente{proj.monthlyClients !== 1 ? "s" : ""}/mes</span>
                        </div>
                        <span className="text-sm font-bold" style={{ color: c }}>{proj.monthlyRevenue.toLocaleString("es-ES")}€/mes</span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs mt-3 leading-relaxed" style={{ color: "#555577" }}>
                  {(diagnosis.businessAnalysis.revenueProjections || [])[0]?.description}
                </p>
              </div>
            </div>

            {/* Keywords recomendadas */}
            {diagnosis.businessAnalysis.keywordRecommendations && diagnosis.businessAnalysis.keywordRecommendations.length > 0 && (
              <div className="p-5 rounded-xl mb-4" style={{ background: "#0F0F24", border: "1px solid #1A1A3A" }}>
                <div className="flex items-center gap-2 mb-4">
                  <Key className="w-4 h-4" style={{ color: "#FFD700" }} />
                  <span className="text-sm font-semibold text-white">Palabras Clave Recomendadas</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(255,215,0,0.1)", color: "#FFD700", border: "1px solid rgba(255,215,0,0.2)" }}>SEO Local</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ borderBottom: "1px solid #1A1A3A" }}>
                        <th className="text-left pb-2 pr-4 font-semibold" style={{ color: "#6666AA" }}>Keyword</th>
                        <th className="text-left pb-2 pr-4 font-semibold" style={{ color: "#6666AA" }}>Intención</th>
                        <th className="text-right pb-2 pr-4 font-semibold" style={{ color: "#6666AA" }}>Búsquedas/mes*</th>
                        <th className="text-right pb-2 font-semibold" style={{ color: "#6666AA" }}>Dificultad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diagnosis.businessAnalysis.keywordRecommendations.map((kw: KeywordRecommendation, i: number) => {
                        const intentColors: Record<string, string> = { transactional: "#00C851", informational: "#0066FF", navigational: "#FFD700" };
                        const intentLabels: Record<string, string> = { transactional: "Transaccional", informational: "Informacional", navigational: "Navegacional" };
                        const diffColors: Record<string, string> = { low: "#00C851", medium: "#FFD700", high: "#FF3B3B" };
                        const diffLabels: Record<string, string> = { low: "Baja", medium: "Media", high: "Alta" };
                        return (
                          <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                            <td className="py-2 pr-4">
                              <div className="flex items-center gap-1.5">
                                {kw.priority === "primary" && <Star className="w-3 h-3 flex-shrink-0" style={{ color: "#FFD700" }} />}
                                <span className="font-medium" style={{ color: kw.priority === "primary" ? "#FFFFFF" : "#AAAACC" }}>{kw.keyword}</span>
                              </div>
                            </td>
                            <td className="py-2 pr-4">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: `${intentColors[kw.intent] || "#6666AA"}15`, color: intentColors[kw.intent] || "#6666AA" }}>
                                {intentLabels[kw.intent] || kw.intent}
                              </span>
                            </td>
                            <td className="py-2 pr-4 text-right" style={{ color: "#AAAACC" }}>{kw.estimatedMonthlySearches.toLocaleString("es-ES")}</td>
                            <td className="py-2 text-right">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: `${diffColors[kw.difficulty] || "#6666AA"}15`, color: diffColors[kw.difficulty] || "#6666AA" }}>
                                {diffLabels[kw.difficulty] || kw.difficulty}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] mt-3 leading-relaxed" style={{ color: "#444466" }}>
                  * {diagnosis.businessAnalysis.searchVolumeDisclaimer || "Estimación basada en benchmarks del sector. Los datos exactos requieren análisis con herramientas de keyword research."}
                </p>
              </div>
            )}

            {/* Insights de competidores */}
            {diagnosis.businessAnalysis.competitorInsights && (
              <div className="p-5 rounded-xl" style={{ background: "rgba(255,107,53,0.05)", border: "1px solid rgba(255,107,53,0.15)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4" style={{ color: "#FF6B35" }} />
                  <span className="text-sm font-semibold text-white">Lo que hacen tus competidores</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "#AAAACC" }}>{diagnosis.businessAnalysis.competitorInsights}</p>
                {diagnosis.businessAnalysis.marketOpportunity && (
                  <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,107,53,0.1)" }}>
                    <div className="flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#FFD700" }} />
                      <p className="text-sm leading-relaxed" style={{ color: "#CCCCEE" }}>
                        <span className="font-semibold" style={{ color: "#FFD700" }}>Oportunidad de mercado: </span>
                        {diagnosis.businessAnalysis.marketOpportunity}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── SITUACIÓN ACTUAL: 5 dimensiones ── */}
        {diagnosis.currentSituation && (
          <div className="mb-8">
            <SectionTitle icon={BarChart3} title="Análisis de Situación Actual" subtitle="Diagnóstico detallado por dimensión digital" color="#6B46C1" />
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { key: "googlePresence", label: "Presencia en Google", icon: MapPin, color: "#0066FF", text: diagnosis.currentSituation.googlePresence },
                { key: "webStatus", label: "Estado de la Web", icon: Globe, color: "#6B46C1", text: diagnosis.currentSituation.webStatus },
                { key: "geoAnalysis", label: "Visibilidad GEO (IA Generativa)", icon: Brain, color: "#00C851", text: diagnosis.currentSituation.geoAnalysis },
                { key: "napConsistency", label: "Coherencia NAP y Directorios", icon: Shield, color: "#FFD700", text: diagnosis.currentSituation.napConsistency },
                { key: "competitorContext", label: "Contexto Competitivo", icon: Search, color: "#FF6B35", text: diagnosis.currentSituation.competitorContext },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.key} className={`p-5 rounded-xl ${item.key === "competitorContext" ? "md:col-span-2" : ""}`} style={{ background: "#0F0F24", border: "1px solid #1A1A3A" }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="w-4 h-4" style={{ color: item.color }} />
                      <span className="text-sm font-semibold text-white">{item.label}</span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "#AAAACC" }}>{item.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── PROBLEMAS DETECTADOS ── */}
        {sortedIssues.length > 0 && (
          <div className="mb-8">
            <SectionTitle
              icon={AlertTriangle}
              title="Problemas Detectados"
              subtitle={`${sortedIssues.length} problemas identificados — ${criticalCount} críticos, ${highCount} altos`}
              color="#FF3B3B"
            />
            <div className="space-y-3">
              {sortedIssues.map((issue: AuditIssue, i: number) => {
                const sev = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.medium;
                const Icon = sev.icon;
                return (
                  <div key={issue.id || i} className="p-5 rounded-xl" style={{ background: sev.bg, border: `1px solid ${sev.border}` }}>
                    <div className="flex items-start gap-3">
                      <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: sev.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-sm font-bold text-white">{issue.title}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: sev.bg, color: sev.color, border: `1px solid ${sev.border}` }}>
                            {sev.label}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)", color: "#8888AA", border: "1px solid rgba(255,255,255,0.08)" }}>
                            {issue.area}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed mb-3" style={{ color: "#CCCCEE" }}>{issue.description}</p>
                        <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: "rgba(0,102,255,0.06)", border: "1px solid rgba(0,102,255,0.15)" }}>
                          <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#3385FF" }} />
                          <p className="text-xs leading-relaxed" style={{ color: "#AAAACC" }}>
                            <span className="font-semibold" style={{ color: "#3385FF" }}>Solución: </span>
                            {issue.solution}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── PLAN DE ACCIÓN 30 DÍAS ── */}
        {diagnosis.actionPlan && diagnosis.actionPlan.length > 0 && (
          <div className="mb-8">
            <SectionTitle icon={Target} title="Plan de Acción — Primeros 30 días" subtitle="Acciones priorizadas para maximizar resultados" color="#0066FF" />
            <div className="space-y-3">
              {[...diagnosis.actionPlan].sort((a, b) => a.priority - b.priority).map((action: ActionItem, i: number) => {
                const tf = TIMEFRAME_CONFIG[action.timeframe] || TIMEFRAME_CONFIG.month_1;
                return (
                  <div key={i} className="p-5 rounded-xl flex items-start gap-4" style={{ background: "#0F0F24", border: "1px solid #1A1A3A" }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-black" style={{ background: "linear-gradient(135deg, #0066FF, #6B46C1)", color: "#fff" }}>
                      {action.priority}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-sm font-bold text-white">{action.title}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: tf.bg, color: tf.color }}>
                          <Clock className="w-3 h-3 inline mr-1" />
                          {tf.label}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed mb-2" style={{ color: "#AAAACC" }}>{action.description}</p>
                      {action.expectedImpact && (
                        <div className="flex items-center gap-1.5 text-xs" style={{ color: "#00C851" }}>
                          <TrendingUp className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>{action.expectedImpact}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── OPORTUNIDADES CLAVE ── */}
        {diagnosis.keyOpportunities && diagnosis.keyOpportunities.length > 0 && (
          <div className="mb-8">
            <SectionTitle icon={Lightbulb} title="Oportunidades Clave" subtitle="Ventajas competitivas que puedes aprovechar ahora" color="#FFD700" />
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              {diagnosis.keyOpportunities.map((opp: string, i: number) => (
                <div key={i} className="p-4 rounded-xl flex items-start gap-3" style={{ background: "rgba(255,215,0,0.05)", border: "1px solid rgba(255,215,0,0.15)" }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold" style={{ background: "rgba(255,215,0,0.2)", color: "#FFD700" }}>
                    {i + 1}
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "#CCCCEE" }}>{opp}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PLAN RECOMENDADO ── */}
        {planConfig && (
          <div className="mb-8 p-6 sm:p-8 rounded-2xl" style={{ background: `linear-gradient(135deg, ${planConfig.color}10, ${planConfig.color}06)`, border: `1px solid ${planConfig.color}30` }}>
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5" style={{ color: planConfig.color }} />
              <span className="text-sm font-semibold" style={{ color: planConfig.color }}>Plan Recomendado para {auditData.businessName}</span>
            </div>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex-1">
                <h3 className="text-2xl font-black text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{planConfig.name}</h3>
                <div className="text-3xl font-black mb-4" style={{ color: planConfig.color, fontFamily: "'Space Grotesk', sans-serif" }}>{planConfig.price}</div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {planConfig.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm" style={{ color: "#CCCCEE" }}>
                      <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: planConfig.color }} />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-3 w-full md:w-auto">
                <Button
                  className="font-semibold px-8 py-6 text-base w-full md:w-auto"
                  style={{ background: planConfig.gradient, border: "none", boxShadow: `0 0 25px ${planConfig.color}40` }}
                  onClick={() => window.open("https://seo.elexxia.es/", "_blank")}
                >
                  <Zap className="w-5 h-5 mr-2" />
                  Empezar ahora
                </Button>
                <p className="text-xs text-center" style={{ color: "#6666AA" }}>Sin permanencia el primer mes</p>
              </div>
            </div>
            {result.recommendedPlanReason && (
              <div className="mt-5 pt-5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-sm leading-relaxed" style={{ color: "#AAAACC" }}>
                  <span className="font-semibold text-white">¿Por qué este plan? </span>
                  {result.recommendedPlanReason}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── CTA FINAL ── */}
        <div className="text-center p-8 sm:p-10 rounded-2xl" style={{ background: "linear-gradient(135deg, rgba(0,102,255,0.08), rgba(107,70,193,0.08))", border: "1px solid rgba(0,102,255,0.2)" }}>
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0066FF, #6B46C1)" }}>
            <Phone className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-2xl font-black text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>¿Listo para implementar este plan?</h3>
          <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: "#8888AA" }}>
            Nuestro equipo de especialistas está listo para ejecutar cada una de estas acciones y convertir tu negocio en el referente local de tu sector.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              className="font-semibold px-8 py-5"
              style={{ background: "linear-gradient(135deg, #0066FF, #6B46C1)", border: "none", boxShadow: "0 0 25px rgba(0,102,255,0.35)" }}
              onClick={() => window.open("https://seo.elexxia.es/", "_blank")}
            >
              <Zap className="w-4 h-4 mr-2" />
              Hablar con un especialista
            </Button>
            <Button
              variant="outline"
              onClick={() => window.print()}
              className="py-5"
              style={{ borderColor: "#1A1A3A", color: "#8888AA", background: "transparent" }}
            >
              <Download className="w-4 h-4 mr-2" />
              Descargar informe PDF
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
