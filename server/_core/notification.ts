/**
 * Notificaciones via Telegram Bot (standalone, sin dependencia de Manus)
 */
export async function notifyOwner(params: { title: string; content: string }): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_OWNER_CHAT_ID;
  if (!token || !chatId) {
    console.log('[Notify] TELEGRAM_BOT_TOKEN o TELEGRAM_OWNER_CHAT_ID no configurados');
    return false;
  }
  try {
    const text = `*${params.title}*\n\n${params.content}`;
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    });
    if (!res.ok) {
      console.error('[Notify] Telegram error:', res.status, await res.text());
      return false;
    }
    console.log('[Notify] Telegram OK');
    return true;
  } catch (e) {
    console.error('[Notify] Error:', e);
    return false;
  }
}
