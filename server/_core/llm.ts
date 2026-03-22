/**
 * LLM — Anthropic Claude (standalone, sin dependencia de Manus)
 */
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function invokeLLM(params: {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  response_format?: { type: string; json_schema?: object };
}) {
  // Extraer system prompt si existe
  const systemMsg = params.messages.find(m => m.role === "system");
  const userMsgs = params.messages.filter(m => m.role !== "system");

  // Si hay response_format json_schema, añadir instrucción al system prompt
  const systemContent = systemMsg?.content ?? "";
  const systemWithJson = params.response_format?.type === "json_schema"
    ? systemContent + "\n\nIMPORTANT: Respond ONLY with valid JSON matching the exact schema provided. No markdown, no explanation, just pure JSON."
    : systemContent;

  const response = await client.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 4096,
    system: systemWithJson || undefined,
    messages: userMsgs.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
  });

  const content = response.content[0].type === "text" ? response.content[0].text : "";

  // Devolver en formato compatible con OpenAI (lo que espera el código existente)
  return {
    choices: [{ message: { content } }],
    usage: {
      prompt_tokens: response.usage.input_tokens,
      completion_tokens: response.usage.output_tokens,
      total_tokens: response.usage.input_tokens + response.usage.output_tokens,
    },
  };
}
