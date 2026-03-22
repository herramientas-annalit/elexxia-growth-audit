import { useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3, Users, TrendingUp, Zap, Eye,
  CheckCircle, Clock, AlertCircle, XCircle, Brain,
  Download, Filter, MessageSquare, Phone, Mail,
  Calendar, ChevronDown, X, RefreshCw
} from "lucide-react";
import { getLoginUrl } from "@/const";

// ─── Configuración de estados ────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending: { label: "Pendiente", color: "#FFD700", bg: "rgba(255,215,0,0.1)", icon: Clock },
  analyzing: { label: "Analizando", color: "#3385FF", bg: "rgba(0,102,255,0.1)", icon: Brain },
  completed: { label: "Completado", color: "#00C851", bg: "rgba(0,200,81,0.1)", icon: CheckCircle },
  error: { label: "Error", color: "#FF3B3B", bg: "rgba(255,59,59,0.1)", icon: XCircle },
};

const PIPELINE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: "Nuevo", color: "#8888AA", bg: "rgba(136,136,170,0.1)" },
  contacted: { label: "Contactado", color: "#3385FF", bg: "rgba(0,102,255,0.1)" },
  proposal_sent: { label: "Propuesta enviada", color: "#FFD700", bg: "rgba(255,215,0,0.1)" },
  negotiation: { label: "Negociación", color: "#FF8C00", bg: "rgba(255,140,0,0.1)" },
  closed_won: { label: "Cerrado ✓", color: "#00C851", bg: "rgba(0,200,81,0.1)" },
  closed_lost: { label: "Perdido", color: "#FF3B3B", bg: "rgba(255,59,59,0.1)" },
};

const PLAN_LABELS: Record<string, string> = {
  local_300: "Local 300€",
  acceleration_500: "Aceleración 500€",
  domination_1000: "Dominio 1.000€",
};

const NOTE_TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  call: { label: "Llamada", icon: Phone, color: "#00C851" },
  email: { label: "Email", icon: Mail, color: "#3385FF" },
  whatsapp: { label: "WhatsApp", icon: MessageSquare, color: "#25D366" },
  meeting: { label: "Reunión", icon: Calendar, color: "#FFD700" },
  internal: { label: "Nota interna", icon: Brain, color: "#8888AA" },
};

