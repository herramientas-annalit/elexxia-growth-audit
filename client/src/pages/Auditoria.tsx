import { useState } from "react";
import { useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowRight, Brain, Zap, CheckCircle, Loader2, Mic, MicOff, Square } from "lucide-react";
import { toast } from "sonner";

type FormData = {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  businessName: string;
  businessSector: string;
  businessCity: string;
  websiteUrl: string;
  googleMapsUrl: string;
  averageTicket: string;
  profitMargin: string;
  monthlyNewClients: string;
  hasCommercialTeam: string;
  previousMarketingInvestment: string;
  mainBottleneck: string;
  callTranscript: string;
  additionalNotes: string;
};

const STEPS = [
  { id: 1, title: "Tus datos de contacto", subtitle: "Para enviarte el informe" },
  { id: 2, title: "Tu negocio", subtitle: "Cuéntanos sobre tu empresa" },
  { id: 3, title: "Situación comercial", subtitle: "Para personalizar el diagnóstico" },
  { id: 4, title: "Información adicional", subtitle: "Opcional pero muy útil" },
];

export default function Auditoria() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  // Estado del grabador de audio
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [formData, setFormData] = useState<FormData>({
    contactName: "", contactEmail: "", contactPhone: "",
    businessName: "", businessSector: "", businessCity: "",
    websiteUrl: "", googleMapsUrl: "",
    averageTicket: "", profitMargin: "", monthlyNewClients: "",
    hasCommercialTeam: "", previousMarketingInvestment: "", mainBottleneck: "",
    callTranscript: "", additionalNotes: "",
  });

  const transcribeAudioMutation = trpc.audit.transcribeAudio.useMutation();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 16 * 1024 * 1024) {
          toast.error('El audio supera el límite de 16MB. Graba un mensaje más corto.');
          return;
        }
        setIsTranscribing(true);
        try {
          const fd = new FormData();
          fd.append('file', audioBlob, 'audio.webm');
          const res = await fetch('/api/transcribe-audio', { method: 'POST', body: fd });
          if (!res.ok) throw new Error('failed');
          const { text } = await res.json() as { text: string };
          update('callTranscript', (formData.callTranscript ? formData.callTranscript + '\n\n' : '') + text);
          toast.success('Audio transcrito correctamente');
        } catch {
          toast.error('No se pudo transcribir el audio. Inténtalo de nuevo.');
        } finally {
          setIsTranscribing(false);
        }
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      toast.error('No se pudo acceder al micrófono. Verifica los permisos del navegador.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const createAudit = trpc.audit.create.useMutation({
    onSuccess: (data) => {
      navigate(`/resultado/${data.auditId}`);
    },
    onError: (err) => {
      toast.error("Error al generar el diagnóstico. Por favor, inténtalo de nuevo.");
      console.error(err);
    },
  });

  const update = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    if (step === 1) return formData.contactName.length >= 2 && formData.contactEmail.includes("@") && formData.businessName.length >= 2;
    if (step === 2) return formData.businessSector.length >= 2 && formData.businessCity.length >= 2;
    return true;
  };

  const handleSubmit = () => {
    createAudit.mutate({
      contactName: formData.contactName,
      contactEmail: formData.contactEmail,
      contactPhone: formData.contactPhone || undefined,
      businessName: formData.businessName,
      businessSector: formData.businessSector,
      businessCity: formData.businessCity,
      websiteUrl: formData.websiteUrl || undefined,
      googleMapsUrl: formData.googleMapsUrl || undefined,
      averageTicket: formData.averageTicket ? Number(formData.averageTicket) : undefined,
      profitMargin: formData.profitMargin ? Number(formData.profitMargin) : undefined,
      monthlyNewClients: formData.monthlyNewClients ? Number(formData.monthlyNewClients) : undefined,
      hasCommercialTeam: (formData.hasCommercialTeam as "yes" | "no" | "partial") || undefined,
      previousMarketingInvestment: (formData.previousMarketingInvestment as "none" | "less_500" | "500_1000" | "more_1000") || undefined,
      mainBottleneck: (formData.mainBottleneck as "not_known" | "known_not_buying" | "high_acquisition_cost") || undefined,
      callTranscript: formData.callTranscript || undefined,
      additionalNotes: formData.additionalNotes || undefined,
    });
  };

  return (
    <div className="min-h-screen" style={{ background: "#080818" }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: "#1A1A3A", background: "rgba(8,8,24,0.95)" }}>
        <div className="container mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm" style={{ color: "#8888AA" }}>
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
          <div className="flex items-center gap-2 ml-2">
            <div className="w-7 h-7 rounded-lg elexxia-gradient flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Elexxia Growth Audit</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12 max-w-2xl">
        {/* Progress */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                  style={{
                    background: step > s.id ? "linear-gradient(135deg, #0066FF, #6B46C1)" : step === s.id ? "rgba(0,102,255,0.2)" : "rgba(255,255,255,0.05)",
                    border: step >= s.id ? "1px solid #0066FF" : "1px solid #1A1A3A",
                    color: step >= s.id ? "#fff" : "#6666AA",
                  }}
                >
                  {step > s.id ? <CheckCircle className="w-4 h-4" /> : s.id}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="h-0.5 w-16 sm:w-24 mx-1" style={{ background: step > s.id ? "linear-gradient(90deg, #0066FF, #6B46C1)" : "#1A1A3A" }} />
                )}
              </div>
            ))}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              {STEPS[step - 1].title}
            </h2>
            <p className="text-sm mt-1" style={{ color: "#8888AA" }}>{STEPS[step - 1].subtitle}</p>
          </div>
        </div>

        {/* Form card */}
        <div className="p-8 rounded-2xl" style={{ background: "#0F0F24", border: "1px solid #1A1A3A" }}>
          {/* Step 1: Contact */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-sm font-medium mb-2 block" style={{ color: "#CCCCEE" }}>Nombre completo *</Label>
                  <Input
                    value={formData.contactName}
                    onChange={e => update("contactName", e.target.value)}
                    placeholder="Tu nombre y apellidos"
                    className="h-11"
                    style={{ background: "#080818", borderColor: "#1A1A3A", color: "#F0F0FF" }}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block" style={{ color: "#CCCCEE" }}>Email *</Label>
                  <Input
                    type="email"
                    value={formData.contactEmail}
                    onChange={e => update("contactEmail", e.target.value)}
                    placeholder="tu@email.com"
                    className="h-11"
                    style={{ background: "#080818", borderColor: "#1A1A3A", color: "#F0F0FF" }}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block" style={{ color: "#CCCCEE" }}>Teléfono</Label>
                  <Input
                    value={formData.contactPhone}
                    onChange={e => update("contactPhone", e.target.value)}
                    placeholder="+34 600 000 000"
                    className="h-11"
                    style={{ background: "#080818", borderColor: "#1A1A3A", color: "#F0F0FF" }}
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-sm font-medium mb-2 block" style={{ color: "#CCCCEE" }}>Nombre del negocio *</Label>
                  <Input
                    value={formData.businessName}
                    onChange={e => update("businessName", e.target.value)}
                    placeholder="Nombre de tu empresa o negocio"
                    className="h-11"
                    style={{ background: "#080818", borderColor: "#1A1A3A", color: "#F0F0FF" }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Business */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <Label className="text-sm font-medium mb-2 block" style={{ color: "#CCCCEE" }}>Sector / Tipo de negocio *</Label>
                <Input
                  value={formData.businessSector}
                  onChange={e => update("businessSector", e.target.value)}
                  placeholder="Ej: Restaurante, Clínica dental, Abogado, Peluquería..."
                  className="h-11"
                  style={{ background: "#080818", borderColor: "#1A1A3A", color: "#F0F0FF" }}
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block" style={{ color: "#CCCCEE" }}>Ciudad principal *</Label>
                <Input
                  value={formData.businessCity}
                  onChange={e => update("businessCity", e.target.value)}
                  placeholder="Ciudad donde tienes el negocio"
                  className="h-11"
                  style={{ background: "#080818", borderColor: "#1A1A3A", color: "#F0F0FF" }}
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block" style={{ color: "#CCCCEE" }}>URL de tu web</Label>
                <Input
                  value={formData.websiteUrl}
                  onChange={e => update("websiteUrl", e.target.value)}
                  placeholder="https://tunegocio.com"
                  className="h-11"
                  style={{ background: "#080818", borderColor: "#1A1A3A", color: "#F0F0FF" }}
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block" style={{ color: "#CCCCEE" }}>Enlace a tu ficha de Google Maps</Label>
                <Input
                  value={formData.googleMapsUrl}
                  onChange={e => update("googleMapsUrl", e.target.value)}
                  placeholder="https://maps.google.com/..."
                  className="h-11"
                  style={{ background: "#080818", borderColor: "#1A1A3A", color: "#F0F0FF" }}
                />
              </div>
            </div>
          )}

          {/* Step 3: Commercial */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block" style={{ color: "#CCCCEE" }}>Ticket medio por cliente (€)</Label>
                  <Input
                    type="number"
                    value={formData.averageTicket}
                    onChange={e => update("averageTicket", e.target.value)}
                    placeholder="Ej: 150"
                    className="h-11"
                    style={{ background: "#080818", borderColor: "#1A1A3A", color: "#F0F0FF" }}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block" style={{ color: "#CCCCEE" }}>Margen de beneficio (%)</Label>
                  <Input
                    type="number"
                    value={formData.profitMargin}
                    onChange={e => update("profitMargin", e.target.value)}
                    placeholder="Ej: 35"
                    className="h-11"
                    style={{ background: "#080818", borderColor: "#1A1A3A", color: "#F0F0FF" }}
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block" style={{ color: "#CCCCEE" }}>Clientes nuevos por internet al mes</Label>
                <Input
                  type="number"
                  value={formData.monthlyNewClients}
                  onChange={e => update("monthlyNewClients", e.target.value)}
                  placeholder="Ej: 5"
                  className="h-11"
                  style={{ background: "#080818", borderColor: "#1A1A3A", color: "#F0F0FF" }}
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block" style={{ color: "#CCCCEE" }}>¿Tienes equipo comercial?</Label>
                <Select value={formData.hasCommercialTeam} onValueChange={v => update("hasCommercialTeam", v)}>
                  <SelectTrigger className="h-11" style={{ background: "#080818", borderColor: "#1A1A3A", color: "#F0F0FF" }}>
                    <SelectValue placeholder="Selecciona una opción" />
                  </SelectTrigger>
                  <SelectContent style={{ background: "#0F0F24", borderColor: "#1A1A3A" }}>
                    <SelectItem value="yes">Sí, tengo equipo comercial dedicado</SelectItem>
                    <SelectItem value="partial">Equipo parcial o en formación</SelectItem>
                    <SelectItem value="no">No, lo gestiono yo solo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block" style={{ color: "#CCCCEE" }}>Inversión previa en marketing digital</Label>
                <Select value={formData.previousMarketingInvestment} onValueChange={v => update("previousMarketingInvestment", v)}>
                  <SelectTrigger className="h-11" style={{ background: "#080818", borderColor: "#1A1A3A", color: "#F0F0FF" }}>
                    <SelectValue placeholder="Selecciona una opción" />
                  </SelectTrigger>
                  <SelectContent style={{ background: "#0F0F24", borderColor: "#1A1A3A" }}>
                    <SelectItem value="none">Ninguna inversión previa</SelectItem>
                    <SelectItem value="less_500">Menos de 500€/mes</SelectItem>
                    <SelectItem value="500_1000">Entre 500€ y 1.000€/mes</SelectItem>
                    <SelectItem value="more_1000">Más de 1.000€/mes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block" style={{ color: "#CCCCEE" }}>Principal cuello de botella</Label>
                <Select value={formData.mainBottleneck} onValueChange={v => update("mainBottleneck", v)}>
                  <SelectTrigger className="h-11" style={{ background: "#080818", borderColor: "#1A1A3A", color: "#F0F0FF" }}>
                    <SelectValue placeholder="¿Cuál es tu mayor problema?" />
                  </SelectTrigger>
                  <SelectContent style={{ background: "#0F0F24", borderColor: "#1A1A3A" }}>
                    <SelectItem value="not_known">No me conocen (problema de visibilidad)</SelectItem>
                    <SelectItem value="known_not_buying">Me conocen pero no compran (conversión)</SelectItem>
                    <SelectItem value="high_acquisition_cost">Cierro ventas pero el coste es muy alto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 4: Additional */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl" style={{ background: "rgba(0,102,255,0.06)", border: "1px solid rgba(0,102,255,0.15)" }}>
                <div className="flex items-start gap-3">
                  <Brain className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "#3385FF" }} />
                  <div>
                    <p className="text-sm font-medium text-white mb-1">Potencia tu diagnóstico con IA</p>
                    <p className="text-xs" style={{ color: "#8888AA" }}>Si tienes una transcripción de llamada con el cliente o notas de una reunión, pégala aquí. La IA la analizará para generar un diagnóstico mucho más preciso y personalizado.</p>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium" style={{ color: "#CCCCEE" }}>Transcripción de llamada (opcional)</Label>
                  <button
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isTranscribing}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: isRecording ? "rgba(239,68,68,0.15)" : "rgba(0,102,255,0.12)",
                      border: isRecording ? "1px solid rgba(239,68,68,0.4)" : "1px solid rgba(0,102,255,0.3)",
                      color: isRecording ? "#EF4444" : "#3385FF",
                      cursor: isTranscribing ? "not-allowed" : "pointer",
                      opacity: isTranscribing ? 0.6 : 1,
                    }}
                  >
                    {isTranscribing ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Transcribiendo...</>
                    ) : isRecording ? (
                      <><Square className="w-3.5 h-3.5" /> Detener grabación</>
                    ) : (
                      <><Mic className="w-3.5 h-3.5" /> Grabar audio</>
                    )}
                  </button>
                </div>
                {isRecording && (
                  <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs" style={{ color: "#EF4444" }}>Grabando... Pulsa "Detener grabación" cuando termines</span>
                  </div>
                )}
                <Textarea
                  value={formData.callTranscript}
                  onChange={e => update("callTranscript", e.target.value)}
                  placeholder="Pega aquí la transcripción de la llamada, o usa el botón de grabación para transcribir audio automáticamente..."
                  rows={6}
                  style={{ background: "#080818", borderColor: "#1A1A3A", color: "#F0F0FF", resize: "vertical" }}
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block" style={{ color: "#CCCCEE" }}>Notas adicionales (opcional)</Label>
                <Textarea
                  value={formData.additionalNotes}
                  onChange={e => update("additionalNotes", e.target.value)}
                  placeholder="Cualquier información adicional que consideres relevante para el diagnóstico..."
                  rows={3}
                  style={{ background: "#080818", borderColor: "#1A1A3A", color: "#F0F0FF", resize: "vertical" }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => step > 1 ? setStep(s => s - 1) : navigate("/")}
            style={{ borderColor: "#1A1A3A", color: "#8888AA", background: "transparent" }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {step === 1 ? "Cancelar" : "Anterior"}
          </Button>

          {step < 4 ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
              style={{ background: "linear-gradient(135deg, #0066FF, #6B46C1)", border: "none", opacity: canProceed() ? 1 : 0.5 }}
            >
              Siguiente
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={createAudit.isPending}
              className="font-semibold px-8"
              style={{ background: "linear-gradient(135deg, #0066FF, #6B46C1)", border: "none", boxShadow: "0 0 20px rgba(0,102,255,0.3)" }}
            >
              {createAudit.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analizando tu negocio...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Generar diagnóstico
                </>
              )}
            </Button>
          )}
        </div>

        {/* Loading overlay */}
        {createAudit.isPending && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(8,8,24,0.9)", backdropFilter: "blur(8px)" }}>
            <div className="text-center p-10 rounded-2xl max-w-sm" style={{ background: "#0F0F24", border: "1px solid #1A1A3A" }}>
              <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center animate-pulse-glow" style={{ background: "rgba(0,102,255,0.15)", border: "2px solid rgba(0,102,255,0.4)" }}>
                <Brain className="w-10 h-10" style={{ color: "#3385FF" }} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Analizando tu negocio</h3>
              <p className="text-sm mb-6" style={{ color: "#8888AA" }}>Nuestra IA está procesando todos los datos y generando tu diagnóstico personalizado...</p>
              <div className="space-y-2">
                {["Analizando presencia en Google...", "Evaluando visibilidad GEO...", "Calculando fuga de capital...", "Generando plan de acción..."].map((msg, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs" style={{ color: "#6666AA" }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#0066FF", opacity: 0.6 + i * 0.1 }} />
                    {msg}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
