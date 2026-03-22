/**
 * Email service para Elexxia Growth Audit
 * Usa Resend como proveedor primario si RESEND_API_KEY está configurada.
 * Si no, usa el sistema de notificaciones interno de Manus como fallback.
 */
import { ENV } from "./_core/env";

export type DiagnosisEmailData = {
  to: string;
  clientName: string;
  businessName: string;
  sector: string;
  city: string;
  overallScore: number;
  capitalLeakMonthly: number;
  capitalLeakAnnual: number;
  executiveSummary: string;
  recommendedPlan: string;
  recommendedPlanPrice: string;
  auditUrl: string;
};

function buildEmailHtml(data: DiagnosisEmailData): string {
  const scoreColor = data.overallScore < 30 ? "#EF4444" : data.overallScore < 60 ? "#F59E0B" : "#10B981";
  const scoreLabel = data.overallScore < 30 ? "Crítica" : data.overallScore < 60 ? "Mejorable" : "Buena";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tu Diagnóstico Digital — Elexxia</title>
</head>
<body style="margin:0;padding:0;background:#06060F;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#06060F;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          
          <!-- Header -->
          <tr>
            <td style="padding:32px;background:linear-gradient(135deg,#0A0A1F,#0D0D2B);border-radius:16px 16px 0 0;border:1px solid #1A1A3A;border-bottom:none;text-align:center;">
              <div style="display:inline-flex;align-items:center;gap:8px;margin-bottom:16px;">
                <span style="font-size:24px;font-weight:800;background:linear-gradient(135deg,#0066FF,#6B46C1);-webkit-background-clip:text;-webkit-text-fill-color:transparent;color:#0066FF;">⚡ Elexxia</span>
              </div>
              <h1 style="color:#F0F0FF;font-size:22px;font-weight:700;margin:0 0 8px;">Tu Diagnóstico Digital está listo</h1>
              <p style="color:#8888AA;font-size:14px;margin:0;">Hola ${data.clientName}, aquí tienes el análisis completo de <strong style="color:#CCCCEE;">${data.businessName}</strong></p>
            </td>
          </tr>

          <!-- Score principal -->
          <tr>
            <td style="padding:24px 32px;background:#0A0A1F;border:1px solid #1A1A3A;border-top:none;border-bottom:none;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" style="padding-right:12px;">
                    <div style="background:#0D0D2B;border:1px solid #1A1A3A;border-radius:12px;padding:20px;text-align:center;">
                      <div style="font-size:42px;font-weight:800;color:${scoreColor};line-height:1;">${data.overallScore}</div>
                      <div style="font-size:12px;color:#8888AA;margin-top:4px;">/100 — ${scoreLabel}</div>
                      <div style="font-size:11px;color:#666688;margin-top:8px;">Puntuación Digital Global</div>
                    </div>
                  </td>
                  <td width="50%" style="padding-left:12px;">
                    <div style="background:#0D0D2B;border:1px solid rgba(239,68,68,0.2);border-radius:12px;padding:20px;text-align:center;">
                      <div style="font-size:28px;font-weight:800;color:#EF4444;line-height:1;">-${data.capitalLeakMonthly.toLocaleString('es-ES')}€</div>
                      <div style="font-size:12px;color:#8888AA;margin-top:4px;">/mes estimado</div>
                      <div style="font-size:11px;color:#666688;margin-top:8px;">Fuga de Capital Mensual</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Resumen ejecutivo -->
          <tr>
            <td style="padding:0 32px 24px;background:#0A0A1F;border:1px solid #1A1A3A;border-top:none;border-bottom:none;">
              <div style="background:#0D0D2B;border:1px solid #1A1A3A;border-radius:12px;padding:20px;">
                <h3 style="color:#F0F0FF;font-size:14px;font-weight:600;margin:0 0 12px;">📋 Resumen del Diagnóstico</h3>
                <p style="color:#AAAACC;font-size:13px;line-height:1.7;margin:0;">${data.executiveSummary}</p>
              </div>
            </td>
          </tr>

          <!-- Plan recomendado -->
          <tr>
            <td style="padding:0 32px 24px;background:#0A0A1F;border:1px solid #1A1A3A;border-top:none;border-bottom:none;">
              <div style="background:linear-gradient(135deg,rgba(0,102,255,0.08),rgba(107,70,193,0.08));border:1px solid rgba(0,102,255,0.25);border-radius:12px;padding:20px;">
                <h3 style="color:#F0F0FF;font-size:14px;font-weight:600;margin:0 0 8px;">⚡ Plan Recomendado para ${data.businessName}</h3>
                <div style="font-size:22px;font-weight:800;color:#3385FF;margin-bottom:8px;">${data.recommendedPlan}</div>
                <div style="font-size:18px;font-weight:700;color:#6B46C1;margin-bottom:12px;">${data.recommendedPlanPrice}/mes</div>
                <p style="color:#8888AA;font-size:12px;margin:0;">Basado en tu situación actual, este plan es el más adecuado para alcanzar tus objetivos de crecimiento digital.</p>
              </div>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 32px 32px;background:#0A0A1F;border:1px solid #1A1A3A;border-top:none;border-bottom:none;text-align:center;">
              <a href="${data.auditUrl}" style="display:inline-block;background:linear-gradient(135deg,#0066FF,#6B46C1);color:#FFFFFF;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;margin-bottom:12px;">
                Ver Diagnóstico Completo →
              </a>
              <p style="color:#555577;font-size:12px;margin:8px 0 0;">O copia este enlace: <span style="color:#3385FF;">${data.auditUrl}</span></p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background:#080818;border:1px solid #1A1A3A;border-top:1px solid #1A1A3A;border-radius:0 0 16px 16px;text-align:center;">
              <p style="color:#444466;font-size:11px;margin:0 0 4px;">Elexxia — Agencia de Crecimiento Digital</p>
              <p style="color:#333355;font-size:11px;margin:0;">Este informe fue generado automáticamente. Si tienes preguntas, responde a este email.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendDiagnosisEmail(data: DiagnosisEmailData): Promise<boolean> {
  if (!ENV.resendApiKey) {
    console.log('[Email] RESEND_API_KEY no configurada — email no enviado');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ENV.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: ENV.emailFrom,
        to: [data.to],
        subject: `Tu Diagnóstico Digital está listo — ${data.businessName} (${data.overallScore}/100)`,
        html: buildEmailHtml(data),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('[Email] Error de Resend:', response.status, errorText);
      return false;
    }

    console.log(`[Email] Diagnóstico enviado a ${data.to}`);
    return true;
  } catch (error) {
    console.error('[Email] Error al enviar email:', error);
    return false;
  }
}