// ─── Función para exportar CSV ────────────────────────────────────────────────
function exportToCSV(data: any[]) {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(";"),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h] ?? "";
        const str = String(val).replace(/"/g, '""');
        return str.includes(";") || str.includes("\n") ? `"${str}"` : str;
      }).join(";")
    )
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `elexxia-leads-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Componente de notas por lead ─────────────────────────────────────────────
function LeadNotesPanel({ auditId, authorName, onClose }: { auditId: number; authorName: string; onClose: () => void }) {
  const [content, setContent] = useState("");
  const [noteType, setNoteType] = useState<"call" | "email" | "whatsapp" | "meeting" | "internal">("internal");
  const utils = trpc.useUtils();

  const { data: notes, isLoading } = trpc.audit.getNotes.useQuery({ auditId });
  const addNote = trpc.audit.addNote.useMutation({
    onSuccess: () => {
      setContent("");
      utils.audit.getNotes.invalidate({ auditId });
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-lg rounded-2xl p-6" style={{ background: "#0F0F24", border: "1px solid #1A1A3A", maxHeight: "80vh", overflowY: "auto" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Notas del lead #{auditId}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* Añadir nota */}
        <div className="mb-4 p-4 rounded-xl" style={{ background: "#080818", border: "1px solid #1A1A3A" }}>
          <div className="flex gap-2 mb-2">
            {(["call", "email", "whatsapp", "meeting", "internal"] as const).map(type => {
              const cfg = NOTE_TYPE_CONFIG[type];
              const Icon = cfg.icon;
              return (
                <button
                  key={type}
                  onClick={() => setNoteType(type)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all"
                  style={{
                    background: noteType === type ? `${cfg.color}20` : "transparent",
                    color: noteType === type ? cfg.color : "#8888AA",
                    border: `1px solid ${noteType === type ? cfg.color : "#1A1A3A"}`
                  }}
                >
                  <Icon className="w-3 h-3" />
                  {cfg.label}
                </button>
              );
            })}
          </div>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Escribe una nota..."
            rows={3}
            className="w-full text-sm text-white rounded-lg p-3 resize-none"
            style={{ background: "#1A1A3A", border: "1px solid #2A2A4A", outline: "none" }}
          />
          <Button
            onClick={() => addNote.mutate({ auditId, content, noteType, authorName })}
            disabled={!content.trim() || addNote.isPending}
            className="mt-2 w-full"
            style={{ background: "linear-gradient(135deg, #0066FF, #6B46C1)", border: "none" }}
          >
            {addNote.isPending ? "Guardando..." : "Añadir nota"}
          </Button>
        </div>

        {/* Lista de notas */}
        {isLoading ? (
          <p className="text-center text-sm" style={{ color: "#8888AA" }}>Cargando notas...</p>
        ) : !notes || notes.length === 0 ? (
          <p className="text-center text-sm" style={{ color: "#8888AA" }}>Sin notas aún. Añade la primera.</p>
        ) : (
          <div className="space-y-3">
            {(notes as any[]).map((note: any) => {
              const cfg = NOTE_TYPE_CONFIG[note.noteType] ?? NOTE_TYPE_CONFIG.internal;
              const Icon = cfg.icon;
              return (
                <div key={note.id} className="p-3 rounded-xl" style={{ background: "#080818", border: "1px solid #1A1A3A" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-3 h-3" style={{ color: cfg.color }} />
                    <span className="text-xs font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
                    <span className="text-xs" style={{ color: "#555570" }}>· {note.authorName} · {new Date(note.createdAt).toLocaleDateString("es-ES")}</span>
                  </div>
                  <p className="text-sm" style={{ color: "#CCCCDD" }}>{note.content}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Componente principal del Dashboard ──────────────────────────────────────
export default function Dashboard() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, loading } = useAuth();

  // Filtros
  const [filterSector, setFilterSector] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterPipeline, setFilterPipeline] = useState("");
  const [filterPlan, setFilterPlan] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Panel de notas
  const [notesAuditId, setNotesAuditId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const hasFilters = filterSector || filterCity || filterPipeline || filterPlan;

  const { data: stats } = trpc.audit.dashboardStats.useQuery(undefined, { enabled: isAuthenticated });
  const { data: auditsData, refetch } = trpc.audit.listFiltered.useQuery(
    {
      limit: 100,
      offset: 0,
      sector: filterSector || undefined,
      city: filterCity || undefined,
      pipelineStage: filterPipeline || undefined,
      recommendedPlan: filterPlan || undefined,
    },
    { enabled: isAuthenticated }
  );
  const { data: exportData } = trpc.audit.exportAll.useQuery(undefined, { enabled: isAuthenticated });

  const updatePipeline = trpc.audit.updatePipeline.useMutation({
    onSuccess: () => utils.audit.listFiltered.invalidate(),
  });

  const handlePipelineChange = useCallback((id: number, stage: string) => {
    updatePipeline.mutate({ id, pipelineStage: stage as any });
  }, [updatePipeline]);

  // ─── Guards de autenticación y rol ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#080818" }}>
        <Brain className="w-8 h-8 animate-pulse" style={{ color: "#3385FF" }} />
      </div>
    );
  }

  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const loginInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginPassword }),
      });
      if (!res.ok) {
        setLoginError("Contraseña incorrecta");
        setLoginLoading(false);
        return;
      }
      await utils.auth.me.invalidate();
      window.location.reload();
    } catch {
      setLoginError("Error de conexión. Inténtalo de nuevo.");
      setLoginLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#080818" }}>
        <div className="w-full max-w-sm p-10 rounded-2xl" style={{ background: "#0F0F24", border: "1px solid #1A1A3A" }}>
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center elexxia-gradient">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Acceso al Dashboard</h3>
            <p className="text-sm" style={{ color: "#8888AA" }}>Solo para el equipo de Elexxia.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                ref={loginInputRef}
                type="password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                placeholder="Contraseña de acceso"
                autoFocus
                className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none"
                style={{ background: "#080818", border: "1px solid #1A1A3A", color: "#F0F0FF" }}
              />
              {loginError && <p className="text-xs mt-2" style={{ color: "#FF3B3B" }}>{loginError}</p>}
            </div>
            <Button
              type="submit"
              disabled={loginLoading || !loginPassword}
              className="w-full"
              style={{ background: "linear-gradient(135deg, #0066FF, #6B46C1)", border: "none" }}
            >
              {loginLoading ? "Entrando..." : "Entrar →"}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if ((user as any)?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#080818" }}>
        <div className="text-center p-10 rounded-2xl max-w-sm" style={{ background: "#0F0F24", border: "1px solid #1A1A3A" }}>
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "rgba(255,59,59,0.15)" }}>
            <AlertCircle className="w-7 h-7" style={{ color: "#FF3B3B" }} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Sin permisos</h3>
          <p className="text-sm mb-2" style={{ color: "#8888AA" }}>Esta área es exclusiva para administradores de Elexxia.</p>
          <p className="text-xs" style={{ color: "#555570" }}>Si crees que deberías tener acceso, contacta con el equipo técnico.</p>
        </div>
      </div>
    );
  }

  const audits = ((auditsData as any) ?? []).map((row: any) => ({
    ...row.audit,
    overallScore: row.result?.overallScore ?? null,
    recommendedPlan: row.result?.recommendedPlan ?? null,
    estimatedMonthlyLeak: row.result?.estimatedMonthlyLeak ?? null,
  }));

  const conversionRate = stats && (stats as any).totalAudits > 0
    ? Math.round(((stats as any).convertedClients / (stats as any).totalAudits) * 100)
    : 0;

  return (
    <div className="min-h-screen" style={{ background: "#080818" }}>
      {/* Panel de notas */}
      {notesAuditId !== null && (
        <LeadNotesPanel
          auditId={notesAuditId}
          authorName={(user as any)?.name ?? "Equipo Elexxia"}
          onClose={() => setNotesAuditId(null)}
        />
      )}

      {/* Header */}
      <header className="border-b sticky top-0 z-40" style={{ borderColor: "#1A1A3A", background: "rgba(8,8,24,0.97)" }}>
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg elexxia-gradient flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Elexxia Growth Audit</span>
              <span className="text-xs ml-2 px-2 py-0.5 rounded-full" style={{ background: "rgba(0,102,255,0.15)", color: "#3385FF" }}>Dashboard Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="text-xs"
              style={{ borderColor: "#1A1A3A", color: "#8888AA", background: "transparent" }}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Actualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToCSV(exportData as any[] ?? [])}
              className="text-xs"
              style={{ borderColor: "#0066FF", color: "#3385FF", background: "rgba(0,102,255,0.08)" }}
            >
              <Download className="w-3 h-3 mr-1" />
              Exportar CSV
            </Button>
            <span className="text-sm" style={{ color: "#8888AA" }}>{(user as any)?.name}</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total auditorías", value: (stats as any)?.totalAudits ?? 0, icon: BarChart3, color: "#3385FF" },
            { label: "Puntuación media", value: `${(stats as any)?.avgScore ?? 0}/100`, icon: TrendingUp, color: "#6B46C1" },
            { label: "Clientes convertidos", value: (stats as any)?.convertedClients ?? 0, icon: CheckCircle, color: "#00C851" },
            { label: "Tasa conversión", value: `${conversionRate}%`, icon: Users, color: "#FFD700" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="p-5 rounded-2xl" style={{ background: "#0F0F24", border: "1px solid #1A1A3A" }}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4" style={{ color }} />
                <span className="text-xs" style={{ color: "#8888AA" }}>{label}</span>
              </div>
              <p className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl transition-all"
              style={{
                background: showFilters ? "rgba(0,102,255,0.15)" : "#0F0F24",
                border: `1px solid ${showFilters ? "#0066FF" : "#1A1A3A"}`,
                color: showFilters ? "#3385FF" : "#8888AA"
              }}
            >
              <Filter className="w-4 h-4" />
              Filtros
              {hasFilters && <span className="w-2 h-2 rounded-full" style={{ background: "#0066FF" }} />}
              <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </button>
            {hasFilters && (
              <button
                onClick={() => { setFilterSector(""); setFilterCity(""); setFilterPipeline(""); setFilterPlan(""); }}
                className="text-xs flex items-center gap-1"
                style={{ color: "#FF3B3B" }}
              >
                <X className="w-3 h-3" /> Limpiar filtros
              </button>
            )}
            <span className="text-xs ml-auto" style={{ color: "#8888AA" }}>{audits.length} leads</span>
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-2xl" style={{ background: "#0F0F24", border: "1px solid #1A1A3A" }}>
              <Input
                placeholder="Filtrar por sector..."
                value={filterSector}
                onChange={e => setFilterSector(e.target.value)}
                className="text-sm"
                style={{ background: "#080818", borderColor: "#1A1A3A", color: "white" }}
              />
              <Input
                placeholder="Filtrar por ciudad..."
                value={filterCity}
                onChange={e => setFilterCity(e.target.value)}
                className="text-sm"
                style={{ background: "#080818", borderColor: "#1A1A3A", color: "white" }}
              />
              <Select value={filterPipeline} onValueChange={setFilterPipeline}>
                <SelectTrigger style={{ background: "#080818", borderColor: "#1A1A3A", color: filterPipeline ? "white" : "#8888AA" }}>
                  <SelectValue placeholder="Pipeline..." />
                </SelectTrigger>
                <SelectContent style={{ background: "#0F0F24", borderColor: "#1A1A3A" }}>
                  <SelectItem value="">Todos</SelectItem>
                  {Object.entries(PIPELINE_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterPlan} onValueChange={setFilterPlan}>
                <SelectTrigger style={{ background: "#080818", borderColor: "#1A1A3A", color: filterPlan ? "white" : "#8888AA" }}>
                  <SelectValue placeholder="Plan recomendado..." />
                </SelectTrigger>
                <SelectContent style={{ background: "#0F0F24", borderColor: "#1A1A3A" }}>
                  <SelectItem value="">Todos</SelectItem>
                  {Object.entries(PLAN_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Tabla de leads */}
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1A1A3A" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#0F0F24", borderBottom: "1px solid #1A1A3A" }}>
                  {["Lead", "Sector / Ciudad", "Puntuación", "Fuga/mes", "Pipeline", "Plan rec.", "Acciones"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: "#8888AA" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {audits.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12" style={{ color: "#8888AA" }}>
                      {hasFilters ? "No hay leads con estos filtros." : "Aún no hay auditorías."}
                    </td>
                  </tr>
                ) : audits.map((audit: any) => {
                  const statusCfg = STATUS_CONFIG[audit.status] ?? STATUS_CONFIG.pending;
                  const pipelineCfg = PIPELINE_CONFIG[audit.pipelineStage ?? "new"] ?? PIPELINE_CONFIG.new;
                  const StatusIcon = statusCfg.icon;
                  return (
                    <tr key={audit.id} className="border-b transition-colors hover:bg-white/[0.02]" style={{ borderColor: "#1A1A3A" }}>
                      {/* Lead */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-white text-sm">{audit.businessName}</div>
                        <div className="text-xs mt-0.5" style={{ color: "#8888AA" }}>{audit.contactName}</div>
                        <div className="text-xs" style={{ color: "#555570" }}>{audit.contactEmail}</div>
                        <div className="flex items-center gap-1 mt-1">
                          <StatusIcon className="w-3 h-3" style={{ color: statusCfg.color }} />
                          <span className="text-xs" style={{ color: statusCfg.color }}>{statusCfg.label}</span>
                        </div>
                      </td>
                      {/* Sector / Ciudad */}
                      <td className="px-4 py-3">
                        <div className="text-sm text-white">{audit.businessSector}</div>
                        <div className="text-xs mt-0.5" style={{ color: "#8888AA" }}>{audit.businessCity}</div>
                        <div className="text-xs mt-1" style={{ color: "#555570" }}>{new Date(audit.createdAt).toLocaleDateString("es-ES")}</div>
                      </td>
                      {/* Puntuación */}
                      <td className="px-4 py-3">
                        {audit.overallScore !== null ? (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                              style={{
                                background: audit.overallScore >= 60 ? "rgba(0,200,81,0.15)" : audit.overallScore >= 30 ? "rgba(255,215,0,0.15)" : "rgba(255,59,59,0.15)",
                                color: audit.overallScore >= 60 ? "#00C851" : audit.overallScore >= 30 ? "#FFD700" : "#FF3B3B",
                                border: `1px solid ${audit.overallScore >= 60 ? "#00C851" : audit.overallScore >= 30 ? "#FFD700" : "#FF3B3B"}40`
                              }}>
                              {audit.overallScore}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs" style={{ color: "#555570" }}>—</span>
                        )}
                      </td>
                      {/* Fuga capital */}
                      <td className="px-4 py-3">
                        {audit.estimatedMonthlyLeak ? (
                          <span className="text-sm font-medium" style={{ color: "#FF6B6B" }}>
                            -{audit.estimatedMonthlyLeak.toLocaleString("es-ES")}€
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: "#555570" }}>—</span>
                        )}
                      </td>
                      {/* Pipeline — editable */}
                      <td className="px-4 py-3">
                        <select
                          value={audit.pipelineStage ?? "new"}
                          onChange={e => handlePipelineChange(audit.id, e.target.value)}
                          className="text-xs px-2 py-1 rounded-lg cursor-pointer"
                          style={{
                            background: pipelineCfg.bg,
                            color: pipelineCfg.color,
                            border: `1px solid ${pipelineCfg.color}40`,
                            outline: "none",
                            appearance: "none",
                          }}
                        >
                          {Object.entries(PIPELINE_CONFIG).map(([k, v]) => (
                            <option key={k} value={k} style={{ background: "#0F0F24", color: v.color }}>{v.label}</option>
                          ))}
                        </select>
                      </td>
                      {/* Plan recomendado */}
                      <td className="px-4 py-3">
                        {audit.recommendedPlan ? (
                          <span className="text-xs px-2 py-1 rounded-lg" style={{ background: "rgba(107,70,193,0.15)", color: "#9B7FD4" }}>
                            {PLAN_LABELS[audit.recommendedPlan] ?? audit.recommendedPlan}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: "#555570" }}>—</span>
                        )}
                      </td>
                      {/* Acciones */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/resultado/${audit.id}`)}
                            className="p-1.5 rounded-lg transition-all hover:bg-white/10"
                            title="Ver diagnóstico"
                            style={{ color: "#3385FF" }}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setNotesAuditId(audit.id)}
                            className="p-1.5 rounded-lg transition-all hover:bg-white/10"
                            title="Notas del lead"
                            style={{ color: "#8888AA" }}
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
