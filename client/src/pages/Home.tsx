import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart3, Brain, MapPin, Search, Shield, Zap, TrendingUp, CheckCircle } from "lucide-react";

export default function Home() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen" style={{ background: "#080818" }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: "#1A1A3A", background: "rgba(8,8,24,0.95)", backdropFilter: "blur(10px)" }}>
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg elexxia-gradient flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-white text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Elexxia</span>
              <span className="text-xs ml-2 px-2 py-0.5 rounded-full" style={{ background: "rgba(0,102,255,0.15)", color: "#3385FF", border: "1px solid rgba(0,102,255,0.3)" }}>Growth Audit</span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#como-funciona" className="text-sm" style={{ color: "#8888AA" }}>Cómo funciona</a>
            <a href="#planes" className="text-sm" style={{ color: "#8888AA" }}>Planes</a>
            <Button
              onClick={() => navigate("/auditoria")}
              className="text-sm font-semibold"
              style={{ background: "linear-gradient(135deg, #0066FF, #6B46C1)", border: "none" }}
            >
              Solicitar Auditoría
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10" style={{ background: "#0066FF", filter: "blur(120px)" }} />
          <div className="absolute top-1/3 right-1/4 w-80 h-80 rounded-full opacity-8" style={{ background: "#6B46C1", filter: "blur(100px)" }} />
        </div>

        <div className="container mx-auto px-6 pt-20 pb-24 text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-sm font-medium" style={{ background: "rgba(0,102,255,0.1)", border: "1px solid rgba(0,102,255,0.25)", color: "#3385FF" }}>
            <Brain className="w-4 h-4" />
            Diagnóstico Digital Impulsado por IA
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Descubre por qué tu negocio
            <br />
            <span className="elexxia-gradient-text">pierde clientes cada día</span>
          </h1>

          <p className="text-xl max-w-2xl mx-auto mb-10" style={{ color: "#8888AA", lineHeight: "1.7" }}>
            Analizamos tu presencia digital en 60 segundos. Recibirás un informe completo con tu puntuación, los problemas críticos detectados y un plan de acción personalizado.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate("/auditoria")}
              size="lg"
              className="text-base font-semibold px-8 py-4 h-auto"
              style={{ background: "linear-gradient(135deg, #0066FF, #6B46C1)", border: "none", boxShadow: "0 0 30px rgba(0,102,255,0.3)" }}
            >
              Obtener mi diagnóstico gratis
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-base font-semibold px-8 py-4 h-auto"
              style={{ borderColor: "#1A1A3A", color: "#8888AA", background: "transparent" }}
              onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Ver cómo funciona
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto mt-16">
            {[
              { value: "82%", label: "de pymes invisibles en Google" },
              { value: "60s", label: "para generar tu diagnóstico" },
              { value: "3x", label: "más conversión con SEO local" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold elexxia-gradient-text mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{stat.value}</div>
                <div className="text-xs" style={{ color: "#6666AA" }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como-funciona" className="py-24" style={{ background: "#0A0A1E" }}>
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Cómo funciona el <span className="elexxia-gradient-text">Growth Audit</span>
            </h2>
            <p style={{ color: "#8888AA" }}>Tres pasos para conocer el estado real de tu negocio online</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                step: "01",
                icon: <Search className="w-6 h-6" />,
                title: "Rellena el formulario",
                desc: "Cuéntanos sobre tu negocio: sector, ciudad, web, ticket medio y situación actual. Solo tarda 3 minutos.",
              },
              {
                step: "02",
                icon: <Brain className="w-6 h-6" />,
                title: "La IA analiza tu negocio",
                desc: "Nuestro motor de IA analiza tu presencia digital, detecta problemas y calcula cuánto dinero estás perdiendo cada mes.",
              },
              {
                step: "03",
                icon: <BarChart3 className="w-6 h-6" />,
                title: "Recibe tu informe",
                desc: "Obtienes un diagnóstico completo con puntuación, problemas por severidad, plan de acción y recomendación de plan.",
              },
            ].map((item) => (
              <div key={item.step} className="relative p-6 rounded-xl" style={{ background: "#0F0F24", border: "1px solid #1A1A3A" }}>
                <div className="text-5xl font-bold mb-4 opacity-20 elexxia-gradient-text" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{item.step}</div>
                <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center" style={{ background: "rgba(0,102,255,0.15)", color: "#3385FF" }}>
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#8888AA" }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Qué incluye el informe */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Qué incluye tu <span className="elexxia-gradient-text">diagnóstico</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { icon: <BarChart3 className="w-5 h-5" />, title: "Puntuación Global 0-100", desc: "Evaluación integral de tu presencia digital con subpuntuaciones por área." },
              { icon: <MapPin className="w-5 h-5" />, title: "Análisis GEO", desc: "Comprobamos si apareces en ChatGPT, Perplexity y Google cuando alguien busca tu servicio." },
              { icon: <TrendingUp className="w-5 h-5" />, title: "Fuga de Capital Mensual", desc: "Estimación de cuánto dinero pierdes al mes por no estar visible en Google." },
              { icon: <Shield className="w-5 h-5" />, title: "Problemas por Severidad", desc: "Detectamos problemas críticos, altos, medios y bajos en tu presencia digital." },
              { icon: <CheckCircle className="w-5 h-5" />, title: "Plan de Acción 30 días", desc: "Acciones priorizadas y concretas para mejorar tu visibilidad inmediatamente." },
              { icon: <Zap className="w-5 h-5" />, title: "Plan Elexxia Recomendado", desc: "Te decimos exactamente qué plan de servicios se adapta a tu situación y objetivos." },
            ].map((item) => (
              <div key={item.title} className="p-5 rounded-xl flex gap-4" style={{ background: "#0F0F24", border: "1px solid #1A1A3A" }}>
                <div className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: "rgba(107,70,193,0.15)", color: "#9F7AEA" }}>
                  {item.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1 text-sm">{item.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: "#8888AA" }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Planes */}
      <section id="planes" className="py-24" style={{ background: "#0A0A1E" }}>
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Planes de <span className="elexxia-gradient-text">Crecimiento</span>
            </h2>
            <p style={{ color: "#8888AA" }}>Después de tu diagnóstico, te recomendaremos el plan más adecuado para tu negocio</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                name: "Visibilidad Local",
                price: "300",
                tag: "Ideal para empezar",
                color: "#0066FF",
                features: ["Web de conversión incluida", "Ficha Google Business optimizada", "SEO Local + GEO básico", "Citaciones NAP en 20 directorios", "Informe mensual de resultados"],
              },
              {
                name: "Aceleración de Leads",
                price: "500",
                tag: "Más popular",
                color: "#6B46C1",
                popular: true,
                features: ["Todo del plan anterior", "Google Ads gestionado", "Landing page de conversión", "Seguimiento de llamadas", "Responsable de cuenta dedicado"],
              },
              {
                name: "Dominio de Mercado",
                price: "1.000",
                tag: "Para escalar",
                color: "#9F7AEA",
                features: ["Todo del plan anterior", "Meta Ads (Facebook + Instagram)", "SEO/GEO avanzado", "Email marketing automatizado", "Estrategia omnicanal completa"],
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className="p-6 rounded-xl relative"
                style={{
                  background: plan.popular ? "linear-gradient(135deg, rgba(0,102,255,0.08), rgba(107,70,193,0.12))" : "#0F0F24",
                  border: `1px solid ${plan.popular ? plan.color : "#1A1A3A"}`,
                  boxShadow: plan.popular ? `0 0 30px rgba(107,70,193,0.15)` : "none",
                }}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white" style={{ background: "linear-gradient(135deg, #0066FF, #6B46C1)" }}>
                    MÁS POPULAR
                  </div>
                )}
                <div className="mb-4">
                  <div className="text-xs font-medium mb-1" style={{ color: plan.color }}>{plan.tag}</div>
                  <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold" style={{ color: plan.color, fontFamily: "'Space Grotesk', sans-serif" }}>{plan.price}€</span>
                    <span className="text-sm" style={{ color: "#8888AA" }}>/mes</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm" style={{ color: "#CCCCEE" }}>
                      <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: plan.color }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full font-semibold"
                  onClick={() => navigate("/auditoria")}
                  style={plan.popular ? { background: `linear-gradient(135deg, #0066FF, #6B46C1)`, border: "none" } : { background: "transparent", border: `1px solid ${plan.color}`, color: plan.color }}
                >
                  Obtener diagnóstico
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-2xl mx-auto p-12 rounded-2xl" style={{ background: "linear-gradient(135deg, rgba(0,102,255,0.08), rgba(107,70,193,0.12))", border: "1px solid rgba(107,70,193,0.3)" }}>
            <h2 className="text-4xl font-bold mb-4 text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              ¿Listo para saber la verdad?
            </h2>
            <p className="mb-8" style={{ color: "#8888AA" }}>
              Obtén tu diagnóstico digital gratuito ahora. Sin compromiso, sin tarjeta de crédito.
            </p>
            <Button
              onClick={() => navigate("/auditoria")}
              size="lg"
              className="text-base font-semibold px-10 py-4 h-auto"
              style={{ background: "linear-gradient(135deg, #0066FF, #6B46C1)", border: "none", boxShadow: "0 0 40px rgba(0,102,255,0.35)" }}
            >
              Empezar mi diagnóstico gratis
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t" style={{ borderColor: "#1A1A3A" }}>
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg elexxia-gradient flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Elexxia Growth Audit</span>
          </div>
          <p className="text-xs" style={{ color: "#6666AA" }}>© 2025 Elexxia. Todos los derechos reservados.</p>
          <a href="https://elexxia.es" target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: "#3385FF" }}>elexxia.es →</a>
        </div>
      </footer>
    </div>
  );
}
